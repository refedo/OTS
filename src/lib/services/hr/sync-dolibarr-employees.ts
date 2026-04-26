/**
 * Dolibarr → OTS Employee Sync Service
 *
 * Phase 1 of OTS-MSS-HR-PAYROLL-v1. One-way read-only mirror from Dolibarr
 * `llx_user` into OTS `Employee`. Triggered manually via the sync UI; idempotent.
 *
 * Key behaviours:
 * - Pre-check `SystemConfig.identityReconciliationComplete === 'true'`.
 *   If false, abort with error — the reconciliation wizard must run first.
 * - Join key is `Employee.employmentId = String(llx_user.rowid)`.
 * - Preserve-on-edit: any field listed in `Employee.manuallyEditedFields`
 *   is NOT overwritten by the sync. Newly-created rows always populate
 *   all fields from Dolibarr.
 * - Never deletes local rows that are missing from upstream; never writes back.
 * - After each upsert, if a `User.dolibarrUserId` matches this API user's id
 *   and `User.employeeId IS NULL`, set the link (one-time backfill during
 *   the first sync after reconciliation). Subsequent syncs find the link
 *   already set and skip.
 * - Every run records a `DolibarrEmployeeSyncLog` row with created/updated/
 *   skipped/preservedField counts, link-established count, hard errors,
 *   and soft warnings.
 */

import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import type { Prisma } from '@prisma/client';
import {
  DolibarrClient,
  DolibarrUser,
  createDolibarrClient,
} from '@/lib/dolibarr/dolibarr-client';
import {
  fetchDolibarrUserExtrafields,
  DolibarrDbNotConfiguredError,
} from '@/lib/dolibarr/dolibarr-db';

// ============================================================================
// TYPES
// ============================================================================

type HardError = { employmentId: string; message: string };
type SoftWarning = { employmentId: string; field?: string; message: string };

export interface EmployeeSyncResult {
  syncLogId: string;
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED';
  rowsRead: number;
  rowsCreated: number;
  rowsUpdated: number;
  rowsSkipped: number;
  fieldsPreserved: number;
  linksEstablished: number;
  hardErrors: HardError[];
  softWarnings: SoftWarning[];
  durationMs: number;
}

export class ReconciliationRequiredError extends Error {
  constructor() {
    super(
      'Identity reconciliation must be completed before running the Dolibarr employee sync. ' +
        'Open /admin/identity-reconciliation and link every OTS user to their Dolibarr counterpart first.',
    );
    this.name = 'ReconciliationRequiredError';
  }
}

// ============================================================================
// FIELD MAPPING HELPERS
// ============================================================================

/** Convert a Dolibarr Unix timestamp (seconds) to JS Date. Null-safe. */
function tsToDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : parseInt(String(value), 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  return new Date(n * 1000);
}

/** Safely read an extrafield from Dolibarr's array_options blob. */
function extra(apiUser: DolibarrUser, ...keys: string[]): string | null {
  const opts = apiUser.array_options;
  if (!opts || typeof opts !== 'object') return null;
  for (const k of keys) {
    const raw = (opts as Record<string, unknown>)[k];
    if (raw !== null && raw !== undefined && String(raw).trim() !== '') {
      return String(raw).trim();
    }
  }
  return null;
}

/**
 * Read an extrafield from the direct DB extrafields map first (text values),
 * falling back to the REST API's array_options blob.
 * `dbKey` is the column name in llx_user_extrafields (no `options_` prefix).
 * `apiKeys` are the array_options keys (with `options_` prefix) as fallback.
 */
function dbExtra(
  userId: string,
  dbFields: Map<string, Record<string, string>>,
  dbKey: string,
  apiUser: DolibarrUser,
  ...apiKeys: string[]
): string | null {
  const row = dbFields.get(userId);
  if (row) {
    const val = row[dbKey];
    if (val) return val;
  }
  return extra(apiUser, ...apiKeys);
}

function parseDecimal(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  const s = String(value).trim();
  if (s === '') return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return n.toFixed(2);
}

function buildFullName(apiUser: DolibarrUser): string {
  const parts = [apiUser.firstname, apiUser.lastname]
    .filter((x): x is string => typeof x === 'string' && x.trim() !== '')
    .map((s) => s.trim());
  return parts.join(' ');
}

type EmployeeStatus = 'ACTIVE' | 'ON_LEAVE' | 'SUSPENDED' | 'TERMINATED' | 'RESIGNED';

function mapStatus(apiUser: DolibarrUser): EmployeeStatus {
  const statut = apiUser.statut === undefined ? '1' : String(apiUser.statut);
  // Dolibarr statut=1 means the user account is active — trust it as ACTIVE
  // regardless of dateemploymentend (contract end date ≠ employment end date
  // for renewable contracts common in Saudi Arabia).
  if (statut === '1') return 'ACTIVE';
  const leavingTs = tsToDate(apiUser.dateemploymentend);
  if (leavingTs && leavingTs.getTime() < Date.now()) return 'TERMINATED';
  return 'TERMINATED';
}

/**
 * Build the canonical OTS projection of a Dolibarr user record. The result is
 * a plain object with all columns the sync touches — the caller filters by
 * `manuallyEditedFields` on update, and passes the full object on create.
 */
function projectFromDolibarr(
  apiUser: DolibarrUser,
  dbFields: Map<string, Record<string, string>> = new Map(),
): {
  employmentId: string;
  fullNameEn: string;
  fullNameAr: string | null;
  nationalId: string | null;
  dateOfJoining: Date;
  dateOfLeaving: Date | null;
  status: EmployeeStatus;
  occupation: string | null;
  department: string | null;
  basicSalary: string;
  bankName: string | null;
  bankIban: string | null;
  // Extended Dolibarr extrafields (19.5.0)
  nationality: string | null;
  employeeNo: string | null;
  boarderNumber: string | null;
  maritalStatus: string | null;
  occupationAr: string | null;
  gosiSubscriptionNo: string | null;
  contractEndDate: Date | null;
  contractDuration: string | null;
  passportNumber: string | null;
  iqamaUrl: string | null;
  passportUrl: string | null;
  sponsorNumber: string | null;
  contractType: string | null;
  workingLocation: string | null;
  transferType: string | null;
  gender: string | null;
} {
  const userId = String(apiUser.id);
  const fullName = buildFullName(apiUser);
  const basic = parseDecimal(apiUser.salary) ?? '0.00';
  return {
    employmentId: userId,
    fullNameEn: fullName || `Dolibarr user ${apiUser.id}`,
    fullNameAr: dbExtra(userId, dbFields, 'name_in_arabic', apiUser, 'options_name_in_arabic', 'options_name_ar', 'options_fullname_ar'),
    nationalId:
      (typeof apiUser.national_registration_number === 'string' && apiUser.national_registration_number.trim()) ||
      dbExtra(userId, dbFields, 'iqama_number', apiUser, 'options_iqama_number', 'options_iqama', 'options_national_id') ||
      null,
    dateOfJoining: tsToDate(apiUser.dateemployment) ?? tsToDate(apiUser.datec) ?? new Date(),
    dateOfLeaving: tsToDate(apiUser.dateemploymentend),
    status: mapStatus(apiUser),
    occupation: typeof apiUser.job === 'string' && apiUser.job.trim() !== '' ? apiUser.job.trim() : null,
    department: dbExtra(userId, dbFields, 'department', apiUser, 'options_department'),
    basicSalary: basic,
    bankName: dbExtra(userId, dbFields, 'bank_name', apiUser, 'options_bank_name', 'options_bank'),
    bankIban: dbExtra(userId, dbFields, 'iban', apiUser, 'options_iban', 'options_bank_iban'),
    // Extended extrafields — DB has correct text values; API fallback kept for safety
    nationality: dbExtra(userId, dbFields, 'nationality', apiUser, 'options_nationality'),
    employeeNo: dbExtra(userId, dbFields, 'employee_no', apiUser, 'options_employee_no'),
    boarderNumber: dbExtra(userId, dbFields, 'boarder_number', apiUser, 'options_boarder_number'),
    maritalStatus: dbExtra(userId, dbFields, 'marital_status', apiUser, 'options_marital_status'),
    occupationAr: dbExtra(userId, dbFields, 'occupation_in_iqama_ar', apiUser, 'options_occupation_in_iqama_ar'),
    gosiSubscriptionNo: dbExtra(userId, dbFields, 'gosi_subscription', apiUser, 'options_gosi_subscription'),
    contractEndDate: (() => {
      const raw = dbExtra(userId, dbFields, 'contract_ending_date', apiUser, 'options_contract_ending_date');
      if (!raw) return null;
      const n = Number(raw);
      if (Number.isFinite(n) && n > 0) return new Date(n * 1000);
      const d = new Date(raw);
      return isNaN(d.getTime()) ? null : d;
    })(),
    contractDuration: dbExtra(userId, dbFields, 'contract_duration', apiUser, 'options_contract_duration'),
    passportNumber: dbExtra(userId, dbFields, 'passport_number', apiUser, 'options_passport_number'),
    iqamaUrl: dbExtra(userId, dbFields, 'iqama_url', apiUser, 'options_iqama_url'),
    passportUrl: dbExtra(userId, dbFields, 'passport_url', apiUser, 'options_passport_url'),
    sponsorNumber: dbExtra(userId, dbFields, 'sponsor_number', apiUser, 'options_sponsor_number'),
    contractType: dbExtra(userId, dbFields, 'contract_type', apiUser, 'options_contract_type'),
    workingLocation: dbExtra(userId, dbFields, 'working_location', apiUser, 'options_working_location'),
    transferType: dbExtra(userId, dbFields, 'transfer_type', apiUser, 'options_transfer_type'),
    gender: (() => {
      const g = typeof apiUser.gender === 'string' ? apiUser.gender.toLowerCase().trim() : null;
      if (g === 'man' || g === 'male') return 'MALE';
      if (g === 'woman' || g === 'female') return 'FEMALE';
      return extra(apiUser, 'options_gender') === 'man' ? 'MALE'
        : extra(apiUser, 'options_gender') === 'woman' ? 'FEMALE'
        : null;
    })(),
  };
}

// ============================================================================
// SYNC ENTRY POINT
// ============================================================================

export interface RunSyncOptions {
  triggeredById: string;
  client?: DolibarrClient;
}

export async function runDolibarrEmployeeSync(
  opts: RunSyncOptions,
): Promise<EmployeeSyncResult> {
  const start = Date.now();

  // -- Pre-check: reconciliation gate --
  const gate = await prisma.systemConfig.findUnique({
    where: { key: 'identityReconciliationComplete' },
  });
  if (!gate || gate.value !== 'true') {
    throw new ReconciliationRequiredError();
  }

  const client = opts.client ?? createDolibarrClient();

  // -- Start sync log row (status = RUNNING) so partial failures are visible --
  const syncLog = await prisma.dolibarrEmployeeSyncLog.create({
    data: {
      triggeredById: opts.triggeredById,
      status: 'RUNNING',
    },
  });

  const hardErrors: HardError[] = [];
  const softWarnings: SoftWarning[] = [];
  let rowsRead = 0;
  let rowsCreated = 0;
  let rowsUpdated = 0;
  let rowsSkipped = 0;
  let fieldsPreserved = 0;
  let linksEstablished = 0;
  let apiResponseMs: number | null = null;

  try {
    const apiStart = Date.now();
    const dolibarrUsers = await client.getAllUsers();
    apiResponseMs = Date.now() - apiStart;
    rowsRead = dolibarrUsers.length;

    // Load user extrafields directly from Dolibarr DB (text values, one query)
    let dbFields: Map<string, Record<string, string>> = new Map();
    try {
      dbFields = await fetchDolibarrUserExtrafields();
      logger.info({ users: dbFields.size }, '[HR Sync] User extrafields loaded from Dolibarr DB');
    } catch (e) {
      if (!(e instanceof DolibarrDbNotConfiguredError)) {
        logger.warn({ error: e }, '[HR Sync] Failed to load user_extrafields — falling back to API array_options');
      }
    }

    for (const apiUser of dolibarrUsers) {
      try {
        const projection = projectFromDolibarr(apiUser, dbFields);

        // -- Upsert by employmentId --
        const existing = await prisma.employee.findUnique({
          where: { employmentId: projection.employmentId },
        });

        if (!existing) {
          await prisma.employee.create({
            data: {
              employmentId: projection.employmentId,
              fullNameEn: projection.fullNameEn,
              fullNameAr: projection.fullNameAr,
              nationalId: projection.nationalId,
              dateOfJoining: projection.dateOfJoining,
              dateOfLeaving: projection.dateOfLeaving,
              status: projection.status,
              occupation: projection.occupation,
              department: projection.department,
              basicSalary: projection.basicSalary,
              bankName: projection.bankName,
              bankIban: projection.bankIban,
              nationality: projection.nationality,
              employeeNo: projection.employeeNo,
              boarderNumber: projection.boarderNumber,
              maritalStatus: projection.maritalStatus,
              occupationAr: projection.occupationAr,
              gosiSubscriptionNo: projection.gosiSubscriptionNo,
              contractEndDate: projection.contractEndDate,
              contractDuration: projection.contractDuration,
              passportNumber: projection.passportNumber,
              iqamaUrl: projection.iqamaUrl,
              passportUrl: projection.passportUrl,
              sponsorNumber: projection.sponsorNumber,
              contractType: projection.contractType,
              workingLocation: projection.workingLocation,
              transferType: projection.transferType,
              gender: projection.gender,
              lastSyncedFromDolibarrAt: new Date(),
              manuallyEditedFields: [],
              createdById: opts.triggeredById,
            },
          });
          rowsCreated++;
        } else {
          // Build update data honouring manuallyEditedFields skip-list
          const edited = Array.isArray(existing.manuallyEditedFields)
            ? (existing.manuallyEditedFields as string[])
            : [];
          const updateData: Prisma.EmployeeUncheckedUpdateInput = {
            lastSyncedFromDolibarrAt: new Date(),
            updatedById: opts.triggeredById,
          };
          const fields: Array<keyof typeof projection> = [
            'fullNameEn',
            'fullNameAr',
            'nationalId',
            'dateOfJoining',
            'dateOfLeaving',
            'status',
            'occupation',
            'department',
            'basicSalary',
            'bankName',
            'bankIban',
            'nationality',
            'employeeNo',
            'boarderNumber',
            'maritalStatus',
            'occupationAr',
            'gosiSubscriptionNo',
            'contractEndDate',
            'contractDuration',
            'passportNumber',
            'iqamaUrl',
            'passportUrl',
            'sponsorNumber',
            'contractType',
            'workingLocation',
            'transferType',
            'gender',
          ];
          let anyChange = false;
          for (const field of fields) {
            if (edited.includes(field as string)) {
              fieldsPreserved++;
              continue;
            }
            const newVal = projection[field];
            const oldVal = (existing as unknown as Record<string, unknown>)[field];
            // Decimal equality: compare string form
            const oldStr =
              oldVal && typeof oldVal === 'object' && 'toString' in oldVal
                ? (oldVal as { toString(): string }).toString()
                : oldVal instanceof Date
                  ? oldVal.getTime()
                  : oldVal;
            const newStr = newVal instanceof Date ? newVal.getTime() : newVal;
            if (oldStr !== newStr) {
              (updateData as Record<string, unknown>)[field] = newVal;
              anyChange = true;
            }
          }

          if (anyChange) {
            await prisma.employee.update({
              where: { id: existing.id },
              data: updateData,
            });
            rowsUpdated++;
          } else {
            // Still bump lastSyncedFromDolibarrAt to record the touch
            await prisma.employee.update({
              where: { id: existing.id },
              data: { lastSyncedFromDolibarrAt: new Date() },
            });
            rowsSkipped++;
          }
        }

        // -- Link backfill --
        // After every upsert, check if any User was reconciled to this
        // Dolibarr rowid but hasn't been linked to its Employee yet.
        const dolibarrIdNum =
          typeof apiUser.id === 'number' ? apiUser.id : parseInt(String(apiUser.id), 10);
        if (Number.isFinite(dolibarrIdNum)) {
          const candidate = await prisma.user.findUnique({
            where: { dolibarrUserId: dolibarrIdNum },
            select: { id: true, employeeId: true },
          });
          if (candidate && !candidate.employeeId) {
            const employee = await prisma.employee.findUnique({
              where: { employmentId: projection.employmentId },
              select: { id: true },
            });
            if (employee) {
              await prisma.user.update({
                where: { id: candidate.id },
                data: { employeeId: employee.id },
              });
              linksEstablished++;
            }
          }
        }

        // -- Soft warnings for missing core fields on newly-seen records --
        if (!projection.nationalId) {
          softWarnings.push({
            employmentId: projection.employmentId,
            field: 'nationalId',
            message: 'Missing national ID (required for WPS)',
          });
        }
        if (projection.basicSalary === '0.00') {
          softWarnings.push({
            employmentId: projection.employmentId,
            field: 'basicSalary',
            message: 'Basic salary is zero or missing in Dolibarr',
          });
        }
      } catch (rowError) {
        const msg = rowError instanceof Error ? rowError.message : String(rowError);
        const empId = String(apiUser.id ?? 'unknown');
        hardErrors.push({ employmentId: empId, message: msg });
        logger.error({ employmentId: empId, error: rowError }, '[HR Sync] Row failed');
      }
    }

    // ── Supervisor backfill: wire Employee.reportsToId + User.reportsToId ──────
    // Uses Dolibarr fk_user_resp (supervisor's rowid). Runs after all employees
    // are upserted so both sides of the relation are guaranteed to exist.
    for (const apiUser of dolibarrUsers) {
      const rawSupId = apiUser.fk_user_resp;
      if (!rawSupId) continue;
      const empKey = String(apiUser.id);
      const supKey = String(rawSupId);
      try {
        const [emp, sup] = await Promise.all([
          prisma.employee.findUnique({ where: { employmentId: empKey }, select: { id: true, reportsToId: true } }),
          prisma.employee.findUnique({ where: { employmentId: supKey }, select: { id: true } }),
        ]);
        if (!emp || !sup) continue;
        if (emp.reportsToId !== sup.id) {
          await prisma.employee.update({ where: { id: emp.id }, data: { reportsToId: sup.id } });
        }
        // Also keep User.reportsToId in sync so workflow MANAGER_OF_INITIATOR resolver works
        const [empUser, supUser] = await Promise.all([
          prisma.user.findFirst({ where: { employeeId: emp.id }, select: { id: true, reportsToId: true } }),
          prisma.user.findFirst({ where: { employeeId: sup.id }, select: { id: true } }),
        ]);
        if (empUser && supUser && empUser.reportsToId !== supUser.id) {
          await prisma.user.update({ where: { id: empUser.id }, data: { reportsToId: supUser.id } });
        }
      } catch (supErr) {
        logger.warn({ employmentId: empKey, error: supErr }, '[HR Sync] Supervisor link failed — skipped');
      }
    }

    const finalStatus: 'SUCCESS' | 'PARTIAL' = hardErrors.length > 0 ? 'PARTIAL' : 'SUCCESS';

    await prisma.dolibarrEmployeeSyncLog.update({
      where: { id: syncLog.id },
      data: {
        finishedAt: new Date(),
        status: finalStatus,
        rowsRead,
        rowsCreated,
        rowsUpdated,
        rowsSkipped,
        fieldsPreserved,
        linksEstablished,
        hardErrors: hardErrors.length > 0 ? (hardErrors as unknown as Prisma.InputJsonValue) : undefined,
        softWarnings: softWarnings.length > 0 ? (softWarnings as unknown as Prisma.InputJsonValue) : undefined,
        apiResponseMs,
      },
    });

    logger.info(
      {
        syncLogId: syncLog.id,
        rowsRead,
        rowsCreated,
        rowsUpdated,
        rowsSkipped,
        fieldsPreserved,
        linksEstablished,
        hardErrors: hardErrors.length,
        softWarnings: softWarnings.length,
      },
      '[HR Sync] Dolibarr employee sync completed',
    );

    return {
      syncLogId: syncLog.id,
      status: finalStatus,
      rowsRead,
      rowsCreated,
      rowsUpdated,
      rowsSkipped,
      fieldsPreserved,
      linksEstablished,
      hardErrors,
      softWarnings,
      durationMs: Date.now() - start,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ error: err, syncLogId: syncLog.id }, '[HR Sync] Dolibarr employee sync failed');
    await prisma.dolibarrEmployeeSyncLog.update({
      where: { id: syncLog.id },
      data: {
        finishedAt: new Date(),
        status: 'FAILED',
        rowsRead,
        rowsCreated,
        rowsUpdated,
        rowsSkipped,
        fieldsPreserved,
        linksEstablished,
        hardErrors: [{ employmentId: 'SYNC', message: msg }] as unknown as Prisma.InputJsonValue,
        softWarnings: softWarnings.length > 0 ? (softWarnings as unknown as Prisma.InputJsonValue) : undefined,
        apiResponseMs,
      },
    });
    throw err;
  }
}
