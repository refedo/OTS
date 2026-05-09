-- Add soft delete fields to Task table
-- Prisma prepared statements don't support stored procedures / DELIMITER.
-- The runner executes each statement individually and catches errors, so
-- duplicate-column failures on re-runs are harmless warnings.
ALTER TABLE `Task` ADD COLUMN `deletedAt` DATETIME NULL;
ALTER TABLE `Task` ADD COLUMN `deletedById` CHAR(36) NULL;
ALTER TABLE `Task` ADD COLUMN `deleteReason` VARCHAR(500) NULL;
ALTER TABLE `Task` ADD CONSTRAINT `fk_task_deletedBy` FOREIGN KEY (`deletedById`) REFERENCES `User`(`id`) ON DELETE SET NULL;
