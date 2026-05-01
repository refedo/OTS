import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { logger } from '@/lib/logger';

export const COMPETENCE_AREAS = [
  'Welding',
  'QC Inspection',
  'OHS Awareness',
  'First Aid',
  'Crane Operation',
  'Laser Operation',
  'PEB Design',
  'Document Control',
] as const;

export async function GET(request: Request) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const departmentId = searchParams.get('departmentId');
    const section = searchParams.get('section');
    const competenceArea = searchParams.get('competenceArea');

    const employeeWhere: Record<string, unknown> = {
      status: 'ACTIVE',
      deletedAt: null,
    };
    if (departmentId) employeeWhere.departmentId = departmentId;
    if (section) employeeWhere.section = section;

    const employees = await prisma.employee.findMany({
      where: employeeWhere,
      select: {
        id: true,
        employeeNumber: true,
        firstName: true,
        lastName: true,
        occupation: true,
        department: { select: { id: true, name: true } },
        section: true,
        competenceEntries: {
          where: competenceArea ? { competenceArea } : undefined,
          include: {
            assessedBy: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: [{ occupation: 'asc' }, { lastName: 'asc' }],
    });

    return NextResponse.json({ employees, competenceAreas: COMPETENCE_AREAS });
  } catch (error) {
    logger.error({ error }, 'Failed to fetch competence matrix');
    return NextResponse.json({ error: 'Failed to fetch competence matrix' }, { status: 500 });
  }
}
