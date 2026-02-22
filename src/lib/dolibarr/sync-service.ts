/**
 * Dolibarr Sync Service
 * 
 * Handles synchronization of data from Dolibarr ERP into OTS mirror tables.
 * - MD5 hash-based change detection
 * - Soft-delete for removed records
 * - Detailed sync logging
 * 
 * CRITICAL: Dolibarr dates are Unix timestamps in SECONDS (not ms).
 * All numeric fields come as strings from the API.
 */

import { createHash } from 'crypto';
import prisma from '@/lib/db';
import { DolibarrClient, DolibarrProduct, DolibarrThirdParty, DolibarrContact, createDolibarrClient } from './dolibarr-client';

// ============================================
// TYPES
// ============================================

export interface SyncResult {
  entityType: string;
  status: 'success' | 'error' | 'partial';
  created: number;
  updated: number;
  unchanged: number;
  deactivated: number;
  total: number;
  durationMs: number;
  error?: string;
}

export interface FullSyncResult {
  products?: SyncResult;
  thirdparties?: SyncResult;
  contacts?: SyncResult;
  totalDurationMs: number;
}

export interface SyncStatus {
  syncEnabled: boolean;
  syncIntervalMinutes: number;
  batchSize: number;
  lastProductsSync: string | null;
  lastThirdpartiesSync: string | null;
  lastContactsSync: string | null;
  lastFullSync: string | null;
  recordCounts: {
    products: { total: number; active: number; withSpecs: number };
    thirdparties: { total: number; active: number };
    contacts: { total: number; active: number };
  };
  recentLogs: any[];
  connectionStatus: { connected: boolean; version?: string; error?: string };
}

// ============================================
// HELPERS
// ============================================

function parseDolibarrDate(timestamp: number | string | null | undefined): Date | null {
  if (!timestamp) return null;
  const ts = typeof timestamp === 'string' ? parseInt(timestamp, 10) : timestamp;
  if (isNaN(ts) || ts === 0) return null;
  // Dolibarr timestamps are in SECONDS, not milliseconds
  return new Date(ts * 1000);
}

function parseFloat_(val: string | number | null | undefined): number | null {
  if (val === null || val === undefined || val === '') return null;
  const n = parseFloat(String(val));
  return isNaN(n) ? null : n;
}

function parseInt_(val: string | number | null | undefined): number | null {
  if (val === null || val === undefined || val === '') return null;
  const n = parseInt(String(val), 10);
  return isNaN(n) ? null : n;
}

function computeHash(fields: Record<string, any>): string {
  const str = JSON.stringify(fields, Object.keys(fields).sort());
  return createHash('md5').update(str).digest('hex');
}

function formatDateForMySQL(date: Date | null): string | null {
  if (!date) return null;
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

// ============================================
// SYNC SERVICE
// ============================================

export class DolibarrSyncService {
  private client: DolibarrClient;

  constructor(client?: DolibarrClient) {
    this.client = client || createDolibarrClient();
  }

  /**
   * Sync products from Dolibarr into dolibarr_products mirror table
   */
  async syncProducts(triggeredBy: string = 'manual'): Promise<SyncResult> {
    const startTime = Date.now();
    let created = 0, updated = 0, unchanged = 0, deactivated = 0;

    try {
      // Get batch size from config
      const batchSize = await this.getConfigValue('batch_size', 100);
      
      // Fetch all products from Dolibarr
      const dolibarrProducts = await this.client.getAllProducts(batchSize);
      const dolibarrIds = dolibarrProducts.map(p => parseInt_(p.id) || 0).filter(id => id > 0);

      // Get existing products from mirror table
      const existingRows: any[] = await prisma.$queryRawUnsafe(
        `SELECT dolibarr_id, sync_hash FROM dolibarr_products WHERE dolibarr_id IN (${dolibarrIds.length > 0 ? dolibarrIds.join(',') : '0'})`
      );
      const existingMap = new Map(existingRows.map((r: any) => [r.dolibarr_id, r.sync_hash]));

      // Process each product
      for (const product of dolibarrProducts) {
        const dolibarrId = parseInt_(product.id);
        if (!dolibarrId) continue;

        const hashFields = {
          ref: product.ref,
          label: product.label,
          description: product.description,
          type: product.type,
          status: product.status,
          status_buy: product.status_buy,
          price: product.price,
          price_ttc: product.price_ttc,
          pmp: product.pmp,
          weight: product.weight,
          stock_reel: product.stock_reel,
          date_modification: product.date_modification,
        };
        const newHash = computeHash(hashFields);

        const dolibarrCreated = formatDateForMySQL(parseDolibarrDate(product.date_creation));
        const dolibarrUpdated = formatDateForMySQL(parseDolibarrDate(product.date_modification));
        const extrafields = product.array_options ? JSON.stringify(product.array_options) : null;

        if (existingMap.has(dolibarrId)) {
          // Record exists — check if changed
          if (existingMap.get(dolibarrId) === newHash) {
            unchanged++;
            continue;
          }

          // Update changed record
          await prisma.$executeRawUnsafe(`
            UPDATE dolibarr_products SET
              ref = ?, label = ?, description = ?, product_type = ?, status_sell = ?, status_buy = ?,
              price = ?, price_ttc = ?, price_base_type = ?, tva_tx = ?, pmp = ?, cost_price_avg = ?,
              weight = ?, weight_units = ?, length = ?, length_units = ?,
              width = ?, width_units = ?, height = ?, height_units = ?,
              barcode = ?, barcode_type = ?,
              stock_reel = ?, seuil_stock_alerte = ?, desiredstock = ?,
              note_public = ?, note_private = ?,
              accountancy_code_sell = ?, accountancy_code_buy = ?,
              dolibarr_extrafields = ?,
              dolibarr_created_at = ?, dolibarr_updated_at = ?,
              last_synced_at = NOW(), sync_hash = ?, is_active = 1
            WHERE dolibarr_id = ?
          `,
            product.ref, product.label, product.description,
            parseInt_(product.type) ?? 0, parseInt_(product.status) ?? 0, parseInt_(product.status_buy) ?? 0,
            parseFloat_(product.price), parseFloat_(product.price_ttc),
            product.price_base_type || 'HT', parseFloat_(product.tva_tx),
            parseFloat_(product.pmp), parseFloat_(product.pmp),
            parseFloat_(product.weight), parseInt_(product.weight_units),
            parseFloat_(product.length), parseInt_(product.length_units),
            parseFloat_(product.width), parseInt_(product.width_units),
            parseFloat_(product.height), parseInt_(product.height_units),
            product.barcode || null, parseInt_(product.barcode_type),
            parseFloat_(product.stock_reel), parseFloat_(product.seuil_stock_alerte), parseFloat_(product.desiredstock),
            product.note_public, product.note_private,
            product.accountancy_code_sell, product.accountancy_code_buy,
            extrafields,
            dolibarrCreated, dolibarrUpdated,
            newHash, dolibarrId
          );
          updated++;
        } else {
          // Insert new record
          await prisma.$executeRawUnsafe(`
            INSERT INTO dolibarr_products (
              dolibarr_id, ref, label, description, product_type, status_sell, status_buy,
              price, price_ttc, price_base_type, tva_tx, pmp, cost_price_avg,
              weight, weight_units, length, length_units,
              width, width_units, height, height_units,
              barcode, barcode_type,
              stock_reel, seuil_stock_alerte, desiredstock,
              note_public, note_private,
              accountancy_code_sell, accountancy_code_buy,
              dolibarr_extrafields,
              dolibarr_created_at, dolibarr_updated_at,
              first_synced_at, last_synced_at, sync_hash, is_active
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), ?, 1)
          `,
            dolibarrId, product.ref, product.label, product.description,
            parseInt_(product.type) ?? 0, parseInt_(product.status) ?? 0, parseInt_(product.status_buy) ?? 0,
            parseFloat_(product.price), parseFloat_(product.price_ttc),
            product.price_base_type || 'HT', parseFloat_(product.tva_tx),
            parseFloat_(product.pmp), parseFloat_(product.pmp),
            parseFloat_(product.weight), parseInt_(product.weight_units),
            parseFloat_(product.length), parseInt_(product.length_units),
            parseFloat_(product.width), parseInt_(product.width_units),
            parseFloat_(product.height), parseInt_(product.height_units),
            product.barcode || null, parseInt_(product.barcode_type),
            parseFloat_(product.stock_reel), parseFloat_(product.seuil_stock_alerte), parseFloat_(product.desiredstock),
            product.note_public, product.note_private,
            product.accountancy_code_sell, product.accountancy_code_buy,
            extrafields,
            dolibarrCreated, dolibarrUpdated,
            newHash
          );
          created++;
        }
      }

      // Soft-delete products no longer in Dolibarr
      if (dolibarrIds.length > 0) {
        const deactivateResult: any = await prisma.$executeRawUnsafe(
          `UPDATE dolibarr_products SET is_active = 0, last_synced_at = NOW() WHERE is_active = 1 AND dolibarr_id NOT IN (${dolibarrIds.join(',')})`
        );
        deactivated = typeof deactivateResult === 'number' ? deactivateResult : 0;
      }

      const result: SyncResult = {
        entityType: 'products',
        status: 'success',
        created, updated, unchanged, deactivated,
        total: dolibarrProducts.length,
        durationMs: Date.now() - startTime,
      };

      await this.logSync(result, triggeredBy);
      await this.setConfigValue('last_products_sync', new Date().toISOString());
      return result;

    } catch (error: any) {
      const result: SyncResult = {
        entityType: 'products',
        status: 'error',
        created, updated, unchanged, deactivated,
        total: 0,
        durationMs: Date.now() - startTime,
        error: error.message,
      };
      await this.logSync(result, triggeredBy);
      return result;
    }
  }

  /**
   * Sync third parties from Dolibarr
   */
  async syncThirdParties(triggeredBy: string = 'manual'): Promise<SyncResult> {
    const startTime = Date.now();
    let created = 0, updated = 0, unchanged = 0, deactivated = 0;

    try {
      const batchSize = await this.getConfigValue('batch_size', 100);
      const dolibarrParties = await this.client.getAllThirdParties(batchSize);
      const dolibarrIds = dolibarrParties.map(p => parseInt_(p.id) || 0).filter(id => id > 0);

      const existingRows: any[] = await prisma.$queryRawUnsafe(
        `SELECT dolibarr_id, sync_hash FROM dolibarr_thirdparties WHERE dolibarr_id IN (${dolibarrIds.length > 0 ? dolibarrIds.join(',') : '0'})`
      );
      const existingMap = new Map(existingRows.map((r: any) => [r.dolibarr_id, r.sync_hash]));

      for (const party of dolibarrParties) {
        const dolibarrId = parseInt_(party.id);
        if (!dolibarrId) continue;

        const hashFields = {
          name: party.name,
          client: party.client,
          fournisseur: party.fournisseur,
          email: party.email,
          phone: party.phone,
          status: party.status,
          date_modification: party.date_modification,
        };
        const newHash = computeHash(hashFields);

        const dolibarrCreated = formatDateForMySQL(parseDolibarrDate(party.date_creation));
        const dolibarrUpdated = formatDateForMySQL(parseDolibarrDate(party.date_modification));

        if (existingMap.has(dolibarrId)) {
          if (existingMap.get(dolibarrId) === newHash) {
            unchanged++;
            continue;
          }

          await prisma.$executeRawUnsafe(`
            UPDATE dolibarr_thirdparties SET
              name = ?, name_alias = ?, client_type = ?, supplier_type = ?,
              code_client = ?, code_supplier = ?,
              email = ?, phone = ?, fax = ?, url = ?,
              address = ?, zip = ?, town = ?, state_code = ?, country_code = ?,
              tva_intra = ?, capital = ?, status = ?,
              note_public = ?, note_private = ?,
              dolibarr_created_at = ?, dolibarr_updated_at = ?,
              last_synced_at = NOW(), sync_hash = ?, is_active = 1
            WHERE dolibarr_id = ?
          `,
            party.name, party.name_alias,
            parseInt_(party.client) ?? 0, parseInt_(party.fournisseur) ?? 0,
            party.code_client, party.code_fournisseur,
            party.email, party.phone, party.fax, party.url,
            party.address, party.zip, party.town, party.state_code, party.country_code,
            party.tva_intra, parseFloat_(party.capital), parseInt_(party.status) ?? 1,
            party.note_public, party.note_private,
            dolibarrCreated, dolibarrUpdated,
            newHash, dolibarrId
          );
          updated++;
        } else {
          await prisma.$executeRawUnsafe(`
            INSERT INTO dolibarr_thirdparties (
              dolibarr_id, name, name_alias, client_type, supplier_type,
              code_client, code_supplier,
              email, phone, fax, url,
              address, zip, town, state_code, country_code,
              tva_intra, capital, status,
              note_public, note_private,
              dolibarr_created_at, dolibarr_updated_at,
              first_synced_at, last_synced_at, sync_hash, is_active
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), ?, 1)
          `,
            dolibarrId, party.name, party.name_alias,
            parseInt_(party.client) ?? 0, parseInt_(party.fournisseur) ?? 0,
            party.code_client, party.code_fournisseur,
            party.email, party.phone, party.fax, party.url,
            party.address, party.zip, party.town, party.state_code, party.country_code,
            party.tva_intra, parseFloat_(party.capital), parseInt_(party.status) ?? 1,
            party.note_public, party.note_private,
            dolibarrCreated, dolibarrUpdated,
            newHash
          );
          created++;
        }
      }

      if (dolibarrIds.length > 0) {
        const deactivateResult: any = await prisma.$executeRawUnsafe(
          `UPDATE dolibarr_thirdparties SET is_active = 0, last_synced_at = NOW() WHERE is_active = 1 AND dolibarr_id NOT IN (${dolibarrIds.join(',')})`
        );
        deactivated = typeof deactivateResult === 'number' ? deactivateResult : 0;
      }

      const result: SyncResult = {
        entityType: 'thirdparties',
        status: 'success',
        created, updated, unchanged, deactivated,
        total: dolibarrParties.length,
        durationMs: Date.now() - startTime,
      };

      await this.logSync(result, triggeredBy);
      await this.setConfigValue('last_thirdparties_sync', new Date().toISOString());
      return result;

    } catch (error: any) {
      const result: SyncResult = {
        entityType: 'thirdparties',
        status: 'error',
        created, updated, unchanged, deactivated,
        total: 0,
        durationMs: Date.now() - startTime,
        error: error.message,
      };
      await this.logSync(result, triggeredBy);
      return result;
    }
  }

  /**
   * Sync contacts from Dolibarr
   */
  async syncContacts(triggeredBy: string = 'manual'): Promise<SyncResult> {
    const startTime = Date.now();
    let created = 0, updated = 0, unchanged = 0, deactivated = 0;

    try {
      const batchSize = await this.getConfigValue('batch_size', 100);
      const dolibarrContacts = await this.client.getAllContacts(batchSize);
      const dolibarrIds = dolibarrContacts.map(c => parseInt_(c.id) || 0).filter(id => id > 0);

      const existingRows: any[] = await prisma.$queryRawUnsafe(
        `SELECT dolibarr_id, sync_hash FROM dolibarr_contacts WHERE dolibarr_id IN (${dolibarrIds.length > 0 ? dolibarrIds.join(',') : '0'})`
      );
      const existingMap = new Map(existingRows.map((r: any) => [r.dolibarr_id, r.sync_hash]));

      for (const contact of dolibarrContacts) {
        const dolibarrId = parseInt_(contact.id);
        if (!dolibarrId) continue;

        const hashFields = {
          firstname: contact.firstname,
          lastname: contact.lastname,
          email: contact.email,
          phone_pro: contact.phone_pro,
          phone_mobile: contact.phone_mobile,
          poste: contact.poste,
          date_modification: contact.date_modification,
        };
        const newHash = computeHash(hashFields);

        const dolibarrCreated = formatDateForMySQL(parseDolibarrDate(contact.date_creation));
        const dolibarrUpdated = formatDateForMySQL(parseDolibarrDate(contact.date_modification));
        const thirdpartyId = parseInt_(contact.socid);

        if (existingMap.has(dolibarrId)) {
          if (existingMap.get(dolibarrId) === newHash) {
            unchanged++;
            continue;
          }

          await prisma.$executeRawUnsafe(`
            UPDATE dolibarr_contacts SET
              dolibarr_thirdparty_id = ?, firstname = ?, lastname = ?,
              civility = ?, poste = ?,
              email = ?, phone_pro = ?, phone_mobile = ?,
              dolibarr_created_at = ?, dolibarr_updated_at = ?,
              last_synced_at = NOW(), sync_hash = ?, is_active = 1
            WHERE dolibarr_id = ?
          `,
            thirdpartyId, contact.firstname, contact.lastname,
            contact.civility_id, contact.poste,
            contact.email, contact.phone_pro, contact.phone_mobile,
            dolibarrCreated, dolibarrUpdated,
            newHash, dolibarrId
          );
          updated++;
        } else {
          await prisma.$executeRawUnsafe(`
            INSERT INTO dolibarr_contacts (
              dolibarr_id, dolibarr_thirdparty_id, firstname, lastname,
              civility, poste,
              email, phone_pro, phone_mobile,
              dolibarr_created_at, dolibarr_updated_at,
              first_synced_at, last_synced_at, sync_hash, is_active
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), ?, 1)
          `,
            dolibarrId, thirdpartyId, contact.firstname, contact.lastname,
            contact.civility_id, contact.poste,
            contact.email, contact.phone_pro, contact.phone_mobile,
            dolibarrCreated, dolibarrUpdated,
            newHash
          );
          created++;
        }
      }

      if (dolibarrIds.length > 0) {
        const deactivateResult: any = await prisma.$executeRawUnsafe(
          `UPDATE dolibarr_contacts SET is_active = 0, last_synced_at = NOW() WHERE is_active = 1 AND dolibarr_id NOT IN (${dolibarrIds.join(',')})`
        );
        deactivated = typeof deactivateResult === 'number' ? deactivateResult : 0;
      }

      const result: SyncResult = {
        entityType: 'contacts',
        status: 'success',
        created, updated, unchanged, deactivated,
        total: dolibarrContacts.length,
        durationMs: Date.now() - startTime,
      };

      await this.logSync(result, triggeredBy);
      await this.setConfigValue('last_contacts_sync', new Date().toISOString());
      return result;

    } catch (error: any) {
      const result: SyncResult = {
        entityType: 'contacts',
        status: 'error',
        created, updated, unchanged, deactivated,
        total: 0,
        durationMs: Date.now() - startTime,
        error: error.message,
      };
      await this.logSync(result, triggeredBy);
      return result;
    }
  }

  /**
   * Run full sync of all entity types sequentially
   */
  async runFullSync(triggeredBy: string = 'manual'): Promise<FullSyncResult> {
    const startTime = Date.now();

    const products = await this.syncProducts(triggeredBy);
    const thirdparties = await this.syncThirdParties(triggeredBy);
    const contacts = await this.syncContacts(triggeredBy);

    await this.setConfigValue('last_full_sync', new Date().toISOString());

    return {
      products,
      thirdparties,
      contacts,
      totalDurationMs: Date.now() - startTime,
    };
  }

  /**
   * Get comprehensive sync status
   */
  async getSyncStatus(): Promise<SyncStatus> {
    // Get config values
    const configRows: any[] = await prisma.$queryRawUnsafe(
      `SELECT config_key, config_value FROM dolibarr_integration_config`
    );
    const config = new Map(configRows.map((r: any) => [r.config_key, r.config_value]));

    // Get record counts
    const productCounts: any[] = await prisma.$queryRawUnsafe(
      `SELECT 
        COUNT(*) as total,
        SUM(is_active) as active,
        (SELECT COUNT(*) FROM steel_product_specs) as with_specs
      FROM dolibarr_products`
    );
    const thirdpartyCounts: any[] = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*) as total, SUM(is_active) as active FROM dolibarr_thirdparties`
    );
    const contactCounts: any[] = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*) as total, SUM(is_active) as active FROM dolibarr_contacts`
    );

    // Get recent sync logs
    const recentLogs: any[] = await prisma.$queryRawUnsafe(
      `SELECT * FROM dolibarr_sync_log ORDER BY created_at DESC LIMIT 10`
    );

    // Test connection
    let connectionStatus: { connected: boolean; version?: string; error?: string };
    try {
      const connInfo = await this.client.testConnection();
      connectionStatus = {
        connected: connInfo.success,
        version: connInfo.version,
        error: connInfo.error,
      };
    } catch (error: any) {
      connectionStatus = { connected: false, error: error.message };
    }

    const pc = productCounts[0] || { total: 0, active: 0, with_specs: 0 };
    const tc = thirdpartyCounts[0] || { total: 0, active: 0 };
    const cc = contactCounts[0] || { total: 0, active: 0 };

    return {
      syncEnabled: config.get('sync_enabled') === 'true',
      syncIntervalMinutes: parseInt(config.get('sync_interval_minutes') || '30', 10),
      batchSize: parseInt(config.get('batch_size') || '100', 10),
      lastProductsSync: config.get('last_products_sync') || null,
      lastThirdpartiesSync: config.get('last_thirdparties_sync') || null,
      lastContactsSync: config.get('last_contacts_sync') || null,
      lastFullSync: config.get('last_full_sync') || null,
      recordCounts: {
        products: {
          total: Number(pc.total) || 0,
          active: Number(pc.active) || 0,
          withSpecs: Number(pc.with_specs) || 0,
        },
        thirdparties: {
          total: Number(tc.total) || 0,
          active: Number(tc.active) || 0,
        },
        contacts: {
          total: Number(cc.total) || 0,
          active: Number(cc.active) || 0,
        },
      },
      recentLogs: recentLogs.map((log: any) => ({
        ...log,
        created_at: log.created_at?.toISOString?.() || log.created_at,
      })),
      connectionStatus,
    };
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  private async logSync(result: SyncResult, triggeredBy: string): Promise<void> {
    try {
      await prisma.$executeRawUnsafe(`
        INSERT INTO dolibarr_sync_log (
          entity_type, status, records_created, records_updated,
          records_unchanged, records_deactivated, total_records,
          duration_ms, error_message, triggered_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        result.entityType, result.status,
        result.created, result.updated,
        result.unchanged, result.deactivated,
        result.total, result.durationMs,
        result.error || null, triggeredBy
      );
    } catch (err) {
      console.error('[DolibarrSync] Failed to log sync result:', err);
    }
  }

  private async getConfigValue(key: string, defaultVal: number): Promise<number> {
    try {
      const rows: any[] = await prisma.$queryRawUnsafe(
        `SELECT config_value FROM dolibarr_integration_config WHERE config_key = ?`, key
      );
      if (rows.length > 0 && rows[0].config_value) {
        return parseInt(rows[0].config_value, 10) || defaultVal;
      }
    } catch { /* use default */ }
    return defaultVal;
  }

  private async setConfigValue(key: string, value: string): Promise<void> {
    try {
      await prisma.$executeRawUnsafe(
        `INSERT INTO dolibarr_integration_config (config_key, config_value) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE config_value = ?, updated_at = NOW()`,
        key, value, value
      );
    } catch (err) {
      console.error('[DolibarrSync] Failed to set config value:', err);
    }
  }
}
