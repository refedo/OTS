-- Migration: Add stage duration fields and thirdPartyResponsibility to projects table
-- Date: 2026-03-05
-- Version: 15.18.3

-- Add stage duration columns (weeks min/max) to projects table
ALTER TABLE `projects` ADD COLUMN IF NOT EXISTS `engineeringWeeksMin` INT NULL;
ALTER TABLE `projects` ADD COLUMN IF NOT EXISTS `engineeringWeeksMax` INT NULL;
ALTER TABLE `projects` ADD COLUMN IF NOT EXISTS `operationsWeeksMin` INT NULL;
ALTER TABLE `projects` ADD COLUMN IF NOT EXISTS `operationsWeeksMax` INT NULL;
ALTER TABLE `projects` ADD COLUMN IF NOT EXISTS `siteWeeksMin` INT NULL;
ALTER TABLE `projects` ADD COLUMN IF NOT EXISTS `siteWeeksMax` INT NULL;

-- Add thirdPartyResponsibility column to projects table
ALTER TABLE `projects` ADD COLUMN IF NOT EXISTS `thirdPartyResponsibility` VARCHAR(191) NULL;

-- ============================================================
-- IMPORTANT: Also run add_strategic_objectives.sql if not done
-- That migration adds:
--   1. strategic_objectives table
--   2. strategicObjectiveId column to company_objectives
--   3. initiative_objectives junction table
-- ============================================================
