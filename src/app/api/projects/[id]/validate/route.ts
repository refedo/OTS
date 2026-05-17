import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { logActivity } from '@/lib/api-utils';
import { logger } from '@/lib/logger';

const stepNoteSchema = z.object({
  status: z.enum(['verified', 'needs_rectification', 'pending']),
  note: z.string().max(1000).default(''),
});

const validateSchema = z.object({
  party: z.enum(['sales', 'projects', 'operations']),
  stepNotes: z.record(z.string(), stepNoteSchema).optional(),
});

function computeStatus(stepNotes: Record<string, { status: string; note: string }> | null | undefined): string {
  if (!stepNotes || Object.keys(stepNotes).length === 0) return 'pending';
  const values = Object.values(stepNotes);
  if (values.some((v) => v.status === 'needs_rectification')) return 'needs_rectification';
  if (values.every((v) => v.status === 'verified')) return 'verified';
  return 'pending';
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const validation = await prisma.projectValidation.findUnique({
    where: { projectId: id },
    include: {
      salesValidatedBy: { select: { id: true, name: true } },
      projectsValidatedBy: { select: { id: true, name: true } },
      operationsValidatedBy: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(validation ?? null);
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

    const body = await req.json();
    const parsed = validateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error }, { status: 400 });
    }

    const { party, stepNotes } = parsed.data;

    const project = await prisma.project.findUnique({
      where: { id },
      select: {
        id: true,
        projectNumber: true,
        name: true,
        salesEngineerId: true,
        projectManagerId: true,
        operationsManagerId: true,
      },
    });

    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

    const partyOwnerId =
      party === 'sales' ? project.salesEngineerId :
      party === 'projects' ? project.projectManagerId :
      project.operationsManagerId;

    const currentUser = await prisma.user.findUnique({
      where: { id: session.sub },
      select: { isAdmin: true, role: { select: { name: true } } },
    });

    const isAdminOrCeo = currentUser?.isAdmin ||
      currentUser?.role?.name === 'Admin' ||
      currentUser?.role?.name === 'CEO';

    const isDesignatedParty = session.sub === partyOwnerId;

    if (!isDesignatedParty && !isAdminOrCeo) {
      return NextResponse.json({ error: 'Forbidden: only the assigned employee or an admin can validate this party' }, { status: 403 });
    }

    const now = new Date();
    const overallStatus = computeStatus(stepNotes as Record<string, { status: string; note: string }> | undefined);
    const isVerified = overallStatus === 'verified';

    const updateData =
      party === 'sales'
        ? {
            salesValidatedById: isVerified ? session.sub : null,
            salesValidatedAt: isVerified ? now : null,
            salesStepNotes: stepNotes ?? {},
            salesStatus: overallStatus,
          }
        : party === 'projects'
        ? {
            projectsValidatedById: isVerified ? session.sub : null,
            projectsValidatedAt: isVerified ? now : null,
            projectsStepNotes: stepNotes ?? {},
            projectsStatus: overallStatus,
          }
        : {
            operationsValidatedById: isVerified ? session.sub : null,
            operationsValidatedAt: isVerified ? now : null,
            operationsStepNotes: stepNotes ?? {},
            operationsStatus: overallStatus,
          };

    const validation = await prisma.projectValidation.upsert({
      where: { projectId: id },
      create: { projectId: id, ...updateData },
      update: updateData,
      include: {
        salesValidatedBy: { select: { id: true, name: true } },
        projectsValidatedBy: { select: { id: true, name: true } },
        operationsValidatedBy: { select: { id: true, name: true } },
      },
    });

    await logActivity({
      action: 'UPDATE',
      entityType: 'Project',
      entityId: id,
      entityName: `${project.projectNumber} - ${project.name}`,
      userId: session.sub,
      projectId: id,
      metadata: { action: 'validation', party, status: overallStatus },
    });

    logger.info({ projectId: id, party, status: overallStatus, userId: session.sub }, 'Project validation submitted');

    return NextResponse.json(validation);
  } catch (error) {
    logger.error({ error }, 'Error submitting project validation');
    return NextResponse.json({ error: 'Failed to submit validation' }, { status: 500 });
  }
}
