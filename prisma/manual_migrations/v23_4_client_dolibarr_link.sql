-- Link OTS Client records to Dolibarr third-party customers
-- Allows tracking projects, payments, and tonnage by Dolibarr customer

SET @sql = (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'Client'
        AND column_name = 'dolibarr_id'
    ),
    'SELECT 1',
    'ALTER TABLE Client ADD COLUMN dolibarr_id INT NULL UNIQUE COMMENT ''FK to dolibarr_thirdparties.dolibarr_id'' AFTER id'
  )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
