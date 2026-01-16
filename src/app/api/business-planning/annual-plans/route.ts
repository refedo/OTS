import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Fetch Annual Plans
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');
    const status = searchParams.get('status');

    if (year) {
      const plan = await prisma.annualPlan.findUnique({
        where: { year: parseInt(year) },
        include: {
          objectives: {
            include: {
              owner: { select: { id: true, name: true, email: true } },
              keyResults: true,
            },
          },
          initiatives: {
            include: {
              owner: { select: { id: true, name: true, email: true } },
              department: { select: { id: true, name: true } },
            },
          },
          bscKPIs: {
            include: {
              owner: { select: { id: true, name: true, email: true } },
              measurements: { orderBy: { recordedDate: 'desc' }, take: 10 },
            },
          },
          departmentPlans: {
            include: {
              department: { select: { id: true, name: true } },
            },
          },
        },
      });
      return NextResponse.json(plan || null);
    }

    // Get all plans with filters
    const where: any = {};
    if (status) where.status = status;

    const plans = await prisma.annualPlan.findMany({
      where,
      orderBy: { year: 'desc' },
      include: {
        _count: {
          select: {
            objectives: true,
            initiatives: true,
            bscKPIs: true,
            departmentPlans: true,
          },
        },
      },
    });

    return NextResponse.json(plans);
  } catch (error) {
    console.error('Error fetching annual plans:', error);
    return NextResponse.json(
      { error: 'Failed to fetch annual plans' },
      { status: 500 }
    );
  }
}

// POST - Create Annual Plan
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { year, theme, strategicPriorities, status } = body;

    const plan = await prisma.annualPlan.create({
      data: {
        year: parseInt(year),
        theme,
        strategicPriorities,
        status: status || 'Draft',
      },
    });

    return NextResponse.json(plan);
  } catch (error) {
    console.error('Error creating annual plan:', error);
    return NextResponse.json(
      { error: 'Failed to create annual plan' },
      { status: 500 }
    );
  }
}
