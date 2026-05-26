import { NextRequest, NextResponse } from 'next/server'
import { withApiContext } from '@/lib/api-utils'
import { checkPermission } from '@/lib/permission-checker'
import { logger } from '@/lib/logger'
import prisma from '@/lib/db'
import { classifyProduct } from '@/lib/material-master/classifier'
import { runAIBatchClassification } from '@/lib/material-master/ai-classifier'
import { enrichConsumable } from '@/lib/material-master/web-enrichment'

export const dynamic = 'force-dynamic'

// POST /api/admin/material-master/classify
// Body: { pass: 'rule' | 'ai' | 'enrichment' | 'all' }
export const POST = withApiContext(async (req: NextRequest, _session): Promise<NextResponse> => {
  if (!(await checkPermission('inv.admin'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json() as { pass?: string }
  const passType = body.pass ?? 'rule'

  if (!['rule', 'ai', 'enrichment', 'all'].includes(passType)) {
    return NextResponse.json({ error: 'Invalid pass type' }, { status: 400 })
  }

  const startTime = Date.now()
  let ruleProcessed = 0, ruleErrors = 0
  let aiProcessed = 0, aiErrors = 0
  let enrichmentProcessed = 0, enrichmentErrors = 0

  // ── PASS 1: Rule-Based Classification ────────────────────────────────────
  if (passType === 'rule' || passType === 'all') {
    try {
      const products: Array<{ dolibarr_id: number; ref: string; label: string }> =
        await prisma.$queryRawUnsafe(
          'SELECT dolibarr_id, ref, label FROM dolibarr_products ORDER BY dolibarr_id'
        )

      for (const p of products) {
        const result = classifyProduct(p.ref, p.label)
        if (result.classification_conf > 0) {
          try {
            await prisma.$executeRawUnsafe(
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
              p.dolibarr_id
            )
            ruleProcessed++
          } catch (err) {
            logger.error({ err, dolibarr_id: p.dolibarr_id }, 'Rule classifier DB update failed')
            ruleErrors++
          }
        }
      }
      logger.info({ processed: ruleProcessed, errors: ruleErrors }, 'Rule classification pass complete')
    } catch (err) {
      logger.error({ err }, 'Rule classification pass failed')
      ruleErrors++
    }
  }

  // ── PASS 2: AI Batch Classification ──────────────────────────────────────
  if (passType === 'ai' || passType === 'all') {
    try {
      // Provide a db-like interface for the AI classifier
      const dbInterface = {
        query: async (sql: string, params?: unknown[]): Promise<unknown[][]> => {
          const rows = params
            ? await prisma.$queryRawUnsafe(sql, ...params)
            : await prisma.$queryRawUnsafe(sql)
          return [rows as unknown[]]
        }
      }
      const result = await runAIBatchClassification(dbInterface)
      aiProcessed = result.processed
      aiErrors = result.errors
      logger.info({ processed: aiProcessed, errors: aiErrors }, 'AI classification pass complete')
    } catch (err) {
      logger.error({ err }, 'AI classification pass failed')
      aiErrors++
    }
  }

  // ── PASS 3: Web Enrichment (Consumables) ─────────────────────────────────
  if (passType === 'enrichment' || passType === 'all') {
    try {
      const consumables: Array<{
        dolibarr_id: number
        ref: string
        label: string
        aws_class: string | null
        material_category: string
      }> = await prisma.$queryRawUnsafe(
        `SELECT dolibarr_id, ref, label, aws_class, material_category
         FROM dolibarr_products
         WHERE item_class = 'CONSUMABLE'
         AND image_url IS NULL
         LIMIT 200`
      )

      for (const c of consumables) {
        try {
          const result = await enrichConsumable(
            c.dolibarr_id, c.ref, c.label, c.aws_class, c.material_category
          )
          await prisma.$executeRawUnsafe(
            `UPDATE dolibarr_products SET
              image_url=?, tds_url=?, technical_attrs_json=?,
              manufacturer=COALESCE(manufacturer, ?)
            WHERE dolibarr_id=?`,
            result.image_url, result.tds_url,
            result.technical_attrs_json ? JSON.stringify(result.technical_attrs_json) : null,
            result.manufacturer, c.dolibarr_id
          )
          enrichmentProcessed++
          await new Promise(r => setTimeout(r, 300))
        } catch (err) {
          logger.error({ err, dolibarr_id: c.dolibarr_id }, 'Web enrichment item failed')
          enrichmentErrors++
        }
      }
      logger.info({ processed: enrichmentProcessed, errors: enrichmentErrors }, 'Web enrichment pass complete')
    } catch (err) {
      logger.error({ err }, 'Web enrichment pass failed')
      enrichmentErrors++
    }
  }

  const duration_ms = Date.now() - startTime
  return NextResponse.json({
    pass: passType,
    rule: { processed: ruleProcessed, errors: ruleErrors },
    ai: { processed: aiProcessed, errors: aiErrors },
    enrichment: { processed: enrichmentProcessed, errors: enrichmentErrors },
    duration_ms,
  })
})
