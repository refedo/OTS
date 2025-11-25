import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';

const itpSchema = z.object({
  itpNumber: z.string().min(1),
  revision: z.number().int().min(0).default(0),
  projectId: z.string().uuid(),
  type: z.enum(['STANDARD', 'CUSTOM']).default('CUSTOM'),
  jobNo: z.string().optional().nullable(),
  client: z.string().optional().nullable(),
  applicableCodes: z.string().optional().nullable(),
  remarks: z.string().optional().nullable(),
  approvedById: z.string().uuid().optional().nullable(),
  clientApprovedBy: z.string().optional().nullable(),
});

export async function GET(req: Request) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? await verifySession(token) : null;
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');
    const status = searchParams.get('status');
    const type = searchParams.get('type');

    const itps = await prisma.iTP.findMany({
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
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        approvedBy: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: { activities: true },
        },
      },
      orderBy: [
        { createdAt: 'desc' },
      ],
    });

    return NextResponse.json(itps);
  } catch (error) {
    console.error('Error fetching ITPs:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch ITPs', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? await verifySession(token) : null;
    
    // Only QA/QC Engineers, Managers, and Admins can create ITPs
    if (!session || !['Admin', 'Manager', 'Engineer'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = itpSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ 
        error: 'Invalid input', 
        details: parsed.error.format() 
      }, { status: 400 });
    }

    const itp = await prisma.iTP.create({
      data: {
        ...parsed.data,
        createdById: session.sub,
      },
      include: {
        project: {
          select: {
            id: true,
            projectNumber: true,
            name: true,
          },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json(itp, { status: 201 });
  } catch (error) {
    console.error('Error creating ITP:', error);
    
    // Handle Prisma unique constraint errors
    if (error && typeof error === 'object' && 'code' in error) {
      if (error.code === 'P2002') {
        const meta = 'meta' in error ? error.meta as any : null;
        const field = meta?.target?.[0] || 'field';
        
        if (field === 'itpNumber') {
          return NextResponse.json({ 
            error: 'Duplicate ITP Number', 
            message: 'An ITP with this number already exists. Please use a different ITP number.' 
          }, { status: 409 });
        }
        
        return NextResponse.json({ 
          error: 'Duplicate Entry', 
          message: `An ITP with this ${field} already exists.` 
        }, { status: 409 });
      }
    }
    
    return NextResponse.json({ 
      error: 'Failed to create ITP', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
