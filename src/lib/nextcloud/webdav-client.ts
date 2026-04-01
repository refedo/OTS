/**
 * Minimal WebDAV client for Nextcloud.
 * Uses native fetch — no external npm dependency.
 * Handles Basic Auth, PROPFIND XML parsing, MKCOL, PUT, DELETE, MOVE.
 */

export interface WebDavPropFindEntry {
  href: string;
  displayName: string;
  contentLength: number | null;
  contentType: string | null;
  etag: string | null;
  lastModified: Date | null;
  isCollection: boolean;
}

export class WebDavClient {
  private readonly baseUrl: string;
  private readonly authHeader: string;

  constructor(baseUrl: string, username: string, password: string) {
    // Remove trailing slash
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.authHeader = 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');
  }

  private headers(extra: Record<string, string> = {}): Record<string, string> {
    return { Authorization: this.authHeader, ...extra };
  }

  /** Ensure all directory segments exist (idempotent). */
  async mkdirp(remotePath: string): Promise<void> {
    this.assertSafePath(remotePath);
    const segments = remotePath.split('/').filter(Boolean);
    let current = '';
    for (const seg of segments) {
      current += `/${seg}`;
      const url = `${this.baseUrl}${current}`;
      const res = await fetch(url, { method: 'MKCOL', headers: this.headers() });
      // 201 = created, 405 = already exists — both are acceptable
      if (!res.ok && res.status !== 405) {
        throw new Error(`MKCOL ${current} failed: HTTP ${res.status}`);
      }
    }
  }

  /** Upload a file. Creates parent directories automatically. */
  async put(remotePath: string, buffer: Buffer, contentType: string): Promise<{ etag: string | null }> {
    this.assertSafePath(remotePath);
    const parentDir = remotePath.substring(0, remotePath.lastIndexOf('/'));
    if (parentDir) await this.mkdirp(parentDir);

    const url = `${this.baseUrl}${remotePath}`;
    const res = await fetch(url, {
      method: 'PUT',
      headers: this.headers({ 'Content-Type': contentType }),
      body: new Uint8Array(buffer),
    });

    if (!res.ok) {
      throw new Error(`PUT ${remotePath} failed: HTTP ${res.status}`);
    }

    return { etag: res.headers.get('ETag') };
  }

  /** Download a file as a Buffer. */
  async get(remotePath: string): Promise<{ buffer: Buffer; contentType: string | null; contentLength: number | null }> {
    this.assertSafePath(remotePath);
    const url = `${this.baseUrl}${remotePath}`;
    const res = await fetch(url, { headers: this.headers() });

    if (!res.ok) {
      throw new Error(`GET ${remotePath} failed: HTTP ${res.status}`);
    }

    const arrayBuffer = await res.arrayBuffer();
    return {
      buffer: Buffer.from(arrayBuffer),
      contentType: res.headers.get('Content-Type'),
      contentLength: res.headers.get('Content-Length') ? parseInt(res.headers.get('Content-Length')!) : null,
    };
  }

  /** Delete a file or directory. */
  async delete(remotePath: string): Promise<void> {
    this.assertSafePath(remotePath);
    const url = `${this.baseUrl}${remotePath}`;
    const res = await fetch(url, { method: 'DELETE', headers: this.headers() });
    if (!res.ok && res.status !== 404) {
      throw new Error(`DELETE ${remotePath} failed: HTTP ${res.status}`);
    }
  }

  /** List directory contents via PROPFIND depth=1. */
  async propfind(remotePath: string): Promise<WebDavPropFindEntry[]> {
    this.assertSafePath(remotePath);
    const url = `${this.baseUrl}${remotePath}`;
    const res = await fetch(url, {
      method: 'PROPFIND',
      headers: this.headers({ Depth: '1', 'Content-Type': 'application/xml' }),
      body: `<?xml version="1.0"?><d:propfind xmlns:d="DAV:"><d:prop><d:displayname/><d:getcontentlength/><d:getcontenttype/><d:getetag/><d:getlastmodified/><d:resourcetype/></d:prop></d:propfind>`,
    });

    if (!res.ok) {
      throw new Error(`PROPFIND ${remotePath} failed: HTTP ${res.status}`);
    }

    const xml = await res.text();
    return this.parsePropfindResponse(xml);
  }

  private parsePropfindResponse(xml: string): WebDavPropFindEntry[] {
    const entries: WebDavPropFindEntry[] = [];
    const responsePattern = /<[^:]*:response[^>]*>([\s\S]*?)<\/[^:]*:response>/gi;
    let match: RegExpExecArray | null;

    while ((match = responsePattern.exec(xml)) !== null) {
      const block = match[1];
      const get = (tag: string): string | null => {
        const m = new RegExp(`<[^:]*:${tag}[^>]*>([^<]*)<\/[^:]*:${tag}>`, 'i').exec(block);
        return m ? m[1].trim() : null;
      };

      const hrefMatch = /<[^:]*:href[^>]*>([^<]*)<\/[^:]*:href>/i.exec(block);
      const href = hrefMatch ? decodeURIComponent(hrefMatch[1].trim()) : '';
      const isCollection = /<[^:]*:collection\s*\/>/i.test(block);
      const contentLengthRaw = get('getcontentlength');
      const lastModifiedRaw = get('getlastmodified');

      entries.push({
        href,
        displayName: get('displayname') ?? href.split('/').filter(Boolean).pop() ?? '',
        contentLength: contentLengthRaw ? parseInt(contentLengthRaw) : null,
        contentType: get('getcontenttype'),
        etag: get('getetag')?.replace(/"/g, '') ?? null,
        lastModified: lastModifiedRaw ? new Date(lastModifiedRaw) : null,
        isCollection,
      });
    }

    return entries;
  }

  private assertSafePath(remotePath: string): void {
    if (remotePath.includes('..')) {
      throw new Error(`Path traversal detected in remotePath: ${remotePath}`);
    }
    if (!remotePath.startsWith('/')) {
      throw new Error(`remotePath must start with /: ${remotePath}`);
    }
  }
}
