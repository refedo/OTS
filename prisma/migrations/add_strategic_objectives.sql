-- Add Strategic Objectives table for 5-7 year mid-term goals
CREATE TABLE IF NOT EXISTS `strategic_objectives` (
  `id` CHAR(36) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `category` VARCHAR(100) NOT NULL,
  `startYear` INT NOT NULL,
  `endYear` INT NOT NULL,
  `ownerId` CHAR(36) NOT NULL,
  `priority` VARCHAR(50) NOT NULL DEFAULT 'Medium',
  `status` VARCHAR(50) NOT NULL DEFAULT 'Not Started',
  `progress` FLOAT NOT NULL DEFAULT 0,
  `targetOutcome` TEXT,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `strategic_objectives_startYear_idx` (`startYear`),
  INDEX `strategic_objectives_endYear_idx` (`endYear`),
  INDEX `strategic_objectives_ownerId_idx` (`ownerId`),
  INDEX `strategic_objectives_category_idx` (`category`),
  INDEX `strategic_objectives_status_idx` (`status`),
  CONSTRAINT `strategic_objectives_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Add strategicObjectiveId column to company_objectives (ignore if exists)
ALTER TABLE `company_objectives` 
ADD COLUMN `strategicObjectiveId` CHAR(36) NULL AFTER `year`;

ALTER TABLE `company_objectives`
ADD INDEX `company_objectives_strategicObjectiveId_idx` (`strategicObjectiveId`);

-- Add foreign key constraint for strategic objectives
ALTER TABLE `company_objectives`
ADD CONSTRAINT `company_objectives_strategicObjectiveId_fkey` 
FOREIGN KEY (`strategicObjectiveId`) REFERENCES `strategic_objectives` (`id`) 
ON DELETE SET NULL ON UPDATE CASCADE;

-- Make objectiveId nullable in annual_initiatives for multi-objective support
ALTER TABLE `annual_initiatives` 
MODIFY COLUMN `objectiveId` CHAR(36) NULL;

-- Drop the cascade constraint and recreate with SET NULL
ALTER TABLE `annual_initiatives` DROP FOREIGN KEY `annual_initiatives_objectiveId_fkey`;
ALTER TABLE `annual_initiatives`
ADD CONSTRAINT `annual_initiatives_objectiveId_fkey` 
FOREIGN KEY (`objectiveId`) REFERENCES `company_objectives` (`id`) 
ON DELETE SET NULL ON UPDATE CASCADE;

-- Create initiative_objectives junction table for many-to-many
CREATE TABLE IF NOT EXISTS `initiative_objectives` (
  `id` CHAR(36) NOT NULL,
  `initiativeId` CHAR(36) NOT NULL,
  `objectiveId` CHAR(36) NOT NULL,
  `isPrimary` TINYINT(1) NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `initiative_objectives_initiativeId_objectiveId_key` (`initiativeId`, `objectiveId`),
  INDEX `initiative_objectives_initiativeId_idx` (`initiativeId`),
  INDEX `initiative_objectives_objectiveId_idx` (`objectiveId`),
  CONSTRAINT `initiative_objectives_initiativeId_fkey` FOREIGN KEY (`initiativeId`) REFERENCES `annual_initiatives` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `initiative_objectives_objectiveId_fkey` FOREIGN KEY (`objectiveId`) REFERENCES `company_objectives` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Migrate existing initiative-objective relationships to junction table
INSERT INTO `initiative_objectives` (`id`, `initiativeId`, `objectiveId`, `isPrimary`, `createdAt`)
SELECT UUID(), `id`, `objectiveId`, 1, NOW()
FROM `annual_initiatives`
WHERE `objectiveId` IS NOT NULL
ON DUPLICATE KEY UPDATE `isPrimary` = 1;
