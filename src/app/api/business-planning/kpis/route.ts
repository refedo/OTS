import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Fetch BSC KPIs
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');
    const category = searchParams.get('category');

    const where: any = {};
    if (year) where.year = parseInt(year);
    if (category) where.category = category;

    const kpis = await prisma.balancedScorecardKPI.findMany({
      where,
      include: {
        owner: { select: { id: true, name: true, email: true } },
        objective: { select: { id: true, title: true } },
        measurements: {
          orderBy: { recordedDate: 'desc' },
          take: 5,
        },
      },
      orderBy: [{ year: 'desc' }, { category: 'asc' }, { name: 'asc' }],
    });

    return NextResponse.json(kpis);
  } catch (error) {
    console.error('Error fetching KPIs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch KPIs' },
      { status: 500 }
    );
  }
}

// POST - Create BSC KPI
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      year,
      objectiveId,
      name,
      description,
      category,
      targetValue,
      currentValue,
      unit,
      frequency,
      ownerId,
      formula,
      status,
    } = body;

    const kpi = await prisma.balancedScorecardKPI.create({
      data: {
        year: year || new Date().getFullYear(),
        objectiveId: objectiveId || null,
        name,
        description,
        category,
        targetValue: parseFloat(targetValue),
        currentValue: parseFloat(currentValue) || 0,
        unit,
        frequency,
        ownerId,
        formula,
        status: status || 'On Track',
      },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        objective: { select: { id: true, title: true } },
      },
    });

    return NextResponse.json(kpi, { status: 201 });
  } catch (error) {
    console.error('Error creating KPI:', error);
    return NextResponse.json(
      { error: 'Failed to create KPI' },
      { status: 500 }
    );
  }
}
