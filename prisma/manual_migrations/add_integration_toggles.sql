-- Migration: Add Integration Toggle Columns to system_settings
-- Date: 2026-04-03
-- Description: Adds openAuditEnabled, nextcloudEnabled, libreMesEnabled columns
--              that were added to the Prisma schema but never migrated to production.
-- NOTE: Run each statement separately. If a column already exists, that statement
--       will error with "Duplicate column name" — safe to ignore and continue.

ALTER TABLE `system_settings` ADD COLUMN `openAuditEnabled` TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE `system_settings` ADD COLUMN `nextcloudEnabled` TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE `system_settings` ADD COLUMN `libreMesEnabled`  TINYINT(1) NOT NULL DEFAULT 0;
