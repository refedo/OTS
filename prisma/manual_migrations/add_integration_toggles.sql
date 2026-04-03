-- Migration: Add Integration Toggle Columns to system_settings
-- Date: 2026-04-03
-- Description: Adds openAuditEnabled, nextcloudEnabled, libreMesEnabled columns
--              that were added to the Prisma schema but never migrated to production.

ALTER TABLE `system_settings`
  ADD COLUMN IF NOT EXISTS `openAuditEnabled` TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `nextcloudEnabled` TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `libreMesEnabled`  TINYINT(1) NOT NULL DEFAULT 0;
