-- VAT payment records — actual settlement payments to ZATCA
-- Tracks per-period VAT payments (not invoice-level VAT amounts)

SET @sql = (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = DATABASE()
        AND table_name = 'fin_vat_payments'
    ),
    'SELECT 1',
    'CREATE TABLE fin_vat_payments (
      id            INT AUTO_INCREMENT PRIMARY KEY,
      period_label  VARCHAR(50)     NOT NULL,
      period_start  DATE            NOT NULL,
      period_end    DATE            NOT NULL,
      payment_date  DATE            NOT NULL,
      amount        DECIMAL(20,2)   NOT NULL,
      reference     VARCHAR(100)    NULL,
      notes         TEXT            NULL,
      created_at    DATETIME        DEFAULT CURRENT_TIMESTAMP,
      updated_at    DATETIME        DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_payment_date (payment_date),
      INDEX idx_period_start (period_start)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
  )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
