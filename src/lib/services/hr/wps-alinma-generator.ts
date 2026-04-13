/**
 * WPS (Wage Protection System) file generator for Alinma Bank.
 *
 * SAMA requires banks to submit monthly salary files in a standard CSV
 * format. Alinma's layout is the common Saudi WPS CSV:
 *
 *   Record type | Employee ID | Name | National ID | IBAN | Bank | Amount | Notes
 *
 * The generator writes the CSV under public/outputs/wps/ so it can be
 * downloaded via a signed URL. The WpsExport row keeps metadata
 * (totalEmployees, totalNet, filename, filePath).
 */

import { promises as fs } from 'fs';
import path from 'path';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { getPayrollSettings } from './system-config';

const WPS_DIR = path.join(process.cwd(), 'public', 'outputs', 'wps');

function csvEscape(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function pad(n: number, width: number): string {
  return n.toString().padStart(width, '0');
}

export type WpsGeneratorResult = {
  exportId: string;
  filename: string;
  filePath: string;
  totalEmployees: number;
  totalNet: number;
};

export async function generateAlinmaWpsFile(
  periodId: string,
  generatedById: string,
): Promise<WpsGeneratorResult> {
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
              bankName: true,
              bankIban: true,
            },
          },
        },
      },
    },
  });
  if (!period) throw new Error('Payroll period not found');
  if (period.status !== 'APPROVED' && period.status !== 'PAID' && period.status !== 'LOCKED') {
    throw new Error('Period must be APPROVED, PAID, or LOCKED before generating a WPS file');
  }

  const settings = await getPayrollSettings();

  await fs.mkdir(WPS_DIR, { recursive: true });
  const filename = `WPS_${settings.wpsBankCode}_${period.year}_${pad(period.month, 2)}_${Date.now()}.csv`;
  const filePath = path.join(WPS_DIR, filename);

  // Alinma / SAMA CSV header
  const header = [
    'RecordType',
    'EmployeeID',
    'FullName',
    'NationalID',
    'IBAN',
    'BankName',
    'BasicSalary',
    'HousingAllowance',
    'OtherAllowances',
    'Deductions',
    'NetPay',
    'Currency',
    'PayMonth',
    'PayYear',
    'Notes',
  ].join(',');

  const rows: string[] = [header];
  let totalNet = 0;
  let totalEmployees = 0;

  for (const line of period.lines) {
    // Skip employees with no IBAN — Alinma rejects the whole file otherwise
    if (!line.employee.bankIban) {
      logger.warn(
        { employeeId: line.employee.id, employmentId: line.employee.employmentId },
        '[WPS] Skipping employee without IBAN',
      );
      continue;
    }

    const otherAllow =
      Number(line.transportAllowance) +
      Number(line.mobileAllowance) +
      Number(line.foodAllowance) +
      Number(line.otherAllowances);

    const row = [
      'SAL',
      line.employee.employmentId,
      line.employee.fullNameEn,
      line.employee.nationalId ?? '',
      line.employee.bankIban,
      line.employee.bankName ?? 'ALINMA',
      Number(line.basicSalary).toFixed(2),
      Number(line.housingAllowance).toFixed(2),
      otherAllow.toFixed(2),
      Number(line.totalDeductions).toFixed(2),
      Number(line.netPay).toFixed(2),
      'SAR',
      pad(period.month, 2),
      String(period.year),
      '',
    ].map(csvEscape).join(',');
    rows.push(row);
    totalNet += Number(line.netPay);
    totalEmployees += 1;
  }

  // Trailer row
  rows.push(
    ['TRL', '', 'TOTAL', '', '', '', '', '', '', '', totalNet.toFixed(2), 'SAR', pad(period.month, 2), String(period.year), String(totalEmployees)]
      .map(csvEscape)
      .join(','),
  );

  await fs.writeFile(filePath, rows.join('\n'), 'utf8');

  const wpsExport = await prisma.wpsExport.create({
    data: {
      periodId,
      bankCode: settings.wpsBankCode,
      fileFormat: 'CSV',
      filename,
      filePath: `/outputs/wps/${filename}`,
      totalEmployees,
      totalNet: totalNet.toString(),
      status: 'GENERATED',
      generatedById,
    },
  });

  logger.info({ exportId: wpsExport.id, totalEmployees, totalNet }, '[WPS] File generated');

  return {
    exportId: wpsExport.id,
    filename,
    filePath: wpsExport.filePath,
    totalEmployees,
    totalNet,
  };
}
