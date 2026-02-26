import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

// PATCH - Update receipt item (receive quantity, quality inspection)
export async function PATCH(request: NextRequest) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      itemId,
      receivedQty,
      acceptedQty,
      rejectedQty,
      qualityStatus,
      surfaceCondition,
      surfaceNotes,
      dimensionStatus,
      dimensionNotes,
      thicknessStatus,
      thicknessMeasured,
      thicknessNotes,
      specsCompliance,
      specsNotes,
      mtcAvailable,
      mtcNumber,
      mtcFilePath,
      heatNumber,
      batchNumber,
      inspectionResult,
      rejectionReason,
      remarks,
    } = body;

    if (!itemId) {
      return NextResponse.json(
        { error: 'Missing itemId' },
        { status: 400 }
      );
    }

    // Build update data
    const updateData: any = {};
    
    if (receivedQty !== undefined) updateData.receivedQty = parseFloat(receivedQty);
    if (acceptedQty !== undefined) updateData.acceptedQty = parseFloat(acceptedQty);
    if (rejectedQty !== undefined) updateData.rejectedQty = parseFloat(rejectedQty);
    if (qualityStatus) updateData.qualityStatus = qualityStatus;
    
    // Surface condition
    if (surfaceCondition !== undefined) updateData.surfaceCondition = surfaceCondition;
    if (surfaceNotes !== undefined) updateData.surfaceNotes = surfaceNotes;
    
    // Dimensional check
    if (dimensionStatus !== undefined) updateData.dimensionStatus = dimensionStatus;
    if (dimensionNotes !== undefined) updateData.dimensionNotes = dimensionNotes;
    
    // Thickness check
    if (thicknessStatus !== undefined) updateData.thicknessStatus = thicknessStatus;
    if (thicknessMeasured !== undefined) updateData.thicknessMeasured = thicknessMeasured;
    if (thicknessNotes !== undefined) updateData.thicknessNotes = thicknessNotes;
    
    // Specs compliance
    if (specsCompliance !== undefined) updateData.specsCompliance = specsCompliance;
    if (specsNotes !== undefined) updateData.specsNotes = specsNotes;
    
    // MTC
    if (mtcAvailable !== undefined) updateData.mtcAvailable = mtcAvailable;
    if (mtcNumber !== undefined) updateData.mtcNumber = mtcNumber;
    if (mtcFilePath !== undefined) updateData.mtcFilePath = mtcFilePath;
    
    // Heat/Batch
    if (heatNumber !== undefined) updateData.heatNumber = heatNumber;
    if (batchNumber !== undefined) updateData.batchNumber = batchNumber;
    
    // Inspection result
    if (inspectionResult) updateData.inspectionResult = inspectionResult;
    if (rejectionReason !== undefined) updateData.rejectionReason = rejectionReason;
    if (remarks !== undefined) updateData.remarks = remarks;

    const item = await prisma.materialInspectionReceiptItem.update({
      where: { id: itemId },
      data: updateData,
      include: {
        attachments: {
          include: {
            uploader: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    return NextResponse.json(item);
  } catch (error) {
    console.error('Error updating receipt item:', error);
    return NextResponse.json(
      { error: 'Failed to update receipt item' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a receipt item
export async function DELETE(request: NextRequest) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get('itemId');

    if (!itemId) {
      return NextResponse.json(
        { error: 'Missing itemId' },
        { status: 400 }
      );
    }

    await prisma.materialInspectionReceiptItem.delete({
      where: { id: itemId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting receipt item:', error);
    return NextResponse.json(
      { error: 'Failed to delete receipt item' },
      { status: 500 }
    );
  }
}
