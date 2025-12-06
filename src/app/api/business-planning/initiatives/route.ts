import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET - Fetch Initiatives
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');
    const status = searchParams.get('status');
    const objectiveId = searchParams.get('objectiveId');

    const where: any = {};
    if (year) where.year = parseInt(year);
    if (status) where.status = status;
    if (objectiveId) where.objectiveId = objectiveId;

    const initiatives = await prisma.annualInitiative.findMany({
      where,
      include: {
        owner: { select: { id: true, name: true, email: true } },
        objective: { select: { id: true, title: true } },
      },
      orderBy: [{ year: 'desc' }, { startDate: 'asc' }],
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

// POST - Create Initiative
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      title,
      description,
      objectiveId,
      year,
      startDate,
      endDate,
      budget,
      ownerId,
      status,
    } = body;

    const initiative = await prisma.annualInitiative.create({
      data: {
        title,
        description,
        objectiveId,
        year: year || new Date().getFullYear(),
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        budget: budget ? parseFloat(budget) : null,
        ownerId,
        status: status || 'Planned',
      },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        objective: { select: { id: true, title: true } },
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
