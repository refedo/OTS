-- Add credit limit (outstanding_limit) column to dolibarr_thirdparties
-- This field maps to Dolibarr's outstanding_limit field on third-party records.
-- Run once on the production database before or after deploying v17.4.0+.

ALTER TABLE dolibarr_thirdparties
  ADD COLUMN IF NOT EXISTS outstanding_limit DECIMAL(20,2) NULL COMMENT 'Credit limit from Dolibarr outstanding_limit field';
