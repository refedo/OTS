-- Ensure fin_supplier_classification table exists.
-- Previously only created on first visit to /financial/supplier-classification;
-- this migration guarantees the table is present on every server start so that
-- the supplier list query (which LEFT JOINs this table) never fails.

CREATE TABLE IF NOT EXISTS fin_supplier_classification (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  supplier_id     INT          NOT NULL,
  supplier_name   VARCHAR(255) NULL,
  cost_category   VARCHAR(100) NOT NULL,
  coa_account_code VARCHAR(20) NULL,
  notes           TEXT         NULL,
  created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by      INT          NULL,
  updated_by      INT          NULL,
  UNIQUE KEY uk_fsc_supplier_id (supplier_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
