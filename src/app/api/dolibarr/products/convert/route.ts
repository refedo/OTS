import { NextRequest, NextResponse } from 'next/server'
import { withApiContext } from '@/lib/api-utils'
import { logger } from '@/lib/logger'
import prisma from '@/lib/db'
import { convertDisbursementUnits, UnitConversions } from '@/lib/material-master/unit-conversion'

export const dynamic = 'force-dynamic'

// GET /api/dolibarr/products/convert?id={dolibarr_id}&qty=5&unit=M2
export const GET = withApiContext(async (req: NextRequest, _session): Promise<NextResponse> => {
  const { searchParams } = new URL(req.url)
  const id = parseInt(searchParams.get('id') ?? '', 10)
  const qty = parseFloat(searchParams.get('qty') ?? '1')
  const unit = (searchParams.get('unit') ?? 'KG').toUpperCase() as 'KG' | 'TON' | 'M2' | 'LM' | 'PC'

  if (isNaN(id)) {
    return NextResponse.json({ error: 'Missing product id' }, { status: 400 })
  }

  if (!['KG', 'TON', 'M2', 'LM', 'PC'].includes(unit)) {
    return NextResponse.json({ error: 'Invalid unit. Use KG, TON, M2, LM, or PC' }, { status: 400 })
  }

  try {
    const rows: Array<{
      ref: string
      material_category: string
      unit_conversions_json: string | null
      kg_per_m2: number | null
      kg_per_lm: number | null
      kg_per_unit: number | null
      unit_area_m2: number | null
    }> = await prisma.$queryRawUnsafe(
      `SELECT ref, material_category, unit_conversions_json,
              kg_per_m2, kg_per_lm, kg_per_unit, unit_area_m2
       FROM dolibarr_products WHERE dolibarr_id = ?`,
      id
    )

    const p = rows[0]
    if (!p) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

    const isSheet = ['SHEET', 'PLATE', 'CHECKERED_PLATE'].includes(p.material_category)
    const isProfile = ['PROFILE_H', 'PROFILE_I', 'PROFILE_C', 'PROFILE_ANGLE',
                       'FLAT_BAR', 'ROUND_BAR', 'SQUARE_BAR'].includes(p.material_category)

    let conversions: UnitConversions = {}
    if (p.unit_conversions_json) {
      const raw = typeof p.unit_conversions_json === 'string'
        ? JSON.parse(p.unit_conversions_json)
        : p.unit_conversions_json
      if (isSheet) conversions = { sheet: raw }
      else if (isProfile) conversions = { profile: raw }
    }

    const output = convertDisbursementUnits(qty, unit, conversions)

    // Add PC equivalent if applicable
    let pc: number | null = null
    if (isSheet && conversions.sheet) {
      const kgInput = output.KG
      if (kgInput !== null && conversions.sheet.kg_per_sheet > 0) {
        pc = Math.round(kgInput / conversions.sheet.kg_per_sheet * 100) / 100
      }
    } else if (isProfile && conversions.profile) {
      const kgInput = output.KG
      if (kgInput !== null && conversions.profile.kg_per_bar > 0) {
        pc = Math.round(kgInput / conversions.profile.kg_per_bar * 100) / 100
      }
    }

    return NextResponse.json({
      product_ref: p.ref,
      input: { qty, unit },
      output: { ...output, PC: pc },
      conversions: p.unit_conversions_json ? (typeof p.unit_conversions_json === 'string'
        ? JSON.parse(p.unit_conversions_json)
        : p.unit_conversions_json) : null,
    })
  } catch (err) {
    logger.error({ err, id, qty, unit }, 'Unit conversion API failed')
    return NextResponse.json({ error: 'Conversion failed' }, { status: 500 })
  }
})
