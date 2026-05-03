import { NextRequest, NextResponse } from 'next/server';
import { withApiContext } from '@/lib/api-utils';
import { resolveUserPermissions } from '@/lib/services/permission-resolution.service';
import { hasPermission } from '@/lib/permissions';
import { getOverallRisk, buildSummary } from '@/lib/concentration-risk/overall-risk';
import { parseFilters } from '../_parse-filters';
import { logger } from '@/lib/logger';

function toCsvRow(values: (string | number)[]): string {
  return values
    .map((v) => {
      const s = String(v);
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    })
    .join(',');
}

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

export const GET = withApiContext(async (req: NextRequest, session) => {
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const permissions = await resolveUserPermissions(session.userId);
  if (!hasPermission(permissions, 'concentrationRisk.export')) {
    return NextResponse.json({ error: 'Forbidden — requires concentrationRisk.export permission' }, { status: 403 });
  }

  const filters = parseFilters(req.nextUrl.searchParams);
  const result = await getOverallRisk(filters);
  const summary = buildSummary(result);

  const lines: string[] = [];

  // Summary
  lines.push('CONCENTRATION RISK REPORT');
  lines.push(`Generated:,${new Date().toLocaleDateString('en-SA-u-ca-gregory')}`);
  lines.push('');
  lines.push('EXECUTIVE SUMMARY');
  lines.push(toCsvRow(['Overall Risk Score', summary.overallScore]));
  lines.push(toCsvRow(['Risk Label', summary.riskLabel.toUpperCase()]));
  lines.push(toCsvRow(['Customer HHI', summary.customerHhi.toFixed(4)]));
  lines.push(toCsvRow(['Top Customer Share', pct(summary.topCustomerShare)]));
  lines.push(toCsvRow(['Largest Project Share', pct(summary.largestProjectShare)]));
  lines.push(toCsvRow(['Top Supplier Share', pct(summary.topSupplierShare)]));
  lines.push(toCsvRow(['Revenue Volatility (CV)', summary.revenueVolatilityCv.toFixed(3)]));
  lines.push(toCsvRow(['Critical Bottleneck Share', pct(summary.criticalBottleneckShare)]));
  lines.push('');

  // Customer
  lines.push('CUSTOMER CONCENTRATION (Contract Exposure)');
  lines.push(toCsvRow(['Customer', 'Contract Exposure (SAR)', 'Share %', 'Projects', 'Risk Level']));
  for (const r of result.customer.rows) {
    lines.push(toCsvRow([r.customerName, r.contractExposure.toFixed(2), pct(r.share), r.projectCount, r.riskLevel]));
  }
  lines.push('');

  // Projects
  lines.push('PROJECT CONCENTRATION (Contract Value)');
  lines.push(toCsvRow(['Project Number', 'Project Name', 'Customer', 'Contract Value (SAR)', 'Share %', 'Status', 'Risk Level']));
  for (const r of result.project.rows) {
    lines.push(toCsvRow([r.projectNumber, r.projectName, r.customerName, r.contractValue.toFixed(2), pct(r.share), r.status, r.riskLevel]));
  }
  lines.push('');

  // Segments
  lines.push('SEGMENT CONCENTRATION');
  lines.push(toCsvRow(['Segment', 'Contract Exposure (SAR)', 'Share %', 'Projects', 'Risk Level']));
  for (const r of result.segment.rows) {
    lines.push(toCsvRow([r.segment, r.contractExposure.toFixed(2), pct(r.share), r.projectCount, r.riskLevel]));
  }
  lines.push('');

  // Suppliers
  lines.push('SUPPLIER CONCENTRATION (Procurement Spend)');
  lines.push(toCsvRow(['Supplier', 'Spend (SAR)', 'Share %', 'PO Count', 'Risk Level']));
  for (const r of result.supplier.rows) {
    lines.push(toCsvRow([r.supplierName, r.spend.toFixed(2), pct(r.share), r.poCount, r.riskLevel]));
  }
  lines.push('');

  // Resources
  lines.push('OPERATIONAL DEPENDENCY');
  lines.push(toCsvRow(['Type', 'Resource', 'Output', 'Unit', 'Share %', 'Dependency Level']));
  for (const r of result.resource.rows) {
    lines.push(toCsvRow([r.resourceType, r.resourceName, r.output.toFixed(1), r.outputUnit, pct(r.share), r.dependencyLevel]));
  }
  lines.push('');

  // Revenue Timing
  lines.push('REVENUE TIMING');
  lines.push(toCsvRow(['Month', 'Amount (SAR)']));
  for (const p of result.revenueTiming.monthly) {
    lines.push(toCsvRow([p.label, p.amount.toFixed(2)]));
  }
  lines.push(toCsvRow(['Average Monthly', result.revenueTiming.averageMonthly.toFixed(2)]));
  lines.push(toCsvRow(['Std Dev', result.revenueTiming.stdDev.toFixed(2)]));
  lines.push(toCsvRow(['Coefficient of Variation', result.revenueTiming.cv.toFixed(3)]));

  const csv = lines.join('\n');

  logger.info({ userId: session.userId, filters }, '[ConcentrationRisk] export generated');

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="concentration-risk-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
});
