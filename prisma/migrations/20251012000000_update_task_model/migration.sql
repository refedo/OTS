-- Drop TaskAssignment table if exists
DROP TABLE IF EXISTS `TaskAssignment`;

-- Drop existing foreign key
ALTER TABLE `Task` DROP FOREIGN KEY `Task_projectId_fkey`;

-- Update Task table structure
ALTER TABLE `Task` 
  MODIFY COLUMN `description` TEXT,
  ADD COLUMN `assignedToId` CHAR(36) NULL AFTER `description`,
  ADD COLUMN `createdById` CHAR(36) NOT NULL AFTER `assignedToId`,
  ADD COLUMN `dueDate` DATETIME(3) NULL AFTER `createdById`,
  ADD COLUMN `priority` VARCHAR(191) NOT NULL DEFAULT 'Medium' AFTER `dueDate`,
  ADD COLUMN `status` VARCHAR(191) NOT NULL DEFAULT 'Pending' AFTER `priority`,
  MODIFY COLUMN `projectId` CHAR(36) NULL;

-- Add foreign keys
ALTER TABLE `Task`
  ADD CONSTRAINT `Task_assignedToId_fkey` FOREIGN KEY (`assignedToId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `Task_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `Task_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
