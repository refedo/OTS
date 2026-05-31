import { NextRequest, NextResponse } from 'next/server'
import { withApiContext } from '@/lib/api-utils'
import { checkPermission } from '@/lib/permission-checker'
import { logger } from '@/lib/logger'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

// Allowed field keys that can be updated via import
const ALLOWED_FIELDS = [
  'item_class', 'material_nature', 'material_category', 'default_wh_type',
  'grade', 'finish', 'unit_of_measure', 'manufacturer',
] as const

type AllowedField = typeof ALLOWED_FIELDS[number]

interface ImportRow {
  ref?: string
  dolibarr_id?: number
  [key: string]: unknown
}

export const POST = withApiContext(async (req: NextRequest, session): Promise<NextResponse> => {
  if (!(await checkPermission('inv.admin'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json() as { rows: ImportRow[] }
  const rows = body?.rows

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: 'rows array required' }, { status: 400 })
  }
  if (rows.length > 2000) {
    return NextResponse.json({ error: 'Max 2000 rows per import' }, { status: 400 })
  }

  let updated = 0
  let skipped = 0
  const errors: string[] = []

  for (const row of rows) {
    const ref = typeof row.ref === 'string' ? row.ref.trim() : null
    const dolibarrId = typeof row.dolibarr_id === 'number' ? row.dolibarr_id : null

    if (!ref && dolibarrId === null) { skipped++; continue }

    const setClauses: string[] = [
      `classified_by = 'MANUAL'`,
      `classification_conf = 1.0`,
      `review_required = 0`,
      `reviewed_by = ?`,
      `reviewed_at = NOW()`,
    ]
    const values: unknown[] = [session!.userId]
    let hasUpdate = false

    for (const field of ALLOWED_FIELDS) {
      if (field in row && row[field] !== undefined && row[field] !== null && row[field] !== '') {
        setClauses.unshift(`${field} = ?`)
        values.unshift(row[field] as string)
        hasUpdate = true
      }
    }

    if (!hasUpdate) { skipped++; continue }

    try {
      const where = dolibarrId !== null ? `dolibarr_id = ?` : `ref = ?`
      values.push(dolibarrId !== null ? dolibarrId : ref)

      const result = await prisma.$executeRawUnsafe(
        `UPDATE dolibarr_products SET ${setClauses.join(', ')} WHERE ${where}`,
        ...values,
      )
      if (result > 0) updated++
      else skipped++
    } catch (err) {
      logger.error({ err, ref, dolibarrId }, 'bulk-import: row update failed')
      errors.push(`${ref ?? dolibarrId}: update failed`)
      skipped++
    }
  }

  logger.info({ updated, skipped, errCount: errors.length, userId: session!.userId }, 'Material master bulk import')
  return NextResponse.json({ updated, skipped, errors: errors.slice(0, 20) })
})
