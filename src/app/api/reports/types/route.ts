/**
 * API Route: List Report Types
 * GET /api/reports/types
 */

import { listReportTypesHandler } from '@/modules/reporting/reportController';

export const GET = listReportTypesHandler;
