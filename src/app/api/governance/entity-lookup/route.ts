/**
 * Governance API - Entity Lookup
 *
 * Search versioned entities by name/number to get their ID for version history.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const entityType = searchParams.get('entityType');
    const q = searchParams.get('q')?.trim() || '';

    if (!entityType) {
      return NextResponse.json({ error: 'entityType is required' }, { status: 400 });
    }

    type EntityResult = { id: string; label: string; sub?: string };
    let results: EntityResult[] = [];

    switch (entityType) {
      case 'Project': {
        const rows = await prisma.project.findMany({
          where: {
            deletedAt: null,
            OR: [
              { name: { contains: q } },
              { projectNumber: { contains: q } },
            ],
          },
          select: { id: true, name: true, projectNumber: true },
          take: 10,
          orderBy: { name: 'asc' },
        });
        results = rows.map((r) => ({
          id: r.id,
          label: `${r.projectNumber} — ${r.name}`,
          sub: r.projectNumber,
        }));
        break;
      }

      case 'Building': {
        const rows = await prisma.building.findMany({
          where: {
            deletedAt: null,
            OR: [
              { name: { contains: q } },
              { designation: { contains: q } },
            ],
          },
          select: {
            id: true,
            name: true,
            designation: true,
            project: { select: { projectNumber: true } },
          },
          take: 10,
          orderBy: { name: 'asc' },
        });
        results = rows.map((r) => ({
          id: r.id,
          label: `${r.designation} — ${r.name}`,
          sub: `Project ${r.project.projectNumber}`,
        }));
        break;
      }

      case 'WPS': {
        const rows = await prisma.wPS.findMany({
          where: {
            OR: [
              { wpsNumber: { contains: q } },
              { weldingProcess: { contains: q } },
            ],
          },
          select: { id: true, wpsNumber: true, weldingProcess: true },
          take: 10,
          orderBy: { wpsNumber: 'asc' },
        });
        results = rows.map((r) => ({
          id: r.id,
          label: `${r.wpsNumber} (${r.weldingProcess})`,
        }));
        break;
      }

      case 'ITP': {
        const rows = await prisma.iTP.findMany({
          where: {
            OR: [
              { itpNumber: { contains: q } },
            ],
          },
          select: { id: true, itpNumber: true, status: true },
          take: 10,
          orderBy: { itpNumber: 'asc' },
        });
        results = rows.map((r) => ({
          id: r.id,
          label: `${r.itpNumber}`,
          sub: r.status,
        }));
        break;
      }

      case 'QCInspection': {
        // QCInspection uses entity UUID — return recent ones for reference
        const rows = await prisma.auditLog.findMany({
          where: {
            entityType: 'QCInspection',
            ...(q && { entityId: { contains: q } }),
          },
          select: { entityId: true, performedAt: true },
          distinct: ['entityId'],
          orderBy: { performedAt: 'desc' },
          take: 10,
        });
        results = rows.map((r) => ({
          id: r.entityId,
          label: `ID: ${r.entityId.slice(0, 12)}…`,
          sub: new Date(r.performedAt).toLocaleDateString(),
        }));
        break;
      }

      default:
        return NextResponse.json({ error: 'Unsupported entity type' }, { status: 400 });
    }

    return NextResponse.json({ results });
  } catch (error) {
    logger.error({ error }, 'Failed to look up entities');
    return NextResponse.json({ error: 'Failed to look up entities' }, { status: 500 });
  }
}
