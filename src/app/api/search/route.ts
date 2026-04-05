import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';

const MAX_PER_CATEGORY = 5;

// Run each query independently so one failing model doesn't break the entire search
async function safe<T>(fn: () => Promise<T>): Promise<T | []> {
  try {
    return await fn();
  } catch {
    return [];
  }
}

export const GET = withApiContext(async (req) => {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim() ?? '';

  if (q.length < 2) {
    return NextResponse.json({ results: {} });
  }

  try {
    const [tasks, projects, initiatives, weeklyIssues, backlogItems, ncrs, rfis, assemblyParts, lcrEntries, buildings, users] =
      await Promise.all([
        safe(() => prisma.task.findMany({
          where: {
            OR: [
              { title: { contains: q } },
              { description: { contains: q } },
            ],
          },
          select: { id: true, title: true, status: true, priority: true },
          take: MAX_PER_CATEGORY,
          orderBy: { updatedAt: 'desc' },
        })),

        safe(() => prisma.project.findMany({
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
        })),

        safe(() => prisma.initiative.findMany({
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
        })),

        safe(() => prisma.weeklyIssue.findMany({
          where: {
            OR: [
              { title: { contains: q } },
              { description: { contains: q } },
            ],
          },
          select: { id: true, title: true, issueNumber: true, status: true, priority: true },
          take: MAX_PER_CATEGORY,
          orderBy: { updatedAt: 'desc' },
        })),

        safe(() => prisma.productBacklogItem.findMany({
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
        })),

        safe(() => prisma.nCRReport.findMany({
          where: {
            OR: [
              { ncrNumber: { contains: q } },
              { description: { contains: q } },
            ],
          },
          select: { id: true, ncrNumber: true, description: true, status: true, severity: true },
          take: MAX_PER_CATEGORY,
          orderBy: { updatedAt: 'desc' },
        })),

        safe(() => prisma.rFIRequest.findMany({
          where: {
            OR: [
              { rfiNumber: { contains: q } },
              { inspectionType: { contains: q } },
            ],
          },
          select: { id: true, rfiNumber: true, inspectionType: true, status: true },
          take: MAX_PER_CATEGORY,
          orderBy: { updatedAt: 'desc' },
        })),

        safe(() => prisma.assemblyPart.findMany({
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
        })),

        safe(() => prisma.$queryRaw<Array<{
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
          LIMIT 5
        `),

        safe(() => prisma.building.findMany({
          where: {
            deletedAt: null,
            OR: [
              { name: { contains: q } },
              { designation: { contains: q } },
            ],
          },
          select: { id: true, name: true, designation: true, projectId: true },
          take: MAX_PER_CATEGORY,
          orderBy: { updatedAt: 'desc' },
        })),

        safe(() => prisma.user.findMany({
          where: {
            isActive: true,
            OR: [
              { name: { contains: q } },
              { email: { contains: q } },
              { position: { contains: q } },
            ],
          },
          select: { id: true, name: true, email: true, position: true },
          take: MAX_PER_CATEGORY,
          orderBy: { name: 'asc' },
        })),
      ]);

    const taskArr = Array.isArray(tasks) ? tasks : [];
    const projectArr = Array.isArray(projects) ? projects : [];
    const initiativeArr = Array.isArray(initiatives) ? initiatives : [];
    const weeklyIssueArr = Array.isArray(weeklyIssues) ? weeklyIssues : [];
    const backlogArr = Array.isArray(backlogItems) ? backlogItems : [];
    const ncrArr = Array.isArray(ncrs) ? ncrs : [];
    const rfiArr = Array.isArray(rfis) ? rfis : [];
    const assemblyArr = Array.isArray(assemblyParts) ? assemblyParts : [];
    const lcrArr = Array.isArray(lcrEntries) ? lcrEntries : [];
    const buildingArr = Array.isArray(buildings) ? buildings : [];
    const userArr = Array.isArray(users) ? users : [];

    return NextResponse.json({
      results: {
        tasks: taskArr.map((t) => ({
          id: t.id,
          title: t.title,
          subtitle: t.status,
          badge: t.priority,
          url: `/tasks/${t.id}`,
          type: 'Task',
        })),
        projects: projectArr.map((p) => ({
          id: p.id,
          title: p.name,
          subtitle: p.projectNumber,
          badge: p.status,
          url: `/projects/${p.id}`,
          type: 'Project',
        })),
        initiatives: initiativeArr.map((i) => ({
          id: i.id,
          title: i.name,
          subtitle: i.initiativeNumber,
          badge: i.status,
          url: `/business-planning/initiatives`,
          type: 'Initiative',
        })),
        weeklyIssues: weeklyIssueArr.map((w) => ({
          id: w.id,
          title: w.title,
          subtitle: `#${w.issueNumber}`,
          badge: w.status,
          url: `/business-planning/issues`,
          type: 'Weekly Issue',
        })),
        backlogItems: backlogArr.map((b) => ({
          id: b.id,
          title: b.title,
          subtitle: b.code,
          badge: String(b.status),
          url: `/backlog/${b.id}`,
          type: 'Backlog',
        })),
        ncrs: ncrArr.map((n) => ({
          id: n.id,
          title: `NCR ${n.ncrNumber}`,
          subtitle: n.description.slice(0, 60),
          badge: n.status,
          url: `/qc/ncr`,
          type: 'NCR',
        })),
        rfis: rfiArr.map((r) => ({
          id: r.id,
          title: `RFI ${r.rfiNumber ?? r.id.slice(0, 8)}`,
          subtitle: r.inspectionType,
          badge: r.status,
          url: `/qc/rfi`,
          type: 'RFI',
        })),
        assemblyParts: assemblyArr.map((a) => ({
          id: a.id,
          title: a.assemblyMark,
          subtitle: `${a.name} — ${a.partDesignation}`,
          badge: a.status,
          url: `/production?project=${a.projectId}`,
          type: 'Assembly',
        })),
        lcrEntries: lcrArr.map((l) => ({
          id: l.id,
          title: l.itemLabel ?? `LCR ${l.sn ?? l.id.slice(0, 8)}`,
          subtitle: `${l.projectNumber ?? 'Unknown'} — ${l.poNumber ? `PO: ${l.poNumber}` : 'No PO'}`,
          badge: l.status ?? 'Unknown',
          url: `/supply-chain/lcr`,
          type: 'LCR',
        })),
        buildings: buildingArr.map((b) => ({
          id: b.id,
          title: b.name || b.designation,
          subtitle: b.designation,
          badge: 'Building',
          url: `/projects/${b.projectId}`,
          type: 'Building',
        })),
        users: userArr.map((u) => ({
          id: u.id,
          title: u.name,
          subtitle: u.position ?? u.email,
          badge: 'User',
          url: `/settings/users/${u.id}`,
          type: 'User',
        })),
      },
    });
  } catch (error) {
    logger.error({ error, q }, 'Global search failed');
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
});
