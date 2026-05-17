-- Add Dolibarr sync support to fin_vat_payments
-- and create fin_bank_transactions table for direct bank line sync

-- 1. Add dolibarr_id, source, sync_hash to fin_vat_payments
SET @col1 = (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'fin_vat_payments'
        AND column_name = 'dolibarr_id'
    ),
    'SELECT 1',
    'ALTER TABLE fin_vat_payments ADD COLUMN dolibarr_id INT NULL AFTER id'
  )
);
PREPARE s1 FROM @col1;
EXECUTE s1;
DEALLOCATE PREPARE s1;

SET @col2 = (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'fin_vat_payments'
        AND column_name = 'source'
    ),
    'SELECT 1',
    "ALTER TABLE fin_vat_payments ADD COLUMN source ENUM('manual','dolibarr') NOT NULL DEFAULT 'manual' AFTER notes"
  )
);
PREPARE s2 FROM @col2;
EXECUTE s2;
DEALLOCATE PREPARE s2;

SET @col3 = (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'fin_vat_payments'
        AND column_name = 'sync_hash'
    ),
    'SELECT 1',
    'ALTER TABLE fin_vat_payments ADD COLUMN sync_hash VARCHAR(32) NULL'
  )
);
PREPARE s3 FROM @col3;
EXECUTE s3;
DEALLOCATE PREPARE s3;

SET @idx1 = (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.statistics
      WHERE table_schema = DATABASE()
        AND table_name = 'fin_vat_payments'
        AND index_name = 'idx_dolibarr_id'
    ),
    'SELECT 1',
    'ALTER TABLE fin_vat_payments ADD UNIQUE INDEX idx_dolibarr_id (dolibarr_id)'
  )
);
PREPARE si1 FROM @idx1;
EXECUTE si1;
DEALLOCATE PREPARE si1;

-- 2. Create fin_bank_transactions table
SET @sql2 = (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = DATABASE()
        AND table_name = 'fin_bank_transactions'
    ),
    'SELECT 1',
    'CREATE TABLE fin_bank_transactions (
      id                      INT AUTO_INCREMENT PRIMARY KEY,
      dolibarr_id             INT NOT NULL,
      bank_account_dolibarr_id INT NOT NULL,
      dateo                   DATE NULL,
      datev                   DATE NULL,
      amount                  DECIMAL(20,2) NOT NULL,
      label                   VARCHAR(500) NULL,
      fk_type                 VARCHAR(50) NULL,
      num_chq                 VARCHAR(100) NULL,
      sync_hash               VARCHAR(32) NULL,
      first_synced_at         DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_synced_at          DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uk_dolibarr_bank (dolibarr_id, bank_account_dolibarr_id),
      INDEX idx_bank_account (bank_account_dolibarr_id),
      INDEX idx_dateo (dateo)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
  )
);
PREPARE s4 FROM @sql2;
EXECUTE s4;
DEALLOCATE PREPARE s4;
