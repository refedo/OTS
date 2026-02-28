-- Production Fix - February 28, 2026
-- Fixes missing TaskAuditLog columns for undo support

-- ============================================
-- FIX: Add missing columns to TaskAuditLog
-- ============================================
-- Run these one at a time. If a column already exists, it will error - just skip to the next one.

ALTER TABLE `TaskAuditLog` 
ADD COLUMN `snapshot` TEXT NULL COMMENT 'JSON snapshot of task state before change (for undo)';

ALTER TABLE `TaskAuditLog` 
ADD COLUMN `undone` BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Whether this action has been undone';

ALTER TABLE `TaskAuditLog` 
ADD COLUMN `undoneAt` DATETIME(3) NULL COMMENT 'When this action was undone';

ALTER TABLE `TaskAuditLog` 
ADD COLUMN `undoneBy` CHAR(36) NULL COMMENT 'User who undid this action';

-- Add index for undone column
ALTER TABLE `TaskAuditLog` ADD INDEX `TaskAuditLog_undone_idx` (`undone`);
