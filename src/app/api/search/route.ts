import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';

const MAX_PER_CATEGORY = 5;

export const GET = withApiContext<any>(async (req) => {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim() ?? '';

  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    const [tasks, projects, initiatives, weeklyIssues, backlogItems, ncrs, rfis, assemblyParts, lcrEntries] =
      await Promise.all([
        prisma.task.findMany({
          where: {
            OR: [
              { title: { contains: q } },
              { description: { contains: q } },
            ],
          },
          select: { id: true, title: true, status: true, priority: true },
          take: MAX_PER_CATEGORY,
          orderBy: { updatedAt: 'desc' },
        }),

        prisma.project.findMany({
          where: {
            deletedAt: null,
            OR: [
              { name: { contains: q } },
              { projectNumber: { contains: q } },
            ],
          },
          select: { id: true, name: true, projectNumber: true, status: true },
          take: MAX_PER_CATEGORY,
          orderBy: { updatedAt: 'desc' },
        }),

        prisma.initiative.findMany({
          where: {
            OR: [
              { name: { contains: q } },
              { description: { contains: q } },
              { initiativeNumber: { contains: q } },
            ],
          },
          select: { id: true, name: true, initiativeNumber: true, status: true },
          take: MAX_PER_CATEGORY,
          orderBy: { updatedAt: 'desc' },
        }),

        prisma.weeklyIssue.findMany({
          where: {
            OR: [
              { title: { contains: q } },
              { description: { contains: q } },
            ],
          },
          select: { id: true, title: true, issueNumber: true, status: true, priority: true },
          take: MAX_PER_CATEGORY,
          orderBy: { updatedAt: 'desc' },
        }),

        prisma.productBacklogItem.findMany({
          where: {
            OR: [
              { title: { contains: q } },
              { description: { contains: q } },
              { code: { contains: q } },
            ],
          },
          select: { id: true, title: true, code: true, status: true, priority: true },
          take: MAX_PER_CATEGORY,
          orderBy: { createdAt: 'desc' },
        }),

        prisma.nCRReport.findMany({
          where: {
            OR: [
              { ncrNumber: { contains: q } },
              { description: { contains: q } },
            ],
          },
          select: { id: true, ncrNumber: true, description: true, status: true, severity: true },
          take: MAX_PER_CATEGORY,
          orderBy: { updatedAt: 'desc' },
        }),

        prisma.rFIRequest.findMany({
          where: {
            OR: [
              { rfiNumber: { contains: q } },
              { inspectionType: { contains: q } },
            ],
          },
          select: { id: true, rfiNumber: true, inspectionType: true, status: true },
          take: MAX_PER_CATEGORY,
          orderBy: { updatedAt: 'desc' },
        }),

        prisma.assemblyPart.findMany({
          where: {
            deletedAt: null,
            OR: [
              { assemblyMark: { contains: q } },
              { partMark: { contains: q } },
              { name: { contains: q } },
              { partDesignation: { contains: q } },
            ],
          },
          select: {
            id: true,
            assemblyMark: true,
            partMark: true,
            name: true,
            partDesignation: true,
            status: true,
            projectId: true,
          },
          take: MAX_PER_CATEGORY,
          orderBy: { updatedAt: 'desc' },
        }),

        prisma.$queryRaw<Array<{
          id: string;
          sn: string | null;
          itemLabel: string | null;
          projectNumber: string | null;
          poNumber: string | null;
          status: string | null;
        }>>`
          SELECT id, sn, itemLabel, projectNumber, poNumber, status
          FROM lcr_entries
          WHERE isDeleted = false
            AND (itemLabel LIKE ${`%${q}%`}
              OR projectNumber LIKE ${`%${q}%`}
              OR poNumber LIKE ${`%${q}%`}
              OR mrfNumber LIKE ${`%${q}%`}
              OR awardedToRaw LIKE ${`%${q}%`})
          ORDER BY syncedAt DESC
          LIMIT ${MAX_PER_CATEGORY}
        `,
      ]);

    return NextResponse.json({
      results: {
        tasks: tasks.map((t) => ({
          id: t.id,
          title: t.title,
          subtitle: t.status,
          badge: t.priority,
          url: `/tasks/${t.id}`,
          type: 'Task',
        })),
        projects: projects.map((p) => ({
          id: p.id,
          title: p.name,
          subtitle: p.projectNumber,
          badge: p.status,
          url: `/projects/${p.id}`,
          type: 'Project',
        })),
        initiatives: initiatives.map((i) => ({
          id: i.id,
          title: i.name,
          subtitle: i.initiativeNumber,
          badge: i.status,
          url: `/business-planning/initiatives`,
          type: 'Initiative',
        })),
        weeklyIssues: weeklyIssues.map((w) => ({
          id: w.id,
          title: w.title,
          subtitle: `#${w.issueNumber}`,
          badge: w.status,
          url: `/business-planning/issues`,
          type: 'Weekly Issue',
        })),
        backlogItems: backlogItems.map((b) => ({
          id: b.id,
          title: b.title,
          subtitle: b.code,
          badge: String(b.status),
          url: `/backlog/${b.id}`,
          type: 'Backlog',
        })),
        ncrs: ncrs.map((n) => ({
          id: n.id,
          title: `NCR ${n.ncrNumber}`,
          subtitle: n.description.slice(0, 60),
          badge: n.status,
          url: `/qc/ncr`,
          type: 'NCR',
        })),
        rfis: rfis.map((r) => ({
          id: r.id,
          title: `RFI ${r.rfiNumber ?? r.id.slice(0, 8)}`,
          subtitle: r.inspectionType,
          badge: r.status,
          url: `/qc/rfi`,
          type: 'RFI',
        })),
        assemblyParts: assemblyParts.map((a) => ({
          id: a.id,
          title: a.assemblyMark,
          subtitle: `${a.name} — ${a.partDesignation}`,
          badge: a.status,
          url: `/production?project=${a.projectId}`,
          type: 'Assembly',
        })),
        lcrEntries: lcrEntries.map((l) => ({
          id: l.id,
          title: l.itemLabel ?? `LCR ${l.sn ?? l.id.slice(0, 8)}`,
          subtitle: `${l.projectNumber ?? 'Unknown'} — ${l.poNumber ? `PO: ${l.poNumber}` : 'No PO'}`,
          badge: l.status ?? 'Unknown',
          url: `/supply-chain/lcr`,
          type: 'LCR',
        })),
      },
    });
  } catch (error) {
    logger.error({ error, q }, 'Global search failed');
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
});
