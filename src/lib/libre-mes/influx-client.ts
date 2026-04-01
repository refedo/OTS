/**
 * Minimal InfluxDB v2 client for Libre MES.
 * Uses native fetch with Bearer token auth and Flux query language.
 */

export interface InfluxMetricRow {
  time: Date;
  measurement: string;
  field: string;
  value: number | string | boolean;
  tags: Record<string, string>;
}

export interface InfluxWritePoint {
  measurement: string;
  tags: Record<string, string>;
  fields: Record<string, number | string | boolean>;
  timestamp?: Date;
}

export class InfluxClient {
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly org: string;

  constructor(baseUrl: string, token: string, org: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.token = token;
    this.org = org;
  }

  private get authHeader(): string {
    return `Bearer ${this.token}`;
  }

  /**
   * Execute a Flux query and return parsed rows.
   */
  async query(fluxQuery: string): Promise<InfluxMetricRow[]> {
    const url = `${this.baseUrl}/api/v2/query?org=${encodeURIComponent(this.org)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: this.authHeader,
        'Content-Type': 'application/vnd.flux',
        Accept: 'application/csv',
      },
      body: fluxQuery,
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`InfluxDB query failed: HTTP ${res.status} — ${body.slice(0, 200)}`);
    }

    const csv = await res.text();
    return this.parseCsvResponse(csv);
  }

  /**
   * Write data points to an InfluxDB bucket using line protocol.
   */
  async write(bucket: string, points: InfluxWritePoint[]): Promise<void> {
    if (points.length === 0) return;

    const lines = points.map((p) => {
      const tags = Object.entries(p.tags)
        .map(([k, v]) => `${this.escape(k)}=${this.escape(v)}`)
        .join(',');
      const fields = Object.entries(p.fields)
        .map(([k, v]) => `${this.escape(k)}=${this.formatFieldValue(v)}`)
        .join(',');
      const ts = p.timestamp ? Math.floor(p.timestamp.getTime() * 1e6) : '';
      return `${this.escape(p.measurement)}${tags ? `,${tags}` : ''} ${fields}${ts ? ` ${ts}` : ''}`;
    });

    const url = `${this.baseUrl}/api/v2/write?org=${encodeURIComponent(this.org)}&bucket=${encodeURIComponent(bucket)}&precision=ns`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: this.authHeader, 'Content-Type': 'text/plain; charset=utf-8' },
      body: lines.join('\n'),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`InfluxDB write failed: HTTP ${res.status} — ${body.slice(0, 200)}`);
    }
  }

  /**
   * Ping the InfluxDB health endpoint.
   */
  async ping(): Promise<boolean> {
    const res = await fetch(`${this.baseUrl}/health`, {
      headers: { Authorization: this.authHeader },
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  }

  private parseCsvResponse(csv: string): InfluxMetricRow[] {
    const rows: InfluxMetricRow[] = [];
    const lines = csv.split('\n').filter((l) => l.trim() && !l.startsWith('#'));
    if (lines.length < 2) return rows;

    const headers = lines[0].split(',');
    const timeIdx = headers.indexOf('_time');
    const measurementIdx = headers.indexOf('_measurement');
    const fieldIdx = headers.indexOf('_field');
    const valueIdx = headers.indexOf('_value');

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',');
      if (cols.length < headers.length) continue;

      const tags: Record<string, string> = {};
      headers.forEach((h, idx) => {
        if (h && !h.startsWith('_') && idx !== 0) {
          tags[h] = cols[idx] ?? '';
        }
      });

      const rawValue = cols[valueIdx] ?? '';
      const numValue = parseFloat(rawValue);
      const value: number | string | boolean = !isNaN(numValue) ? numValue : rawValue;

      rows.push({
        time: new Date(cols[timeIdx] ?? ''),
        measurement: cols[measurementIdx] ?? '',
        field: cols[fieldIdx] ?? '',
        value,
        tags,
      });
    }

    return rows;
  }

  private escape(s: string): string {
    return s.replace(/[, =]/g, '\\$&');
  }

  private formatFieldValue(v: number | string | boolean): string {
    if (typeof v === 'boolean') return v ? 'true' : 'false';
    if (typeof v === 'number') return String(v);
    return `"${v.replace(/"/g, '\\"')}"`;
  }
}
