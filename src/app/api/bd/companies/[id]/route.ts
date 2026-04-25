import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { getCurrentUserPermissions } from '@/lib/permission-checker';

const updateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  logoUrl: z.string().max(512).optional().nullable(),
  contactName: z.string().max(255).optional().nullable(),
  contactEmail: z.string().email().max(255).optional().nullable().or(z.literal('')),
  contactPhone: z.string().max(80).optional().nullable(),
  registrationStatus: z.enum(['REGISTERED', 'IN_PROGRESS', 'NOT_STARTED', 'CLOSED_INACTIVE']).optional(),
  registrationDate: z.string().optional().nullable(),
  registrationExpiry: z.string().optional().nullable(),
  whatNext: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

async function getSession() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  return token ? verifySession(token) : null;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userPermissions = await getCurrentUserPermissions();
    const canView = userPermissions.includes('bd.companies.view') || userPermissions.includes('bd.companies.manage');
    if (!canView) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;

    const company = await prisma.bdCompany.findFirst({
      where: { id, deletedAt: null },
      include: {
        documents: { where: { deletedAt: null }, orderBy: { submittedAt: 'desc' } },
        requests: { where: { deletedAt: null }, orderBy: { receivedAt: 'desc' } },
        archiveEntries: { orderBy: { entryType: 'asc' } },
      },
    });

    if (!company) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json(company);
  } catch (error) {
    logger.error({ error }, 'Failed to fetch BD company');
    return NextResponse.json({ error: 'Failed to fetch company' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userPermissions = await getCurrentUserPermissions();
    if (!userPermissions.includes('bd.companies.manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
    }

    const existing = await prisma.bdCompany.findFirst({ where: { id, deletedAt: null } });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const { registrationDate, registrationExpiry, contactEmail, ...rest } = parsed.data;

    const company = await prisma.bdCompany.update({
      where: { id },
      data: {
        ...rest,
        ...(contactEmail !== undefined ? { contactEmail: contactEmail || null } : {}),
        ...(registrationDate !== undefined ? { registrationDate: registrationDate ? new Date(registrationDate) : null } : {}),
        ...(registrationExpiry !== undefined ? { registrationExpiry: registrationExpiry ? new Date(registrationExpiry) : null } : {}),
        updatedById: session.sub,
      },
    });

    return NextResponse.json(company);
  } catch (error) {
    logger.error({ error }, 'Failed to update BD company');
    return NextResponse.json({ error: 'Failed to update company' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userPermissions = await getCurrentUserPermissions();
    if (!userPermissions.includes('bd.companies.manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    const existing = await prisma.bdCompany.findFirst({ where: { id, deletedAt: null } });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await prisma.bdCompany.update({
      where: { id },
      data: { deletedAt: new Date(), deletedById: session.sub },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Failed to delete BD company');
    return NextResponse.json({ error: 'Failed to delete company' }, { status: 500 });
  }
}
