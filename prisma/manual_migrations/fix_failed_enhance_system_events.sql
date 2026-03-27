-- Fix for failed 20260327000000_enhance_system_events migration
-- This script is compatible with MySQL 5.7+ (removes IF NOT EXISTS/IF EXISTS syntax)
-- Run this on production to complete the migration

-- Step 1: Make userId nullable (drop FK first)
-- Check if old FK exists and drop it
SET @OLD_FK_EXISTS = (
    SELECT COUNT(*) 
    FROM information_schema.TABLE_CONSTRAINTS 
    WHERE CONSTRAINT_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'system_events' 
    AND CONSTRAINT_NAME = 'SystemEvent_userId_fkey'
);

SET @sql = IF(@OLD_FK_EXISTS > 0, 
    'ALTER TABLE `system_events` DROP FOREIGN KEY `SystemEvent_userId_fkey`', 
    'SELECT "Old FK does not exist, skipping"'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Modify userId to be nullable
ALTER TABLE `system_events` MODIFY COLUMN `userId` CHAR(36) NULL;

-- Add new FK constraint (check if it doesn't exist first)
SET @NEW_FK_EXISTS = (
    SELECT COUNT(*) 
    FROM information_schema.TABLE_CONSTRAINTS 
    WHERE CONSTRAINT_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'system_events' 
    AND CONSTRAINT_NAME = 'system_events_userId_fkey'
);

SET @sql = IF(@NEW_FK_EXISTS = 0,
    'ALTER TABLE `system_events` ADD CONSTRAINT `system_events_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE',
    'SELECT "New FK already exists, skipping"'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 2: Add columns (check each one individually)
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'system_events' AND COLUMN_NAME = 'eventCategory');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `system_events` ADD COLUMN `eventCategory` VARCHAR(30) NULL AFTER `eventType`', 'SELECT "eventCategory exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'system_events' AND COLUMN_NAME = 'userName');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `system_events` ADD COLUMN `userName` VARCHAR(100) NULL AFTER `userId`', 'SELECT "userName exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'system_events' AND COLUMN_NAME = 'userRole');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `system_events` ADD COLUMN `userRole` VARCHAR(50) NULL AFTER `userName`', 'SELECT "userRole exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'system_events' AND COLUMN_NAME = 'ipAddress');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `system_events` ADD COLUMN `ipAddress` VARCHAR(45) NULL AFTER `userRole`', 'SELECT "ipAddress exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'system_events' AND COLUMN_NAME = 'userAgent');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `system_events` ADD COLUMN `userAgent` VARCHAR(500) NULL AFTER `ipAddress`', 'SELECT "userAgent exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'system_events' AND COLUMN_NAME = 'entityName');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `system_events` ADD COLUMN `entityName` VARCHAR(200) NULL AFTER `entityId`', 'SELECT "entityName exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'system_events' AND COLUMN_NAME = 'projectNumber');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `system_events` ADD COLUMN `projectNumber` VARCHAR(20) NULL AFTER `projectId`', 'SELECT "projectNumber exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'system_events' AND COLUMN_NAME = 'buildingId');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `system_events` ADD COLUMN `buildingId` CHAR(36) NULL AFTER `projectNumber`', 'SELECT "buildingId exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'system_events' AND COLUMN_NAME = 'summary');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `system_events` ADD COLUMN `summary` VARCHAR(500) NULL AFTER `title`', 'SELECT "summary exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'system_events' AND COLUMN_NAME = 'details');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `system_events` ADD COLUMN `details` JSON NULL AFTER `description`', 'SELECT "details exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'system_events' AND COLUMN_NAME = 'changedFields');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `system_events` ADD COLUMN `changedFields` JSON NULL AFTER `metadata`', 'SELECT "changedFields exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'system_events' AND COLUMN_NAME = 'duration');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `system_events` ADD COLUMN `duration` INT NULL AFTER `createdAt`', 'SELECT "duration exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'system_events' AND COLUMN_NAME = 'correlationId');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `system_events` ADD COLUMN `correlationId` VARCHAR(50) NULL AFTER `duration`', 'SELECT "correlationId exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'system_events' AND COLUMN_NAME = 'parentEventId');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `system_events` ADD COLUMN `parentEventId` CHAR(36) NULL AFTER `correlationId`', 'SELECT "parentEventId exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'system_events' AND COLUMN_NAME = 'sessionId');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `system_events` ADD COLUMN `sessionId` VARCHAR(100) NULL AFTER `parentEventId`', 'SELECT "sessionId exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Step 3: Add indexes (check each one individually)
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'system_events' AND INDEX_NAME = 'system_events_eventCategory_idx');
SET @sql = IF(@idx_exists = 0, 'ALTER TABLE `system_events` ADD INDEX `system_events_eventCategory_idx` (`eventCategory`)', 'SELECT "eventCategory index exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'system_events' AND INDEX_NAME = 'system_events_severity_idx');
SET @sql = IF(@idx_exists = 0, 'ALTER TABLE `system_events` ADD INDEX `system_events_severity_idx` (`severity`)', 'SELECT "severity index exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'system_events' AND INDEX_NAME = 'system_events_correlationId_idx');
SET @sql = IF(@idx_exists = 0, 'ALTER TABLE `system_events` ADD INDEX `system_events_correlationId_idx` (`correlationId`)', 'SELECT "correlationId index exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'system_events' AND INDEX_NAME = 'system_events_entityType_entityId_idx');
SET @sql = IF(@idx_exists = 0, 'ALTER TABLE `system_events` ADD INDEX `system_events_entityType_entityId_idx` (`entityType`, `entityId`)', 'SELECT "entityType_entityId index exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
