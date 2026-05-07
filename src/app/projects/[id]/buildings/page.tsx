import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { redirect, notFound } from 'next/navigation';
import db from '@/lib/db';
import { BuildingDetailsClient } from './_page-client';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Building Details' };

export default async function BuildingDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cookieName = process.env.COOKIE_NAME || 'ots_session';
  const store = await cookies();
  const token = store.get(cookieName)?.value;
  const session = token ? verifySession(token) : null;
  if (!session) redirect('/login');

  const project = await db.project.findUnique({
    where: { id, deletedAt: null },
    select: {
      id: true,
      projectNumber: true,
      name: true,
      status: true,
      contractualTonnage: true,
      galvanized: true,
      paintCoat1: true, paintCoat1Microns: true,
      paintCoat2: true, paintCoat2Microns: true,
      paintCoat3: true, paintCoat3Microns: true,
      paintCoat4: true, paintCoat4Microns: true,
      topCoatRalNumber: true,
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
            select: { netWeightTotal: true, netAreaTotal: true, singlePartWeight: true, quantity: true, name: true },
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
            },
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!project) notFound();

  // Compute per-building assembly stats
  const buildings = project.buildings.map((b) => {
    const totalWeight = b.assemblyParts.reduce((s, p) => {
      const w = Number(p.netWeightTotal ?? 0) > 0
        ? Number(p.netWeightTotal)
        : Number(p.singlePartWeight ?? 0) * (p.quantity ?? 1);
      return s + w;
    }, 0);
    const totalArea = b.assemblyParts.reduce((s, p) => s + Number(p.netAreaTotal ?? 0), 0);
    const purlinArea = b.assemblyParts
      .filter((p) => p.name?.toUpperCase() === 'PURLIN')
      .reduce((s, p) => s + Number(p.netAreaTotal ?? 0), 0);

    return {
      ...b,
      weight: b.weight ? Number(b.weight) : null,
      assemblyTonnage: totalWeight / 1000,
      totalArea,
      purlinArea,
      paintableArea: totalArea - purlinArea,
      scopeOfWorks: b.scopeOfWorks.map((s) => ({
        ...s,
        quantity: s.quantity ? Number(s.quantity) : null,
        panelThickness: s.panelThickness,
        ribHeight: s.ribHeight,
        upperSheetThick: s.upperSheetThick ? Number(s.upperSheetThick) : null,
        lowerSheetThick: s.lowerSheetThick ? Number(s.lowerSheetThick) : null,
      })),
    };
  });

  return (
    <BuildingDetailsClient
      project={{ ...project, contractualTonnage: project.contractualTonnage ? Number(project.contractualTonnage) : null }}
      buildings={buildings}
    />
  );
}
