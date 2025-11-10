import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';

// GET /api/kpi/definitions - List all KPI definitions
export async function GET(request: Request) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get('isActive');
    const frequency = searchParams.get('frequency');
    const calculationType = searchParams.get('calculationType');

    const whereClause: any = {};
    
    if (isActive !== null) {
      whereClause.isActive = isActive === 'true';
    }
    
    if (frequency) {
      whereClause.frequency = frequency;
    }
    
    if (calculationType) {
      whereClause.calculationType = calculationType;
    }

    const definitions = await prisma.kPIDefinition.findMany({
      where: whereClause,
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        updatedBy: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: {
            scores: true,
            targets: true,
            manualEntries: true,
            alerts: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(definitions);
  } catch (error) {
    console.error('Error fetching KPI definitions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch KPI definitions' },
      { status: 500 }
    );
  }
}

// POST /api/kpi/definitions - Create new KPI definition (Admin only)
export async function POST(request: Request) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is Admin
    const user = await prisma.user.findUnique({
      where: { id: session.sub },
      include: { role: true },
    });

    if (!user || user.role.name !== 'Admin') {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      code,
      name,
      description,
      formula,
      sourceModules,
      frequency,
      weight,
      target,
      unit,
      calculationType,
      isActive,
    } = body;

    // Validate required fields
    if (!code || !name || !formula || !frequency) {
      return NextResponse.json(
        { error: 'Missing required fields: code, name, formula, frequency' },
        { status: 400 }
      );
    }

    // Check if code already exists
    const existing = await prisma.kPIDefinition.findUnique({
      where: { code },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'KPI code already exists' },
        { status: 400 }
      );
    }

    // Create KPI definition
    const definition = await prisma.kPIDefinition.create({
      data: {
        code,
        name,
        description: description || null,
        formula,
        sourceModules: sourceModules || null,
        frequency,
        weight: weight || 1.0,
        target: target || null,
        unit: unit || null,
        calculationType: calculationType || 'auto',
        isActive: isActive !== undefined ? isActive : true,
        createdById: session.sub,
        updatedById: session.sub,
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        updatedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Log creation in history
    await prisma.kPIHistory.create({
      data: {
        kpiId: definition.id,
        action: 'definition_created',
        payload: {
          code: definition.code,
          name: definition.name,
          formula: definition.formula,
        },
        performedBy: session.sub,
      },
    });

    return NextResponse.json(definition, { status: 201 });
  } catch (error) {
    console.error('Error creating KPI definition:', error);
    return NextResponse.json(
      { error: 'Failed to create KPI definition' },
      { status: 500 }
    );
  }
}
