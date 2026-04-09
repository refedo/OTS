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
  buildingDesignation: 'S', // Building Designation (e.g., "Z8T")
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
  'dispatched to sandblasting': 'Dispatched to Sandblasting',
  'dispatch to sandblasting': 'Dispatched to Sandblasting',
  'dispatched to galvanization': 'Dispatched to Galvanization',
  'dispatch to galvanization': 'Dispatched to Galvanization',
  'dispatched to galvanizing': 'Dispatched to Galvanization',
  'dispatch to galvanizing': 'Dispatched to Galvanization',
  'dispatched to painting': 'Dispatched to Painting',
  'dispatch to painting': 'Dispatched to Painting',
  'dispatched to site': 'Dispatched to Site',
  'dispatch to site': 'Dispatched to Site',
  'dispatched to customer': 'Dispatched to Customer',
  'dispatch to customer': 'Dispatched to Customer',
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

export interface BuildingSyncStats {
  buildingId: string;
  buildingName: string;
  buildingDesignation: string;
  projectNumber: string;
  totalParts: number;
  syncedParts: number;
  totalLogs: number;
  syncedLogs: number;
  totalWeight: number;
  syncedWeight: number;
}

export interface ProjectSyncStats {
  projectNumber: string;
  projectName: string;
  totalParts: number;
  syncedParts: number;
  totalLogs: number;
  syncedLogs: number;
  completionPercent: number;
  totalWeight: number;
  syncedWeight: number;
  buildings: BuildingSyncStats[];
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
        // Prioritize building designation match over name match
        const otsBuilding =
          otsBuildings.find(b => b.projectId === projectMatch.ots.id && b.designation === ptsBuilding.designation) ??
          otsBuildings.find(b => b.projectId === projectMatch.ots.id && b.name === ptsBuilding.name && ptsBuilding.name);
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
    onProgress?: (progress: SyncProgress) => void,
    columnMapping?: Record<string, string>
  ): Promise<{ created: number; updated: number; errors: string[] }> {
    if (!await this.initialize()) {
      throw new Error('Failed to initialize Google Sheets API');
    }

    console.log('[PTS Sync] Starting raw data sync...');
    onProgress?.({ phase: 'raw-data', current: 0, total: 0, message: 'Fetching raw data...' });

    // Use custom column mapping if provided (from the mapping UI)
    const colMap = columnMapping
      ? {
          projectNumber: columnMapping.projectNumber || RAW_DATA_COLUMNS.projectNumber,
          logDesignation: columnMapping.partDesignation || RAW_DATA_COLUMNS.logDesignation,
          assemblyMark: columnMapping.assemblyMark || RAW_DATA_COLUMNS.assemblyMark,
          subAssemblyMark: columnMapping.subAssemblyMark || RAW_DATA_COLUMNS.subAssemblyMark,
          partMark: columnMapping.partMark || RAW_DATA_COLUMNS.partMark,
          quantity: columnMapping.quantity || RAW_DATA_COLUMNS.quantity,
          name: columnMapping.name || RAW_DATA_COLUMNS.name,
          profile: columnMapping.profile || RAW_DATA_COLUMNS.profile,
          grade: columnMapping.grade || RAW_DATA_COLUMNS.grade,
          length: columnMapping.lengthMm || RAW_DATA_COLUMNS.length,
          areaPerOne: columnMapping.netAreaPerUnit || RAW_DATA_COLUMNS.areaPerOne,
          areaTotal: columnMapping.netAreaTotal || RAW_DATA_COLUMNS.areaTotal,
          weightPerOne: columnMapping.singlePartWeight || RAW_DATA_COLUMNS.weightPerOne,
          weightTotal: columnMapping.netWeightTotal || RAW_DATA_COLUMNS.weightTotal,
          buildingDesignation: columnMapping.buildingDesignation || RAW_DATA_COLUMNS.buildingDesignation,
          buildingName: columnMapping.buildingName || RAW_DATA_COLUMNS.buildingName,
        }
      : RAW_DATA_COLUMNS;

    // Determine the widest column letter to set fetch range
    const maxCol = Object.values(colMap).reduce((max, col) => col > max ? col : max, 'A');

    // Fetch all raw data
    const response = await this.sheets!.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${RAW_DATA_SHEET}'!A2:${maxCol}`,
    });
    const rows = response.data.values || [];

    onProgress?.({ phase: 'raw-data', current: 0, total: rows.length, message: `Processing ${rows.length} parts...` });

    // Cache projects, buildings, and scope of work
    const projectCache = new Map<string, string>();
    const buildingCache = new Map<string, string>();
    const scopeOfWorkCache = new Map<string, string>(); // key: "projectId-buildingId" → scopeOfWorkId

    const projects = await prisma.project.findMany({ select: { id: true, projectNumber: true } });
    projects.forEach(p => projectCache.set(p.projectNumber, p.id));

    // Pre-load existing "steel" scope of work entries
    const steelScopes = await prisma.scopeOfWork.findMany({
      where: { scopeType: 'steel' },
      select: { id: true, projectId: true, buildingId: true },
    });
    steelScopes.forEach(s => scopeOfWorkCache.set(`${s.projectId}-${s.buildingId}`, s.id));

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
    let duplicateCount = 0;

    // Phase 1: Parse all rows and consolidate duplicate part designations
    interface ParsedPart {
      projectNumber: string;
      projectId: string;
      buildingId: string | null;
      scopeOfWorkId: string | null;
      buildingDesig: string;
      partDesignation: string;
      assemblyMark: string;
      subAssemblyMark: string | null;
      partMark: string;
      quantity: number;
      name: string;
      profile: string;
      grade: string | null;
      lengthMm: number | null;
      netAreaPerUnit: number | null;
      netAreaTotal: number | null;
      singlePartWeight: number | null;
      netWeightTotal: number | null;
      _rowCount: number;
    }
    const consolidatedParts = new Map<string, ParsedPart>();

    for (const row of rows) {
      try {
        const projectNumber = row[this.colIndex(colMap.projectNumber)]?.toString().trim();
        const partDesignation = row[this.colIndex(colMap.logDesignation)]?.toString().trim();
        let buildingDesig = row[this.colIndex(colMap.buildingDesignation)]?.toString().trim();
        const buildingName = row[this.colIndex(colMap.buildingName)]?.toString().trim();

        if (!projectNumber || !partDesignation) {
          errors.push(`Skipped row: Missing project number or part designation`);
          continue;
        }

        // If building designation is empty, try to extract from part designation
        if (!buildingDesig && partDesignation) {
          const parts = partDesignation.split('-');
          if (parts.length >= 2) {
            buildingDesig = parts[1];
          }
        }

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

        // Get or create "Steel" scope of work for this project/building
        let scopeOfWorkId: string | null = null;
        if (buildingId) {
          const scopeKey = `${projectId}-${buildingId}`;
          scopeOfWorkId = scopeOfWorkCache.get(scopeKey) || null;
          if (!scopeOfWorkId) {
            const existing = await prisma.scopeOfWork.findFirst({
              where: { projectId, buildingId, scopeType: 'steel' },
              select: { id: true },
            });
            if (existing) {
              scopeOfWorkId = existing.id;
            } else {
              const newScope = await prisma.scopeOfWork.create({
                data: { projectId, buildingId, scopeType: 'steel', scopeLabel: 'Steel' },
              });
              scopeOfWorkId = newScope.id;
            }
            scopeOfWorkCache.set(scopeKey, scopeOfWorkId);
          }
        }

        // Parse fields
        const assemblyMark = row[this.colIndex(colMap.assemblyMark)]?.toString().trim() || '';
        const subAssemblyMark = row[this.colIndex(colMap.subAssemblyMark)]?.toString().trim() || null;
        const partMark = row[this.colIndex(colMap.partMark)]?.toString().trim() || '';
        const quantity = parseInt(row[this.colIndex(colMap.quantity)]) || 1;
        const name = row[this.colIndex(colMap.name)]?.toString().trim() || '';
        const profile = row[this.colIndex(colMap.profile)]?.toString().trim() || '';
        const grade = row[this.colIndex(colMap.grade)]?.toString().trim() || null;
        const lengthMm = parseFloat(row[this.colIndex(colMap.length)]) || null;
        const netAreaPerUnit = parseFloat(row[this.colIndex(colMap.areaPerOne)]) || null;
        const netAreaTotal = parseFloat(row[this.colIndex(colMap.areaTotal)]) || null;
        const singlePartWeight = parseFloat(row[this.colIndex(colMap.weightPerOne)]) || null;
        const netWeightTotal = parseFloat(row[this.colIndex(colMap.weightTotal)]) || null;

        // Consolidate duplicates: aggregate qty and totals for same partDesignation+projectId
        const consolidationKey = `${projectId}||${partDesignation}`;
        const existing = consolidatedParts.get(consolidationKey);

        if (existing) {
          duplicateCount++;
          existing._rowCount++;
          // Aggregate qty and totals — sum directly, never multiply
          existing.quantity += quantity;
          if (netWeightTotal != null) {
            existing.netWeightTotal = (existing.netWeightTotal ?? 0) + netWeightTotal;
          }
          if (netAreaTotal != null) {
            existing.netAreaTotal = (existing.netAreaTotal ?? 0) + netAreaTotal;
          }
          // Keep singlePartWeight as-is (per-piece weight doesn't change)
          if (singlePartWeight != null) {
            existing.singlePartWeight = singlePartWeight;
          }
        } else {
          consolidatedParts.set(consolidationKey, {
            projectNumber,
            projectId,
            buildingId,
            scopeOfWorkId,
            buildingDesig,
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
            _rowCount: 1,
          });
        }
      } catch (rowError) {
        errors.push(`Error parsing row: ${rowError instanceof Error ? rowError.message : 'Unknown error'}`);
      }
    }

    if (duplicateCount > 0) {
      console.log(`[PTS Sync] Consolidated ${duplicateCount} duplicate rows into ${consolidatedParts.size} unique parts`);
      errors.push(`Note: ${duplicateCount} duplicate part numbers were consolidated (quantities aggregated)`);
    }

    // Phase 2: Write consolidated parts to DB
    const partsArray = Array.from(consolidatedParts.values());
    const BATCH_SIZE = 100;
    for (let i = 0; i < partsArray.length; i += BATCH_SIZE) {
      const batch = partsArray.slice(i, i + BATCH_SIZE);
      onProgress?.({ phase: 'raw-data', current: i, total: partsArray.length, message: `Writing parts ${i + 1}-${Math.min(i + BATCH_SIZE, partsArray.length)} of ${partsArray.length}...` });

      for (const part of batch) {
        try {
          const existingPart = await prisma.assemblyPart.findFirst({
            where: { partDesignation: part.partDesignation, projectId: part.projectId },
          });

          if (existingPart) {
            await prisma.assemblyPart.update({
              where: { id: existingPart.id },
              data: {
                buildingId: part.buildingId,
                scopeOfWorkId: part.scopeOfWorkId,
                assemblyMark: part.assemblyMark,
                subAssemblyMark: part.subAssemblyMark,
                partMark: part.partMark,
                quantity: part.quantity,
                name: part.name,
                profile: part.profile,
                grade: part.grade,
                lengthMm: part.lengthMm,
                netAreaPerUnit: part.netAreaPerUnit,
                netAreaTotal: part.netAreaTotal,
                singlePartWeight: part.singlePartWeight,
                netWeightTotal: part.netWeightTotal,
                source: 'PTS',
                externalRef: part.partDesignation,
              },
            });
            updated++;
          } else {
            await prisma.assemblyPart.create({
              data: {
                projectId: part.projectId,
                buildingId: part.buildingId,
                scopeOfWorkId: part.scopeOfWorkId,
                partDesignation: part.partDesignation,
                assemblyMark: part.assemblyMark,
                subAssemblyMark: part.subAssemblyMark,
                partMark: part.partMark,
                quantity: part.quantity,
                name: part.name,
                profile: part.profile,
                grade: part.grade,
                lengthMm: part.lengthMm,
                netAreaPerUnit: part.netAreaPerUnit,
                netAreaTotal: part.netAreaTotal,
                singlePartWeight: part.singlePartWeight,
                netWeightTotal: part.netWeightTotal,
                status: 'Not Started',
                createdById: userId,
                source: 'PTS',
                externalRef: part.partDesignation,
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
    onProgress?: (progress: SyncProgress) => void,
    dateFilter?: {
      syncByDate?: boolean;
      syncDateFrom?: string;
      syncDateTo?: string;
    }
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
        // Normalize: collapse spaces around hyphens (e.g. "270-GH1- C1" → "270-GH1-C1")
        const normalized = p.partDesignation.replace(/\s*-\s*/g, '-').trim();
        const entry = {
          id: p.id,
          projectId: p.projectId,
          quantity: p.quantity,
          projectNumber: p.project.projectNumber,
          buildingName: p.building?.name || null,
        };
        partCache.set(normalized, entry);
        if (normalized !== p.partDesignation) {
          partCache.set(p.partDesignation, entry);
        }
      }
    });

    let created = 0;
    let updated = 0;
    const errors: string[] = [];
    const skippedItems: SkippedItem[] = [];
    const syncedItems: SyncedItem[] = [];

    // Pre-load all existing PTS production logs to eliminate N+1 DB queries during the loop
    const existingPtsLogs = await prisma.productionLog.findMany({
      where: { source: 'PTS', externalRef: { not: null } },
      select: { id: true, externalRef: true, assemblyPartId: true, processType: true, processedQty: true },
    });
    // Map externalRef → existing log record (for update vs create decision)
    const logByRef = new Map<string, { id: string; assemblyPartId: string; processType: string; processedQty: number }>();
    existingPtsLogs.forEach(l => { if (l.externalRef) logByRef.set(l.externalRef, l); });
    // Map "assemblyPartId::processType" → total already-processed qty (for remainingQty calculation)
    const processedQtyByKey = new Map<string, number>();
    existingPtsLogs.forEach(l => {
      const key = `${l.assemblyPartId}::${l.processType}`;
      processedQtyByKey.set(key, (processedQtyByKey.get(key) ?? 0) + l.processedQty);
    });

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

          // Find assembly part - normalize spaces around hyphens before lookup
          const normalizedPartNumber = partNumber.replace(/\s*-\s*/g, '-');
          const part = partCache.get(normalizedPartNumber) ?? partCache.get(partNumber);
          if (!part) {
            // Part not found in OTS - only add to skipped if project is selected
            const partProjectNumber = partNumber.split('-')[0] || 'Unknown';
            if (!selectedProjects || selectedProjects.length === 0 || selectedProjects.includes(partProjectNumber)) {
              skippedItems.push({
                rowNumber: rowNum,
                partDesignation: partNumber,
                projectNumber: partProjectNumber,
                reason: 'No matching assembly part found in OTS',
                type: 'log',
              });
            }
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

          // Apply date filter if enabled
          if (dateFilter?.syncByDate) {
            const logDate = processDate.getTime();
            if (dateFilter.syncDateFrom) {
              const fromDate = new Date(dateFilter.syncDateFrom).getTime();
              if (logDate < fromDate) continue;
            }
            if (dateFilter.syncDateTo) {
              const toDate = new Date(dateFilter.syncDateTo);
              toDate.setHours(23, 59, 59, 999); // Include the entire end date
              if (logDate > toDate.getTime()) continue;
            }
          }

          // Generate external reference for UPSERT
          const externalRef = `PTS-${rowNum}-${partNumber}-${processType}`;

          // Check if log exists using pre-loaded map (no DB query per row)
          const existingByRef = logByRef.get(externalRef);

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
                source: 'PTS',
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
            // Use pre-loaded qty map instead of a per-row DB query
            const qtyKey = `${part.id}::${processType}`;
            const alreadyProcessed = processedQtyByKey.get(qtyKey) ?? 0;
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
            // Keep in-memory map current so subsequent rows for same part/type are correct
            processedQtyByKey.set(qtyKey, alreadyProcessed + processedQty);
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
      syncByDate?: boolean;
      syncDateFrom?: string;
      syncDateTo?: string;
      rawDataColumnMapping?: Record<string, string>;
    } = {},
    onProgress?: (progress: SyncProgress) => void
  ): Promise<SyncResult> {
    const {
      autoCreateBuildings = true,
      selectedProjects,
      selectedBuildings,
      syncRawData: doSyncRawData = true,
      syncLogs: doSyncLogs = true,
      syncByDate = false,
      syncDateFrom,
      syncDateTo,
      rawDataColumnMapping,
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
        rawResult = await this.syncRawData(userId, autoCreateBuildings, selectedProjects, selectedBuildings, onProgress, rawDataColumnMapping);
        errors.push(...rawResult.errors);
      }

      // Phase 2: Sync Logs
      if (doSyncLogs) {
        onProgress?.({ phase: 'logs', current: 0, total: 0, message: 'Starting log sync...' });
        logResult = await this.syncLogs(userId, selectedProjects, onProgress, {
          syncByDate,
          syncDateFrom,
          syncDateTo,
        });
        errors.push(...logResult.errors);
        skippedItems.push(...logResult.skippedItems);
        syncedItems.push(...logResult.syncedItems);
      }

      onProgress?.({ phase: 'complete', current: 1, total: 1, message: 'Sync complete!' });

      // Calculate project stats
      const projectStats = await this.calculateProjectStats(selectedProjects);

      // Create sync batch record for history tracking
      const syncBatch = await prisma.pTSSyncBatch.create({
        data: {
          syncType: doSyncRawData && doSyncLogs ? 'full' : doSyncRawData ? 'parts' : 'logs',
          status: errors.length === 0 ? 'success' : 'partial',
          partsCreated: rawResult.created,
          partsUpdated: rawResult.updated,
          logsCreated: logResult.created,
          logsUpdated: logResult.updated,
          errorsCount: errors.length,
          projectNumbers: selectedProjects || [],
          durationMs: Date.now() - startTime,
          userId,
        },
      });

      const syncBatchId = syncBatch.id;

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

      // Weight aggregation
      const totalWeightAgg = await prisma.assemblyPart.aggregate({
        where: { projectId: project.id },
        _sum: { netWeightTotal: true },
      });
      const syncedWeightAgg = await prisma.assemblyPart.aggregate({
        where: { projectId: project.id, source: 'PTS' },
        _sum: { netWeightTotal: true },
      });

      const completionPercent = totalParts > 0 ? Math.round((syncedParts / totalParts) * 100) : 0;

      // Per-building stats
      const buildings = await prisma.building.findMany({
        where: { projectId: project.id },
        select: { id: true, name: true, designation: true },
      });

      const buildingStats: BuildingSyncStats[] = [];
      for (const building of buildings) {
        const bTotalParts = await prisma.assemblyPart.count({
          where: { projectId: project.id, buildingId: building.id },
        });
        const bSyncedParts = await prisma.assemblyPart.count({
          where: { projectId: project.id, buildingId: building.id, source: 'PTS' },
        });
        const bTotalLogs = await prisma.productionLog.count({
          where: { assemblyPart: { projectId: project.id, buildingId: building.id } },
        });
        const bSyncedLogs = await prisma.productionLog.count({
          where: { assemblyPart: { projectId: project.id, buildingId: building.id }, source: 'PTS' },
        });
        const bTotalWeightAgg = await prisma.assemblyPart.aggregate({
          where: { projectId: project.id, buildingId: building.id },
          _sum: { netWeightTotal: true },
        });
        const bSyncedWeightAgg = await prisma.assemblyPart.aggregate({
          where: { projectId: project.id, buildingId: building.id, source: 'PTS' },
          _sum: { netWeightTotal: true },
        });

        if (bTotalParts > 0 || bSyncedParts > 0) {
          buildingStats.push({
            buildingId: building.id,
            buildingName: building.name,
            buildingDesignation: building.designation || '',
            projectNumber: project.projectNumber,
            totalParts: bTotalParts,
            syncedParts: bSyncedParts,
            totalLogs: bTotalLogs,
            syncedLogs: bSyncedLogs,
            totalWeight: Number(bTotalWeightAgg._sum.netWeightTotal ?? 0),
            syncedWeight: Number(bSyncedWeightAgg._sum.netWeightTotal ?? 0),
          });
        }
      }

      stats.push({
        projectNumber: project.projectNumber,
        projectName: project.name,
        totalParts,
        syncedParts,
        totalLogs,
        syncedLogs,
        completionPercent,
        totalWeight: Number(totalWeightAgg._sum.netWeightTotal ?? 0),
        syncedWeight: Number(syncedWeightAgg._sum.netWeightTotal ?? 0),
        buildings: buildingStats,
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

  /**
   * Rollback sync for a specific building within a project
   */
  async rollbackBuilding(buildingId: string): Promise<{
    partsDeleted: number;
    logsDeleted: number;
    buildingName: string;
    buildingDesignation: string;
    projectNumber: string;
  }> {
    const building = await prisma.building.findUnique({
      where: { id: buildingId },
      select: {
        id: true,
        name: true,
        designation: true,
        project: { select: { projectNumber: true } },
      },
    });

    if (!building) {
      throw new Error(`Building not found: ${buildingId}`);
    }

    // Delete PTS-synced production logs first (FK constraints)
    const logsDeleted = await prisma.productionLog.deleteMany({
      where: {
        source: 'PTS',
        assemblyPart: { buildingId },
      },
    });

    // Delete PTS-synced assembly parts
    const partsDeleted = await prisma.assemblyPart.deleteMany({
      where: {
        source: 'PTS',
        buildingId,
      },
    });

    console.log(`[PTS Sync] Rollback building ${building.designation} (${building.name}): ${partsDeleted.count} parts, ${logsDeleted.count} logs deleted`);

    return {
      partsDeleted: partsDeleted.count,
      logsDeleted: logsDeleted.count,
      buildingName: building.name,
      buildingDesignation: building.designation || '',
      projectNumber: building.project.projectNumber,
    };
  }
}

export const ptsSyncService = new PTSSyncService();
