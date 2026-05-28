import { NextRequest, NextResponse } from 'next/server'
import { withApiContext } from '@/lib/api-utils'
import { checkPermission } from '@/lib/permission-checker'
import { logger } from '@/lib/logger'
import prisma from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'

export const dynamic = 'force-dynamic'

type DolibarrProduct = {
  dolibarr_id: number
  ref: string
  label: string
  unit_of_measure: string | null
  item_class: string | null
  material_nature: string | null
}

// Map dolibarr item_class to InvItemCategory
function mapCategory(itemClass: string | null): string {
  switch (itemClass) {
    case 'STRUCTURAL_STEEL': return 'STRUCTURAL_STEEL'
    case 'PLATE':            return 'PLATE'
    case 'PIPE':             return 'PIPE'
    case 'CONSUMABLE':       return 'CONSUMABLE'
    case 'FASTENER':         return 'FASTENER'
    case 'PAINT':            return 'PAINT'
    case 'ELECTRICAL':       return 'ELECTRICAL'
    default:                 return 'OTHER'
  }
}

// Map item_class / material_nature to InvWarehouseType
function mapWhType(itemClass: string | null, materialNature: string | null): string {
  if (itemClass === 'CONSUMABLE' || materialNature === 'CONSUMABLE') return 'CONSUMABLE'
  return 'RAW_MATERIAL'
}

// POST /api/admin/material-master/sync-items
// Imports active dolibarr_products into inv_items (skips existing by code or dolibarr_id)
export const POST = withApiContext(async (
  _req: NextRequest,
  session
): Promise<NextResponse> => {
  if (!(await checkPermission('inv.admin'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const products = (await prisma.$queryRawUnsafe(
      `SELECT dolibarr_id, ref, label, unit_of_measure, item_class, material_nature
       FROM dolibarr_products
       WHERE is_active = 1
       ORDER BY ref ASC`
    )) as DolibarrProduct[]

    let created = 0
    let skipped = 0
    let errors = 0

    for (const p of products) {
      try {
        // Skip if already linked by dolibarr_id or same code
        const existing = (await prisma.$queryRawUnsafe(
          `SELECT id FROM inv_items
           WHERE (dolibarr_id = ? OR code = ?)
           AND deleted_at IS NULL
           LIMIT 1`,
          p.dolibarr_id, p.ref
        )) as Array<{ id: string }>

        if (existing.length > 0) {
          // Update the dolibarr_id link if missing
          await prisma.$executeRawUnsafe(
            `UPDATE inv_items SET dolibarr_id = ? WHERE id = ? AND dolibarr_id IS NULL`,
            p.dolibarr_id, existing[0].id
          )
          skipped++
          continue
        }

        const unit = p.unit_of_measure ?? 'PC'
        const category = mapCategory(p.item_class)
        const defaultWhType = mapWhType(p.item_class, p.material_nature)
        const id = uuidv4()

        await prisma.$executeRawUnsafe(
          `INSERT INTO inv_items
             (id, code, name, unit, category, default_wh_type, min_stock_level,
              is_active, dolibarr_id, created_by_id, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, 0, 1, ?, ?, NOW(), NOW())`,
          id, p.ref, p.label, unit, category, defaultWhType,
          p.dolibarr_id, session!.userId
        )
        created++
      } catch (err) {
        logger.error({ err, ref: p.ref }, 'sync-items: failed to import item')
        errors++
      }
    }

    logger.info({ created, skipped, errors, userId: session!.userId }, 'Material master sync-items complete')
    return NextResponse.json({ created, skipped, errors, total: products.length })
  } catch (err) {
    logger.error({ err }, 'sync-items: fatal error')
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 })
  }
})
