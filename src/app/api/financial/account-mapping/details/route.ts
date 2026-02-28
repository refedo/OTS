import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireFinancialPermission } from '@/lib/financial/require-financial-permission';

export const dynamic = 'force-dynamic';

/**
 * Get invoice line details for a specific Dolibarr accounting code
 */
export async function GET(req: Request) {
  const auth = await requireFinancialPermission('financial.view');
  if ('error' in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const accountingCode = searchParams.get('accounting_code');

  if (!accountingCode) {
    return NextResponse.json({ error: 'accounting_code parameter is required' }, { status: 400 });
  }

  try {
    // Get CoA information for this accounting code
    const coaInfo: any[] = await prisma.$queryRawUnsafe(`
      SELECT account_number, label
      FROM dolibarr_accounting_account
      WHERE rowid = ?
      LIMIT 1
    `, accountingCode);

    // Get invoice lines for this accounting code
    const lines: any[] = await prisma.$queryRawUnsafe(`
      SELECT 
        sil.id,
        sil.product_ref,
        sil.product_label,
        sil.description,
        sil.qty,
        sil.total_ht,
        sil.total_tva,
        sil.total_ttc,
        si.ref as invoice_ref,
        si.date_invoice,
        si.socid,
        dt.name as supplier_name,
        si.fk_projet,
        dp.ref as project_ref
      FROM fin_supplier_invoice_lines sil
      JOIN fin_supplier_invoices si ON si.dolibarr_id = sil.invoice_dolibarr_id
      LEFT JOIN dolibarr_thirdparties dt ON dt.dolibarr_id = si.socid
      LEFT JOIN dolibarr_projects dp ON dp.dolibarr_id = si.fk_projet
      WHERE sil.accounting_code = ?
        AND si.is_active = 1
        AND si.status >= 1
      ORDER BY si.date_invoice DESC, si.ref
      LIMIT 100
    `, accountingCode);

    // Get summary stats
    const summary: any[] = await prisma.$queryRawUnsafe(`
      SELECT 
        COUNT(DISTINCT sil.invoice_dolibarr_id) as invoice_count,
        COUNT(*) as line_count,
        SUM(sil.total_ht) as total_ht,
        SUM(sil.total_tva) as total_vat,
        SUM(sil.total_ttc) as total_ttc,
        COUNT(DISTINCT si.socid) as supplier_count,
        COUNT(DISTINCT si.fk_projet) as project_count
      FROM fin_supplier_invoice_lines sil
      JOIN fin_supplier_invoices si ON si.dolibarr_id = sil.invoice_dolibarr_id
      WHERE sil.accounting_code = ?
        AND si.is_active = 1
        AND si.status >= 1
    `, accountingCode);

    // Get top suppliers for this accounting code
    const topSuppliers: any[] = await prisma.$queryRawUnsafe(`
      SELECT 
        dt.name as supplier_name,
        COUNT(*) as line_count,
        SUM(sil.total_ht) as total_ht
      FROM fin_supplier_invoice_lines sil
      JOIN fin_supplier_invoices si ON si.dolibarr_id = sil.invoice_dolibarr_id
      LEFT JOIN dolibarr_thirdparties dt ON dt.dolibarr_id = si.socid
      WHERE sil.accounting_code = ?
        AND si.is_active = 1
        AND si.status >= 1
      GROUP BY si.socid, dt.name
      ORDER BY total_ht DESC
      LIMIT 10
    `, accountingCode);

    // Get top products/labels
    const topProducts: any[] = await prisma.$queryRawUnsafe(`
      SELECT 
        sil.product_label,
        sil.product_ref,
        COUNT(*) as line_count,
        SUM(sil.total_ht) as total_ht
      FROM fin_supplier_invoice_lines sil
      JOIN fin_supplier_invoices si ON si.dolibarr_id = sil.invoice_dolibarr_id
      WHERE sil.accounting_code = ?
        AND si.is_active = 1
        AND si.status >= 1
      GROUP BY sil.product_label, sil.product_ref
      ORDER BY total_ht DESC
      LIMIT 10
    `, accountingCode);

    return NextResponse.json({
      accountingCode,
      coaCode: coaInfo[0]?.account_number || accountingCode,
      coaLabel: coaInfo[0]?.label || 'Unknown Account',
      summary: {
        invoiceCount: Number(summary[0]?.invoice_count || 0),
        lineCount: Number(summary[0]?.line_count || 0),
        totalHT: Number(summary[0]?.total_ht || 0),
        totalVAT: Number(summary[0]?.total_vat || 0),
        totalTTC: Number(summary[0]?.total_ttc || 0),
        supplierCount: Number(summary[0]?.supplier_count || 0),
        projectCount: Number(summary[0]?.project_count || 0),
      },
      topSuppliers: topSuppliers.map((s: any) => ({
        supplierName: s.supplier_name || 'Unknown',
        lineCount: Number(s.line_count),
        totalHT: Number(s.total_ht),
      })),
      topProducts: topProducts.map((p: any) => ({
        productLabel: p.product_label || 'N/A',
        productRef: p.product_ref || '',
        lineCount: Number(p.line_count),
        totalHT: Number(p.total_ht),
      })),
      lines: lines.map((line: any) => ({
        id: Number(line.id),
        productRef: line.product_ref || '',
        productLabel: line.product_label || 'N/A',
        description: line.description || '',
        qty: Number(line.qty),
        totalHT: Number(line.total_ht),
        totalVAT: Number(line.total_tva),
        totalTTC: Number(line.total_ttc),
        invoiceRef: line.invoice_ref,
        dateInvoice: line.date_invoice ? new Date(line.date_invoice).toISOString().slice(0, 10) : '',
        supplierName: line.supplier_name || 'Unknown',
        projectRef: line.project_ref || '',
      })),
    });
  } catch (error: any) {
    console.error('[Account Details] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
