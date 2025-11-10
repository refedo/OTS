import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';

const buildingSchema = z.object({
  designation: z.string().min(2).max(4).regex(/^[A-Z0-9]+$/, 'Designation must be 2-4 uppercase letters/numbers'),
  name: z.string().min(2),
  description: z.string().optional().nullable(),
});

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const buildings = await prisma.building.findMany({
    where: { projectId: id },
    orderBy: { designation: 'asc' },
  });

  return NextResponse.json(buildings);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;
  
  if (!session || !['Admin', 'Manager'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;

  const body = await req.json();
  const parsed = buildingSchema.safeParse(body);
  
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error }, { status: 400 });
  }

  // Check if designation already exists for this project
  const existing = await prisma.building.findFirst({
    where: {
      projectId: id,
      designation: parsed.data.designation,
    },
  });

  if (existing) {
    return NextResponse.json({ 
      error: 'Building designation already exists for this project' 
    }, { status: 400 });
  }

  const building = await prisma.building.create({
    data: {
      ...parsed.data,
      projectId: id,
    },
  });

  return NextResponse.json(building, { status: 201 });
}
