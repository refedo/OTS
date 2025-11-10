import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/projects-dashboard - Get all projects with building-level stage data
export async function GET(req: NextRequest) {
  console.log('Projects dashboard API called');
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;

    if (!session) {
      console.log('No session found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Fetching projects...');
    
    // First, try to get ANY projects to test database connection
    const allProjects = await prisma.project.findMany({
      take: 10,
      select: {
        id: true,
        projectNumber: true,
        name: true,
        status: true,
      },
    });
    console.log(`Total projects in database: ${allProjects.length}`);
    
    // Get all active projects with scope of work
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
        contractDate: true,
        downPaymentDate: true,
        scopeOfWorkJson: true,
      },
      orderBy: {
        projectNumber: 'asc',
      },
    });
    console.log(`Found ${projects.length} Active/Draft projects`);

    // TEMPORARY: Return simple data to test
    if (projects.length === 0) {
      console.log('No Active/Draft projects found, returning empty array');
      return NextResponse.json([]);
    }

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

    // Get all buildings for these projects
    const buildings = await prisma.building.findMany({
      where: {
        projectId: {
          in: projects.map((p) => p.id),
        },
      },
      select: {
        id: true,
        projectId: true,
        designation: true,
        name: true,
      },
      orderBy: {
        designation: 'asc',
      },
    });

    // Get all operation events
    const events = await prisma.operationEvent.findMany({
      where: {
        projectId: {
          in: projects.map((p) => p.id),
        },
      },
      select: {
        id: true,
        projectId: true,
        buildingId: true,
        stage: true,
        eventDate: true,
        status: true,
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
        documentType: true,
        submissionDate: true,
        approvalDate: true,
        status: true,
        clientCode: true,
        clientResponse: true,
      },
    });

    // Get production progress for all buildings using Prisma queries instead of raw SQL
    const productionProgressMap = new Map<string, {
      totalParts: number;
      completedParts: number;
      progressPercentage: number;
      totalTonnage: number;
      completedTonnage: number;
      processProgress: Map<string, number>; // Progress by process type
    }>();

    try {
      if (projects.length > 0 && buildings.length > 0) {
        // Get all assembly parts with their production logs
        for (const building of buildings) {
          try {
            const assemblyParts = await prisma.assemblyPart.findMany({
              where: { buildingId: building.id },
              select: {
                id: true,
                netWeightTotal: true,
                quantity: true,
                productionLogs: {
                  select: {
                    processType: true,
                    processedQty: true,
                    remainingQty: true,
                  },
                },
              },
            });

            if (assemblyParts.length === 0) {
              continue; // Skip buildings with no parts
            }

            const totalParts = assemblyParts.length;
            // Convert kg to tons (divide by 1000)
            const totalTonnage = assemblyParts.reduce((sum, part) => sum + (Number(part.netWeightTotal) || 0), 0) / 1000;
            
            // Calculate progress by process type
            const processProgress = new Map<string, number>();
            const processTonnage = new Map<string, { completed: number; total: number }>();
            
            // Initialize process types
            const processTypes = ['Preparation', 'Fit-up', 'Welding', 'Visualization', 'Sandblasting', 'Painting', 'Galvanization', 'Dispatch'];
            processTypes.forEach(type => {
              processTonnage.set(type, { completed: 0, total: totalTonnage });
            });
            
            // Calculate based on all production logs
            let totalProducedTonnage = 0;
            let completedParts = 0;

            assemblyParts.forEach(part => {
              const partWeight = (Number(part.netWeightTotal) || 0) / 1000; // Convert to tons
              const partQty = part.quantity || 1;
              
              // Track progress for each process type
              part.productionLogs.forEach(log => {
                const processType = log.processType;
                const current = processTonnage.get(processType) || { completed: 0, total: totalTonnage };
                
                if (log.remainingQty === 0) {
                  current.completed += partWeight;
                } else {
                  const processedRatio = log.processedQty / partQty;
                  current.completed += partWeight * processedRatio;
                }
                
                processTonnage.set(processType, current);
              });
              
              // Check if part has any production logs for overall progress
              if (part.productionLogs.length > 0) {
                // Get the latest production log (most recent process)
                const latestLog = part.productionLogs[part.productionLogs.length - 1];
                
                // If remaining qty is 0, part is fully produced
                if (latestLog.remainingQty === 0) {
                  completedParts++;
                  totalProducedTonnage += partWeight;
                } else {
                  // Calculate partial completion based on processed qty
                  const processedRatio = latestLog.processedQty / partQty;
                  totalProducedTonnage += partWeight * processedRatio;
                }
              }
            });

            // Calculate percentage for each process
            processTonnage.forEach((value, key) => {
              const percentage = value.total > 0 ? (value.completed / value.total) * 100 : 0;
              processProgress.set(key, percentage);
            });

            const progressPercentage = totalTonnage > 0 ? (totalProducedTonnage / totalTonnage) * 100 : 0;

            console.log(`Building ${building.id}: ${totalProducedTonnage.toFixed(2)}/${totalTonnage.toFixed(2)} tons (${progressPercentage.toFixed(1)}%)`);

            productionProgressMap.set(building.id, {
              totalParts,
              completedParts,
              progressPercentage,
              totalTonnage,
              completedTonnage: totalProducedTonnage,
              processProgress,
            });
          } catch (buildingError) {
            console.error(`Error calculating production for building ${building.id}:`, buildingError);
            // Continue with next building
          }
        }
      }
    } catch (progressError) {
      console.error('Error in production progress calculation:', progressError);
      // Continue without production progress
    }

    // Build the response structure
    const projectsData = projects.map((project) => {
      const projectBuildings = buildings.filter((b) => b.projectId === project.id);
      
      // Parse scope of work to filter stages
      const projectScope = project.scopeOfWorkJson as string[] | null;
      const enabledPhases = projectScope || [];
      
      console.log(`Project ${project.projectNumber} scope:`, enabledPhases);

      const buildingsData = projectBuildings.map((building) => {
        // Get events for this building
        const buildingEvents = events.filter(
          (e) => e.projectId === project.id && e.buildingId === building.id
        );

        // Get design submissions for this building
        const buildingDesignSubmissions = designSubmissions.filter(
          (d) => d.projectId === project.id && d.buildingId === building.id
        );

        // Filter out completed stages and procurement, but keep others and mark as out of scope
        const filteredStageConfigs = stageConfigs.filter((stageConfig) => {
          // Remove all "Completed" stages
          if (stageConfig.stageCode.includes('COMPLETED')) {
            return false;
          }
          
          // Remove Procurement Started
          if (stageConfig.stageCode === 'PROCUREMENT_STARTED') {
            return false;
          }
          
          return true; // Keep all other stages
        });
        
        // Function to check if stage is in scope
        const isInScope = (stageCode: string): boolean => {
          // If no scope configured, all stages are in scope
          if (enabledPhases.length === 0) {
            return true;
          }
          
          // Check based on scope
          if (['DESIGN_SUBMITTED', 'DESIGN_APPROVED'].includes(stageCode)) {
            return enabledPhases.includes('Design') || enabledPhases.includes('Engineering');
          }
          if (['SHOP_SUBMITTED', 'SHOP_APPROVED'].includes(stageCode)) {
            return enabledPhases.includes('Shop Drawing');
          }
          if (['PRODUCTION_STARTED', 'COATING_STARTED'].includes(stageCode)) {
            return enabledPhases.includes('Fabrication') || enabledPhases.includes('Production');
          }
          if (stageCode === 'DISPATCHING_STARTED') {
            return enabledPhases.includes('Delivery') || enabledPhases.includes('Fabrication') || enabledPhases.includes('Production');
          }
          if (stageCode === 'ERECTION_STARTED') {
            return enabledPhases.includes('Erection');
          }
          if (stageCode === 'ARCH_APPROVED') {
            return enabledPhases.includes('Architectural');
          }
          
          return true; // Include by default if not matched
        };

        // Get production progress for this building
        const buildingProgress = productionProgressMap.get(building.id);
        const productionPercentage = buildingProgress?.progressPercentage || 0;
        const totalTonnage = buildingProgress?.totalTonnage || 0;
        const completedTonnage = buildingProgress?.completedTonnage || 0;
        
        console.log(`Building ${building.designation} - Production: ${productionPercentage}%, Tonnage: ${completedTonnage}/${totalTonnage}`);
        if (buildingProgress?.processProgress) {
          console.log('Process progress:', Object.fromEntries(buildingProgress.processProgress));
        }

        // Map stages to their status for this building
        const stages = filteredStageConfigs.map((stageConfig) => {
          console.log(`Processing stage: ${stageConfig.stageCode} (${stageConfig.stageName})`);
          
          const inScope = isInScope(stageConfig.stageCode);
          
          // If out of scope, return minimal stage info
          if (!inScope) {
            return {
              stageCode: stageConfig.stageCode,
              stageName: stageConfig.stageName,
              status: 'out_of_scope' as const,
              outOfScope: true,
            };
          }
          
          // For design stages, check document submissions
          if (stageConfig.stageCode === 'DESIGN_SUBMITTED') {
            const designSubmission = buildingDesignSubmissions.find(d => d.submissionDate);
            return {
              stageCode: stageConfig.stageCode,
              stageName: stageConfig.stageName,
              status: designSubmission ? 'completed' : 'not_started',
              eventDate: designSubmission?.submissionDate,
              clientCode: designSubmission?.clientCode,
              clientResponse: designSubmission?.clientResponse,
              outOfScope: false,
            };
          }
          
          if (stageConfig.stageCode === 'DESIGN_APPROVED') {
            const designApproval = buildingDesignSubmissions.find(d => d.approvalDate);
            return {
              stageCode: stageConfig.stageCode,
              stageName: stageConfig.stageName,
              status: designApproval ? 'completed' : 'not_started',
              eventDate: designApproval?.approvalDate,
              clientCode: designApproval?.clientCode,
              clientResponse: designApproval?.clientResponse,
              outOfScope: false,
            };
          }

          // For production stages, add progress percentage from production logs
          if (stageConfig.stageCode === 'PRODUCTION_STARTED') {
            const event = buildingEvents.find((e) => e.stage === stageConfig.stageCode);
            const cleanStageName = stageConfig.stageName.replace(' Started', '').replace(' Start', '');
            
            // Calculate production progress as average of Fit-up, Welding, and Visualization
            const fitupProgress = buildingProgress?.processProgress.get('Fit-up') || 0;
            const weldingProgress = buildingProgress?.processProgress.get('Welding') || 0;
            const visualizationProgress = buildingProgress?.processProgress.get('Visualization') || 0;
            const actualProductionProgress = (fitupProgress + weldingProgress + visualizationProgress) / 3;
            
            return {
              stageCode: stageConfig.stageCode,
              stageName: cleanStageName,
              status: event ? 'completed' : (actualProductionProgress > 0 ? 'pending' : 'not_started'),
              eventDate: event?.eventDate,
              progressPercentage: actualProductionProgress,
              outOfScope: false,
            };
          }

          // For coating/galvanization stage, show specific progress
          if (stageConfig.stageCode === 'COATING_STARTED') {
            const event = buildingEvents.find((e) => e.stage === stageConfig.stageCode);
            const galvanizationProgress = buildingProgress?.processProgress.get('Galvanization') || 0;
            const paintingProgress = buildingProgress?.processProgress.get('Painting') || 0;
            const coatingProgress = Math.max(galvanizationProgress, paintingProgress);
            const cleanStageName = stageConfig.stageName.replace(' Started', '').replace(' Start', '');
            
            return {
              stageCode: stageConfig.stageCode,
              stageName: cleanStageName,
              status: event ? 'completed' : (coatingProgress > 0 ? 'pending' : 'not_started'),
              eventDate: event?.eventDate,
              progressPercentage: coatingProgress,
              outOfScope: false,
            };
          }

          // For dispatching stage, show dispatch progress
          if (stageConfig.stageCode === 'DISPATCHING_STARTED') {
            const event = buildingEvents.find((e) => e.stage === stageConfig.stageCode);
            const dispatchProgress = buildingProgress?.processProgress.get('Dispatch') || 0;
            const cleanStageName = stageConfig.stageName.replace(' Started', '').replace(' Start', '');
            
            return {
              stageCode: stageConfig.stageCode,
              stageName: cleanStageName,
              status: event ? 'completed' : (dispatchProgress > 0 ? 'pending' : 'not_started'),
              eventDate: event?.eventDate,
              progressPercentage: dispatchProgress,
              outOfScope: false,
            };
          }

          // For other stages, use operation events
          const event = buildingEvents.find((e) => e.stage === stageConfig.stageCode);
          // Remove "Started" from stage name
          const cleanStageName = stageConfig.stageName.replace(' Started', '').replace(' Start', '');
          
          return {
            stageCode: stageConfig.stageCode,
            stageName: cleanStageName,
            status: event
              ? event.status === 'Completed'
                ? 'completed'
                : 'pending'
              : 'not_started',
            eventDate: event?.eventDate,
            outOfScope: false,
          };
        }).filter(Boolean); // Remove null entries

        const completedCount = stages.filter((s) => s?.status === 'completed').length;
        const pendingCount = stages.filter((s) => s?.status === 'pending').length;
        const notStartedCount = stages.filter((s) => s?.status === 'not_started').length;
        const progress = filteredStageConfigs.length > 0 ? (completedCount / filteredStageConfigs.length) * 100 : 0;

        // Log stages for debugging
        console.log(`Building ${building.designation} stages:`, stages.map(s => ({
          name: s?.stageName,
          progress: s?.progressPercentage,
          status: s?.status
        })));

        return {
          id: building.id,
          designation: building.designation,
          name: building.name,
          stages,
          completedCount,
          pendingCount,
          notStartedCount,
          progress,
          productionProgress: productionPercentage,
          totalTonnage,
          completedTonnage,
        };
      });

      return {
        id: project.id,
        projectNumber: project.projectNumber,
        name: project.name,
        status: project.status,
        contractDate: project.contractDate,
        downPaymentDate: project.downPaymentDate,
        buildings: buildingsData,
      };
    });

    console.log(`Returning ${projectsData.length} projects with data`);
    return NextResponse.json(projectsData);
  } catch (error) {
    console.error('Error fetching projects dashboard:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown',
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { 
        error: 'Failed to fetch projects dashboard',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
