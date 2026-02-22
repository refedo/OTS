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
  customerInvoices?: FinSyncResult;
  customerPayments?: FinSyncResult;
  supplierInvoices?: FinSyncResult;
  supplierPayments?: FinSyncResult;
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
  // SYNC: CUSTOMER INVOICES
  // ============================================

  async syncCustomerInvoices(triggeredBy: string = 'manual'): Promise<{ invoiceResult: FinSyncResult; paymentResult: FinSyncResult }> {
    const startTime = Date.now();
    let created = 0, updated = 0, unchanged = 0;
    let paymentsCreated = 0, paymentsUpdated = 0, paymentsTotal = 0;

    try {
      const invoices = await this.client.getAllInvoices(100);

      for (const inv of invoices) {
        const dolibarrId = pi(inv.id);
        if (!dolibarrId) continue;

        const hashFields = {
          ref: inv.ref, status: inv.statut || inv.status, paye: inv.paye,
          total_ht: inv.total_ht, total_tva: inv.total_tva, total_ttc: inv.total_ttc,
          date_echeance: inv.date_echeance,
        };
        const newHash = computeHash(hashFields);

        const invoiceDate = formatDate(parseDolibarrDate(inv.date_validation || inv.date || inv.date_creation));
        const dueDate = formatDate(parseDolibarrDate(inv.date_echeance));
        const creationDate = formatDateTime(parseDolibarrDate(inv.date_creation));
        const rawJson = JSON.stringify(inv);

        const existing: any[] = await prisma.$queryRawUnsafe(
          `SELECT sync_hash FROM fin_customer_invoices WHERE dolibarr_id = ?`, dolibarrId
        );

        if (existing.length > 0) {
          if (existing[0].sync_hash === newHash) { unchanged++; }
          else {
            await prisma.$executeRawUnsafe(
              `UPDATE fin_customer_invoices SET ref=?, ref_client=?, socid=?, type=?, status=?, is_paid=?,
               total_ht=?, total_tva=?, total_ttc=?, date_invoice=?, date_due=?, date_creation=?,
               dolibarr_raw=?, last_synced_at=NOW(), sync_hash=?, is_active=1
               WHERE dolibarr_id=?`,
              inv.ref, inv.ref_client, pi(inv.socid), pi(inv.type),
              pi(inv.statut || inv.status), inv.paye === '1' ? 1 : 0,
              pf(inv.total_ht), pf(inv.total_tva), pf(inv.total_ttc),
              invoiceDate, dueDate, creationDate, rawJson, newHash, dolibarrId
            );
            updated++;
          }
        } else {
          await prisma.$executeRawUnsafe(
            `INSERT INTO fin_customer_invoices (dolibarr_id, ref, ref_client, socid, type, status, is_paid,
             total_ht, total_tva, total_ttc, date_invoice, date_due, date_creation, dolibarr_raw,
             first_synced_at, last_synced_at, sync_hash, is_active)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), ?, 1)`,
            dolibarrId, inv.ref, inv.ref_client, pi(inv.socid), pi(inv.type),
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

      const invoiceResult: FinSyncResult = {
        entityType: 'customer_invoices', status: 'success',
        created, updated, unchanged, total: invoices.length,
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

    try {
      const invoices = await this.client.getAllSupplierInvoices(100);

      for (const inv of invoices) {
        const dolibarrId = pi(inv.id);
        if (!dolibarrId) continue;

        const hashFields = {
          ref: inv.ref, status: inv.statut || inv.status, paye: inv.paye || inv.paid,
          total_ht: inv.total_ht, total_tva: inv.total_tva, total_ttc: inv.total_ttc,
          date_echeance: inv.date_echeance,
        };
        const newHash = computeHash(hashFields);

        const invoiceDate = formatDate(parseDolibarrDate(inv.date_validation || inv.date || inv.date_creation));
        const dueDate = formatDate(parseDolibarrDate(inv.date_echeance));
        const creationDate = formatDateTime(parseDolibarrDate(inv.date_creation));
        const rawJson = JSON.stringify(inv);

        const existing: any[] = await prisma.$queryRawUnsafe(
          `SELECT sync_hash FROM fin_supplier_invoices WHERE dolibarr_id = ?`, dolibarrId
        );

        if (existing.length > 0) {
          if (existing[0].sync_hash === newHash) { unchanged++; }
          else {
            await prisma.$executeRawUnsafe(
              `UPDATE fin_supplier_invoices SET ref=?, ref_supplier=?, socid=?, type=?, status=?, is_paid=?,
               total_ht=?, total_tva=?, total_ttc=?, date_invoice=?, date_due=?, date_creation=?,
               dolibarr_raw=?, last_synced_at=NOW(), sync_hash=?, is_active=1
               WHERE dolibarr_id=?`,
              inv.ref, inv.ref_supplier, pi(inv.socid), pi(inv.type),
              pi(inv.statut || inv.status), (inv.paye === '1' || inv.paid === '1') ? 1 : 0,
              pf(inv.total_ht), pf(inv.total_tva), pf(inv.total_ttc),
              invoiceDate, dueDate, creationDate, rawJson, newHash, dolibarrId
            );
            updated++;
          }
        } else {
          await prisma.$executeRawUnsafe(
            `INSERT INTO fin_supplier_invoices (dolibarr_id, ref, ref_supplier, socid, type, status, is_paid,
             total_ht, total_tva, total_ttc, date_invoice, date_due, date_creation, dolibarr_raw,
             first_synced_at, last_synced_at, sync_hash, is_active)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), ?, 1)`,
            dolibarrId, inv.ref, inv.ref_supplier, pi(inv.socid), pi(inv.type),
            pi(inv.statut || inv.status), (inv.paye === '1' || inv.paid === '1') ? 1 : 0,
            pf(inv.total_ht), pf(inv.total_tva), pf(inv.total_ttc),
            invoiceDate, dueDate, creationDate, rawJson, newHash
          );
          created++;
        }

        // Sync invoice lines
        await prisma.$executeRawUnsafe(
          `DELETE FROM fin_supplier_invoice_lines WHERE invoice_dolibarr_id = ?`, dolibarrId
        );
        if (inv.lines && Array.isArray(inv.lines)) {
          for (const line of inv.lines) {
            await prisma.$executeRawUnsafe(
              `INSERT INTO fin_supplier_invoice_lines (invoice_dolibarr_id, line_id, fk_product, product_ref,
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

        // Sync payments
        try {
          const payments = await this.client.getSupplierInvoicePayments(dolibarrId);
          for (const pmt of payments) {
            paymentsTotal++;
            const pmtDate = formatDate(parseDateString(pmt.date));
            if (!pmtDate) continue;

            const existingPmt: any[] = await prisma.$queryRawUnsafe(
              `SELECT id FROM fin_payments WHERE dolibarr_ref = ? AND payment_type = 'supplier' AND invoice_dolibarr_id = ?`,
              pmt.ref || `SPAY-${dolibarrId}`, dolibarrId
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
                pmt.ref || `SPAY-${dolibarrId}`, dolibarrId, pf(pmt.amount), pmtDate,
                pmt.type || null, pi(pmt.fk_bank_line), pi(pmt.fk_bank_account)
              );
              paymentsCreated++;
            }
          }
        } catch (e: any) {
          console.error(`[FinSync] Error fetching payments for supplier invoice ${dolibarrId}:`, e.message);
        }
      }

      const invoiceResult: FinSyncResult = {
        entityType: 'supplier_invoices', status: 'success',
        created, updated, unchanged, total: invoices.length,
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
  // JOURNAL ENTRY GENERATION
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

      // Delete all non-locked journal entries (they will be regenerated)
      await prisma.$executeRawUnsafe(`DELETE FROM fin_journal_entries WHERE is_locked = 0`);

      let pieceNum = 1;

      // ---- Customer Invoice Journal Entries ----
      const custInvoices: any[] = await prisma.$queryRawUnsafe(
        `SELECT ci.*, GROUP_CONCAT(DISTINCT dt.name SEPARATOR '') as thirdparty_name
         FROM fin_customer_invoices ci
         LEFT JOIN dolibarr_thirdparties dt ON dt.dolibarr_id = ci.socid
         WHERE ci.status >= 1 AND ci.is_active = 1
         ORDER BY ci.date_invoice`
      );

      for (const inv of custInvoices) {
        const isCreditNote = inv.type === 2;
        const entryDate = inv.date_invoice;
        if (!entryDate) continue;

        // DEBIT Accounts Receivable for total_ttc
        const arDebit = isCreditNote ? 0 : pf(inv.total_ttc);
        const arCredit = isCreditNote ? pf(inv.total_ttc) : 0;
        await this.insertJournalEntry(
          entryDate, 'VTE', pieceNum, arAccount,
          `Customer Invoice ${inv.ref}`, arDebit, arCredit,
          'customer_invoice', inv.dolibarr_id, inv.ref, inv.socid
        );
        created++;

        // Get lines for VAT breakdown
        const lines: any[] = await prisma.$queryRawUnsafe(
          `SELECT * FROM fin_customer_invoice_lines WHERE invoice_dolibarr_id = ?`, inv.dolibarr_id
        );

        // Group lines by VAT rate for revenue entries
        const vatGroups = new Map<number, { totalHt: number; totalTva: number }>();
        for (const line of lines) {
          const rate = pf(line.vat_rate);
          const existing = vatGroups.get(rate) || { totalHt: 0, totalTva: 0 };
          existing.totalHt += pf(line.total_ht);
          existing.totalTva += pf(line.total_tva);
          vatGroups.set(rate, existing);
        }

        // CREDIT Revenue per line group
        let totalLineHt = 0;
        for (const [rate, group] of vatGroups) {
          const revCredit = isCreditNote ? 0 : group.totalHt;
          const revDebit = isCreditNote ? group.totalHt : 0;
          await this.insertJournalEntry(
            entryDate, 'VTE', pieceNum, defaultRevenue,
            `Revenue - ${inv.ref} (VAT ${rate}%)`, revDebit, revCredit,
            'customer_invoice', inv.dolibarr_id, inv.ref, inv.socid
          );
          created++;
          totalLineHt += group.totalHt;

          // CREDIT VAT Output
          if (group.totalTva > 0) {
            const vatAccount = rate >= 10 ? vatOut15 : vatOut5;
            const vatCredit = isCreditNote ? 0 : group.totalTva;
            const vatDebit = isCreditNote ? group.totalTva : 0;
            await this.insertJournalEntry(
              entryDate, 'VTE', pieceNum, vatAccount,
              `VAT Output ${rate}% - ${inv.ref}`, vatDebit, vatCredit,
              'customer_invoice', inv.dolibarr_id, inv.ref, inv.socid
            );
            created++;
          }
        }

        // If no lines, use invoice totals directly
        if (lines.length === 0 && pf(inv.total_ht) > 0) {
          const revCredit = isCreditNote ? 0 : pf(inv.total_ht);
          const revDebit = isCreditNote ? pf(inv.total_ht) : 0;
          await this.insertJournalEntry(
            entryDate, 'VTE', pieceNum, defaultRevenue,
            `Revenue - ${inv.ref}`, revDebit, revCredit,
            'customer_invoice', inv.dolibarr_id, inv.ref, inv.socid
          );
          created++;

          if (pf(inv.total_tva) > 0) {
            const vatCredit = isCreditNote ? 0 : pf(inv.total_tva);
            const vatDebit = isCreditNote ? pf(inv.total_tva) : 0;
            await this.insertJournalEntry(
              entryDate, 'VTE', pieceNum, vatOut15,
              `VAT Output - ${inv.ref}`, vatDebit, vatCredit,
              'customer_invoice', inv.dolibarr_id, inv.ref, inv.socid
            );
            created++;
          }
        }

        pieceNum++;
      }

      // ---- Customer Payment Journal Entries ----
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

        // DEBIT Bank
        await this.insertJournalEntry(
          pmtDate, 'BQ', pieceNum, bankCode,
          `Payment received - ${pmt.invoice_ref || pmt.dolibarr_ref}`,
          pf(pmt.amount), 0,
          'customer_payment', pmt.id, pmt.dolibarr_ref, pmt.socid
        );
        created++;

        // CREDIT Accounts Receivable
        await this.insertJournalEntry(
          pmtDate, 'BQ', pieceNum, arAccount,
          `Payment received - ${pmt.invoice_ref || pmt.dolibarr_ref}`,
          0, pf(pmt.amount),
          'customer_payment', pmt.id, pmt.dolibarr_ref, pmt.socid
        );
        created++;
        pieceNum++;
      }

      // ---- Supplier Invoice Journal Entries ----
      const suppInvoices: any[] = await prisma.$queryRawUnsafe(
        `SELECT si.*
         FROM fin_supplier_invoices si
         WHERE si.status >= 1 AND si.is_active = 1
         ORDER BY si.date_invoice`
      );

      for (const inv of suppInvoices) {
        const isCreditNote = inv.type === 2;
        const entryDate = inv.date_invoice;
        if (!entryDate) continue;

        // Get lines for VAT breakdown
        const lines: any[] = await prisma.$queryRawUnsafe(
          `SELECT * FROM fin_supplier_invoice_lines WHERE invoice_dolibarr_id = ?`, inv.dolibarr_id
        );

        const vatGroups = new Map<number, { totalHt: number; totalTva: number }>();
        for (const line of lines) {
          const rate = pf(line.vat_rate);
          const existing = vatGroups.get(rate) || { totalHt: 0, totalTva: 0 };
          existing.totalHt += pf(line.total_ht);
          existing.totalTva += pf(line.total_tva);
          vatGroups.set(rate, existing);
        }

        // DEBIT Expense per line group
        for (const [rate, group] of vatGroups) {
          const expDebit = isCreditNote ? 0 : group.totalHt;
          const expCredit = isCreditNote ? group.totalHt : 0;
          await this.insertJournalEntry(
            entryDate, 'ACH', pieceNum, defaultExpense,
            `Expense - ${inv.ref} (VAT ${rate}%)`, expDebit, expCredit,
            'supplier_invoice', inv.dolibarr_id, inv.ref, inv.socid
          );
          created++;

          // DEBIT VAT Input
          if (group.totalTva > 0) {
            const vatAccount = rate >= 10 ? vatIn15 : vatIn5;
            const vatDebit = isCreditNote ? 0 : group.totalTva;
            const vatCredit = isCreditNote ? group.totalTva : 0;
            await this.insertJournalEntry(
              entryDate, 'ACH', pieceNum, vatAccount,
              `VAT Input ${rate}% - ${inv.ref}`, vatDebit, vatCredit,
              'supplier_invoice', inv.dolibarr_id, inv.ref, inv.socid
            );
            created++;
          }
        }

        // If no lines, use invoice totals
        if (lines.length === 0 && pf(inv.total_ht) > 0) {
          const expDebit = isCreditNote ? 0 : pf(inv.total_ht);
          const expCredit = isCreditNote ? pf(inv.total_ht) : 0;
          await this.insertJournalEntry(
            entryDate, 'ACH', pieceNum, defaultExpense,
            `Expense - ${inv.ref}`, expDebit, expCredit,
            'supplier_invoice', inv.dolibarr_id, inv.ref, inv.socid
          );
          created++;

          if (pf(inv.total_tva) > 0) {
            const vatDebit = isCreditNote ? 0 : pf(inv.total_tva);
            const vatCredit = isCreditNote ? pf(inv.total_tva) : 0;
            await this.insertJournalEntry(
              entryDate, 'ACH', pieceNum, vatIn15,
              `VAT Input - ${inv.ref}`, vatDebit, vatCredit,
              'supplier_invoice', inv.dolibarr_id, inv.ref, inv.socid
            );
            created++;
          }
        }

        // CREDIT Accounts Payable for total_ttc
        const apCredit = isCreditNote ? 0 : pf(inv.total_ttc);
        const apDebit = isCreditNote ? pf(inv.total_ttc) : 0;
        await this.insertJournalEntry(
          entryDate, 'ACH', pieceNum, apAccount,
          `Supplier Invoice ${inv.ref}`, apDebit, apCredit,
          'supplier_invoice', inv.dolibarr_id, inv.ref, inv.socid
        );
        created++;
        pieceNum++;
      }

      // ---- Supplier Payment Journal Entries ----
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

        // DEBIT Accounts Payable
        await this.insertJournalEntry(
          pmtDate, 'BQ', pieceNum, apAccount,
          `Payment made - ${pmt.invoice_ref || pmt.dolibarr_ref}`,
          pf(pmt.amount), 0,
          'supplier_payment', pmt.id, pmt.dolibarr_ref, pmt.socid
        );
        created++;

        // CREDIT Bank
        await this.insertJournalEntry(
          pmtDate, 'BQ', pieceNum, bankCode,
          `Payment made - ${pmt.invoice_ref || pmt.dolibarr_ref}`,
          0, pf(pmt.amount),
          'supplier_payment', pmt.id, pmt.dolibarr_ref, pmt.socid
        );
        created++;
        pieceNum++;
      }

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

  private async insertJournalEntry(
    entryDate: string, journalCode: string, pieceNum: number,
    accountCode: string, label: string, debit: number, credit: number,
    sourceType: string, sourceId: number, sourceRef: string, thirdpartyId: number | null
  ): Promise<void> {
    await prisma.$executeRawUnsafe(
      `INSERT INTO fin_journal_entries (entry_date, journal_code, piece_num, account_code, label,
       debit, credit, source_type, source_id, source_ref, thirdparty_id, currency_code, is_locked)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SAR', 0)`,
      entryDate, journalCode, pieceNum, accountCode, label,
      debit, credit, sourceType, sourceId, sourceRef, thirdpartyId || null
    );
  }

  // ============================================
  // FULL SYNC
  // ============================================

  async runFullSync(triggeredBy: string = 'manual'): Promise<FullFinSyncResult> {
    const startTime = Date.now();
    console.log('[FinSync] Starting full financial sync...');

    const bankAccounts = await this.syncBankAccounts(triggeredBy);
    console.log(`[FinSync] Bank accounts: ${bankAccounts.created} created, ${bankAccounts.updated} updated`);

    const { invoiceResult: customerInvoices, paymentResult: customerPayments } =
      await this.syncCustomerInvoices(triggeredBy);
    console.log(`[FinSync] Customer invoices: ${customerInvoices.created} created, ${customerInvoices.updated} updated`);
    console.log(`[FinSync] Customer payments: ${customerPayments.created} created`);

    const { invoiceResult: supplierInvoices, paymentResult: supplierPayments } =
      await this.syncSupplierInvoices(triggeredBy);
    console.log(`[FinSync] Supplier invoices: ${supplierInvoices.created} created, ${supplierInvoices.updated} updated`);
    console.log(`[FinSync] Supplier payments: ${supplierPayments.created} created`);

    const journalEntries = await this.generateJournalEntries(triggeredBy);
    console.log(`[FinSync] Journal entries: ${journalEntries.created} generated`);

    await this.setConfig('last_full_sync', new Date().toISOString());

    const totalDurationMs = Date.now() - startTime;
    console.log(`[FinSync] Full sync completed in ${totalDurationMs}ms`);

    return {
      bankAccounts, customerInvoices, customerPayments,
      supplierInvoices, supplierPayments, journalEntries,
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

      counts.customerInvoices = await getCount(`SELECT COUNT(*) as cnt FROM fin_customer_invoices WHERE is_active = 1`);
      counts.supplierInvoices = await getCount(`SELECT COUNT(*) as cnt FROM fin_supplier_invoices WHERE is_active = 1`);
      counts.payments = await getCount(`SELECT COUNT(*) as cnt FROM fin_payments`);
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
