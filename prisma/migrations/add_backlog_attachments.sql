-- Add attachments JSON column to ProductBacklogItem
-- Stores array of {fileName, filePath, fileType, fileSize, uploadedAt}

ALTER TABLE `ProductBacklogItem` ADD COLUMN `attachments` JSON NULL;
