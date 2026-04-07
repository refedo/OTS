-- Add lcrColumnMapping JSON field to system_settings table
-- Note: Prisma model "SystemSettings" maps to MySQL table "system_settings" via @@map

DROP PROCEDURE IF EXISTS add_lcr_column_mapping;
DELIMITER $$
CREATE PROCEDURE add_lcr_column_mapping()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'system_settings'
      AND COLUMN_NAME = 'lcrColumnMapping'
  ) THEN
    ALTER TABLE system_settings ADD COLUMN lcrColumnMapping JSON NULL;
  END IF;
END$$
DELIMITER ;
CALL add_lcr_column_mapping();
DROP PROCEDURE IF EXISTS add_lcr_column_mapping;
