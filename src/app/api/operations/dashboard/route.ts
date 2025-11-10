import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';

// GET /api/operations/dashboard - Show stage completion rates across all projects
export async function GET(req: NextRequest) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all active projects
    const projects = await prisma.project.findMany({
      where: {
        status: {
          in: ['Active', 'Draft'],
        },
      },
      select: {
        id: true,
        projectNumber: true,
        name: true,
        status: true,
      },
    });

    // Get all stage configs (excluding project-level stages)
    const stageConfigs = await prisma.operationStageConfig.findMany({
      where: {
        stageCode: {
          notIn: ['CONTRACT_SIGNED', 'DOWN_PAYMENT_RECEIVED'],
        },
      },
      orderBy: {
        orderIndex: 'asc',
      },
    });

    // Get all events
    const events = await prisma.operationEvent.findMany({
      where: {
        projectId: {
          in: projects.map((p) => p.id),
        },
      },
    });

    // Get design submissions from document timeline
    const designSubmissions = await prisma.documentSubmission.findMany({
      where: {
        projectId: {
          in: projects.map((p) => p.id),
        },
        documentType: {
          in: ['Structural Design Package', 'Structural Design'],
        },
      },
      select: {
        id: true,
        projectId: true,
        buildingId: true,
        submissionDate: true,
        approvalDate: true,
      },
    });

    // Calculate stage completion rates
    const stageStats = stageConfigs.map((stage) => {
      const completedCount = events.filter(
        (e) => e.stage === stage.stageCode && e.status === 'Completed'
      ).length;
      const pendingCount = events.filter(
        (e) => e.stage === stage.stageCode && e.status === 'Pending'
      ).length;
      const delayedCount = events.filter(
        (e) => e.stage === stage.stageCode && e.status === 'Delayed'
      ).length;
      const failedCount = events.filter(
        (e) => e.stage === stage.stageCode && e.status === 'Failed'
      ).length;

      return {
        stage: stage.stageCode,
        stageName: stage.stageName,
        orderIndex: stage.orderIndex,
        color: stage.color,
        totalProjects: projects.length,
        completedCount,
        pendingCount,
        delayedCount,
        failedCount,
        completionRate: projects.length > 0 ? (completedCount / projects.length) * 100 : 0,
      };
    });

    // Calculate project-level statistics with detailed stage info
    const projectStats = projects.map((project) => {
      const projectEvents = events.filter((e) => e.projectId === project.id);
      const projectDesignSubmissions = designSubmissions.filter((d) => d.projectId === project.id);
      
      // Map each stage config to its status for this project
      const stages = stageConfigs.map((stageConfig) => {
        // For design stages, check document submissions
        if (stageConfig.stageCode === 'DESIGN_SUBMITTED') {
          const designSubmission = projectDesignSubmissions.find(d => d.submissionDate);
          return {
            stageCode: stageConfig.stageCode,
            stageName: stageConfig.stageName,
            status: designSubmission ? 'completed' : 'not_started',
            eventDate: designSubmission?.submissionDate,
          };
        }
        
        if (stageConfig.stageCode === 'DESIGN_APPROVED') {
          const designApproval = projectDesignSubmissions.find(d => d.approvalDate);
          return {
            stageCode: stageConfig.stageCode,
            stageName: stageConfig.stageName,
            status: designApproval ? 'completed' : 'not_started',
            eventDate: designApproval?.approvalDate,
          };
        }

        // For other stages, use operation events
        const event = projectEvents.find((e) => e.stage === stageConfig.stageCode);
        return {
          stageCode: stageConfig.stageCode,
          stageName: stageConfig.stageName,
          status: event
            ? event.status === 'Completed'
              ? 'completed'
              : 'pending'
            : 'not_started',
          eventDate: event?.eventDate,
        };
      });

      const completedStages = stages.filter((s) => s.status === 'completed').length;
      const pendingStages = stages.filter((s) => s.status === 'pending').length;
      const totalStages = stageConfigs.filter((s) => s.isMandatory).length;
      const progress = totalStages > 0 ? (completedStages / totalStages) * 100 : 0;

      const notStartedCount = stages.filter((s) => s.status === 'not_started').length;

      return {
        projectId: project.id,
        projectNumber: project.projectNumber,
        projectName: project.name,
        completedStages,
        totalStages,
        progress,
        status: project.status,
        stages,
        completedCount: completedStages,
        pendingCount: pendingStages,
        notStartedCount,
      };
    });

    // Calculate average duration between stages
    const stageDurations: any[] = [];
    for (let i = 0; i < stageConfigs.length - 1; i++) {
      const currentStage = stageConfigs[i];
      const nextStage = stageConfigs[i + 1];

      const durations: number[] = [];

      for (const project of projects) {
        const currentEvent = events.find(
          (e) => e.projectId === project.id && e.stage === currentStage.stageCode
        );
        const nextEvent = events.find(
          (e) => e.projectId === project.id && e.stage === nextStage.stageCode
        );

        if (currentEvent && nextEvent) {
          const duration = Math.floor(
            (new Date(nextEvent.eventDate).getTime() - new Date(currentEvent.eventDate).getTime()) /
              (1000 * 60 * 60 * 24)
          );
          durations.push(duration);
        }
      }

      if (durations.length > 0) {
        const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
        stageDurations.push({
          from: currentStage.stageName,
          to: nextStage.stageName,
          avgDurationDays: Math.round(avgDuration),
          sampleSize: durations.length,
        });
      }
    }

    // Delayed projects (projects with delayed stages)
    const delayedProjects = projects.filter((project) => {
      return events.some((e) => e.projectId === project.id && e.status === 'Delayed');
    });

    return NextResponse.json({
      stageStats,
      projectStats,
      stageDurations,
      delayedProjects: delayedProjects.map((p) => ({
        id: p.id,
        projectNumber: p.projectNumber,
        name: p.name,
      })),
      summary: {
        totalProjects: projects.length,
        totalEvents: events.length,
        completedEvents: events.filter((e) => e.status === 'Completed').length,
        delayedEvents: events.filter((e) => e.status === 'Delayed').length,
        pendingEvents: events.filter((e) => e.status === 'Pending').length,
      },
    });
  } catch (error) {
    console.error('Error fetching operations dashboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch operations dashboard' },
      { status: 500 }
    );
  }
}
