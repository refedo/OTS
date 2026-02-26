-- Add undo support to TaskAuditLog
ALTER TABLE `TaskAuditLog` 
ADD COLUMN `snapshot` TEXT NULL COMMENT 'JSON snapshot of task state before change (for undo)' AFTER `newValue`,
ADD COLUMN `undone` BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Whether this action has been undone' AFTER `snapshot`,
ADD COLUMN `undoneAt` DATETIME(3) NULL COMMENT 'When this action was undone' AFTER `undone`,
ADD COLUMN `undoneBy` CHAR(36) NULL COMMENT 'User who undid this action' AFTER `undoneAt`,
ADD INDEX `TaskAuditLog_undone_idx` (`undone`);
