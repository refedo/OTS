import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';

const wpsSchema = z.object({
  wpsNumber: z.string().min(1),
  revision: z.number().int().min(0).default(0),
  projectId: z.string().uuid(),
  type: z.enum(['STANDARD', 'CUSTOM']).default('CUSTOM'),
  weldingProcess: z.string().min(1),
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
  approvedById: z.string().uuid().optional().nullable(),
  clientApprovedBy: z.string().optional().nullable(),
});

export async function GET(req: Request) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');
    const status = searchParams.get('status');
    const type = searchParams.get('type');

    const wps = await prisma.wPS.findMany({
      where: {
        ...(projectId && { projectId }),
        ...(status && { status }),
        ...(type && { type }),
      },
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
        _count: {
          select: { passes: true },
        },
      },
      orderBy: [
        { createdAt: 'desc' },
      ],
    });

    return NextResponse.json(wps);
  } catch (error) {
    console.error('Error fetching WPS:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch WPS', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    
    // Only Welding Engineers, Managers, and Admins can create WPS
    if (!session || !['Admin', 'Manager', 'Engineer'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = wpsSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ 
        error: 'Invalid input', 
        details: parsed.error.format() 
      }, { status: 400 });
    }

    const wps = await prisma.wPS.create({
      data: {
        ...parsed.data,
        preparedById: session.sub,
      },
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
      },
    });

    return NextResponse.json(wps, { status: 201 });
  } catch (error) {
    console.error('Error creating WPS:', error);
    return NextResponse.json({ 
      error: 'Failed to create WPS', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
