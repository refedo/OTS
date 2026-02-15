-- Add issueNumber column with a temporary default value
ALTER TABLE `weekly_issues` ADD COLUMN `issueNumber` INT NULL;

-- Backfill existing rows with sequential issue numbers
SET @row_number = 0;
UPDATE `weekly_issues` 
SET `issueNumber` = (@row_number:=@row_number + 1)
ORDER BY `createdAt`;

-- Make the column required and add unique constraint
ALTER TABLE `weekly_issues` MODIFY COLUMN `issueNumber` INT NOT NULL;
ALTER TABLE `weekly_issues` ADD UNIQUE INDEX `weekly_issues_issueNumber_key`(`issueNumber`);
