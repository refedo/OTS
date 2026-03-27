-- Fix SystemEvent table to match Prisma schema
-- Add missing columns that Prisma expects

-- Make userId nullable
ALTER TABLE `SystemEvent` MODIFY COLUMN `userId` CHAR(36) NULL;

-- Widen eventType
ALTER TABLE `SystemEvent` MODIFY COLUMN `eventType` VARCHAR(60) NOT NULL;

-- Widen entityId
ALTER TABLE `SystemEvent` MODIFY COLUMN `entityId` VARCHAR(50) NULL;

-- Add missing columns one by one (MySQL 5.7 compatible - no IF NOT EXISTS for columns)
-- We'll use stored procedure to check and add

DELIMITER //

DROP PROCEDURE IF EXISTS add_column_if_not_exists//

CREATE PROCEDURE add_column_if_not_exists()
BEGIN
    -- eventCategory
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'SystemEvent' AND column_name = 'eventCategory') THEN
        ALTER TABLE `SystemEvent` ADD COLUMN `eventCategory` VARCHAR(30) NULL;
    END IF;
    
    -- userName
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'SystemEvent' AND column_name = 'userName') THEN
        ALTER TABLE `SystemEvent` ADD COLUMN `userName` VARCHAR(100) NULL;
    END IF;
    
    -- userRole
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'SystemEvent' AND column_name = 'userRole') THEN
        ALTER TABLE `SystemEvent` ADD COLUMN `userRole` VARCHAR(50) NULL;
    END IF;
    
    -- ipAddress
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'SystemEvent' AND column_name = 'ipAddress') THEN
        ALTER TABLE `SystemEvent` ADD COLUMN `ipAddress` VARCHAR(45) NULL;
    END IF;
    
    -- userAgent
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'SystemEvent' AND column_name = 'userAgent') THEN
        ALTER TABLE `SystemEvent` ADD COLUMN `userAgent` VARCHAR(500) NULL;
    END IF;
    
    -- entityName
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'SystemEvent' AND column_name = 'entityName') THEN
        ALTER TABLE `SystemEvent` ADD COLUMN `entityName` VARCHAR(200) NULL;
    END IF;
    
    -- projectNumber
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'SystemEvent' AND column_name = 'projectNumber') THEN
        ALTER TABLE `SystemEvent` ADD COLUMN `projectNumber` VARCHAR(20) NULL;
    END IF;
    
    -- buildingId
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'SystemEvent' AND column_name = 'buildingId') THEN
        ALTER TABLE `SystemEvent` ADD COLUMN `buildingId` CHAR(36) NULL;
    END IF;
    
    -- summary
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'SystemEvent' AND column_name = 'summary') THEN
        ALTER TABLE `SystemEvent` ADD COLUMN `summary` VARCHAR(500) NULL;
    END IF;
    
    -- details
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'SystemEvent' AND column_name = 'details') THEN
        ALTER TABLE `SystemEvent` ADD COLUMN `details` JSON NULL;
    END IF;
    
    -- changedFields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'SystemEvent' AND column_name = 'changedFields') THEN
        ALTER TABLE `SystemEvent` ADD COLUMN `changedFields` JSON NULL;
    END IF;
    
    -- duration
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'SystemEvent' AND column_name = 'duration') THEN
        ALTER TABLE `SystemEvent` ADD COLUMN `duration` INT NULL;
    END IF;
    
    -- correlationId
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'SystemEvent' AND column_name = 'correlationId') THEN
        ALTER TABLE `SystemEvent` ADD COLUMN `correlationId` VARCHAR(50) NULL;
    END IF;
    
    -- parentEventId
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'SystemEvent' AND column_name = 'parentEventId') THEN
        ALTER TABLE `SystemEvent` ADD COLUMN `parentEventId` CHAR(36) NULL;
    END IF;
    
    -- sessionId
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'SystemEvent' AND column_name = 'sessionId') THEN
        ALTER TABLE `SystemEvent` ADD COLUMN `sessionId` VARCHAR(100) NULL;
    END IF;
END//

DELIMITER ;

CALL add_column_if_not_exists();

DROP PROCEDURE IF EXISTS add_column_if_not_exists;

SELECT 'SystemEvent table updated successfully' as result;
