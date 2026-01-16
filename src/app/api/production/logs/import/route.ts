import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';

/**
 * POST /api/production/logs/import
 * Import production logs from CSV/Excel data with field mapping
 */
export async function POST(req: Request) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { data, mapping, projectId } = body;

    if (!data || !Array.isArray(data) || data.length === 0) {
      return NextResponse.json({ error: 'No data provided' }, { status: 400 });
    }

    if (!mapping) {
      return NextResponse.json({ error: 'Field mapping required' }, { status: 400 });
    }

    // projectId is now optional - if not provided, we'll match parts across all projects
    let assemblyParts: any[] = [];
    
    if (projectId) {
      // Verify project exists
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { id: true, projectNumber: true },
      });

      if (!project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }

      // Get assembly parts for this specific project
      assemblyParts = await prisma.assemblyPart.findMany({
        where: { projectId },
        select: { 
          id: true, 
          partDesignation: true, 
          assemblyMark: true, 
          partMark: true,
          quantity: true,
          projectId: true,
        },
      });
    } else {
      // Get all assembly parts across all projects for multi-project import
      assemblyParts = await prisma.assemblyPart.findMany({
        select: { 
          id: true, 
          partDesignation: true, 
          assemblyMark: true, 
          partMark: true,
          quantity: true,
          projectId: true,
        },
      });
    }

    const results = {
      imported: 0,
      skipped: 0,
      errors: [] as string[],
    };

    // Process each row
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNum = i + 2; // Excel row number (1-indexed + header)

      try {
        // Extract values using mapping
        const getValue = (field: string) => {
          const mappedColumn = mapping[field];
          if (!mappedColumn) return null;
          return row[mappedColumn] || null;
        };

        const partDesignation = getValue('partDesignation');
        const assemblyMark = getValue('assemblyMark');
        const partMark = getValue('partMark');
        const processType = getValue('processType') || 'Preparation';
        const dateProcessedStr = getValue('dateProcessed');
        const processedQtyStr = getValue('processedQty');
        const remainingQtyStr = getValue('remainingQty');
        const processingTeam = getValue('processingTeam');
        const processingLocation = getValue('processingLocation');
        const remarks = getValue('remarks');
        const qcStatus = getValue('qcStatus') || 'Not Required';
        const qcRequiredStr = getValue('qcRequired');

        // Find matching assembly part
        let assemblyPart = null;
        if (partDesignation) {
          assemblyPart = assemblyParts.find(
            p => p.partDesignation?.toLowerCase() === partDesignation.toLowerCase()
          );
        }
        if (!assemblyPart && assemblyMark) {
          assemblyPart = assemblyParts.find(
            p => p.assemblyMark?.toLowerCase() === assemblyMark.toLowerCase()
          );
        }
        if (!assemblyPart && partMark) {
          assemblyPart = assemblyParts.find(
            p => p.partMark?.toLowerCase() === partMark.toLowerCase()
          );
        }

        if (!assemblyPart) {
          results.skipped++;
          results.errors.push(`Row ${rowNum}: Part not found (${partDesignation || assemblyMark || partMark || 'no identifier'})`);
          continue;
        }

        // Parse date
        const parseDate = (dateStr: string | null): Date => {
          if (!dateStr) return new Date();
          const date = new Date(dateStr);
          return isNaN(date.getTime()) ? new Date() : date;
        };

        const dateProcessed = parseDate(dateProcessedStr);

        // Parse quantities
        const processedQty = processedQtyStr ? parseInt(processedQtyStr, 10) : assemblyPart.quantity;
        const remainingQty = remainingQtyStr ? parseInt(remainingQtyStr, 10) : 0;
        const qcRequired = qcRequiredStr?.toLowerCase() === 'true' || qcRequiredStr === '1' || qcRequiredStr?.toLowerCase() === 'yes';

        // Create production log
        await prisma.productionLog.create({
          data: {
            assemblyPartId: assemblyPart.id,
            processType,
            dateProcessed,
            processedQty: isNaN(processedQty) ? assemblyPart.quantity : processedQty,
            remainingQty: isNaN(remainingQty) ? 0 : remainingQty,
            processingTeam,
            processingLocation,
            remarks,
            qcStatus,
            qcRequired,
            createdById: session.sub,
          },
        });

        results.imported++;
      } catch (error) {
        results.errors.push(`Row ${rowNum}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        results.skipped++;
      }
    }

    return NextResponse.json({
      success: true,
      results,
      message: `Imported ${results.imported} production log(s), skipped ${results.skipped}`,
    });
  } catch (error) {
    console.error('Error importing production logs:', error);
    return NextResponse.json({
      error: 'Failed to import production logs',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
