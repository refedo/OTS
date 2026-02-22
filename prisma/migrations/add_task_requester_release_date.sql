-- Add requester and release date fields to Task table
ALTER TABLE `Task` ADD COLUMN `requesterId` CHAR(36) NULL;
ALTER TABLE `Task` ADD COLUMN `releaseDate` DATETIME(3) NULL;

-- Add foreign key for requesterId
ALTER TABLE `Task` ADD CONSTRAINT `Task_requesterId_fkey` FOREIGN KEY (`requesterId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Create index for requesterId
CREATE INDEX `Task_requesterId_idx` ON `Task`(`requesterId`);
