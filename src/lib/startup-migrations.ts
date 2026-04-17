/**
 * Startup Migrations
 * Runs idempotent SQL migrations on server start.
 * Safe to run multiple times — each migration uses IF NOT EXISTS guards.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

const MIGRATIONS_DIR = join(process.cwd(), 'prisma', 'manual_migrations');

/** Migration files to run in order on startup */
const STARTUP_MIGRATIONS = [
  // ── Core HR foundation (Employee, Agency, ManpowerSlot, SystemConfig) ──────
  'add_hr_foundation.sql',
  'add_hr_setup.sql',
  'add_hr_divisions_and_occupations.sql',
  'add_hr_phase_2_5.sql',
  'add_attendance_phase_2.sql',
  'add_hr_phase_3.sql',

  // ── Tasks / conversations ─────────────────────────────────────────────────
  'add_task_soft_delete.sql',
  'add_task_conversations.sql',
  'add_task_message_attachments.sql',
  'add_task_message_updated_at.sql',
  'add_standalone_conversations.sql',
  'add_conversation_last_read.sql',
  'add_conversation_archive_delete.sql',

  // ── System / integrations ─────────────────────────────────────────────────
  'system_event_summaries.sql',
  'add_system_settings_missing_columns.sql',
  'add_integration_toggles.sql',
  'add_lcr_column_mapping.sql',
  'add_lcr1_supplier_field.sql',
  'add_credit_limit_to_thirdparties.sql',
  'add_is_locked_journal_entries.sql',
  'github_integration.sql',
  'widen_attendance_raw_cells.sql',
  'v17_13_to_v17_15_pending.sql',

  // ── HR features (18.x) ────────────────────────────────────────────────────
  'add_dolibarr_leaves_sync.sql',
  'add_announcements.sql',
  'add_contracts.sql',
  'add_hr_letters.sql',
  'add_asset_management.sql',
  'add_asset_location.sql',
  'add_asset_sn.sql',
  'add_holiday_enddate_asset_attachments_backlog_hr.sql',
  'add_employee_history.sql',
  'add_loans_custodies.sql',
  'add_manpower_billing.sql',

  // ── Ops Agent (19.x) ─────────────────────────────────────────────────────
  'add_ops_agent_module.sql',
  'add_ops_agent_ai_config.sql',

  // ── Letters enhancements (19.1.0) ─────────────────────────────────────────
  'add_hr_letter_enhancements.sql',
];

/**
 * Execute a single migration file via Prisma $executeRawUnsafe.
 * Splits on the DELIMITER $$ / DELIMITER ; markers so stored-procedure
 * DDL is executed as individual statements (Prisma/mysql2 does not support
 * multi-statement DDL in a single call).
 */
async function runMigrationFile(filename: string): Promise<void> {
  const filePath = join(MIGRATIONS_DIR, filename);
  let sql: string;

  try {
    sql = readFileSync(filePath, 'utf-8');
  } catch {
    logger.warn({ filename }, '[startup-migration] File not found, skipping');
    return;
  }

  // Split into individual statements intelligently:
  // 1. Remove comments (-- ...)
  // 2. Split on semicolons that are NOT inside a DELIMITER $$ block
  const statements: string[] = [];
  let insideProc = false;
  let current = '';

  for (const line of sql.split('\n')) {
    const trimmed = line.trim();

    if (trimmed.toUpperCase().startsWith('DELIMITER $$')) {
      insideProc = true;
      continue;
    }
    if (trimmed.toUpperCase().startsWith('DELIMITER ;')) {
      insideProc = false;
      continue;
    }
    if (trimmed.startsWith('--')) continue;

    if (insideProc) {
      // Inside a stored procedure — collect until a line ending with $$
      // (typically "END$$" — never a bare "$$" in practice)
      if (trimmed.endsWith('$$')) {
        const withoutDelim = line.replace(/\$\$\s*$/, '').trimEnd();
        if (withoutDelim.trim()) current += withoutDelim + '\n';
        if (current.trim()) statements.push(current.trim());
        current = '';
      } else {
        current += line + '\n';
      }
    } else {
      // Outside stored procedure — split on ;
      if (trimmed.endsWith(';')) {
        current += line;
        if (current.trim()) statements.push(current.trim());
        current = '';
      } else {
        current += line + '\n';
      }
    }
  }
  if (current.trim()) statements.push(current.trim());

  for (const stmt of statements) {
    const normalized = stmt.replace(/;$/, '').trim();
    if (!normalized) continue;
    try {
      await prisma.$executeRawUnsafe(normalized);
    } catch (error) {
      // Surface the error as a warning — don't crash the server if a migration
      // fails (e.g. DB user lacks DDL rights). The app will still start; HR can
      // run the SQL manually via database admin tools.
      logger.warn(
        { filename, error, statement: normalized.slice(0, 120) },
        '[startup-migration] Statement failed (non-fatal)'
      );
    }
  }
}

export async function runStartupMigrations(): Promise<void> {
  for (const filename of STARTUP_MIGRATIONS) {
    try {
      logger.info({ filename }, '[startup-migration] Running migration');
      await runMigrationFile(filename);
      logger.info({ filename }, '[startup-migration] Migration complete');
    } catch (error) {
      logger.warn({ filename, error }, '[startup-migration] Migration failed (non-fatal)');
    }
  }
}
