-- Migration: Add Dolibarr accounting account mapping table
-- Maps Dolibarr's fk_accounting_account rowids to OTS cost categories
-- Required because Dolibarr uses internal rowids (e.g. 107317231) not account codes

CREATE TABLE IF NOT EXISTS fin_dolibarr_account_mapping (
  id INT AUTO_INCREMENT PRIMARY KEY,
  dolibarr_account_id VARCHAR(20) NOT NULL COMMENT 'Dolibarr fk_accounting_account rowid (e.g. 107317231)',
  dolibarr_account_code VARCHAR(20) NULL COMMENT 'Dolibarr account code if known',
  dolibarr_account_label VARCHAR(255) NULL COMMENT 'Dolibarr account label if known',
  ots_cost_category VARCHAR(100) NOT NULL COMMENT 'OTS cost category for reporting',
  ots_coa_code VARCHAR(20) NULL COMMENT 'Maps to fin_chart_of_accounts.account_code',
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_dolibarr_acct (dolibarr_account_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Backfill fk_projet from dolibarr_raw JSON for supplier invoices
-- This fixes 6000+ invoices that had the project ID in the raw JSON but not in the column
UPDATE fin_supplier_invoices 
SET fk_projet = CAST(JSON_UNQUOTE(JSON_EXTRACT(dolibarr_raw, '$.fk_project')) AS UNSIGNED)
WHERE is_active = 1
  AND (fk_projet IS NULL OR fk_projet = 0)
  AND dolibarr_raw IS NOT NULL
  AND JSON_EXTRACT(dolibarr_raw, '$.fk_project') IS NOT NULL
  AND JSON_UNQUOTE(JSON_EXTRACT(dolibarr_raw, '$.fk_project')) REGEXP '^[0-9]+$'
  AND CAST(JSON_UNQUOTE(JSON_EXTRACT(dolibarr_raw, '$.fk_project')) AS UNSIGNED) > 0;

-- Backfill fk_projet from dolibarr_raw JSON for customer invoices (if any)
UPDATE fin_customer_invoices 
SET fk_projet = CAST(JSON_UNQUOTE(JSON_EXTRACT(dolibarr_raw, '$.fk_project')) AS UNSIGNED)
WHERE is_active = 1
  AND (fk_projet IS NULL OR fk_projet = 0)
  AND dolibarr_raw IS NOT NULL
  AND JSON_EXTRACT(dolibarr_raw, '$.fk_project') IS NOT NULL
  AND JSON_UNQUOTE(JSON_EXTRACT(dolibarr_raw, '$.fk_project')) REGEXP '^[0-9]+$'
  AND CAST(JSON_UNQUOTE(JSON_EXTRACT(dolibarr_raw, '$.fk_project')) AS UNSIGNED) > 0;
