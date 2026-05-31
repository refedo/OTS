import { NextRequest, NextResponse } from 'next/server'
import { withApiContext } from '@/lib/api-utils'
import { checkPermission } from '@/lib/permission-checker'
import { logger } from '@/lib/logger'
import { z } from 'zod'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

const Schema = z.object({
  dolibarr_ids: z.array(z.number().int()).min(1).max(500),
  updates: z.object({
    item_class:        z.string().optional(),
    material_category: z.string().optional(),
    material_nature:   z.string().optional(),
    default_wh_type:   z.enum(['RAW_MATERIAL', 'CONSUMABLE', 'OFFCUT']).optional(),
    grade:             z.string().nullable().optional(),
  }),
})

export const PATCH = withApiContext(async (req: NextRequest, session): Promise<NextResponse> => {
  if (!(await checkPermission('inv.admin'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }

  const { dolibarr_ids, updates } = parsed.data

  const setClauses: string[] = [
    `classified_by = 'MANUAL'`,
    `classification_conf = 1.0`,
    `review_required = 0`,
    `reviewed_by = ?`,
    `reviewed_at = NOW()`,
  ]
  const values: unknown[] = [session!.userId]

  if (updates.item_class        !== undefined) { setClauses.unshift('item_class = ?');        values.unshift(updates.item_class) }
  if (updates.material_category !== undefined) { setClauses.unshift('material_category = ?'); values.unshift(updates.material_category) }
  if (updates.material_nature   !== undefined) { setClauses.unshift('material_nature = ?');   values.unshift(updates.material_nature) }
  if (updates.default_wh_type   !== undefined) { setClauses.unshift('default_wh_type = ?');   values.unshift(updates.default_wh_type) }
  if (updates.grade             !== undefined) { setClauses.unshift('grade = ?');             values.unshift(updates.grade) }

  const placeholders = dolibarr_ids.map(() => '?').join(', ')
  values.push(...dolibarr_ids)

  try {
    await prisma.$executeRawUnsafe(
      `UPDATE dolibarr_products SET ${setClauses.join(', ')} WHERE dolibarr_id IN (${placeholders})`,
      ...values,
    )
    logger.info({ count: dolibarr_ids.length, updates, userId: session!.userId }, 'Material master bulk update')
    return NextResponse.json({ updated: dolibarr_ids.length })
  } catch (err) {
    logger.error({ err }, 'Material master bulk update failed')
    return NextResponse.json({ error: 'Bulk update failed' }, { status: 500 })
  }
})
