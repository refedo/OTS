/**
 * Nextcloud Service
 *
 * Provides document & file management backed by Nextcloud WebDAV.
 * Enable via NEXTCLOUD_ENABLED=true + NEXTCLOUD_BASE_URL + NEXTCLOUD_USERNAME + NEXTCLOUD_APP_PASSWORD.
 *
 * When disabled, the service returns descriptive errors so callers
 * can fall back to local storage gracefully.
 */

import prisma from '@/lib/db';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import { WebDavClient } from '@/lib/nextcloud/webdav-client';

export interface UploadResult {
  remotePath: string;
  fileSize: number;
  etag: string | null;
  nextcloudFileId: string;
  shareUrl?: string;
}

export interface DownloadResult {
  buffer: Buffer;
  mimeType: string | null;
  fileName: string;
  fileSize: number | null;
}

export interface ShareResult {
  shareToken: string;
  shareUrl: string;
  expiresAt?: Date;
}

class NextcloudService {
  private get enabled(): boolean {
    return env.NEXTCLOUD_ENABLED === 'true';
  }

  private get client(): WebDavClient {
    const base = env.NEXTCLOUD_BASE_URL;
    const user = env.NEXTCLOUD_USERNAME;
    const pass = env.NEXTCLOUD_APP_PASSWORD;

    if (!base || !user || !pass) {
      throw new Error('Nextcloud not configured: NEXTCLOUD_BASE_URL, NEXTCLOUD_USERNAME, and NEXTCLOUD_APP_PASSWORD are required');
    }

    const davRoot = `${base.replace(/\/$/, '')}/remote.php/dav/files/${encodeURIComponent(user)}`;
    return new WebDavClient(davRoot, user, pass);
  }

  private get rootPath(): string {
    return (env.NEXTCLOUD_ROOT_PATH ?? '/OTS').replace(/\/$/, '');
  }

  /**
   * Upload a file to Nextcloud under {rootPath}/{entityType}/{entityId}/{fileName}.
   * Creates a NextcloudFile row and returns its ID.
   */
  async upload(params: {
    buffer: Buffer;
    fileName: string;
    mimeType: string;
    entityType: string;
    entityId: string;
    uploadedById: string;
  }): Promise<UploadResult> {
    if (!this.enabled) throw new Error('Nextcloud is not enabled');

    const { buffer, fileName, mimeType, entityType, entityId, uploadedById } = params;

    // Sanitize fileName — keep only safe characters
    const safeFileName = fileName.replace(/[^a-zA-Z0-9._\-() ]/g, '_');
    const remotePath = `${this.rootPath}/${entityType}/${entityId}/${safeFileName}`;

    const { etag } = await this.client.put(remotePath, buffer, mimeType);

    const row = await prisma.nextcloudFile.create({
      data: {
        remotePath,
        fileName: safeFileName,
        fileSize: buffer.length,
        mimeType,
        etag,
        entityType,
        entityId,
        uploadedById,
      },
      select: { id: true },
    });

    logger.info({ remotePath, entityType, entityId }, '[Nextcloud] File uploaded');
    return { remotePath, fileSize: buffer.length, etag, nextcloudFileId: row.id };
  }

  /**
   * Download a file from Nextcloud by its remote path.
   */
  async download(remotePath: string): Promise<DownloadResult> {
    if (!this.enabled) throw new Error('Nextcloud is not enabled');

    const row = await prisma.nextcloudFile.findFirst({
      where: { remotePath },
      select: { fileName: true, mimeType: true, fileSize: true },
    });

    const { buffer, contentType, contentLength } = await this.client.get(remotePath);

    return {
      buffer,
      mimeType: row?.mimeType ?? contentType,
      fileName: row?.fileName ?? remotePath.split('/').pop() ?? 'file',
      fileSize: row?.fileSize ?? contentLength,
    };
  }

  /**
   * Delete a file from Nextcloud and remove the NextcloudFile row.
   */
  async delete(remotePath: string): Promise<void> {
    if (!this.enabled) throw new Error('Nextcloud is not enabled');

    await this.client.delete(remotePath);
    await prisma.nextcloudFile.deleteMany({ where: { remotePath } });
    logger.info({ remotePath }, '[Nextcloud] File deleted');
  }

  /**
   * List all NextcloudFile rows for a given entity.
   */
  async listForEntity(entityType: string, entityId: string) {
    return prisma.nextcloudFile.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Create an OCS share link and persist it on the NextcloudFile row.
   * shareType: 0 = public link, 3 = public link with password.
   */
  async share(params: {
    remotePath: string;
    shareType?: 0 | 3;
    password?: string;
    expiresAt?: Date;
  }): Promise<ShareResult> {
    if (!this.enabled) throw new Error('Nextcloud is not enabled');

    const base = env.NEXTCLOUD_BASE_URL;
    const user = env.NEXTCLOUD_USERNAME;
    const pass = env.NEXTCLOUD_APP_PASSWORD;

    if (!base || !user || !pass) {
      throw new Error('Nextcloud credentials not configured');
    }

    const { remotePath, shareType = 0, password, expiresAt } = params;

    const authHeader = 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64');
    const body = new URLSearchParams({
      path: remotePath,
      shareType: String(shareType),
      ...(password && { password }),
      ...(expiresAt && { expireDate: expiresAt.toISOString().split('T')[0] }),
    });

    const res = await fetch(`${base}/ocs/v2.php/apps/files_sharing/api/v1/shares?format=json`, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'OCS-APIRequest': 'true',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Nextcloud share creation failed: HTTP ${res.status} — ${text.slice(0, 200)}`);
    }

    const json = await res.json() as { ocs?: { data?: { token?: string; url?: string } } };
    const token = json?.ocs?.data?.token ?? '';
    const shareUrl = json?.ocs?.data?.url ?? `${base}/s/${token}`;

    await prisma.nextcloudFile.updateMany({
      where: { remotePath },
      data: { shareToken: token, shareUrl, shareExpiresAt: expiresAt ?? null },
    });

    logger.info({ remotePath, shareUrl }, '[Nextcloud] Share created');
    return { shareToken: token, shareUrl, expiresAt };
  }

  /**
   * PROPFIND root path to confirm the WebDAV endpoint is reachable.
   */
  async checkHealth(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
    if (!this.enabled || !env.NEXTCLOUD_BASE_URL) {
      return { ok: false, latencyMs: 0, error: 'Nextcloud not configured' };
    }

    const start = Date.now();
    try {
      await this.client.propfind(this.rootPath);
      return { ok: true, latencyMs: Date.now() - start };
    } catch (err) {
      return { ok: false, latencyMs: Date.now() - start, error: err instanceof Error ? err.message : 'Unknown' };
    }
  }
}

export const nextcloudService = new NextcloudService();
