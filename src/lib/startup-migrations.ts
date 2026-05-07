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

  // ── Payroll leave/violation deductions (19.3.0) ───────────────────────────
  'add_payroll_leave_violation_deductions.sql',

  // ── Loan payments (19.3.0) ────────────────────────────────────────────────
  'add_loan_payments.sql',

  // ── Extended Dolibarr employee fields (19.5.0) ───────────────────────────
  'add_employee_dolibarr_fields.sql',

  // ── WorkUnit type expansion (19.6.1) ─────────────────────────────────────
  'add_work_unit_types.sql',

  // ── HR Policies, Onboarding Tasks, Training Programs (19.13.0) ───────────
  'add_hr_policies_onboarding_training.sql',

  // ── Multi-template Onboarding Checklists (19.13.0) ────────────────────────
  'add_hr_onboarding_checklists.sql',

  // ── Letter bilingual content + CEO signature (19.15.1) ───────────────────
  'add_letter_bilingual_ceo_sig.sql',

  // ── Letter templates + Circulations (19.16.0) ────────────────────────────
  'add_hr_letter_templates_circulations.sql',

  // ── HR Policy attachment + seed policies (19.17.0) ──────────────────────
  'add_hr_policy_attachment.sql',

  // ── Training program file attachments (19.17.1) ──────────────────────────
  'add_training_attachments.sql',

  // ── Business Development module (20.0.0) ─────────────────────────────────
  'add_business_development.sql',

  // ── Payroll entitlements: annual leave allowance, ticket, visa (20.1.0) ──
  'add_payroll_entitlements.sql',

  // ── Workflow Engine (21.0.0) ──────────────────────────────────────────────
  'add_workflow_engine.sql',

  // ── Loan approval workflow + PENDING_APPROVAL status (21.1.0) ────────────
  'loan_approval_workflow.sql',

  // ── BD vendor portal fields: vendorId, portalUsername, portalPassword (21.2.0) ─
  'bd_vendor_fields.sql',

  // ── IMS module: 12 new models for ISO 9001/14001/45001 (22.0.0) ──────────
  'add_ims_module.sql',

  // ── IMS seed: categories, ISO clauses, workflow definitions (22.0.0) ─────
  'seed_ims_data.sql',

  // ── PO–Invoice linkage column on fin_supplier_invoices (22.5.x) ──────────
  'add_linked_po_to_supplier_invoices.sql',

  // ── IMS Gap-Fill (22.2.0) — ISO §6.1.3 / §7.1.5 / §7.2 / §9.2 / §9.3 / §10.2 ──
  'add_ims_ncr_corrective_action.sql',  // Gap 6: CA workflow on NCR
  'add_ims_legal_register.sql',         // Gap 1: Legal & Regulatory Register
  'add_ims_management_review.sql',      // Gap 2: Management Review Report
  'add_ims_audit_tracker.sql',          // Gap 3: Internal Audit Tracker
  'add_ims_calibration.sql',            // Gap 4: Calibration Register (Asset ext.)
  'add_ims_competence_matrix.sql',      // Gap 5: Competence Matrix

  // ── Sprint 22.7.0 — New Forms (FRM-002/003/005/016/017/022/024/025/026) ──
  'add_ims_qms_processes.sql',          // FRM-002/004: QMS Process List
  'add_sc_approved_suppliers.sql',      // FRM-003: Approved Supplier List
  'add_hr_training_needs.sql',          // FRM-005: Training Needs Analysis
  'add_project_kickoff.sql',            // FRM-016: Project Kickoff Checklist
  'add_qc_welder_qualification.sql',    // FRM-017: Welder Qualification (WQT)
  'add_qc_coating_inspection.sql',      // FRM-022: Coating Inspection (DFT)
  'add_ims_safety.sql',                 // FRM-024/025/026: Incidents, Drills, Toolbox Talks
  'seed_sprint_2270_data.sql',          // Demo seed data for all Sprint 22.7.0 tables

  // ── Sprint 22.8.0 — IMS PDF Downloads, Seeds & Global Search Expansion ───
  'seed_sprint_2280_data.sql',          // Audit Plans (AP-25/26), NCRs, Mgmt Reviews, Objectives 2026

  // ── Sprint 22.9.0 — IMS Rev.01 Risk Register + ISP document seeding ────
  'ims_rev01_schema.sql',               // IMS Rev.01 schema additions (§6.1.3, §7.1.5, §9.1.2)
  'seed_ims_rev01_risks.sql',           // RISK/HAZARD/LEGAL/ENV seeds + ISP document register
  'ims_management_review_iso_inputs.sql', // ISO §9.3.2 management review input fields

  // ── Multi-scope project wizard (22.13.0) ────────────────────────────────
  'add_scope_of_work.sql',              // ScopeOfWork + BuildingActivity tables, scopeOfWorkId on AssemblyPart
  'v22_13_scope_fields.sql',            // location on Building; quantity/specs/coating on ScopeOfWork
  'seed_steel_scope.sql',              // Backfill Steel scope for existing buildings + link AssemblyParts
  'v22_14_backfill_scope_quantity.sql', // Backfill steel scope quantity from building weight

  // ── Task scope column (22.15.0) ──────────────────────────────────────────
  'v22_15_task_scope.sql',              // scopeOfWorkId on Task; backfill steel scope for existing tasks

  // ── v23.0.0 — Subcontractor Contracts Module ──────────────────────────────
  'v23_0_subcontractor_contracts.sql',  // SubcontractorContract + SubcontractorPaymentCertificate tables
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
