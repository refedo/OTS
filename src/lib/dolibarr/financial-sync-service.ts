/**
 * Financial Sync Service
 * 
 * Syncs financial data (invoices, payments, bank accounts) from Dolibarr
 * and auto-generates double-entry journal entries for reporting.
 * 
 * CRITICAL: Dolibarr dates are Unix timestamps in SECONDS (not ms).
 * All numeric fields come as strings from the API.
 */

import { createHash } from 'crypto';
import prisma from '@/lib/db';
import {
  DolibarrClient,
  DolibarrInvoice,
  DolibarrSupplierInvoice,
  DolibarrPayment,
  DolibarrBankAccount,
  DolibarrSalary,
  DolibarrProject,
  createDolibarrClient,
} from './dolibarr-client';

// ============================================
// TYPES
// ============================================

export interface FinSyncResult {
  entityType: string;
  status: 'success' | 'error' | 'partial';
  created: number;
  updated: number;
  unchanged: number;
  total: number;
  durationMs: number;
  error?: string;
}

export interface FullFinSyncResult {
  bankAccounts?: FinSyncResult;
  projects?: FinSyncResult;
  customerInvoices?: FinSyncResult;
  customerPayments?: FinSyncResult;
  supplierInvoices?: FinSyncResult;
  supplierPayments?: FinSyncResult;
  salaries?: FinSyncResult;
  journalEntries?: FinSyncResult;
  totalDurationMs: number;
}

// ============================================
// HELPERS
// ============================================

function parseDolibarrDate(timestamp: number | string | null | undefined): Date | null {
  if (!timestamp) return null;
  const ts = typeof timestamp === 'string' ? parseInt(timestamp, 10) : timestamp;
  if (isNaN(ts) || ts === 0) return null;
  return new Date(ts * 1000);
}

function parseDateString(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

function pf(val: string | number | null | undefined): number {
  if (val === null || val === undefined || val === '') return 0;
  const n = parseFloat(String(val));
  return isNaN(n) ? 0 : n;
}

function pi(val: string | number | null | undefined): number {
  if (val === null || val === undefined || val === '') return 0;
  const n = parseInt(String(val), 10);
  return isNaN(n) ? 0 : n;
}

function computeHash(fields: Record<string, any>): string {
  const str = JSON.stringify(fields, Object.keys(fields).sort());
  return createHash('md5').update(str).digest('hex');
}

function formatDate(date: Date | null): string | null {
  if (!date) return null;
  return date.toISOString().slice(0, 10); // YYYY-MM-DD
}

function formatDateTime(date: Date | null): string | null {
  if (!date) return null;
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

// ============================================
// SYNC LOCK (prevents concurrent syncs)
// ============================================

let _isSyncing = false;
let _syncStartedAt: number | null = null;
const SYNC_TIMEOUT_MS = 2 * 60 * 60 * 1000; // 2 hours max

function acquireSyncLock(): boolean {
  // If a sync is running but has been going for too long, force release
  if (_isSyncing && _syncStartedAt && (Date.now() - _syncStartedAt > SYNC_TIMEOUT_MS)) {
    console.warn('[FinSync] Previous sync timed out after 2 hours — force releasing lock');
    _isSyncing = false;
    _syncStartedAt = null;
  }
  if (_isSyncing) return false;
  _isSyncing = true;
  _syncStartedAt = Date.now();
  return true;
}

function releaseSyncLock(): void {
  _isSyncing = false;
  _syncStartedAt = null;
}

export function isSyncRunning(): boolean {
  return _isSyncing;
}

// ============================================
// FINANCIAL SYNC SERVICE
// ============================================

export class FinancialSyncService {
  private client: DolibarrClient;

  constructor(client?: DolibarrClient) {
    this.client = client || createDolibarrClient();
  }

  // ---- Config helpers ----

  private async getConfig(key: string, defaultValue: string = ''): Promise<string> {
    try {
      const rows: any[] = await prisma.$queryRawUnsafe(
        `SELECT config_value FROM fin_config WHERE config_key = ?`, key
      );
      return rows.length > 0 && rows[0].config_value ? rows[0].config_value : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  private async setConfig(key: string, value: string): Promise<void> {
    try {
      await prisma.$executeRawUnsafe(
        `INSERT INTO fin_config (config_key, config_value) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE config_value = ?, updated_at = NOW()`,
        key, value, value
      );
    } catch (e: any) {
      console.error(`[FinSync] Failed to set config ${key}:`, e.message);
    }
  }

  private async logSync(result: FinSyncResult, triggeredBy: string): Promise<void> {
    try {
      await prisma.$executeRawUnsafe(
        `INSERT INTO fin_sync_log (entity_type, status, records_created, records_updated, records_unchanged, records_total, duration_ms, error_message, triggered_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        result.entityType, result.status,
        result.created, result.updated, result.unchanged, result.total,
        result.durationMs, result.error || null, triggeredBy
      );
    } catch (e: any) {
      console.error('[FinSync] Failed to log sync result:', e.message);
    }
  }

  // ============================================
  // SYNC: BANK ACCOUNTS
  // ============================================

  async syncBankAccounts(triggeredBy: string = 'manual'): Promise<FinSyncResult> {
    const startTime = Date.now();
    let created = 0, updated = 0, unchanged = 0;

    try {
      const accounts = await this.client.getBankAccounts();

      for (const acct of accounts) {
        const dolibarrId = pi(acct.id);
        if (!dolibarrId) continue;

        const hashFields = { ref: acct.ref, label: acct.label, balance: acct.balance, clos: acct.clos };
        const newHash = computeHash(hashFields);

        const existing: any[] = await prisma.$queryRawUnsafe(
          `SELECT sync_hash FROM fin_bank_accounts WHERE dolibarr_id = ?`, dolibarrId
        );

        if (existing.length > 0) {
          if (existing[0].sync_hash === newHash) { unchanged++; continue; }
          await prisma.$executeRawUnsafe(
            `UPDATE fin_bank_accounts SET ref=?, label=?, bank_name=?, account_number=?, iban=?, bic=?,
             currency_code=?, balance=?, accounting_journal=?, is_open=?, last_synced_at=NOW(), sync_hash=?
             WHERE dolibarr_id=?`,
            acct.ref, acct.label, acct.bank, acct.account_number, acct.iban, acct.bic,
            acct.currency_code || 'SAR', pf(acct.balance), acct.accountancy_journal,
            acct.clos === '0' ? 1 : 0, newHash, dolibarrId
          );
          updated++;
        } else {
          await prisma.$executeRawUnsafe(
            `INSERT INTO fin_bank_accounts (dolibarr_id, ref, label, bank_name, account_number, iban, bic,
             currency_code, balance, accounting_journal, is_open, first_synced_at, last_synced_at, sync_hash)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), ?)`,
            dolibarrId, acct.ref, acct.label, acct.bank, acct.account_number, acct.iban, acct.bic,
            acct.currency_code || 'SAR', pf(acct.balance), acct.accountancy_journal,
            acct.clos === '0' ? 1 : 0, newHash
          );
          created++;
        }
      }

      const result: FinSyncResult = {
        entityType: 'bank_accounts', status: 'success',
        created, updated, unchanged, total: accounts.length,
        durationMs: Date.now() - startTime,
      };
      await this.logSync(result, triggeredBy);
      return result;
    } catch (error: any) {
      const result: FinSyncResult = {
        entityType: 'bank_accounts', status: 'error',
        created, updated, unchanged, total: 0,
        durationMs: Date.now() - startTime, error: error.message,
      };
      await this.logSync(result, triggeredBy);
      return result;
    }
  }

  // ============================================
  // SYNC: PROJECTS
  // ============================================

  async syncProjects(triggeredBy: string = 'manual'): Promise<FinSyncResult> {
    const startTime = Date.now();
    let created = 0, updated = 0, unchanged = 0, total = 0;

    try {
      const projects = await this.client.getAllProjects(100);
      total = projects.length;

      for (const proj of projects) {
        const dolibarrId = pi(proj.id);
        if (!dolibarrId) continue;

        // Dolibarr API may return socid/statut instead of fk_soc/fk_statut
        const raw = proj as any;
        const socId = pi(proj.fk_soc) || pi(raw.socid) || pi(raw.thirdparty_id) || 0;
        const statut = pi(proj.fk_statut) || pi(raw.statut) || pi(raw.status) || 0;
        const oppStatus = pi(proj.fk_opp_status) || pi(raw.opp_status) || 0;

        const hashFields = {
          ref: proj.ref, title: proj.title, fk_soc: socId,
          fk_statut: statut, budget_amount: proj.budget_amount,
          opp_amount: proj.opp_amount, date_start: proj.date_start, date_end: proj.date_end,
        };
        const newHash = computeHash(hashFields);

        const dateStart = formatDate(parseDolibarrDate(proj.date_start));
        const dateEnd = formatDate(parseDolibarrDate(proj.date_end));
        const dateClose = formatDate(parseDolibarrDate(proj.date_close));

        const existing: any[] = await prisma.$queryRawUnsafe(
          `SELECT sync_hash FROM dolibarr_projects WHERE dolibarr_id = ?`, dolibarrId
        );

        if (existing.length > 0) {
          if (existing[0].sync_hash === newHash) { unchanged++; continue; }
          await prisma.$executeRawUnsafe(
            `UPDATE dolibarr_projects SET ref=?, title=?, description=?, fk_soc=?,
             fk_opp_status=?, opp_amount=?, budget_amount=?, date_start=?, date_end=?, date_close=?,
             fk_statut=?, public=?, note_public=?, note_private=?, array_options=?,
             last_synced_at=NOW(), sync_hash=?, is_active=1
             WHERE dolibarr_id=?`,
            proj.ref, proj.title, proj.description || null, socId,
            oppStatus, pf(proj.opp_amount), pf(proj.budget_amount),
            dateStart, dateEnd, dateClose,
            statut, pi(raw.public ?? proj.public), proj.note_public || null, proj.note_private || null,
            proj.array_options ? JSON.stringify(proj.array_options) : null,
            newHash, dolibarrId
          );
          updated++;
        } else {
          await prisma.$executeRawUnsafe(
            `INSERT INTO dolibarr_projects (dolibarr_id, ref, title, description, fk_soc,
             fk_opp_status, opp_amount, budget_amount, date_start, date_end, date_close,
             fk_statut, public, note_public, note_private, array_options,
             first_synced_at, last_synced_at, sync_hash, is_active)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), ?, 1)`,
            dolibarrId, proj.ref, proj.title, proj.description || null, socId,
            oppStatus, pf(proj.opp_amount), pf(proj.budget_amount),
            dateStart, dateEnd, dateClose,
            statut, pi(raw.public ?? proj.public), proj.note_public || null, proj.note_private || null,
            proj.array_options ? JSON.stringify(proj.array_options) : null,
            newHash
          );
          created++;
        }
      }

      console.log(`[FinSync] Projects complete: ${total} total, ${created} created, ${updated} updated, ${unchanged} unchanged`);

      const result: FinSyncResult = {
        entityType: 'projects', status: 'success',
        created, updated, unchanged, total,
        durationMs: Date.now() - startTime,
      };
      await this.logSync(result, triggeredBy);
      return result;
    } catch (error: any) {
      console.error('[FinSync] Projects sync failed:', error.message);
      const result: FinSyncResult = {
        entityType: 'projects', status: 'error',
        created, updated, unchanged, total: 0,
        durationMs: Date.now() - startTime, error: error.message,
      };
      await this.logSync(result, triggeredBy);
      return result;
    }
  }

  // ============================================
  // SYNC: CUSTOMER INVOICES
  // ============================================

  async syncCustomerInvoices(triggeredBy: string = 'manual'): Promise<{ invoiceResult: FinSyncResult; paymentResult: FinSyncResult }> {
    const startTime = Date.now();
    let created = 0, updated = 0, unchanged = 0;
    let paymentsCreated = 0, paymentsUpdated = 0, paymentsTotal = 0;
    let totalInvoices = 0;

    try {
      // Process in paginated batches to avoid loading all invoices into memory
      const BATCH_SIZE = 500;
      let page = 0;
      let hasMore = true;

      while (hasMore) {
        console.log(`[FinSync] Fetching customer invoices page ${page} (batch ${BATCH_SIZE})...`);
        const batch = await this.client.getInvoices({ limit: BATCH_SIZE, page });
        console.log(`[FinSync] Got ${batch.length} customer invoices (page ${page})`);

        for (const inv of batch) {
          totalInvoices++;
          if (totalInvoices % 200 === 0) {
            console.log(`[FinSync] Processing customer invoice ${totalInvoices}...`);
          }
          const dolibarrId = pi(inv.id);
          if (!dolibarrId) continue;

          const fkProjet = pi(inv.fk_project || inv.fk_projet);

          const hashFields = {
            ref: inv.ref, status: inv.statut || inv.status, paye: inv.paye,
            total_ht: inv.total_ht, total_tva: inv.total_tva, total_ttc: inv.total_ttc,
            date_echeance: inv.date_echeance, fk_project: fkProjet || null,
          };
          const newHash = computeHash(hashFields);

          const invoiceDate = formatDate(parseDolibarrDate(inv.date_validation || inv.date || inv.date_creation));
          const dueDate = formatDate(parseDolibarrDate(inv.date_echeance));
          const creationDate = formatDateTime(parseDolibarrDate(inv.date_creation));

          const existing: any[] = await prisma.$queryRawUnsafe(
            `SELECT sync_hash FROM fin_customer_invoices WHERE dolibarr_id = ?`, dolibarrId
          );

          const rawJson = JSON.stringify(inv);
          if (existing.length > 0) {
            if (existing[0].sync_hash === newHash) { unchanged++; }
            else {
              await prisma.$executeRawUnsafe(
                `UPDATE fin_customer_invoices SET ref=?, ref_client=?, socid=?, fk_projet=?, type=?, status=?, is_paid=?,
                 total_ht=?, total_tva=?, total_ttc=?, date_invoice=?, date_due=?, date_creation=?,
                 dolibarr_raw=?, last_synced_at=NOW(), sync_hash=?, is_active=1
                 WHERE dolibarr_id=?`,
                inv.ref, inv.ref_client, pi(inv.socid), fkProjet || null, pi(inv.type),
                pi(inv.statut || inv.status), inv.paye === '1' ? 1 : 0,
                pf(inv.total_ht), pf(inv.total_tva), pf(inv.total_ttc),
                invoiceDate, dueDate, creationDate, rawJson, newHash, dolibarrId
              );
              updated++;
            }
          } else {
            await prisma.$executeRawUnsafe(
              `INSERT INTO fin_customer_invoices (dolibarr_id, ref, ref_client, socid, fk_projet, type, status, is_paid,
               total_ht, total_tva, total_ttc, date_invoice, date_due, date_creation, dolibarr_raw,
               first_synced_at, last_synced_at, sync_hash, is_active)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), ?, 1)`,
              dolibarrId, inv.ref, inv.ref_client, pi(inv.socid), fkProjet || null, pi(inv.type),
              pi(inv.statut || inv.status), inv.paye === '1' ? 1 : 0,
              pf(inv.total_ht), pf(inv.total_tva), pf(inv.total_ttc),
              invoiceDate, dueDate, creationDate, rawJson, newHash
            );
            created++;
          }

          // Sync invoice lines — delete and re-insert
          await prisma.$executeRawUnsafe(
            `DELETE FROM fin_customer_invoice_lines WHERE invoice_dolibarr_id = ?`, dolibarrId
          );
          if (inv.lines && Array.isArray(inv.lines)) {
            for (const line of inv.lines) {
              await prisma.$executeRawUnsafe(
                `INSERT INTO fin_customer_invoice_lines (invoice_dolibarr_id, line_id, fk_product, product_ref,
                 product_label, qty, unit_price_ht, vat_rate, total_ht, total_tva, total_ttc, accounting_code)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                dolibarrId, pi(line.rowid), pi(line.fk_product),
                line.product_ref || null, line.product_label || line.label || null,
                pf(line.qty), pf(line.subprice), pf(line.tva_tx),
                pf(line.total_ht), pf(line.total_tva), pf(line.total_ttc),
                line.fk_accounting_account ? String(line.fk_accounting_account) : null
              );
            }
          }

          // Sync payments for this invoice
          try {
            const payments = await this.client.getInvoicePayments(dolibarrId);
            for (const pmt of payments) {
              paymentsTotal++;
              const pmtDate = formatDate(parseDateString(pmt.date));
              if (!pmtDate) continue;

              const existingPmt: any[] = await prisma.$queryRawUnsafe(
                `SELECT id FROM fin_payments WHERE dolibarr_ref = ? AND payment_type = 'customer' AND invoice_dolibarr_id = ?`,
                pmt.ref || `PAY-${dolibarrId}`, dolibarrId
              );

              if (existingPmt.length > 0) {
                await prisma.$executeRawUnsafe(
                  `UPDATE fin_payments SET amount=?, payment_date=?, payment_method=?, fk_bank_line=?,
                   bank_account_id=?, last_synced_at=NOW() WHERE id=?`,
                  pf(pmt.amount), pmtDate, pmt.type || null,
                  pi(pmt.fk_bank_line), pi(pmt.fk_bank_account), existingPmt[0].id
                );
                paymentsUpdated++;
              } else {
                await prisma.$executeRawUnsafe(
                  `INSERT INTO fin_payments (dolibarr_ref, payment_type, invoice_dolibarr_id, amount,
                   payment_date, payment_method, fk_bank_line, bank_account_id, first_synced_at, last_synced_at)
                   VALUES (?, 'customer', ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
                  pmt.ref || `PAY-${dolibarrId}`, dolibarrId, pf(pmt.amount), pmtDate,
                  pmt.type || null, pi(pmt.fk_bank_line), pi(pmt.fk_bank_account)
                );
                paymentsCreated++;
              }
            }
          } catch (e: any) {
            console.error(`[FinSync] Error fetching payments for invoice ${dolibarrId}:`, e.message);
          }
        }

        hasMore = batch.length >= BATCH_SIZE;
        page++;
      }

      console.log(`[FinSync] Customer invoices complete: ${totalInvoices} total, ${created} created, ${updated} updated, ${unchanged} unchanged`);

      const invoiceResult: FinSyncResult = {
        entityType: 'customer_invoices', status: 'success',
        created, updated, unchanged, total: totalInvoices,
        durationMs: Date.now() - startTime,
      };
      const paymentResult: FinSyncResult = {
        entityType: 'customer_payments', status: 'success',
        created: paymentsCreated, updated: paymentsUpdated, unchanged: 0,
        total: paymentsTotal, durationMs: Date.now() - startTime,
      };
      await this.logSync(invoiceResult, triggeredBy);
      await this.logSync(paymentResult, triggeredBy);
      return { invoiceResult, paymentResult };
    } catch (error: any) {
      const invoiceResult: FinSyncResult = {
        entityType: 'customer_invoices', status: 'error',
        created, updated, unchanged, total: 0,
        durationMs: Date.now() - startTime, error: error.message,
      };
      await this.logSync(invoiceResult, triggeredBy);
      return { invoiceResult, paymentResult: { ...invoiceResult, entityType: 'customer_payments' } };
    }
  }

  // ============================================
  // SYNC: SUPPLIER INVOICES
  // ============================================

  async syncSupplierInvoices(triggeredBy: string = 'manual'): Promise<{ invoiceResult: FinSyncResult; paymentResult: FinSyncResult }> {
    const startTime = Date.now();
    let created = 0, updated = 0, unchanged = 0;
    let paymentsCreated = 0, paymentsUpdated = 0, paymentsTotal = 0;
    let totalInvoices = 0;

    try {
      // Process in paginated batches to avoid loading all invoices into memory
      const BATCH_SIZE = 500;
      let page = 0;
      let hasMore = true;

      while (hasMore) {
        console.log(`[FinSync] Fetching supplier invoices page ${page} (batch ${BATCH_SIZE})...`);
        const batch = await this.client.getSupplierInvoices({ limit: BATCH_SIZE, page });
        console.log(`[FinSync] Got ${batch.length} supplier invoices (page ${page})`);

        // Collect all invoice IDs to check which exist
        const invoiceIds = batch.map(inv => pi(inv.id)).filter(Boolean) as number[];
        const existingMap = new Map<number, string>();
        
        if (invoiceIds.length > 0) {
          const existing: any[] = await prisma.$queryRawUnsafe(
            `SELECT dolibarr_id, sync_hash FROM fin_supplier_invoices WHERE dolibarr_id IN (${invoiceIds.join(',')})`
          );
          existing.forEach((row: any) => existingMap.set(row.dolibarr_id, row.sync_hash));
        }

        // Process each invoice in the batch (still one-by-one but with optimized queries)
        for (const inv of batch) {
          totalInvoices++;
          if (totalInvoices % 500 === 0) {
            console.log(`[FinSync] Processing supplier invoice ${totalInvoices}...`);
          }
          const dolibarrId = pi(inv.id);
          if (!dolibarrId) continue;

          const fkProjet = pi(inv.fk_project || inv.fk_projet);

          const hashFields = {
            ref: inv.ref, status: inv.statut || inv.status, paye: inv.paye || inv.paid,
            total_ht: inv.total_ht, total_tva: inv.total_tva, total_ttc: inv.total_ttc,
            date_echeance: inv.date_echeance, fk_project: fkProjet || null,
          };
          const newHash = computeHash(hashFields);

          // Check if unchanged
          if (existingMap.has(dolibarrId) && existingMap.get(dolibarrId) === newHash) {
            unchanged++;
            continue;
          }

          const invoiceDate = formatDate(parseDolibarrDate(inv.date_validation || inv.date || inv.date_creation));
          const dueDate = formatDate(parseDolibarrDate(inv.date_echeance));
          const creationDate = formatDateTime(parseDolibarrDate(inv.date_creation));
          const isNew = !existingMap.has(dolibarrId);
          if (isNew) created++; else updated++;

          // Use INSERT...ON DUPLICATE KEY UPDATE for upsert
          const rawJson = JSON.stringify(inv);
          await prisma.$executeRawUnsafe(
            `INSERT INTO fin_supplier_invoices (dolibarr_id, ref, ref_supplier, socid, fk_projet, type, status, is_paid,
             total_ht, total_tva, total_ttc, date_invoice, date_due, date_creation, dolibarr_raw,
             first_synced_at, last_synced_at, sync_hash, is_active)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), ?, 1)
             ON DUPLICATE KEY UPDATE
             ref=VALUES(ref), ref_supplier=VALUES(ref_supplier), socid=VALUES(socid), fk_projet=VALUES(fk_projet), type=VALUES(type),
             status=VALUES(status), is_paid=VALUES(is_paid), total_ht=VALUES(total_ht), total_tva=VALUES(total_tva),
             total_ttc=VALUES(total_ttc), date_invoice=VALUES(date_invoice), date_due=VALUES(date_due),
             date_creation=VALUES(date_creation), dolibarr_raw=VALUES(dolibarr_raw), last_synced_at=NOW(), sync_hash=VALUES(sync_hash), is_active=1`,
            dolibarrId, inv.ref, inv.ref_supplier, pi(inv.socid), fkProjet || null, pi(inv.type),
            pi(inv.statut || inv.status), (inv.paye === '1' || inv.paid === '1') ? 1 : 0,
            pf(inv.total_ht), pf(inv.total_tva), pf(inv.total_ttc),
            invoiceDate, dueDate, creationDate, rawJson, newHash
          );

          // Sync invoice lines - delete old and batch insert new
          await prisma.$executeRawUnsafe(
            `DELETE FROM fin_supplier_invoice_lines WHERE invoice_dolibarr_id = ?`, dolibarrId
          );
          
          if (inv.lines && Array.isArray(inv.lines) && inv.lines.length > 0) {
            const linePlaceholders = inv.lines.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
            const lineParams = inv.lines.flatMap(line => [
              dolibarrId, pi(line.rowid), pi(line.fk_product),
              line.product_ref || null, line.product_label || line.label || null,
              pf(line.qty), pf(line.subprice), pf(line.tva_tx),
              pf(line.total_ht), pf(line.total_tva), pf(line.total_ttc),
              line.fk_accounting_account ? String(line.fk_accounting_account) : null
            ]);
            
            await prisma.$executeRawUnsafe(
              `INSERT INTO fin_supplier_invoice_lines (invoice_dolibarr_id, line_id, fk_product, product_ref,
               product_label, qty, unit_price_ht, vat_rate, total_ht, total_tva, total_ttc, accounting_code)
               VALUES ${linePlaceholders}`,
              ...lineParams
            );
          }

          // Sync payments for this supplier invoice
          try {
            const payments = await this.client.getSupplierInvoicePayments(dolibarrId);
            for (const pmt of payments) {
              paymentsTotal++;
              const pmtDate = formatDate(parseDateString(pmt.date));
              if (!pmtDate) continue;

              const existingPmt: any[] = await prisma.$queryRawUnsafe(
                `SELECT id FROM fin_payments WHERE dolibarr_ref = ? AND payment_type = 'supplier' AND invoice_dolibarr_id = ?`,
                pmt.ref || `PAY-${dolibarrId}`, dolibarrId
              );

              if (existingPmt.length > 0) {
                await prisma.$executeRawUnsafe(
                  `UPDATE fin_payments SET amount=?, payment_date=?, payment_method=?, fk_bank_line=?,
                   bank_account_id=?, last_synced_at=NOW() WHERE id=?`,
                  pf(pmt.amount), pmtDate, pmt.type || null,
                  pi(pmt.fk_bank_line), pi(pmt.fk_bank_account), existingPmt[0].id
                );
                paymentsUpdated++;
              } else {
                await prisma.$executeRawUnsafe(
                  `INSERT INTO fin_payments (dolibarr_ref, payment_type, invoice_dolibarr_id, amount,
                   payment_date, payment_method, fk_bank_line, bank_account_id, first_synced_at, last_synced_at)
                   VALUES (?, 'supplier', ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
                  pmt.ref || `PAY-${dolibarrId}`, dolibarrId, pf(pmt.amount), pmtDate,
                  pmt.type || null, pi(pmt.fk_bank_line), pi(pmt.fk_bank_account)
                );
                paymentsCreated++;
              }
            }
          } catch (e: any) {
            console.error(`[FinSync] Error fetching payments for supplier invoice ${dolibarrId}:`, e.message);
          }
        }

        hasMore = batch.length >= BATCH_SIZE;
        page++;
      }

      console.log(`[FinSync] Supplier invoices complete: ${totalInvoices} total, ${created} created, ${updated} updated, ${unchanged} unchanged`);

      const invoiceResult: FinSyncResult = {
        entityType: 'supplier_invoices', status: 'success',
        created, updated, unchanged, total: totalInvoices,
        durationMs: Date.now() - startTime,
      };
      const paymentResult: FinSyncResult = {
        entityType: 'supplier_payments', status: 'success',
        created: paymentsCreated, updated: paymentsUpdated, unchanged: 0,
        total: paymentsTotal, durationMs: Date.now() - startTime,
      };
      await this.logSync(invoiceResult, triggeredBy);
      await this.logSync(paymentResult, triggeredBy);
      return { invoiceResult, paymentResult };
    } catch (error: any) {
      const invoiceResult: FinSyncResult = {
        entityType: 'supplier_invoices', status: 'error',
        created, updated, unchanged, total: 0,
        durationMs: Date.now() - startTime, error: error.message,
      };
      await this.logSync(invoiceResult, triggeredBy);
      return { invoiceResult, paymentResult: { ...invoiceResult, entityType: 'supplier_payments' } };
    }
  }

  // ============================================
  // SYNC: ALL PAYMENTS (standalone)
  // ============================================

  async syncAllPayments(triggeredBy: string = 'manual'): Promise<{ customerPayments: FinSyncResult; supplierPayments: FinSyncResult }> {
    const startTime = Date.now();
    let custCreated = 0, custUpdated = 0, custTotal = 0;
    let suppCreated = 0, suppUpdated = 0, suppTotal = 0;

    try {
      // Sync customer invoice payments
      console.log('[FinSync] Syncing customer payments...');
      const custInvoices: any[] = await prisma.$queryRawUnsafe(
        `SELECT dolibarr_id FROM fin_customer_invoices WHERE is_active = 1`
      );
      
      for (let i = 0; i < custInvoices.length; i++) {
        const dolibarrId = custInvoices[i].dolibarr_id;
        if (i > 0 && i % 200 === 0) {
          console.log(`[FinSync] Customer payments progress: ${i}/${custInvoices.length}...`);
        }
        try {
          const payments = await this.client.getInvoicePayments(dolibarrId);
          for (const pmt of payments) {
            custTotal++;
            const pmtDate = formatDate(parseDateString(pmt.date));
            if (!pmtDate) continue;

            const existingPmt: any[] = await prisma.$queryRawUnsafe(
              `SELECT id FROM fin_payments WHERE dolibarr_ref = ? AND payment_type = 'customer' AND invoice_dolibarr_id = ?`,
              pmt.ref || `PAY-${dolibarrId}`, dolibarrId
            );

            if (existingPmt.length > 0) {
              await prisma.$executeRawUnsafe(
                `UPDATE fin_payments SET amount=?, payment_date=?, payment_method=?, fk_bank_line=?,
                 bank_account_id=?, last_synced_at=NOW() WHERE id=?`,
                pf(pmt.amount), pmtDate, pmt.type || null,
                pi(pmt.fk_bank_line), pi(pmt.fk_bank_account), existingPmt[0].id
              );
              custUpdated++;
            } else {
              await prisma.$executeRawUnsafe(
                `INSERT INTO fin_payments (dolibarr_ref, payment_type, invoice_dolibarr_id, amount,
                 payment_date, payment_method, fk_bank_line, bank_account_id, first_synced_at, last_synced_at)
                 VALUES (?, 'customer', ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
                pmt.ref || `PAY-${dolibarrId}`, dolibarrId, pf(pmt.amount), pmtDate,
                pmt.type || null, pi(pmt.fk_bank_line), pi(pmt.fk_bank_account)
              );
              custCreated++;
            }
          }
        } catch (e: any) {
          // 404 = no payments for this invoice, skip silently
          if (!e.message?.includes('404')) {
            console.error(`[FinSync] Error fetching customer payments for invoice ${dolibarrId}:`, e.message);
          }
        }
      }
      console.log(`[FinSync] Customer payments complete: ${custCreated} created, ${custUpdated} updated, ${custTotal} total`);

      // Sync supplier invoice payments
      console.log('[FinSync] Syncing supplier payments...');
      const suppInvoices: any[] = await prisma.$queryRawUnsafe(
        `SELECT dolibarr_id FROM fin_supplier_invoices WHERE is_active = 1`
      );
      
      for (let i = 0; i < suppInvoices.length; i++) {
        const dolibarrId = suppInvoices[i].dolibarr_id;
        if (i > 0 && i % 500 === 0) {
          console.log(`[FinSync] Supplier payments progress: ${i}/${suppInvoices.length}...`);
        }
        try {
          const payments = await this.client.getSupplierInvoicePayments(dolibarrId);
          for (const pmt of payments) {
            suppTotal++;
            const pmtDate = formatDate(parseDateString(pmt.date));
            if (!pmtDate) continue;

            const existingPmt: any[] = await prisma.$queryRawUnsafe(
              `SELECT id FROM fin_payments WHERE dolibarr_ref = ? AND payment_type = 'supplier' AND invoice_dolibarr_id = ?`,
              pmt.ref || `PAY-${dolibarrId}`, dolibarrId
            );

            if (existingPmt.length > 0) {
              await prisma.$executeRawUnsafe(
                `UPDATE fin_payments SET amount=?, payment_date=?, payment_method=?, fk_bank_line=?,
                 bank_account_id=?, last_synced_at=NOW() WHERE id=?`,
                pf(pmt.amount), pmtDate, pmt.type || null,
                pi(pmt.fk_bank_line), pi(pmt.fk_bank_account), existingPmt[0].id
              );
              suppUpdated++;
            } else {
              await prisma.$executeRawUnsafe(
                `INSERT INTO fin_payments (dolibarr_ref, payment_type, invoice_dolibarr_id, amount,
                 payment_date, payment_method, fk_bank_line, bank_account_id, first_synced_at, last_synced_at)
                 VALUES (?, 'supplier', ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
                pmt.ref || `PAY-${dolibarrId}`, dolibarrId, pf(pmt.amount), pmtDate,
                pmt.type || null, pi(pmt.fk_bank_line), pi(pmt.fk_bank_account)
              );
              suppCreated++;
            }
          }
        } catch (e: any) {
          if (!e.message?.includes('404')) {
            console.error(`[FinSync] Error fetching supplier payments for invoice ${dolibarrId}:`, e.message);
          }
        }
      }
      console.log(`[FinSync] Supplier payments complete: ${suppCreated} created, ${suppUpdated} updated, ${suppTotal} total`);

      const customerPayments: FinSyncResult = {
        entityType: 'customer_payments', status: 'success',
        created: custCreated, updated: custUpdated, unchanged: 0,
        total: custTotal, durationMs: Date.now() - startTime,
      };
      const supplierPayments: FinSyncResult = {
        entityType: 'supplier_payments', status: 'success',
        created: suppCreated, updated: suppUpdated, unchanged: 0,
        total: suppTotal, durationMs: Date.now() - startTime,
      };
      await this.logSync(customerPayments, triggeredBy);
      await this.logSync(supplierPayments, triggeredBy);
      return { customerPayments, supplierPayments };
    } catch (error: any) {
      console.error('[FinSync] Payment sync failed:', error.message);
      const errResult: FinSyncResult = {
        entityType: 'payments', status: 'error',
        created: 0, updated: 0, unchanged: 0, total: 0,
        durationMs: Date.now() - startTime, error: error.message,
      };
      return { customerPayments: { ...errResult, entityType: 'customer_payments' }, supplierPayments: { ...errResult, entityType: 'supplier_payments' } };
    }
  }

  // ============================================
  // SYNC: SALARIES
  // ============================================

  async syncSalaries(triggeredBy: string = 'manual'): Promise<FinSyncResult> {
    const startTime = Date.now();
    let created = 0, updated = 0, unchanged = 0, total = 0;

    try {
      const BATCH_SIZE = 500;
      let page = 0;
      let hasMore = true;

      while (hasMore) {
        console.log(`[FinSync] Fetching salaries page ${page} (batch ${BATCH_SIZE})...`);
        const batch = await this.client.getSalaries({ limit: BATCH_SIZE, page });
        console.log(`[FinSync] Got ${batch.length} salaries (page ${page})`);

        for (const sal of batch) {
          total++;
          if (total % 200 === 0) {
            console.log(`[FinSync] Processing salary ${total}...`);
          }
          const dolibarrId = pi(sal.id);
          if (!dolibarrId) continue;

          const hashFields = {
            ref: sal.ref, amount: sal.amount, salary: sal.salary,
            paye: sal.paye, datesp: sal.datesp, dateep: sal.dateep,
          };
          const newHash = computeHash(hashFields);

          const dateStart = formatDate(parseDolibarrDate(sal.datesp));
          const dateEnd = formatDate(parseDolibarrDate(sal.dateep));
          const datePayment = formatDate(parseDolibarrDate(sal.datep || sal.date_payment));

          const existing: any[] = await prisma.$queryRawUnsafe(
            `SELECT sync_hash FROM fin_salaries WHERE dolibarr_id = ?`, dolibarrId
          );

          if (existing.length > 0) {
            if (existing[0].sync_hash === newHash) {
              unchanged++;
              continue;
            }
            await prisma.$executeRawUnsafe(
              `UPDATE fin_salaries SET ref=?, label=?, fk_user=?, amount=?, salary=?,
               date_start=?, date_end=?, date_payment=?, is_paid=?, fk_bank_account=?,
               last_synced_at=NOW(), sync_hash=?, is_active=1
               WHERE dolibarr_id=?`,
              sal.ref, sal.label || null, pi(sal.fk_user),
              pf(sal.amount), pf(sal.salary),
              dateStart, dateEnd, datePayment,
              sal.paye === '1' ? 1 : 0, pi(sal.fk_bank_account),
              newHash, dolibarrId
            );
            updated++;
          } else {
            await prisma.$executeRawUnsafe(
              `INSERT INTO fin_salaries (dolibarr_id, ref, label, fk_user, amount, salary,
               date_start, date_end, date_payment, is_paid, fk_bank_account,
               first_synced_at, last_synced_at, sync_hash, is_active)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), ?, 1)`,
              dolibarrId, sal.ref, sal.label || null, pi(sal.fk_user),
              pf(sal.amount), pf(sal.salary),
              dateStart, dateEnd, datePayment,
              sal.paye === '1' ? 1 : 0, pi(sal.fk_bank_account),
              newHash
            );
            created++;
          }
        }

        hasMore = batch.length >= BATCH_SIZE;
        page++;
      }

      console.log(`[FinSync] Salaries complete: ${total} total, ${created} created, ${updated} updated, ${unchanged} unchanged`);

      const result: FinSyncResult = {
        entityType: 'salaries', status: 'success',
        created, updated, unchanged, total,
        durationMs: Date.now() - startTime,
      };
      await this.logSync(result, triggeredBy);
      return result;
    } catch (error: any) {
      console.error('[FinSync] Salary sync failed:', error.message);
      const result: FinSyncResult = {
        entityType: 'salaries', status: 'error',
        created, updated, unchanged, total: 0,
        durationMs: Date.now() - startTime, error: error.message,
      };
      await this.logSync(result, triggeredBy);
      return result;
    }
  }

  // ============================================
  // JOURNAL ENTRY GENERATION (Batch optimized)
  // ============================================

  async generateJournalEntries(triggeredBy: string = 'manual'): Promise<FinSyncResult> {
    const startTime = Date.now();
    let created = 0;

    try {
      // Load config for default accounts
      const arAccount = await this.getConfig('default_ar_account', '411000');
      const apAccount = await this.getConfig('default_ap_account', '401000');
      const defaultRevenue = await this.getConfig('default_revenue_account', '701000');
      const defaultExpense = await this.getConfig('default_expense_account', '601000');
      const vatOut15 = await this.getConfig('vat_output_15_account', '445711');
      const vatOut5 = await this.getConfig('vat_output_5_account', '445712');
      const vatIn15 = await this.getConfig('vat_input_15_account', '445661');
      const vatIn5 = await this.getConfig('vat_input_5_account', '445662');

      // Build bank account mapping: dolibarr_id -> accounting code
      const bankRows: any[] = await prisma.$queryRawUnsafe(
        `SELECT dolibarr_id, account_number FROM fin_bank_accounts`
      );
      const bankAccountMap = new Map<number, string>();
      for (const row of bankRows) {
        if (row.account_number) bankAccountMap.set(row.dolibarr_id, row.account_number);
      }

      // Collect all entries in memory first, then delete old + insert new
      // This prevents data loss if generation fails mid-way
      const entries: Array<[string, string, number, string, string, number, number, string, number, string, number | null]> = [];
      let pieceNum = 1;

      const addEntry = (
        entryDate: string, journalCode: string, pn: number, accountCode: string,
        label: string, debit: number, credit: number,
        sourceType: string, sourceId: number, sourceRef: string, thirdpartyId: number | null
      ) => {
        entries.push([entryDate, journalCode, pn, accountCode, label, debit, credit, sourceType, sourceId, sourceRef, thirdpartyId]);
      };

      // ---- Customer Invoice Journal Entries ----
      console.log('[FinSync] Generating customer invoice journal entries...');
      const custInvoices: any[] = await prisma.$queryRawUnsafe(
        `SELECT ci.*, GROUP_CONCAT(DISTINCT dt.name SEPARATOR '') as thirdparty_name
         FROM fin_customer_invoices ci
         LEFT JOIN dolibarr_thirdparties dt ON dt.dolibarr_id = ci.socid
         WHERE ci.status >= 1 AND ci.is_active = 1
         GROUP BY ci.id
         ORDER BY ci.date_invoice`
      );

      // Pre-load ALL customer invoice lines in one query
      const allCustLines: any[] = await prisma.$queryRawUnsafe(
        `SELECT * FROM fin_customer_invoice_lines ORDER BY invoice_dolibarr_id`
      );
      const custLineMap = new Map<number, any[]>();
      for (const line of allCustLines) {
        const arr = custLineMap.get(line.invoice_dolibarr_id) || [];
        arr.push(line);
        custLineMap.set(line.invoice_dolibarr_id, arr);
      }

      for (const inv of custInvoices) {
        const isCreditNote = inv.type === 2;
        const entryDate = inv.date_invoice;
        if (!entryDate) continue;

        const arDebit = isCreditNote ? 0 : pf(inv.total_ttc);
        const arCredit = isCreditNote ? pf(inv.total_ttc) : 0;
        addEntry(entryDate, 'VTE', pieceNum, arAccount,
          `Customer Invoice ${inv.ref}`, arDebit, arCredit,
          'customer_invoice', inv.dolibarr_id, inv.ref, inv.socid);

        const lines = custLineMap.get(inv.dolibarr_id) || [];
        const vatGroups = new Map<number, { totalHt: number; totalTva: number }>();
        for (const line of lines) {
          const rate = pf(line.vat_rate);
          const existing = vatGroups.get(rate) || { totalHt: 0, totalTva: 0 };
          existing.totalHt += pf(line.total_ht);
          existing.totalTva += pf(line.total_tva);
          vatGroups.set(rate, existing);
        }

        let totalLineHt = 0;
        for (const [rate, group] of vatGroups) {
          const revCredit = isCreditNote ? 0 : group.totalHt;
          const revDebit = isCreditNote ? group.totalHt : 0;
          addEntry(entryDate, 'VTE', pieceNum, defaultRevenue,
            `Revenue - ${inv.ref} (VAT ${rate}%)`, revDebit, revCredit,
            'customer_invoice', inv.dolibarr_id, inv.ref, inv.socid);
          totalLineHt += group.totalHt;

          if (group.totalTva > 0) {
            const vatAccount = rate >= 10 ? vatOut15 : vatOut5;
            const vatCredit = isCreditNote ? 0 : group.totalTva;
            const vatDebit = isCreditNote ? group.totalTva : 0;
            addEntry(entryDate, 'VTE', pieceNum, vatAccount,
              `VAT Output ${rate}% - ${inv.ref}`, vatDebit, vatCredit,
              'customer_invoice', inv.dolibarr_id, inv.ref, inv.socid);
          }
        }

        if (lines.length === 0 && pf(inv.total_ht) > 0) {
          const revCredit = isCreditNote ? 0 : pf(inv.total_ht);
          const revDebit = isCreditNote ? pf(inv.total_ht) : 0;
          addEntry(entryDate, 'VTE', pieceNum, defaultRevenue,
            `Revenue - ${inv.ref}`, revDebit, revCredit,
            'customer_invoice', inv.dolibarr_id, inv.ref, inv.socid);

          if (pf(inv.total_tva) > 0) {
            const vatCredit = isCreditNote ? 0 : pf(inv.total_tva);
            const vatDebit = isCreditNote ? pf(inv.total_tva) : 0;
            addEntry(entryDate, 'VTE', pieceNum, vatOut15,
              `VAT Output - ${inv.ref}`, vatDebit, vatCredit,
              'customer_invoice', inv.dolibarr_id, inv.ref, inv.socid);
          }
        }

        pieceNum++;
      }
      console.log(`[FinSync] Customer invoices: ${custInvoices.length} processed, ${entries.length} entries queued`);

      // ---- Customer Payment Journal Entries ----
      console.log('[FinSync] Generating customer payment journal entries...');
      const custPayments: any[] = await prisma.$queryRawUnsafe(
        `SELECT fp.*, fci.ref as invoice_ref, fci.socid
         FROM fin_payments fp
         JOIN fin_customer_invoices fci ON fci.dolibarr_id = fp.invoice_dolibarr_id
         WHERE fp.payment_type = 'customer'
         ORDER BY fp.payment_date`
      );

      for (const pmt of custPayments) {
        const bankCode = pmt.bank_account_id ? (bankAccountMap.get(pmt.bank_account_id) || '120000') : '120000';
        const pmtDate = pmt.payment_date;
        if (!pmtDate) continue;

        addEntry(pmtDate, 'BQ', pieceNum, bankCode,
          `Payment received - ${pmt.invoice_ref || pmt.dolibarr_ref}`,
          pf(pmt.amount), 0,
          'customer_payment', pmt.id, pmt.dolibarr_ref, pmt.socid);

        addEntry(pmtDate, 'BQ', pieceNum, arAccount,
          `Payment received - ${pmt.invoice_ref || pmt.dolibarr_ref}`,
          0, pf(pmt.amount),
          'customer_payment', pmt.id, pmt.dolibarr_ref, pmt.socid);
        pieceNum++;
      }
      console.log(`[FinSync] Customer payments: ${custPayments.length} processed`);

      // ---- Supplier Invoice Journal Entries ----
      console.log('[FinSync] Generating supplier invoice journal entries...');
      const suppInvoices: any[] = await prisma.$queryRawUnsafe(
        `SELECT si.*
         FROM fin_supplier_invoices si
         WHERE si.status >= 1 AND si.is_active = 1
         ORDER BY si.date_invoice`
      );

      // Pre-load ALL supplier invoice lines in one query
      const allSuppLines: any[] = await prisma.$queryRawUnsafe(
        `SELECT * FROM fin_supplier_invoice_lines ORDER BY invoice_dolibarr_id`
      );
      const suppLineMap = new Map<number, any[]>();
      for (const line of allSuppLines) {
        const arr = suppLineMap.get(line.invoice_dolibarr_id) || [];
        arr.push(line);
        suppLineMap.set(line.invoice_dolibarr_id, arr);
      }

      for (const inv of suppInvoices) {
        const isCreditNote = inv.type === 2;
        const entryDate = inv.date_invoice;
        if (!entryDate) continue;

        const lines = suppLineMap.get(inv.dolibarr_id) || [];
        const vatGroups = new Map<number, { totalHt: number; totalTva: number }>();
        for (const line of lines) {
          const rate = pf(line.vat_rate);
          const existing = vatGroups.get(rate) || { totalHt: 0, totalTva: 0 };
          existing.totalHt += pf(line.total_ht);
          existing.totalTva += pf(line.total_tva);
          vatGroups.set(rate, existing);
        }

        for (const [rate, group] of vatGroups) {
          const expDebit = isCreditNote ? 0 : group.totalHt;
          const expCredit = isCreditNote ? group.totalHt : 0;
          addEntry(entryDate, 'ACH', pieceNum, defaultExpense,
            `Expense - ${inv.ref} (VAT ${rate}%)`, expDebit, expCredit,
            'supplier_invoice', inv.dolibarr_id, inv.ref, inv.socid);

          if (group.totalTva > 0) {
            const vatAccount = rate >= 10 ? vatIn15 : vatIn5;
            const vatDebit = isCreditNote ? 0 : group.totalTva;
            const vatCredit = isCreditNote ? group.totalTva : 0;
            addEntry(entryDate, 'ACH', pieceNum, vatAccount,
              `VAT Input ${rate}% - ${inv.ref}`, vatDebit, vatCredit,
              'supplier_invoice', inv.dolibarr_id, inv.ref, inv.socid);
          }
        }

        if (lines.length === 0 && pf(inv.total_ht) > 0) {
          const expDebit = isCreditNote ? 0 : pf(inv.total_ht);
          const expCredit = isCreditNote ? pf(inv.total_ht) : 0;
          addEntry(entryDate, 'ACH', pieceNum, defaultExpense,
            `Expense - ${inv.ref}`, expDebit, expCredit,
            'supplier_invoice', inv.dolibarr_id, inv.ref, inv.socid);

          if (pf(inv.total_tva) > 0) {
            const vatDebit = isCreditNote ? 0 : pf(inv.total_tva);
            const vatCredit = isCreditNote ? pf(inv.total_tva) : 0;
            addEntry(entryDate, 'ACH', pieceNum, vatIn15,
              `VAT Input - ${inv.ref}`, vatDebit, vatCredit,
              'supplier_invoice', inv.dolibarr_id, inv.ref, inv.socid);
          }
        }

        const apCredit = isCreditNote ? 0 : pf(inv.total_ttc);
        const apDebit = isCreditNote ? pf(inv.total_ttc) : 0;
        addEntry(entryDate, 'ACH', pieceNum, apAccount,
          `Supplier Invoice ${inv.ref}`, apDebit, apCredit,
          'supplier_invoice', inv.dolibarr_id, inv.ref, inv.socid);
        pieceNum++;
      }
      console.log(`[FinSync] Supplier invoices: ${suppInvoices.length} processed`);

      // ---- Supplier Payment Journal Entries ----
      console.log('[FinSync] Generating supplier payment journal entries...');
      const suppPayments: any[] = await prisma.$queryRawUnsafe(
        `SELECT fp.*, fsi.ref as invoice_ref, fsi.socid
         FROM fin_payments fp
         JOIN fin_supplier_invoices fsi ON fsi.dolibarr_id = fp.invoice_dolibarr_id
         WHERE fp.payment_type = 'supplier'
         ORDER BY fp.payment_date`
      );

      for (const pmt of suppPayments) {
        const bankCode = pmt.bank_account_id ? (bankAccountMap.get(pmt.bank_account_id) || '120000') : '120000';
        const pmtDate = pmt.payment_date;
        if (!pmtDate) continue;

        addEntry(pmtDate, 'BQ', pieceNum, apAccount,
          `Payment made - ${pmt.invoice_ref || pmt.dolibarr_ref}`,
          pf(pmt.amount), 0,
          'supplier_payment', pmt.id, pmt.dolibarr_ref, pmt.socid);

        addEntry(pmtDate, 'BQ', pieceNum, bankCode,
          `Payment made - ${pmt.invoice_ref || pmt.dolibarr_ref}`,
          0, pf(pmt.amount),
          'supplier_payment', pmt.id, pmt.dolibarr_ref, pmt.socid);
        pieceNum++;
      }
      console.log(`[FinSync] Supplier payments: ${suppPayments.length} processed`);

      // ---- Salary Journal Entries ----
      console.log('[FinSync] Generating salary journal entries...');
      const defaultSalaryAccount = await this.getConfig('default_salary_account', '631000');
      const salaries: any[] = await prisma.$queryRawUnsafe(
        `SELECT * FROM fin_salaries WHERE is_active = 1 AND amount > 0 ORDER BY date_start`
      );

      for (const sal of salaries) {
        const salDate = sal.date_payment || sal.date_start;
        if (!salDate) continue;

        const bankCode = sal.fk_bank_account ? (bankAccountMap.get(sal.fk_bank_account) || '120000') : '120000';

        // Debit: Salary Expense
        addEntry(salDate, 'SAL', pieceNum, defaultSalaryAccount,
          `Salary - ${sal.label || sal.ref || `ID ${sal.dolibarr_id}`}`,
          pf(sal.amount), 0,
          'salary', sal.id, sal.ref, sal.fk_user);

        // Credit: Bank/Cash
        addEntry(salDate, 'SAL', pieceNum, bankCode,
          `Salary payment - ${sal.label || sal.ref || `ID ${sal.dolibarr_id}`}`,
          0, pf(sal.amount),
          'salary', sal.id, sal.ref, sal.fk_user);
        pieceNum++;
      }
      console.log(`[FinSync] Salaries: ${salaries.length} processed`);

      // ---- DELETE old entries only AFTER successful generation ----
      // This prevents data loss if generation fails mid-way
      console.log(`[FinSync] ${entries.length} entries generated successfully. Now replacing old entries...`);
      await prisma.$executeRawUnsafe(`DELETE FROM fin_journal_entries WHERE is_locked = 0`);

      // ---- BATCH INSERT all journal entries ----
      console.log(`[FinSync] Batch inserting ${entries.length} journal entries...`);
      const BATCH_SIZE = 500;
      for (let i = 0; i < entries.length; i += BATCH_SIZE) {
        const batch = entries.slice(i, i + BATCH_SIZE);
        const placeholders = batch.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, \'SAR\', 0)').join(',\n');
        const params: any[] = [];
        for (const e of batch) {
          params.push(e[0], e[1], e[2], e[3], e[4], e[5], e[6], e[7], e[8], e[9], e[10]);
        }
        await prisma.$executeRawUnsafe(
          `INSERT INTO fin_journal_entries (entry_date, journal_code, piece_num, account_code, label,
           debit, credit, source_type, source_id, source_ref, thirdparty_id, currency_code, is_locked)
           VALUES ${placeholders}`,
          ...params
        );
        created += batch.length;
      }
      console.log(`[FinSync] Batch insert complete: ${created} entries`);

      const result: FinSyncResult = {
        entityType: 'journal_entries', status: 'success',
        created, updated: 0, unchanged: 0, total: created,
        durationMs: Date.now() - startTime,
      };
      await this.logSync(result, triggeredBy);
      return result;
    } catch (error: any) {
      console.error('[FinSync] Journal entry generation error:', error);
      const result: FinSyncResult = {
        entityType: 'journal_entries', status: 'error',
        created, updated: 0, unchanged: 0, total: 0,
        durationMs: Date.now() - startTime, error: error.message,
      };
      await this.logSync(result, triggeredBy);
      return result;
    }
  }

  // ============================================
  // PARTIAL SYNC (individual entity types)
  // ============================================

  async runPartialSync(entities: string[], triggeredBy: string = 'manual'): Promise<FullFinSyncResult> {
    if (!acquireSyncLock()) {
      console.warn(`[FinSync] Another sync is already running — skipping partial sync for: ${entities.join(', ')}`);
      return { totalDurationMs: 0 } as FullFinSyncResult;
    }

    const startTime = Date.now();
    const result: FullFinSyncResult = { totalDurationMs: 0 };

    console.log(`[FinSync] Starting partial sync for: ${entities.join(', ')}`);

    try {
      for (const entity of entities) {
        switch (entity) {
          case 'bank_accounts':
            result.bankAccounts = await this.syncBankAccounts(triggeredBy);
            console.log(`[FinSync] Bank accounts: ${result.bankAccounts.created} created, ${result.bankAccounts.updated} updated`);
            break;
          case 'projects':
            result.projects = await this.syncProjects(triggeredBy);
            console.log(`[FinSync] Projects: ${result.projects.created} created, ${result.projects.updated} updated`);
            break;
          case 'customer_invoices': {
            const { invoiceResult, paymentResult } = await this.syncCustomerInvoices(triggeredBy);
            result.customerInvoices = invoiceResult;
            result.customerPayments = paymentResult;
            console.log(`[FinSync] Customer invoices: ${invoiceResult.created} created, ${invoiceResult.updated} updated`);
            console.log(`[FinSync] Customer payments: ${paymentResult.created} created`);
            break;
          }
          case 'supplier_invoices': {
            const { invoiceResult, paymentResult } = await this.syncSupplierInvoices(triggeredBy);
            result.supplierInvoices = invoiceResult;
            result.supplierPayments = paymentResult;
            console.log(`[FinSync] Supplier invoices: ${invoiceResult.created} created, ${invoiceResult.updated} updated`);
            console.log(`[FinSync] Supplier payments: ${paymentResult.created} created`);
            break;
          }
          case 'payments': {
            // Sync payments for all existing invoices (both customer and supplier)
            const pmtResult = await this.syncAllPayments(triggeredBy);
            result.customerPayments = pmtResult.customerPayments;
            result.supplierPayments = pmtResult.supplierPayments;
            console.log(`[FinSync] Customer payments: ${pmtResult.customerPayments.created} created`);
            console.log(`[FinSync] Supplier payments: ${pmtResult.supplierPayments.created} created`);
            break;
          }
          case 'salaries':
            result.salaries = await this.syncSalaries(triggeredBy);
            console.log(`[FinSync] Salaries: ${result.salaries.created} created, ${result.salaries.updated} updated`);
            break;
          case 'journal_entries':
            result.journalEntries = await this.generateJournalEntries(triggeredBy);
            console.log(`[FinSync] Journal entries: ${result.journalEntries.created} generated`);
            break;
          default:
            console.warn(`[FinSync] Unknown entity type: ${entity}`);
        }
      }
    } finally {
      releaseSyncLock();
    }

    result.totalDurationMs = Date.now() - startTime;
    console.log(`[FinSync] Partial sync completed in ${result.totalDurationMs}ms`);
    return result;
  }

  // ============================================
  // FULL SYNC
  // ============================================

  async runFullSync(triggeredBy: string = 'manual'): Promise<FullFinSyncResult> {
    if (!acquireSyncLock()) {
      console.warn('[FinSync] Another sync is already running — skipping full sync');
      return { totalDurationMs: 0 } as FullFinSyncResult;
    }

    const startTime = Date.now();
    console.log('[FinSync] Starting full financial sync...');

    let bankAccounts: FinSyncResult | undefined;
    let projects: FinSyncResult | undefined;
    let customerInvoices: FinSyncResult | undefined;
    let customerPayments: FinSyncResult | undefined;
    let supplierInvoices: FinSyncResult | undefined;
    let supplierPayments: FinSyncResult | undefined;
    let salaries: FinSyncResult | undefined;
    let journalEntries: FinSyncResult | undefined;

    try {
      // Each step is wrapped in try/catch so a failure in one step
      // doesn't prevent subsequent steps (especially journal entry generation)
      try {
        bankAccounts = await this.syncBankAccounts(triggeredBy);
        console.log(`[FinSync] Bank accounts: ${bankAccounts.created} created, ${bankAccounts.updated} updated`);
      } catch (e: any) {
        console.error('[FinSync] Bank accounts sync failed:', e.message);
      }

      try {
        projects = await this.syncProjects(triggeredBy);
        console.log(`[FinSync] Projects: ${projects.created} created, ${projects.updated} updated`);
      } catch (e: any) {
        console.error('[FinSync] Projects sync failed:', e.message);
      }

      try {
        const custResult = await this.syncCustomerInvoices(triggeredBy);
        customerInvoices = custResult.invoiceResult;
        customerPayments = custResult.paymentResult;
        console.log(`[FinSync] Customer invoices: ${customerInvoices.created} created, ${customerInvoices.updated} updated`);
        console.log(`[FinSync] Customer payments: ${customerPayments.created} created`);
      } catch (e: any) {
        console.error('[FinSync] Customer invoices sync failed:', e.message);
      }

      try {
        const suppResult = await this.syncSupplierInvoices(triggeredBy);
        supplierInvoices = suppResult.invoiceResult;
        supplierPayments = suppResult.paymentResult;
        console.log(`[FinSync] Supplier invoices: ${supplierInvoices.created} created, ${supplierInvoices.updated} updated`);
        console.log(`[FinSync] Supplier payments: ${supplierPayments.created} created`);
      } catch (e: any) {
        console.error('[FinSync] Supplier invoices sync failed:', e.message);
      }

      try {
        salaries = await this.syncSalaries(triggeredBy);
        console.log(`[FinSync] Salaries: ${salaries.created} created, ${salaries.updated} updated`);
      } catch (e: any) {
        console.error('[FinSync] Salary sync failed:', e.message);
      }

      // Always attempt journal entry generation even if some syncs failed
      // This ensures we generate entries from whatever data is available
      try {
        journalEntries = await this.generateJournalEntries(triggeredBy);
        console.log(`[FinSync] Journal entries: ${journalEntries.created} generated`);
      } catch (e: any) {
        console.error('[FinSync] Journal entry generation failed:', e.message);
      }

      await this.setConfig('last_full_sync', new Date().toISOString());
    } finally {
      releaseSyncLock();
    }

    const totalDurationMs = Date.now() - startTime;
    console.log(`[FinSync] Full sync completed in ${totalDurationMs}ms`);

    return {
      bankAccounts, projects, customerInvoices, customerPayments,
      supplierInvoices, supplierPayments, salaries, journalEntries,
      totalDurationMs,
    };
  }

  // ============================================
  // STATUS
  // ============================================

  async getSyncStatus(): Promise<any> {
    try {
      const lastFullSync = await this.getConfig('last_full_sync', '');

      const counts: any = {};
      
      // Helper to safely get count (handles BigInt conversion)
      const getCount = async (query: string): Promise<number> => {
        try {
          const result: any[] = await prisma.$queryRawUnsafe(query);
          const cnt = result[0]?.cnt;
          return typeof cnt === 'bigint' ? Number(cnt) : (cnt || 0);
        } catch {
          return 0;
        }
      };

      counts.projects = await getCount(`SELECT COUNT(*) as cnt FROM dolibarr_projects WHERE is_active = 1`);
      counts.customerInvoices = await getCount(`SELECT COUNT(*) as cnt FROM fin_customer_invoices WHERE is_active = 1`);
      counts.supplierInvoices = await getCount(`SELECT COUNT(*) as cnt FROM fin_supplier_invoices WHERE is_active = 1`);
      counts.payments = await getCount(`SELECT COUNT(*) as cnt FROM fin_payments`);
      counts.salaries = await getCount(`SELECT COUNT(*) as cnt FROM fin_salaries WHERE is_active = 1`);
      counts.bankAccounts = await getCount(`SELECT COUNT(*) as cnt FROM fin_bank_accounts`);
      counts.journalEntries = await getCount(`SELECT COUNT(*) as cnt FROM fin_journal_entries`);

      let recentLogs: any[] = [];
      try {
        const logs: any[] = await prisma.$queryRawUnsafe(
          `SELECT entity_type, status, records_created, records_updated, records_unchanged, records_total, duration_ms, error_message, triggered_by, created_at FROM fin_sync_log ORDER BY created_at DESC LIMIT 20`
        );
        // Convert any BigInt values to Number for JSON serialization
        recentLogs = logs.map(log => ({
          ...log,
          records_created: typeof log.records_created === 'bigint' ? Number(log.records_created) : log.records_created,
          records_updated: typeof log.records_updated === 'bigint' ? Number(log.records_updated) : log.records_updated,
          records_unchanged: typeof log.records_unchanged === 'bigint' ? Number(log.records_unchanged) : log.records_unchanged,
          records_total: typeof log.records_total === 'bigint' ? Number(log.records_total) : log.records_total,
          duration_ms: typeof log.duration_ms === 'bigint' ? Number(log.duration_ms) : log.duration_ms,
        }));
      } catch { /* table may not exist */ }

      return {
        lastFullSync: lastFullSync || null,
        counts,
        recentLogs,
      };
    } catch (error: any) {
      console.error('[FinSync] getSyncStatus error:', error);
      return { lastFullSync: null, counts: {}, recentLogs: [], error: error.message };
    }
  }
}
