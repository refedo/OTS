-- =============================================================
-- Product-to-COA Direct Mapping
-- Replaces the 3-layer classification system with a single
-- clean mapping from Dolibarr products to OTS Chart of Accounts.
-- Priority: product mapping > supplier default > 'Other / Unclassified'
-- =============================================================

-- 1. Product-level mapping (highest priority)
CREATE TABLE IF NOT EXISTS fin_product_coa_mapping (
  id INT AUTO_INCREMENT PRIMARY KEY,
  dolibarr_product_id INT NOT NULL COMMENT 'FK to dolibarr_products.dolibarr_id',
  coa_account_code VARCHAR(20) NOT NULL COMMENT 'FK to fin_chart_of_accounts.account_code',
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by INT NULL,
  UNIQUE KEY uk_product_coa (dolibarr_product_id),
  INDEX idx_coa_account (coa_account_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Supplier-level default mapping (fallback when product not mapped)
CREATE TABLE IF NOT EXISTS fin_supplier_coa_default (
  id INT AUTO_INCREMENT PRIMARY KEY,
  supplier_dolibarr_id INT NOT NULL COMMENT 'FK to dolibarr_thirdparties.dolibarr_id (socid)',
  coa_account_code VARCHAR(20) NOT NULL COMMENT 'FK to fin_chart_of_accounts.account_code',
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by INT NULL,
  UNIQUE KEY uk_supplier_coa (supplier_dolibarr_id),
  INDEX idx_coa_account (coa_account_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
