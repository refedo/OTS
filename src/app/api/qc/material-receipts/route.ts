import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';

// Generate Material Inspection Receipt Number
async function generateReceiptNumber(): Promise<string> {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  
  const count = await prisma.materialInspectionReceipt.count({
    where: {
      createdAt: {
        gte: startOfMonth,
        lte: endOfMonth,
      },
    },
  });

  const sequence = (count + 1).toString().padStart(4, '0');
  return `MIR-${year}${month}-${sequence}`;
}

// GET - Fetch all material inspection receipts
export async function GET(request: NextRequest) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const receiptId = searchParams.get('id');
    const projectId = searchParams.get('projectId');
    const status = searchParams.get('status');
    const dolibarrPoId = searchParams.get('dolibarrPoId');

    // Fetch single receipt with full details
    if (receiptId) {
      const receipt = await prisma.materialInspectionReceipt.findUnique({
        where: { id: receiptId },
        include: {
          project: {
            select: { id: true, projectNumber: true, name: true },
          },
          inspector: {
            select: { id: true, name: true, email: true },
          },
          items: {
            include: {
              attachments: {
                include: {
                  uploader: {
                    select: { id: true, name: true },
                  },
                },
              },
            },
            orderBy: { createdAt: 'asc' },
          },
          attachments: {
            include: {
              uploader: {
                select: { id: true, name: true },
              },
            },
            orderBy: { uploadedAt: 'desc' },
          },
        },
      });

      if (!receipt) {
        return NextResponse.json({ error: 'Receipt not found' }, { status: 404 });
      }

      return NextResponse.json(receipt);
    }

    // Fetch list of receipts with filters
    const whereClause: any = {};
    
    if (projectId && projectId !== 'all') {
      whereClause.projectId = projectId;
    }
    
    if (status && status !== 'all') {
      whereClause.status = status;
    }

    if (dolibarrPoId) {
      whereClause.dolibarrPoId = dolibarrPoId;
    }

    const receipts = await prisma.materialInspectionReceipt.findMany({
      where: whereClause,
      include: {
        project: {
          select: { id: true, projectNumber: true, name: true },
        },
        inspector: {
          select: { id: true, name: true, email: true },
        },
        items: {
          select: {
            id: true,
            itemName: true,
            orderedQty: true,
            receivedQty: true,
            acceptedQty: true,
            rejectedQty: true,
            unit: true,
            inspectionResult: true,
          },
        },
      },
      orderBy: { receiptDate: 'desc' },
    });

    return NextResponse.json(receipts);
  } catch (error) {
    console.error('Error fetching material inspection receipts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch material inspection receipts' },
      { status: 500 }
    );
  }
}

// POST - Create new material inspection receipt from PO
export async function POST(request: NextRequest) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      dolibarrPoId,
      dolibarrPoRef,
      supplierName,
      projectId,
      receiptDate,
      items,
      remarks,
    } = body;

    if (!dolibarrPoId || !dolibarrPoRef || !items || items.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: dolibarrPoId, dolibarrPoRef, and items' },
        { status: 400 }
      );
    }

    // Generate receipt number
    const receiptNumber = await generateReceiptNumber();

    // Create receipt with items in a transaction
    const receipt = await prisma.$transaction(async (tx) => {
      // Create receipt
      const newReceipt = await tx.materialInspectionReceipt.create({
        data: {
          id: uuidv4(),
          receiptNumber,
          dolibarrPoId,
          dolibarrPoRef,
          supplierName: supplierName || null,
          projectId: projectId || null,
          receiptDate: receiptDate ? new Date(receiptDate) : new Date(),
          inspectorId: session.sub,
          status: 'In Progress',
          remarks: remarks || null,
        },
      });

      // Create receipt items
      const itemsData = items.map((item: any) => ({
        id: uuidv4(),
        receiptId: newReceipt.id,
        dolibarrLineId: item.dolibarrLineId || null,
        dolibarrProductId: item.dolibarrProductId || null,
        itemName: item.itemName,
        itemDescription: item.itemDescription || null,
        specification: item.specification || null,
        orderedQty: parseFloat(item.orderedQty),
        receivedQty: 0,
        acceptedQty: 0,
        rejectedQty: 0,
        unit: item.unit || 'pcs',
        qualityStatus: 'Pending',
        inspectionResult: 'Pending',
      }));

      await tx.materialInspectionReceiptItem.createMany({
        data: itemsData,
      });

      return newReceipt;
    });

    // Fetch the created receipt with relations
    const createdReceipt = await prisma.materialInspectionReceipt.findUnique({
      where: { id: receipt.id },
      include: {
        project: {
          select: { id: true, projectNumber: true, name: true },
        },
        inspector: {
          select: { id: true, name: true, email: true },
        },
        items: true,
      },
    });

    return NextResponse.json(createdReceipt, { status: 201 });
  } catch (error) {
    console.error('Error creating material inspection receipt:', error);
    return NextResponse.json(
      { error: 'Failed to create material inspection receipt' },
      { status: 500 }
    );
  }
}

// PATCH - Update receipt status or remarks
export async function PATCH(request: NextRequest) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { receiptId, status, remarks } = body;

    if (!receiptId) {
      return NextResponse.json(
        { error: 'Missing receiptId' },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (status) updateData.status = status;
    if (remarks !== undefined) updateData.remarks = remarks;

    const receipt = await prisma.materialInspectionReceipt.update({
      where: { id: receiptId },
      data: updateData,
      include: {
        project: {
          select: { id: true, projectNumber: true, name: true },
        },
        inspector: {
          select: { id: true, name: true, email: true },
        },
        items: true,
      },
    });

    return NextResponse.json(receipt);
  } catch (error) {
    console.error('Error updating material inspection receipt:', error);
    return NextResponse.json(
      { error: 'Failed to update material inspection receipt' },
      { status: 500 }
    );
  }
}
