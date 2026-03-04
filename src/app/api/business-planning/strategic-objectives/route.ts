import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Fetch Strategic Objectives
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const category = searchParams.get('category');

    const where: any = {};
    if (status) where.status = status;
    if (category) where.category = category;

    const objectives = await prisma.strategicObjective.findMany({
      where,
      include: {
        owner: { select: { id: true, name: true, email: true } },
        yearlyObjectives: {
          select: { id: true, year: true, title: true, status: true, progress: true },
          orderBy: { year: 'asc' },
        },
      },
      orderBy: [{ startYear: 'desc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json(objectives);
  } catch (error) {
    console.error('Error fetching strategic objectives:', error);
    return NextResponse.json(
      { error: 'Failed to fetch strategic objectives' },
      { status: 500 }
    );
  }
}

// POST - Create Strategic Objective
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      title,
      description,
      category,
      startYear,
      endYear,
      ownerId,
      priority,
      status,
      targetOutcome,
    } = body;

    if (!title || !category || !startYear || !endYear || !ownerId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const objective = await prisma.strategicObjective.create({
      data: {
        title,
        description,
        category,
        startYear: parseInt(startYear),
        endYear: parseInt(endYear),
        ownerId,
        priority: priority || 'Medium',
        status: status || 'Not Started',
        targetOutcome,
      },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        yearlyObjectives: {
          select: { id: true, year: true, title: true, status: true, progress: true },
        },
      },
    });

    return NextResponse.json(objective, { status: 201 });
  } catch (error) {
    console.error('Error creating strategic objective:', error);
    return NextResponse.json(
      { error: 'Failed to create strategic objective' },
      { status: 500 }
    );
  }
}

// PUT - Update Strategic Objective
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Strategic Objective ID required' }, { status: 400 });
    }

    const {
      title,
      description,
      category,
      startYear,
      endYear,
      ownerId,
      priority,
      status,
      progress,
      targetOutcome,
    } = body;

    const objective = await prisma.strategicObjective.update({
      where: { id },
      data: {
        title,
        description,
        category,
        startYear: startYear ? parseInt(startYear) : undefined,
        endYear: endYear ? parseInt(endYear) : undefined,
        ownerId,
        priority,
        status,
        progress: progress !== undefined ? parseFloat(progress) : undefined,
        targetOutcome,
      },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        yearlyObjectives: {
          select: { id: true, year: true, title: true, status: true, progress: true },
        },
      },
    });

    return NextResponse.json(objective);
  } catch (error) {
    console.error('Error updating strategic objective:', error);
    return NextResponse.json(
      { error: 'Failed to update strategic objective' },
      { status: 500 }
    );
  }
}

// DELETE - Delete Strategic Objective
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Strategic Objective ID required' }, { status: 400 });
    }

    await prisma.strategicObjective.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting strategic objective:', error);
    return NextResponse.json(
      { error: 'Failed to delete strategic objective' },
      { status: 500 }
    );
  }
}
