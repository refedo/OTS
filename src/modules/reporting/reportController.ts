/**
 * Hexa Reporting Engine (HRE) - Controller
 * Handles report generation requests
 */

import { NextRequest, NextResponse } from 'next/server';
import { reportEngine } from './reportEngine';
import { ReportGenerationRequest, ReportGenerationResponse } from './reportTypes';

/**
 * Generate Report Handler
 * POST /api/reports/generate
 */
export async function generateReportHandler(
  req: NextRequest
): Promise<NextResponse<ReportGenerationResponse>> {
  try {
    // TODO: Add authentication check when auth system is implemented
    // const session = await getServerSession(authOptions);
    // if (!session) {
    //   return NextResponse.json({ status: 'error', error: 'Unauthorized' }, { status: 401 });
    // }

    // Parse request body
    const body = await req.json();
    const { reportType, projectId, language, options } = body as ReportGenerationRequest;

    // Validate required fields
    if (!reportType || !projectId || !language) {
      return NextResponse.json(
        {
          status: 'error',
          error: 'Missing required fields: reportType, projectId, and language are required',
        },
        { status: 400 }
      );
    }

    // Validate report type
    const validReportTypes = ['project-summary', 'production-log', 'qc-report', 'dispatch-report', 'delivery-note'];
    if (!validReportTypes.includes(reportType)) {
      return NextResponse.json(
        {
          status: 'error',
          error: `Invalid report type. Must be one of: ${validReportTypes.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Validate language
    if (language !== 'en' && language !== 'ar') {
      return NextResponse.json(
        {
          status: 'error',
          error: 'Invalid language. Must be either "en" or "ar"',
        },
        { status: 400 }
      );
    }

    // Generate report
    const result = await reportEngine.generateReport({
      reportType,
      projectId,
      language,
      options,
    });

    // Return response
    if (result.status === 'success') {
      return NextResponse.json(result, { status: 200 });
    } else {
      return NextResponse.json(result, { status: 500 });
    }
  } catch (error) {
    console.error('Report generation error:', error);
    return NextResponse.json(
      {
        status: 'error',
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

/**
 * List Available Reports Handler
 * GET /api/reports/types
 */
export async function listReportTypesHandler(): Promise<NextResponse> {
  try {
    const reportTypes = [
      {
        type: 'project-summary',
        name: 'Project Summary Report',
        description: 'Comprehensive overview of project status, buildings, production, and QC',
        supportedLanguages: ['en', 'ar'],
      },
      {
        type: 'production-log',
        name: 'Production Log Report',
        description: 'Detailed production activities and operations timeline',
        supportedLanguages: ['en', 'ar'],
        status: 'coming-soon',
      },
      {
        type: 'qc-report',
        name: 'Quality Control Report',
        description: 'Quality inspections, test results, and compliance status',
        supportedLanguages: ['en', 'ar'],
        status: 'coming-soon',
      },
      {
        type: 'dispatch-report',
        name: 'Dispatch Report',
        description: 'Shipment details, dispatch schedules, and delivery tracking',
        supportedLanguages: ['en', 'ar'],
        status: 'coming-soon',
      },
      {
        type: 'delivery-note',
        name: 'Delivery Note',
        description: 'Professional delivery note with building summary, driver info, and item details',
        supportedLanguages: ['en', 'ar'],
      },
    ];

    return NextResponse.json({
      status: 'success',
      reportTypes,
    });
  } catch (error) {
    console.error('Error listing report types:', error);
    return NextResponse.json(
      {
        status: 'error',
        error: 'Failed to list report types',
      },
      { status: 500 }
    );
  }
}

/**
 * Get Report Status Handler
 * GET /api/reports/status/:projectId
 */
export async function getReportStatusHandler(
  req: NextRequest,
  { params }: { params: { projectId: string } }
): Promise<NextResponse> {
  try {
    // TODO: Add authentication check when auth system is implemented

    const { projectId } = params;

    // TODO: Implement logic to check if reports exist for this project
    // For now, return a placeholder response

    return NextResponse.json({
      status: 'success',
      projectId,
      availableReports: [],
      message: 'Report status check - feature coming soon',
    });
  } catch (error) {
    console.error('Error getting report status:', error);
    return NextResponse.json(
      {
        status: 'error',
        error: 'Failed to get report status',
      },
      { status: 500 }
    );
  }
}
