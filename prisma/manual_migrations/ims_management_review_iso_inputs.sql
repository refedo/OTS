-- Add 5 ISO §9.3.2 input columns to ImsManagementReview
-- Uses conditional stored procedure to avoid ADD COLUMN IF NOT EXISTS

DROP PROCEDURE IF EXISTS add_mr_iso_inputs;

DELIMITER //
CREATE PROCEDURE add_mr_iso_inputs()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'ImsManagementReview'
      AND column_name = 'inputPreviousActions'
  ) THEN
    ALTER TABLE `ImsManagementReview` ADD COLUMN `inputPreviousActions` JSON NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'ImsManagementReview'
      AND column_name = 'inputContextChanges'
  ) THEN
    ALTER TABLE `ImsManagementReview` ADD COLUMN `inputContextChanges` LONGTEXT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'ImsManagementReview'
      AND column_name = 'inputDesignPerformance'
  ) THEN
    ALTER TABLE `ImsManagementReview` ADD COLUMN `inputDesignPerformance` LONGTEXT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'ImsManagementReview'
      AND column_name = 'inputOhsPerformance'
  ) THEN
    ALTER TABLE `ImsManagementReview` ADD COLUMN `inputOhsPerformance` JSON NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'ImsManagementReview'
      AND column_name = 'inputEnvironmentalPerf'
  ) THEN
    ALTER TABLE `ImsManagementReview` ADD COLUMN `inputEnvironmentalPerf` LONGTEXT NULL;
  END IF;
END //
DELIMITER ;

CALL add_mr_iso_inputs();
DROP PROCEDURE IF EXISTS add_mr_iso_inputs;
