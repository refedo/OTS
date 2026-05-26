import { convertDisbursementUnits, UnitConversions } from './unit-conversion'
import prisma from '@/lib/db'

export interface DisbursementOptions {
  product_ref: string
  label: string
  disburse_unit: string
  available_units: string[]
  conversions: UnitConversions | null
}

export async function getDisbursementOptions(
  dolibarrProductId: number
): Promise<DisbursementOptions> {
  const rows: Array<{
    ref: string
    label: string
    item_class: string
    material_category: string
    disburse_unit: string
    unit_conversions_json: string | null
    kg_per_m2: string | null
    kg_per_lm: string | null
    unit_area_m2: string | null
  }> = await prisma.$queryRawUnsafe(
    `SELECT ref, label, item_class, material_category,
            disburse_unit, unit_conversions_json,
            kg_per_m2, kg_per_lm, unit_area_m2
     FROM dolibarr_products WHERE dolibarr_id = ?`,
    dolibarrProductId
  )

  const p = rows[0]
  if (!p) throw new Error(`Product ${dolibarrProductId} not found`)

  const isSheet = ['SHEET','PLATE','CHECKERED_PLATE'].includes(p.material_category)
  const isProfile = ['PROFILE_H','PROFILE_I','PROFILE_C','PROFILE_ANGLE',
                     'FLAT_BAR','ROUND_BAR','SQUARE_BAR'].includes(p.material_category)

  const available_units: string[] = ['KG', 'TON']
  if (isSheet)   available_units.push('M2', 'PC')
  if (isProfile) available_units.push('LM', 'PC')

  let conversions: UnitConversions | null = null
  if (p.unit_conversions_json) {
    try {
      const raw = typeof p.unit_conversions_json === 'string'
        ? JSON.parse(p.unit_conversions_json)
        : p.unit_conversions_json
      conversions = isSheet ? { sheet: raw } : { profile: raw }
    } catch {
      conversions = null
    }
  }

  return {
    product_ref: p.ref,
    label: p.label,
    disburse_unit: p.disburse_unit,
    available_units,
    conversions,
  }
}

export { convertDisbursementUnits }
