/**
 * Startup Migrations
 * Runs idempotent SQL migrations on server start.
 * Safe to run multiple times — each migration uses IF NOT EXISTS guards.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import mysql from 'mysql2/promise';
import { env } from '@/lib/env';
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
  'add_lcr_min_project_number.sql',
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
  'migrate_trade_to_occupation.sql',    // 18.7.0: backfill trade→occupation, drop trade column

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
  'add_employee_gender.sql',            // gender column synced from Dolibarr

  // ── WorkUnit type expansion (19.6.1) ─────────────────────────────────────
  'add_work_unit_types.sql',

  // ── HR Policies, Onboarding Tasks, Training Programs (19.13.0) ───────────
  'add_hr_policies_onboarding_training.sql',

  // ── Multi-template Onboarding Checklists (19.13.0) ───────────────────────
  'add_hr_onboarding_checklists.sql',

  // ── Letter bilingual content + CEO signature (19.15.1) ───────────────────
  'add_letter_bilingual_ceo_sig.sql',

  // ── Letter templates + Circulations (19.16.0) ────────────────────────────
  'add_hr_letter_templates_circulations.sql',

  // ── HR Policy attachment + seed policies (19.17.0) ──────────────────────
  'add_hr_policy_attachment.sql',
  'add_letter_purpose.sql',             // purpose column for salary certificates etc.
  'add_letter_cancelled_status.sql',    // CANCELLED status on HrLetterStatus enum

  // ── Training program file attachments (19.17.1) ──────────────────────────
  'add_training_attachments.sql',

  // ── Business Development module (20.0.0) ─────────────────────────────────
  'add_business_development.sql',
  'bd_document_attachments.sql',        // 22.2.0: attachments JSON on BdDocument

  // ── Payroll entitlements: annual leave allowance, ticket, visa (20.1.0) ──
  'add_payroll_entitlements.sql',

  // ── Workflow Engine (21.0.0) ──────────────────────────────────────────────
  'add_workflow_engine.sql',
  'fix_workflow_step_fk_cascade.sql',   // RESTRICT→CASCADE on WorkflowStepInstance.stepId FK

  // ── Loan approval workflow + PENDING_APPROVAL status (21.1.0) ────────────
  'loan_approval_workflow.sql',

  // ── BD vendor portal fields: vendorId, portalUsername, portalPassword (21.2.0) ─
  'bd_vendor_fields.sql',

  // ── Meetings module (22.1.0) ──────────────────────────────────────────────
  'add_meetings_module.sql',
  'add_google_oauth_and_meeting_notifications.sql', // Google Calendar OAuth + meeting notification types

  // ── CEO Arena (22.3.0) ────────────────────────────────────────────────────
  'ceo_arena_notes.sql',

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
  'add_supplier_portal.sql',            // Supplier & Customer Portal (evaluations, payment terms)
  'add_supplier_portal_permissions.sql', // supply_chain.manage permission for admin + procurement roles

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

  // ── Task isCeoTask backfill (22.16.0) ────────────────────────────────────
  'v22_16_task_is_ceo_task_backfill.sql', // Ensure isCeoTask NOT NULL DEFAULT 0; backfill NULL rows to 0

  // ── Concentration Risk: Project Segment (22.x) ───────────────────────────
  'add_project_segment.sql',            // ProjectSegment table + segmentId on Project

  // ── System events repair ──────────────────────────────────────────────────
  'repair_system_events_table.sql',     // Fix SystemEvent→system_events table name + missing columns
  'fix_failed_enhance_system_events.sql', // Complete enhance_system_events migration (MySQL 5.7+ compatible)

  // ── v23.0.0 — Subcontractor Contracts Module ──────────────────────────────
  'v23_0_subcontractor_contracts.sql',  // SubcontractorContract + SubcontractorPaymentCertificate tables

  // ── v23.0.1 — Activity name unification ───────────────────────────────────
  'v23_0_1_unify_activity_names.sql',   // Rename dispatch→delivery in BuildingActivity; delivery_logistics→delivery in Task

  // ── v23.1.0 — Fix steel-scope BuildingActivity records ────────────────────
  'v23_1_fix_steel_scope_activities.sql', // Set all steel-scope activities to isApplicable=1; insert missing rows
  'v23_2_seed_assembly_part_steel_scope.sql', // Backfill AssemblyPart.scopeOfWorkId to steel scope

  // ── v23.1.1 — Backlog card improvements ──────────────────────────────────
  'v23_1_backlog_improvements.sql',     // backlogCeoNotify on system_settings; inProgressById/At on ProductBacklogItem

  // ── v23.2.0 — HR Monthly Reports ─────────────────────────────────────────
  'v23_2_hr_monthly_reports.sql',       // HrMonthlyReport table for auto-generated PDF reports

  // ── v23.3.0 — Department hierarchy ──────────────────────────────────────
  'v23_3_department_parent_hierarchy.sql', // parentId self-reference on Department for nested structure

  // ── v23.4.0 — Client + Credit limit history ──────────────────────────────
  'v23_4_client_dolibarr_link.sql',     // Link OTS Client records to Dolibarr third-party customers
  'v23_4_credit_limit_history.sql',     // Credit limit audit history for suppliers and customers

  // ── v23.5.0 — Supplier classification table ───────────────────────────────
  'v23_5_fin_supplier_classification.sql', // Ensure fin_supplier_classification exists for supplier list JOIN

  // ── v24.0.0 — IMS Non-Product NCR (QA NCR) ───────────────────────────────
  'v24_0_ims_ncr.sql',                   // ImsNcr table (HEXA-FRM-023, ISO §10.2)

  // ── v24.2.0 — Audit Tracker Rebuild ──────────────────────────────────────
  'v24_2_audit_tracker_rebuild.sql',     // FRM-024/025/026 tables + ImsAudit column expansion

  // ── v24.3.0 — IMS Data Seed (Checklist Library, 2026 Audits, OFI, CAR, Calibration)
  'v24_3_seed_ims_audit_data.sql',       // Comprehensive seed: 80+ checklist questions, 2026 audit data, OFI/CAR records, calibration assets

  // ── v24.5.0 — Supplier COA default table ─────────────────────────────────
  'v24_5_fin_supplier_coa_default.sql',  // Ensure fin_supplier_coa_default exists (fixes "Supplier not found")

  // ── v24.6.0 — Subcontractor payment certificate delete reason ─────────────
  'v24_6_sc_cert_delete_reason.sql',     // deleteReason column on SubcontractorPaymentCertificate

  // ── v24.7.0 — VAT payment records ────────────────────────────────────────
  'v24_7_fin_vat_payments.sql',          // fin_vat_payments table for ZATCA settlement tracking

  // ── v25.1.0 — Bank transactions + VAT sync columns ───────────────────────
  'v25_1_fin_bank_transactions_and_vat_sync.sql', // fin_bank_transactions table; dolibarr_id/source/sync_hash on fin_vat_payments

  // ── v26.0.0 — Project wizard: coating systems, setup checklist, validation ─
  'add_project_coating_systems.sql',  // ProjectCoatingSystem + ProjectCoatingSystemBuilding tables
  'add_project_setup_checklist.sql',  // ProjectSetupChecklist table (wizard kickoff Q&A)
  'v26_0_project_validation.sql',     // operationsManagerId on Project; ProjectValidation table; notification enum update

  // ── v27.0.0 — Verification step notes & per-party status ────────────────
  'v27_0_validation_step_notes.sql',  // stepNotes + status columns on ProjectValidation

  // ── Project wizard: arch drawings received flag on Building ───────────────
  'add_building_arch_drawings.sql',   // archDrawingsReceived BOOLEAN on Building

  // ── v28.0.0 — MIR status backfill ────────────────────────────────────────
  'v28_0_mir_status_backfill.sql',    // Backfill status field on existing MIR records

  // ── v29.0.0 — MIR Workflow (Inspector → Reviewer → Approver) ─────────────
  'v29_0_mir_workflow.sql',           // workflow_status + submission/review/approval timestamps on MIR

  // ── v30.0.0 — MIR global serial ───────────────────────────────────────────
  'v30_0_mir_global_serial.sql',      // Global receipt number serial (no monthly reset)

  // ── v31.0.0 — SC contract PO link ─────────────────────────────────────────
  'v31_0_sc_contract_po_link.sql',    // dolibarr_po_id on SubcontractorContract

  // ── v32.0.0 — MIR workflow notifications + shipment evaluation bank ────────
  'v32_0_mir_workflow_and_evaluation.sql', // dolibarr_soc_id on MIR; mir_shipment_evaluations table; MIR_INSPECTION workflow definition

  // ── v33.0.0 — MIR backfill: dolibarr_soc_id + workflow_status ────────────
  'v33_0_mir_backfill_soc_id_and_workflow.sql',

  // ── v34.0.0 — MIR: planned_delivery_date from Dolibarr PO ────────────────
  'v34_0_mir_planned_delivery_date.sql',

  // ── v35.0.0 — Integrity Reports table ────────────────────────────────────
  'v35_0_integrity_reports.sql',

  // ── v36.0.0 — INV: Warehouse, Location, Item, Stock Balance, Ledger, MIR-Out, Return, Adjustment ──
  'v36_0_inv_warehouse_management.sql',

  // ── v36.1 — Material Master Enrichment (dolibarr_products columns) ────────
  'v36_1_material_master_enrichment.sql',

  // ── v37.0.0 — INV MIR-Out: handedToId column ─────────────────────────────
  'v37_0_inv_handed_to.sql',

  // ── v38.0.0 — Material Master fixes: reviewed_by type fix + dolibarr_id on inv_items ──
  'v38_0_material_master_fixes.sql',

  // ── v39.0.0 — Re-ensure dolibarr_id on inv_items (v38 may have been tracked but not applied) ──
  'v39_0_ensure_inv_items_dolibarr_id.sql',

  // ── v40.0.0 — MIR target_site_id + dolibarr_products default_wh_type ────────
  'v40_0_mir_target_site_and_wh_type.sql',

  // ── v41.0.0 — INV: Sites table (factory/site canonical source) ───────────────
  'v41_0_inv_sites.sql',

  // ── v42.0.0 — INV: Site source-code aliases for MIR routing ──────────────────
  'v42_0_inv_site_source_codes.sql',

  // ── v43.0.0 — INV: Rename PLATE→SHEET category; backfill from dolibarr_products ──
  'v43_0_plate_to_sheet_and_category_fix.sql',

  // ── v44.0.0 — MIR: quarantine_qty + unit_price on receipt items ──────────────
  'v44_0_mir_quarantine_unit_price.sql',

  // ── v44.1.0 — INV: reference_no on inv_stock_ledger ─────────────────────────
  'v44_1_inv_ledger_reference_no.sql',

  // ── v44.1.1 — INV: unit_cost + total_cost on inv_stock_ledger ────────────────
  'v44_1_inv_ledger_cost.sql',

  // ── v44.2.0 — INV: repair unit_cost + total_cost (v44.1.1 tracked-but-failed) ─
  'v44_2_inv_ledger_cost_repair.sql',

  // ── v45.0.0 — Saudi Labor Law unauthorized-absence alerts (OTS-BL-080) ──────
  'v45_0_employee_absence_alerts.sql',  // EmployeeAbsenceAlert table (consecutive/intermittent ANP escalation)

  // ── v45.1.0 — Un-private tasks orphaned by deactivated users ─────────────
  'v45_1_unprivate_inactive_user_tasks.sql', // Clear isPrivate=1 where both creator and assignee are inactive
];

/**
 * Parse a Prisma-style MySQL connection URL into mysql2 connection options.
 */
function parseMysqlUrl(url: string): mysql.ConnectionOptions {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: parseInt(parsed.port, 10) || 3306,
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.replace(/^\//, ''),
    ssl:
      parsed.searchParams.get('sslmode') === 'require' ||
      parsed.searchParams.get('ssl') === 'true'
        ? { rejectUnauthorized: false }
        : undefined,
    multipleStatements: false,
  };
}

/**
 * Split raw SQL into individual statements, respecting DELIMITER changes.
 * DELIMITER is a client-side command; we strip it and use the active
 * delimiter to detect statement boundaries.  This allows stored procedures
 * and other DDL that contains semicolons inside BEGIN…END blocks.
 */
function splitStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = '';
  let delimiter = ';';

  for (const rawLine of sql.split('\n')) {
    const line = rawLine.replace(/\r$/, ''); // normalise CRLF
    const trimmed = line.trim();

    if (trimmed.toUpperCase().startsWith('DELIMITER ')) {
      // Flush anything accumulated before the delimiter changes
      if (current.trim()) {
        statements.push(current.trim());
        current = '';
      }
      delimiter = trimmed.substring('DELIMITER '.length).trim();
      continue;
    }

    if (trimmed.startsWith('--')) continue;

    // Detect statement end: line ends with the current delimiter
    if (trimmed.endsWith(delimiter)) {
      const endPos = line.lastIndexOf(delimiter);
      const withoutDelim = line.substring(0, endPos).trimEnd();
      if (withoutDelim.trim()) {
        current += withoutDelim + '\n';
      }
      if (current.trim()) {
        statements.push(current.trim());
      }
      current = '';
    } else {
      current += line + '\n';
    }
  }

  if (current.trim()) {
    statements.push(current.trim());
  }

  return statements;
}

const TRACKING_TABLE = '_startup_migrations';

/**
 * Execute a single migration file using an existing mysql2 connection.
 */
async function runMigrationFile(filename: string, conn: mysql.Connection): Promise<void> {
  const filePath = join(MIGRATIONS_DIR, filename);
  let sql: string;

  try {
    sql = readFileSync(filePath, 'utf-8');
  } catch {
    logger.warn({ filename }, '[startup-migration] File not found, skipping');
    return;
  }

  for (const stmt of splitStatements(sql)) {
    const normalized = stmt.replace(/;$/, '').trim();
    if (!normalized) continue;

    try {
      await conn.query(normalized);
    } catch (error) {
      logger.warn(
        { filename, error, statement: normalized.slice(0, 120) },
        '[startup-migration] Statement failed (non-fatal)'
      );
    }
  }
}

export async function runStartupMigrations(): Promise<void> {
  const conn = await mysql.createConnection(parseMysqlUrl(env.DATABASE_URL));

  try {
    // Ensure the tracking table exists so we can skip already-applied migrations.
    await conn.query(`
      CREATE TABLE IF NOT EXISTS \`${TRACKING_TABLE}\` (
        \`filename\` VARCHAR(255) NOT NULL,
        \`applied_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`filename\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    for (const filename of STARTUP_MIGRATIONS) {
      try {
        // Skip migrations that have already been applied.
        const [rows] = await conn.query(
          `SELECT 1 FROM \`${TRACKING_TABLE}\` WHERE filename = ? LIMIT 1`,
          [filename]
        );
        if ((rows as unknown[]).length > 0) continue;

        logger.info({ filename }, '[startup-migration] Running migration');
        await runMigrationFile(filename, conn);

        await conn.query(
          `INSERT IGNORE INTO \`${TRACKING_TABLE}\` (filename) VALUES (?)`,
          [filename]
        );
        logger.info({ filename }, '[startup-migration] Migration complete');
      } catch (error) {
        logger.warn({ filename, error }, '[startup-migration] Migration failed (non-fatal)');
      }
    }
  } finally {
    await conn.end();
  }
}
