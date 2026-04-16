-- 18.18.1: Add location field to Asset table
-- Idempotent stored-procedure migration

DROP PROCEDURE IF EXISTS add_asset_location;
DELIMITER $$
CREATE PROCEDURE add_asset_location()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'Asset'
      AND COLUMN_NAME = 'location'
  ) THEN
    ALTER TABLE Asset ADD COLUMN location VARCHAR(200) NULL AFTER purchasePrice;
  END IF;
END$$
DELIMITER ;
CALL add_asset_location();
DROP PROCEDURE IF EXISTS add_asset_location;
