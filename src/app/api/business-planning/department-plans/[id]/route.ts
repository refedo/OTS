import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// PATCH - Update Department Plan
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const {
      name,
      alignedObjectives,
      priorities,
      risks,
      dependencies,
    } = body;

    // Get existing plan to check year
    const existingPlan = await prisma.departmentPlan.findUnique({
      where: { id },
      include: { objectives: true },
    });

    if (!existingPlan) {
      return NextResponse.json(
        { error: 'Department plan not found' },
        { status: 404 }
      );
    }

    // Get the first user as owner (should be improved to use actual logged-in user)
    const firstUser = await prisma.user.findFirst();
    if (!firstUser) {
      throw new Error('No users found in system');
    }

    // Delete existing department objectives
    await prisma.departmentObjective.deleteMany({
      where: { departmentPlanId: id },
    });

    // Update the plan
    const updatedPlan = await prisma.departmentPlan.update({
      where: { id },
      data: {
        name,
        priorities,
        risks,
        dependencies,
        // Create new department objectives if alignedObjectives provided
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
            companyObjective: { select: { id: true, title: true, category: true } },
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

    return NextResponse.json(updatedPlan);
  } catch (error) {
    console.error('Error updating department plan:', error);
    return NextResponse.json(
      { error: 'Failed to update department plan' },
      { status: 500 }
    );
  }
}

// DELETE - Delete Department Plan
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    await prisma.departmentPlan.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting department plan:', error);
    return NextResponse.json(
      { error: 'Failed to delete department plan' },
      { status: 500 }
    );
  }
}
