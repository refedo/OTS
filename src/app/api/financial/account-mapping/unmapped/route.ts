import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireFinancialPermission } from '@/lib/financial/require-financial-permission';

export const dynamic = 'force-dynamic';

/**
 * Get unmapped Dolibarr accounting codes
 * Returns accounting codes from supplier invoice lines that don't have mappings
 */
export async function GET() {
  const auth = await requireFinancialPermission('financial.view');
  if ('error' in auth) return auth.error;

  try {
    // Find accounting codes that don't have mappings
    const unmappedCodes: any[] = await prisma.$queryRawUnsafe(`
      SELECT 
        sil.accounting_code,
        COUNT(*) as line_count,
        SUM(sil.total_ht) as total_ht,
        SUM(sil.total_ttc) as total_ttc,
        GROUP_CONCAT(DISTINCT sil.product_label SEPARATOR ' | ') as sample_labels
      FROM fin_supplier_invoice_lines sil
      JOIN fin_supplier_invoices si ON si.dolibarr_id = sil.invoice_dolibarr_id
      LEFT JOIN fin_dolibarr_account_mapping dam ON dam.dolibarr_account_id = sil.accounting_code
      WHERE si.is_active = 1 
        AND si.status >= 1
        AND sil.accounting_code IS NOT NULL
        AND sil.accounting_code != ''
        AND dam.id IS NULL
      GROUP BY sil.accounting_code
      ORDER BY total_ht DESC
      LIMIT 100
    `);

    // Suggest categories based on product labels
    const codesWithSuggestions = unmappedCodes.map((code: any) => {
      const labels = (code.sample_labels || '').toLowerCase();
      let suggestedCategory = 'Other / Unclassified';

      // Pattern matching for category suggestions
      if (labels.includes('raw') || labels.includes('material') || labels.includes('مواد') || labels.includes('خام') ||
          labels.includes('steel') || labels.includes('iron') || labels.includes('metal') || labels.includes('حديد')) {
        suggestedCategory = 'Raw Materials';
      } else if (labels.includes('sub') || labels.includes('contract') || labels.includes('مقاول') || labels.includes('تعاقد')) {
        suggestedCategory = 'Subcontractors';
      } else if (labels.includes('transport') || labels.includes('shipping') || labels.includes('freight') || 
                 labels.includes('نقل') || labels.includes('شحن') || labels.includes('delivery')) {
        suggestedCategory = 'Transportation';
      } else if (labels.includes('labor') || labels.includes('labour') || labels.includes('worker') || 
                 labels.includes('عمال') || labels.includes('أجور')) {
        suggestedCategory = 'Labor';
      } else if (labels.includes('equipment') || labels.includes('machinery') || labels.includes('tool') || 
                 labels.includes('معدات') || labels.includes('آلات')) {
        suggestedCategory = 'Equipment';
      } else if (labels.includes('rent') || labels.includes('lease') || labels.includes('facility') || 
                 labels.includes('إيجار') || labels.includes('استئجار')) {
        suggestedCategory = 'Rent & Facilities';
      } else if (labels.includes('admin') || labels.includes('office') || labels.includes('إداري')) {
        suggestedCategory = 'Administrative';
      } else if (labels.includes('interest') || labels.includes('bank') || labels.includes('finance') || 
                 labels.includes('فائدة') || labels.includes('بنك')) {
        suggestedCategory = 'Financial Expenses';
      } else if (labels.includes('operating') || labels.includes('utility') || labels.includes('maintenance') || 
                 labels.includes('تشغيل') || labels.includes('صيانة')) {
        suggestedCategory = 'Operating Expenses';
      }

      return {
        accounting_code: code.accounting_code,
        line_count: Number(code.line_count),
        total_ht: Number(code.total_ht),
        total_ttc: Number(code.total_ttc),
        sample_labels: code.sample_labels,
        suggested_category: suggestedCategory,
      };
    });

    return NextResponse.json({
      unmappedCodes: codesWithSuggestions,
      total: codesWithSuggestions.length,
    });
  } catch (error: any) {
    console.error('[Unmapped Codes] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
