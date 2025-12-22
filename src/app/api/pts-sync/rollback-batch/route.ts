import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';

export async function POST(req: Request) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { batchId } = await req.json();

    if (!batchId) {
      return NextResponse.json({ error: 'Batch ID is required' }, { status: 400 });
    }

    // Get the sync batch
    const syncBatch = await prisma.pTSSyncBatch.findUnique({
      where: { id: batchId },
    });

    if (!syncBatch) {
      return NextResponse.json({ error: 'Sync batch not found' }, { status: 404 });
    }

    if (syncBatch.rolledBack) {
      return NextResponse.json({ error: 'This batch has already been rolled back' }, { status: 400 });
    }

    // Get project numbers from the batch
    const projectNumbers = Array.isArray(syncBatch.projectNumbers) 
      ? syncBatch.projectNumbers as string[]
      : [];

    if (projectNumbers.length === 0) {
      return NextResponse.json({ error: 'No projects found in this batch' }, { status: 400 });
    }

    // Delete all PTS-synced data for these projects
    let totalPartsDeleted = 0;
    let totalLogsDeleted = 0;

    for (const projectNumber of projectNumbers) {
      // Find the project
      const project = await prisma.project.findFirst({
        where: { projectNumber },
      });

      if (!project) continue;

      // Delete production logs with source='PTS' for this project
      const logsDeleted = await prisma.productionLog.deleteMany({
        where: {
          assemblyPart: {
            project: {
              projectNumber,
            },
          },
          source: 'PTS',
        },
      });

      // Delete assembly parts with source='PTS' for this project
      const partsDeleted = await prisma.assemblyPart.deleteMany({
        where: {
          projectId: project.id,
          source: 'PTS',
        },
      });

      totalPartsDeleted += partsDeleted.count;
      totalLogsDeleted += logsDeleted.count;
    }

    // Mark the batch as rolled back
    await prisma.pTSSyncBatch.update({
      where: { id: batchId },
      data: {
        rolledBack: true,
        rolledBackAt: new Date(),
        rolledBackById: session.sub,
      },
    });

    return NextResponse.json({
      success: true,
      partsDeleted: totalPartsDeleted,
      logsDeleted: totalLogsDeleted,
      projectsAffected: projectNumbers.length,
    });
  } catch (error) {
    console.error('Error rolling back sync batch:', error);
    return NextResponse.json(
      { error: 'Failed to rollback sync batch' },
      { status: 500 }
    );
  }
}
