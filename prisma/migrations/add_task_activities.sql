-- Add main activity and sub-activity fields to Task table
ALTER TABLE `Task`
  ADD COLUMN `mainActivity` VARCHAR(191) NULL,
  ADD COLUMN `subActivity`  VARCHAR(191) NULL;
