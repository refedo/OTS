import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';

const passSchema = z.object({
  layerNo: z.number().int().min(1),
  process: z.string().min(1),
  electrodeClass: z.string().optional().nullable(),
  diameter: z.number().optional().nullable(),
  polarity: z.string().optional().nullable(),
  amperage: z.number().int().optional().nullable(),
  voltage: z.number().int().optional().nullable(),
  travelSpeed: z.number().optional().nullable(),
  heatInput: z.number().optional().nullable(),
});

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const passes = await prisma.wPSPass.findMany({
      where: { wpsId: params.id },
      orderBy: { layerNo: 'asc' },
    });

    return NextResponse.json(passes);
  } catch (error) {
    console.error('Error fetching WPS passes:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch passes', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    
    if (!session || !['Admin', 'Manager', 'Engineer'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = passSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ 
        error: 'Invalid input', 
        details: parsed.error.format() 
      }, { status: 400 });
    }

    const pass = await prisma.wPSPass.create({
      data: {
        ...parsed.data,
        wpsId: params.id,
      },
    });

    return NextResponse.json(pass, { status: 201 });
  } catch (error) {
    console.error('Error creating WPS pass:', error);
    return NextResponse.json({ 
      error: 'Failed to create pass', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
