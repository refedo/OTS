import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { logger } from '@/lib/logger';
import { systemEventService } from '@/services/system-events.service';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ documentId: string; clauseId: string }> }
) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { documentId, clauseId } = await params;

    const [document, clause] = await Promise.all([
      prisma.imsDocument.findFirst({
        where: { id: documentId, deletedAt: null },
        select: { id: true, documentNumber: true },
      }),
      prisma.imsClause.findFirst({
        where: { id: clauseId, isActive: true },
        select: { id: true, standard: true, clause: true, title: true },
      }),
    ]);

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    if (!clause) {
      return NextResponse.json({ error: 'Clause not found' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const notes = (body as { notes?: string }).notes ?? null;

    const mapping = await prisma.imsClauseMapping.create({
      data: {
        clauseId,
        documentId,
        notes,
      },
      include: {
        clause: {
          select: { id: true, standard: true, clause: true, title: true, level: true },
        },
        document: {
          select: { id: true, documentNumber: true, title: true },
        },
      },
    });

    systemEventService.log({
      eventType: 'KC_ENTRY_CREATED',
      eventCategory: 'KNOWLEDGE',
      userId: session.sub,
      userName: session.name,
      entityType: 'ImsClauseMapping',
      entityId: mapping.id,
      entityName: `${document.documentNumber} → ${clause.standard} ${clause.clause}`,
      summary: `Clause mapping added: ${document.documentNumber} mapped to ${clause.standard} ${clause.clause}`,
      details: { documentId, clauseId, standard: clause.standard, clause: clause.clause },
    });

    return NextResponse.json(mapping, { status: 201 });
  } catch (error) {
    const prismaError = error as { code?: string };
    if (prismaError.code === 'P2002') {
      return NextResponse.json({ error: 'Mapping already exists' }, { status: 409 });
    }
    logger.error({ error }, 'Failed to create IMS clause mapping');
    return NextResponse.json({ error: 'Failed to create clause mapping' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ documentId: string; clauseId: string }> }
) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { documentId, clauseId } = await params;

    const mapping = await prisma.imsClauseMapping.findFirst({
      where: { documentId, clauseId },
      select: {
        id: true,
        clause: { select: { standard: true, clause: true } },
        document: { select: { documentNumber: true } },
      },
    });

    if (!mapping) {
      return NextResponse.json({ error: 'Clause mapping not found' }, { status: 404 });
    }

    await prisma.imsClauseMapping.delete({
      where: { id: mapping.id },
    });

    systemEventService.log({
      eventType: 'KC_ENTRY_DELETED',
      eventCategory: 'KNOWLEDGE',
      userId: session.sub,
      userName: session.name,
      entityType: 'ImsClauseMapping',
      entityId: mapping.id,
      entityName: `${mapping.document.documentNumber} → ${mapping.clause.standard} ${mapping.clause.clause}`,
      summary: `Clause mapping removed: ${mapping.document.documentNumber} from ${mapping.clause.standard} ${mapping.clause.clause}`,
      details: { documentId, clauseId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Failed to delete IMS clause mapping');
    return NextResponse.json({ error: 'Failed to delete clause mapping' }, { status: 500 });
  }
}
