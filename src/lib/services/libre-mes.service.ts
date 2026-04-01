/**
 * Libre MES Service
 *
 * Bidirectional integration with Libre Manufacturing Execution System (Spruik/Libre).
 * - Pushes WorkOrders to Libre MES PostgreSQL as production orders.
 * - Pulls OEE / production metrics back from InfluxDB buckets.
 *
 * Enable via LIBRE_MES_ENABLED=true plus LIBRE_MES_INFLUX_* and LIBRE_MES_PG_URL vars.
 */

import prisma from '@/lib/db';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import { InfluxClient } from '@/lib/libre-mes/influx-client';
import { LibrePgClient } from '@/lib/libre-mes/postgres-client';

export interface OrderPushResult {
  workOrderId: string;
  libreOrderId: string | null;
  status: 'synced' | 'failed';
  error?: string;
}

export interface MetricPullResult {
  bucket: string;
  snapshotsInserted: number;
  error?: string;
}

export interface FullSyncResult {
  orderPushResults: OrderPushResult[];
  metricPullResults: MetricPullResult[];
  syncLogId: string;
  durationMs: number;
}

class LibreMesService {
  private get enabled(): boolean {
    return env.LIBRE_MES_ENABLED === 'true';
  }

  private getInfluxClient(): InfluxClient {
    const url = env.LIBRE_MES_INFLUX_URL;
    const token = env.LIBRE_MES_INFLUX_TOKEN;
    const org = env.LIBRE_MES_INFLUX_ORG;
    if (!url || !token || !org) throw new Error('Libre MES InfluxDB not configured');
    return new InfluxClient(url, token, org);
  }

  private getPgClient(): LibrePgClient {
    const pgUrl = env.LIBRE_MES_PG_URL;
    if (!pgUrl) throw new Error('Libre MES PostgreSQL not configured (LIBRE_MES_PG_URL)');
    return new LibrePgClient(pgUrl);
  }

  /**
   * Push a list of WorkOrders to Libre MES PostgreSQL.
   * Maps OTS WorkOrder → Libre production_orders table.
   * Updates LibreMesOrderSync rows accordingly.
   */
  async pushOrders(workOrderIds: string[]): Promise<OrderPushResult[]> {
    if (!this.enabled) return [];
    const results: OrderPushResult[] = [];

    let pg: LibrePgClient;
    try {
      pg = this.getPgClient();
    } catch (err) {
      logger.error({ err }, '[LibreMES] PostgreSQL not configured');
      return workOrderIds.map((id) => ({ workOrderId: id, libreOrderId: null, status: 'failed', error: 'PG not configured' }));
    }

    const workOrders = await prisma.workOrder.findMany({
      where: { id: { in: workOrderIds } },
      include: {
        project: { select: { projectNumber: true, name: true } },
        building: { select: { designation: true } },
      },
    });

    for (const wo of workOrders) {
      try {
        const libreOrderId = await pg.upsertOrder({
          order_number: wo.workOrderNumber,
          product_name: `${wo.project.projectNumber} — ${wo.building.designation}`,
          planned_quantity: Math.round(Number(wo.totalWeight) ?? 0),
          planned_start: wo.plannedStartDate,
          planned_end: wo.plannedEndDate,
          status: wo.status,
          ots_work_order_id: wo.id,
        });

        await prisma.libreMesOrderSync.upsert({
          where: { workOrderId: wo.id },
          create: { workOrderId: wo.id, libreOrderId, syncStatus: 'synced', lastSyncAt: new Date() },
          update: { libreOrderId, syncStatus: 'synced', lastSyncAt: new Date(), errorMessage: null },
        });

        results.push({ workOrderId: wo.id, libreOrderId, status: 'synced' });
        logger.info({ workOrderId: wo.id, libreOrderId }, '[LibreMES] Order pushed');
      } catch (err) {
        const error = err instanceof Error ? err.message : 'Unknown error';
        logger.error({ err, workOrderId: wo.id }, '[LibreMES] Order push failed');

        await prisma.libreMesOrderSync.upsert({
          where: { workOrderId: wo.id },
          create: { workOrderId: wo.id, libreOrderId: null, syncStatus: 'failed', errorMessage: error },
          update: { syncStatus: 'failed', errorMessage: error, lastSyncAt: new Date() },
        }).catch(() => {});

        results.push({ workOrderId: wo.id, libreOrderId: null, status: 'failed', error });
      }
    }

    return results;
  }

  /**
   * Query all configured InfluxDB buckets for the given time window and
   * persist new rows into LibreMesMetricSnapshot.
   */
  async pullMetrics(params: { from: Date; to: Date; workOrderIds?: string[] }): Promise<MetricPullResult[]> {
    if (!this.enabled) return [];

    let influx: InfluxClient;
    try {
      influx = this.getInfluxClient();
    } catch (err) {
      logger.error({ err }, '[LibreMES] InfluxDB not configured');
      return [{ bucket: 'all', snapshotsInserted: 0, error: 'InfluxDB not configured' }];
    }

    const buckets = [
      { key: 'LIBRE_MES_INFLUX_BUCKET_AVAILABILITY' as const, name: 'availability' },
      { key: 'LIBRE_MES_INFLUX_BUCKET_PERFORMANCE' as const, name: 'performance' },
      { key: 'LIBRE_MES_INFLUX_BUCKET_QUALITY' as const, name: 'quality' },
      { key: 'LIBRE_MES_INFLUX_BUCKET_ORDER_PERF' as const, name: 'orderPerformance' },
    ];

    const results: MetricPullResult[] = [];
    const fromStr = params.from.toISOString();
    const toStr = params.to.toISOString();

    for (const bucket of buckets) {
      const bucketName = env[bucket.key];
      if (!bucketName) {
        results.push({ bucket: bucket.name, snapshotsInserted: 0, error: `${bucket.key} not configured` });
        continue;
      }

      try {
        const fluxQuery = [
          `from(bucket: "${bucketName}")`,
          `  |> range(start: ${fromStr}, stop: ${toStr})`,
          `  |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")`,
        ].join('\n');

        const rows = await influx.query(fluxQuery);
        let inserted = 0;

        for (const row of rows) {
          const tags = row.tags;
          const otsOrderId = tags['ots_work_order_id'] ?? null;

          if (params.workOrderIds && otsOrderId && !params.workOrderIds.includes(otsOrderId)) continue;

          const fieldVal = (name: string): number | null => {
            const v = parseFloat(String(row.value));
            return row.field === name && !isNaN(v) ? v : null;
          };

          await prisma.libreMesMetricSnapshot.create({
            data: {
              workOrderId: otsOrderId,
              libreOrderId: tags['order_id'] ?? null,
              influxBucket: bucket.name,
              influxMeasure: row.measurement,
              availability: bucket.name === 'availability' ? (fieldVal('availability') ?? undefined) : undefined,
              performance: bucket.name === 'performance' ? (fieldVal('performance') ?? undefined) : undefined,
              quality: bucket.name === 'quality' ? (fieldVal('quality') ?? undefined) : undefined,
              oee: fieldVal('oee') ?? undefined,
              plannedQty: fieldVal('planned_qty') ? Math.round(fieldVal('planned_qty')!) : undefined,
              actualQty: fieldVal('actual_qty') ? Math.round(fieldVal('actual_qty')!) : undefined,
              scrapQty: fieldVal('scrap_qty') ? Math.round(fieldVal('scrap_qty')!) : undefined,
              periodStart: row.time,
              periodEnd: params.to,
              rawPayload: { tags, field: row.field, value: row.value },
            },
          }).catch(() => {}); // ignore duplicate key errors

          inserted++;
        }

        results.push({ bucket: bucket.name, snapshotsInserted: inserted });
      } catch (err) {
        const error = err instanceof Error ? err.message : 'Unknown error';
        logger.error({ err, bucket: bucket.name }, '[LibreMES] Metric pull failed');
        results.push({ bucket: bucket.name, snapshotsInserted: 0, error });
      }
    }

    return results;
  }

  /**
   * Run a full push + pull cycle and write a LibreMesSyncLog entry.
   */
  async fullSync(triggeredBy: 'manual' | 'cron', userId?: string): Promise<FullSyncResult> {
    const started = Date.now();

    const pendingOrders = await prisma.libreMesOrderSync.findMany({
      where: { syncStatus: { in: ['pending', 'stale', 'failed'] } },
      select: { workOrderId: true },
    });

    const unsyncedOrders = await prisma.workOrder.findMany({
      where: { libreSync: null },
      select: { id: true },
    });

    const allIds = [
      ...new Set([
        ...pendingOrders.map((r) => r.workOrderId),
        ...unsyncedOrders.map((r) => r.id),
      ]),
    ];

    const orderPushResults = await this.pushOrders(allIds);

    const to = new Date();
    const from = new Date(to.getTime() - 24 * 60 * 60 * 1000); // last 24h
    const metricPullResults = await this.pullMetrics({ from, to });

    const durationMs = Date.now() - started;
    const hasFailure = orderPushResults.some((r) => r.status === 'failed') ||
      metricPullResults.some((r) => r.error);

    const syncLog = await prisma.libreMesSyncLog.create({
      data: {
        operation: 'full_sync',
        status: hasFailure ? 'partial' : 'success',
        ordersTotal: allIds.length,
        ordersSynced: orderPushResults.filter((r) => r.status === 'synced').length,
        metricsTotal: metricPullResults.reduce((sum, r) => sum + r.snapshotsInserted, 0),
        durationMs,
        triggeredBy,
        userId: userId ?? null,
      },
      select: { id: true },
    });

    return { orderPushResults, metricPullResults, syncLogId: syncLog.id, durationMs };
  }

  /**
   * Return current sync status and recent logs.
   */
  async getSyncStatus() {
    const [lastSync, pendingOrders, failedOrders, recentLogs] = await Promise.all([
      prisma.libreMesSyncLog.findFirst({ orderBy: { createdAt: 'desc' } }),
      prisma.libreMesOrderSync.count({ where: { syncStatus: 'pending' } }),
      prisma.libreMesOrderSync.count({ where: { syncStatus: 'failed' } }),
      prisma.libreMesSyncLog.findMany({ orderBy: { createdAt: 'desc' }, take: 10 }),
    ]);

    return { lastSync, pendingOrders, failedOrders, recentLogs };
  }

  /**
   * Health check — ping both InfluxDB and PostgreSQL independently.
   */
  async checkHealth() {
    const influxResult: { ok: boolean; latencyMs: number; error?: string } = { ok: false, latencyMs: 0 };
    const pgResult: { ok: boolean; latencyMs: number; error?: string } = { ok: false, latencyMs: 0 };

    // InfluxDB
    const influxStart = Date.now();
    try {
      const influx = this.getInfluxClient();
      const ok = await influx.ping();
      influxResult.ok = ok;
      influxResult.latencyMs = Date.now() - influxStart;
    } catch (err) {
      influxResult.latencyMs = Date.now() - influxStart;
      influxResult.error = err instanceof Error ? err.message : 'Unknown';
    }

    // PostgreSQL
    const pgStart = Date.now();
    try {
      const pg = this.getPgClient();
      const ok = await pg.ping();
      pgResult.ok = ok;
      pgResult.latencyMs = Date.now() - pgStart;
    } catch (err) {
      pgResult.latencyMs = Date.now() - pgStart;
      pgResult.error = err instanceof Error ? err.message : 'Unknown';
    }

    return { influx: influxResult, postgres: pgResult };
  }
}

export const libreMesService = new LibreMesService();
