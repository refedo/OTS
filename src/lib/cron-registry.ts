export type CronJobId =
  | 'lcr-sync'
  | 'dolibarr-sync'
  | 'financial-sync'
  | 'deadline-reminders'
  | 'early-warning'
  | 'ops-agent'
  | 'attendance-sync';

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
  {
    id: 'ops-agent',
    name: 'Ops Agent Sweep',
    description: 'Claude-powered autonomous sweep across Tasks, Projects, HR, and Pipeline — produces a structured Ops Brief with RED/AMBER/GREEN risk signals.',
    scheduleExpression: process.env.OPS_AGENT_CRON_SCHEDULE ?? '0 7 * * 0-4',
    scheduleHuman: 'Daily at 07:00 Sat–Wed (Saudi work week)',
    endpoint: '/api/ops-agent/cron',
    authMode: 'bearer',
    enabledEnvVar: 'ENABLE_OPS_AGENT_SCHEDULER',
    intervalEnvVar: null,
    category: 'analysis',
  },
  {
    id: 'attendance-sync',
    name: 'PTS Attendance & Overtime Sync',
    description: 'Pulls the daily PTS (Production Tracking Sheet) overtime tab from Google Sheets into OTS AttendanceRecord — syncs regular hours, OT hours, and absence codes for all employees and manpower slots.',
    scheduleExpression: '0 6 * * *',
    scheduleHuman: 'Daily at 06:00 (Asia/Riyadh)',
    endpoint: '/api/hr/attendance/sync',
    authMode: 'bearer',
    enabledEnvVar: 'ENABLE_ATTENDANCE_SYNC_SCHEDULER',
    intervalEnvVar: null,
    category: 'sync',
  },
];

export function isCronEnabled(job: CronJobDef): boolean {
  if (!job.enabledEnvVar) return true;
  const val = process.env[job.enabledEnvVar];
  if (val === undefined) return process.env.NODE_ENV === 'production';
  return val === 'true' || val === '1';
}
