-- Migration: Add Task Conversations
-- Version: 17.5.0 (fixed table names for Prisma schema)
-- Date: 2026-04-03
-- Description: Adds task_messages and task_conversation_participants tables for the Task Conversations feature.
--              Also adds TASK_MESSAGE to the NotificationType enum.
-- NOTE: If tables already exist, CREATE TABLE IF NOT EXISTS will skip silently.
--       The ALTER TABLE for notes column will error if already present — safe to ignore.

CREATE TABLE IF NOT EXISTS `task_messages` (
  `id` CHAR(36) NOT NULL,
  `taskId` CHAR(36) NOT NULL,
  `userId` CHAR(36) NOT NULL,
  `content` LONGTEXT NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `task_messages_taskId_idx` (`taskId`),
  INDEX `task_messages_createdAt_idx` (`createdAt`),
  CONSTRAINT `task_messages_taskId_fkey` FOREIGN KEY (`taskId`) REFERENCES `Task` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `task_messages_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `task_conversation_participants` (
  `taskId` CHAR(36) NOT NULL,
  `userId` CHAR(36) NOT NULL,
  `invitedById` CHAR(36) NULL,
  `joinedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`taskId`, `userId`),
  CONSTRAINT `task_conversation_participants_taskId_fkey` FOREIGN KEY (`taskId`) REFERENCES `Task` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `task_conversation_participants_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `task_conversation_participants_invitedById_fkey` FOREIGN KEY (`invitedById`) REFERENCES `User` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Add TASK_MESSAGE to NotificationType enum
-- MySQL ENUM alteration requires all existing values to be listed.
-- Table name is `notifications` (Prisma model Notification has @@map("notifications"))
ALTER TABLE `notifications` MODIFY COLUMN `type` ENUM(
  'TASK_ASSIGNED','TASK_COMPLETED','APPROVAL_REQUIRED','DEADLINE_WARNING',
  'APPROVED','REJECTED','SYSTEM','TASK_MESSAGE'
) NOT NULL;

-- Add notes column to ProductBacklogItem (v17.5.1)
-- Will error with "Duplicate column name" if already present — safe to ignore.
ALTER TABLE `ProductBacklogItem` ADD COLUMN `notes` JSON NULL;
