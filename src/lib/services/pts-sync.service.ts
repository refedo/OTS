/**
 * PTS Sync Service - Streamlined sync for Raw Data and Logs
 * 
 * Two-phase sync:
 * 1. Sync Raw Data → AssemblyParts (with project/building mapping)
 * 2. Sync Logs → ProductionLogs (linked to assembly parts)
 */

import { google, sheets_v4 } from 'googleapis';
import { prisma } from '@/lib/prisma';

// PTS Spreadsheet configuration
const SPREADSHEET_ID = '11jXnWje2-4n9FPUB1jsJrkP6ioooKgnoYVkwVGG4hPI';
const RAW_DATA_SHEET = '02-Raw Data';
const LOG_SHEET = '04-Log';

// Column mappings for Raw Data sheet
const RAW_DATA_COLUMNS = {
  projectNumber: 'B',      // Project Number (e.g., "254")
  logDesignation: 'C',     // Log designation / Part# (e.g., "254-Z8T-CO2")
  assemblyMark: 'E',       // Assembly Mark (e.g., "CO2")
  subAssemblyMark: 'F',    // Sub-Assembly Mark
  partMark: 'G',           // Part Mark
  quantity: 'H',           // Quantity
  name: 'I',               // Name (e.g., "BEAM")
  profile: 'J',            // Profile (e.g., "UC203*203*46")
  grade: 'K',              // Grade
  length: 'L',             // Length(mm)
  areaPerOne: 'M',         // Net Area(m²) for one
  areaTotal: 'N',          // Net Area(m²) for all
  weightPerOne: 'O',       // Single Part Weight
  weightTotal: 'P',        // Net Weight(kg) for all
  buildingDesignation: 'R', // Building Designation (e.g., "Z8T")
  buildingName: 'T',       // Building Name (e.g., "Zone 8 Toilet")
};

// Column mappings for Log sheet
const LOG_COLUMNS = {
  partNumber: 'B',         // Part# (e.g., "253-103-CO11")
  process: 'C',            // Process (e.g., "Fit-up")
  processedQty: 'D',       // Processed Qty
  processDate: 'E',        // Process Date (e.g., "Mon-07-Oct-2024")
  processLocation: 'F',    // Process Location
  processedBy: 'G',        // Processed By
  reportNo: 'H',           // Report No.
  projectNumber: 'I',      // Project #
  weightPerPc: 'J',        // Weight/Pc
  buildingName: 'R',       // Building Name
};

// Process type normalization
const PROCESS_TYPE_MAP: Record<string, string> = {
  'fit-up': 'Fit-up',
  'fitup': 'Fit-up',
  'welding': 'Welding',
  'weld': 'Welding',
  'visualization': 'Visualization',
  'visual': 'Visualization',
  'sandblasting': 'Sandblasting',
  'sand blasting': 'Sandblasting',
  'painting': 'Painting',
  'paint': 'Painting',
  'galvanization': 'Galvanization',
  'galvanizing': 'Galvanization',
  'dispatch': 'Dispatch',
  'erection': 'Erection',
  'preparation': 'Preparation',
  'prep': 'Preparation',
};

export interface SyncValidation {
  projects: {
    ptsProjects: string[];
    otsProjects: { id: string; projectNumber: string; name: string }[];
    matched: { pts: string; ots: { id: string; projectNumber: string } }[];
    unmatched: string[];
  };
  buildings: {
    ptsBuildings: { projectNumber: string; designation: string; name: string }[];
    matched: { pts: { projectNumber: string; designation: string }; otsId: string }[];
    unmatched: { projectNumber: string; designation: string; name: string }[];
  };
  rawDataCount: number;
  logCount: number;
  newPartsCount: number;
  existingPartsCount: number;
  newLogsCount: number;
  existingLogsCount: number;
}

export interface SyncProgress {
  phase: 'validating' | 'raw-data' | 'logs' | 'complete';
  current: number;
  total: number;
  message: string;
}

export interface SkippedItem {
  rowNumber: number;
  partDesignation: string;
  projectNumber: string;
  reason: string;
  type: 'part' | 'log';
}

export interface ProjectSyncStats {
  projectNumber: string;
  projectName: string;
  totalParts: number;
  syncedParts: number;
  totalLogs: number;
  syncedLogs: number;
  completionPercent: number;
}

export interface SyncedItem {
  partDesignation: string;
  projectNumber: string;
  buildingName: string | null;
  processType?: string;
  action: 'created' | 'updated';
  type: 'part' | 'log';
}

export interface SyncResult {
  success: boolean;
  partsCreated: number;
  partsUpdated: number;
  logsCreated: number;
  logsUpdated: number;
  errors: string[];
  skippedItems: SkippedItem[];
  syncedItems: SyncedItem[];
  projectStats: ProjectSyncStats[];
  duration: number;
  syncBatchId: string;
}

class PTSSyncService {
  private sheets: sheets_v4.Sheets | null = null;
  private initialized = false;

  /**
   * Initialize Google Sheets API
   */
  async initialize(): Promise<boolean> {
    if (this.initialized && this.sheets) {
      return true;
    }

    try {
      const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
      if (!keyJson) {
        console.error('[PTS Sync] GOOGLE_SERVICE_ACCOUNT_KEY not configured');
        return false;
      }

      const credentials = JSON.parse(keyJson);
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
      });

      this.sheets = google.sheets({ version: 'v4', auth });
      this.initialized = true;
      console.log('[PTS Sync] Google Sheets API initialized');
      return true;
    } catch (error) {
      console.error('[PTS Sync] Failed to initialize:', error);
      return false;
    }
  }

  /**
   * Get column index from letter (A=0, B=1, etc.)
   */
  private colIndex(col: string): number {
    return col.charCodeAt(0) - 65;
  }

  /**
   * Parse date from PTS format (e.g., "Mon-07-Oct-2024")
   */
  private parseDate(dateStr: string): Date | null {
    if (!dateStr) return null;

    try {
      // Handle "Mon-07-Oct-2024" format
      const match = dateStr.match(/\w+-(\d+)-(\w+)-(\d+)/);
      if (match) {
        const [, day, monthStr, year] = match;
        const months: Record<string, number> = {
          'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
          'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11,
        };
        const month = months[monthStr.toLowerCase()];
        if (month !== undefined) {
          return new Date(parseInt(year), month, parseInt(day));
        }
      }

      // Try standard date parsing
      const parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Normalize process type
   */
  private normalizeProcess(process: string): string {
    const normalized = PROCESS_TYPE_MAP[process.toLowerCase().trim()];
    return normalized || process;
  }

  /**
   * Validate sync - compare PTS data with OTS
   */
  async validateSync(): Promise<SyncValidation> {
    if (!await this.initialize()) {
      throw new Error('Failed to initialize Google Sheets API');
    }

    console.log('[PTS Sync] Starting validation...');

    // Fetch raw data
    const rawDataResponse = await this.sheets!.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${RAW_DATA_SHEET}'!A2:T`,
    });
    const rawDataRows = rawDataResponse.data.values || [];

    // Fetch log data
    const logResponse = await this.sheets!.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${LOG_SHEET}'!A2:R`,
    });
    const logRows = logResponse.data.values || [];

    // Extract unique projects and buildings from PTS
    const ptsProjectsSet = new Set<string>();
    const ptsBuildingsMap = new Map<string, { projectNumber: string; designation: string; name: string }>();

    for (const row of rawDataRows) {
      const projectNumber = row[this.colIndex(RAW_DATA_COLUMNS.projectNumber)]?.toString().trim();
      const buildingDesig = row[this.colIndex(RAW_DATA_COLUMNS.buildingDesignation)]?.toString().trim();
      const buildingName = row[this.colIndex(RAW_DATA_COLUMNS.buildingName)]?.toString().trim();

      if (projectNumber) {
        ptsProjectsSet.add(projectNumber);
      }
      if (projectNumber && buildingDesig) {
        const key = `${projectNumber}-${buildingDesig}`;
        if (!ptsBuildingsMap.has(key)) {
          ptsBuildingsMap.set(key, { projectNumber, designation: buildingDesig, name: buildingName || buildingDesig });
        }
      }
    }

    // Get OTS projects
    const otsProjects = await prisma.project.findMany({
      select: { id: true, projectNumber: true, name: true },
    });

    // Match projects
    const matchedProjects: { pts: string; ots: { id: string; projectNumber: string } }[] = [];
    const unmatchedProjects: string[] = [];

    for (const ptsProject of ptsProjectsSet) {
      const otsMatch = otsProjects.find(p => p.projectNumber === ptsProject);
      if (otsMatch) {
        matchedProjects.push({ pts: ptsProject, ots: { id: otsMatch.id, projectNumber: otsMatch.projectNumber } });
      } else {
        unmatchedProjects.push(ptsProject);
      }
    }

    // Get OTS buildings for matched projects
    const matchedProjectIds = matchedProjects.map(m => m.ots.id);
    const otsBuildings = await prisma.building.findMany({
      where: { projectId: { in: matchedProjectIds } },
      select: { id: true, designation: true, name: true, projectId: true },
    });

    // Match buildings
    const matchedBuildings: { pts: { projectNumber: string; designation: string }; otsId: string }[] = [];
    const unmatchedBuildings: { projectNumber: string; designation: string; name: string }[] = [];

    for (const [, ptsBuilding] of ptsBuildingsMap) {
      const projectMatch = matchedProjects.find(m => m.pts === ptsBuilding.projectNumber);
      if (projectMatch) {
        const otsBuilding = otsBuildings.find(
          b => b.projectId === projectMatch.ots.id && 
               (b.designation === ptsBuilding.designation || b.name === ptsBuilding.name)
        );
        if (otsBuilding) {
          matchedBuildings.push({ 
            pts: { projectNumber: ptsBuilding.projectNumber, designation: ptsBuilding.designation }, 
            otsId: otsBuilding.id 
          });
        } else {
          unmatchedBuildings.push(ptsBuilding);
        }
      }
    }

    // Count existing vs new parts
    const ptsPartDesignations = rawDataRows
      .map(row => row[this.colIndex(RAW_DATA_COLUMNS.logDesignation)]?.toString().trim())
      .filter(Boolean);

    const existingParts = await prisma.assemblyPart.findMany({
      where: { partDesignation: { in: ptsPartDesignations } },
      select: { partDesignation: true },
    });
    const existingPartSet = new Set(existingParts.map(p => p.partDesignation));

    // Count existing vs new logs
    const ptsLogKeys = logRows.map(row => {
      const partNumber = row[this.colIndex(LOG_COLUMNS.partNumber)]?.toString().trim();
      const process = row[this.colIndex(LOG_COLUMNS.process)]?.toString().trim();
      const dateStr = row[this.colIndex(LOG_COLUMNS.processDate)]?.toString().trim();
      return `${partNumber}-${process}-${dateStr}`;
    }).filter(k => k !== '--');

    console.log(`[PTS Sync] Validation complete: ${rawDataRows.length} raw data rows, ${logRows.length} log rows`);

    return {
      projects: {
        ptsProjects: Array.from(ptsProjectsSet),
        otsProjects,
        matched: matchedProjects,
        unmatched: unmatchedProjects,
      },
      buildings: {
        ptsBuildings: Array.from(ptsBuildingsMap.values()),
        matched: matchedBuildings,
        unmatched: unmatchedBuildings,
      },
      rawDataCount: rawDataRows.length,
      logCount: logRows.length,
      newPartsCount: ptsPartDesignations.length - existingPartSet.size,
      existingPartsCount: existingPartSet.size,
      newLogsCount: logRows.length, // Will be refined during actual sync
      existingLogsCount: 0,
    };
  }

  /**
   * Sync raw data (AssemblyParts) from PTS
   */
  async syncRawData(
    userId: string,
    autoCreateBuildings: boolean = true,
    selectedProjects?: string[],
    selectedBuildings?: string[],
    onProgress?: (progress: SyncProgress) => void
  ): Promise<{ created: number; updated: number; errors: string[] }> {
    if (!await this.initialize()) {
      throw new Error('Failed to initialize Google Sheets API');
    }

    console.log('[PTS Sync] Starting raw data sync...');
    onProgress?.({ phase: 'raw-data', current: 0, total: 0, message: 'Fetching raw data...' });

    // Fetch all raw data
    const response = await this.sheets!.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${RAW_DATA_SHEET}'!A2:T`,
    });
    const rows = response.data.values || [];

    onProgress?.({ phase: 'raw-data', current: 0, total: rows.length, message: `Processing ${rows.length} parts...` });

    // Cache projects and buildings
    const projectCache = new Map<string, string>();
    const buildingCache = new Map<string, string>();

    const projects = await prisma.project.findMany({ select: { id: true, projectNumber: true } });
    projects.forEach(p => projectCache.set(p.projectNumber, p.id));

    const buildings = await prisma.building.findMany({ 
      select: { id: true, designation: true, name: true, projectId: true } 
    });
    buildings.forEach(b => {
      const project = projects.find(p => p.id === b.projectId);
      if (project) {
        buildingCache.set(`${project.projectNumber}-${b.designation}`, b.id);
        if (b.name) {
          buildingCache.set(`${project.projectNumber}-${b.name}`, b.id);
        }
      }
    });

    let created = 0;
    let updated = 0;
    const errors: string[] = [];

    // Process in batches
    const BATCH_SIZE = 100;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      
      for (const row of batch) {
        try {
          const projectNumber = row[this.colIndex(RAW_DATA_COLUMNS.projectNumber)]?.toString().trim();
          const partDesignation = row[this.colIndex(RAW_DATA_COLUMNS.logDesignation)]?.toString().trim();
          const buildingDesig = row[this.colIndex(RAW_DATA_COLUMNS.buildingDesignation)]?.toString().trim();
          const buildingName = row[this.colIndex(RAW_DATA_COLUMNS.buildingName)]?.toString().trim();

          if (!projectNumber || !partDesignation) {
            errors.push(`Skipped row: Missing project number or part designation`);
            continue;
          }

          // Skip items without building designation (validation requirement)
          if (!buildingDesig) {
            errors.push(`Skipped part ${partDesignation}: Missing building designation`);
            continue;
          }

          // Filter by selected projects
          if (selectedProjects && selectedProjects.length > 0 && !selectedProjects.includes(projectNumber)) {
            continue;
          }

          // Get project ID
          const projectId = projectCache.get(projectNumber);
          if (!projectId) {
            errors.push(`Project not found: ${projectNumber} (part: ${partDesignation})`);
            continue;
          }

          // Filter by selected buildings
          if (buildingDesig && selectedBuildings && selectedBuildings.length > 0) {
            const buildingKey = `${projectNumber}-${buildingDesig}`;
            if (!selectedBuildings.includes(buildingKey)) {
              continue;
            }
          }

          // Get or create building
          let buildingId: string | null = null;
          if (buildingDesig) {
            const buildingKey = `${projectNumber}-${buildingDesig}`;
            buildingId = buildingCache.get(buildingKey) || null;

            if (!buildingId && autoCreateBuildings) {
              // Create building
              const newBuilding = await prisma.building.create({
                data: {
                  projectId,
                  designation: buildingDesig,
                  name: buildingName || buildingDesig,
                },
              });
              buildingId = newBuilding.id;
              buildingCache.set(buildingKey, buildingId);
              console.log(`[PTS Sync] Created building: ${buildingDesig} (${buildingName})`);
            }
          }

          // Parse other fields
          const assemblyMark = row[this.colIndex(RAW_DATA_COLUMNS.assemblyMark)]?.toString().trim() || '';
          const subAssemblyMark = row[this.colIndex(RAW_DATA_COLUMNS.subAssemblyMark)]?.toString().trim() || null;
          const partMark = row[this.colIndex(RAW_DATA_COLUMNS.partMark)]?.toString().trim() || '';
          const quantity = parseInt(row[this.colIndex(RAW_DATA_COLUMNS.quantity)]) || 1;
          const name = row[this.colIndex(RAW_DATA_COLUMNS.name)]?.toString().trim() || '';
          const profile = row[this.colIndex(RAW_DATA_COLUMNS.profile)]?.toString().trim() || '';
          const grade = row[this.colIndex(RAW_DATA_COLUMNS.grade)]?.toString().trim() || null;
          const lengthMm = parseFloat(row[this.colIndex(RAW_DATA_COLUMNS.length)]) || null;
          const netAreaPerUnit = parseFloat(row[this.colIndex(RAW_DATA_COLUMNS.areaPerOne)]) || null;
          const netAreaTotal = parseFloat(row[this.colIndex(RAW_DATA_COLUMNS.areaTotal)]) || null;
          const singlePartWeight = parseFloat(row[this.colIndex(RAW_DATA_COLUMNS.weightPerOne)]) || null;
          const netWeightTotal = parseFloat(row[this.colIndex(RAW_DATA_COLUMNS.weightTotal)]) || null;

          // Check if part exists
          const existingPart = await prisma.assemblyPart.findFirst({
            where: { partDesignation, projectId },
          });

          if (existingPart) {
            // Update existing part
            await prisma.assemblyPart.update({
              where: { id: existingPart.id },
              data: {
                buildingId,
                assemblyMark,
                subAssemblyMark,
                partMark,
                quantity,
                name,
                profile,
                grade,
                lengthMm,
                netAreaPerUnit,
                netAreaTotal,
                singlePartWeight,
                netWeightTotal,
                source: 'PTS',
                externalRef: partDesignation,
              },
            });
            updated++;
          } else {
            // Create new part
            await prisma.assemblyPart.create({
              data: {
                projectId,
                buildingId,
                partDesignation,
                assemblyMark,
                subAssemblyMark,
                partMark,
                quantity,
                name,
                profile,
                grade,
                lengthMm,
                netAreaPerUnit,
                netAreaTotal,
                singlePartWeight,
                netWeightTotal,
                status: 'Not Started',
                createdById: userId,
                source: 'PTS',
                externalRef: partDesignation,
              },
            });
            created++;
          }
        } catch (error) {
          const msg = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`Row ${i}: ${msg}`);
        }
      }

      onProgress?.({ 
        phase: 'raw-data', 
        current: Math.min(i + BATCH_SIZE, rows.length), 
        total: rows.length, 
        message: `Processed ${Math.min(i + BATCH_SIZE, rows.length)} of ${rows.length} parts` 
      });
    }

    console.log(`[PTS Sync] Raw data sync complete: ${created} created, ${updated} updated, ${errors.length} errors`);
    return { created, updated, errors };
  }

  /**
   * Sync logs (ProductionLogs) from PTS
   * Only fetches: Part#, Process, Processed Qty, Process Date, Process Location, Processed By, Report No.
   * Other fields (project, building, weight, name) are read from existing assembly parts
   * Only syncs logs that have matching assembly parts in OTS
   */
  async syncLogs(
    userId: string,
    selectedProjects?: string[],
    onProgress?: (progress: SyncProgress) => void
  ): Promise<{ created: number; updated: number; errors: string[]; skippedItems: SkippedItem[] }> {
    if (!await this.initialize()) {
      throw new Error('Failed to initialize Google Sheets API');
    }

    console.log('[PTS Sync] Starting log sync...');
    onProgress?.({ phase: 'logs', current: 0, total: 0, message: 'Fetching logs...' });

    // Fetch only required columns: Part# (B), Process (C), Processed Qty (D), Process Date (E), 
    // Process Location (F), Processed By (G), Report No. (H)
    const response = await this.sheets!.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${LOG_SHEET}'!A2:H`, // Only fetch columns A-H (we need A for row context, B-H for data)
    });
    const rows = response.data.values || [];

    onProgress?.({ phase: 'logs', current: 0, total: rows.length, message: `Processing ${rows.length} logs...` });

    // Cache assembly parts by part designation - include all needed fields
    const partCache = new Map<string, { 
      id: string; 
      projectId: string; 
      quantity: number;
      projectNumber: string;
      buildingName: string | null;
    }>();
    
    const parts = await prisma.assemblyPart.findMany({
      select: { 
        id: true, 
        partDesignation: true, 
        projectId: true, 
        quantity: true,
        project: { select: { projectNumber: true } },
        building: { select: { name: true } },
      },
    });
    
    parts.forEach(p => {
      if (p.partDesignation) {
        partCache.set(p.partDesignation, { 
          id: p.id, 
          projectId: p.projectId, 
          quantity: p.quantity,
          projectNumber: p.project.projectNumber,
          buildingName: p.building?.name || null,
        });
      }
    });

    let created = 0;
    let updated = 0;
    const errors: string[] = [];
    const skippedItems: SkippedItem[] = [];
    const syncedItems: SyncedItem[] = [];

    // Process in batches
    const BATCH_SIZE = 100;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);

      for (let j = 0; j < batch.length; j++) {
        const row = batch[j];
        const rowNum = i + j + 2; // +2 for header and 0-index

        try {
          const partNumber = row[this.colIndex(LOG_COLUMNS.partNumber)]?.toString().trim();
          const process = row[this.colIndex(LOG_COLUMNS.process)]?.toString().trim();
          const processedQtyStr = row[this.colIndex(LOG_COLUMNS.processedQty)]?.toString().trim();
          const dateStr = row[this.colIndex(LOG_COLUMNS.processDate)]?.toString().trim();

          if (!partNumber || !process) continue;

          // Find assembly part - ONLY sync logs that have matching assembly parts
          const part = partCache.get(partNumber);
          if (!part) {
            // Part not found in OTS - add to skipped items list
            const partProjectNumber = partNumber.split('-')[0] || 'Unknown';
            skippedItems.push({
              rowNumber: rowNum,
              partDesignation: partNumber,
              projectNumber: partProjectNumber,
              reason: 'No matching assembly part found in OTS',
              type: 'log',
            });
            continue;
          }

          // Filter by selected projects (use project number from cached part data)
          const partProjectNumber = part.projectNumber;
          if (selectedProjects && selectedProjects.length > 0 && !selectedProjects.includes(partProjectNumber)) {
            continue;
          }

          const processType = this.normalizeProcess(process);
          const processedQty = parseInt(processedQtyStr) || 1;
          const processDate = this.parseDate(dateStr) || new Date();
          const processLocation = row[this.colIndex(LOG_COLUMNS.processLocation)]?.toString().trim() || null;
          const processedBy = row[this.colIndex(LOG_COLUMNS.processedBy)]?.toString().trim() || null;
          const reportNo = row[this.colIndex(LOG_COLUMNS.reportNo)]?.toString().trim() || null;

          // Generate external reference for UPSERT
          const externalRef = `PTS-${rowNum}-${partNumber}-${processType}`;

          // Check if log exists by external ref
          const existingByRef = await prisma.productionLog.findFirst({
            where: { externalRef, source: 'PTS' },
          });

          if (existingByRef) {
            // Update existing
            await prisma.productionLog.update({
              where: { id: existingByRef.id },
              data: {
                processedQty,
                dateProcessed: processDate,
                processingLocation: processLocation,
                processingTeam: processedBy,
                reportNumber: reportNo,
              },
            });
            updated++;
            syncedItems.push({
              partDesignation: partNumber,
              projectNumber: part.projectNumber,
              buildingName: part.buildingName,
              processType,
              action: 'updated',
              type: 'log',
            });
          } else {
            // Calculate remaining qty
            const existingLogs = await prisma.productionLog.findMany({
              where: { assemblyPartId: part.id, processType },
              select: { processedQty: true },
            });
            const alreadyProcessed = existingLogs.reduce((sum, log) => sum + log.processedQty, 0);
            const remainingQty = Math.max(0, part.quantity - alreadyProcessed - processedQty);

            // Create new log
            await prisma.productionLog.create({
              data: {
                assemblyPartId: part.id,
                processType,
                dateProcessed: processDate,
                processedQty,
                remainingQty,
                processingLocation: processLocation,
                processingTeam: processedBy,
                reportNumber: reportNo,
                createdById: userId,
                qcStatus: 'Not Required',
                qcRequired: false,
                source: 'PTS',
                externalRef,
              },
            });
            created++;
            syncedItems.push({
              partDesignation: partNumber,
              projectNumber: part.projectNumber,
              buildingName: part.buildingName,
              processType,
              action: 'created',
              type: 'log',
            });
          }
        } catch (error) {
          const msg = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`Row ${rowNum}: ${msg}`);
        }
      }

      onProgress?.({ 
        phase: 'logs', 
        current: Math.min(i + BATCH_SIZE, rows.length), 
        total: rows.length, 
        message: `Processed ${Math.min(i + BATCH_SIZE, rows.length)} of ${rows.length} logs` 
      });
    }

    console.log(`[PTS Sync] Log sync complete: ${created} created, ${updated} updated, ${errors.length} errors, ${skippedItems.length} skipped (no matching part)`);
    return { created, updated, errors, skippedItems, syncedItems };
  }

  /**
   * Full sync - Raw Data first, then Logs
   */
  async fullSync(
    userId: string,
    options: {
      autoCreateBuildings?: boolean;
      selectedProjects?: string[];
      selectedBuildings?: string[];
      syncRawData?: boolean;
      syncLogs?: boolean;
    } = {},
    onProgress?: (progress: SyncProgress) => void
  ): Promise<SyncResult> {
    const {
      autoCreateBuildings = true,
      selectedProjects,
      selectedBuildings,
      syncRawData: doSyncRawData = true,
      syncLogs: doSyncLogs = true,
    } = options;

    const startTime = Date.now();
    const errors: string[] = [];
    const skippedItems: SkippedItem[] = [];
    const syncedItems: SyncedItem[] = [];
    let rawResult = { created: 0, updated: 0, errors: [] as string[] };
    let logResult = { created: 0, updated: 0, errors: [] as string[], skippedItems: [] as SkippedItem[], syncedItems: [] as SyncedItem[] };

    try {
      // Phase 1: Sync Raw Data
      if (doSyncRawData) {
        onProgress?.({ phase: 'raw-data', current: 0, total: 0, message: 'Starting raw data sync...' });
        rawResult = await this.syncRawData(userId, autoCreateBuildings, selectedProjects, selectedBuildings, onProgress);
        errors.push(...rawResult.errors);
      }

      // Phase 2: Sync Logs
      if (doSyncLogs) {
        onProgress?.({ phase: 'logs', current: 0, total: 0, message: 'Starting log sync...' });
        logResult = await this.syncLogs(userId, selectedProjects, onProgress);
        errors.push(...logResult.errors);
        skippedItems.push(...logResult.skippedItems);
        syncedItems.push(...logResult.syncedItems);
      }

      onProgress?.({ phase: 'complete', current: 1, total: 1, message: 'Sync complete!' });

      // Generate sync batch ID for rollback
      const syncBatchId = `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Calculate project stats
      const projectStats = await this.calculateProjectStats(selectedProjects);

      // Also parse any skipped items from error messages (for raw data)
      const parsedSkipped = this.parseSkippedItems(errors);
      skippedItems.push(...parsedSkipped);

      return {
        success: errors.length === 0,
        partsCreated: rawResult.created,
        partsUpdated: rawResult.updated,
        logsCreated: logResult.created,
        logsUpdated: logResult.updated,
        errors,
        skippedItems,
        syncedItems,
        projectStats,
        duration: Date.now() - startTime,
        syncBatchId,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`Sync failed: ${msg}`);
      return {
        success: false,
        partsCreated: 0,
        partsUpdated: 0,
        logsCreated: 0,
        logsUpdated: 0,
        errors,
        skippedItems: [],
        syncedItems: [],
        projectStats: [],
        duration: Date.now() - startTime,
        syncBatchId: '',
      };
    }
  }

  /**
   * Parse skipped items from error messages
   */
  private parseSkippedItems(errors: string[]): SkippedItem[] {
    const skipped: SkippedItem[] = [];
    const skipPattern = /^Skipped (part|row) ([^:]+): (.+)$/i;
    const rowPattern = /^Row (\d+): (.+)$/;

    errors.forEach((err, index) => {
      const skipMatch = err.match(skipPattern);
      if (skipMatch) {
        skipped.push({
          rowNumber: index,
          partDesignation: skipMatch[2] || 'Unknown',
          projectNumber: '',
          reason: skipMatch[3],
          type: 'part',
        });
        return;
      }

      const rowMatch = err.match(rowPattern);
      if (rowMatch) {
        skipped.push({
          rowNumber: parseInt(rowMatch[1]),
          partDesignation: '',
          projectNumber: '',
          reason: rowMatch[2],
          type: err.includes('Part not found') ? 'log' : 'part',
        });
      }
    });

    return skipped;
  }

  /**
   * Calculate sync stats per project
   */
  private async calculateProjectStats(selectedProjects?: string[]): Promise<ProjectSyncStats[]> {
    const stats: ProjectSyncStats[] = [];

    const projects = await prisma.project.findMany({
      where: selectedProjects?.length ? { projectNumber: { in: selectedProjects } } : undefined,
      select: { id: true, projectNumber: true, name: true },
    });

    for (const project of projects) {
      const totalParts = await prisma.assemblyPart.count({
        where: { projectId: project.id },
      });

      const syncedParts = await prisma.assemblyPart.count({
        where: { projectId: project.id, source: 'PTS' },
      });

      const totalLogs = await prisma.productionLog.count({
        where: { assemblyPart: { projectId: project.id } },
      });

      const syncedLogs = await prisma.productionLog.count({
        where: { assemblyPart: { projectId: project.id }, source: 'PTS' },
      });

      const completionPercent = totalParts > 0 ? Math.round((syncedParts / totalParts) * 100) : 0;

      stats.push({
        projectNumber: project.projectNumber,
        projectName: project.name,
        totalParts,
        syncedParts,
        totalLogs,
        syncedLogs,
        completionPercent,
      });
    }

    return stats;
  }

  /**
   * Rollback sync for a specific project
   */
  async rollbackProject(projectNumber: string): Promise<{ partsDeleted: number; logsDeleted: number }> {
    const project = await prisma.project.findFirst({
      where: { projectNumber },
      select: { id: true },
    });

    if (!project) {
      throw new Error(`Project not found: ${projectNumber}`);
    }

    // Delete PTS-synced production logs first (due to FK constraints)
    const logsDeleted = await prisma.productionLog.deleteMany({
      where: {
        source: 'PTS',
        assemblyPart: { projectId: project.id },
      },
    });

    // Delete PTS-synced assembly parts
    const partsDeleted = await prisma.assemblyPart.deleteMany({
      where: {
        source: 'PTS',
        projectId: project.id,
      },
    });

    console.log(`[PTS Sync] Rollback for ${projectNumber}: ${partsDeleted.count} parts, ${logsDeleted.count} logs deleted`);

    return {
      partsDeleted: partsDeleted.count,
      logsDeleted: logsDeleted.count,
    };
  }
}

export const ptsSyncService = new PTSSyncService();
