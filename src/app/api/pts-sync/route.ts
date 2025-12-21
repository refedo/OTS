/**
 * PTS Sync API - List and Create Sync Configurations
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifySession } from '@/lib/jwt';
import { DEFAULT_COLUMN_MAPPING } from '@/lib/services/google-sheets-sync.service';

// GET - List all sync configurations
export async function GET(request: NextRequest) {
  try {
    const cookieName = process.env.COOKIE_NAME || 'ots_session';
    const token = request.cookies.get(cookieName)?.value;
    const session = token ? verifySession(token) : null;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const configs = await prisma.pTSSyncConfig.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        syncLogs: {
          orderBy: { syncedAt: 'desc' },
          take: 1,
        },
      },
    });

    // Get project names for display
    const projectIds = [...new Set(configs.map(c => c.projectId))];
    const projects = await prisma.project.findMany({
      where: { id: { in: projectIds } },
      select: { id: true, name: true, projectNumber: true },
    });
    const projectMap = new Map(projects.map(p => [p.id, p]));

    const result = configs.map(config => ({
      ...config,
      project: projectMap.get(config.projectId) || null,
      lastSync: config.syncLogs[0] || null,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('[PTS Sync API] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sync configurations' },
      { status: 500 }
    );
  }
}

// POST - Create new sync configuration
export async function POST(request: NextRequest) {
  try {
    const cookieName = process.env.COOKIE_NAME || 'ots_session';
    const token = request.cookies.get(cookieName)?.value;
    const session = token ? verifySession(token) : null;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      spreadsheetId,
      sheetName,
      projectId,
      columnMapping = DEFAULT_COLUMN_MAPPING,
      headerRow = 1,
      dataStartRow = 2,
      syncInterval = 0,
      autoCreateParts = true,
    } = body;

    // Validation
    if (!name || !spreadsheetId || !sheetName || !projectId) {
      return NextResponse.json(
        { error: 'Missing required fields: name, spreadsheetId, sheetName, projectId' },
        { status: 400 }
      );
    }

    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    const config = await prisma.pTSSyncConfig.create({
      data: {
        name,
        spreadsheetId,
        sheetName,
        projectId,
        columnMapping,
        headerRow,
        dataStartRow,
        syncInterval,
        isActive: true,
        autoCreateParts,
      },
    });

    return NextResponse.json(config, { status: 201 });
  } catch (error) {
    console.error('[PTS Sync API] POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create sync configuration' },
      { status: 500 }
    );
  }
}
