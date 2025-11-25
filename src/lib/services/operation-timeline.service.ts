import prisma from '@/lib/db';

export interface CreateOperationEventParams {
  projectId: string;
  buildingId?: string | null;
  stage: string;
  eventDate: Date;
  description?: string;
  status?: string;
  eventSource: string;
  createdBy?: string;
}

/**
 * Service for managing operation timeline events
 * Handles automatic event capture from various modules
 */
export class OperationTimelineService {
  /**
   * Create an operation event (with deduplication)
   */
  static async createEvent(params: CreateOperationEventParams) {
    try {
      // Check if event already exists for this stage
      const existingEvent = await prisma.operationEvent.findFirst({
        where: {
          projectId: params.projectId,
          buildingId: params.buildingId || null,
          stage: params.stage,
        },
      });

      // If event exists, don't create duplicate
      if (existingEvent) {
        console.log(
          `Operation event already exists: ${params.stage} for project ${params.projectId}`
        );
        return existingEvent;
      }

      // Create new event
      const event = await prisma.operationEvent.create({
        data: {
          projectId: params.projectId,
          buildingId: params.buildingId || null,
          stage: params.stage,
          eventDate: params.eventDate,
          description: params.description,
          status: params.status || 'Completed',
          eventSource: params.eventSource,
          createdBy: params.createdBy || null,
        },
      });

      console.log(`Created operation event: ${params.stage} for project ${params.projectId}`);
      return event;
    } catch (error) {
      console.error('Error creating operation event:', error);
      throw error;
    }
  }

  /**
   * Handle document control events
   */
  static async handleDocumentEvent(
    documentType: string,
    status: string,
    projectId: string,
    buildingId: string | null,
    eventDate: Date
  ) {
    let stage: string | null = null;
    let description: string | null = null;

    // Map document types and statuses to stages
    if (documentType === 'Architectural Drawing' && status === 'Client Approved') {
      stage = 'ARCH_APPROVED';
      description = 'Architectural drawings approved by client';
    } else if (
      documentType === 'Structural Design Package' &&
      (status === 'Submitted for approval' || status === 'Submitted to get code A')
    ) {
      stage = 'DESIGN_SUBMITTED';
      description = 'Structural design package submitted for approval';
    } else if (documentType === 'Structural Design Package' && status === 'Released') {
      stage = 'DESIGN_APPROVED';
      description = 'Structural design package approved';
    } else if (
      documentType === 'Shop Drawing' &&
      (status === 'Submitted for approval' || status === 'Submitted to get code A')
    ) {
      stage = 'SHOP_SUBMITTED';
      description = 'Shop drawings submitted for approval';
    } else if (documentType === 'Shop Drawing' && status === 'Released') {
      stage = 'SHOP_APPROVED';
      description = 'Shop drawings approved';
    }

    if (stage) {
      await this.createEvent({
        projectId,
        buildingId,
        stage,
        eventDate,
        description,
        eventSource: 'document_control',
      });
    }
  }

  /**
   * Handle production events
   */
  static async handleProductionEvent(
    processType: string,
    projectId: string,
    buildingId: string | null,
    eventDate: Date
  ) {
    let stage: string | null = null;
    let description: string | null = null;

    // Map process types to stages
    if (processType === 'Preparation' || processType === 'Fit-up' || processType === 'Welding') {
      stage = 'PRODUCTION_START';
      description = 'Production and fabrication started';
    } else if (processType === 'Painting' || processType === 'Galvanization') {
      stage = 'COATING_OR_GALVANIZED';
      description = `${processType} completed`;
    } else if (processType === 'Dispatch') {
      stage = 'DISPATCHING';
      description = 'Materials dispatched to site';
    } else if (processType === 'Erection') {
      stage = 'ERECTION_START';
      description = 'On-site erection started';
    }

    if (stage) {
      await this.createEvent({
        projectId,
        buildingId,
        stage,
        eventDate,
        description,
        eventSource: 'production',
      });
    }
  }

  /**
   * Handle procurement events
   */
  static async handleProcurementEvent(projectId: string, eventDate: Date) {
    await this.createEvent({
      projectId,
      buildingId: null,
      stage: 'PROCUREMENT_START',
      eventDate,
      description: 'Material procurement started',
      eventSource: 'procurement',
    });
  }

  /**
   * Mark erection as completed
   */
  static async markErectionCompleted(
    projectId: string,
    buildingId: string | null,
    eventDate: Date
  ) {
    await this.createEvent({
      projectId,
      buildingId,
      stage: 'ERECTION_COMPLETED',
      eventDate,
      description: 'On-site erection completed',
      eventSource: 'production',
    });
  }

  /**
   * Get timeline for a project
   */
  static async getProjectTimeline(projectId: string, buildingId?: string) {
    const events = await prisma.operationEvent.findMany({
      where: {
        projectId,
        ...(buildingId && { buildingId }),
      },
      orderBy: {
        eventDate: 'asc',
      },
    });

    const stageConfigs = await prisma.operationStageConfig.findMany({
      orderBy: {
        orderIndex: 'asc',
      },
    });

    return {
      events,
      stageConfigs,
    };
  }

  /**
   * Check for missing stages and send alerts
   */
  static async checkMissingStages(projectId: string) {
    const events = await prisma.operationEvent.findMany({
      where: { projectId },
    });

    const stageConfigs = await prisma.operationStageConfig.findMany({
      where: { isMandatory: true },
      orderBy: { orderIndex: 'asc' },
    });

    const missingStages = [];

    for (let i = 0; i < stageConfigs.length - 1; i++) {
      const currentStage = stageConfigs[i];
      const nextStage = stageConfigs[i + 1];

      const currentEvent = events.find((e) => e.stage === currentStage.stageCode);
      const nextEvent = events.find((e) => e.stage === nextStage.stageCode);

      // If current stage is completed but next stage is missing
      if (currentEvent && currentEvent.status === 'Completed' && !nextEvent) {
        const daysSinceCompletion = Math.floor(
          (Date.now() - new Date(currentEvent.eventDate).getTime()) / (1000 * 60 * 60 * 24)
        );

        // Alert if more than 1 day
        if (daysSinceCompletion > 1) {
          missingStages.push({
            stage: nextStage.stageCode,
            stageName: nextStage.stageName,
            previousStage: currentStage.stageName,
            daysSinceCompletion,
          });
        }
      }
    }

    return missingStages;
  }
}
