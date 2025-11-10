import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifySession } from '@/lib/jwt';
import { z } from 'zod';

const createSchema = z.object({
  name: z.string().min(2),
  category: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  objective: z.string().optional().nullable(),
  ownerId: z.string().uuid(),
  departmentId: z.string().uuid().optional().nullable(),
  status: z.enum(['Planned', 'In Progress', 'On Hold', 'Completed', 'Cancelled']).optional(),
  priority: z.enum(['Low', 'Medium', 'High', 'Critical']).optional(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  actualStartDate: z.string().optional().nullable(),
  actualEndDate: z.string().optional().nullable(),
  progress: z.number().min(0).max(100).optional().nullable(),
  budget: z.number().optional().nullable(),
  kpiImpact: z.any().optional().nullable(),
  notes: z.string().optional().nullable(),
});

// GET /api/initiatives - List all initiatives with filters
export async function GET(request: NextRequest) {
  try {
    const cookieName = process.env.COOKIE_NAME || 'ots_session';
    const token = request.cookies.get(cookieName)?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = verifySession(token);
    if (!session) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    // Get query parameters for filtering
    const { searchParams } = new URL(request.url);
    const departmentId = searchParams.get('departmentId');
    const ownerId = searchParams.get('ownerId');
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const priority = searchParams.get('priority');

    // Build where clause
    const where: any = {};
    if (departmentId) where.departmentId = departmentId;
    if (ownerId) where.ownerId = ownerId;
    if (status) where.status = status;
    if (category) where.category = category;
    if (priority) where.priority = priority;

    const initiatives = await prisma.initiative.findMany({
      where,
      include: {
        owner: {
          select: { id: true, name: true, email: true, position: true },
        },
        department: {
          select: { id: true, name: true },
        },
        creator: {
          select: { id: true, name: true, email: true },
        },
        milestones: {
          select: { id: true, name: true, status: true, progress: true },
        },
        tasks: {
          select: { id: true, taskName: true, status: true, progress: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(initiatives);
  } catch (error) {
    console.error('Error fetching initiatives:', error);
    return NextResponse.json(
      { error: 'Failed to fetch initiatives' },
      { status: 500 }
    );
  }
}

// POST /api/initiatives - Create new initiative
export async function POST(request: NextRequest) {
  try {
    const cookieName = process.env.COOKIE_NAME || 'ots_session';
    const token = request.cookies.get(cookieName)?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = verifySession(token);
    if (!session) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    // Check if user is Admin or Manager
    if (!['Admin', 'Manager'].includes(session.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = createSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.errors },
        { status: 400 }
      );
    }

    // Generate initiative number: INIT-YYYY-NNN
    const year = new Date().getFullYear();
    const lastInitiative = await prisma.initiative.findFirst({
      where: {
        initiativeNumber: {
          startsWith: `INIT-${year}-`,
        },
      },
      orderBy: { initiativeNumber: 'desc' },
    });

    let nextNumber = 1;
    if (lastInitiative) {
      const lastNumber = parseInt(lastInitiative.initiativeNumber.split('-')[2]);
      nextNumber = lastNumber + 1;
    }

    const initiativeNumber = `INIT-${year}-${String(nextNumber).padStart(3, '0')}`;

    // Prepare initiative data
    const initiativeData: any = {
      initiativeNumber,
      name: parsed.data.name,
      ownerId: parsed.data.ownerId,
      createdBy: session.sub,
      updatedBy: session.sub,
    };

    if (parsed.data.category) initiativeData.category = parsed.data.category;
    if (parsed.data.description) initiativeData.description = parsed.data.description;
    if (parsed.data.objective) initiativeData.objective = parsed.data.objective;
    if (parsed.data.departmentId) initiativeData.departmentId = parsed.data.departmentId;
    if (parsed.data.status) initiativeData.status = parsed.data.status;
    if (parsed.data.priority) initiativeData.priority = parsed.data.priority;
    if (parsed.data.startDate) initiativeData.startDate = new Date(parsed.data.startDate);
    if (parsed.data.endDate) initiativeData.endDate = new Date(parsed.data.endDate);
    if (parsed.data.actualStartDate) initiativeData.actualStartDate = new Date(parsed.data.actualStartDate);
    if (parsed.data.actualEndDate) initiativeData.actualEndDate = new Date(parsed.data.actualEndDate);
    if (parsed.data.progress !== undefined) initiativeData.progress = parsed.data.progress;
    if (parsed.data.budget !== undefined) initiativeData.budget = parsed.data.budget;
    if (parsed.data.kpiImpact) initiativeData.kpiImpact = parsed.data.kpiImpact;
    if (parsed.data.notes) initiativeData.notes = parsed.data.notes;

    const initiative = await prisma.initiative.create({
      data: initiativeData,
      include: {
        owner: {
          select: { id: true, name: true, email: true, position: true },
        },
        department: {
          select: { id: true, name: true },
        },
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json(initiative, { status: 201 });
  } catch (error) {
    console.error('Error creating initiative:', error);
    return NextResponse.json(
      { error: 'Failed to create initiative' },
      { status: 500 }
    );
  }
}
