-- Migration: Add ScopeOfWork and BuildingActivity tables + scopeOfWorkId to AssemblyPart
-- Safe to run on production - only ADDs, never drops or alters existing data

-- 1. Create ScopeOfWork table
CREATE TABLE IF NOT EXISTS `ScopeOfWork` (
  `id` CHAR(36) NOT NULL,
  `projectId` CHAR(36) NOT NULL,
  `buildingId` CHAR(36) NOT NULL,
  `scopeType` VARCHAR(191) NOT NULL,
  `scopeLabel` VARCHAR(191) NOT NULL,
  `customLabel` VARCHAR(191) NULL,
  `specification` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `ScopeOfWork_projectId_idx` (`projectId`),
  INDEX `ScopeOfWork_buildingId_idx` (`buildingId`),
  UNIQUE INDEX `ScopeOfWork_buildingId_scopeType_customLabel_key` (`buildingId`, `scopeType`, `customLabel`),
  CONSTRAINT `ScopeOfWork_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ScopeOfWork_buildingId_fkey` FOREIGN KEY (`buildingId`) REFERENCES `Building`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 2. Create BuildingActivity table
CREATE TABLE IF NOT EXISTS `BuildingActivity` (
  `id` CHAR(36) NOT NULL,
  `projectId` CHAR(36) NOT NULL,
  `buildingId` CHAR(36) NOT NULL,
  `scopeOfWorkId` CHAR(36) NOT NULL,
  `activityType` VARCHAR(191) NOT NULL,
  `activityLabel` VARCHAR(191) NOT NULL,
  `isApplicable` BOOLEAN NOT NULL DEFAULT true,
  `sortOrder` INTEGER NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `BuildingActivity_projectId_idx` (`projectId`),
  INDEX `BuildingActivity_buildingId_idx` (`buildingId`),
  INDEX `BuildingActivity_scopeOfWorkId_idx` (`scopeOfWorkId`),
  UNIQUE INDEX `BuildingActivity_scopeOfWorkId_activityType_key` (`scopeOfWorkId`, `activityType`),
  CONSTRAINT `BuildingActivity_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `BuildingActivity_buildingId_fkey` FOREIGN KEY (`buildingId`) REFERENCES `Building`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `BuildingActivity_scopeOfWorkId_fkey` FOREIGN KEY (`scopeOfWorkId`) REFERENCES `ScopeOfWork`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 3. Add scopeOfWorkId column to AssemblyPart (if not exists)
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'AssemblyPart' AND COLUMN_NAME = 'scopeOfWorkId');

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `AssemblyPart` ADD COLUMN `scopeOfWorkId` CHAR(36) NULL AFTER `buildingId`',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 4. Add index on scopeOfWorkId in AssemblyPart (if not exists)
SET @idx_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'AssemblyPart' AND INDEX_NAME = 'AssemblyPart_scopeOfWorkId_idx');

SET @sql = IF(@idx_exists = 0,
  'ALTER TABLE `AssemblyPart` ADD INDEX `AssemblyPart_scopeOfWorkId_idx` (`scopeOfWorkId`)',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 5. Add foreign key for scopeOfWorkId (if not exists)
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'AssemblyPart' AND CONSTRAINT_NAME = 'AssemblyPart_scopeOfWorkId_fkey');

SET @sql = IF(@fk_exists = 0,
  'ALTER TABLE `AssemblyPart` ADD CONSTRAINT `AssemblyPart_scopeOfWorkId_fkey` FOREIGN KEY (`scopeOfWorkId`) REFERENCES `ScopeOfWork`(`id`) ON DELETE SET NULL ON UPDATE CASCADE',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
