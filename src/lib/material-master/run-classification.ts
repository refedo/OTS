/**
 * Material Master Classification Runner
 *
 * Orchestrates all classification passes in sequence:
 * Pass 1: Rule-Based Classification (fast, deterministic)
 * Pass 2: AI Batch Classification (Claude — handles ~80 products/call)
 * Pass 3: Web Enrichment (Gemini — images + TDS URLs for consumables)
 *
 * This script can be invoked from the admin API route or run directly.
 */

import mysql from 'mysql2/promise'
import { classifyProduct, ClassificationResult } from './classifier'
import { runAIBatchClassification } from './ai-classifier'
import { enrichConsumable } from './web-enrichment'

interface DbPool {
  query: <T = unknown[]>(sql: string, params?: unknown[]) => Promise<[T]>
  execute: (sql: string, params?: unknown[]) => Promise<[unknown]>
  end: () => Promise<void>
}

export async function runFullClassification(db?: DbPool): Promise<{
  rule: { classified: number; skipped: number }
  ai: { processed: number; errors: number }
  enrichment: { enriched: number; errors: number }
}> {
  const pool = db ?? (await mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 5,
  }) as unknown as DbPool)

  console.log('── PASS 1: Rule-Based Classification ──')
  const [products] = await pool.query<Array<{ dolibarr_id: number; ref: string; label: string }>>(
    'SELECT dolibarr_id, ref, label FROM dolibarr_products ORDER BY dolibarr_id'
  )

  let ruleClassified = 0, ruleSkipped = 0

  for (const p of products) {
    const result: ClassificationResult = classifyProduct(p.ref, p.label)
    if (result.classification_conf > 0) {
      await pool.execute(
        `UPDATE dolibarr_products SET
          item_class=?, material_nature=?, material_category=?, grade=?,
          finish=?, unit_of_measure=?, bar_length_m=?,
          profile_type=?, profile_designation=?, section_standard=?,
          dim_h_mm=?, dim_b_mm=?, dim_tf_mm=?, dim_tw_mm=?, dim_r_mm=?,
          dim_width_mm=?, dim_length_mm=?, dim_thickness_mm=?,
          weight_kg_per_m=?, area_cm2=?, Ix_cm4=?, Iy_cm4=?, Wx_cm3=?, Wy_cm3=?,
          ix_cm=?, iy_cm=?, section_props_json=?,
          fastener_standard=?, fastener_thread=?, fastener_length_mm=?,
          fastener_grade=?, fastener_surface=?,
          aws_class=?, weld_process=?, weld_base_material=?, weld_diameter_mm=?,
          density_kg_m3=?, kg_per_m2=?, kg_per_lm=?, unit_area_m2=?,
          kg_per_unit=?, disburse_unit=?, unit_conversions_json=?,
          manufacturer=?,
          classified_by=?, classification_conf=?, review_required=?, enriched_at=NOW()
        WHERE dolibarr_id=?`,
        [
          result.item_class, result.material_nature, result.material_category, result.grade,
          result.finish, result.unit_of_measure, result.bar_length_m,
          result.profile_type, result.profile_designation, result.section_standard,
          result.dim_h_mm, result.dim_b_mm, result.dim_tf_mm, result.dim_tw_mm, result.dim_r_mm,
          result.dim_width_mm, result.dim_length_mm, result.dim_thickness_mm,
          result.weight_kg_per_m, result.area_cm2, result.Ix_cm4, result.Iy_cm4,
          result.Wx_cm3, result.Wy_cm3, result.ix_cm, result.iy_cm,
          result.section_props_json ? JSON.stringify(result.section_props_json) : null,
          result.fastener_standard, result.fastener_thread, result.fastener_length_mm,
          result.fastener_grade, result.fastener_surface,
          result.aws_class, result.weld_process, result.weld_base_material, result.weld_diameter_mm,
          result.density_kg_m3, result.kg_per_m2, result.kg_per_lm, result.unit_area_m2,
          result.kg_per_unit, result.disburse_unit,
          result.unit_conversions_json ? JSON.stringify(result.unit_conversions_json) : null,
          result.manufacturer,
          result.classified_by, result.classification_conf, result.review_required ? 1 : 0,
          p.dolibarr_id,
        ]
      )
      ruleClassified++
    } else {
      ruleSkipped++
    }
  }
  console.log(`Pass 1 complete: ${ruleClassified} classified, ${ruleSkipped} queued for AI`)

  console.log('── PASS 2: AI Batch Classification ──')
  const dbInterface = {
    query: async (sql: string, params?: unknown[]) => {
      const result = await pool.query(sql, params)
      return result as unknown as unknown[][]
    }
  }
  const { processed: aiProcessed, errors: aiErrors } = await runAIBatchClassification(dbInterface)
  console.log(`Pass 2 complete: ${aiProcessed} processed, ${aiErrors} batch errors`)

  console.log('── PASS 3: Web Enrichment (Consumables) ──')
  const [consumables] = await pool.query<Array<{
    dolibarr_id: number
    ref: string
    label: string
    aws_class: string | null
    material_category: string
  }>>(
    `SELECT dolibarr_id, ref, label, aws_class, material_category
     FROM dolibarr_products
     WHERE item_class = 'CONSUMABLE'
     AND image_url IS NULL
     LIMIT 200`
  )

  let enriched = 0, enrichmentErrors = 0
  for (const c of consumables) {
    try {
      const result = await enrichConsumable(c.dolibarr_id, c.ref, c.label, c.aws_class, c.material_category)
      await pool.execute(
        `UPDATE dolibarr_products SET
          image_url=?, tds_url=?, technical_attrs_json=?,
          manufacturer=COALESCE(manufacturer, ?)
        WHERE dolibarr_id=?`,
        [
          result.image_url, result.tds_url,
          result.technical_attrs_json ? JSON.stringify(result.technical_attrs_json) : null,
          result.manufacturer, c.dolibarr_id
        ]
      )
      enriched++
      await new Promise(r => setTimeout(r, 300))
    } catch (err) {
      console.error(`Enrichment failed for ${c.dolibarr_id}:`, err)
      enrichmentErrors++
    }
  }
  console.log(`Pass 3 complete: ${enriched} consumables enriched, ${enrichmentErrors} errors`)

  if (!db) {
    await pool.end()
  }

  console.log('── Classification pipeline complete ──')
  return {
    rule: { classified: ruleClassified, skipped: ruleSkipped },
    ai: { processed: aiProcessed, errors: aiErrors },
    enrichment: { enriched, errors: enrichmentErrors },
  }
}

// Allow running directly: npx ts-node src/lib/material-master/run-classification.ts
if (require.main === module) {
  runFullClassification().catch(console.error)
}
