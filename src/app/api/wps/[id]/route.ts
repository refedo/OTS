import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';

const updateSchema = z.object({
  wpsNumber: z.string().min(1).optional(),
  revision: z.number().int().min(0).optional(),
  type: z.enum(['STANDARD', 'CUSTOM']).optional(),
  weldingProcess: z.string().optional(),
  supportingPQR: z.string().optional().nullable(),
  baseMaterial: z.string().optional().nullable(),
  thicknessGroove: z.number().optional().nullable(),
  thicknessFillet: z.number().optional().nullable(),
  diameter: z.number().optional().nullable(),
  fillerMetalSpec: z.string().optional().nullable(),
  fillerClass: z.string().optional().nullable(),
  shieldingGas: z.string().optional().nullable(),
  flowRate: z.number().optional().nullable(),
  currentType: z.string().optional().nullable(),
  preheatTempMin: z.number().int().optional().nullable(),
  interpassTempMin: z.number().int().optional().nullable(),
  interpassTempMax: z.number().int().optional().nullable(),
  postWeldTemp: z.number().int().optional().nullable(),
  position: z.string().optional().nullable(),
  jointType: z.string().optional().nullable(),
  grooveAngle: z.number().int().optional().nullable(),
  rootOpening: z.number().optional().nullable(),
  backingType: z.string().optional().nullable(),
  remarks: z.string().optional().nullable(),
  status: z.enum(['Draft', 'Approved', 'Superseded']).optional(),
  approvedById: z.string().uuid().optional().nullable(),
  clientApprovedBy: z.string().optional().nullable(),
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

    const wps = await prisma.wPS.findUnique({
      where: { id: params.id },
      include: {
        project: {
          select: {
            id: true,
            projectNumber: true,
            name: true,
            client: {
              select: { id: true, name: true },
            },
          },
        },
        preparedBy: {
          select: { id: true, name: true, email: true, position: true },
        },
        approvedBy: {
          select: { id: true, name: true, email: true, position: true },
        },
        passes: {
          orderBy: { layerNo: 'asc' },
        },
      },
    });

    if (!wps) {
      return NextResponse.json({ error: 'WPS not found' }, { status: 404 });
    }

    return NextResponse.json(wps);
  } catch (error) {
    console.error('Error fetching WPS:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch WPS', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

export async function PATCH(
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
    const parsed = updateSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ 
        error: 'Invalid input', 
        details: parsed.error.format() 
      }, { status: 400 });
    }

    const wps = await prisma.wPS.update({
      where: { id: params.id },
      data: parsed.data,
      include: {
        project: {
          select: {
            id: true,
            projectNumber: true,
            name: true,
          },
        },
        preparedBy: {
          select: { id: true, name: true, email: true },
        },
        approvedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json(wps);
  } catch (error) {
    console.error('Error updating WPS:', error);
    return NextResponse.json({ 
      error: 'Failed to update WPS', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    
    if (!session || !['Admin', 'Manager'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.wPS.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting WPS:', error);
    return NextResponse.json({ 
      error: 'Failed to delete WPS', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
