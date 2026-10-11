/**
 * Coating Systems Report Service
 * Collects coating systems across projects (structured systems, legacy flat
 * paint fields, and per-scope overrides) into a single normalized report.
 */

import prisma from '@/lib/db';
import type { Prisma } from '@prisma/client';

export type CoatingSource = 'system' | 'legacy' | 'scope';

export interface CoatingReportCoat {
  coatName: string;
  microns: number | null;
  ralNumber: string | null;
}

export interface CoatingReportProject {
  id: string;
  projectNumber: string;
  name: string;
  status: string;
}

export interface CoatingReportSystem {
  key: string;
  source: CoatingSource;
  project: CoatingReportProject;
  systemName: string;
  appliesTo: string;
  isGalvanized: boolean;
  galvanizationMicrons: number | null;
  coats: CoatingReportCoat[];
  totalMicrons: number;
}

export interface CoatingReportFilters {
  projectId?: string;
  projectAccess?: Prisma.ProjectWhereInput;
}

function toMicrons(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : parseFloat(String(value));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function toText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s.length > 0 ? s : null;
}

export function parseCoats(raw: unknown): CoatingReportCoat[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((c): c is Record<string, unknown> => typeof c === 'object' && c !== null)
    .map((c) => ({
      coatName: toText(c.coatName) ?? '',
      microns: toMicrons(c.microns),
      ralNumber: toText(c.ralNumber),
    }))
    .filter((c) => c.coatName || c.microns !== null || c.ralNumber);
}

export function sumMicrons(coats: CoatingReportCoat[]): number {
  return coats.reduce((sum, c) => sum + (c.microns ?? 0), 0);
}

export async function getCoatingSystemsReport(
  filters: CoatingReportFilters = {}
): Promise<{ projects: CoatingReportProject[]; systems: CoatingReportSystem[] }> {
  const where: Prisma.ProjectWhereInput = {
    deletedAt: null,
    ...(filters.projectId ? { id: filters.projectId } : {}),
    ...(filters.projectAccess ? { AND: [filters.projectAccess] } : {}),
  };

  const projects = await prisma.project.findMany({
    where,
    orderBy: { projectNumber: 'asc' },
    select: {
      id: true,
      projectNumber: true,
      name: true,
      status: true,
      coatingSystem: true,
      galvanized: true,
      galvanizationMicrons: true,
      paintCoat1: true,
      paintCoat1Microns: true,
      paintCoat2: true,
      paintCoat2Microns: true,
      paintCoat3: true,
      paintCoat3Microns: true,
      paintCoat4: true,
      paintCoat4Microns: true,
      topCoatRalNumber: true,
      coatingSystems: {
        orderBy: { sortOrder: 'asc' },
        select: {
          id: true,
          name: true,
          appliesToAll: true,
          coats: true,
          isGalvanized: true,
          galvanizationMicrons: true,
          buildings: {
            select: { building: { select: { designation: true, deletedAt: true } } },
          },
        },
      },
      scopeOfWorks: {
        where: { coatingSameAsProject: false, building: { deletedAt: null } },
        orderBy: [{ building: { designation: 'asc' } }, { scopeLabel: 'asc' }],
        select: {
          id: true,
          scopeLabel: true,
          customLabel: true,
          scopeCoatingSystem: true,
          building: { select: { designation: true } },
        },
      },
    },
  });

  const systems: CoatingReportSystem[] = [];
  const projectsWithCoating: CoatingReportProject[] = [];

  for (const p of projects) {
    const project: CoatingReportProject = {
      id: p.id,
      projectNumber: p.projectNumber,
      name: p.name,
      status: p.status,
    };
    const before = systems.length;

    p.coatingSystems.forEach((cs, idx) => {
      const coats = parseCoats(cs.coats);
      const designations = cs.buildings
        .filter((b) => b.building.deletedAt === null)
        .map((b) => b.building.designation);
      systems.push({
        key: `system:${cs.id}`,
        source: 'system',
        project,
        systemName: toText(cs.name) ?? `System ${idx + 1}`,
        appliesTo: cs.appliesToAll || designations.length === 0 ? 'All buildings' : designations.join(', '),
        isGalvanized: cs.isGalvanized,
        galvanizationMicrons: cs.galvanizationMicrons,
        coats,
        totalMicrons: sumMicrons(coats),
      });
    });

    if (p.coatingSystems.length === 0) {
      const legacyCoats: CoatingReportCoat[] = [
        [p.paintCoat1, p.paintCoat1Microns],
        [p.paintCoat2, p.paintCoat2Microns],
        [p.paintCoat3, p.paintCoat3Microns],
        [p.paintCoat4, p.paintCoat4Microns],
      ]
        .filter(([name]) => toText(name))
        .map(([name, microns], i, arr) => ({
          coatName: toText(name) ?? '',
          microns: toMicrons(microns),
          ralNumber: i === arr.length - 1 ? toText(p.topCoatRalNumber) : null,
        }));
      if (legacyCoats.length === 0 && toText(p.topCoatRalNumber)) {
        legacyCoats.push({ coatName: 'Top Coat', microns: null, ralNumber: toText(p.topCoatRalNumber) });
      }
      if (legacyCoats.length > 0 || toText(p.coatingSystem) || p.galvanized) {
        systems.push({
          key: `legacy:${p.id}`,
          source: 'legacy',
          project,
          systemName: toText(p.coatingSystem) ?? 'Project Coating',
          appliesTo: 'All buildings',
          isGalvanized: p.galvanized,
          galvanizationMicrons: p.galvanizationMicrons,
          coats: legacyCoats,
          totalMicrons: sumMicrons(legacyCoats),
        });
      }
    }

    for (const s of p.scopeOfWorks) {
      const coats = parseCoats(s.scopeCoatingSystem);
      if (coats.length === 0) continue;
      systems.push({
        key: `scope:${s.id}`,
        source: 'scope',
        project,
        systemName: `${toText(s.customLabel) ?? s.scopeLabel} (scope override)`,
        appliesTo: s.building.designation,
        isGalvanized: false,
        galvanizationMicrons: null,
        coats,
        totalMicrons: sumMicrons(coats),
      });
    }

    if (systems.length > before) projectsWithCoating.push(project);
  }

  return { projects: projectsWithCoating, systems };
}
