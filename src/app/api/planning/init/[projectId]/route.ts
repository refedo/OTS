import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';

const PHASE_ORDER = [
  'Design',
  'Shop Drawing',
  'Procurement',
  'Fabrication',
  'Coating',
  'Delivery',
  'Erection',
];

export async function POST(
  request: Request,
  { params }: { params: { projectId: string } }
) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only Admin and Manager can initialize plans
    if (session.role !== 'Admin' && session.role !== 'Manager') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { projectId } = params;

    // Fetch project with scope of work
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        scopeOfWorkJson: true,
        coatingSystem: true,
        isGalvanized: true,
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Get enabled phases from scope of work
    const scopeOfWork = (project.scopeOfWorkJson as string[]) || PHASE_ORDER;

    // Check if Coating should be included
    const shouldIncludeCoating =
      project.coatingSystem || project.isGalvanized;

    // Filter phases based on scope of work
    const enabledPhases = PHASE_ORDER.filter((phase) => {
      if (phase === 'Coating' && !shouldIncludeCoating) {
        return false;
      }
      return scopeOfWork.includes(phase);
    });

    // Check if plans already exist
    const existingPlans = await prisma.projectPlan.findMany({
      where: { projectId },
    });

    if (existingPlans.length > 0) {
      return NextResponse.json(
        { error: 'Project plan already initialized' },
        { status: 400 }
      );
    }

    // Create project plans for each enabled phase
    const plans = await Promise.all(
      enabledPhases.map((phase) =>
        prisma.projectPlan.create({
          data: {
            projectId,
            phase,
            status: 'Not Started',
            progress: 0,
            createdById: session.sub,
          },
          include: {
            project: {
              select: {
                projectNumber: true,
                name: true,
              },
            },
            createdBy: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        })
      )
    );

    return NextResponse.json(
      {
        message: `${plans.length} project phases initialized`,
        plans,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error initializing project plan:', error);
    return NextResponse.json(
      { error: 'Failed to initialize project plan' },
      { status: 500 }
    );
  }
}
