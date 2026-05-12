import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiContext } from '@/lib/api-utils';
import { checkPermission } from '@/lib/permission-checker';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

const updateSchema = z.object({
  scopeItems: z.array(z.any()).optional().nullable(),
  contractValue: z.number().min(0).optional(),
  retentionPercentage: z.number().min(0).max(100).optional(),
  paymentTerms: z.array(z.any()).optional().nullable(),
  termsAndConditions: z.string().optional().nullable(),
  templateType: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  currency: z.string().optional(),
});

export const GET = withApiContext(async (_req: NextRequest, session, context) => {
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await checkPermission('subcontractors.view'))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const id = context?.params.id;
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  try {
    const contract = await prisma.subcontractorContract.findUnique({
      where: { id, deletedAt: null },
      include: {
        project: { select: { id: true, projectNumber: true, name: true } },
        building: { select: { id: true, designation: true, name: true, location: true } },
        supplier: { select: { id: true, supplierCode: true, name: true, rating: true, category: true, scopeOfApproval: true } },
        createdBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
        paymentCertificates: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'asc' },
          include: {
            createdBy: { select: { id: true, name: true } },
            approvedBy: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!contract) return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
    return NextResponse.json(contract);
  } catch (error) {
    logger.error({ error, id }, '[SC Contracts] Failed to fetch contract');
    return NextResponse.json({ error: 'Failed to fetch contract' }, { status: 500 });
  }
});

export const PATCH = withApiContext(async (req: NextRequest, session, context) => {
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await checkPermission('subcontractors.edit'))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const id = context?.params.id;
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Validation error', details: parsed.error.flatten() }, { status: 422 });

  try {
    const existing = await prisma.subcontractorContract.findUnique({ where: { id, deletedAt: null } });
    if (!existing) return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
    if (existing.status !== 'DRAFT') return NextResponse.json({ error: 'Only DRAFT contracts can be edited' }, { status: 409 });

    const updated = await prisma.subcontractorContract.update({
      where: { id },
      data: { ...parsed.data, updatedById: session.userId },
    });
    return NextResponse.json(updated);
  } catch (error) {
    logger.error({ error, id }, '[SC Contracts] Failed to update contract');
    return NextResponse.json({ error: 'Failed to update contract' }, { status: 500 });
  }
});

export const DELETE = withApiContext(async (req: NextRequest, session, context) => {
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await checkPermission('subcontractors.delete'))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const id = context?.params.id;
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  let reason = 'Deleted by user';
  try {
    const body = await req.json() as { reason?: string };
    if (body.reason) reason = body.reason;
  } catch { /* reason stays default */ }

  try {
    const existing = await prisma.subcontractorContract.findUnique({ where: { id, deletedAt: null } });
    if (!existing) return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
    if (!['DRAFT', 'CANCELLED'].includes(existing.status)) {
      return NextResponse.json({ error: 'Only DRAFT or CANCELLED contracts can be deleted' }, { status: 409 });
    }

    await prisma.subcontractorContract.update({
      where: { id },
      data: { deletedAt: new Date(), deletedById: session.userId, deleteReason: reason },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error, id }, '[SC Contracts] Failed to delete contract');
    return NextResponse.json({ error: 'Failed to delete contract' }, { status: 500 });
  }
});
