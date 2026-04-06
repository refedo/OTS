-- Add lcrColumnMapping JSON field to SystemSettings
-- Stores LCR spreadsheet column index mapping so admins can update it without code changes

DROP PROCEDURE IF EXISTS add_lcr_column_mapping;
DELIMITER $$
CREATE PROCEDURE add_lcr_column_mapping()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'SystemSettings'
      AND COLUMN_NAME = 'lcrColumnMapping'
  ) THEN
    ALTER TABLE SystemSettings ADD COLUMN lcrColumnMapping JSON NULL;
  END IF;
END$$
DELIMITER ;
CALL add_lcr_column_mapping();
DROP PROCEDURE IF EXISTS add_lcr_column_mapping;
