import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Helper function to calculate progress from status
function getProgressFromStatus(status: string): number {
  switch (status) {
    case 'Planned': return 0;
    case 'In Progress': return 50;
    case 'On Hold': return 25;
    case 'Completed': return 100;
    case 'Cancelled': return 0;
    default: return 0;
  }
}

// GET - Fetch Company Objectives
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');
    const category = searchParams.get('category');
    const status = searchParams.get('status');

    const where: any = {};
    if (year) where.year = parseInt(year);
    if (category) where.category = category;
    if (status) where.status = status;

    console.log('[Objectives API] Fetching with filters:', where);

    const objectives = await prisma.companyObjective.findMany({
      where,
      include: {
        owner: { select: { id: true, name: true, email: true } },
        strategicObjective: { select: { id: true, title: true, startYear: true, endYear: true } },
        keyResults: {
          include: {
            progressUpdates: {
              orderBy: { recordedDate: 'desc' },
              take: 1,
            },
          },
        },
        initiatives: {
          select: {
            id: true,
            name: true,
            progress: true,
            status: true,
          },
        },
        initiativeLinks: {
          include: {
            initiative: {
              select: {
                id: true,
                name: true,
                progress: true,
                status: true,
              },
            },
          },
        },
        _count: {
          select: {
            keyResults: true,
            initiatives: true,
            departmentObjectives: true,
            kpis: true,
          },
        },
      },
      orderBy: [{ year: 'desc' }, { createdAt: 'desc' }],
    });

    // Calculate objective progress from Key Results and transform initiatives
    const objectivesWithProgress = objectives.map((obj: any) => {
      let calculatedProgress = obj.progress; // Default to stored progress
      
      // If there are key results, calculate progress from them
      if (obj.keyResults && obj.keyResults.length > 0) {
        const totalProgress = obj.keyResults.reduce((sum: number, kr: any) => {
          // Use the latest progress update if available, otherwise use currentValue/targetValue
          let krProgress = 0;
          if (kr.progressUpdates && kr.progressUpdates.length > 0) {
            krProgress = kr.progressUpdates[0].value || 0;
          } else if (kr.targetValue > 0) {
            krProgress = Math.round((kr.currentValue / kr.targetValue) * 100);
          }
          return sum + Math.min(krProgress, 100);
        }, 0);
        calculatedProgress = Math.round(totalProgress / obj.keyResults.length);
      }
      
      // Merge initiatives from both direct relationship and junction table
      const directInitiatives = obj.initiatives || [];
      const linkedInitiatives = obj.initiativeLinks?.map((link: any) => link.initiative) || [];
      
      // Deduplicate by id
      const allInitiativesMap = new Map();
      directInitiatives.forEach((init: any) => allInitiativesMap.set(init.id, init));
      linkedInitiatives.forEach((init: any) => allInitiativesMap.set(init.id, init));
      const allInitiatives = Array.from(allInitiativesMap.values());
      
      return {
        ...obj,
        progress: calculatedProgress,
        initiatives: allInitiatives,
        _count: {
          ...obj._count,
          initiatives: allInitiatives.length,
        },
      };
    });

    console.log(`[Objectives API] Found ${objectives.length} objectives`);
    return NextResponse.json(objectivesWithProgress);
  } catch (error) {
    console.error('[Objectives API] Error fetching objectives:', error);
    console.error('[Objectives API] Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { error: 'Failed to fetch objectives', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST - Create Company Objective
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      year,
      title,
      description,
      category,
      ownerId,
      strategicObjectiveId,
      tags,
      priority,
      status,
      quarterlyActions,
      keyResults,
    } = body;

    const objective = await prisma.companyObjective.create({
      data: {
        year: year || new Date().getFullYear(),
        title,
        description,
        category,
        ownerId,
        strategicObjectiveId: strategicObjectiveId || null,
        tags: tags || [],
        priority: priority || 'Medium',
        status: status || 'Not Started',
        quarterlyActions: quarterlyActions || null,
        keyResults: keyResults
          ? {
              create: keyResults.map((kr: any) => ({
                title: kr.title,
                description: kr.description,
                targetValue: kr.targetValue,
                unit: kr.unit,
                measurementType: kr.measurementType || 'Numeric',
                dueDate: kr.dueDate ? new Date(kr.dueDate) : undefined,
              })),
            }
          : undefined,
      },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        strategicObjective: { select: { id: true, title: true } },
        keyResults: true,
      },
    });

    return NextResponse.json(objective);
  } catch (error) {
    console.error('Error creating objective:', error);
    return NextResponse.json(
      { error: 'Failed to create objective' },
      { status: 500 }
    );
  }
}

// PUT - Update Company Objective
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      year,
      title,
      description,
      category,
      ownerId,
      strategicObjectiveId,
      tags,
      priority,
      status,
      quarterlyActions,
      keyResults,
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Objective ID is required' },
        { status: 400 }
      );
    }

    // Delete existing key results if new ones are provided
    if (keyResults) {
      await prisma.keyResult.deleteMany({
        where: { objectiveId: id },
      });
    }

    const objective = await prisma.companyObjective.update({
      where: { id },
      data: {
        year,
        title,
        description,
        category,
        ownerId,
        strategicObjectiveId: strategicObjectiveId !== undefined ? (strategicObjectiveId || null) : undefined,
        tags: tags || [],
        priority,
        status,
        quarterlyActions: quarterlyActions || null,
        keyResults: keyResults
          ? {
              create: keyResults.map((kr: any) => ({
                title: kr.title,
                description: kr.description,
                targetValue: kr.targetValue,
                currentValue: kr.currentValue || 0,
                unit: kr.unit,
                measurementType: kr.measurementType || 'Numeric',
                dueDate: kr.dueDate ? new Date(kr.dueDate) : undefined,
              })),
            }
          : undefined,
      },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        strategicObjective: { select: { id: true, title: true } },
        keyResults: true,
      },
    });

    return NextResponse.json(objective);
  } catch (error) {
    console.error('Error updating objective:', error);
    return NextResponse.json(
      { error: 'Failed to update objective' },
      { status: 500 }
    );
  }
}

// DELETE - Delete Company Objective
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Objective ID is required' },
        { status: 400 }
      );
    }

    await prisma.companyObjective.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting objective:', error);
    return NextResponse.json(
      { error: 'Failed to delete objective' },
      { status: 500 }
    );
  }
}
