-- Migration: Add stage duration fields and thirdPartyResponsibility to projects table
-- Date: 2026-03-05
-- Version: 15.18.3

-- Add stage duration columns (weeks min/max) to projects table
-- Using procedure to check if column exists before adding
DELIMITER //

DROP PROCEDURE IF EXISTS add_column_if_not_exists//

CREATE PROCEDURE add_column_if_not_exists()
BEGIN
    -- engineeringWeeksMin
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'projects' AND column_name = 'engineeringWeeksMin') THEN
        ALTER TABLE `projects` ADD COLUMN `engineeringWeeksMin` INT NULL;
    END IF;
    
    -- engineeringWeeksMax
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'projects' AND column_name = 'engineeringWeeksMax') THEN
        ALTER TABLE `projects` ADD COLUMN `engineeringWeeksMax` INT NULL;
    END IF;
    
    -- operationsWeeksMin
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'projects' AND column_name = 'operationsWeeksMin') THEN
        ALTER TABLE `projects` ADD COLUMN `operationsWeeksMin` INT NULL;
    END IF;
    
    -- operationsWeeksMax
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'projects' AND column_name = 'operationsWeeksMax') THEN
        ALTER TABLE `projects` ADD COLUMN `operationsWeeksMax` INT NULL;
    END IF;
    
    -- siteWeeksMin
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'projects' AND column_name = 'siteWeeksMin') THEN
        ALTER TABLE `projects` ADD COLUMN `siteWeeksMin` INT NULL;
    END IF;
    
    -- siteWeeksMax
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'projects' AND column_name = 'siteWeeksMax') THEN
        ALTER TABLE `projects` ADD COLUMN `siteWeeksMax` INT NULL;
    END IF;
    
    -- thirdPartyResponsibility
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'projects' AND column_name = 'thirdPartyResponsibility') THEN
        ALTER TABLE `projects` ADD COLUMN `thirdPartyResponsibility` VARCHAR(191) NULL;
    END IF;
END//

DELIMITER ;

CALL add_column_if_not_exists();
DROP PROCEDURE IF EXISTS add_column_if_not_exists;

-- ============================================================
-- IMPORTANT: Also run add_strategic_objectives.sql if not done
-- That migration adds:
--   1. strategic_objectives table
--   2. strategicObjectiveId column to company_objectives
--   3. initiative_objectives junction table
-- ============================================================
