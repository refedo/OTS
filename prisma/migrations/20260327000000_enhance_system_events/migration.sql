-- Enterprise System Events Schema Enhancement
-- Adds dedicated columns for structured event tracking (Phase 1)
-- Safe: all new columns are nullable; existing data is preserved

-- Step 1: Make userId nullable to support system-generated events
-- Drop the existing FK constraint first
ALTER TABLE `system_events`
  DROP FOREIGN KEY IF EXISTS `SystemEvent_userId_fkey`;

ALTER TABLE `system_events`
  MODIFY COLUMN `userId` CHAR(36) NULL;

-- Re-add FK as nullable
ALTER TABLE `system_events`
  ADD CONSTRAINT `system_events_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `User`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Step 2: Add eventCategory column for enterprise event category (AUTH, PROJECT, SYSTEM, etc.)
ALTER TABLE `system_events`
  ADD COLUMN IF NOT EXISTS `eventCategory` VARCHAR(30) NULL AFTER `eventType`;

-- Step 3: Add user context columns
ALTER TABLE `system_events`
  ADD COLUMN IF NOT EXISTS `userName` VARCHAR(100) NULL AFTER `userId`,
  ADD COLUMN IF NOT EXISTS `userRole` VARCHAR(50) NULL AFTER `userName`,
  ADD COLUMN IF NOT EXISTS `ipAddress` VARCHAR(45) NULL AFTER `userRole`,
  ADD COLUMN IF NOT EXISTS `userAgent` VARCHAR(500) NULL AFTER `ipAddress`;

-- Step 4: Add entity context columns
ALTER TABLE `system_events`
  ADD COLUMN IF NOT EXISTS `entityName` VARCHAR(200) NULL AFTER `entityId`;

-- Step 5: Add project context columns
ALTER TABLE `system_events`
  ADD COLUMN IF NOT EXISTS `projectNumber` VARCHAR(20) NULL AFTER `projectId`,
  ADD COLUMN IF NOT EXISTS `buildingId` CHAR(36) NULL AFTER `projectNumber`;

-- Step 6: Add enhanced detail columns
ALTER TABLE `system_events`
  ADD COLUMN IF NOT EXISTS `summary` VARCHAR(500) NULL AFTER `title`,
  ADD COLUMN IF NOT EXISTS `details` JSON NULL AFTER `description`,
  ADD COLUMN IF NOT EXISTS `changedFields` JSON NULL AFTER `metadata`;

-- Step 7: Add timing and correlation columns
ALTER TABLE `system_events`
  ADD COLUMN IF NOT EXISTS `duration` INT NULL AFTER `createdAt`,
  ADD COLUMN IF NOT EXISTS `correlationId` VARCHAR(50) NULL AFTER `duration`,
  ADD COLUMN IF NOT EXISTS `parentEventId` CHAR(36) NULL AFTER `correlationId`,
  ADD COLUMN IF NOT EXISTS `sessionId` VARCHAR(100) NULL AFTER `parentEventId`;

-- Step 8: Add indexes for new columns
ALTER TABLE `system_events`
  ADD INDEX IF NOT EXISTS `system_events_eventCategory_idx` (`eventCategory`),
  ADD INDEX IF NOT EXISTS `system_events_severity_idx` (`severity`),
  ADD INDEX IF NOT EXISTS `system_events_correlationId_idx` (`correlationId`),
  ADD INDEX IF NOT EXISTS `system_events_entityType_entityId_idx` (`entityType`, `entityId`);
