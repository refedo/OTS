/**
 * POST /api/hr/employees/import — bulk import employees from Excel data
 * Accepts JSON array of rows parsed from the OTS employee export format.
 * Maps column names to Employee fields, validates, and upserts by employmentId.
 *
 * 19.16.4
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';

const rowSchema = z.object({
  'Employment ID': z.string().min(1),
  'Full Name (EN)': z.string().min(1),
  'Full Name (AR)': z.string().optional().nullable(),
  'National ID / Iqama': z.string().optional().nullable(),
  'Boarder Number': z.string().optional().nullable(),
  'Passport Number': z.string().optional().nullable(),
  'Sponsor Number': z.string().optional().nullable(),
  'Status': z.string().optional().nullable(),
  'Position Title': z.string().optional().nullable(),
  'Department': z.string().optional().nullable(),
  'Section': z.string().optional().nullable(),
  'Division': z.string().optional().nullable(),
  'Date of Joining': z.string().optional().nullable(),
  'Date of Leaving': z.string().optional().nullable(),
  'Contract Type': z.string().optional().nullable(),
  'Contract End Date': z.string().optional().nullable(),
  'Working Location': z.string().optional().nullable(),
  'Basic Salary (SAR)': z.coerce.number().optional().nullable(),
  'Housing Allowance': z.coerce.number().optional().nullable(),
  'Transport Allowance': z.coerce.number().optional().nullable(),
  'Mobile Allowance': z.coerce.number().optional().nullable(),
  'Food Allowance': z.coerce.number().optional().nullable(),
  'Other Allowances': z.coerce.number().optional().nullable(),
});

const STATUS_MAP: Record<string, string> = {
  'Active': 'ACTIVE',
  'ACTIVE': 'ACTIVE',
  'On Leave': 'ON_LEAVE',
  'ON_LEAVE': 'ON_LEAVE',
  'Suspended': 'SUSPENDED',
  'SUSPENDED': 'SUSPENDED',
  'Terminated': 'TERMINATED',
  'TERMINATED': 'TERMINATED',
  'Resigned': 'RESIGNED',
  'RESIGNED': 'RESIGNED',
};

function parseDate(val: string | null | undefined): Date | null {
  if (!val || val === '—') return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

export const POST = withApiContext(async (req: NextRequest, session) => {
  try {
    const body = await req.json();
    if (!Array.isArray(body)) {
      return NextResponse.json({ error: 'Expected array of rows' }, { status: 400 });
    }

    const results = { created: 0, updated: 0, skipped: 0, errors: [] as string[] };

    for (let i = 0; i < body.length; i++) {
      const raw = body[i];
      const parsed = rowSchema.safeParse(raw);
      if (!parsed.success) {
        results.skipped++;
        results.errors.push(`Row ${i + 2}: ${parsed.error.errors[0]?.message ?? 'Invalid data'}`);
        continue;
      }

      const r = parsed.data;
      const employmentId = r['Employment ID'].trim();

      const data: Record<string, unknown> = {
        fullNameEn: r['Full Name (EN)'].trim(),
        fullNameAr: r['Full Name (AR)'] || null,
        nationalId: r['National ID / Iqama'] || null,
        boarderNumber: r['Boarder Number'] || null,
        passportNumber: r['Passport Number'] || null,
        sponsorNumber: r['Sponsor Number'] || null,
        occupation: r['Position Title'] || null,
        department: r['Department'] || null,
        section: r['Section'] || null,
        division: r['Division'] || null,
        contractType: r['Contract Type'] || null,
        workingLocation: r['Working Location'] || null,
        manuallyEditedFields: ['fullNameEn'],
      };

      const statusRaw = r['Status'];
      if (statusRaw && STATUS_MAP[statusRaw]) {
        data.status = STATUS_MAP[statusRaw];
      }

      const doj = parseDate(r['Date of Joining']);
      if (doj) data.dateOfJoining = doj;

      const dol = parseDate(r['Date of Leaving']);
      if (dol) data.dateOfLeaving = dol;

      const ced = parseDate(r['Contract End Date']);
      if (ced) data.contractEndDate = ced;

      if (r['Basic Salary (SAR)'] != null) data.basicSalary = r['Basic Salary (SAR)'];
      if (r['Housing Allowance'] != null) data.housingAllowance = r['Housing Allowance'];
      if (r['Transport Allowance'] != null) data.transportAllowance = r['Transport Allowance'];
      if (r['Mobile Allowance'] != null) data.mobileAllowance = r['Mobile Allowance'];
      if (r['Food Allowance'] != null) data.foodAllowance = r['Food Allowance'];
      if (r['Other Allowances'] != null) data.otherAllowances = r['Other Allowances'];

      try {
        const existing = await prisma.employee.findFirst({
          where: { employmentId, deletedAt: null },
          select: { id: true },
        });

        if (existing) {
          await prisma.employee.update({ where: { id: existing.id }, data });
          results.updated++;
        } else {
          if (!data.dateOfJoining) {
            results.skipped++;
            results.errors.push(`Row ${i + 2} (${employmentId}): Date of Joining is required for new employees`);
            continue;
          }
          await prisma.employee.create({
            data: {
              employmentId,
              ...data,
              dateOfJoining: data.dateOfJoining as Date,
              updatedById: session!.userId,
              createdById: session!.userId,
            } as Parameters<typeof prisma.employee.create>[0]['data'],
          });
          results.created++;
        }
      } catch (err) {
        results.skipped++;
        results.errors.push(`Row ${i + 2} (${employmentId}): ${err instanceof Error ? err.message : 'DB error'}`);
      }
    }

    logger.info({ results, userId: session!.userId }, '[HR] Employee import completed');
    return NextResponse.json(results);
  } catch (error) {
    logger.error({ error }, 'Failed to import employees');
    return NextResponse.json({ error: 'Failed to import employees' }, { status: 500 });
  }
});
