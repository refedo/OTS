import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { redirect, notFound } from 'next/navigation';
import db from '@/lib/db';
import { ProjectCardClient } from './_page-client';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Project Card' };

type PartGroup = { name: string; totalWeightKg: number; totalQty: number };

export default async function ProjectCardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cookieName = process.env.COOKIE_NAME || 'ots_session';
  const store = await cookies();
  const token = store.get(cookieName)?.value;
  const session = token ? verifySession(token) : null;
  if (!session) redirect('/login');

  const [project, allProjects, currentUser] = await Promise.all([
    db.project.findUnique({
      where: { id, deletedAt: null },
      select: {
        id: true,
        projectNumber: true,
        name: true,
        status: true,
        contractDate: true,
        plannedStartDate: true,
        plannedEndDate: true,
        actualStartDate: true,
        actualEndDate: true,
        contractualTonnage: true,
        engineeringTonnage: true,
        // People IDs for validation
        salesEngineerId: true,
        projectManagerId: true,
        operationsManagerId: true,
        // Technical
        cranesIncluded: true,
        surveyorOurScope: true,
        thirdPartyRequired: true,
        thirdPartyResponsibility: true,
        incoterm: true,
        structureType: true,
        numberOfStructures: true,
        erectionSubcontractor: true,
        // Welding
        weldingProcess: true,
        wpsNumber: true,
        pqrNumber: true,
        ndtTest: true,
        applicableCodes: true,
        // Coating
        galvanized: true,
        galvanizationMicrons: true,
        coatingSystem: true,
        area: true,
        m2PerTon: true,
        paintCoat1: true, paintCoat1Microns: true,
        paintCoat2: true, paintCoat2Microns: true,
        paintCoat3: true, paintCoat3Microns: true,
        paintCoat4: true, paintCoat4Microns: true,
        topCoatRalNumber: true,
        // Stage durations
        engineeringWeeksMin: true,
        engineeringWeeksMax: true,
        operationsWeeksMin: true,
        operationsWeeksMax: true,
        siteWeeksMin: true,
        siteWeeksMax: true,
        // Validation
        validation: {
          select: {
            salesValidatedById: true,
            salesValidatedAt: true,
            salesValidatedBy: { select: { id: true, name: true } },
            projectsValidatedById: true,
            projectsValidatedAt: true,
            projectsValidatedBy: { select: { id: true, name: true } },
            operationsValidatedById: true,
            operationsValidatedAt: true,
            operationsValidatedBy: { select: { id: true, name: true } },
          },
        },
        // Setup checklist
        setupChecklist: {
          select: {
            contractReceived: true,
            answers: true,
            notifications: true,
            spcsAttachment: true,
          },
        },
        // Coating systems (new per-project style)
        coatingSystems: {
          select: {
            id: true,
            name: true,
            appliesToAll: true,
            coats: true,
            isGalvanized: true,
            galvanizationMicrons: true,
            buildings: {
              select: {
                building: { select: { id: true, designation: true } },
              },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
        // Relations
        client: { select: { id: true, name: true } },
        projectManager: { select: { id: true, name: true } },
        salesEngineer: { select: { id: true, name: true } },
        buildings: {
          where: { deletedAt: null },
          select: {
            id: true,
            designation: true,
            name: true,
            weight: true,
            location: true,
            assemblyParts: {
              where: { deletedAt: null },
              select: {
                netWeightTotal: true,
                netAreaTotal: true,
                singlePartWeight: true,
                quantity: true,
                name: true,
              },
            },
            scopeOfWorks: {
              select: {
                id: true,
                scopeType: true,
                scopeLabel: true,
                customLabel: true,
                quantity: true,
                unit: true,
                ralColor: true,
                panelThickness: true,
                ribHeight: true,
                upperSheetThick: true,
                lowerSheetThick: true,
                panelProfile: true,
                deckProfile: true,
                hasShearStuds: true,
                shearStudQty: true,
                shearStudSpecs: true,
                metalWorkItems: true,
                activities: {
                  select: {
                    activityType: true,
                    activityLabel: true,
                    isApplicable: true,
                  },
                },
              },
              orderBy: { createdAt: 'asc' },
            },
          },
          orderBy: { designation: 'asc' },
        },
      },
    }),
    db.project.findMany({
      where: { deletedAt: null },
      select: { id: true, projectNumber: true, name: true, status: true },
      orderBy: { projectNumber: 'asc' },
    }),
    db.user.findUnique({
      where: { id: session.sub },
      select: { isAdmin: true, role: { select: { name: true } } },
    }),
  ]);

  if (!project) notFound();

  const isAdminOrCeo = !!(
    currentUser?.isAdmin ||
    currentUser?.role?.name === 'Admin' ||
    currentUser?.role?.name === 'CEO'
  );

  const buildings = project.buildings.map((b) => {
    const totalWeight = b.assemblyParts.reduce((s, p) => {
      const w = Number(p.netWeightTotal ?? 0) > 0
        ? Number(p.netWeightTotal)
        : Number(p.singlePartWeight ?? 0) * (p.quantity ?? 1);
      return s + w;
    }, 0);
    const totalArea = b.assemblyParts.reduce((s, p) => s + Number(p.netAreaTotal ?? 0), 0);
    const purlinParts = b.assemblyParts.filter((p) => p.name?.toUpperCase() === 'PURLIN');
    const purlinArea = purlinParts.reduce((s, p) => s + Number(p.netAreaTotal ?? 0), 0);
    const purlinWeight = purlinParts.reduce((s, p) => {
      const w = Number(p.netWeightTotal ?? 0) > 0
        ? Number(p.netWeightTotal)
        : Number(p.singlePartWeight ?? 0) * (p.quantity ?? 1);
      return s + w;
    }, 0) / 1000;

    return {
      ...b,
      weight: b.weight ? Number(b.weight) : null,
      assemblyTonnage: totalWeight / 1000,
      totalArea,
      purlinArea,
      purlinWeight,
      paintableArea: totalArea - purlinArea,
      scopeOfWorks: b.scopeOfWorks.map((s) => ({
        ...s,
        quantity: s.quantity ? Number(s.quantity) : null,
        upperSheetThick: s.upperSheetThick ? Number(s.upperSheetThick) : null,
        lowerSheetThick: s.lowerSheetThick ? Number(s.lowerSheetThick) : null,
      })),
    };
  });

  // Aggregate assembly parts by name across all buildings
  const partGroupMap = new Map<string, PartGroup>();
  project.buildings.forEach((b) => {
    b.assemblyParts.forEach((p) => {
      const name = (p.name || 'Unknown').trim();
      const w =
        Number(p.netWeightTotal ?? 0) > 0
          ? Number(p.netWeightTotal)
          : Number(p.singlePartWeight ?? 0) * (p.quantity ?? 1);
      const entry = partGroupMap.get(name) ?? { name, totalWeightKg: 0, totalQty: 0 };
      entry.totalWeightKg += w;
      entry.totalQty += p.quantity ?? 0;
      partGroupMap.set(name, entry);
    });
  });
  const partGroups = Array.from(partGroupMap.values())
    .filter((g) => g.totalWeightKg > 0)
    .sort((a, b) => b.totalWeightKg - a.totalWeightKg);

  const serialized = {
    ...project,
    contractDate: project.contractDate?.toISOString() ?? null,
    plannedStartDate: project.plannedStartDate?.toISOString() ?? null,
    plannedEndDate: project.plannedEndDate?.toISOString() ?? null,
    actualStartDate: project.actualStartDate?.toISOString() ?? null,
    actualEndDate: project.actualEndDate?.toISOString() ?? null,
    contractualTonnage: project.contractualTonnage ? Number(project.contractualTonnage) : null,
    engineeringTonnage: project.engineeringTonnage ? Number(project.engineeringTonnage) : null,
    area: project.area ? Number(project.area) : null,
    m2PerTon: project.m2PerTon ? Number(project.m2PerTon) : null,
    validation: project.validation
      ? {
          ...project.validation,
          salesValidatedAt: project.validation.salesValidatedAt?.toISOString() ?? null,
          projectsValidatedAt: project.validation.projectsValidatedAt?.toISOString() ?? null,
          operationsValidatedAt: project.validation.operationsValidatedAt?.toISOString() ?? null,
        }
      : null,
  };

  return (
    <ProjectCardClient
      project={serialized}
      buildings={buildings}
      allProjects={allProjects}
      validationData={serialized.validation}
      currentUserId={session.sub}
      isAdminOrCeo={isAdminOrCeo}
      partGroups={partGroups}
    />
  );
}
