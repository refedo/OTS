/**
 * Direct MySQL readthrough to the Dolibarr database.
 *
 * Used as a fallback when the Dolibarr REST API does not expose a
 * particular table. The canonical case is the Holiday module: many
 * Dolibarr builds do not ship (or fail to register) `api_holidays.class.php`
 * even when the Leaves module and its permissions are enabled through
 * the UI. The REST endpoint responds with HTTP 200 + plain-text
 * "API not found (failed to include API file)" and there is nothing
 * OTS can do on its side to fix that.
 *
 * This module provides a narrow, read-only MySQL client that queries
 * `llx_holiday` and `llx_c_holiday_types` directly. It is only active
 * when all five `DOLIBARR_DB_*` env vars are set; otherwise the caller
 * must surface the original REST error to the user.
 *
 * Connection is opened per sync run and closed at the end.
 */

import mysql, { Pool, RowDataPacket } from 'mysql2/promise';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import type { DolibarrHoliday, DolibarrHolidayType } from './dolibarr-client';

let pool: Pool | null = null;

export function isDolibarrDbConfigured(): boolean {
  return Boolean(
    env.DOLIBARR_DB_HOST &&
      env.DOLIBARR_DB_USER &&
      env.DOLIBARR_DB_PASSWORD &&
      env.DOLIBARR_DB_DATABASE,
  );
}

function getPool(): Pool {
  if (pool) return pool;
  if (!isDolibarrDbConfigured()) {
    throw new Error(
      'Dolibarr MySQL fallback is not configured. Set DOLIBARR_DB_HOST, DOLIBARR_DB_PORT, DOLIBARR_DB_USER, DOLIBARR_DB_PASSWORD and DOLIBARR_DB_DATABASE.',
    );
  }
  pool = mysql.createPool({
    host: env.DOLIBARR_DB_HOST,
    port: env.DOLIBARR_DB_PORT ? parseInt(env.DOLIBARR_DB_PORT, 10) : 3306,
    user: env.DOLIBARR_DB_USER,
    password: env.DOLIBARR_DB_PASSWORD,
    database: env.DOLIBARR_DB_DATABASE,
    connectionLimit: 3,
    waitForConnections: true,
    // Read-only usage; we never write to the Dolibarr DB.
    timezone: 'Z',
  });
  logger.info(
    { host: env.DOLIBARR_DB_HOST, database: env.DOLIBARR_DB_DATABASE },
    '[Dolibarr DB] Direct MySQL pool created',
  );
  return pool;
}

/**
 * Fetch all rows from `llx_holiday`, mapped to the same shape the REST
 * client would return (`DolibarrHoliday`). Columns are cherry-picked to
 * avoid surprises from custom Dolibarr installs.
 */
export async function getAllHolidaysFromDb(): Promise<DolibarrHoliday[]> {
  const p = getPool();
  type Row = RowDataPacket & {
    rowid: number;
    fk_user: number | null;
    fk_validator: number | null;
    fk_type: number | null;
    date_create: Date | string | null;
    description: string | null;
    date_debut: Date | string | null;
    date_fin: Date | string | null;
    halfday: number | null;
    statut: number | null;
    fk_user_create: number | null;
    fk_user_modif: number | null;
    fk_user_valid: number | null;
    date_valid: Date | string | null;
    date_approval: Date | string | null;
    date_refuse: Date | string | null;
    date_cancel: Date | string | null;
    detail_refuse: string | null;
  };
  const [rows] = await p.query<Row[]>(
    `SELECT
       rowid,
       fk_user,
       fk_validator,
       fk_type,
       date_create,
       description,
       date_debut,
       date_fin,
       halfday,
       statut,
       fk_user_create,
       fk_user_modif,
       fk_user_valid,
       date_valid,
       date_approval,
       date_refuse,
       date_cancel,
       detail_refuse
     FROM llx_holiday
     ORDER BY rowid ASC`,
  );

  // Convert to the same shape as the Dolibarr REST API: dates as Unix
  // seconds, ids as numbers. The sync service uses `tsToDate()` which
  // handles either a number or a string, so a plain number is enough.
  return rows.map<DolibarrHoliday>((r) => ({
    id: r.rowid,
    fk_user: r.fk_user != null ? String(r.fk_user) : undefined,
    fk_type: r.fk_type != null ? String(r.fk_type) : undefined,
    fk_validator: r.fk_validator != null ? String(r.fk_validator) : null,
    date_create: toUnixSeconds(r.date_create) ?? undefined,
    description: r.description,
    date_debut: toUnixSeconds(r.date_debut) ?? undefined,
    date_fin: toUnixSeconds(r.date_fin) ?? undefined,
    halfday: r.halfday ?? 0,
    statut: r.statut != null ? String(r.statut) : undefined,
    date_approval: toUnixSeconds(r.date_approval),
    detail_refuse: r.detail_refuse,
  }));
}

/**
 * Fetch the holiday types catalogue from `llx_c_holiday_types`.
 */
export async function getHolidayTypesFromDb(): Promise<DolibarrHolidayType[]> {
  const p = getPool();
  type Row = RowDataPacket & {
    rowid: number;
    code: string | null;
    label: string | null;
    affect: number | null;
    delay: number | null;
    newbymonth: number | string | null;
    active: number | null;
  };
  const [rows] = await p.query<Row[]>(
    `SELECT rowid, code, label, affect, delay, newbymonth, active
       FROM llx_c_holiday_types
      WHERE active = 1
      ORDER BY rowid ASC`,
  );
  return rows.map<DolibarrHolidayType>((r) => ({
    id: r.rowid,
    rowid: r.rowid,
    code: r.code ?? null,
    label: r.label ?? null,
    affect: r.affect ?? undefined,
  }));
}

/**
 * Run a lightweight connectivity probe. Returns true if the pool can
 * issue `SELECT 1`. Called by the sync service to decide whether to
 * attempt the fallback at all.
 */
export async function pingDolibarrDb(): Promise<boolean> {
  try {
    const p = getPool();
    await p.query('SELECT 1');
    return true;
  } catch (err) {
    logger.warn({ err }, '[Dolibarr DB] ping failed');
    return false;
  }
}

function toUnixSeconds(value: Date | string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const d = value instanceof Date ? value : new Date(value);
  const t = d.getTime();
  if (!Number.isFinite(t)) return null;
  return Math.floor(t / 1000);
}
