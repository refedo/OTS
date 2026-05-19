-- Add lcrMinProjectNumber to system_settings for LCR sync project number filter

DROP PROCEDURE IF EXISTS add_lcr_min_project_number;
DELIMITER $$
CREATE PROCEDURE add_lcr_min_project_number()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'system_settings'
      AND COLUMN_NAME = 'lcrMinProjectNumber'
  ) THEN
    ALTER TABLE system_settings ADD COLUMN lcrMinProjectNumber INT NULL;
  END IF;
END$$
DELIMITER ;
CALL add_lcr_min_project_number();
DROP PROCEDURE IF EXISTS add_lcr_min_project_number;
