import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { BacklogStatus, BacklogPriority } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type');
    const category = searchParams.get('category');
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const search = searchParams.get('search');

    const where: any = {};

    if (type) where.type = type;
    if (category) where.category = category;
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { code: { contains: search } },
        { businessReason: { contains: search } },
      ];
    }

    const items = await prisma.productBacklogItem.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      include: {
        createdBy: { select: { id: true, name: true } },
        tasks: {
          select: { id: true, title: true, status: true },
        },
      },
    });

    return NextResponse.json(items);
  } catch (error) {
    logger.error({ error }, 'Failed to fetch backlog items');
    return NextResponse.json(
      { error: 'Failed to fetch backlog items' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.sub },
      include: { role: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();

    // Generate unique code sequentially
    const allCodes = await prisma.productBacklogItem.findMany({
      select: { code: true },
    });
    const maxNumber = allCodes.reduce((max, { code }) => {
      const n = parseInt(code.match(/\d+$/)?.[0] ?? '0');
      return n > max ? n : max;
    }, 0);
    const code = `OTS-BL-${String(maxNumber + 1).padStart(3, '0')}`;

    // Validate status - only IDEA allowed for non-CEO/Admin users
    const { getCurrentUserPermissions } = await import('@/lib/permission-checker');
    const userPermissions = await getCurrentUserPermissions();
    const isCEOOrAdmin = userPermissions.includes('backlog.manage');

    let status = body.status || 'IDEA';
    if (!isCEOOrAdmin && status !== 'IDEA') {
      status = 'IDEA';
    }

    const item = await prisma.productBacklogItem.create({
      data: {
        code,
        title: body.title,
        description: body.description,
        type: body.type,
        category: body.category,
        businessReason: body.businessReason,
        expectedValue: body.expectedValue,
        priority: body.priority || 'MEDIUM',
        status,
        affectedModules: body.affectedModules || [],
        attachments: body.attachments || [],
        riskLevel: body.riskLevel || 'MEDIUM',
        complianceFlag: body.complianceFlag || false,
        linkedObjectiveId: body.linkedObjectiveId,
        linkedKpiId: body.linkedKpiId,
        createdById: session.sub,
      },
      include: { tasks: true },
    });

    logger.info({ itemId: item.id, code }, 'Backlog item created');
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    logger.error({ error }, 'Failed to create backlog item');
    return NextResponse.json(
      { error: 'Failed to create backlog item', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
