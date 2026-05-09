-- Fix for failed 20260327000000_enhance_system_events migration
-- This script is compatible with MySQL 5.7+ (removes IF NOT EXISTS/IF EXISTS syntax)
-- Run this on production to complete the migration

-- Step 1: Make userId nullable (drop FK first)
DROP PROCEDURE IF EXISTS drop_old_userId_fk;
DELIMITER $$
CREATE PROCEDURE drop_old_userId_fk()
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'system_events' AND CONSTRAINT_NAME = 'SystemEvent_userId_fkey') THEN
    ALTER TABLE `system_events` DROP FOREIGN KEY `SystemEvent_userId_fkey`;
  END IF;
END$$
DELIMITER ;
CALL drop_old_userId_fk();
DROP PROCEDURE drop_old_userId_fk;

-- Modify userId to be nullable
ALTER TABLE `system_events` MODIFY COLUMN `userId` CHAR(36) NULL;

-- Add new FK constraint
DROP PROCEDURE IF EXISTS add_new_userId_fk;
DELIMITER $$
CREATE PROCEDURE add_new_userId_fk()
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'system_events' AND CONSTRAINT_NAME = 'system_events_userId_fkey') THEN
    ALTER TABLE `system_events` ADD CONSTRAINT `system_events_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END$$
DELIMITER ;
CALL add_new_userId_fk();
DROP PROCEDURE add_new_userId_fk;

-- Step 2: Add columns (check each one individually)
DROP PROCEDURE IF EXISTS add_eventCategory_col;
DELIMITER $$
CREATE PROCEDURE add_eventCategory_col()
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'system_events' AND COLUMN_NAME = 'eventCategory') THEN
    ALTER TABLE `system_events` ADD COLUMN `eventCategory` VARCHAR(30) NULL AFTER `eventType`;
  END IF;
END$$
DELIMITER ;
CALL add_eventCategory_col();
DROP PROCEDURE add_eventCategory_col;

DROP PROCEDURE IF EXISTS add_userName_col;
DELIMITER $$
CREATE PROCEDURE add_userName_col()
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'system_events' AND COLUMN_NAME = 'userName') THEN
    ALTER TABLE `system_events` ADD COLUMN `userName` VARCHAR(100) NULL AFTER `userId`;
  END IF;
END$$
DELIMITER ;
CALL add_userName_col();
DROP PROCEDURE add_userName_col;

DROP PROCEDURE IF EXISTS add_userRole_col;
DELIMITER $$
CREATE PROCEDURE add_userRole_col()
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'system_events' AND COLUMN_NAME = 'userRole') THEN
    ALTER TABLE `system_events` ADD COLUMN `userRole` VARCHAR(50) NULL AFTER `userName`;
  END IF;
END$$
DELIMITER ;
CALL add_userRole_col();
DROP PROCEDURE add_userRole_col;

DROP PROCEDURE IF EXISTS add_ipAddress_col;
DELIMITER $$
CREATE PROCEDURE add_ipAddress_col()
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'system_events' AND COLUMN_NAME = 'ipAddress') THEN
    ALTER TABLE `system_events` ADD COLUMN `ipAddress` VARCHAR(45) NULL AFTER `userRole`;
  END IF;
END$$
DELIMITER ;
CALL add_ipAddress_col();
DROP PROCEDURE add_ipAddress_col;

DROP PROCEDURE IF EXISTS add_userAgent_col;
DELIMITER $$
CREATE PROCEDURE add_userAgent_col()
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'system_events' AND COLUMN_NAME = 'userAgent') THEN
    ALTER TABLE `system_events` ADD COLUMN `userAgent` VARCHAR(500) NULL AFTER `ipAddress`;
  END IF;
END$$
DELIMITER ;
CALL add_userAgent_col();
DROP PROCEDURE add_userAgent_col;

DROP PROCEDURE IF EXISTS add_entityName_col;
DELIMITER $$
CREATE PROCEDURE add_entityName_col()
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'system_events' AND COLUMN_NAME = 'entityName') THEN
    ALTER TABLE `system_events` ADD COLUMN `entityName` VARCHAR(200) NULL AFTER `entityId`;
  END IF;
END$$
DELIMITER ;
CALL add_entityName_col();
DROP PROCEDURE add_entityName_col;

DROP PROCEDURE IF EXISTS add_projectNumber_col;
DELIMITER $$
CREATE PROCEDURE add_projectNumber_col()
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'system_events' AND COLUMN_NAME = 'projectNumber') THEN
    ALTER TABLE `system_events` ADD COLUMN `projectNumber` VARCHAR(20) NULL AFTER `projectId`;
  END IF;
END$$
DELIMITER ;
CALL add_projectNumber_col();
DROP PROCEDURE add_projectNumber_col;

DROP PROCEDURE IF EXISTS add_buildingId_col;
DELIMITER $$
CREATE PROCEDURE add_buildingId_col()
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'system_events' AND COLUMN_NAME = 'buildingId') THEN
    ALTER TABLE `system_events` ADD COLUMN `buildingId` CHAR(36) NULL AFTER `projectNumber`;
  END IF;
END$$
DELIMITER ;
CALL add_buildingId_col();
DROP PROCEDURE add_buildingId_col;

DROP PROCEDURE IF EXISTS add_summary_col;
DELIMITER $$
CREATE PROCEDURE add_summary_col()
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'system_events' AND COLUMN_NAME = 'summary') THEN
    ALTER TABLE `system_events` ADD COLUMN `summary` VARCHAR(500) NULL AFTER `title`;
  END IF;
END$$
DELIMITER ;
CALL add_summary_col();
DROP PROCEDURE add_summary_col;

DROP PROCEDURE IF EXISTS add_details_col;
DELIMITER $$
CREATE PROCEDURE add_details_col()
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'system_events' AND COLUMN_NAME = 'details') THEN
    ALTER TABLE `system_events` ADD COLUMN `details` JSON NULL AFTER `description`;
  END IF;
END$$
DELIMITER ;
CALL add_details_col();
DROP PROCEDURE add_details_col;

DROP PROCEDURE IF EXISTS add_changedFields_col;
DELIMITER $$
CREATE PROCEDURE add_changedFields_col()
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'system_events' AND COLUMN_NAME = 'changedFields') THEN
    ALTER TABLE `system_events` ADD COLUMN `changedFields` JSON NULL AFTER `metadata`;
  END IF;
END$$
DELIMITER ;
CALL add_changedFields_col();
DROP PROCEDURE add_changedFields_col;

DROP PROCEDURE IF EXISTS add_duration_col;
DELIMITER $$
CREATE PROCEDURE add_duration_col()
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'system_events' AND COLUMN_NAME = 'duration') THEN
    ALTER TABLE `system_events` ADD COLUMN `duration` INT NULL AFTER `createdAt`;
  END IF;
END$$
DELIMITER ;
CALL add_duration_col();
DROP PROCEDURE add_duration_col;

DROP PROCEDURE IF EXISTS add_correlationId_col;
DELIMITER $$
CREATE PROCEDURE add_correlationId_col()
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'system_events' AND COLUMN_NAME = 'correlationId') THEN
    ALTER TABLE `system_events` ADD COLUMN `correlationId` VARCHAR(50) NULL AFTER `duration`;
  END IF;
END$$
DELIMITER ;
CALL add_correlationId_col();
DROP PROCEDURE add_correlationId_col;

DROP PROCEDURE IF EXISTS add_parentEventId_col;
DELIMITER $$
CREATE PROCEDURE add_parentEventId_col()
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'system_events' AND COLUMN_NAME = 'parentEventId') THEN
    ALTER TABLE `system_events` ADD COLUMN `parentEventId` CHAR(36) NULL AFTER `correlationId`;
  END IF;
END$$
DELIMITER ;
CALL add_parentEventId_col();
DROP PROCEDURE add_parentEventId_col;

DROP PROCEDURE IF EXISTS add_sessionId_col;
DELIMITER $$
CREATE PROCEDURE add_sessionId_col()
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'system_events' AND COLUMN_NAME = 'sessionId') THEN
    ALTER TABLE `system_events` ADD COLUMN `sessionId` VARCHAR(100) NULL AFTER `parentEventId`;
  END IF;
END$$
DELIMITER ;
CALL add_sessionId_col();
DROP PROCEDURE add_sessionId_col;

-- Step 3: Add indexes (check each one individually)
DROP PROCEDURE IF EXISTS add_eventCategory_idx;
DELIMITER $$
CREATE PROCEDURE add_eventCategory_idx()
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'system_events' AND INDEX_NAME = 'system_events_eventCategory_idx') THEN
    ALTER TABLE `system_events` ADD INDEX `system_events_eventCategory_idx` (`eventCategory`);
  END IF;
END$$
DELIMITER ;
CALL add_eventCategory_idx();
DROP PROCEDURE add_eventCategory_idx;

DROP PROCEDURE IF EXISTS add_severity_idx;
DELIMITER $$
CREATE PROCEDURE add_severity_idx()
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'system_events' AND INDEX_NAME = 'system_events_severity_idx') THEN
    ALTER TABLE `system_events` ADD INDEX `system_events_severity_idx` (`severity`);
  END IF;
END$$
DELIMITER ;
CALL add_severity_idx();
DROP PROCEDURE add_severity_idx;

DROP PROCEDURE IF EXISTS add_correlationId_idx;
DELIMITER $$
CREATE PROCEDURE add_correlationId_idx()
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'system_events' AND INDEX_NAME = 'system_events_correlationId_idx') THEN
    ALTER TABLE `system_events` ADD INDEX `system_events_correlationId_idx` (`correlationId`);
  END IF;
END$$
DELIMITER ;
CALL add_correlationId_idx();
DROP PROCEDURE add_correlationId_idx;

DROP PROCEDURE IF EXISTS add_entityType_entityId_idx;
DELIMITER $$
CREATE PROCEDURE add_entityType_entityId_idx()
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'system_events' AND INDEX_NAME = 'system_events_entityType_entityId_idx') THEN
    ALTER TABLE `system_events` ADD INDEX `system_events_entityType_entityId_idx` (`entityType`, `entityId`);
  END IF;
END$$
DELIMITER ;
CALL add_entityType_entityId_idx();
DROP PROCEDURE add_entityType_entityId_idx;
