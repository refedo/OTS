import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';
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
      orderBy: [
        { priority: 'asc' },
        { createdAt: 'desc' },
      ],
      include: {
        tasks: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
      },
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error('Error fetching backlog items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch backlog items' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('[Backlog API] POST request received');
    
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    console.log('[Backlog API] Token exists:', !!token);
    
    const session = token ? verifySession(token) : null;
    console.log('[Backlog API] Session verified:', !!session, session ? `User ID: ${session.sub}` : 'No session');
    
    if (!session) {
      console.log('[Backlog API] Unauthorized - no session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Backlog API] Finding user with ID:', session.sub);
    const user = await prisma.user.findUnique({
      where: { id: session.sub },
      include: { role: true },
    });

    if (!user) {
      console.log('[Backlog API] User not found for ID:', session.sub);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    console.log('[Backlog API] User found:', user.name, 'Role:', user.role.name);

    const body = await request.json();
    console.log('[Backlog API] Request body:', JSON.stringify(body, null, 2));

    // Generate unique code
    console.log('[Backlog API] Generating unique code...');
    const lastItem = await prisma.productBacklogItem.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    const lastNumber = lastItem?.code.match(/\d+$/)?.[0] || '0';
    const nextNumber = (parseInt(lastNumber) + 1).toString().padStart(3, '0');
    const code = `OTS-BL-${nextNumber}`;
    console.log('[Backlog API] Generated code:', code);

    // Validate status - only IDEA allowed for non-CEO/Admin users
    const permissions = user.customPermissions || user.role.permissions;
    const isCEOOrAdmin = user.role.name === 'CEO' || user.role.name === 'Admin';

    let status = body.status || 'IDEA';
    
    if (!isCEOOrAdmin && status !== 'IDEA') {
      status = 'IDEA';
    }

    console.log('[Backlog API] Creating backlog item with data:', {
      code,
      title: body.title,
      type: body.type,
      category: body.category,
      status,
      createdById: session.sub,
    });

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
        riskLevel: body.riskLevel || 'MEDIUM',
        complianceFlag: body.complianceFlag || false,
        linkedObjectiveId: body.linkedObjectiveId,
        linkedKpiId: body.linkedKpiId,
        createdById: session.sub,
      },
      include: {
        tasks: true,
      },
    });

    console.log('[Backlog API] Backlog item created successfully:', item.id);
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error('[Backlog API] ERROR creating backlog item:');
    console.error('[Backlog API] Error name:', error instanceof Error ? error.name : 'Unknown');
    console.error('[Backlog API] Error message:', error instanceof Error ? error.message : String(error));
    console.error('[Backlog API] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    if (error && typeof error === 'object' && 'code' in error) {
      console.error('[Backlog API] Prisma error code:', (error as any).code);
      console.error('[Backlog API] Prisma meta:', (error as any).meta);
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to create backlog item',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
