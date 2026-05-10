import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const CreateSchema = z.object({
  updateText: z.string().min(1),
  evidenceUrl: z.string().optional(),
});

async function getSession() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  return token ? verifySession(token) : null;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    // Verify the CAR record exists
    const car = await prisma.imsCarRecord.findUnique({ where: { id } });
    if (!car) return NextResponse.json({ error: 'CAR record not found' }, { status: 404 });

    const body = await request.json();
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;

    const logEntry = await prisma.imsCarProgressLog.create({
      data: {
        carId: id,
        updateText: data.updateText,
        evidenceUrl: data.evidenceUrl ?? null,
        userId: session.sub,
        userName: session.name,
      },
    });

    return NextResponse.json(logEntry, { status: 201 });
  } catch (error) {
    logger.error({ error }, 'Failed to create IMS CAR progress log');
    return NextResponse.json({ error: 'Failed to create progress log' }, { status: 500 });
  }
}
