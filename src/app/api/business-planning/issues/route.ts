import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Fetch Weekly Issues
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const departmentId = searchParams.get('departmentId');

    const where: any = {};
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (departmentId) where.departmentId = departmentId;

    const issues = await prisma.weeklyIssue.findMany({
      where,
      include: {
        raisedBy: { select: { id: true, name: true, email: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
        department: { select: { id: true, name: true } },
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return NextResponse.json(issues);
  } catch (error) {
    console.error('Error fetching issues:', error);
    return NextResponse.json(
      { error: 'Failed to fetch issues' },
      { status: 500 }
    );
  }
}

// POST - Create Weekly Issue
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      title,
      description,
      departmentId,
      raisedById,
      assignedToId,
      priority,
      status,
      dueDate,
    } = body;

    const issue = await prisma.weeklyIssue.create({
      data: {
        title,
        description,
        departmentId: departmentId || null,
        raisedById,
        assignedToId: assignedToId || null,
        priority: priority || 'Medium',
        status: status || 'Open',
        dueDate: dueDate ? new Date(dueDate) : null,
      },
      include: {
        raisedBy: { select: { id: true, name: true, email: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
        department: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(issue, { status: 201 });
  } catch (error) {
    console.error('Error creating issue:', error);
    return NextResponse.json(
      { error: 'Failed to create issue' },
      { status: 500 }
    );
  }
}
