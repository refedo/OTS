import { NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';

const patchSchema = z.object({
  integration: z.enum(['openAudit', 'nextcloud', 'libreMes']),
  enabled: z.boolean(),
});

export const GET = withApiContext(async (): Promise<NextResponse<unknown>> => {
  const settings = await prisma.systemSettings.findFirst({
    select: { openAuditEnabled: true, nextcloudEnabled: true, libreMesEnabled: true },
  });

  return NextResponse.json({
    openAudit: {
      enabled: settings?.openAuditEnabled ?? false,
      configured: Boolean(env.OPEN_AUDIT_API_URL && env.OPEN_AUDIT_API_KEY),
      vars: {
        OPEN_AUDIT_API_URL: Boolean(env.OPEN_AUDIT_API_URL),
        OPEN_AUDIT_API_KEY: Boolean(env.OPEN_AUDIT_API_KEY),
      },
    },
    nextcloud: {
      enabled: settings?.nextcloudEnabled ?? false,
      configured: Boolean(env.NEXTCLOUD_BASE_URL && env.NEXTCLOUD_USERNAME && env.NEXTCLOUD_APP_PASSWORD),
      vars: {
        NEXTCLOUD_BASE_URL: Boolean(env.NEXTCLOUD_BASE_URL),
        NEXTCLOUD_USERNAME: Boolean(env.NEXTCLOUD_USERNAME),
        NEXTCLOUD_APP_PASSWORD: Boolean(env.NEXTCLOUD_APP_PASSWORD),
        NEXTCLOUD_ROOT_PATH: Boolean(env.NEXTCLOUD_ROOT_PATH),
      },
    },
    libreMes: {
      enabled: settings?.libreMesEnabled ?? false,
      configured: Boolean(env.LIBRE_MES_INFLUX_URL && env.LIBRE_MES_INFLUX_TOKEN && env.LIBRE_MES_PG_URL),
      vars: {
        LIBRE_MES_INFLUX_URL: Boolean(env.LIBRE_MES_INFLUX_URL),
        LIBRE_MES_INFLUX_TOKEN: Boolean(env.LIBRE_MES_INFLUX_TOKEN),
        LIBRE_MES_INFLUX_ORG: Boolean(env.LIBRE_MES_INFLUX_ORG),
        LIBRE_MES_INFLUX_BUCKET_AVAILABILITY: Boolean(env.LIBRE_MES_INFLUX_BUCKET_AVAILABILITY),
        LIBRE_MES_INFLUX_BUCKET_PERFORMANCE: Boolean(env.LIBRE_MES_INFLUX_BUCKET_PERFORMANCE),
        LIBRE_MES_INFLUX_BUCKET_QUALITY: Boolean(env.LIBRE_MES_INFLUX_BUCKET_QUALITY),
        LIBRE_MES_INFLUX_BUCKET_ORDER_PERF: Boolean(env.LIBRE_MES_INFLUX_BUCKET_ORDER_PERF),
        LIBRE_MES_PG_URL: Boolean(env.LIBRE_MES_PG_URL),
      },
    },
  });
});

export const PATCH = withApiContext(async (req, session) => {
  if (!['Admin', 'Manager'].includes(session!.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body: unknown = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }

  const { integration, enabled } = parsed.data;

  const fieldMap = {
    openAudit: 'openAuditEnabled',
    nextcloud: 'nextcloudEnabled',
    libreMes: 'libreMesEnabled',
  } as const;

  const field = fieldMap[integration];

  const existing = await prisma.systemSettings.findFirst({ select: { id: true } });

  if (existing) {
    await prisma.systemSettings.update({
      where: { id: existing.id },
      data: { [field]: enabled },
    });
  } else {
    await prisma.systemSettings.create({
      data: { [field]: enabled },
    });
  }

  logger.info({ integration, enabled, userId: session!.userId }, '[Settings] Integration toggle updated');

  return NextResponse.json({ integration, enabled });
});
