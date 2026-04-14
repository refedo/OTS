/**
 * WPS SIF File Generator — SAMA / Mudad spec (18.10.0).
 *
 * Generates a fixed-format `.sif` file per the Saudi Wage Protection System
 * standard. The file has one employer header record (EDR) and one employee
 * detail record (EDR-like, see below) per paid employee.
 *
 * SIF record layout (pipe-delimited, fixed positions within each field):
 *
 *   EDR (Employer Detail Record):
 *     Field 1:  Record type   = "EH"
 *     Field 2:  MOL EIN       = env WPS_EMPLOYER_ID (10 digits)
 *     Field 3:  Bank ID       = env WPS_BANK_ID (4 chars)
 *     Field 4:  Pay period    = YYYYMM
 *     Field 5:  File creation = YYYYMMDD
 *     Field 6:  No. of records
 *     Field 7:  Total amount  = sum of all net pays (2 decimals)
 *     Field 8:  Currency      = "SAR"
 *
 *   EMP (Employee Record):
 *     Field 1:  Record type   = "ED"
 *     Field 2:  Employee ID   = employmentId
 *     Field 3:  MOL EIN       = env WPS_EMPLOYER_ID
 *     Field 4:  Bank ID       = env WPS_BANK_ID
 *     Field 5:  IBAN          = employee bankIban (24 chars starting with SA)
 *     Field 6:  Net salary    = netPay (2 decimals)
 *     Field 7:  Currency      = "SAR"
 *     Field 8:  Pay month     = YYYYMM
 *     Field 9:  Days worked   = workingDays - absentDaysWithoutPermission
 *     Field 10: National ID   = nationalId (blank if null)
 *     Field 11: Full name (EN)
 *
 * Each record is one line (CRLF terminated). Output written under
 * public/outputs/wps/sif/ and tracked in WpsExport (fileFormat = 'SIF').
 *
 * Validation before generation:
 *  - All employees must have bankIban set
 *  - All IBANs must be 24 chars starting with SA
 *  - WPS_EMPLOYER_ID and WPS_BANK_ID env vars must be set
 *  Returns a structured validation report when validation fails.
 */

import { promises as fs } from 'fs';
import path from 'path';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { env } from '@/lib/env';

const SIF_DIR = path.join(process.cwd(), 'public', 'outputs', 'wps', 'sif');

function pad(n: number, width: number): string {
  return n.toString().padStart(width, '0');
}

function fmtAmount(n: number): string {
  return n.toFixed(2);
}

export interface SifValidationError {
  employeeId: string;
  employmentId: string;
  fullNameEn: string;
  issues: string[];
}

export interface SifGeneratorResult {
  exportId: string;
  filename: string;
  filePath: string;
  totalEmployees: number;
  totalNet: number;
}

export interface SifValidationResult {
  valid: boolean;
  errors: SifValidationError[];
}

export async function validateSifReadiness(periodId: string): Promise<SifValidationResult> {
  const period = await prisma.payrollPeriod.findUnique({
    where: { id: periodId },
    include: {
      lines: {
        include: {
          employee: {
            select: { id: true, employmentId: true, fullNameEn: true, nationalId: true, bankIban: true },
          },
        },
      },
    },
  });
  if (!period) throw new Error('Payroll period not found');

  const errors: SifValidationError[] = [];

  for (const line of period.lines) {
    const issues: string[] = [];
    if (!line.employee.bankIban) {
      issues.push('Missing IBAN');
    } else if (line.employee.bankIban.length !== 24 || !line.employee.bankIban.startsWith('SA')) {
      issues.push(`Invalid IBAN format: must be 24 chars starting with SA (got "${line.employee.bankIban}")`);
    }
    if (!line.employee.nationalId) {
      issues.push('Missing National ID');
    }
    if (issues.length > 0) {
      errors.push({
        employeeId: line.employee.id,
        employmentId: line.employee.employmentId,
        fullNameEn: line.employee.fullNameEn,
        issues,
      });
    }
  }

  return { valid: errors.length === 0, errors };
}

export async function generateWpsSif(
  periodId: string,
  generatedById: string,
): Promise<SifGeneratorResult> {
  const employerId = env.WPS_EMPLOYER_ID;
  const bankId = env.WPS_BANK_ID;
  if (!employerId || !bankId) {
    throw new Error('WPS_EMPLOYER_ID and WPS_BANK_ID env vars are required to generate a SIF file');
  }

  const period = await prisma.payrollPeriod.findUnique({
    where: { id: periodId },
    include: {
      lines: {
        include: {
          employee: {
            select: {
              id: true,
              employmentId: true,
              fullNameEn: true,
              nationalId: true,
              bankIban: true,
            },
          },
        },
      },
    },
  });
  if (!period) throw new Error('Payroll period not found');
  if (period.status !== 'APPROVED' && period.status !== 'PAID' && period.status !== 'LOCKED') {
    throw new Error('Period must be APPROVED, PAID, or LOCKED before generating a SIF file');
  }

  // Pre-validate
  const validation = await validateSifReadiness(periodId);
  if (!validation.valid) {
    const summary = validation.errors
      .map((e) => `${e.employmentId} (${e.fullNameEn}): ${e.issues.join(', ')}`)
      .join('\n');
    throw new Error(`SIF validation failed — fix the following before generating:\n${summary}`);
  }

  const payMonth = `${period.year}${pad(period.month, 2)}`;
  const today = new Date();
  const fileDate = `${today.getFullYear()}${pad(today.getMonth() + 1, 2)}${pad(today.getDate(), 2)}`;

  // Filter out employees without IBAN (shouldn't happen post-validation, but safety check)
  const validLines = period.lines.filter((l) => l.employee.bankIban);
  let totalNet = 0;
  const empRecords: string[] = [];

  for (const line of validLines) {
    totalNet += Number(line.netPay);
    const workedDays = Math.max(0, line.workingDays - Number(line.absentDaysWithoutPermission));

    const fields = [
      'ED',
      line.employee.employmentId,
      employerId,
      bankId,
      line.employee.bankIban!,
      fmtAmount(Number(line.netPay)),
      'SAR',
      payMonth,
      workedDays.toString(),
      line.employee.nationalId ?? '',
      line.employee.fullNameEn.replace(/\|/g, ' '), // escape pipe
    ];
    empRecords.push(fields.join('|'));
  }

  // Employer header record
  const ehRecord = [
    'EH',
    employerId,
    bankId,
    payMonth,
    fileDate,
    validLines.length.toString(),
    fmtAmount(totalNet),
    'SAR',
  ].join('|');

  const content = [ehRecord, ...empRecords].join('\r\n') + '\r\n';

  await fs.mkdir(SIF_DIR, { recursive: true });
  const filename = `WPS_HEXA_${payMonth}_RUN${periodId.slice(0, 8).toUpperCase()}.sif`;
  const diskPath = path.join(SIF_DIR, filename);
  const publicPath = `/outputs/wps/sif/${filename}`;

  await fs.writeFile(diskPath, content, 'utf8');

  const wpsExport = await prisma.wpsExport.create({
    data: {
      periodId,
      bankCode: bankId,
      fileFormat: 'SIF',
      filename,
      filePath: publicPath,
      totalEmployees: validLines.length,
      totalNet: totalNet.toString(),
      status: 'GENERATED',
      generatedById,
    },
  });

  logger.info(
    { exportId: wpsExport.id, totalEmployees: validLines.length, totalNet, filename },
    '[WPS-SIF] File generated',
  );

  return {
    exportId: wpsExport.id,
    filename,
    filePath: publicPath,
    totalEmployees: validLines.length,
    totalNet,
  };
}
