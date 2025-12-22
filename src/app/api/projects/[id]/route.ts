import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';

const updateSchema = z.object({
  projectNumber: z.string().min(1).optional().nullable(),
  estimationNumber: z.string().optional().nullable(),
  name: z.string().min(2).optional().nullable(),
  clientName: z.string().min(2).optional().nullable(),
  projectManagerId: z.string().uuid().optional().nullable(),
  salesEngineerId: z.string().uuid().optional().nullable(),
  
  // Dates
  contractDate: z.string().optional().nullable(),
  downPaymentDate: z.string().optional().nullable(),
  plannedStartDate: z.string().optional().nullable(),
  plannedEndDate: z.string().optional().nullable(),
  actualStartDate: z.string().optional().nullable(),
  actualEndDate: z.string().optional().nullable(),
  
  // Status and Financial
  status: z.enum(['Draft', 'Active', 'Completed', 'On Hold', 'Cancelled']).optional(),
  contractValue: z.number().optional().nullable(),
  downPayment: z.number().optional().nullable(),
  downPaymentAck: z.boolean().optional(),
  downPaymentMilestone: z.string().optional().nullable(),
  payment2: z.number().optional().nullable(),
  payment2Ack: z.boolean().optional(),
  payment2Milestone: z.string().optional().nullable(),
  payment3: z.number().optional().nullable(),
  payment3Ack: z.boolean().optional(),
  payment3Milestone: z.string().optional().nullable(),
  payment4: z.number().optional().nullable(),
  payment4Ack: z.boolean().optional(),
  payment4Milestone: z.string().optional().nullable(),
  payment5: z.number().optional().nullable(),
  payment5Ack: z.boolean().optional(),
  payment5Milestone: z.string().optional().nullable(),
  payment6: z.number().optional().nullable(),
  payment6Ack: z.boolean().optional(),
  payment6Milestone: z.string().optional().nullable(),
  preliminaryRetention: z.number().optional().nullable(),
  hoRetention: z.number().optional().nullable(),
  
  // Project Details
  structureType: z.string().optional().nullable(),
  numberOfStructures: z.number().int().optional().nullable(),
  erectionSubcontractor: z.string().optional().nullable(),
  incoterm: z.string().optional().nullable(),
  scopeOfWork: z.string().optional().nullable(),
  projectNature: z.string().optional().nullable(),
  projectLocation: z.string().optional().nullable(),
  
  // Durations
  engineeringDuration: z.number().int().optional().nullable(),
  fabricationDeliveryDuration: z.number().int().optional().nullable(),
  erectionDuration: z.number().int().optional().nullable(),
  
  // Technical
  cranesIncluded: z.boolean().optional(),
  surveyorOurScope: z.boolean().optional(),
  contractualTonnage: z.number().optional().nullable(),
  engineeringTonnage: z.number().optional().nullable(),
  
  // Galvanization
  galvanized: z.boolean().optional(),
  galvanizationMicrons: z.number().int().optional().nullable(),
  area: z.number().optional().nullable(),
  m2PerTon: z.number().optional().nullable(),
  
  // Paint
  paintCoat1: z.string().optional().nullable(),
  paintCoat1Microns: z.number().int().optional().nullable(),
  paintCoat1Liters: z.number().optional().nullable(),
  paintCoat2: z.string().optional().nullable(),
  paintCoat2Microns: z.number().int().optional().nullable(),
  paintCoat2Liters: z.number().optional().nullable(),
  paintCoat3: z.string().optional().nullable(),
  paintCoat3Microns: z.number().int().optional().nullable(),
  paintCoat3Liters: z.number().optional().nullable(),
  paintCoat4: z.string().optional().nullable(),
  paintCoat4Microns: z.number().int().optional().nullable(),
  paintCoat4Liters: z.number().optional().nullable(),
  topCoatRalNumber: z.string().optional().nullable(),
  
  // Welding
  weldingProcess: z.string().optional().nullable(),
  weldingWireAwsClass: z.string().optional().nullable(),
  pqrNumber: z.string().optional().nullable(),
  wpsNumber: z.string().optional().nullable(),
  standardCode: z.string().optional().nullable(),
  thirdPartyRequired: z.boolean().optional(),
  ndtTest: z.string().optional().nullable(),
  applicableCodes: z.string().optional().nullable(),
  
  remarks: z.string().optional().nullable(),
});

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: {
      client: true,
      projectManager: { select: { id: true, name: true, position: true, email: true } },
      salesEngineer: { select: { id: true, name: true, email: true } },
      buildings: { orderBy: { designation: 'asc' } },
      tasks: {
        select: {
          id: true,
          title: true,
          description: true,
        },
        take: 10,
      },
      _count: { select: { tasks: true, buildings: true, assignments: true } },
    },
  });

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  // Check permissions
  if (session.role === 'Engineer' || session.role === 'Operator') {
    const hasAccess = await prisma.projectAssignment.findFirst({
      where: { projectId: params.id, userId: session.sub },
    });
    
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  return NextResponse.json(project);
}

export async function PATCH(
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

    const body = await req.json();
    console.log('Received body:', JSON.stringify(body, null, 2));
    const parsed = updateSchema.safeParse(body);
  
  if (!parsed.success) {
    console.error('Validation error:', parsed.error.format());
    return NextResponse.json({ 
      error: 'Invalid input', 
      details: parsed.error.format(),
      received: body 
    }, { status: 400 });
  }

  // Handle client name if provided
  let updateData: any = { ...parsed.data };
  
  if (parsed.data.clientName) {
    // Find or create client by name
    let client = await prisma.client.findFirst({
      where: { name: parsed.data.clientName },
    });

    if (!client) {
      client = await prisma.client.create({
        data: { name: parsed.data.clientName },
      });
    }

    const { clientName, ...rest } = updateData;
    updateData = { ...rest, clientId: client.id };
  }

  // Convert date strings to Date objects
  const dateFields = ['contractDate', 'downPaymentDate', 'plannedStartDate', 'plannedEndDate', 'actualStartDate', 'actualEndDate'];
  dateFields.forEach(field => {
    if (updateData[field]) updateData[field] = new Date(updateData[field]);
  });

  // Remove null/undefined values to only update provided fields
  Object.keys(updateData).forEach(key => {
    if (updateData[key] === null || updateData[key] === undefined) {
      delete updateData[key];
    }
  });

    const project = await prisma.project.update({
      where: { id: params.id },
      data: updateData,
      include: {
        client: true,
        projectManager: { select: { id: true, name: true, position: true } },
        salesEngineer: { select: { id: true, name: true } },
        buildings: true,
      },
    });

    return NextResponse.json(project);
  } catch (error) {
    console.error('Server error in PATCH:', error);
    return NextResponse.json({ 
      error: 'Server error', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;
  
  if (!session || session.role !== 'Admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Check if project exists and get all related record counts
  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: { 
      _count: { 
        select: { 
          tasks: true,
          buildings: true,
          assignments: true,
        } 
      } 
    },
  });

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  // Check for related records that would prevent deletion
  const blockingRecords: string[] = [];
  
  // Check tasks
  if (project._count.tasks > 0) {
    blockingRecords.push(`${project._count.tasks} task${project._count.tasks > 1 ? 's' : ''}`);
  }

  // Check buildings
  if (project._count.buildings > 0) {
    blockingRecords.push(`${project._count.buildings} building${project._count.buildings > 1 ? 's' : ''}`);
  }

  // Check project assignments
  if (project._count.assignments > 0) {
    blockingRecords.push(`${project._count.assignments} project assignment${project._count.assignments > 1 ? 's' : ''}`);
  }

  // Check WPS records
  const wpsCount = await prisma.wPS.count({
    where: { projectId: params.id }
  });
  if (wpsCount > 0) {
    blockingRecords.push(`${wpsCount} WPS record${wpsCount > 1 ? 's' : ''}`);
  }

  // Check ITP records
  const itpCount = await prisma.iTP.count({
    where: { projectId: params.id }
  });
  if (itpCount > 0) {
    blockingRecords.push(`${itpCount} ITP record${itpCount > 1 ? 's' : ''}`);
  }

  // Check document submissions
  const docSubmissionCount = await prisma.documentSubmission.count({
    where: { projectId: params.id }
  });
  if (docSubmissionCount > 0) {
    blockingRecords.push(`${docSubmissionCount} document submission${docSubmissionCount > 1 ? 's' : ''}`);
  }

  // Check scope schedules
  const scopeScheduleCount = await prisma.scopeSchedule.count({
    where: { projectId: params.id }
  });
  if (scopeScheduleCount > 0) {
    blockingRecords.push(`${scopeScheduleCount} scope schedule${scopeScheduleCount > 1 ? 's' : ''}`);
  }

  // If there are blocking records, return detailed error
  if (blockingRecords.length > 0) {
    return NextResponse.json({ 
      error: 'Cannot delete project with existing related records',
      message: `This project has the following related records that must be deleted first: ${blockingRecords.join(', ')}.`,
      details: {
        projectName: project.name,
        projectNumber: project.projectNumber,
        blockingRecords: blockingRecords
      }
    }, { status: 400 });
  }

  // If no blocking records, proceed with deletion
  try {
    await prisma.project.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ 
      success: true,
      message: 'Project deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting project:', error);
    return NextResponse.json({ 
      error: 'Failed to delete project',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}
