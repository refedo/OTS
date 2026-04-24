import { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';
import { resolveUserPermissions } from '@/lib/services/permission-resolution.service';
import { BdClient } from '@/components/bd/bd-client';

export const metadata: Metadata = {
  title: 'Business Development | OTS',
};

export const dynamic = 'force-dynamic';

export default async function BusinessDevelopmentPage() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;

  if (!session) redirect('/login');

  const userPermissions = await resolveUserPermissions(session.sub);
  const canView = userPermissions.includes('bd.companies.view') || userPermissions.includes('bd.companies.manage');
  const canManage = userPermissions.includes('bd.companies.manage');

  if (!canView) redirect('/dashboard');

  const [companies, totalDocs, totalRequests] = await Promise.all([
    prisma.bdCompany.findMany({
      where: { deletedAt: null },
      include: {
        _count: {
          select: {
            documents: { where: { deletedAt: null } },
            requests: { where: { deletedAt: null } },
          },
        },
        archiveEntries: true,
      },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.bdDocument.count({ where: { deletedAt: null } }),
    prisma.bdRequest.count({ where: { deletedAt: null } }),
  ]);

  const allDocuments = await prisma.bdDocument.findMany({
    where: { deletedAt: null },
    include: { company: { select: { id: true, name: true } } },
    orderBy: { submittedAt: 'desc' },
  });

  const allRequests = await prisma.bdRequest.findMany({
    where: { deletedAt: null },
    include: { company: { select: { id: true, name: true } } },
    orderBy: { receivedAt: 'desc' },
  });

  const allArchiveEntries = await prisma.bdArchiveEntry.findMany({
    include: { company: { select: { id: true, name: true } } },
    orderBy: { updatedAt: 'desc' },
  });

  return (
    <BdClient
      initialCompanies={JSON.parse(JSON.stringify(companies))}
      initialDocuments={JSON.parse(JSON.stringify(allDocuments))}
      initialRequests={JSON.parse(JSON.stringify(allRequests))}
      initialArchiveEntries={JSON.parse(JSON.stringify(allArchiveEntries))}
      totalDocs={totalDocs}
      totalRequests={totalRequests}
      canManage={canManage}
    />
  );
}
