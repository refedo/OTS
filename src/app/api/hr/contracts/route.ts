/**
 * GET  /api/hr/contracts   — list contracts (filterable)
 * POST /api/hr/contracts   — create a contract
 *
 * 18.14.0
 */

import { NextRequest, NextResponse } from 'next/server';
import type { ContractType, ContractStatus } from '@prisma/client';
import { z } from 'zod';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';

const createSchema = z.object({
  title: z.string().min(1).max(300),
  type: z.enum([
    'HEALTH_INSURANCE', 'MEDICAL_INSURANCE', 'IQAMA', 'CAR_REGISTRATION',
    'VEHICLE_LICENSE', 'PROFESSIONAL_LICENSE', 'COMMERCIAL_REGISTRATION',
    'LEGAL_DOCUMENT', 'OTHER',
  ]),
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

export const GET = withApiContext(async (req: NextRequest, session) => {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type');
  const status = searchParams.get('status');
  const search = searchParams.get('search');
  const employeeId = searchParams.get('employeeId');

  try {
    const contracts = await prisma.contract.findMany({
      where: {
        deletedAt: null,
        ...(type ? { type: type as ContractType } : {}),
        ...(status ? { status: status as ContractStatus } : {}),
        ...(employeeId ? { employeeId } : {}),
        ...(search
          ? {
              OR: [
                { title: { contains: search } },
                { contractNumber: { contains: search } },
                { referenceNumber: { contains: search } },
                { issuingAuthority: { contains: search } },
                { employee: { fullNameEn: { contains: search } } },
              ],
            }
          : {}),
      },
      include: {
        employee: { select: { id: true, fullNameEn: true, employmentId: true } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Lazily update expired contracts + compute daysUntilExpiry
    const toExpire: string[] = [];
    const result = contracts.map((c) => {
      let daysUntilExpiry: number | null = null;
      let effectiveStatus = c.status;

      if (c.expiryDate) {
        const exp = new Date(c.expiryDate);
        exp.setHours(0, 0, 0, 0);
        daysUntilExpiry = Math.round((exp.getTime() - today.getTime()) / 86400000);
        if (daysUntilExpiry < 0 && c.status === 'ACTIVE') {
          effectiveStatus = 'EXPIRED';
          toExpire.push(c.id);
        }
      }

      return { ...c, status: effectiveStatus, daysUntilExpiry };
    });

    // Fire-and-forget status updates
    if (toExpire.length > 0) {
      prisma.contract
        .updateMany({ where: { id: { in: toExpire } }, data: { status: 'EXPIRED' } })
        .catch((err) => logger.error({ err }, 'Failed to auto-expire contracts'));
    }

    return NextResponse.json(result);
  } catch (error) {
    logger.error({ error }, 'Failed to fetch contracts');
    return NextResponse.json({ error: 'Failed to fetch contracts' }, { status: 500 });
  }
});

export const POST = withApiContext(async (req: NextRequest, session) => {
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }

  const d = parsed.data;

  try {
    const year = new Date().getFullYear().toString().slice(2);
    const count = await prisma.contract.count();
    const contractNumber = `CNT-${year}-${String(count + 1).padStart(4, '0')}`;

    const contract = await prisma.contract.create({
      data: {
        contractNumber,
        title: d.title,
        type: d.type as ContractType,
        employeeId: d.employeeId ?? null,
        issuingAuthority: d.issuingAuthority ?? null,
        referenceNumber: d.referenceNumber ?? null,
        issueDate: d.issueDate ? new Date(d.issueDate) : null,
        expiryDate: d.expiryDate ? new Date(d.expiryDate) : null,
        expiryDateHijri: d.expiryDateHijri ?? null,
        status: (d.status as ContractStatus | undefined) ?? 'ACTIVE',
        notifyDaysBefore: d.notifyDaysBefore ?? 30,
        description: d.description ?? null,
        filePath: d.filePath ?? null,
        createdById: session!.userId,
      },
      include: {
        employee: { select: { id: true, fullNameEn: true, employmentId: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(contract, { status: 201 });
  } catch (error) {
    logger.error({ error }, 'Failed to create contract');
    return NextResponse.json({ error: 'Failed to create contract' }, { status: 500 });
  }
});
