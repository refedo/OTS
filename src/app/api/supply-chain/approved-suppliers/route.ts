import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const CreateSchema = z.object({
  name: z.string().min(1),
  dolibarrId: z.number().int().positive().optional().nullable(),
  category: z.string().optional().nullable(),
  scopeOfApproval: z.string().optional().nullable(),
  approvalStatus: z.enum(['APPROVED', 'CONDITIONAL', 'SUSPENDED', 'EXPIRED']).default('APPROVED'),
  approvalDate: z.string().datetime().optional().nullable(),
  expiryDate: z.string().datetime().optional().nullable(),
  lastAuditDate: z.string().datetime().optional().nullable(),
  auditFrequencyDays: z.number().int().optional().nullable(),
  rating: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

async function getSession() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  return token ? verifySession(token) : null;
}

async function nextSupplierCode(): Promise<string> {
  const last = await prisma.scApprovedSupplier.findFirst({
    where: { supplierCode: { startsWith: 'SUP-' } },
    orderBy: { supplierCode: 'desc' },
    select: { supplierCode: true },
  });
  const n = last ? (parseInt(last.supplierCode.replace('SUP-', '')) || 0) + 1 : 1;
  return `SUP-${String(n).padStart(3, '0')}`;
}

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('approvalStatus');
    const search = searchParams.get('search');

    const where: Record<string, unknown> = { deletedAt: null };
    if (status) where.approvalStatus = status;
    if (search) where.name = { contains: search };

    const records = await prisma.scApprovedSupplier.findMany({
      where,
      orderBy: { supplierCode: 'asc' },
      include: {
        createdBy: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(records);
  } catch (error) {
    logger.error({ error }, 'Failed to fetch approved suppliers');
    return NextResponse.json({ error: 'Failed to fetch suppliers' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;
    const supplierCode = await nextSupplierCode();

    const record = await prisma.scApprovedSupplier.create({
      data: {
        supplierCode,
        name: data.name,
        dolibarrId: data.dolibarrId ?? null,
        category: data.category ?? null,
        scopeOfApproval: data.scopeOfApproval ?? null,
        approvalStatus: data.approvalStatus,
        approvalDate: data.approvalDate ? new Date(data.approvalDate) : null,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
        lastAuditDate: data.lastAuditDate ? new Date(data.lastAuditDate) : null,
        auditFrequencyDays: data.auditFrequencyDays ?? null,
        rating: data.rating ?? null,
        notes: data.notes ?? null,
        createdById: session.userId,
        updatedAt: new Date(),
      },
      select: { id: true, supplierCode: true },
    });

    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    logger.error({ error }, 'Failed to create approved supplier');
    return NextResponse.json({ error: 'Failed to create supplier' }, { status: 500 });
  }
}
