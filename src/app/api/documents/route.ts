import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';

const documentSchema = z.object({
  documentNumber: z.string().min(1),
  title: z.string().min(1),
  revision: z.number().int().min(0).default(0),
  categoryId: z.string().uuid(),
  description: z.string().optional().nullable(),
  type: z.enum(['Procedure', 'Policy', 'Form', 'Work Instruction', 'Manual']).default('Procedure'),
  standard: z.string().optional().nullable(),
  filePath: z.string().optional().nullable(),
  fileSize: z.number().int().optional().nullable(),
  fileType: z.string().optional().nullable(),
  content: z.string().optional().nullable(),
  status: z.enum(['Draft', 'Under Review', 'Approved', 'Superseded']).default('Draft'),
  effectiveDate: z.string().optional().nullable(),
  reviewDate: z.string().optional().nullable(),
  tags: z.string().optional().nullable(),
  approvedById: z.string().uuid().optional().nullable(),
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
    const categoryId = searchParams.get('categoryId');
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const search = searchParams.get('search');

    const documents = await prisma.document.findMany({
      where: {
        ...(categoryId && { categoryId }),
        ...(status && { status }),
        ...(type && { type }),
        ...(search && {
          OR: [
            { title: { contains: search } },
            { documentNumber: { contains: search } },
            { tags: { contains: search } },
          ],
        }),
      },
      include: {
        category: {
          select: { id: true, name: true },
        },
        uploadedBy: {
          select: { id: true, name: true, position: true },
        },
        approvedBy: {
          select: { id: true, name: true, position: true },
        },
      },
      orderBy: [
        { status: 'asc' },
        { documentNumber: 'asc' },
      ],
    });

    return NextResponse.json(documents);
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch documents', 
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
    const parsed = documentSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ 
        error: 'Invalid input', 
        details: parsed.error.format() 
      }, { status: 400 });
    }

    const data = parsed.data;
    const document = await prisma.document.create({
      data: {
        ...data,
        effectiveDate: data.effectiveDate ? new Date(data.effectiveDate) : null,
        reviewDate: data.reviewDate ? new Date(data.reviewDate) : null,
        uploadedById: session.sub,
      },
      include: {
        category: {
          select: { id: true, name: true },
        },
        uploadedBy: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    console.error('Error creating document:', error);
    return NextResponse.json({ 
      error: 'Failed to create document', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
