-- Add credit limit (outstanding_limit) column to dolibarr_thirdparties
-- This field maps to Dolibarr's outstanding_limit field on third-party records.
-- Run once on the production database before or after deploying v17.4.0+.

SET @sql = (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'dolibarr_thirdparties'
        AND column_name = 'outstanding_limit'
    ),
    'SELECT 1',
    'ALTER TABLE dolibarr_thirdparties ADD COLUMN outstanding_limit DECIMAL(20,2) NULL'
  )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
