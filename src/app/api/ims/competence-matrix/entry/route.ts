import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const UpsertSchema = z.object({
  employeeId: z.string().uuid(),
  competenceArea: z.string().min(1),
  status: z.enum(['COMPETENT', 'IN_TRAINING', 'NOT_REQUIRED', 'GAP']),
  evidenceRef: z.string().optional().nullable(),
  expiryDate: z.string().datetime().optional().nullable(),
});

export async function POST(req: Request) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const parsed = UpsertSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;

    const entry = await prisma.imsCompetenceEntry.upsert({
      where: {
        employeeId_competenceArea: {
          employeeId: data.employeeId,
          competenceArea: data.competenceArea,
        },
      },
      create: {
        employeeId: data.employeeId,
        competenceArea: data.competenceArea,
        status: data.status,
        evidenceRef: data.evidenceRef ?? null,
        assessedById: session.sub,
        assessedAt: new Date(),
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
      },
      update: {
        status: data.status,
        evidenceRef: data.evidenceRef ?? null,
        assessedById: session.sub,
        assessedAt: new Date(),
        expiryDate: data.expiryDate !== undefined
          ? (data.expiryDate ? new Date(data.expiryDate) : null)
          : undefined,
      },
      include: {
        assessedBy: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(entry, { status: 200 });
  } catch (error) {
    logger.error({ error }, 'Failed to upsert competence entry');
    return NextResponse.json({ error: 'Failed to save competence entry' }, { status: 500 });
  }
}
