import { google } from 'googleapis';
import { createHash } from 'crypto';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { auditService } from '@/lib/services/governance';
import type { LcrSyncResult } from '@/types/supply-chain';
import { Prisma } from '@prisma/client';

const log = logger.child({ module: 'LcrSync' });

// Column mapping (0-indexed from sheet)
const COL = {
  SN: 0,
  PROJECT_NUMBER: 1,
  ITEM: 2,
  QTY: 3,
  AMOUNT: 4,
  STATUS: 5,
  BUILDING_NAME: 6,
  REQUEST_DATE: 7,
  NEEDED_FROM_DATE: 8,
  NEEDED_TO_DATE: 9,
  BUYING_DATE: 10,
  RECEIVING_DATE: 11,
  PO_NUMBER: 12,
  DN_NUMBER: 13,
  AWARDED_TO: 14,
  WEIGHT: 15,
  TOTAL_WEIGHT: 16,
  TOTAL_LCR1: 17,
  TOTAL_LCR2: 18,
  TARGET_PRICE: 19,
  MRF_NUMBER: 20,
  RATIO_1TO2_LCR1: 21,
  LCR1_AMOUNT: 22,
  PRICE_PER_TON_LCR1: 23,
  LCR2: 24,
  LCR2_AMOUNT: 25,
  PRICE_PER_TON_LCR2: 26,
  LCR3: 27,
  LCR3_AMOUNT: 28,
  PRICE_PER_TON_LCR3: 29,
  THICKNESS: 30,
} as const;

function parseDate(value: string | undefined | null): Date | null {
  if (!value || value.trim() === '') return null;
  const trimmed = value.trim();

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const d = new Date(trimmed + 'T00:00:00Z');
    return isNaN(d.getTime()) ? null : d;
  }

  // DD/MM/YYYY
  const ddMm = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddMm) {
    const day = parseInt(ddMm[1], 10);
    const month = parseInt(ddMm[2], 10);
    const year = parseInt(ddMm[3], 10);
    // If day > 12, it must be DD/MM/YYYY
    if (day > 12) {
      const d = new Date(Date.UTC(year, month - 1, day));
      return isNaN(d.getTime()) ? null : d;
    }
    // If month > 12, it must be MM/DD/YYYY
    if (month > 12) {
      const d = new Date(Date.UTC(year, day - 1, month));
      return isNaN(d.getTime()) ? null : d;
    }
    // Ambiguous — default to DD/MM/YYYY (common in Saudi Arabia)
    const d = new Date(Date.UTC(year, month - 1, day));
    return isNaN(d.getTime()) ? null : d;
  }

  return null;
}

function parseDecimal(value: string | undefined | null): Prisma.Decimal | null {
  if (!value || value.trim() === '') return null;
  const cleaned = value.replace(/,/g, '').trim();
  if (cleaned === '' || isNaN(Number(cleaned))) return null;
  return new Prisma.Decimal(cleaned);
}

function str(value: string | undefined | null): string | null {
  if (!value || value.trim() === '') return null;
  return value.trim();
}

interface RawRow {
  sn: string | null;
  projectNumber: string | null;
  itemLabel: string | null;
  qty: Prisma.Decimal | null;
  amount: Prisma.Decimal | null;
  status: string | null;
  buildingNameRaw: string | null;
  requestDate: Date | null;
  neededFromDate: Date | null;
  neededToDate: Date | null;
  buyingDate: Date | null;
  receivingDate: Date | null;
  poNumber: string | null;
  dnNumber: string | null;
  awardedToRaw: string | null;
  weight: Prisma.Decimal | null;
  totalWeight: Prisma.Decimal | null;
  totalLcr1: Prisma.Decimal | null;
  totalLcr2: Prisma.Decimal | null;
  targetPrice: Prisma.Decimal | null;
  mrfNumber: string | null;
  ratio1to2Lcr1: Prisma.Decimal | null;
  lcr1Amount: Prisma.Decimal | null;
  lcr1PricePerTon: Prisma.Decimal | null;
  lcr2: string | null;
  lcr2Amount: Prisma.Decimal | null;
  lcr2PricePerTon: Prisma.Decimal | null;
  lcr3: string | null;
  lcr3Amount: Prisma.Decimal | null;
  lcr3PricePerTon: Prisma.Decimal | null;
  thickness: string | null;
}

function mapRow(cells: string[]): RawRow {
  return {
    sn: str(cells[COL.SN]),
    projectNumber: str(cells[COL.PROJECT_NUMBER]),
    itemLabel: str(cells[COL.ITEM]),
    qty: parseDecimal(cells[COL.QTY]),
    amount: parseDecimal(cells[COL.AMOUNT]),
    status: str(cells[COL.STATUS]),
    buildingNameRaw: str(cells[COL.BUILDING_NAME]),
    requestDate: parseDate(cells[COL.REQUEST_DATE]),
    neededFromDate: parseDate(cells[COL.NEEDED_FROM_DATE]),
    neededToDate: parseDate(cells[COL.NEEDED_TO_DATE]),
    buyingDate: parseDate(cells[COL.BUYING_DATE]),
    receivingDate: parseDate(cells[COL.RECEIVING_DATE]),
    poNumber: str(cells[COL.PO_NUMBER]),
    dnNumber: str(cells[COL.DN_NUMBER]),
    awardedToRaw: str(cells[COL.AWARDED_TO]),
    weight: parseDecimal(cells[COL.WEIGHT]),
    totalWeight: parseDecimal(cells[COL.TOTAL_WEIGHT]),
    totalLcr1: parseDecimal(cells[COL.TOTAL_LCR1]),
    totalLcr2: parseDecimal(cells[COL.TOTAL_LCR2]),
    targetPrice: parseDecimal(cells[COL.TARGET_PRICE]),
    mrfNumber: str(cells[COL.MRF_NUMBER]),
    ratio1to2Lcr1: parseDecimal(cells[COL.RATIO_1TO2_LCR1]),
    lcr1Amount: parseDecimal(cells[COL.LCR1_AMOUNT]),
    lcr1PricePerTon: parseDecimal(cells[COL.PRICE_PER_TON_LCR1]),
    lcr2: str(cells[COL.LCR2]),
    lcr2Amount: parseDecimal(cells[COL.LCR2_AMOUNT]),
    lcr2PricePerTon: parseDecimal(cells[COL.PRICE_PER_TON_LCR2]),
    lcr3: str(cells[COL.LCR3]),
    lcr3Amount: parseDecimal(cells[COL.LCR3_AMOUNT]),
    lcr3PricePerTon: parseDecimal(cells[COL.PRICE_PER_TON_LCR3]),
    thickness: str(cells[COL.THICKNESS]),
  };
}

async function resolveProjectId(projectNumber: string | null): Promise<string | null> {
  if (!projectNumber) return null;
  const project = await prisma.project.findFirst({
    where: { projectNumber, deletedAt: null },
    select: { id: true },
  });
  return project?.id ?? null;
}

async function resolveProductId(itemLabel: string | null): Promise<number | null> {
  if (!itemLabel) return null;
  const trimmedLower = itemLabel.trim().toLowerCase();
  const results: Array<{ dolibarr_id: number }> = await prisma.$queryRaw`
    SELECT dolibarr_id FROM dolibarr_products
    WHERE LOWER(TRIM(label)) = ${trimmedLower}
    AND is_active = 1
    LIMIT 1
  `;
  return results.length > 0 ? results[0].dolibarr_id : null;
}

async function resolveBuildingId(buildingNameRaw: string | null): Promise<string | null> {
  if (!buildingNameRaw) return null;
  const alias = await prisma.lcrAliasMap.findFirst({
    where: { aliasText: buildingNameRaw, entityType: 'building' },
    select: { entityId: true },
  });
  return alias?.entityId ?? null;
}

async function resolveSupplierId(awardedToRaw: string | null): Promise<number | null> {
  if (!awardedToRaw) return null;
  const alias = await prisma.lcrAliasMap.findFirst({
    where: { aliasText: awardedToRaw, entityType: 'supplier' },
    select: { entityId: true },
  });
  return alias ? parseInt(alias.entityId, 10) : null;
}

function computeResolutionStatus(
  raw: RawRow,
  projectId: string | null,
  productId: number | null,
  buildingId: string | null,
  supplierId: number | null,
): string {
  let allResolved = true;
  if (raw.projectNumber && !projectId) allResolved = false;
  if (raw.itemLabel && !productId) allResolved = false;
  if (raw.buildingNameRaw && !buildingId) allResolved = false;
  if (raw.awardedToRaw && !supplierId) allResolved = false;
  return allResolved ? 'resolved' : 'pending';
}

async function getSystemUserId(): Promise<string> {
  const admin = await prisma.user.findFirst({
    where: { role: { name: 'Admin' }, status: 'active' },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  });
  if (admin) return admin.id;

  const anyUser = await prisma.user.findFirst({
    where: { status: 'active' },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  });
  return anyUser?.id ?? 'system';
}

export async function runLcrSync(triggeredBy: 'cron' | 'manual'): Promise<LcrSyncResult> {
  const startTime = Date.now();
  let inserted = 0;
  let updated = 0;
  let unchanged = 0;
  let deleted = 0;
  let pendingAliases = 0;

  try {
    // 1. Authenticate with Google Sheets
    const keyJson = process.env.GOOGLE_SHEETS_KEY_JSON;
    const sheetId = process.env.GOOGLE_SHEET_LCR_ID;
    const sheetRange = process.env.GOOGLE_SHEET_LCR_RANGE ?? 'Sheet1!A:AJ';

    if (!keyJson || !sheetId) {
      throw new Error('Missing GOOGLE_SHEETS_KEY_JSON or GOOGLE_SHEET_LCR_ID env vars');
    }

    const credentials = JSON.parse(keyJson);
    const auth = new google.auth.JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // 2. Fetch all rows
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: sheetRange,
    });

    const allRows = response.data.values;
    if (!allRows || allRows.length < 2) {
      log.info({}, 'No data rows found in sheet');
      const durationMs = Date.now() - startTime;
      await writeSyncLog('success', triggeredBy, 0, 0, 0, 0, 0, 0, durationMs, null);
      return { status: 'success', inserted: 0, updated: 0, unchanged: 0, deleted: 0, pendingAliases: 0, durationMs };
    }

    // Skip header row (row 1); data starts at row 2
    const dataRows = allRows.slice(1);
    const totalRows = dataRows.length;

    // 3. Compute sheetRowId + rowHash for each row
    const sheetData = new Map<string, { hash: string; cells: string[] }>();
    for (let i = 0; i < dataRows.length; i++) {
      const cells = dataRows[i].map((c: unknown) => String(c ?? ''));
      const rowNumber = String(i + 2); // 1-indexed, skip header
      const hash = createHash('md5').update(cells.join('|')).digest('hex');

      // Skip completely empty rows
      if (cells.every((c: string) => c.trim() === '')) continue;

      sheetData.set(rowNumber, { hash, cells });
    }

    // 4. Load existing non-deleted entries
    const existing = await prisma.lcrEntry.findMany({
      where: { isDeleted: false },
      select: { id: true, sheetRowId: true, rowHash: true },
    });
    const existingMap = new Map(existing.map(e => [e.sheetRowId, { id: e.id, hash: e.rowHash }]));

    // 5. Diff
    const toInsert: Array<{ sheetRowId: string; hash: string; cells: string[] }> = [];
    const toUpdate: Array<{ id: string; sheetRowId: string; hash: string; cells: string[] }> = [];
    const toSoftDelete: string[] = [];

    for (const [rowId, { hash, cells }] of sheetData) {
      const ex = existingMap.get(rowId);
      if (!ex) {
        toInsert.push({ sheetRowId: rowId, hash, cells });
      } else if (ex.hash !== hash) {
        toUpdate.push({ id: ex.id, sheetRowId: rowId, hash, cells });
      } else {
        unchanged++;
      }
    }

    for (const [rowId, { id }] of existingMap) {
      if (!sheetData.has(rowId)) {
        toSoftDelete.push(id);
      }
    }

    // 6. Process inserts and updates
    const now = new Date();
    const upsertOperations: Prisma.PrismaPromise<unknown>[] = [];

    for (const item of toInsert) {
      const raw = mapRow(item.cells);
      const projectId = await resolveProjectId(raw.projectNumber);
      const productId = await resolveProductId(raw.itemLabel);
      const buildingId = await resolveBuildingId(raw.buildingNameRaw);
      const supplierId = await resolveSupplierId(raw.awardedToRaw);
      const resolutionStatus = computeResolutionStatus(raw, projectId, productId, buildingId, supplierId);

      upsertOperations.push(
        prisma.lcrEntry.create({
          data: {
            sheetRowId: item.sheetRowId,
            rowHash: item.hash,
            syncedAt: now,
            resolutionStatus,
            sn: raw.sn,
            projectNumber: raw.projectNumber,
            projectId,
            itemLabel: raw.itemLabel,
            productId,
            qty: raw.qty,
            amount: raw.amount,
            status: raw.status,
            buildingNameRaw: raw.buildingNameRaw,
            buildingId,
            mrfNumber: raw.mrfNumber,
            requestDate: raw.requestDate,
            neededFromDate: raw.neededFromDate,
            neededToDate: raw.neededToDate,
            buyingDate: raw.buyingDate,
            receivingDate: raw.receivingDate,
            poNumber: raw.poNumber,
            dnNumber: raw.dnNumber,
            awardedToRaw: raw.awardedToRaw,
            supplierId,
            weight: raw.weight,
            totalWeight: raw.totalWeight,
            thickness: raw.thickness,
            targetPrice: raw.targetPrice,
            totalLcr1: raw.totalLcr1,
            ratio1to2Lcr1: raw.ratio1to2Lcr1,
            lcr1Amount: raw.lcr1Amount,
            lcr1PricePerTon: raw.lcr1PricePerTon,
            totalLcr2: raw.totalLcr2,
            lcr2: raw.lcr2,
            lcr2Amount: raw.lcr2Amount,
            lcr2PricePerTon: raw.lcr2PricePerTon,
            lcr3: raw.lcr3,
            lcr3Amount: raw.lcr3Amount,
            lcr3PricePerTon: raw.lcr3PricePerTon,
          },
        }),
      );
      inserted++;
    }

    for (const item of toUpdate) {
      const raw = mapRow(item.cells);
      const projectId = await resolveProjectId(raw.projectNumber);
      const productId = await resolveProductId(raw.itemLabel);
      const buildingId = await resolveBuildingId(raw.buildingNameRaw);
      const supplierId = await resolveSupplierId(raw.awardedToRaw);
      const resolutionStatus = computeResolutionStatus(raw, projectId, productId, buildingId, supplierId);

      upsertOperations.push(
        prisma.lcrEntry.update({
          where: { id: item.id },
          data: {
            rowHash: item.hash,
            syncedAt: now,
            resolutionStatus,
            sn: raw.sn,
            projectNumber: raw.projectNumber,
            projectId,
            itemLabel: raw.itemLabel,
            productId,
            qty: raw.qty,
            amount: raw.amount,
            status: raw.status,
            buildingNameRaw: raw.buildingNameRaw,
            buildingId,
            mrfNumber: raw.mrfNumber,
            requestDate: raw.requestDate,
            neededFromDate: raw.neededFromDate,
            neededToDate: raw.neededToDate,
            buyingDate: raw.buyingDate,
            receivingDate: raw.receivingDate,
            poNumber: raw.poNumber,
            dnNumber: raw.dnNumber,
            awardedToRaw: raw.awardedToRaw,
            supplierId,
            weight: raw.weight,
            totalWeight: raw.totalWeight,
            thickness: raw.thickness,
            targetPrice: raw.targetPrice,
            totalLcr1: raw.totalLcr1,
            ratio1to2Lcr1: raw.ratio1to2Lcr1,
            lcr1Amount: raw.lcr1Amount,
            lcr1PricePerTon: raw.lcr1PricePerTon,
            totalLcr2: raw.totalLcr2,
            lcr2: raw.lcr2,
            lcr2Amount: raw.lcr2Amount,
            lcr2PricePerTon: raw.lcr2PricePerTon,
            lcr3: raw.lcr3,
            lcr3Amount: raw.lcr3Amount,
            lcr3PricePerTon: raw.lcr3PricePerTon,
          },
        }),
      );
      updated++;
    }

    // Soft-delete rows no longer in sheet
    if (toSoftDelete.length > 0) {
      upsertOperations.push(
        prisma.lcrEntry.updateMany({
          where: { id: { in: toSoftDelete } },
          data: { isDeleted: true, syncedAt: now },
        }),
      );
      deleted = toSoftDelete.length;
    }

    // 7. Execute transaction
    if (upsertOperations.length > 0) {
      await prisma.$transaction(upsertOperations);
    }

    // 8. Count pending aliases
    pendingAliases = await prisma.lcrEntry.count({
      where: { resolutionStatus: 'pending', isDeleted: false },
    });

    const durationMs = Date.now() - startTime;
    const status = pendingAliases > 0 ? 'partial' : 'success';

    // 9. Write sync log
    await writeSyncLog(status, triggeredBy, totalRows, inserted, updated, unchanged, deleted, pendingAliases, durationMs, null);

    // 10. Audit log
    const systemUserId = await getSystemUserId();
    await auditService.logSync('LcrEntry', 'batch', 'GoogleSheets', {
      inserted,
      updated,
      unchanged,
      deleted,
      pendingAliases,
      durationMs,
      triggeredBy,
    });
    log.info({ inserted, updated, unchanged, deleted, pendingAliases, durationMs }, 'LCR sync completed');

    return { status, inserted, updated, unchanged, deleted, pendingAliases, durationMs };
  } catch (error: unknown) {
    const durationMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    log.error({ error }, 'LCR sync failed');

    await writeSyncLog('error', triggeredBy, 0, inserted, updated, unchanged, deleted, pendingAliases, durationMs, errorMessage);

    return { status: 'error', inserted, updated, unchanged, deleted, pendingAliases, durationMs, error: errorMessage };
  }
}

async function writeSyncLog(
  status: string,
  triggeredBy: string,
  totalRows: number,
  rowsInserted: number,
  rowsUpdated: number,
  rowsUnchanged: number,
  rowsDeleted: number,
  pendingAliases: number,
  durationMs: number,
  errorMessage: string | null,
): Promise<void> {
  try {
    await prisma.lcrSyncLog.create({
      data: {
        status,
        triggeredBy,
        totalRows,
        rowsInserted,
        rowsUpdated,
        rowsUnchanged,
        rowsDeleted,
        pendingAliases,
        durationMs,
        errorMessage,
      },
    });
  } catch (err) {
    log.error({ error: err }, 'Failed to write LCR sync log');
  }
}
