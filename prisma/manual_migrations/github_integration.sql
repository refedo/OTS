-- GitHub Integration Migration
-- Apply this on the server via: mysql -u <user> -p <database> < github_integration.sql

-- Add GitHub fields to ProductBacklogItem
ALTER TABLE `ProductBacklogItem`
  ADD COLUMN `githubIssueNumber` INT NULL AFTER `completedAt`,
  ADD COLUMN `githubIssueUrl` VARCHAR(255) NULL AFTER `githubIssueNumber`,
  ADD COLUMN `githubRepo` VARCHAR(255) NULL AFTER `githubIssueUrl`,
  ADD COLUMN `githubSyncedAt` DATETIME(3) NULL AFTER `githubRepo`;

-- Add GitHub fields to system_settings
ALTER TABLE `system_settings`
  ADD COLUMN `githubToken` TEXT NULL AFTER `smsNotifications`,
  ADD COLUMN `githubDefaultRepo` VARCHAR(255) NULL AFTER `githubToken`;
