import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { getCurrentUserPermissions } from '@/lib/permission-checker';

const createSchema = z.object({
  name: z.string().min(1).max(255),
  vendorId: z.string().max(100).optional().nullable(),
  portalUsername: z.string().max(255).optional().nullable(),
  portalPassword: z.string().max(512).optional().nullable(),
  registrationChannel: z.enum(['SAP', 'Oracle', 'Company Website', 'Email', 'Others']).optional().nullable(),
  channelOther: z.string().max(255).optional().nullable(),
  logoUrl: z.string().max(512).optional().nullable(),
  contactName: z.string().max(255).optional().nullable(),
  contactEmail: z.string().email().max(255).optional().nullable().or(z.literal('')),
  contactPhone: z.string().max(80).optional().nullable(),
  registrationStatus: z.enum(['REGISTERED', 'IN_PROGRESS', 'NOT_STARTED', 'CLOSED_INACTIVE']).default('NOT_STARTED'),
  registrationDate: z.string().optional().nullable(),
  registrationExpiry: z.string().optional().nullable(),
  whatNext: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userPermissions = await getCurrentUserPermissions();
    const canView = userPermissions.includes('bd.companies.view') || userPermissions.includes('bd.companies.manage');
    if (!canView) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';

    const companies = await prisma.bdCompany.findMany({
      where: {
        deletedAt: null,
        ...(status ? { registrationStatus: status } : {}),
        ...(search ? { name: { contains: search } } : {}),
      },
      include: {
        _count: {
          select: {
            documents: { where: { deletedAt: null } },
            requests: { where: { deletedAt: null } },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json(companies);
  } catch (error) {
    logger.error({ error }, 'Failed to fetch BD companies');
    return NextResponse.json({ error: 'Failed to fetch companies' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userPermissions = await getCurrentUserPermissions();
    if (!userPermissions.includes('bd.companies.manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
    }

    const { registrationDate, registrationExpiry, contactEmail, ...rest } = parsed.data;

    const company = await prisma.bdCompany.create({
      data: {
        ...rest,
        contactEmail: contactEmail || null,
        registrationDate: registrationDate ? new Date(registrationDate) : null,
        registrationExpiry: registrationExpiry ? new Date(registrationExpiry) : null,
        createdById: session.sub,
        updatedById: session.sub,
      },
    });

    return NextResponse.json(company, { status: 201 });
  } catch (error) {
    logger.error({ error }, 'Failed to create BD company');
    return NextResponse.json({ error: 'Failed to create company' }, { status: 500 });
  }
}
