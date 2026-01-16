import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/projects/:projectId/documents
 * Returns documentation status including uploaded docs, pending approvals, and missing items
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? await verifySession(token) : null;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch document submissions for the project
    const documentSubmissions = await prisma.documentSubmission.findMany({
      where: { projectId },
      select: {
        id: true,
        documentType: true,
        status: true,
        submissionDate: true,
        approvalDate: true,
        updatedAt: true,
      },
    });

    // Define expected document categories for a project
    const expectedCategories = [
      'Design',
      'ITP',
      'WPS',
      'QC',
      'Procurement',
      'Dispatch',
      'Shop Drawing',
      'Material Certificates',
      'Test Reports',
    ];

    // Group documents by category
    const categoryMap = new Map<string, {
      fileCount: number;
      missingItems: number;
      lastUpdate: Date | null;
    }>();

    // Initialize all categories
    expectedCategories.forEach(category => {
      categoryMap.set(category, {
        fileCount: 0,
        missingItems: 0,
        lastUpdate: null,
      });
    });

    // Count documents by type
    documentSubmissions.forEach(doc => {
      // Map document types to categories
      let category = 'Design'; // Default
      
      if (doc.documentType.includes('ITP') || doc.documentType.includes('Inspection')) {
        category = 'ITP';
      } else if (doc.documentType.includes('WPS') || doc.documentType.includes('Welding')) {
        category = 'WPS';
      } else if (doc.documentType.includes('QC') || doc.documentType.includes('Quality')) {
        category = 'QC';
      } else if (doc.documentType.includes('Procurement') || doc.documentType.includes('Material')) {
        category = 'Procurement';
      } else if (doc.documentType.includes('Dispatch') || doc.documentType.includes('Delivery')) {
        category = 'Dispatch';
      } else if (doc.documentType.includes('Shop') || doc.documentType.includes('Drawing')) {
        category = 'Shop Drawing';
      } else if (doc.documentType.includes('Certificate')) {
        category = 'Material Certificates';
      } else if (doc.documentType.includes('Test') || doc.documentType.includes('Report')) {
        category = 'Test Reports';
      }

      const current = categoryMap.get(category);
      if (current) {
        current.fileCount++;
        
        // Update last update date
        const docDate = doc.approvalDate || doc.submissionDate || doc.updatedAt;
        if (docDate && (!current.lastUpdate || docDate > current.lastUpdate)) {
          current.lastUpdate = docDate;
        }
      }
    });

    // Calculate missing items based on project requirements
    // For now, we'll use a simple heuristic: if category has 0 files, it's missing
    categoryMap.forEach((value, key) => {
      if (value.fileCount === 0) {
        value.missingItems = 1; // At least 1 document expected
      }
    });

    // Convert to array
    const categories = Array.from(categoryMap.entries()).map(([category, stats]) => ({
      category,
      fileCount: stats.fileCount,
      missingItems: stats.missingItems,
      lastUpdate: stats.lastUpdate,
    }));

    // Calculate totals
    const totalDocuments = documentSubmissions.length;
    const pendingApprovals = documentSubmissions.filter(
      doc => doc.status === 'Submitted' || doc.status === 'Under Review'
    ).length;

    return NextResponse.json({
      categories,
      totalDocuments,
      pendingApprovals,
    });
  } catch (error) {
    console.error('Error fetching documents data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch documents data' },
      { status: 500 }
    );
  }
}
