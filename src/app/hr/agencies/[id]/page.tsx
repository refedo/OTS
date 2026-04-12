import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { redirect, notFound } from 'next/navigation';
import prisma from '@/lib/db';
import { checkPermission, getCurrentUserPermissions } from '@/lib/permission-checker';
import { AgencyForm } from '@/components/hr/agency-form';

export default async function AgencyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;
  if (!session) redirect('/login');
  if (!(await checkPermission('hr.agency.view'))) redirect('/unauthorized?from=/hr/agencies');

  const permissions = await getCurrentUserPermissions();
  const canManage = permissions.includes('hr.agency.manage');

  const { id } = await params;
  const agency = await prisma.agency.findFirst({
    where: { id, deletedAt: null },
    include: {
      slots: { where: { deletedAt: null }, orderBy: { slotCode: 'asc' } },
    },
  });
  if (!agency) notFound();

  const initial = {
    id: agency.id,
    nameEn: agency.nameEn,
    nameAr: agency.nameAr ?? '',
    contactPerson: agency.contactPerson ?? '',
    contactPhone: agency.contactPhone ?? '',
    contractRef: agency.contractRef ?? '',
    contractStart: agency.contractStart
      ? agency.contractStart.toISOString().slice(0, 10)
      : '',
    contractEnd: agency.contractEnd ? agency.contractEnd.toISOString().slice(0, 10) : '',
    status: agency.status,
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4">
      <h1 className="text-2xl font-semibold">{agency.nameEn}</h1>
      <AgencyForm initial={canManage ? initial : initial} />
      <section>
        <h2 className="text-lg font-medium mb-2">
          Slots ({agency.slots.length})
        </h2>
        <div className="overflow-x-auto rounded border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="p-2 font-medium">Code</th>
                <th className="p-2 font-medium">Trade</th>
                <th className="p-2 font-medium">Hourly rate</th>
                <th className="p-2 font-medium">Card</th>
              </tr>
            </thead>
            <tbody>
              {agency.slots.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-muted-foreground">
                    No slots yet.
                  </td>
                </tr>
              )}
              {agency.slots.map((s) => (
                <tr key={s.id} className="border-b">
                  <td className="p-2 font-mono">{s.slotCode}</td>
                  <td className="p-2">{s.trade}</td>
                  <td className="p-2">{s.hourlyRate.toString()} SAR/hr</td>
                  <td className="p-2">{s.cardStatus}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
