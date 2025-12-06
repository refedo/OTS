import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET - Fetch Department Plans
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');
    const departmentId = searchParams.get('departmentId');

    const where: any = {};
    if (year) where.year = parseInt(year);
    if (departmentId) where.departmentId = departmentId;

    const plans = await prisma.departmentPlan.findMany({
      where,
      include: {
        department: { select: { id: true, name: true } },
        annualPlan: { select: { id: true, year: true, theme: true } },
        objectives: {
          include: {
            owner: { select: { id: true, name: true } },
            companyObjective: { select: { id: true, title: true } },
          },
        },
        kpis: {
          include: {
            owner: { select: { id: true, name: true } },
          },
        },
        initiatives: {
          include: {
            owner: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: [{ year: 'desc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json(plans);
  } catch (error) {
    console.error('Error fetching department plans:', error);
    return NextResponse.json(
      { error: 'Failed to fetch department plans' },
      { status: 500 }
    );
  }
}

// POST - Create Department Plan
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      departmentId,
      year,
      name,
      alignedObjectives,
      priorities,
      risks,
      dependencies,
    } = body;

    // Find or create annual plan for the year (for schema compatibility)
    let annualPlan = await prisma.annualPlan.findFirst({
      where: { year: year || new Date().getFullYear() },
    });

    if (!annualPlan) {
      annualPlan = await prisma.annualPlan.create({
        data: {
          year: year || new Date().getFullYear(),
          theme: `${year || new Date().getFullYear()} Strategic Plan`,
          status: 'Active',
        },
      });
    }

    // Get the first user as owner (should be improved to use actual logged-in user)
    const firstUser = await prisma.user.findFirst();
    if (!firstUser) {
      throw new Error('No users found in system');
    }

    const plan = await prisma.departmentPlan.create({
      data: {
        annualPlanId: annualPlan.id,
        departmentId,
        year: year || new Date().getFullYear(),
        name,
        priorities,
        risks,
        dependencies,
        // Create department objectives linked to company objectives
        objectives: alignedObjectives && alignedObjectives.length > 0 ? {
          create: alignedObjectives.map((objectiveId: string) => ({
            companyObjectiveId: objectiveId,
            title: 'Aligned to Company Objective',
            ownerId: firstUser.id,
            status: 'Not Started',
            progress: 0,
          })),
        } : undefined,
      },
      include: {
        department: { select: { id: true, name: true } },
        annualPlan: { select: { id: true, year: true, theme: true } },
        objectives: {
          include: {
            owner: { select: { id: true, name: true } },
          },
        },
        kpis: {
          include: {
            owner: { select: { id: true, name: true } },
          },
        },
        initiatives: {
          include: {
            owner: { select: { id: true, name: true } },
          },
        },
      },
    });

    return NextResponse.json(plan, { status: 201 });
  } catch (error) {
    console.error('Error creating department plan:', error);
    return NextResponse.json(
      { error: 'Failed to create department plan' },
      { status: 500 }
    );
  }
}
