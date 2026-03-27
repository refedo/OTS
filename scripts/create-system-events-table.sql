-- Create system_events table
CREATE TABLE IF NOT EXISTS `system_events` (
    `id` CHAR(36) NOT NULL,
    `eventType` VARCHAR(60) NOT NULL,
    `eventCategory` VARCHAR(30) NULL,
    `category` VARCHAR(50) NOT NULL,
    `severity` VARCHAR(20) NOT NULL DEFAULT 'INFO',
    `title` VARCHAR(255) NOT NULL,
    `summary` VARCHAR(500) NULL,
    `requestId` VARCHAR(64) NULL,
    `description` TEXT NULL,
    `details` JSON NULL,
    `metadata` JSON NULL,
    `changedFields` JSON NULL,
    `entityType` VARCHAR(50) NULL,
    `entityId` VARCHAR(50) NULL,
    `entityName` VARCHAR(200) NULL,
    `projectId` CHAR(36) NULL,
    `projectNumber` VARCHAR(20) NULL,
    `buildingId` CHAR(36) NULL,
    `userId` CHAR(36) NULL,
    `userName` VARCHAR(100) NULL,
    `userRole` VARCHAR(50) NULL,
    `ipAddress` VARCHAR(45) NULL,
    `userAgent` VARCHAR(500) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `duration` INT NULL,
    `correlationId` VARCHAR(50) NULL,
    `parentEventId` CHAR(36) NULL,
    `sessionId` VARCHAR(100) NULL,

    INDEX `system_events_eventType_idx`(`eventType`),
    INDEX `system_events_eventCategory_idx`(`eventCategory`),
    INDEX `system_events_category_idx`(`category`),
    INDEX `system_events_entityType_idx`(`entityType`),
    INDEX `system_events_entityType_id_idx`(`entityType`, `entityId`),
    INDEX `system_events_projectId_idx`(`projectId`),
    INDEX `system_events_userId_idx`(`userId`),
    INDEX `system_events_createdAt_idx`(`createdAt`),
    INDEX `system_events_severity_idx`(`severity`),
    INDEX `system_events_correlationId_idx`(`correlationId`),
    INDEX `system_events_cat_created_idx`(`eventCategory`, `createdAt`),
    INDEX `system_events_sev_created_idx`(`severity`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Add foreign keys
ALTER TABLE `system_events` 
ADD CONSTRAINT `system_events_projectId_fkey` 
FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) 
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `system_events` 
ADD CONSTRAINT `system_events_userId_fkey` 
FOREIGN KEY (`userId`) REFERENCES `User`(`id`) 
ON DELETE SET NULL ON UPDATE CASCADE;
