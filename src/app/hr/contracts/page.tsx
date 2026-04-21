import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import prisma from '@/lib/db';
import { verifySession } from '@/lib/jwt';
import { checkPermission, getCurrentUserPermissions } from '@/lib/permission-checker';
import { ContractsClient } from '@/components/hr/contracts-client';

export const dynamic = 'force-dynamic';

export default async function ContractsPage() {
  const cookieName = process.env.COOKIE_NAME || 'ots_session';
  const store = await cookies();
  const token = store.get(cookieName)?.value;
  const session = token ? verifySession(token) : null;
  if (!session) redirect('/login');

  const [canView, canManage, canViewOwn] = await Promise.all([
    checkPermission('hr.contracts.view'),
    checkPermission('hr.contracts.manage'),
    checkPermission('hr.contracts.viewOwn'),
  ]);
  if (!canView && !canManage && !canViewOwn) redirect('/unauthorized?from=/hr/contracts');
  const viewOwnOnly = !canView && !canManage && canViewOwn;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // For viewOwn, restrict to contracts linked to the user's employee record
  let ownEmployeeId: string | null = null;
  if (viewOwnOnly) {
    const user = await prisma.user.findUnique({
      where: { id: session!.sub },
      select: { employeeId: true },
    });
    ownEmployeeId = user?.employeeId ?? null;
  }

  const [contractsRaw, employees, carAssets] = await Promise.all([
    prisma.contract.findMany({
      where: { deletedAt: null, ...(ownEmployeeId ? { employeeId: ownEmployeeId } : {}) },
      include: {
        employee: { select: { id: true, fullNameEn: true, employmentId: true } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.employee.findMany({
      where: { deletedAt: null, status: 'ACTIVE' },
      select: { id: true, fullNameEn: true, employmentId: true },
      orderBy: { fullNameEn: 'asc' },
    }),
    prisma.asset.findMany({
      where: { deletedAt: null, category: 'CAR' },
      select: {
        id: true,
        assetCode: true,
        name: true,
        plateNumber: true,
        vehicleMake: true,
        vehicleModel: true,
        vehicleYear: true,
        licenseExpiryDate: true,
        attachments: true,
        status: true,
      },
      orderBy: { name: 'asc' },
    }),
  ]);

  // Compute daysUntilExpiry server-side for initial load
  const contracts = contractsRaw.map((c) => {
    let daysUntilExpiry: number | null = null;
    if (c.expiryDate) {
      const exp = new Date(c.expiryDate);
      exp.setHours(0, 0, 0, 0);
      daysUntilExpiry = Math.round((exp.getTime() - today.getTime()) / 86400000);
    }
    return { ...c, daysUntilExpiry };
  });

  return (
    <ContractsClient
      canManage={canManage}
      employees={employees}
      initialContracts={contracts as Parameters<typeof ContractsClient>[0]['initialContracts']}
      carAssets={carAssets as Parameters<typeof ContractsClient>[0]['carAssets']}
    />
  );
}
