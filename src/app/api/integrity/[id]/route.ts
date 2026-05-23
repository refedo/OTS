import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { withApiContext } from '@/lib/api-utils';
import { getCurrentUserPermissions } from '@/lib/permission-checker';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

const resolveSchema = z.object({
  status: z.enum(['OPEN', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED']).optional(),
  resolution: z.string().optional(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
});

// ─── GET — fetch single report ─────────────────────────────────────────────
export const GET = withApiContext(async (req: NextRequest, session, context) => {
  const permissions = await getCurrentUserPermissions();
  const canViewAll = permissions.includes('integrity.view_all');
  const id = context?.params?.id ?? '';

  const report = await prisma.integrityReport.findUnique({
    where: { id },
    select: {
      id: true,
      reportNumber: true,
      category: true,
      title: true,
      description: true,
      isAnonymous: true,
      severity: true,
      status: true,
      attachments: true,
      createdAt: true,
      updatedAt: true,
      resolvedAt: true,
      resolution: true,
      reporterId: true,
      ...(canViewAll ? {
        reporter: { select: { id: true, name: true, email: true } },
        resolvedBy: { select: { id: true, name: true } },
      } : {}),
    },
  });

  if (!report) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Non-admin can only view their own non-anonymous reports
  if (!canViewAll) {
    if (report.isAnonymous || report.reporterId !== session!.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  return NextResponse.json({ report });
});

// ─── PATCH — update status / resolution (admin/CEO only) ──────────────────
export const PATCH = withApiContext(async (req: NextRequest, session, context) => {
  const permissions = await getCurrentUserPermissions();
  const canResolve = permissions.includes('integrity.resolve');

  if (!canResolve) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const id = context?.params?.id ?? '';
  const body: unknown = await req.json();
  const parsed = resolveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 });
  }

  const existing = await prisma.integrityReport.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.status !== undefined) updateData.status = parsed.data.status;
  if (parsed.data.resolution !== undefined) updateData.resolution = parsed.data.resolution;
  if (parsed.data.severity !== undefined) updateData.severity = parsed.data.severity;

  if (parsed.data.status === 'RESOLVED' || parsed.data.status === 'DISMISSED') {
    updateData.resolvedAt = new Date();
    updateData.resolvedById = session!.userId;
  }

  const report = await prisma.integrityReport.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      reportNumber: true,
      status: true,
      resolution: true,
      resolvedAt: true,
      resolvedBy: { select: { id: true, name: true } },
    },
  });

  logger.info({ reportId: id, updatedBy: session!.userId, newStatus: parsed.data.status }, 'Integrity report updated');

  return NextResponse.json({ report });
});
