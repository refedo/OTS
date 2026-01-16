/**
 * API Route: Generate Report
 * POST /api/reports/generate
 */

import { generateReportHandler } from '@/modules/reporting/reportController';

export const POST = generateReportHandler;
