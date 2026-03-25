/**
 * Cost classification SQL helpers for the 2-tier product→COA mapping system.
 *
 * Priority (highest → lowest):
 *   1. fin_product_coa_mapping  — per Dolibarr product (fk_product on invoice line)
 *   2. fin_supplier_coa_default — per supplier (socid on invoice header)
 *   3. 'Other / Unclassified'   — default fallback
 */

/**
 * Returns the LEFT JOINs needed to resolve cost classification.
 * @param invoiceLineAlias - alias used for fin_supplier_invoice_lines (default: 'sil')
 * @param invoiceAlias     - alias used for fin_supplier_invoices (default: 'si')
 */
export function getCostClassificationJoins(
  invoiceLineAlias = 'sil',
  invoiceAlias = 'si',
): string {
  return `
    LEFT JOIN fin_product_coa_mapping pm
      ON pm.dolibarr_product_id = ${invoiceLineAlias}.fk_product
    LEFT JOIN fin_chart_of_accounts pcoa
      ON pcoa.account_code = pm.coa_account_code
    LEFT JOIN fin_supplier_coa_default sd
      ON sd.supplier_dolibarr_id = ${invoiceAlias}.socid
    LEFT JOIN fin_chart_of_accounts scoa
      ON scoa.account_code = sd.coa_account_code`;
}

/**
 * Returns the SELECT expressions for cost_category, cost_account_name,
 * and resolved_account_code using the 2-tier mapping.
 */
export function getCostClassificationSelect(): string {
  return `COALESCE(pcoa.account_category, scoa.account_category, 'Other / Unclassified') AS cost_category,
        COALESCE(pcoa.account_name, scoa.account_name, 'Unmapped') AS cost_account_name,
        COALESCE(pm.coa_account_code, sd.coa_account_code, 'UNMAPPED') AS resolved_account_code`;
}

/** Inline COALESCE expression — use directly inside a GROUP BY SELECT. */
export const COST_CATEGORY_EXPR =
  `COALESCE(pcoa.account_category, scoa.account_category, 'Other / Unclassified')`;
