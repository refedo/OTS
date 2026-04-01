import { NextResponse } from 'next/server';
import { withApiContext } from '@/lib/api-utils';
import { env } from '@/lib/env';

export const GET = withApiContext(async (): Promise<NextResponse<unknown>> => {
  return NextResponse.json({
    openAudit: {
      enabled: env.OPEN_AUDIT_ENABLED === 'true',
      configured: Boolean(env.OPEN_AUDIT_API_URL && env.OPEN_AUDIT_API_KEY),
      vars: {
        OPEN_AUDIT_ENABLED: Boolean(env.OPEN_AUDIT_ENABLED),
        OPEN_AUDIT_API_URL: Boolean(env.OPEN_AUDIT_API_URL),
        OPEN_AUDIT_API_KEY: Boolean(env.OPEN_AUDIT_API_KEY),
      },
    },
    nextcloud: {
      enabled: env.NEXTCLOUD_ENABLED === 'true',
      configured: Boolean(env.NEXTCLOUD_BASE_URL && env.NEXTCLOUD_USERNAME && env.NEXTCLOUD_APP_PASSWORD),
      vars: {
        NEXTCLOUD_ENABLED: Boolean(env.NEXTCLOUD_ENABLED),
        NEXTCLOUD_BASE_URL: Boolean(env.NEXTCLOUD_BASE_URL),
        NEXTCLOUD_USERNAME: Boolean(env.NEXTCLOUD_USERNAME),
        NEXTCLOUD_APP_PASSWORD: Boolean(env.NEXTCLOUD_APP_PASSWORD),
        NEXTCLOUD_ROOT_PATH: Boolean(env.NEXTCLOUD_ROOT_PATH),
      },
    },
    libreMes: {
      enabled: env.LIBRE_MES_ENABLED === 'true',
      configured: Boolean(env.LIBRE_MES_INFLUX_URL && env.LIBRE_MES_INFLUX_TOKEN && env.LIBRE_MES_PG_URL),
      vars: {
        LIBRE_MES_ENABLED: Boolean(env.LIBRE_MES_ENABLED),
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
