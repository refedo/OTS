-- Add auto-increment SN to Asset table (continuous across all asset types)
DROP PROCEDURE IF EXISTS add_asset_sn;
DELIMITER $$
CREATE PROCEDURE add_asset_sn()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'Asset'
      AND COLUMN_NAME = 'assetSn'
  ) THEN
    ALTER TABLE Asset ADD COLUMN assetSn INT NULL UNIQUE AFTER id;
    -- Backfill existing rows in createdAt order
    SET @n = 0;
    UPDATE Asset SET assetSn = (@n := @n + 1)
    WHERE deletedAt IS NULL
    ORDER BY createdAt ASC;
  END IF;
END$$
DELIMITER ;
CALL add_asset_sn();
DROP PROCEDURE IF EXISTS add_asset_sn;
