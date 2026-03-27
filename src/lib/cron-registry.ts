export type CronJobId =
  | 'lcr-sync'
  | 'dolibarr-sync'
  | 'financial-sync'
  | 'deadline-reminders'
  | 'early-warning';

export interface CronJobDef {
  id: CronJobId;
  name: string;
  description: string;
  scheduleExpression: string;
  scheduleHuman: string;
  endpoint: string;
  authMode: 'bearer' | 'query';
  enabledEnvVar: string | null;
  intervalEnvVar: string | null;
  category: 'sync' | 'notifications' | 'analysis';
}

export const CRON_JOB_REGISTRY: CronJobDef[] = [
  {
    id: 'lcr-sync',
    name: 'LCR Google Sheets Sync',
    description: 'Pulls the latest LCR data from the linked Google Sheet and resolves supplier/building aliases.',
    scheduleExpression: `*/${process.env.LCR_SYNC_INTERVAL_MINUTES ?? '30'} * * * *`,
    scheduleHuman: `Every ${process.env.LCR_SYNC_INTERVAL_MINUTES ?? '30'} minutes`,
    endpoint: '/api/cron/lcr-sync',
    authMode: 'bearer',
    enabledEnvVar: 'ENABLE_LCR_SCHEDULER',
    intervalEnvVar: 'LCR_SYNC_INTERVAL_MINUTES',
    category: 'sync',
  },
  {
    id: 'dolibarr-sync',
    name: 'Dolibarr ERP Sync',
    description: 'Synchronises projects, suppliers, purchase orders, and invoices from Dolibarr ERP into OTS.',
    scheduleExpression: '*/30 * * * *',
    scheduleHuman: 'Every 30 minutes',
    endpoint: '/api/cron/dolibarr-sync',
    authMode: 'bearer',
    enabledEnvVar: null,
    intervalEnvVar: null,
    category: 'sync',
  },
  {
    id: 'financial-sync',
    name: 'Financial Data Sync',
    description: 'Syncs financial records (chart of accounts, supplier invoices, cost mappings) from Dolibarr.',
    scheduleExpression: '0 */2 * * *',
    scheduleHuman: 'Every 2 hours',
    endpoint: '/api/cron/financial-sync',
    authMode: 'query',
    enabledEnvVar: null,
    intervalEnvVar: null,
    category: 'sync',
  },
  {
    id: 'deadline-reminders',
    name: 'Task Deadline Reminders',
    description: 'Sends push notifications to task assignees whose task due date is within ~48 hours.',
    scheduleExpression: '0 8 * * *',
    scheduleHuman: 'Daily at 08:00 (Asia/Riyadh)',
    endpoint: '/api/cron/deadline-reminders',
    authMode: 'bearer',
    enabledEnvVar: null,
    intervalEnvVar: null,
    category: 'notifications',
  },
  {
    id: 'early-warning',
    name: 'Early Warning Engine',
    description: 'Analyses project KPIs, schedule deviations, and risk indicators to generate proactive alerts.',
    scheduleExpression: '0 2 * * *',
    scheduleHuman: 'Daily at 02:00 (Asia/Riyadh)',
    endpoint: null as unknown as string,
    authMode: 'bearer',
    enabledEnvVar: 'ENABLE_RISK_SCHEDULER',
    intervalEnvVar: null,
    category: 'analysis',
  },
];

export function isCronEnabled(job: CronJobDef): boolean {
  if (!job.enabledEnvVar) return true;
  const val = process.env[job.enabledEnvVar];
  if (val === undefined) return process.env.NODE_ENV === 'production';
  return val === 'true' || val === '1';
}
