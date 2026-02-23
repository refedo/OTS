-- ============================================
-- Dolibarr Projects Mirror Table + Invoice Project Links
-- ============================================

-- Projects table (mirror from Dolibarr llxvv_projet)
CREATE TABLE IF NOT EXISTS dolibarr_projects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  dolibarr_id INT NOT NULL UNIQUE,
  ref VARCHAR(50) NULL,
  title VARCHAR(255) NULL,
  description TEXT NULL,
  fk_soc INT NULL COMMENT 'Client thirdparty ID',
  fk_opp_status INT NULL,
  opp_amount DECIMAL(20,8) DEFAULT 0,
  budget_amount DECIMAL(20,8) DEFAULT 0,
  date_start DATE NULL,
  date_end DATE NULL,
  date_close DATE NULL,
  fk_statut TINYINT DEFAULT 0 COMMENT '0=draft,1=validated/open,2=closed',
  public TINYINT(1) DEFAULT 0,
  note_public TEXT NULL,
  note_private TEXT NULL,
  array_options JSON NULL COMMENT 'Custom/extrafields from Dolibarr',
  first_synced_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_synced_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  sync_hash VARCHAR(32) NULL,
  is_active TINYINT(1) DEFAULT 1,
  INDEX idx_dolibarr_id (dolibarr_id),
  INDEX idx_ref (ref),
  INDEX idx_fk_soc (fk_soc),
  INDEX idx_fk_statut (fk_statut),
  INDEX idx_date_start (date_start)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add fk_projet column to customer invoices
ALTER TABLE fin_customer_invoices
  ADD COLUMN IF NOT EXISTS fk_projet INT NULL AFTER socid,
  ADD INDEX IF NOT EXISTS idx_fk_projet (fk_projet);

-- Add fk_projet column to supplier invoices
ALTER TABLE fin_supplier_invoices
  ADD COLUMN IF NOT EXISTS fk_projet INT NULL AFTER socid,
  ADD INDEX IF NOT EXISTS idx_fk_projet (fk_projet);
