/**
 * /hr/letters/[id]/print
 * Printable bilingual letter view — supports Arabic (RTL), English (LTR), and Bilingual modes.
 * Uses browser CSS @media print — no external PDF library required.
 *
 * 19.1.0
 */

import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { redirect, notFound } from 'next/navigation';
import prisma from '@/lib/db';
import { PrintLetterClient } from './print-client';

export default async function PrintLetterPage({ params }: { params: Promise<{ id: string }> }) {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME ?? 'ots_session')?.value;
  const session = token ? verifySession(token) : null;
  if (!session) redirect('/login');

  const { id } = await params;
  const letter = await prisma.hrLetter.findFirst({
    where: { id, deletedAt: null },
    include: {
      employee: {
        select: {
          fullNameEn: true,
          fullNameAr: true,
          employmentId: true,
          department: true,
          occupation: true,
          nationalId: true,
          dateOfJoining: true,
        },
      },
      createdBy: { select: { name: true } },
      approvedBy: { select: { name: true } },
      rejectedBy: { select: { name: true } },
    },
  });

  if (!letter) notFound();

  return <PrintLetterClient letter={letter as Parameters<typeof PrintLetterClient>[0]['letter']} />;
}
