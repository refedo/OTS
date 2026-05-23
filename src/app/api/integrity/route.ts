import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { withApiContext } from '@/lib/api-utils';
import { getCurrentUserPermissions } from '@/lib/permission-checker';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

const createSchema = z.object({
  category: z.enum([
    'MISCONDUCT', 'FINANCIAL_MISUSE', 'ASSET_MISUSE',
    'OPERATIONAL_RISK', 'SAFETY_VIOLATION', 'POLICY_BREACH', 'OTHER',
  ]),
  title: z.string().min(5).max(255),
  description: z.string().min(20),
  isAnonymous: z.boolean().default(false),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  attachments: z.array(z.object({
    fileName: z.string(),
    filePath: z.string(),
    fileType: z.string(),
    fileSize: z.number(),
    uploadedAt: z.string(),
  })).optional(),
});

/**
 * Generate a sequential report number: IR-YYMM-NNNN
 */
async function generateReportNumber(): Promise<string> {
  const now = new Date();
  const yymm = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const prefix = `IR-${yymm}-`;

  const last = await prisma.integrityReport.findFirst({
    where: { reportNumber: { startsWith: prefix } },
    orderBy: { reportNumber: 'desc' },
    select: { reportNumber: true },
  });

  const seq = last ? parseInt(last.reportNumber.slice(prefix.length), 10) + 1 : 1;
  return `${prefix}${String(seq).padStart(4, '0')}`;
}

// ─── GET — list reports ────────────────────────────────────────────────────
export const GET = withApiContext(async (req: NextRequest, session) => {
  const permissions = await getCurrentUserPermissions();
  const canViewAll = permissions.includes('integrity.view_all');
  const canViewOwn = permissions.includes('integrity.view_own');

  if (!canViewAll && !canViewOwn) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const category = searchParams.get('category');
  const page = parseInt(searchParams.get('page') ?? '0', 10);
  const limit = parseInt(searchParams.get('limit') ?? '25', 10);

  const where: Record<string, unknown> = {};

  if (!canViewAll) {
    // Own non-anonymous reports only
    where.reporterId = session!.userId;
    where.isAnonymous = false;
  }

  if (status) where.status = status;
  if (category) where.category = category;

  const [reports, total] = await Promise.all([
    prisma.integrityReport.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: page * limit,
      take: limit,
      select: {
        id: true,
        reportNumber: true,
        category: true,
        title: true,
        isAnonymous: true,
        severity: true,
        status: true,
        createdAt: true,
        resolvedAt: true,
        // Show reporter identity only to admins
        ...(canViewAll ? {
          reporterId: true,
          reporter: { select: { id: true, name: true, email: true } },
          resolution: true,
          resolvedBy: { select: { id: true, name: true } },
        } : {}),
      },
    }),
    prisma.integrityReport.count({ where }),
  ]);

  return NextResponse.json({ reports, total, page, limit });
});

// ─── POST — submit a report ────────────────────────────────────────────────
export const POST = withApiContext(async (req: NextRequest, session) => {
  const body: unknown = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 });
  }

  const { category, title, description, isAnonymous, severity, attachments } = parsed.data;

  try {
    const reportNumber = await generateReportNumber();

    const report = await prisma.integrityReport.create({
      data: {
        reportNumber,
        category,
        title,
        description,
        isAnonymous,
        severity,
        status: 'OPEN',
        attachments: attachments ?? [],
        // Link reporter unless fully anonymous
        reporterId: isAnonymous ? null : session!.userId,
      },
      select: {
        id: true,
        reportNumber: true,
        category: true,
        title: true,
        isAnonymous: true,
        severity: true,
        status: true,
        createdAt: true,
      },
    });

    logger.info({ reportId: report.id, reportNumber: report.reportNumber, isAnonymous }, 'Integrity report submitted');

    return NextResponse.json({ report }, { status: 201 });
  } catch (error) {
    logger.error({ error }, 'Failed to create integrity report');
    return NextResponse.json({ error: 'Failed to submit report' }, { status: 500 });
  }
});
