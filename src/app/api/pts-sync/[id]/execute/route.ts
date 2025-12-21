/**
 * PTS Sync API - Execute Sync
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifySession } from '@/lib/jwt';
import { googleSheetsSyncService } from '@/lib/services/google-sheets-sync.service';

// POST - Execute sync for a configuration
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieName = process.env.COOKIE_NAME || 'ots_session';
    const token = request.cookies.get(cookieName)?.value;
    const session = token ? verifySession(token) : null;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get configuration
    const config = await prisma.pTSSyncConfig.findUnique({
      where: { id },
    });

    if (!config) {
      return NextResponse.json({ error: 'Configuration not found' }, { status: 404 });
    }

    if (!config.isActive) {
      return NextResponse.json({ error: 'Sync configuration is disabled' }, { status: 400 });
    }

    // Execute sync
    const result = await googleSheetsSyncService.syncToOTS(
      {
        id: config.id,
        name: config.name,
        spreadsheetId: config.spreadsheetId,
        sheetName: config.sheetName,
        projectId: config.projectId,
        columnMapping: config.columnMapping as {
          partNumber: string;
          process: string;
          processedQty: string;
          processDate: string;
          processLocation: string;
          processedBy: string;
          reportNo: string;
          projectCode?: string;
          buildingName?: string;
          quantity?: string;
        },
        headerRow: config.headerRow,
        dataStartRow: config.dataStartRow,
        syncInterval: config.syncInterval,
        lastSyncAt: config.lastSyncAt,
        isActive: config.isActive,
        autoCreateParts: (config as { autoCreateParts?: boolean }).autoCreateParts ?? true,
        createdAt: config.createdAt,
        updatedAt: config.updatedAt,
      },
      session.sub
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('[PTS Sync API] Execute error:', error);
    return NextResponse.json(
      { error: 'Failed to execute sync', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
