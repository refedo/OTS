import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Fetch single Annual Plan by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const plan = await prisma.annualPlan.findUnique({
      where: { id: params.id },
      include: {
        objectives: {
          include: {
            owner: { select: { id: true, name: true, email: true } },
            keyResults: {
              include: {
                progressUpdates: {
                  orderBy: { recordedDate: 'desc' },
                  take: 5,
                  include: {
                    recordedByUser: { select: { id: true, name: true } },
                  },
                },
              },
            },
          },
        },
        initiatives: {
          include: {
            owner: { select: { id: true, name: true, email: true } },
            department: { select: { id: true, name: true } },
            objective: { select: { id: true, title: true } },
          },
        },
        bscKPIs: {
          include: {
            owner: { select: { id: true, name: true, email: true } },
            measurements: {
              orderBy: { recordedDate: 'desc' },
              take: 10,
              include: {
                recordedByUser: { select: { id: true, name: true } },
              },
            },
          },
        },
        departmentPlans: {
          include: {
            department: { select: { id: true, name: true } },
            objectives: true,
            kpis: true,
            initiatives: true,
          },
        },
      },
    });

    if (!plan) {
      return NextResponse.json(
        { error: 'Annual plan not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(plan);
  } catch (error) {
    console.error('Error fetching annual plan:', error);
    return NextResponse.json(
      { error: 'Failed to fetch annual plan' },
      { status: 500 }
    );
  }
}

// PATCH - Update Annual Plan
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { theme, strategicPriorities, status } = body;

    const plan = await prisma.annualPlan.update({
      where: { id: params.id },
      data: {
        ...(theme !== undefined && { theme }),
        ...(strategicPriorities !== undefined && { strategicPriorities }),
        ...(status !== undefined && { status }),
      },
    });

    return NextResponse.json(plan);
  } catch (error) {
    console.error('Error updating annual plan:', error);
    return NextResponse.json(
      { error: 'Failed to update annual plan' },
      { status: 500 }
    );
  }
}

// DELETE - Delete Annual Plan
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.annualPlan.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'Annual plan deleted successfully' });
  } catch (error) {
    console.error('Error deleting annual plan:', error);
    return NextResponse.json(
      { error: 'Failed to delete annual plan' },
      { status: 500 }
    );
  }
}
