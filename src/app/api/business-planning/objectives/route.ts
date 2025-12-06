import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

    const objectives = await prisma.companyObjective.findMany({
      where,
      include: {
        owner: { select: { id: true, name: true, email: true } },
        keyResults: {
          include: {
            progressUpdates: {
              orderBy: { recordedDate: 'desc' },
              take: 1,
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

    return NextResponse.json(objectives);
  } catch (error) {
    console.error('Error fetching objectives:', error);
    return NextResponse.json(
      { error: 'Failed to fetch objectives' },
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
