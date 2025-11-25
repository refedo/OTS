import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';

const updatePassSchema = z.object({
  layerNo: z.number().int().min(1).optional(),
  process: z.string().optional(),
  electrodeClass: z.string().optional().nullable(),
  diameter: z.number().optional().nullable(),
  polarity: z.string().optional().nullable(),
  amperage: z.number().int().optional().nullable(),
  voltage: z.number().int().optional().nullable(),
  travelSpeed: z.number().optional().nullable(),
  heatInput: z.number().optional().nullable(),
});

export async function PATCH(
  req: Request,
  { params }: { params: { id: string; passId: string } }
) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    
    if (!session || !['Admin', 'Manager', 'Engineer'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = updatePassSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ 
        error: 'Invalid input', 
        details: parsed.error.format() 
      }, { status: 400 });
    }

    const pass = await prisma.wPSPass.update({
      where: { id: params.passId },
      data: parsed.data,
    });

    return NextResponse.json(pass);
  } catch (error) {
    console.error('Error updating WPS pass:', error);
    return NextResponse.json({ 
      error: 'Failed to update pass', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string; passId: string } }
) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    
    if (!session || !['Admin', 'Manager'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.wPSPass.delete({
      where: { id: params.passId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting WPS pass:', error);
    return NextResponse.json({ 
      error: 'Failed to delete pass', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
