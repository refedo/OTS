import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { getCurrentUserPermissions } from '@/lib/permission-checker';

const createSchema = z.object({
  title: z.string().min(1).max(255),
  fileUrl: z.string().max(512).optional().nullable(),
  status: z.enum(['SUBMITTED', 'PENDING', 'APPROVED', 'REJECTED']).default('SUBMITTED'),
  submittedAt: z.string().optional(),
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

    const documents = await prisma.bdDocument.findMany({
      where: { companyId: id, deletedAt: null },
      orderBy: { submittedAt: 'desc' },
    });

    return NextResponse.json(documents);
  } catch (error) {
    logger.error({ error }, 'Failed to fetch BD documents');
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userPermissions = await getCurrentUserPermissions();
    if (!userPermissions.includes('bd.documents.manage') && !userPermissions.includes('bd.companies.manage')) {
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

    const { submittedAt, ...rest } = parsed.data;

    const document = await prisma.bdDocument.create({
      data: {
        ...rest,
        companyId: id,
        submittedAt: submittedAt ? new Date(submittedAt) : new Date(),
      },
    });

    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    logger.error({ error }, 'Failed to create BD document');
    return NextResponse.json({ error: 'Failed to create document' }, { status: 500 });
  }
}
