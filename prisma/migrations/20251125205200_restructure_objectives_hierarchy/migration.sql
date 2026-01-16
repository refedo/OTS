-- Restructure HSPS: Make Objectives top-level, remove dependency on Annual Plans
-- Objectives define WHAT to achieve, Annual Plans define HOW

-- Step 1: Add new fields to CompanyObjective (if not exists)
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'company_objectives' AND COLUMN_NAME = 'year');
SET @sql = IF(@col_exists = 0, 
  'ALTER TABLE `company_objectives` ADD COLUMN `year` INT NOT NULL DEFAULT 2025', 
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'company_objectives' AND COLUMN_NAME = 'quarterlyActions');
SET @sql = IF(@col_exists = 0, 
  'ALTER TABLE `company_objectives` ADD COLUMN `quarterlyActions` JSON NULL COMMENT \'Q1-Q4 action plans\'', 
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 2: Populate year from annualPlan (before removing the relation)
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'company_objectives' AND COLUMN_NAME = 'annualPlanId');
SET @sql = IF(@col_exists > 0, 
  'UPDATE `company_objectives` co INNER JOIN `annual_plans` ap ON co.annualPlanId = ap.id SET co.year = ap.year', 
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 3: Add new fields to BalancedScorecardKPI (if not exists)
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'balanced_scorecard_kpis' AND COLUMN_NAME = 'year');
SET @sql = IF(@col_exists = 0, 
  'ALTER TABLE `balanced_scorecard_kpis` ADD COLUMN `year` INT NOT NULL DEFAULT 2025', 
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'balanced_scorecard_kpis' AND COLUMN_NAME = 'objectiveId');
SET @sql = IF(@col_exists = 0, 
  'ALTER TABLE `balanced_scorecard_kpis` ADD COLUMN `objectiveId` CHAR(36) NULL', 
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 4: Populate year from annualPlan
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'balanced_scorecard_kpis' AND COLUMN_NAME = 'annualPlanId');
SET @sql = IF(@col_exists > 0, 
  'UPDATE `balanced_scorecard_kpis` bk INNER JOIN `annual_plans` ap ON bk.annualPlanId = ap.id SET bk.year = ap.year', 
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 5: Add new fields to AnnualInitiative (if not exists)
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'annual_initiatives' AND COLUMN_NAME = 'year');
SET @sql = IF(@col_exists = 0, 
  'ALTER TABLE `annual_initiatives` ADD COLUMN `year` INT NOT NULL DEFAULT 2025', 
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 6: Populate year from annualPlan
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'annual_initiatives' AND COLUMN_NAME = 'annualPlanId');
SET @sql = IF(@col_exists > 0, 
  'UPDATE `annual_initiatives` ai INNER JOIN `annual_plans` ap ON ai.annualPlanId = ap.id SET ai.year = ap.year', 
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 7: Drop foreign key constraints (check if exists first)
SET @constraint_name = (SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'company_objectives' AND COLUMN_NAME = 'annualPlanId' AND REFERENCED_TABLE_NAME IS NOT NULL);
SET @sql = IF(@constraint_name IS NOT NULL, CONCAT('ALTER TABLE `company_objectives` DROP FOREIGN KEY `', @constraint_name, '`'), 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @constraint_name = (SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'balanced_scorecard_kpis' AND COLUMN_NAME = 'annualPlanId' AND REFERENCED_TABLE_NAME IS NOT NULL);
SET @sql = IF(@constraint_name IS NOT NULL, CONCAT('ALTER TABLE `balanced_scorecard_kpis` DROP FOREIGN KEY `', @constraint_name, '`'), 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @constraint_name = (SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'annual_initiatives' AND COLUMN_NAME = 'annualPlanId' AND REFERENCED_TABLE_NAME IS NOT NULL);
SET @sql = IF(@constraint_name IS NOT NULL, CONCAT('ALTER TABLE `annual_initiatives` DROP FOREIGN KEY `', @constraint_name, '`'), 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 8: Drop indexes on old foreign keys (check if exists first)
SET @index_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'company_objectives' AND INDEX_NAME = 'company_objectives_annualPlanId_fkey');
SET @sql = IF(@index_exists > 0, 'ALTER TABLE `company_objectives` DROP INDEX `company_objectives_annualPlanId_fkey`', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'balanced_scorecard_kpis' AND INDEX_NAME = 'balanced_scorecard_kpis_annualPlanId_fkey');
SET @sql = IF(@index_exists > 0, 'ALTER TABLE `balanced_scorecard_kpis` DROP INDEX `balanced_scorecard_kpis_annualPlanId_fkey`', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'annual_initiatives' AND INDEX_NAME = 'annual_initiatives_annualPlanId_fkey');
SET @sql = IF(@index_exists > 0, 'ALTER TABLE `annual_initiatives` DROP INDEX `annual_initiatives_annualPlanId_fkey`', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 9: Remove annualPlanId columns (if exists)
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'company_objectives' AND COLUMN_NAME = 'annualPlanId');
SET @sql = IF(@col_exists > 0, 'ALTER TABLE `company_objectives` DROP COLUMN `annualPlanId`', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'balanced_scorecard_kpis' AND COLUMN_NAME = 'annualPlanId');
SET @sql = IF(@col_exists > 0, 'ALTER TABLE `balanced_scorecard_kpis` DROP COLUMN `annualPlanId`', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'annual_initiatives' AND COLUMN_NAME = 'annualPlanId');
SET @sql = IF(@col_exists > 0, 'ALTER TABLE `annual_initiatives` DROP COLUMN `annualPlanId`', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 10: Add indexes on new year columns (if not exists)
SET @index_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'company_objectives' AND INDEX_NAME = 'company_objectives_year_idx');
SET @sql = IF(@index_exists = 0, 'ALTER TABLE `company_objectives` ADD INDEX `company_objectives_year_idx` (`year`)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'balanced_scorecard_kpis' AND INDEX_NAME = 'balanced_scorecard_kpis_year_idx');
SET @sql = IF(@index_exists = 0, 'ALTER TABLE `balanced_scorecard_kpis` ADD INDEX `balanced_scorecard_kpis_year_idx` (`year`)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'annual_initiatives' AND INDEX_NAME = 'annual_initiatives_year_idx');
SET @sql = IF(@index_exists = 0, 'ALTER TABLE `annual_initiatives` ADD INDEX `annual_initiatives_year_idx` (`year`)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 11: Add foreign key for KPI -> Objective relationship (optional link) (if not exists)
SET @constraint_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'balanced_scorecard_kpis' AND CONSTRAINT_NAME = 'balanced_scorecard_kpis_objectiveId_fkey');
SET @sql = IF(@constraint_exists = 0, 
  'ALTER TABLE `balanced_scorecard_kpis` ADD CONSTRAINT `balanced_scorecard_kpis_objectiveId_fkey` FOREIGN KEY (`objectiveId`) REFERENCES `company_objectives`(`id`) ON DELETE SET NULL ON UPDATE CASCADE', 
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'balanced_scorecard_kpis' AND INDEX_NAME = 'balanced_scorecard_kpis_objectiveId_idx');
SET @sql = IF(@index_exists = 0, 'ALTER TABLE `balanced_scorecard_kpis` ADD INDEX `balanced_scorecard_kpis_objectiveId_idx` (`objectiveId`)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 12: Make objectiveId required in AnnualInitiative (initiatives must link to objectives)
-- First, link orphaned initiatives to first objective of same year
UPDATE `annual_initiatives` ai
LEFT JOIN `company_objectives` co ON co.year = ai.year
SET ai.objectiveId = co.id
WHERE ai.objectiveId IS NULL
AND co.id IS NOT NULL;

-- Drop existing foreign key constraint if it exists (to recreate with CASCADE)
SET @constraint_name = (SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'annual_initiatives' AND COLUMN_NAME = 'objectiveId' AND REFERENCED_TABLE_NAME IS NOT NULL);
SET @sql = IF(@constraint_name IS NOT NULL, CONCAT('ALTER TABLE `annual_initiatives` DROP FOREIGN KEY `', @constraint_name, '`'), 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Make objectiveId NOT NULL (check if already NOT NULL)
SET @is_nullable = (SELECT IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'annual_initiatives' AND COLUMN_NAME = 'objectiveId');
SET @sql = IF(@is_nullable = 'YES', 
  'ALTER TABLE `annual_initiatives` MODIFY COLUMN `objectiveId` CHAR(36) NOT NULL', 
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Re-add foreign key constraint with CASCADE
SET @constraint_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'annual_initiatives' AND CONSTRAINT_NAME = 'annual_initiatives_objectiveId_fkey');
SET @sql = IF(@constraint_exists = 0, 
  'ALTER TABLE `annual_initiatives` ADD CONSTRAINT `annual_initiatives_objectiveId_fkey` FOREIGN KEY (`objectiveId`) REFERENCES `company_objectives`(`id`) ON DELETE CASCADE ON UPDATE CASCADE', 
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Note: AnnualPlan table is kept for historical reference but is no longer the primary structure
-- Users will work with Objectives directly, filtered by year
