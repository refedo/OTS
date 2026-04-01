/**
 * Environment Variable Validation
 *
 * Validates required env vars at startup (fail-fast pattern).
 * Import from here instead of accessing process.env directly.
 *
 * Usage:
 *   import { env } from '@/lib/env'
 *   const url = env.DATABASE_URL
 */

interface EnvConfig {
  // Required
  DATABASE_URL: string;
  JWT_SECRET: string;

  // Optional with defaults
  NODE_ENV: 'development' | 'production' | 'test';
  COOKIE_NAME: string;
  NEXT_PUBLIC_APP_URL: string;
  LOG_LEVEL: string;

  // Optional — may be undefined
  OPENAI_API_KEY: string | undefined;
  DOLIBARR_API_URL: string | undefined;
  DOLIBARR_API_KEY: string | undefined;
  DOLIBARR_API_TIMEOUT: string | undefined;
  DOLIBARR_API_RETRIES: string | undefined;
  CRON_SECRET: string | undefined;
  NEXT_PUBLIC_BASE_PATH: string | undefined;
  ENABLE_RISK_SCHEDULER: string | undefined;
  GOOGLE_SHEETS_CREDENTIALS: string | undefined;

  // Push notifications (VAPID keys)
  VAPID_PUBLIC_KEY: string | undefined;
  VAPID_PRIVATE_KEY: string | undefined;
  VAPID_SUBJECT: string | undefined;

  // open-audit — external compliance mirror
  OPEN_AUDIT_API_URL: string | undefined;
  OPEN_AUDIT_API_KEY: string | undefined;
  OPEN_AUDIT_ENABLED: string | undefined;

  // Nextcloud — document & file storage
  NEXTCLOUD_BASE_URL: string | undefined;
  NEXTCLOUD_USERNAME: string | undefined;
  NEXTCLOUD_APP_PASSWORD: string | undefined;
  NEXTCLOUD_ROOT_PATH: string | undefined;
  NEXTCLOUD_ENABLED: string | undefined;

  // Libre MES — manufacturing execution & OEE
  LIBRE_MES_INFLUX_URL: string | undefined;
  LIBRE_MES_INFLUX_TOKEN: string | undefined;
  LIBRE_MES_INFLUX_ORG: string | undefined;
  LIBRE_MES_INFLUX_BUCKET_AVAILABILITY: string | undefined;
  LIBRE_MES_INFLUX_BUCKET_PERFORMANCE: string | undefined;
  LIBRE_MES_INFLUX_BUCKET_QUALITY: string | undefined;
  LIBRE_MES_INFLUX_BUCKET_ORDER_PERF: string | undefined;
  LIBRE_MES_PG_URL: string | undefined;
  LIBRE_MES_ENABLED: string | undefined;
}

const REQUIRED = ['DATABASE_URL', 'JWT_SECRET'] as const;

function validateEnv(): EnvConfig {
  const missing = REQUIRED.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Copy .env.example to .env and fill in the required values.'
    );
  }

  if (process.env.JWT_SECRET === 'your-super-secret-jwt-key-change-this-in-production-use-openssl-rand-base64-32') {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET must be changed from the default value in production.');
    }
    process.stderr.write('[WARN] Using default JWT_SECRET — change this before deploying to production.\n');
  }

  return {
    DATABASE_URL: process.env.DATABASE_URL!,
    JWT_SECRET: process.env.JWT_SECRET!,

    NODE_ENV: (process.env.NODE_ENV as EnvConfig['NODE_ENV']) ?? 'development',
    COOKIE_NAME: process.env.COOKIE_NAME ?? 'ots_session',
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
    LOG_LEVEL: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),

    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    DOLIBARR_API_URL: process.env.DOLIBARR_API_URL,
    DOLIBARR_API_KEY: process.env.DOLIBARR_API_KEY,
    DOLIBARR_API_TIMEOUT: process.env.DOLIBARR_API_TIMEOUT,
    DOLIBARR_API_RETRIES: process.env.DOLIBARR_API_RETRIES,
    CRON_SECRET: process.env.CRON_SECRET,
    NEXT_PUBLIC_BASE_PATH: process.env.NEXT_PUBLIC_BASE_PATH,
    ENABLE_RISK_SCHEDULER: process.env.ENABLE_RISK_SCHEDULER,
    GOOGLE_SHEETS_CREDENTIALS: process.env.GOOGLE_SHEETS_CREDENTIALS,

    VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY,
    VAPID_SUBJECT: process.env.VAPID_SUBJECT,

    OPEN_AUDIT_API_URL: process.env.OPEN_AUDIT_API_URL,
    OPEN_AUDIT_API_KEY: process.env.OPEN_AUDIT_API_KEY,
    OPEN_AUDIT_ENABLED: process.env.OPEN_AUDIT_ENABLED,

    NEXTCLOUD_BASE_URL: process.env.NEXTCLOUD_BASE_URL,
    NEXTCLOUD_USERNAME: process.env.NEXTCLOUD_USERNAME,
    NEXTCLOUD_APP_PASSWORD: process.env.NEXTCLOUD_APP_PASSWORD,
    NEXTCLOUD_ROOT_PATH: process.env.NEXTCLOUD_ROOT_PATH,
    NEXTCLOUD_ENABLED: process.env.NEXTCLOUD_ENABLED,

    LIBRE_MES_INFLUX_URL: process.env.LIBRE_MES_INFLUX_URL,
    LIBRE_MES_INFLUX_TOKEN: process.env.LIBRE_MES_INFLUX_TOKEN,
    LIBRE_MES_INFLUX_ORG: process.env.LIBRE_MES_INFLUX_ORG,
    LIBRE_MES_INFLUX_BUCKET_AVAILABILITY: process.env.LIBRE_MES_INFLUX_BUCKET_AVAILABILITY,
    LIBRE_MES_INFLUX_BUCKET_PERFORMANCE: process.env.LIBRE_MES_INFLUX_BUCKET_PERFORMANCE,
    LIBRE_MES_INFLUX_BUCKET_QUALITY: process.env.LIBRE_MES_INFLUX_BUCKET_QUALITY,
    LIBRE_MES_INFLUX_BUCKET_ORDER_PERF: process.env.LIBRE_MES_INFLUX_BUCKET_ORDER_PERF,
    LIBRE_MES_PG_URL: process.env.LIBRE_MES_PG_URL,
    LIBRE_MES_ENABLED: process.env.LIBRE_MES_ENABLED,
  };
}

// Validate once at module load time — crashes early if env is misconfigured.
// In test environments, skip validation to allow partial env setups.
export const env: EnvConfig = process.env.NODE_ENV === 'test'
  ? (process.env as unknown as EnvConfig)
  : validateEnv();
