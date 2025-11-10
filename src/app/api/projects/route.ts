import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';

const createSchema = z.object({
  projectNumber: z.string().min(1),
  estimationNumber: z.string().optional().nullable(),
  name: z.string().min(2),
  clientId: z.string().uuid().optional().nullable(),
  clientName: z.string().optional().nullable(),
  projectManagerId: z.string().uuid(),
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
  coatingSystem: z.string().optional().nullable(),
  
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

export async function GET(req: Request) {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const search = searchParams.get('search');
  const projectManagerId = searchParams.get('projectManagerId');

  let where: any = {};

  // Role-based filtering
  if (session.role === 'Manager') {
    where.projectManagerId = session.sub;
  } else if (session.role === 'Engineer' || session.role === 'Operator') {
    where.assignments = { some: { userId: session.sub } };
  }

  // Additional filters
  if (status) where.status = status;
  if (projectManagerId) where.projectManagerId = projectManagerId;
  if (search) {
    where.OR = [
      { projectNumber: { contains: search } },
      { name: { contains: search } },
      { client: { name: { contains: search } } },
    ];
  }

  try {
    const projects = await prisma.project.findMany({
      where,
      select: {
        id: true,
        projectNumber: true,
        name: true,
        status: true,
        scopeOfWork: true,
        plannedStartDate: true,
        plannedEndDate: true,
        actualStartDate: true,
        actualEndDate: true,
        contractValue: true,
        contractualTonnage: true,
        engineeringTonnage: true,
        createdAt: true,
        updatedAt: true,
        client: { select: { id: true, name: true } },
        projectManager: { select: { id: true, name: true, position: true } },
        salesEngineer: { select: { id: true, name: true } },
        buildings: { select: { id: true, designation: true, name: true } },
        _count: { select: { tasks: true, buildings: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    if (!session || !['Admin', 'Manager'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      console.error('Validation error:', parsed.error);
      return NextResponse.json({ error: 'Invalid input', details: parsed.error }, { status: 400 });
    }

  // Find or create client by name
  let clientId = parsed.data.clientId;
  
  if (parsed.data.clientName) {
    let client = await prisma.client.findFirst({
      where: { name: parsed.data.clientName },
    });

    if (!client) {
      client = await prisma.client.create({
        data: { name: parsed.data.clientName },
      });
    }
    clientId = client.id;
  }

  // Convert date strings to Date objects
  const { clientName, clientId: _, ...projectData } = parsed.data;
  const data: any = { ...projectData, clientId };
  const dateFields = ['contractDate', 'downPaymentDate', 'plannedStartDate', 'plannedEndDate', 'actualStartDate', 'actualEndDate'];
  dateFields.forEach(field => {
    if (data[field]) data[field] = new Date(data[field]);
  });

    const project = await prisma.project.create({
      data,
      include: {
        client: true,
        projectManager: { select: { id: true, name: true, position: true } },
        salesEngineer: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json({ 
      error: 'Failed to create project', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
