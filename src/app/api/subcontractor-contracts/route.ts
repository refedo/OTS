import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiContext } from '@/lib/api-utils';
import { checkPermission } from '@/lib/permission-checker';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import {
  generateContractNumber,
  getDefaultTerms,
  SCOPE_LABELS,
} from '@/lib/services/subcontractor-contract.service';

const createSchema = z.object({
  projectId: z.string().min(1),
  buildingId: z.string().optional().nullable(),
  supplierId: z.string().min(1),
  scopeLevel: z.enum(['project', 'building', 'scope']),
  scopeTypes: z.array(z.string()).min(1),
  scopeItems: z.array(z.object({
    scopeType: z.string(),
    scopeLabel: z.string(),
    buildingId: z.string().optional().nullable(),
    buildingDesignation: z.string().optional().nullable(),
    originalQuantity: z.number().optional().nullable(),
    originalUnit: z.string().optional().nullable(),
    contractQuantity: z.number().optional().nullable(),
    contractUnit: z.string().optional().nullable(),
    unitRate: z.number().optional().nullable(),
    subtotal: z.number().optional().nullable(),
  })).optional().nullable(),
  contractValue: z.number().min(0),
  currency: z.string().default('SAR'),
  retentionPercentage: z.number().min(0).max(100).default(10),
  paymentTerms: z.array(z.object({
    milestone: z.string(),
    percentage: z.number(),
    amount: z.number(),
    dueDate: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
  })).optional().nullable(),
  termsAndConditions: z.string().optional().nullable(),
  templateType: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const GET = withApiContext(async (req: NextRequest, session) => {
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await checkPermission('subcontractors.view'))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const projectId = searchParams.get('projectId');
  const supplierId = searchParams.get('supplierId');

  try {
    const contracts = await prisma.subcontractorContract.findMany({
      where: {
        deletedAt: null,
        ...(status ? { status } : {}),
        ...(projectId ? { projectId } : {}),
        ...(supplierId ? { supplierId } : {}),
      },
      include: {
        project: { select: { id: true, projectNumber: true, name: true } },
        building: { select: { id: true, designation: true, name: true } },
        supplier: { select: { id: true, supplierCode: true, name: true, rating: true, category: true } },
        createdBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
        paymentCertificates: {
          where: { deletedAt: null },
          select: {
            id: true,
            certificateNumber: true,
            status: true,
            cumulativePercentage: true,
            cumulativeAmount: true,
            netAmountDue: true,
            paidAmount: true,
            certificateDate: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(contracts);
  } catch (error) {
    logger.error({ error }, '[SC Contracts] Failed to list contracts');
    return NextResponse.json({ error: 'Failed to fetch contracts' }, { status: 500 });
  }
});

export const POST = withApiContext(async (req: NextRequest, session) => {
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await checkPermission('subcontractors.create'))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation error', details: parsed.error.flatten() }, { status: 422 });
  }

  const data = parsed.data;

  try {
    const project = await prisma.project.findUnique({
      where: { id: data.projectId },
      select: { projectNumber: true },
    });
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

    let buildingDesignation: string | null = null;
    if (data.buildingId) {
      const building = await prisma.building.findUnique({
        where: { id: data.buildingId },
        select: { designation: true },
      });
      buildingDesignation = building?.designation ?? null;
    }

    const contractNumber = await generateContractNumber(
      project.projectNumber,
      buildingDesignation,
      data.scopeTypes
    );

    const name = data.scopeTypes
      .map(t => SCOPE_LABELS[t] ?? t)
      .join(' + ');

    const contract = await prisma.subcontractorContract.create({
      data: {
        contractNumber,
        name,
        projectId: data.projectId,
        buildingId: data.buildingId ?? null,
        supplierId: data.supplierId,
        scopeLevel: data.scopeLevel,
        scopeTypes: data.scopeTypes,
        scopeItems: data.scopeItems ?? [],
        contractValue: data.contractValue,
        currency: data.currency,
        retentionPercentage: data.retentionPercentage,
        paymentTerms: data.paymentTerms ?? [],
        termsAndConditions: data.termsAndConditions ?? getDefaultTerms('steel'),
        templateType: data.templateType ?? null,
        notes: data.notes ?? null,
        status: 'DRAFT',
        createdById: session.userId,
      },
      include: {
        project: { select: { id: true, projectNumber: true, name: true } },
        building: { select: { id: true, designation: true, name: true } },
        supplier: { select: { id: true, supplierCode: true, name: true, rating: true } },
      },
    });

    logger.info({ contractId: contract.id, contractNumber }, '[SC Contracts] Contract created');
    return NextResponse.json(contract, { status: 201 });
  } catch (error) {
    logger.error({ error }, '[SC Contracts] Failed to create contract');
    return NextResponse.json({ error: 'Failed to create contract' }, { status: 500 });
  }
});
