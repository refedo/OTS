import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';

const referenceSchema = z.object({
  referencedDocumentId: z.string().uuid(),
  referenceType: z.string().default('Related Form'),
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

    const references = await prisma.documentReference.findMany({
      where: { documentId: params.id },
      include: {
        referencedDocument: {
          select: {
            id: true,
            documentNumber: true,
            title: true,
            type: true,
            status: true,
            filePath: true,
            content: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(references);
  } catch (error) {
    console.error('Error fetching references:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch references', 
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
    const parsed = referenceSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ 
        error: 'Invalid input', 
        details: parsed.error.format() 
      }, { status: 400 });
    }

    const reference = await prisma.documentReference.create({
      data: {
        documentId: params.id,
        ...parsed.data,
      },
      include: {
        referencedDocument: {
          select: {
            id: true,
            documentNumber: true,
            title: true,
            type: true,
            status: true,
          },
        },
      },
    });

    return NextResponse.json(reference, { status: 201 });
  } catch (error) {
    console.error('Error creating reference:', error);
    return NextResponse.json({ 
      error: 'Failed to create reference', 
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
    
    if (!session || !['Admin', 'Manager', 'Engineer'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const referenceId = searchParams.get('referenceId');

    if (!referenceId) {
      return NextResponse.json({ error: 'Reference ID required' }, { status: 400 });
    }

    await prisma.documentReference.delete({
      where: { id: referenceId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting reference:', error);
    return NextResponse.json({ 
      error: 'Failed to delete reference', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
