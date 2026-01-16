import prisma from '@/lib/db';

/**
 * Sync project contract and down payment dates to operation events
 * This should be called whenever a project is created or updated
 */
export async function syncProjectDatesToEvents(projectId: string) {
  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        contractDate: true,
        downPaymentDate: true,
      },
    });

    if (!project) {
      throw new Error('Project not found');
    }

    // Sync CONTRACT_SIGNED event
    if (project.contractDate) {
      const existingContract = await prisma.operationEvent.findFirst({
        where: {
          projectId: project.id,
          stage: 'CONTRACT_SIGNED',
        },
      });

      if (!existingContract) {
        await prisma.operationEvent.create({
          data: {
            projectId: project.id,
            stage: 'CONTRACT_SIGNED',
            eventDate: project.contractDate,
            status: 'Completed',
            eventSource: 'project_sync',
            description: 'Auto-synced from project contract date',
          },
        });
        console.log(`✅ Created CONTRACT_SIGNED event for project ${projectId}`);
      } else if (existingContract.eventDate.getTime() !== project.contractDate.getTime()) {
        // Update if date changed
        await prisma.operationEvent.update({
          where: { id: existingContract.id },
          data: {
            eventDate: project.contractDate,
            updatedAt: new Date(),
          },
        });
        console.log(`✅ Updated CONTRACT_SIGNED event for project ${projectId}`);
      }
    }

    // Sync DOWN_PAYMENT_RECEIVED event
    if (project.downPaymentDate) {
      const existingDownPayment = await prisma.operationEvent.findFirst({
        where: {
          projectId: project.id,
          stage: 'DOWN_PAYMENT_RECEIVED',
        },
      });

      if (!existingDownPayment) {
        await prisma.operationEvent.create({
          data: {
            projectId: project.id,
            stage: 'DOWN_PAYMENT_RECEIVED',
            eventDate: project.downPaymentDate,
            status: 'Completed',
            eventSource: 'project_sync',
            description: 'Auto-synced from project down payment date',
          },
        });
        console.log(`✅ Created DOWN_PAYMENT_RECEIVED event for project ${projectId}`);
      } else if (existingDownPayment.eventDate.getTime() !== project.downPaymentDate.getTime()) {
        // Update if date changed
        await prisma.operationEvent.update({
          where: { id: existingDownPayment.id },
          data: {
            eventDate: project.downPaymentDate,
            updatedAt: new Date(),
          },
        });
        console.log(`✅ Updated DOWN_PAYMENT_RECEIVED event for project ${projectId}`);
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error syncing project dates to events:', error);
    throw error;
  }
}

/**
 * Capture an operation event with deduplication
 */
export async function captureOperationEvent(data: {
  projectId: string;
  buildingId?: string | null;
  stage: string;
  eventDate: Date;
  status?: string;
  description?: string;
  eventSource: string;
  createdBy?: string;
}) {
  try {
    // Check for existing event
    const existing = await prisma.operationEvent.findFirst({
      where: {
        projectId: data.projectId,
        buildingId: data.buildingId || null,
        stage: data.stage,
      },
    });

    if (existing) {
      console.log(`Event already exists for stage ${data.stage}, skipping...`);
      return { success: true, event: existing, created: false };
    }

    // Create new event
    const event = await prisma.operationEvent.create({
      data: {
        projectId: data.projectId,
        buildingId: data.buildingId || null,
        stage: data.stage,
        eventDate: data.eventDate,
        status: data.status || 'Completed',
        description: data.description,
        eventSource: data.eventSource,
        createdBy: data.createdBy,
      },
    });

    console.log(`✅ Created operation event: ${data.stage}`);
    return { success: true, event, created: true };
  } catch (error) {
    console.error('Error capturing operation event:', error);
    throw error;
  }
}
