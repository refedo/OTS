-- Credit limit audit history for suppliers and customers
-- Tracks changes to credit limits (from/to) with valid_from / valid_to periods

-- Supplier credit limit history
SET @sql = (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = DATABASE()
        AND table_name = 'sc_supplier_credit_limit_history'
    ),
    'SELECT 1',
    'CREATE TABLE sc_supplier_credit_limit_history (
      id            INT AUTO_INCREMENT PRIMARY KEY,
      supplier_dolibarr_id INT NOT NULL,
      credit_limit  DECIMAL(20,2) NOT NULL,
      valid_from    DATE NOT NULL,
      valid_to      DATE NULL,
      notes         TEXT NULL,
      created_by_id CHAR(36) NULL,
      created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_supplier (supplier_dolibarr_id),
      INDEX idx_valid_from (valid_from)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
  )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Customer credit limit history
SET @sql2 = (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = DATABASE()
        AND table_name = 'sc_customer_credit_limit_history'
    ),
    'SELECT 1',
    'CREATE TABLE sc_customer_credit_limit_history (
      id              INT AUTO_INCREMENT PRIMARY KEY,
      customer_dolibarr_id INT NOT NULL,
      credit_limit    DECIMAL(20,2) NOT NULL,
      valid_from      DATE NOT NULL,
      valid_to        DATE NULL,
      notes           TEXT NULL,
      created_by_id   CHAR(36) NULL,
      created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_customer (customer_dolibarr_id),
      INDEX idx_valid_from (valid_from)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
  )
);
PREPARE stmt2 FROM @sql2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;
