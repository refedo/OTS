import { NextResponse } from 'next/server';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';
import { logActivity } from '@/lib/api-utils';
import { logger } from '@/lib/logger';
import { randomUUID } from 'crypto';

const coatSchema = z.object({
  coatName: z.string().min(1),
  microns: z.string().optional().default(''),
  ralNumber: z.string().optional().default(''),
});

const createSchema = z.object({
  name: z.string().max(255).optional().nullable(),
  appliesToAll: z.boolean().default(true),
  buildingIds: z.array(z.string().uuid()).default([]),
  coats: z.array(coatSchema).min(1),
  isGalvanized: z.boolean().default(false),
  galvanizationMicrons: z.number().int().positive().optional().nullable(),
  sortOrder: z.number().int().default(0),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const project = await prisma.project.findUnique({
    where: { id, deletedAt: null },
    select: { id: true },
  });
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const systems = await prisma.projectCoatingSystem.findMany({
    where: { projectId: id },
    include: {
      buildings: {
        include: {
          building: { select: { id: true, name: true, designation: true } },
        },
      },
    },
    orderBy: { sortOrder: 'asc' },
  });

  return NextResponse.json(systems);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const project = await prisma.project.findUnique({
      where: { id, deletedAt: null },
      select: { id: true, projectNumber: true, name: true },
    });
    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error }, { status: 400 });
    }

    const { buildingIds, coats, ...rest } = parsed.data;
    const systemId = randomUUID();

    const system = await prisma.projectCoatingSystem.create({
      data: {
        id: systemId,
        projectId: id,
        coats: coats as unknown as import('@prisma/client').Prisma.InputJsonValue,
        ...rest,
        buildings: buildingIds.length > 0
          ? { create: buildingIds.map((bId) => ({ buildingId: bId })) }
          : undefined,
      },
      include: {
        buildings: {
          include: {
            building: { select: { id: true, name: true, designation: true } },
          },
        },
      },
    });

    await logActivity({
      action: 'UPDATE',
      entityType: 'Project',
      entityId: id,
      entityName: `${project.projectNumber} - ${project.name}`,
      userId: session.sub,
      projectId: id,
      metadata: { action: 'coating_system_add', systemId },
    });

    logger.info({ projectId: id, systemId, userId: session.sub }, 'Coating system created');

    return NextResponse.json(system, { status: 201 });
  } catch (error) {
    logger.error({ error }, 'Error creating coating system');
    return NextResponse.json({ error: 'Failed to create coating system' }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const project = await prisma.project.findUnique({
      where: { id, deletedAt: null },
      select: { id: true, projectNumber: true, name: true },
    });
    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const body = await req.json();
    const bulkSchema = z.array(createSchema.extend({ id: z.string().uuid().optional() }));
    const parsed = bulkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error }, { status: 400 });
    }

    // Replace all coating systems for this project
    await prisma.projectCoatingSystem.deleteMany({ where: { projectId: id } });

    const created = await Promise.all(
      parsed.data.map(async (item, idx) => {
        const { buildingIds, coats, id: _id, ...rest } = item;
        const systemId = randomUUID();
        return prisma.projectCoatingSystem.create({
          data: {
            id: systemId,
            projectId: id,
            coats: coats as unknown as import('@prisma/client').Prisma.InputJsonValue,
            sortOrder: idx,
            ...rest,
            buildings: buildingIds.length > 0
              ? { create: buildingIds.map((bId) => ({ buildingId: bId })) }
              : undefined,
          },
          include: {
            buildings: {
              include: {
                building: { select: { id: true, name: true, designation: true } },
              },
            },
          },
        });
      })
    );

    await logActivity({
      action: 'UPDATE',
      entityType: 'Project',
      entityId: id,
      entityName: `${project.projectNumber} - ${project.name}`,
      userId: session.sub,
      projectId: id,
      metadata: { action: 'coating_systems_replace', count: created.length },
    });

    logger.info({ projectId: id, count: created.length, userId: session.sub }, 'Coating systems replaced');

    return NextResponse.json(created);
  } catch (error) {
    logger.error({ error }, 'Error replacing coating systems');
    return NextResponse.json({ error: 'Failed to replace coating systems' }, { status: 500 });
  }
}
