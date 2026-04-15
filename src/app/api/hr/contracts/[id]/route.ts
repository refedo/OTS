/**
 * GET    /api/hr/contracts/[id]  — fetch one contract
 * PUT    /api/hr/contracts/[id]  — update a contract
 * DELETE /api/hr/contracts/[id]  — soft-delete a contract
 *
 * 18.14.0
 */

import { NextRequest, NextResponse } from 'next/server';
import type { ContractType, ContractStatus } from '@prisma/client';
import { z } from 'zod';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';

const updateSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  type: z.enum([
    'HEALTH_INSURANCE', 'MEDICAL_INSURANCE', 'IQAMA', 'CAR_REGISTRATION',
    'VEHICLE_LICENSE', 'PROFESSIONAL_LICENSE', 'COMMERCIAL_REGISTRATION',
    'LEGAL_DOCUMENT', 'OTHER',
  ]).optional(),
  employeeId: z.string().nullish(),
  issuingAuthority: z.string().max(200).nullish(),
  referenceNumber: z.string().max(100).nullish(),
  issueDate: z.preprocess(v => v == null ? undefined : v, z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  expiryDate: z.preprocess(v => v == null ? undefined : v, z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  expiryDateHijri: z.string().max(20).nullish(),
  status: z.enum(['ACTIVE', 'EXPIRED', 'PENDING_RENEWAL', 'CANCELLED']).optional(),
  notifyDaysBefore: z.preprocess(v => v == null ? undefined : v, z.coerce.number().int().min(1).max(365)).optional(),
  description: z.string().nullish(),
  filePath: z.string().max(500).nullish(),
});

const deleteSchema = z.object({
  deleteReason: z.string().min(1).max(500),
});

export const GET = withApiContext(async (_req: NextRequest, _session, { params }: { params: { id: string } }) => {
  try {
    const contract = await prisma.contract.findFirst({
      where: { id: params.id, deletedAt: null },
      include: {
        employee: { select: { id: true, fullNameEn: true, employmentId: true } },
        createdBy: { select: { id: true, name: true } },
        updatedBy: { select: { id: true, name: true } },
      },
    });

    if (!contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
    }

    return NextResponse.json(contract);
  } catch (error) {
    logger.error({ error, id: params.id }, 'Failed to fetch contract');
    return NextResponse.json({ error: 'Failed to fetch contract' }, { status: 500 });
  }
});

export const PUT = withApiContext(async (req: NextRequest, session, { params }: { params: { id: string } }) => {
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }

  const d = parsed.data;

  try {
    const existing = await prisma.contract.findFirst({ where: { id: params.id, deletedAt: null } });
    if (!existing) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
    }

    const contract = await prisma.contract.update({
      where: { id: params.id },
      data: {
        ...(d.title !== undefined ? { title: d.title } : {}),
        ...(d.type !== undefined ? { type: d.type as ContractType } : {}),
        ...(d.employeeId !== undefined ? { employeeId: d.employeeId } : {}),
        ...(d.issuingAuthority !== undefined ? { issuingAuthority: d.issuingAuthority } : {}),
        ...(d.referenceNumber !== undefined ? { referenceNumber: d.referenceNumber } : {}),
        ...(d.issueDate !== undefined ? { issueDate: d.issueDate ? new Date(d.issueDate) : null } : {}),
        ...(d.expiryDate !== undefined ? { expiryDate: d.expiryDate ? new Date(d.expiryDate) : null } : {}),
        ...(d.expiryDateHijri !== undefined ? { expiryDateHijri: d.expiryDateHijri } : {}),
        ...(d.status !== undefined ? { status: d.status as ContractStatus } : {}),
        ...(d.notifyDaysBefore !== undefined ? { notifyDaysBefore: d.notifyDaysBefore } : {}),
        ...(d.description !== undefined ? { description: d.description } : {}),
        ...(d.filePath !== undefined ? { filePath: d.filePath } : {}),
        updatedById: session!.userId,
      },
      include: {
        employee: { select: { id: true, fullNameEn: true, employmentId: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(contract);
  } catch (error) {
    logger.error({ error, id: params.id }, 'Failed to update contract');
    return NextResponse.json({ error: 'Failed to update contract' }, { status: 500 });
  }
});

export const DELETE = withApiContext(async (req: NextRequest, session, { params }: { params: { id: string } }) => {
  const body = await req.json();
  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Delete reason required' }, { status: 400 });
  }

  try {
    const existing = await prisma.contract.findFirst({ where: { id: params.id, deletedAt: null } });
    if (!existing) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
    }

    await prisma.contract.update({
      where: { id: params.id },
      data: {
        deletedAt: new Date(),
        deletedById: session!.userId,
        deleteReason: parsed.data.deleteReason,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error, id: params.id }, 'Failed to delete contract');
    return NextResponse.json({ error: 'Failed to delete contract' }, { status: 500 });
  }
});
