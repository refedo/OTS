/**
 * Project Import Service
 * Handles database operations for importing projects from Excel
 */

import { PrismaClient } from '@prisma/client';
import {
  ParsedExcelData,
  ImportSummary,
  ValidationError,
  ProjectRow,
  BuildingRow,
} from '@/lib/types/project-migration';

const prisma = new PrismaClient();

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Find or create client by name
 */
async function findOrCreateClient(clientName: string, tx?: any): Promise<string> {
  const db = tx || prisma;
  
  if (!clientName || clientName.trim() === '') {
    // Find or create a default "Unknown Client"
    let defaultClient = await db.client.findFirst({
      where: { name: 'Unknown Client' },
    });
    
    if (!defaultClient) {
      defaultClient = await db.client.create({
        data: { name: 'Unknown Client' },
      });
    }
    
    return defaultClient.id;
  }

  // Try to find existing client
  let client = await db.client.findFirst({
    where: { name: clientName.trim() },
  });

  // Create if not found
  if (!client) {
    client = await db.client.create({
      data: { name: clientName.trim() },
    });
  }

  return client.id;
}

/**
 * Find user by name (for project manager and sales engineer)
 */
async function findUserByName(name: string | undefined): Promise<string | undefined> {
  if (!name || name.trim() === '') return undefined;

  const user = await prisma.user.findFirst({
    where: {
      name: {
        contains: name.trim(),
      },
    },
  });

  return user?.id;
}

/**
 * Get default project manager (first admin or PMO user)
 */
async function getDefaultProjectManager(): Promise<string> {
  const defaultUser = await prisma.user.findFirst({
    where: {
      OR: [
        { role: { name: 'Admin' } },
        { role: { name: 'PMO' } },
      ],
    },
  });

  if (!defaultUser) {
    throw new Error('No default project manager found. Please ensure at least one Admin or PMO user exists.');
  }

  return defaultUser.id;
}

/**
 * Parse date from various formats
 */
function parseDate(value: any): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? undefined : parsed;
  }
  
  return undefined;
}

/**
 * Parse decimal value
 */
function parseDecimal(value: any): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  
  if (typeof value === 'number') return value;
  
  if (typeof value === 'string') {
    const cleaned = value.replace(/[$,]/g, '').trim();
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? undefined : parsed;
  }
  
  return undefined;
}

/**
 * Parse boolean value
 */
function parseBoolean(value: any): boolean {
  if (typeof value === 'boolean') return value;
  
  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim();
    return lower === 'yes' || lower === 'true' || lower === '1';
  }
  
  if (typeof value === 'number') {
    return value !== 0;
  }
  
  return false;
}

// ============================================
// MAIN IMPORT FUNCTIONS
// ============================================

/**
 * Import projects and buildings from parsed Excel data
 */
export async function importProjectsFromExcel(
  data: ParsedExcelData
): Promise<ImportSummary> {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  let projectsCreated = 0;
  let projectsUpdated = 0;
  let buildingsCreated = 0;
  let buildingsUpdated = 0;

  try {
    // Use transaction for atomicity
    await prisma.$transaction(async (tx) => {
      // Process each project
      for (let i = 0; i < data.projects.length; i++) {
        const projectRow = data.projects[i];
        const rowNumber = i + 2;

        try {
          // Find or create client
          const clientId = await findOrCreateClient(projectRow.client_name || '', tx);

          // Find project manager
          let projectManagerId = await findUserByName(projectRow.project_manager);
          if (!projectManagerId) {
            projectManagerId = await getDefaultProjectManager();
            warnings.push({
              row: rowNumber,
              field: 'project_manager',
              message: `Project manager "${projectRow.project_manager}" not found. Using default.`,
              severity: 'warning',
            });
          }

          // Find sales engineer (optional)
          const salesEngineerId = await findUserByName(projectRow.sales_engineer);

          // Check if project already exists
          const existingProject = await tx.project.findUnique({
            where: { projectNumber: projectRow.project_code },
          });

          const projectData = {
            projectNumber: projectRow.project_code,
            name: projectRow.project_name,
            clientId,
            projectManagerId,
            salesEngineerId,
            estimationNumber: projectRow.estimation_number,
            contractDate: parseDate(projectRow.contract_date),
            downPaymentDate: parseDate(projectRow.down_payment_date),
            plannedStartDate: parseDate(projectRow.planned_start_date || projectRow.start_date),
            plannedEndDate: parseDate(projectRow.planned_end_date || projectRow.end_date),
            status: projectRow.status || 'Draft',
            contractValue: parseDecimal(projectRow.contract_value),
            downPayment: parseDecimal(projectRow.down_payment),
            downPaymentPercentage: parseDecimal(projectRow.down_payment_percentage),
            downPaymentMilestone: projectRow.down_payment_milestone,
            payment2: parseDecimal(projectRow.payment_2),
            payment2Percentage: parseDecimal(projectRow.payment_2_percentage),
            payment2Milestone: projectRow.payment_2_milestone,
            payment3: parseDecimal(projectRow.payment_3),
            payment3Percentage: parseDecimal(projectRow.payment_3_percentage),
            payment3Milestone: projectRow.payment_3_milestone,
            payment4: parseDecimal(projectRow.payment_4),
            payment4Percentage: parseDecimal(projectRow.payment_4_percentage),
            payment4Milestone: projectRow.payment_4_milestone,
            payment5: parseDecimal(projectRow.payment_5),
            payment5Percentage: parseDecimal(projectRow.payment_5_percentage),
            payment5Milestone: projectRow.payment_5_milestone,
            payment6: parseDecimal(projectRow.payment_6),
            payment6Percentage: parseDecimal(projectRow.payment_6_percentage),
            payment6Milestone: projectRow.payment_6_milestone,
            hoRetention: parseDecimal(projectRow.ho_retention),
            structureType: projectRow.structure_type,
            numberOfStructures: projectRow.no_of_structures ? parseInt(String(projectRow.no_of_structures)) : undefined,
            erectionSubcontractor: projectRow.erection_subcontractor,
            incoterm: projectRow.incoterm,
            scopeOfWork: projectRow.scope_of_work,
            projectNature: projectRow.project_nature,
            projectLocation: projectRow.location,
            cranesIncluded: parseBoolean(projectRow.cranes_included),
            surveyorOurScope: parseBoolean(projectRow.surveyor_our_scope),
            contractualTonnage: parseDecimal(projectRow.tonnage),
            galvanized: parseBoolean(projectRow.galvanized),
            galvanizationMicrons: projectRow.galvanization_microns ? parseInt(String(projectRow.galvanization_microns)) : undefined,
            area: parseDecimal(projectRow.area),
            m2PerTon: parseDecimal(projectRow.m2_per_ton),
            paintCoat1: projectRow.paint_coat_1,
            paintCoat1Microns: projectRow.coat_1_microns ? parseInt(String(projectRow.coat_1_microns)) : undefined,
            paintCoat2: projectRow.paint_coat_2,
            paintCoat2Microns: projectRow.coat_2_microns ? parseInt(String(projectRow.coat_2_microns)) : undefined,
            paintCoat3: projectRow.paint_coat_3,
            paintCoat3Microns: projectRow.coat_3_microns ? parseInt(String(projectRow.coat_3_microns)) : undefined,
            paintCoat4: projectRow.paint_coat_4,
            paintCoat4Microns: projectRow.coat_4_microns ? parseInt(String(projectRow.coat_4_microns)) : undefined,
            remarks: projectRow.remarks,
          };

          if (existingProject) {
            // Update existing project
            await tx.project.update({
              where: { id: existingProject.id },
              data: projectData,
            });
            projectsUpdated++;
          } else {
            // Create new project
            await tx.project.create({
              data: projectData,
            });
            projectsCreated++;
          }
        } catch (error) {
          errors.push({
            row: rowNumber,
            message: `Failed to import project: ${error instanceof Error ? error.message : 'Unknown error'}`,
            severity: 'critical',
          });
        }
      }

      // Process each building
      for (let i = 0; i < data.buildings.length; i++) {
        const buildingRow = data.buildings[i];
        const rowNumber = i + 2;

        try {
          // Find the project
          const project = await tx.project.findUnique({
            where: { projectNumber: buildingRow.project_code },
          });

          if (!project) {
            errors.push({
              row: rowNumber,
              field: 'project_code',
              message: `Project "${buildingRow.project_code}" not found`,
              severity: 'critical',
            });
            continue;
          }

          // Check if building already exists
          const existingBuilding = await tx.building.findUnique({
            where: {
              projectId_designation: {
                projectId: project.id,
                designation: buildingRow.building_code,
              },
            },
          });

          const buildingData = {
            projectId: project.id,
            designation: buildingRow.building_code,
            name: buildingRow.building_name,
            description: buildingRow.remarks,
          };

          if (existingBuilding) {
            // Update existing building
            await tx.building.update({
              where: { id: existingBuilding.id },
              data: buildingData,
            });
            buildingsUpdated++;
          } else {
            // Create new building
            await tx.building.create({
              data: buildingData,
            });
            buildingsCreated++;
          }
        } catch (error) {
          errors.push({
            row: rowNumber,
            message: `Failed to import building: ${error instanceof Error ? error.message : 'Unknown error'}`,
            severity: 'critical',
          });
        }
      }
    });

    return {
      success: errors.length === 0,
      projectsCreated,
      projectsUpdated,
      buildingsCreated,
      buildingsUpdated,
      errors,
      warnings,
      message:
        errors.length === 0
          ? `Successfully imported ${projectsCreated} new projects and ${buildingsCreated} new buildings. Updated ${projectsUpdated} projects and ${buildingsUpdated} buildings.`
          : `Import completed with ${errors.length} errors.`,
    };
  } catch (error) {
    return {
      success: false,
      projectsCreated: 0,
      projectsUpdated: 0,
      buildingsCreated: 0,
      buildingsUpdated: 0,
      errors: [
        {
          row: 0,
          message: `Transaction failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          severity: 'critical',
        },
      ],
      warnings: [],
      message: 'Import failed',
    };
  }
}

/**
 * Get all projects with buildings for export
 */
export async function getAllProjectsForExport() {
  return await prisma.project.findMany({
    include: {
      client: {
        select: {
          name: true,
        },
      },
      projectManager: {
        select: {
          name: true,
        },
      },
      salesEngineer: {
        select: {
          name: true,
        },
      },
      buildings: {
        select: {
          id: true,
          designation: true,
          name: true,
          description: true,
        },
      },
    },
    orderBy: {
      projectNumber: 'asc',
    },
  });
}

/**
 * Get single project with buildings for export
 */
export async function getProjectForExport(projectId: string) {
  return await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      client: {
        select: {
          name: true,
        },
      },
      projectManager: {
        select: {
          name: true,
        },
      },
      salesEngineer: {
        select: {
          name: true,
        },
      },
      buildings: {
        select: {
          id: true,
          designation: true,
          name: true,
          description: true,
        },
      },
    },
  });
}
