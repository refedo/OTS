import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { logSystemEvent } from '@/lib/api-utils';

const massLogSchema = z.object({
  logs: z.array(z.object({
    assemblyPartId: z.string().uuid(),
    processType: z.enum([
      'Preparation',
      'Fit-up',
      'Welding',
      'Visualization',
      'Sandblasting',
      'Painting',
      'Galvanization',
      'Dispatched to Sandblasting',
      'Dispatched to Galvanization',
      'Dispatched to Painting',
      'Dispatched to Site',
      'Dispatched to Customer',
      'Erection',
    ]),
    dateProcessed: z.string(),
    processedQty: z.number().int().min(1),
    processingTeam: z.string().optional().nullable(),
    processingLocation: z.string().optional().nullable(),
    remarks: z.string().optional().nullable(),
    reportNumber: z.string().optional().nullable(),
  })),
});

export async function POST(req: Request) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = massLogSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ 
        error: 'Invalid input', 
        details: parsed.error.format() 
      }, { status: 400 });
    }

    const results = {
      successCount: 0,
      failedCount: 0,
      errors: [] as string[],
    };

    // Process each log
    for (const logData of parsed.data.logs) {
      try {
        const { assemblyPartId, processedQty, dateProcessed, processType, ...otherData } = logData;

        // Get the assembly part
        const assemblyPart = await prisma.assemblyPart.findUnique({
          where: { id: assemblyPartId },
          include: {
            productionLogs: true,
            project: {
              select: { projectNumber: true },
            },
            building: {
              select: { designation: true },
            },
          },
        });

        if (!assemblyPart) {
          results.failedCount++;
          results.errors.push(`Part ${assemblyPartId} not found`);
          continue;
        }

        // Define sequential process order for production phases
        const processOrder = ['Fit-up', 'Welding', 'Visualization'];
        const currentProcessIndex = processOrder.indexOf(processType);

        // Only enforce sequential order for the main production processes
        if (currentProcessIndex > 0) {
          const previousProcess = processOrder[currentProcessIndex - 1];
          
          // Check if previous process is completed
          const previousProcessLogs = assemblyPart.productionLogs.filter(
            (log: any) => log.processType === previousProcess
          );
          
          const totalProcessedPrevious = previousProcessLogs.reduce(
            (sum: number, log: any) => sum + log.processedQty,
            0
          );

          if (totalProcessedPrevious < assemblyPart.quantity) {
            results.failedCount++;
            results.errors.push(
              `Part ${assemblyPart.partDesignation}: Cannot log ${processType} before completing ${previousProcess} (${totalProcessedPrevious}/${assemblyPart.quantity} done)`
            );
            continue;
          }
        }

        // Calculate total processed for this specific process type
        const totalProcessedForThisProcess = assemblyPart.productionLogs
          .filter((log: any) => log.processType === processType)
          .reduce((sum: number, log: any) => sum + log.processedQty, 0);

        const remainingQty = assemblyPart.quantity - totalProcessedForThisProcess - processedQty;

        if (remainingQty < 0) {
          results.failedCount++;
          results.errors.push(
            `Part ${assemblyPart.partDesignation}: Quantity exceeds available for ${processType}`
          );
          continue;
        }

        // Use provided report number or generate if dispatch process and not "to Customer"
        let reportNumber = otherData.reportNumber;
        
        // Only auto-generate if it's a dispatch process, not to customer, and no report number provided
        if (processType.startsWith('Dispatched') && processType !== 'Dispatched to Customer' && !reportNumber) {
          const dispatchCode = processType.replace('Dispatched to ', '').substring(0, 3).toUpperCase();
          const codes: { [key: string]: string } = {
            'San': 'DSB',
            'Gal': 'DGL',
            'Pai': 'DPT',
            'Sit': 'DST',
          };
          const code = codes[dispatchCode] || 'DXX';

          const projectNumber = assemblyPart.project.projectNumber;
          const buildingDesignation = assemblyPart.building?.designation || 'XX';

          // Find last serial
          const lastLog = await prisma.productionLog.findFirst({
            where: {
              processType,
              assemblyPart: {
                projectId: assemblyPart.projectId,
                buildingId: assemblyPart.buildingId,
              },
              reportNumber: {
                startsWith: `${projectNumber}-${buildingDesignation}-${code}-`,
              },
            },
            orderBy: {
              reportNumber: 'desc',
            },
            select: {
              reportNumber: true,
            },
          });

          let serial = 1;
          if (lastLog && lastLog.reportNumber) {
            const parts = lastLog.reportNumber.split('-');
            const lastSerial = parseInt(parts[parts.length - 1]);
            if (!isNaN(lastSerial)) {
              serial = lastSerial + 1;
            }
          }

          reportNumber = `${projectNumber}-${buildingDesignation}-${code}-${serial.toString().padStart(3, '0')}`;
        }

        // Create production log
        await prisma.productionLog.create({
          data: {
            assemblyPartId,
            processType,
            dateProcessed: new Date(dateProcessed),
            processedQty,
            remainingQty,
            processingTeam: otherData.processingTeam,
            processingLocation: otherData.processingLocation,
            remarks: otherData.remarks,
            reportNumber,
            createdById: session.sub,
          },
        });

        // Update assembly part
        await prisma.assemblyPart.update({
          where: { id: assemblyPartId },
          data: {
            status: 'In Progress',
            currentProcess: processType,
            updatedById: session.sub,
          },
        });

        results.successCount++;
      } catch (error) {
        results.failedCount++;
        results.errors.push(`Error processing part: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Log mass production event
    if (results.successCount > 0) {
      const processTypes = [...new Set(parsed.data.logs.map(l => l.processType))];
      await logSystemEvent({
        eventType: 'created',
        category: 'production',
        title: `Mass logged ${results.successCount} production entries`,
        description: `Processes: ${processTypes.join(', ')}${results.failedCount > 0 ? ` (${results.failedCount} failed)` : ''}`,
        userId: session.sub,
        metadata: {
          successCount: results.successCount,
          failedCount: results.failedCount,
          processTypes,
        },
      });
    }

    return NextResponse.json(results, { status: 201 });
  } catch (error) {
    console.error('Error in mass production logging:', error);
    return NextResponse.json({ 
      error: 'Failed to log production', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
