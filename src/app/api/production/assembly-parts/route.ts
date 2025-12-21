import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';

const assemblyPartSchema = z.object({
  projectId: z.string().uuid(),
  buildingId: z.string().uuid().optional().nullable(),
  assemblyMark: z.string().min(1),
  subAssemblyMark: z.string().optional().nullable(),
  partMark: z.string().min(1),
  quantity: z.number().int().min(1),
  name: z.string().min(1),
  profile: z.string().optional().nullable(),
  grade: z.string().optional().nullable(),
  lengthMm: z.number().optional().nullable(),
  netAreaPerUnit: z.number().optional().nullable(),
  netAreaTotal: z.number().optional().nullable(),
  singlePartWeight: z.number().optional().nullable(),
  netWeightTotal: z.number().optional().nullable(),
});

async function generatePartDesignation(
  projectId: string, 
  buildingId: string | null, 
  partMark: string
): Promise<string> {
  // Get project number
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { projectNumber: true },
  });

  if (!project) {
    throw new Error('Project not found');
  }

  // Get building designation if provided
  let buildingDesignation = '';
  if (buildingId) {
    const building = await prisma.building.findUnique({
      where: { id: buildingId },
      select: { designation: true },
    });
    buildingDesignation = building ? `-${building.designation}` : '';
  }

  // Base designation: ProjectNumber-BuildingDesignation-PartMark (e.g., "274-EXT-A1")
  const baseDesignation = `${project.projectNumber}${buildingDesignation}-${partMark}`;
  
  // Check if this designation already exists
  const existingPart = await prisma.assemblyPart.findUnique({
    where: { partDesignation: baseDesignation },
  });

  // If it doesn't exist, return the base designation
  if (!existingPart) {
    return baseDesignation;
  }

  // If it exists, find the next available sequence number
  let sequence = 1;
  let newDesignation = `${baseDesignation}-${sequence}`;
  
  while (await prisma.assemblyPart.findUnique({ where: { partDesignation: newDesignation } })) {
    sequence++;
    newDesignation = `${baseDesignation}-${sequence}`;
  }

  return newDesignation;
}

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
    const buildingId = searchParams.get('buildingId');
    const status = searchParams.get('status');
    const includeLogs = searchParams.get('includeLogs') === 'true';
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100');
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      ...(projectId && { projectId }),
      ...(buildingId && { buildingId }),
      ...(status && { status }),
    };

    // Add search filter (MySQL is case-insensitive by default for contains)
    if (search) {
      where.OR = [
        { partDesignation: { contains: search } },
        { assemblyMark: { contains: search } },
        { partMark: { contains: search } },
        { name: { contains: search } },
      ];
    }

    // Get total count for pagination
    const total = await prisma.assemblyPart.count({ where });

    const assemblyParts = await prisma.assemblyPart.findMany({
      where,
      skip,
      take: limit,
      select: {
        id: true,
        partDesignation: true,
        assemblyMark: true,
        subAssemblyMark: true,
        partMark: true,
        quantity: true,
        name: true,
        profile: true,
        grade: true,
        lengthMm: true,
        netAreaPerUnit: true,
        netAreaTotal: true,
        singlePartWeight: true,
        netWeightTotal: true,
        status: true,
        source: true,
        externalRef: true,
        projectId: true,
        buildingId: true,
        createdAt: true,
        updatedAt: true,
        project: {
          select: { id: true, name: true, projectNumber: true, galvanized: true },
        },
        building: {
          select: { id: true, name: true, designation: true },
        },
        createdBy: {
          select: { id: true, name: true },
        },
        ...(includeLogs && {
          productionLogs: {
            select: {
              processType: true,
              processedQty: true,
            },
          },
        }),
        _count: {
          select: { productionLogs: true },
        },
      },
      orderBy: [
        { assemblyMark: 'asc' },
        { partMark: 'asc' },
      ],
    });

    return NextResponse.json({
      data: assemblyParts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching assembly parts:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch assembly parts', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    
    if (!session || !['Admin', 'Manager', 'Engineer'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    
    // Handle bulk upload
    if (Array.isArray(body)) {
      const results = [];
      const errors = [];

      for (const item of body) {
        const parsed = assemblyPartSchema.safeParse(item);
        
        if (!parsed.success) {
          errors.push({
            item,
            error: parsed.error.format(),
          });
          continue;
        }

        try {
          // Generate part designation
          const partDesignation = await generatePartDesignation(
            parsed.data.projectId,
            parsed.data.buildingId || null,
            parsed.data.partMark
          );

          const assemblyPart = await prisma.assemblyPart.create({
            data: {
              ...parsed.data,
              partDesignation,
              createdById: session.sub,
            },
          });
          results.push(assemblyPart);
        } catch (err) {
          errors.push({
            item,
            error: err instanceof Error ? err.message : 'Unknown error',
          });
        }
      }

      return NextResponse.json({
        success: results.length,
        failed: errors.length,
        results,
        errors,
      }, { status: 201 });
    }

    // Handle single upload
    const parsed = assemblyPartSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ 
        error: 'Invalid input', 
        details: parsed.error.format() 
      }, { status: 400 });
    }

    // Generate part designation
    const partDesignation = await generatePartDesignation(
      parsed.data.projectId,
      parsed.data.buildingId || null,
      parsed.data.partMark
    );

    const assemblyPart = await prisma.assemblyPart.create({
      data: {
        ...parsed.data,
        partDesignation,
        createdById: session.sub,
      },
      include: {
        project: {
          select: { id: true, name: true },
        },
        building: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json(assemblyPart, { status: 201 });
  } catch (error) {
    console.error('Error creating assembly part:', error);
    return NextResponse.json({ 
      error: 'Failed to create assembly part', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
