import { NextRequest, NextResponse } from 'next/server'
import { withApiContext } from '@/lib/api-utils'
import { checkPermission } from '@/lib/permission-checker'
import { logger } from '@/lib/logger'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

// PATCH /api/admin/material-master/review/[dolibarrId]
// Body: partial enrichment fields to update + approve
export const PATCH = withApiContext(async (
  req: NextRequest,
  session,
  context
): Promise<NextResponse> => {
  if (!(await checkPermission('inv.admin'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const dolibarrId = parseInt(context?.params?.dolibarrId ?? '', 10)
  if (isNaN(dolibarrId)) {
    return NextResponse.json({ error: 'Invalid dolibarr_id' }, { status: 400 })
  }

  const body = await req.json() as Record<string, unknown>

  // Allowed fields for manual override
  const allowed = [
    'item_class', 'material_nature', 'material_category', 'default_wh_type', 'grade', 'finish',
    'unit_of_measure', 'profile_type', 'profile_designation', 'section_standard',
    'fastener_standard', 'fastener_thread', 'fastener_grade', 'fastener_surface',
    'aws_class', 'weld_process', 'weld_base_material', 'disburse_unit',
    'manufacturer', 'review_notes',
  ]

  const updates: string[] = []
  const values: unknown[] = []

  for (const key of allowed) {
    if (key in body) {
      updates.push(`${key} = ?`)
      values.push(body[key])
    }
  }

  // Always set review metadata on PATCH
  updates.push(
    `classified_by = 'MANUAL'`,
    `classification_conf = 1.0`,
    `review_required = 0`,
    `reviewed_by = ?`,
    `reviewed_at = NOW()`
  )
  values.push(session!.userId)
  values.push(dolibarrId)

  try {
    await prisma.$executeRawUnsafe(
      `UPDATE dolibarr_products SET ${updates.join(', ')} WHERE dolibarr_id = ?`,
      ...values
    )
    logger.info({ dolibarrId, reviewedBy: session!.userId }, 'Material master review approved')
    return NextResponse.json({ success: true, dolibarr_id: dolibarrId })
  } catch (err) {
    logger.error({ err, dolibarrId }, 'Material master review update failed')
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }
})
