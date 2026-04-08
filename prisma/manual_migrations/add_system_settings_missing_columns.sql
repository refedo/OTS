-- Add missing columns to system_settings table
-- All checks are idempotent (IF NOT EXISTS) so safe to run multiple times

DROP PROCEDURE IF EXISTS add_system_settings_missing_cols;
DELIMITER $$
CREATE PROCEDURE add_system_settings_missing_cols()
BEGIN
  -- githubToken (Text, nullable)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'system_settings' AND COLUMN_NAME = 'githubToken'
  ) THEN
    ALTER TABLE system_settings ADD COLUMN githubToken TEXT NULL;
  END IF;

  -- githubDefaultRepo (varchar 191, nullable)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'system_settings' AND COLUMN_NAME = 'githubDefaultRepo'
  ) THEN
    ALTER TABLE system_settings ADD COLUMN githubDefaultRepo VARCHAR(191) NULL;
  END IF;

  -- openAuditEnabled (boolean, default false)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'system_settings' AND COLUMN_NAME = 'openAuditEnabled'
  ) THEN
    ALTER TABLE system_settings ADD COLUMN openAuditEnabled TINYINT(1) NOT NULL DEFAULT 0;
  END IF;

  -- nextcloudEnabled (boolean, default false)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'system_settings' AND COLUMN_NAME = 'nextcloudEnabled'
  ) THEN
    ALTER TABLE system_settings ADD COLUMN nextcloudEnabled TINYINT(1) NOT NULL DEFAULT 0;
  END IF;

  -- libreMesEnabled (boolean, default false)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'system_settings' AND COLUMN_NAME = 'libreMesEnabled'
  ) THEN
    ALTER TABLE system_settings ADD COLUMN libreMesEnabled TINYINT(1) NOT NULL DEFAULT 0;
  END IF;

  -- lcrColumnMapping (JSON, nullable) - may already exist from separate migration
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'system_settings' AND COLUMN_NAME = 'lcrColumnMapping'
  ) THEN
    ALTER TABLE system_settings ADD COLUMN lcrColumnMapping JSON NULL;
  END IF;
END$$
DELIMITER ;
CALL add_system_settings_missing_cols();
DROP PROCEDURE IF EXISTS add_system_settings_missing_cols;
