-- Migration: Add cost classification mapping tables
-- Implements 3 new tables:
--   1. fin_product_categories      - Category definitions (name + classification + COA account)
--   2. fin_product_category_mapping - Maps Dolibarr product_ref to a category
--   3. fin_supplier_classification  - Maps supplier (Dolibarr socid) to a default cost category
--
-- Classification priority in reports:
--   1. fin_dolibarr_account_mapping (existing - highest priority)
--   2. fin_product_category_mapping (by product_ref)
--   3. fin_supplier_classification  (by supplier_id)
--   4. 'Other / Unclassified'       (default)

-- -----------------------------------------------------------------------
-- 1. Product Categories
--    A reusable category that carries a cost classification AND an optional
--    link to a Chart-of-Accounts account code.
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fin_product_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL COMMENT 'Category name in English',
  name_ar VARCHAR(100) NULL COMMENT 'Category name in Arabic (optional)',
  cost_classification VARCHAR(100) NOT NULL COMMENT 'OTS cost classification (e.g. Raw Materials)',
  coa_account_code VARCHAR(20) NULL COMMENT 'Maps to fin_chart_of_accounts.account_code',
  description TEXT NULL,
  color VARCHAR(20) NULL COMMENT 'Hex color for UI display',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by INT NULL,
  updated_by INT NULL,
  UNIQUE KEY uk_product_category_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------
-- 2. Product Category Mapping
--    Links a Dolibarr product_ref (or a product_label pattern) to a
--    fin_product_categories row.
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fin_product_category_mapping (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_ref VARCHAR(100) NOT NULL COMMENT 'Dolibarr product reference (fin_supplier_invoice_lines.product_ref)',
  product_label_hint VARCHAR(255) NULL COMMENT 'Optional label hint shown in UI',
  category_id INT NOT NULL COMMENT 'FK -> fin_product_categories.id',
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by INT NULL,
  updated_by INT NULL,
  UNIQUE KEY uk_product_ref (product_ref),
  CONSTRAINT fk_pcm_category FOREIGN KEY (category_id) REFERENCES fin_product_categories (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------
-- 3. Supplier Classification
--    Default cost classification for a supplier.  Used when no account
--    mapping or product category mapping exists for an invoice line.
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fin_supplier_classification (
  id INT AUTO_INCREMENT PRIMARY KEY,
  supplier_id INT NOT NULL COMMENT 'Dolibarr thirdparty rowid (fin_supplier_invoices.socid)',
  supplier_name VARCHAR(255) NULL COMMENT 'Cached supplier name for quick display',
  cost_category VARCHAR(100) NOT NULL COMMENT 'OTS cost category applied to all lines from this supplier',
  coa_account_code VARCHAR(20) NULL COMMENT 'Optional default COA account code for this supplier',
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by INT NULL,
  updated_by INT NULL,
  UNIQUE KEY uk_supplier_id (supplier_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
