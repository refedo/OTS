import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { getCurrentUserPermissions } from '@/lib/permission-checker';
import { v4 as uuidv4 } from 'uuid';

const ARCHIVE_TYPES = ['GENERAL_INFO', 'COMMUNICATION_HISTORY', 'NOTES', 'EVALUATION_HISTORY'] as const;

const upsertSchema = z.object({
  entryType: z.enum(ARCHIVE_TYPES),
  content: z.string().optional().nullable(),
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

    const entries = await prisma.bdArchiveEntry.findMany({
      where: { companyId: id },
      orderBy: { entryType: 'asc' },
    });

    return NextResponse.json(entries);
  } catch (error) {
    logger.error({ error }, 'Failed to fetch BD archive');
    return NextResponse.json({ error: 'Failed to fetch archive' }, { status: 500 });
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

    const existing = await prisma.bdCompany.findFirst({ where: { id, deletedAt: null } });
    if (!existing) return NextResponse.json({ error: 'Company not found' }, { status: 404 });

    const body = await req.json();
    const parsed = upsertSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
    }

    const entry = await prisma.bdArchiveEntry.upsert({
      where: { companyId_entryType: { companyId: id, entryType: parsed.data.entryType } },
      create: {
        id: uuidv4(),
        companyId: id,
        entryType: parsed.data.entryType,
        content: parsed.data.content ?? null,
      },
      update: {
        content: parsed.data.content ?? null,
      },
    });

    return NextResponse.json(entry);
  } catch (error) {
    logger.error({ error }, 'Failed to upsert BD archive entry');
    return NextResponse.json({ error: 'Failed to update archive' }, { status: 500 });
  }
}
