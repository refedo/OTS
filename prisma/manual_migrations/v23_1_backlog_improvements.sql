-- v23.1.0 Backlog Improvements
-- 1. Add backlogCeoNotify toggle to system_settings
-- 2. Add inProgressById / inProgressAt to ProductBacklogItem for workflow tracking

DROP PROCEDURE IF EXISTS v23_1_backlog_improvements;
DELIMITER $$
CREATE PROCEDURE v23_1_backlog_improvements()
BEGIN
  -- backlogCeoNotify on system_settings
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'system_settings'
      AND COLUMN_NAME = 'backlogCeoNotify'
  ) THEN
    ALTER TABLE `system_settings` ADD COLUMN `backlogCeoNotify` TINYINT(1) NOT NULL DEFAULT 1;
  END IF;

  -- inProgressById on ProductBacklogItem
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'ProductBacklogItem'
      AND COLUMN_NAME = 'inProgressById'
  ) THEN
    ALTER TABLE `ProductBacklogItem` ADD COLUMN `inProgressById` CHAR(36) NULL;
  END IF;

  -- inProgressAt on ProductBacklogItem
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'ProductBacklogItem'
      AND COLUMN_NAME = 'inProgressAt'
  ) THEN
    ALTER TABLE `ProductBacklogItem` ADD COLUMN `inProgressAt` DATETIME(3) NULL;
  END IF;
END$$
DELIMITER ;

CALL v23_1_backlog_improvements();
DROP PROCEDURE IF EXISTS v23_1_backlog_improvements;
