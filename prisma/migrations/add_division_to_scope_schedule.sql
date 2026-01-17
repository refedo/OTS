-- Add division column to ScopeSchedule table
ALTER TABLE `ScopeSchedule` ADD COLUMN `division` VARCHAR(191) NULL;

-- Update existing records with division based on scopeType
UPDATE `ScopeSchedule` 
SET `division` = CASE 
  WHEN `scopeType` IN ('design', 'shopDrawing') THEN 'Engineering'
  WHEN `scopeType` IN ('procurement', 'fabrication', 'galvanization', 'painting', 'delivery') THEN 'Operations'
  WHEN `scopeType` = 'erection' THEN 'Site'
  ELSE 'Operations'
END;
