/**
 * Google Sheets PTS Sync Service
 * 
 * Syncs production tracking data from Google Sheets (PTS) to OTS.
 * Supports automatic background sync and manual triggers.
 * 
 * PTS Column Mapping:
 * - Part# (B) → partDesignation
 * - Process (C) → processType
 * - Processed Qty (D) → processedQty
 * - Process Date (E) → dateProcessed
 * - Process Location (F) → processingLocation
 * - Processed By (G) → processingTeam
 * - Report No. (H) → reportNumber
 */

import { google, sheets_v4 } from 'googleapis';
import { prisma } from '@/lib/prisma';

// ============================================
// TYPES
// ============================================

export interface PTSColumnMapping {
  partNumber: string;      // Column letter for Part#
  process: string;         // Column letter for Process
  processedQty: string;    // Column letter for Processed Qty
  processDate: string;     // Column letter for Process Date
  processLocation: string; // Column letter for Process Location
  processedBy: string;     // Column letter for Processed By
  reportNo: string;        // Column letter for Report No.
  // Optional columns for auto-creating assembly parts
  projectCode?: string;    // Column letter for Project Code/Number
  buildingName?: string;   // Column letter for Building Name/Designation
  quantity?: string;       // Column letter for Part Quantity (for assembly part creation)
}

export interface PTSSyncConfig {
  id: string;
  name: string;
  spreadsheetId: string;
  sheetName: string;
  projectId: string;
  columnMapping: PTSColumnMapping;
  headerRow: number;
  dataStartRow: number;
  syncInterval: number; // minutes (0 = manual only)
  lastSyncAt: Date | null;
  isActive: boolean;
  autoCreateParts: boolean; // Auto-create assembly parts if not found
  createdAt: Date;
  updatedAt: Date;
}

export interface PTSRowData {
  rowNumber: number;
  partNumber: string;
  process: string;
  processedQty: number;
  processDate: Date | null;
  processLocation: string;
  processedBy: string;
  reportNo: string;
  // Optional fields for auto-creating assembly parts
  projectCode?: string;
  buildingName?: string;
  partQuantity?: number;
}

export interface SyncResult {
  success: boolean;
  totalRows: number;
  synced: number;
  skipped: number;
  errors: string[];
  duration: number;
  timestamp: Date;
}

export interface SyncLogEntry {
  id: string;
  configId: string;
  status: 'success' | 'partial' | 'failed';
  totalRows: number;
  syncedRows: number;
  skippedRows: number;
  errors: string[];
  duration: number;
  syncedAt: Date;
}

// Default column mapping based on user's PTS structure
export const DEFAULT_COLUMN_MAPPING: PTSColumnMapping = {
  partNumber: 'B',
  process: 'C',
  processedQty: 'D',
  processDate: 'E',
  processLocation: 'F',
  processedBy: 'G',
  reportNo: 'H',
  // Optional columns - leave empty if not using auto-create
  projectCode: '',
  buildingName: '',
  quantity: '',
};

// Process type mapping from PTS to OTS
const PROCESS_TYPE_MAP: Record<string, string> = {
  'visualization': 'Visualization',
  'welding': 'Welding',
  'preparation': 'Preparation',
  'fit-up': 'Fit-up',
  'fitup': 'Fit-up',
  'sandblasting': 'Sandblasting',
  'painting': 'Painting',
  'galvanization': 'Galvanization',
  'dispatch': 'Dispatch',
  'erection': 'Erection',
};

// ============================================
// SERVICE CLASS
// ============================================

export class GoogleSheetsSyncService {
  private sheets: sheets_v4.Sheets | null = null;

  /**
   * Initialize Google Sheets API client
   * Uses service account credentials from environment
   */
  async initialize(): Promise<boolean> {
    try {
      const credentials = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
      
      if (!credentials) {
        console.error('[PTS Sync] GOOGLE_SERVICE_ACCOUNT_KEY not configured');
        return false;
      }

      const serviceAccount = JSON.parse(credentials);
      
      const auth = new google.auth.GoogleAuth({
        credentials: serviceAccount,
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
      });

      this.sheets = google.sheets({ version: 'v4', auth });
      console.log('[PTS Sync] Google Sheets API initialized');
      return true;
    } catch (error) {
      console.error('[PTS Sync] Failed to initialize:', error);
      return false;
    }
  }

  /**
   * Test connection to a Google Sheet
   */
  async testConnection(spreadsheetId: string): Promise<{ success: boolean; title?: string; sheets?: string[]; error?: string }> {
    try {
      if (!this.sheets) {
        const initialized = await this.initialize();
        if (!initialized) {
          return { success: false, error: 'Failed to initialize Google Sheets API' };
        }
      }

      const response = await this.sheets!.spreadsheets.get({
        spreadsheetId,
        fields: 'properties.title,sheets.properties.title',
      });

      const title = response.data.properties?.title || 'Unknown';
      const sheets = response.data.sheets?.map(s => s.properties?.title || 'Unknown') || [];

      return { success: true, title, sheets };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('[PTS Sync] Connection test failed:', message);
      return { success: false, error: message };
    }
  }

  /**
   * Fetch data from Google Sheet
   */
  async fetchSheetData(
    spreadsheetId: string,
    sheetName: string,
    columnMapping: PTSColumnMapping,
    dataStartRow: number
  ): Promise<PTSRowData[]> {
    if (!this.sheets) {
      const initialized = await this.initialize();
      if (!initialized) {
        throw new Error('Failed to initialize Google Sheets API');
      }
    }

    // Build range from column mapping - include optional columns if specified
    const allColumns: string[] = [
      columnMapping.partNumber,
      columnMapping.process,
      columnMapping.processedQty,
      columnMapping.processDate,
      columnMapping.processLocation,
      columnMapping.processedBy,
      columnMapping.reportNo,
      columnMapping.projectCode || '',
      columnMapping.buildingName || '',
      columnMapping.quantity || '',
    ].filter((col): col is string => col !== undefined && col.trim() !== '');
    
    const minCol = allColumns.reduce((min, col) => col < min ? col : min, 'Z');
    const maxCol = allColumns.reduce((max, col) => col > max ? col : max, 'A');
    const range = `${sheetName}!${minCol}${dataStartRow}:${maxCol}`;

    console.log(`[PTS Sync] Fetching data from range: ${range}`);

    const response = await this.sheets!.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rows = response.data.values || [];
    const result: PTSRowData[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = dataStartRow + i;

      // Get column indices (A=0, B=1, etc.) - handle empty/undefined columns
      const getColIndex = (col: string | undefined) => {
        if (!col || col.trim() === '') return -1;
        return col.charCodeAt(0) - minCol.charCodeAt(0);
      };
      const getColValue = (col: string | undefined) => {
        const idx = getColIndex(col);
        return idx >= 0 && row[idx] ? row[idx] : '';
      };

      const partNumber = getColValue(columnMapping.partNumber);
      const process = getColValue(columnMapping.process);
      const qtyStr = getColValue(columnMapping.processedQty) || '0';
      const dateStr = getColValue(columnMapping.processDate);
      const location = getColValue(columnMapping.processLocation);
      const processedBy = getColValue(columnMapping.processedBy);
      const reportNo = getColValue(columnMapping.reportNo);
      
      // Optional columns for auto-creating assembly parts
      const projectCode = getColValue(columnMapping.projectCode);
      const buildingName = getColValue(columnMapping.buildingName);
      const partQtyStr = getColValue(columnMapping.quantity) || '1';

      // Skip empty rows
      if (!partNumber || !process) {
        continue;
      }

      result.push({
        rowNumber,
        partNumber: partNumber.trim(),
        process: process.trim(),
        processedQty: parseInt(qtyStr, 10) || 0,
        processDate: this.parseDate(dateStr),
        processLocation: location.trim(),
        processedBy: processedBy.trim(),
        reportNo: reportNo.trim(),
        projectCode: projectCode.trim() || undefined,
        buildingName: buildingName.trim() || undefined,
        partQuantity: parseInt(partQtyStr, 10) || 1,
      });
    }

    console.log(`[PTS Sync] Fetched ${result.length} valid rows`);
    return result;
  }

  /**
   * Parse date from various formats
   * Handles: "Tue-22-Jul-2025", "2025-07-22", "22/07/2025", etc.
   */
  private parseDate(dateStr: string): Date | null {
    if (!dateStr) return null;

    try {
      // Handle "Tue-22-Jul-2025" format
      const dayMonthYearMatch = dateStr.match(/\w+-(\d+)-(\w+)-(\d+)/);
      if (dayMonthYearMatch) {
        const [, day, monthStr, year] = dayMonthYearMatch;
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
   * Normalize process type to OTS format
   */
  private normalizeProcessType(process: string): string {
    const normalized = PROCESS_TYPE_MAP[process.toLowerCase()];
    return normalized || process;
  }

  /**
   * Sync PTS data to OTS production logs
   */
  async syncToOTS(
    config: PTSSyncConfig,
    userId: string
  ): Promise<SyncResult> {
    const startTime = Date.now();
    const result: SyncResult = {
      success: false,
      totalRows: 0,
      synced: 0,
      skipped: 0,
      errors: [],
      duration: 0,
      timestamp: new Date(),
    };

    try {
      // Fetch data from Google Sheets
      const ptsData = await this.fetchSheetData(
        config.spreadsheetId,
        config.sheetName,
        config.columnMapping,
        config.dataStartRow
      );

      result.totalRows = ptsData.length;

      // Process each row
      for (const row of ptsData) {
        try {
          await this.syncRow(row, config.projectId, userId, config.autoCreateParts);
          result.synced++;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          result.errors.push(`Row ${row.rowNumber} (${row.partNumber}): ${message}`);
          result.skipped++;
        }
      }

      result.success = result.errors.length === 0;
      result.duration = Date.now() - startTime;

      // Log sync result
      await this.logSync(config.id, result);

      // Update last sync time
      await prisma.pTSSyncConfig.update({
        where: { id: config.id },
        data: { lastSyncAt: new Date() },
      });

      console.log(`[PTS Sync] Completed: ${result.synced}/${result.totalRows} rows synced in ${result.duration}ms`);
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(`Sync failed: ${message}`);
      result.duration = Date.now() - startTime;
      console.error('[PTS Sync] Sync failed:', message);
      return result;
    }
  }

  /**
   * Find or create building by name/designation within a project
   */
  private async findOrCreateBuilding(
    projectId: string,
    buildingName: string
  ): Promise<string> {
    // Try to find existing building
    const existing = await prisma.building.findFirst({
      where: {
        projectId,
        OR: [
          { name: buildingName },
          { designation: buildingName },
        ],
      },
      select: { id: true },
    });

    if (existing) {
      return existing.id;
    }

    // Create new building
    // Generate a short designation from the name (first 4 chars uppercase)
    const designation = buildingName.substring(0, 4).toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    // Check if designation already exists, append number if needed
    let finalDesignation = designation;
    let counter = 1;
    while (true) {
      const existingDesig = await prisma.building.findFirst({
        where: { projectId, designation: finalDesignation },
      });
      if (!existingDesig) break;
      finalDesignation = `${designation}${counter}`;
      counter++;
    }

    const newBuilding = await prisma.building.create({
      data: {
        projectId,
        name: buildingName,
        designation: finalDesignation,
      },
    });

    console.log(`[PTS Sync] Created building: ${buildingName} (${finalDesignation})`);
    return newBuilding.id;
  }

  /**
   * Sync a single row to OTS
   */
  private async syncRow(
    row: PTSRowData,
    defaultProjectId: string,
    userId: string,
    autoCreateParts: boolean = false
  ): Promise<void> {
    // Determine project ID - use from row if provided, otherwise use default
    let projectId = defaultProjectId;
    if (row.projectCode) {
      const project = await prisma.project.findFirst({
        where: {
          OR: [
            { projectNumber: row.projectCode },
            { name: row.projectCode },
          ],
        },
        select: { id: true },
      });
      if (project) {
        projectId = project.id;
      } else {
        throw new Error(`Project not found: ${row.projectCode}`);
      }
    }

    // Find the assembly part by part designation
    let assemblyPart = await prisma.assemblyPart.findFirst({
      where: {
        projectId,
        OR: [
          { partDesignation: row.partNumber },
          { assemblyMark: row.partNumber },
          { partMark: row.partNumber },
        ],
      },
    });

    // Auto-create assembly part if not found and autoCreateParts is enabled
    if (!assemblyPart && autoCreateParts) {
      // Determine building ID if building name is provided
      let buildingId: string | null = null;
      if (row.buildingName) {
        buildingId = await this.findOrCreateBuilding(projectId, row.buildingName);
      }

      // Parse part number to extract assembly mark and part mark
      // Common formats: "257-EMG-BR-1001", "271-B2-BM-31"
      const parts = row.partNumber.split('-');
      const assemblyMark = parts.length >= 3 ? parts.slice(0, 3).join('-') : row.partNumber;
      const partMark = parts.length >= 4 ? parts[parts.length - 1] : '001';

      assemblyPart = await prisma.assemblyPart.create({
        data: {
          projectId,
          buildingId,
          partDesignation: row.partNumber,
          assemblyMark,
          subAssemblyMark: null,
          partMark,
          quantity: row.partQuantity || 1,
          name: row.partNumber,
          status: 'In Progress',
          createdById: userId,
        },
      });

      console.log(`[PTS Sync] Created assembly part: ${row.partNumber}`);
    }

    if (!assemblyPart) {
      throw new Error(`Assembly part not found: ${row.partNumber}`);
    }

    // Validate: Ensure assembly part belongs to the correct project
    if (assemblyPart.projectId !== projectId) {
      throw new Error(`Assembly part ${row.partNumber} belongs to different project`);
    }

    const processType = this.normalizeProcessType(row.process);
    const processDate = row.processDate || new Date();
    
    // Generate external reference for UPSERT logic (unique identifier from PTS)
    // Format: "PTS-{sheetRow}-{partNumber}-{process}-{date}"
    const externalRef = `PTS-${row.rowNumber}-${row.partNumber}-${processType}-${processDate.toISOString().split('T')[0]}`;

    // UPSERT: Check if this production log already exists by externalRef (PTS source)
    const existingByRef = await prisma.productionLog.findFirst({
      where: {
        externalRef,
        source: 'PTS',
      },
    });

    if (existingByRef) {
      // Update existing PTS log with latest data
      await prisma.productionLog.update({
        where: { id: existingByRef.id },
        data: {
          processedQty: row.processedQty,
          processingLocation: row.processLocation || existingByRef.processingLocation,
          processingTeam: row.processedBy || existingByRef.processingTeam,
          reportNumber: row.reportNo || existingByRef.reportNumber,
          dateProcessed: processDate,
          updatedAt: new Date(),
        },
      });
      console.log(`[PTS Sync] Updated existing log: ${externalRef}`);
      return;
    }

    // Also check for duplicate by content (same part, process, date, qty) - regardless of source
    const existingByContent = await prisma.productionLog.findFirst({
      where: {
        assemblyPartId: assemblyPart.id,
        processType,
        dateProcessed: processDate,
        processedQty: row.processedQty,
      },
    });

    if (existingByContent) {
      // Update existing log to mark it as PTS-sourced if it wasn't already
      if (existingByContent.source !== 'PTS') {
        await prisma.productionLog.update({
          where: { id: existingByContent.id },
          data: {
            source: 'PTS',
            externalRef,
            processingLocation: row.processLocation || existingByContent.processingLocation,
            processingTeam: row.processedBy || existingByContent.processingTeam,
            reportNumber: row.reportNo || existingByContent.reportNumber,
            updatedAt: new Date(),
          },
        });
        console.log(`[PTS Sync] Linked existing OTS log to PTS: ${externalRef}`);
      }
      return;
    }

    // Calculate remaining quantity
    const totalQty = assemblyPart.quantity;
    const processedLogs = await prisma.productionLog.findMany({
      where: {
        assemblyPartId: assemblyPart.id,
        processType,
      },
      select: { processedQty: true },
    });
    
    const alreadyProcessed = processedLogs.reduce((sum, log) => sum + log.processedQty, 0);
    const remainingQty = Math.max(0, totalQty - alreadyProcessed - row.processedQty);

    // Create new production log with PTS source
    await prisma.productionLog.create({
      data: {
        assemblyPartId: assemblyPart.id,
        processType,
        dateProcessed: processDate,
        processedQty: row.processedQty,
        remainingQty,
        processingLocation: row.processLocation,
        processingTeam: row.processedBy,
        reportNumber: row.reportNo,
        createdById: userId,
        qcStatus: 'Not Required',
        qcRequired: false,
        source: 'PTS',
        externalRef,
      },
    });
    console.log(`[PTS Sync] Created new log: ${externalRef}`);
  }

  /**
   * Log sync operation
   */
  private async logSync(configId: string, result: SyncResult): Promise<void> {
    try {
      await prisma.pTSSyncLog.create({
        data: {
          configId,
          status: result.success ? 'success' : result.synced > 0 ? 'partial' : 'failed',
          totalRows: result.totalRows,
          syncedRows: result.synced,
          skippedRows: result.skipped,
          errors: JSON.stringify(result.errors),
          duration: result.duration,
          syncedAt: result.timestamp,
        },
      });
    } catch (error) {
      console.error('[PTS Sync] Failed to log sync:', error);
    }
  }

  /**
   * Get sync history for a config
   */
  async getSyncHistory(configId: string, limit: number = 20): Promise<SyncLogEntry[]> {
    const logs = await prisma.pTSSyncLog.findMany({
      where: { configId },
      orderBy: { syncedAt: 'desc' },
      take: limit,
    });

    return logs.map(log => ({
      id: log.id,
      configId: log.configId,
      status: log.status as 'success' | 'partial' | 'failed',
      totalRows: log.totalRows,
      syncedRows: log.syncedRows,
      skippedRows: log.skippedRows,
      errors: JSON.parse(log.errors as string || '[]'),
      duration: log.duration,
      syncedAt: log.syncedAt,
    }));
  }

  /**
   * Preview data from Google Sheet without syncing
   */
  async previewData(
    spreadsheetId: string,
    sheetName: string,
    columnMapping: PTSColumnMapping,
    dataStartRow: number,
    limit: number = 10
  ): Promise<PTSRowData[]> {
    const data = await this.fetchSheetData(spreadsheetId, sheetName, columnMapping, dataStartRow);
    return data.slice(0, limit);
  }
}

// Singleton instance
export const googleSheetsSyncService = new GoogleSheetsSyncService();
