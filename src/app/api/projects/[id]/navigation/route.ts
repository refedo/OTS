import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/jwt';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: currentProjectId } = await params;
    const cookieName = process.env.COOKIE_NAME || 'ots_session';
    const token = request.cookies.get(cookieName)?.value;
    const session = token ? verifySession(token) : null;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current project to find its creation date
    const currentProject = await prisma.project.findUnique({
      where: { id: currentProjectId },
      select: { createdAt: true },
    });

    if (!currentProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Get previous project (created before current)
    const previousProject = await prisma.project.findFirst({
      where: {
        createdAt: { lt: currentProject.createdAt },
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });

    // Get next project (created after current)
    const nextProject = await prisma.project.findFirst({
      where: {
        createdAt: { gt: currentProject.createdAt },
      },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });

    return NextResponse.json({
      previousId: previousProject?.id || null,
      nextId: nextProject?.id || null,
    });
  } catch (error) {
    console.error('Error fetching project navigation:', error);
    return NextResponse.json(
      { error: 'Failed to fetch navigation data' },
      { status: 500 }
    );
  }
}
