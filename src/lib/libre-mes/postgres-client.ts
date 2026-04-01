/**
 * Minimal PostgreSQL client wrapper for Libre MES master data.
 * Uses the `pg` npm package (node-postgres).
 * Connection is lazy — the pool is only created when first used.
 */

import { Pool, type QueryResult, type QueryResultRow } from 'pg';

export interface LibreProductionOrder {
  id?: string;
  order_number: string;
  product_name: string;
  planned_quantity: number;
  planned_start: Date;
  planned_end: Date;
  status: string;
  site_id?: string;
  area_id?: string;
  line_id?: string;
  ots_work_order_id: string;
  created_at?: Date;
  updated_at?: Date;
}

let _pool: Pool | null = null;

function getPool(pgUrl: string): Pool {
  if (!_pool) {
    _pool = new Pool({ connectionString: pgUrl, max: 5, idleTimeoutMillis: 30000 });
  }
  return _pool;
}

export class LibrePgClient {
  private readonly pgUrl: string;

  constructor(pgUrl: string) {
    this.pgUrl = pgUrl;
  }

  private get pool(): Pool {
    return getPool(this.pgUrl);
  }

  async query<T extends QueryResultRow = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<QueryResult<T>> {
    return this.pool.query<T>(sql, params);
  }

  /** Upsert a production order using ots_work_order_id as natural key. */
  async upsertOrder(order: LibreProductionOrder): Promise<string> {
    const res = await this.pool.query<{ id: string }>(
      `INSERT INTO production_orders
         (order_number, product_name, planned_quantity, planned_start, planned_end,
          status, site_id, area_id, line_id, ots_work_order_id, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),NOW())
       ON CONFLICT (ots_work_order_id) DO UPDATE SET
         order_number    = EXCLUDED.order_number,
         product_name    = EXCLUDED.product_name,
         planned_quantity= EXCLUDED.planned_quantity,
         planned_start   = EXCLUDED.planned_start,
         planned_end     = EXCLUDED.planned_end,
         status          = EXCLUDED.status,
         updated_at      = NOW()
       RETURNING id`,
      [
        order.order_number,
        order.product_name,
        order.planned_quantity,
        order.planned_start,
        order.planned_end,
        order.status,
        order.site_id ?? null,
        order.area_id ?? null,
        order.line_id ?? null,
        order.ots_work_order_id,
      ]
    );
    return res.rows[0].id;
  }

  /** Health check — SELECT 1. */
  async ping(): Promise<boolean> {
    try {
      await this.pool.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  async disconnect(): Promise<void> {
    if (_pool) {
      await _pool.end();
      _pool = null;
    }
  }
}
