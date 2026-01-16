/**
 * PTS Sync API - Single Configuration Operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifySession } from '@/lib/jwt';

// GET - Get single sync configuration with history
export async function GET(
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

    const config = await prisma.pTSSyncConfig.findUnique({
      where: { id },
      include: {
        syncLogs: {
          orderBy: { syncedAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!config) {
      return NextResponse.json({ error: 'Configuration not found' }, { status: 404 });
    }

    // Get project info
    const project = await prisma.project.findUnique({
      where: { id: config.projectId },
      select: { id: true, name: true, projectNumber: true },
    });

    return NextResponse.json({ ...config, project });
  } catch (error) {
    console.error('[PTS Sync API] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch configuration' },
      { status: 500 }
    );
  }
}

// PATCH - Update sync configuration
export async function PATCH(
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
    const body = await request.json();

    const config = await prisma.pTSSyncConfig.update({
      where: { id },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.spreadsheetId && { spreadsheetId: body.spreadsheetId }),
        ...(body.sheetName && { sheetName: body.sheetName }),
        ...(body.projectId && { projectId: body.projectId }),
        ...(body.columnMapping && { columnMapping: body.columnMapping }),
        ...(body.headerRow !== undefined && { headerRow: body.headerRow }),
        ...(body.dataStartRow !== undefined && { dataStartRow: body.dataStartRow }),
        ...(body.syncInterval !== undefined && { syncInterval: body.syncInterval }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      },
    });

    return NextResponse.json(config);
  } catch (error) {
    console.error('[PTS Sync API] PATCH error:', error);
    return NextResponse.json(
      { error: 'Failed to update configuration' },
      { status: 500 }
    );
  }
}

// DELETE - Delete sync configuration
export async function DELETE(
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

    await prisma.pTSSyncConfig.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[PTS Sync API] DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete configuration' },
      { status: 500 }
    );
  }
}
