import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { getCurrentUserPermissions } from '@/lib/permission-checker';

const createSchema = z.object({
  title: z.string().min(1).max(255),
  requestType: z.string().max(80).optional().nullable(),
  status: z.enum(['NEW', 'IN_REVIEW', 'IN_PROGRESS', 'CLOSED']).default('NEW'),
  receivedAt: z.string().optional(),
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

    const requests = await prisma.bdRequest.findMany({
      where: { companyId: id, deletedAt: null },
      orderBy: { receivedAt: 'desc' },
    });

    return NextResponse.json(requests);
  } catch (error) {
    logger.error({ error }, 'Failed to fetch BD requests');
    return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userPermissions = await getCurrentUserPermissions();
    if (!userPermissions.includes('bd.requests.manage') && !userPermissions.includes('bd.companies.manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    const existing = await prisma.bdCompany.findFirst({ where: { id, deletedAt: null } });
    if (!existing) return NextResponse.json({ error: 'Company not found' }, { status: 404 });

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
    }

    const { receivedAt, ...rest } = parsed.data;

    const request = await prisma.bdRequest.create({
      data: {
        ...rest,
        companyId: id,
        receivedAt: receivedAt ? new Date(receivedAt) : new Date(),
      },
    });

    return NextResponse.json(request, { status: 201 });
  } catch (error) {
    logger.error({ error }, 'Failed to create BD request');
    return NextResponse.json({ error: 'Failed to create request' }, { status: 500 });
  }
}
