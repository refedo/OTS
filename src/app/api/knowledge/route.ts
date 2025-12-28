import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';

const COOKIE_NAME = process.env.COOKIE_NAME || 'ots_session';

const createSchema = z.object({
  type: z.enum(['CHALLENGE', 'ISSUE', 'LESSON', 'BEST_PRACTICE']),
  title: z.string().min(2),
  summary: z.string().min(10),
  rootCause: z.string().optional().nullable(),
  resolution: z.string().optional().nullable(),
  recommendation: z.string().optional().nullable(),
  severity: z.enum(['Low', 'Medium', 'High', 'Critical']),
  process: z.enum(['Design', 'Detailing', 'Procurement', 'Production', 'QC', 'Erection']),
  projectId: z.string().uuid().optional().nullable(),
  buildingId: z.string().uuid().optional().nullable(),
  workUnitId: z.string().uuid().optional().nullable(),
  evidenceLinks: z.array(z.object({
    type: z.string(),
    id: z.string(),
    label: z.string()
  })).optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
  ownerId: z.string().uuid().optional().nullable(),
  attachments: z.array(z.object({
    fileName: z.string(),
    filePath: z.string(),
    uploadedAt: z.string()
  })).optional().nullable(),
});

export async function GET(req: Request) {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  const session = token ? verifySession(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type');
  const status = searchParams.get('status');
  const process = searchParams.get('process');
  const severity = searchParams.get('severity');
  const projectId = searchParams.get('projectId');
  const search = searchParams.get('search');
  const validated = searchParams.get('validated');

  let whereClause: any = {};

  if (type) whereClause.type = type;
  if (status) whereClause.status = status;
  if (process) whereClause.process = process;
  if (severity) whereClause.severity = severity;
  if (projectId) whereClause.projectId = projectId;
  if (validated === 'true') whereClause.status = 'Validated';

  if (search) {
    whereClause.OR = [
      { title: { contains: search } },
      { summary: { contains: search } },
      { resolution: { contains: search } },
    ];
  }

  try {
    console.log('Fetching knowledge entries with filters:', whereClause);
    
    const entries = await prisma.knowledgeEntry.findMany({
      where: whereClause,
      include: {
        reportedBy: {
          select: { id: true, name: true, email: true }
        },
        owner: {
          select: { id: true, name: true, email: true }
        },
        validatedBy: {
          select: { id: true, name: true, email: true }
        },
        project: {
          select: { id: true, name: true, projectNumber: true }
        },
        building: {
          select: { id: true, name: true, designation: true }
        },
        workUnit: {
          select: { id: true, type: true, referenceModule: true }
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    console.log(`Found ${entries.length} knowledge entries`);
    return NextResponse.json(entries);
  } catch (error) {
    console.error('Error fetching knowledge entries:', error);
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json({ 
      error: 'Failed to fetch knowledge entries',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  const session = token ? verifySession(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    console.log('Received knowledge entry payload:', JSON.stringify(body, null, 2));
    
    const validated = createSchema.parse(body);
    console.log('Validation passed, creating entry...');

    const entry = await prisma.knowledgeEntry.create({
      data: {
        ...validated,
        reportedById: session.sub,
        status: 'Open',
        evidenceLinks: validated.evidenceLinks || [],
        tags: validated.tags || [],
        attachments: validated.attachments || [],
      },
      include: {
        reportedBy: {
          select: { id: true, name: true, email: true }
        },
        project: {
          select: { id: true, name: true, projectNumber: true }
        },
      },
    });

    console.log('Knowledge entry created successfully:', entry.id);
    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Validation failed:', JSON.stringify(error.errors, null, 2));
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: error.errors,
        message: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      }, { status: 400 });
    }
    console.error('Error creating knowledge entry:', error);
    return NextResponse.json({ 
      error: 'Failed to create knowledge entry',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
