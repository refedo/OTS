/**
 * Direct-MySQL access to the Dolibarr database (18.8.0).
 *
 * Read-only pool for tables like `<prefix>holiday` and
 * `<prefix>c_holiday_types` that aren't reliably exposed by the Dolibarr
 * REST `/api/index.php/holidays` endpoint on Walid's install. See the
 * 18.7.1 → 18.7.6 changelog entries for the four-iteration diagnostic saga
 * that ultimately forced us to bypass REST for holidays specifically.
 *
 * Gated by DOLIBARR_DB_HOST / PORT / USER / PASSWORD / DATABASE env vars —
 * all four non-port values must be set or the pool refuses to initialise
 * and throws `DolibarrDbNotConfiguredError`. Callers surface that as a
 * clean 503, never a crash.
 *
 * NEVER writes to Dolibarr. SELECTs only, via a pool capped at 3
 * connections (Dolibarr is on a shared cPanel MySQL and we don't want to
 * starve their connection slots).
 *
 * Table prefix is read from DOLIBARR_DB_TABLE_PREFIX (default `llx_`,
 * which is Dolibarr's stock prefix). Walid's instance uses `llxvv_`, set
 * that in .env. The prefix is validated against `^[a-z][a-z0-9_]*_$`
 * before interpolation — mysql2 cannot parameterise table names so the
 * regex is the only guard against SQL injection here. Anything that
 * doesn't match is rejected loudly at pool init.
 */

import mysql from 'mysql2/promise';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';

export class DolibarrDbNotConfiguredError extends Error {
  constructor(missing?: string[]) {
    const list = missing && missing.length > 0 ? ` Missing: ${missing.join(', ')}.` : '';
    super(
      'Dolibarr direct-MySQL access is not configured.' +
        list +
        ' Set DOLIBARR_DB_HOST, DOLIBARR_DB_USER, DOLIBARR_DB_PASSWORD and ' +
        'DOLIBARR_DB_DATABASE in the OTS .env file (plus optional ' +
        'DOLIBARR_DB_PORT and DOLIBARR_DB_TABLE_PREFIX), then restart the server.',
    );
    this.name = 'DolibarrDbNotConfiguredError';
  }
}

/** Row shape returned by `fetchApprovedDolibarrHolidays()`.
 *
 *  Intentionally minimal — only the columns OTS actually reads. Older
 *  Dolibarr schemas (like Walid's install) are missing `nb_open_day` and
 *  `date_approval`, and selecting them blows up the whole sync with
 *  "Unknown column … in 'field list'". So we stick to the columns that
 *  have existed in every Dolibarr release we care about. */
/**
 * A resolved key→label map for a single Dolibarr select extrafield.
 * key is the stored value (often a numeric string like "3"), label is the display text.
 */
export type ExtraFieldSelectMap = Map<string, string>;

export interface DolibarrHolidayDbRow {
  rowid: number;
  fk_user: number;
  type_code: string | null;
  type_label: string | null;
  date_debut: Date;
  date_fin: Date;
  statut: number;
  description: string | null;
  date_create: Date;
}

const TABLE_PREFIX_PATTERN = /^[a-z][a-z0-9_]*_$/;

let pool: mysql.Pool | null = null;
let resolvedPrefix: string | null = null;

function ensureConfigured(): void {
  const missing: string[] = [];
  if (!env.DOLIBARR_DB_HOST) missing.push('DOLIBARR_DB_HOST');
  if (!env.DOLIBARR_DB_USER) missing.push('DOLIBARR_DB_USER');
  if (!env.DOLIBARR_DB_PASSWORD) missing.push('DOLIBARR_DB_PASSWORD');
  if (!env.DOLIBARR_DB_DATABASE) missing.push('DOLIBARR_DB_DATABASE');
  if (missing.length > 0) throw new DolibarrDbNotConfiguredError(missing);
}

/** Returns the validated table prefix (default `llx_`). Throws if the env
 *  value is set but fails the safe-identifier regex. */
export function getDolibarrTablePrefix(): string {
  if (resolvedPrefix !== null) return resolvedPrefix;
  const raw = env.DOLIBARR_DB_TABLE_PREFIX?.trim() || 'llx_';
  if (!TABLE_PREFIX_PATTERN.test(raw)) {
    throw new Error(
      `Invalid DOLIBARR_DB_TABLE_PREFIX="${raw}" — must match /^[a-z][a-z0-9_]*_$/ (e.g. "llx_", "llxvv_"). Rejected as unsafe to interpolate into SQL.`,
    );
  }
  resolvedPrefix = raw;
  return raw;
}

export function getDolibarrDbPool(): mysql.Pool {
  ensureConfigured();
  // Validate the prefix early so misconfiguration crashes on pool init,
  // not later on the first query.
  getDolibarrTablePrefix();
  if (!pool) {
    const port = env.DOLIBARR_DB_PORT ? parseInt(env.DOLIBARR_DB_PORT, 10) : 3306;
    pool = mysql.createPool({
      host: env.DOLIBARR_DB_HOST!,
      port,
      user: env.DOLIBARR_DB_USER!,
      password: env.DOLIBARR_DB_PASSWORD!,
      database: env.DOLIBARR_DB_DATABASE!,
      connectionLimit: 3,
      waitForConnections: true,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10_000,
      // Dolibarr stores dates as native MySQL DATE/DATETIME. We force UTC
      // on the connection so mysql2 hands back JS Dates with deterministic
      // UTC-based toISOString() output regardless of server locale.
      timezone: 'Z',
      dateStrings: false,
      multipleStatements: false,
    });
    logger.info(
      {
        host: env.DOLIBARR_DB_HOST,
        port,
        database: env.DOLIBARR_DB_DATABASE,
        tablePrefix: resolvedPrefix,
      },
      '[Dolibarr DB] Pool initialised',
    );
  }
  return pool;
}

export interface PingResult {
  ok: boolean;
  latencyMs: number;
  serverVersion?: string;
  tablePrefix?: string;
  holidayCount?: number;
  error?: string;
}

/**
 * Returns a Map<id, departmentName> from Dolibarr's hrm_department table.
 * Used during employee sync to resolve the numeric `options_department` extrafield
 * to a human-readable department name.
 */
export async function fetchDolibarrDepartmentMap(): Promise<Map<string, string>> {
  const p = getDolibarrDbPool();
  const prefix = getDolibarrTablePrefix();
  const [rows] = await p.query<mysql.RowDataPacket[]>(
    `SELECT rowid, label FROM \`${prefix}hrm_department\` WHERE active = 1`,
  );
  const map = new Map<string, string>();
  for (const r of rows) {
    if (r.rowid != null && r.label != null) {
      map.set(String(r.rowid), String(r.label));
    }
  }
  return map;
}

/**
 * Returns a Map<id, countryLabel> from Dolibarr's c_country table.
 * Used during employee sync to resolve the numeric `options_nationality` extrafield.
 */
export async function fetchDolibarrCountryMap(): Promise<Map<string, string>> {
  const p = getDolibarrDbPool();
  const prefix = getDolibarrTablePrefix();
  const [rows] = await p.query<mysql.RowDataPacket[]>(
    `SELECT rowid, label FROM \`${prefix}c_country\` WHERE active = 1`,
  );
  const map = new Map<string, string>();
  for (const r of rows) {
    if (r.rowid != null && r.label != null) {
      map.set(String(r.rowid), String(r.label));
    }
  }
  return map;
}

/**
 * Returns a Map<fieldName, Map<key, label>> for all select-type user extrafields.
 * Dolibarr stores select options in the `param` column as a JSON object:
 * {"options":{"key1":"Label 1","key2":"Label 2"}}.
 * Falls back gracefully if param is null or unparseable.
 */
export async function fetchDolibarrExtraFieldSelectMaps(): Promise<Map<string, ExtraFieldSelectMap>> {
  const p = getDolibarrDbPool();
  const prefix = getDolibarrTablePrefix();
  const [rows] = await p.query<mysql.RowDataPacket[]>(
    `SELECT name, type, param FROM \`${prefix}extrafields\`
     WHERE elementtype = 'user' AND type IN ('select', 'sellist', 'radio', 'checkbox')`,
  );
  const result = new Map<string, ExtraFieldSelectMap>();
  for (const r of rows) {
    if (!r.name || !r.param) continue;
    try {
      const parsed = typeof r.param === 'string' ? JSON.parse(r.param) : r.param;
      const options: Record<string, string> | undefined =
        parsed?.options ?? (typeof parsed === 'object' ? parsed : undefined);
      if (!options) continue;
      const fieldMap = new Map<string, string>();
      for (const [k, v] of Object.entries(options)) {
        if (v != null) fieldMap.set(String(k), String(v));
      }
      if (fieldMap.size > 0) result.set(String(r.name), fieldMap);
    } catch {
      // unparseable param — skip this field
    }
  }
  return result;
}

/**
 * Lightweight connectivity probe — runs `SELECT VERSION()` and a COUNT of
 * the approved-holidays row (the exact query the sync relies on). Used by
 * `/api/hr/leave-requests/db-ping` so admins can verify end-to-end from
 * the browser before firing a real sync.
 */
export async function pingDolibarrDb(): Promise<PingResult> {
  const start = Date.now();
  try {
    const p = getDolibarrDbPool();
    const prefix = getDolibarrTablePrefix();

    const [versionRows] = await p.query<mysql.RowDataPacket[]>('SELECT VERSION() AS version');
    const serverVersion = (versionRows[0]?.version as string | undefined) ?? undefined;

    const [countRows] = await p.query<mysql.RowDataPacket[]>(
      `SELECT COUNT(*) AS c FROM \`${prefix}holiday\` WHERE statut = 3`,
    );
    const holidayCount = Number(countRows[0]?.c ?? 0);

    return {
      ok: true,
      latencyMs: Date.now() - start,
      serverVersion,
      tablePrefix: prefix,
      holidayCount,
    };
  } catch (err) {
    return {
      ok: false,
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Fetch every APPROVED holiday (statut = 3) from Dolibarr, joined against
 * the holiday-types catalogue so the caller gets `type_code` +
 * `type_label` in one round-trip. Ordered by `rowid` ASC so sync logs stay
 * deterministic run-to-run.
 *
 * The prefix is interpolated, not parameterised (mysql2 can't bind table
 * names), but it's regex-validated in `getDolibarrTablePrefix()` first.
 */
export async function fetchApprovedDolibarrHolidays(): Promise<DolibarrHolidayDbRow[]> {
  const p = getDolibarrDbPool();
  const prefix = getDolibarrTablePrefix();
  const [rows] = await p.query<mysql.RowDataPacket[]>(
    // NOTE: the SELECT is intentionally minimal — only columns OTS
    // actually reads. Walid's install (Dolibarr on erp.hexametals.com)
    // is missing `nb_open_day` AND `date_approval` — both return
    // "Unknown column … in 'field list'" when selected. Both are unread
    // in sync-dolibarr-leaves.ts anyway (calendar/working days are
    // computed from date_debut/date_fin, and approval timestamp is
    // unused), so they're dropped here to make the query portable
    // across Dolibarr versions. `halfday` and `fk_type` are also
    // dropped for the same reason (unused post-JOIN).
    `SELECT
       h.rowid,
       h.fk_user,
       t.code  AS type_code,
       t.label AS type_label,
       h.date_debut,
       h.date_fin,
       h.statut,
       h.description,
       h.date_create
     FROM \`${prefix}holiday\` AS h
     LEFT JOIN \`${prefix}c_holiday_types\` AS t ON t.rowid = h.fk_type
     WHERE h.statut = 3
     ORDER BY h.rowid ASC`,
  );
  return rows as unknown as DolibarrHolidayDbRow[];
}
