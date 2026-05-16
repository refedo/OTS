DROP PROCEDURE IF EXISTS add_building_arch_drawings;
DELIMITER $$
CREATE PROCEDURE add_building_arch_drawings()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'Building'
      AND COLUMN_NAME = 'archDrawingsReceived'
  ) THEN
    ALTER TABLE Building ADD COLUMN archDrawingsReceived BOOLEAN NOT NULL DEFAULT FALSE AFTER location;
  END IF;
END$$
DELIMITER ;
CALL add_building_arch_drawings();
DROP PROCEDURE IF EXISTS add_building_arch_drawings;
