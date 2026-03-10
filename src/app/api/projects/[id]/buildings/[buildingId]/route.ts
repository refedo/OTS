import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { getCurrentUserPermissions } from '@/lib/permission-checker';

const buildingSchema = z.object({
  designation: z.string().min(2).max(4).regex(/^[A-Z0-9]+$/).optional(),
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
}).partial();

export async function PATCH(
  req: Request,
  { params }: { params: { id: string; buildingId: string } }
) {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userPermissions = await getCurrentUserPermissions();
  if (!userPermissions.includes('projects.edit')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const parsed = buildingSchema.safeParse(body);
  
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error }, { status: 400 });
  }

  const building = await prisma.building.update({
    where: { id: params.buildingId },
    data: parsed.data,
  });

  return NextResponse.json(building);
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string; buildingId: string } }
) {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const delPermissions = await getCurrentUserPermissions();
  if (!delPermissions.includes('projects.delete')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await prisma.building.delete({
    where: { id: params.buildingId },
  });

  return NextResponse.json({ success: true });
}
