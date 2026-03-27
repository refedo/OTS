-- Repair Migration: Fix system_events table name mismatch + add all missing columns
-- Root cause: original migration created `SystemEvent` (CamelCase) but Prisma schema
-- uses @@map("system_events") (snake_case), so all writes silently fail on Linux
-- (case-sensitive filesystem). This migration is idempotent and safe to run multiple times.
--
-- Run this BEFORE applying the standard Prisma enhance migration if you haven't already.

-- ────────────────────────────────────────────────────────────────────────────────────────
-- Step 1: Rename SystemEvent → system_events (no-op if already named correctly)
-- ────────────────────────────────────────────────────────────────────────────────────────
RENAME TABLE IF EXISTS `SystemEvent` TO `system_events`;

-- ────────────────────────────────────────────────────────────────────────────────────────
-- Step 2: Make userId nullable (drop old FK, modify column, re-add FK)
-- ────────────────────────────────────────────────────────────────────────────────────────
ALTER TABLE `system_events`
  DROP FOREIGN KEY IF EXISTS `SystemEvent_userId_fkey`;

ALTER TABLE `system_events`
  DROP FOREIGN KEY IF EXISTS `system_events_userId_fkey`;

ALTER TABLE `system_events`
  MODIFY COLUMN `userId` CHAR(36) NULL;

ALTER TABLE `system_events`
  ADD CONSTRAINT `system_events_userId_fkey`
  FOREIGN KEY IF NOT EXISTS (`userId`) REFERENCES `User`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

-- ────────────────────────────────────────────────────────────────────────────────────────
-- Step 3: Widen eventType (50 → 60 chars) and entityId (CHAR(36) → VARCHAR(50))
-- ────────────────────────────────────────────────────────────────────────────────────────
ALTER TABLE `system_events`
  MODIFY COLUMN `eventType` VARCHAR(60) NOT NULL;

ALTER TABLE `system_events`
  MODIFY COLUMN `entityId` VARCHAR(50) NULL;

-- ────────────────────────────────────────────────────────────────────────────────────────
-- Step 4: Add all missing columns (IF NOT EXISTS = idempotent)
-- ────────────────────────────────────────────────────────────────────────────────────────
ALTER TABLE `system_events`
  ADD COLUMN IF NOT EXISTS `eventCategory`  VARCHAR(30)  NULL AFTER `eventType`,
  ADD COLUMN IF NOT EXISTS `severity`       VARCHAR(20)  NOT NULL DEFAULT 'INFO' AFTER `category`,
  ADD COLUMN IF NOT EXISTS `summary`        VARCHAR(500) NULL AFTER `title`,
  ADD COLUMN IF NOT EXISTS `requestId`      VARCHAR(64)  NULL AFTER `summary`,
  ADD COLUMN IF NOT EXISTS `details`        JSON         NULL AFTER `description`,
  ADD COLUMN IF NOT EXISTS `changedFields`  JSON         NULL AFTER `metadata`,
  ADD COLUMN IF NOT EXISTS `userName`       VARCHAR(100) NULL AFTER `userId`,
  ADD COLUMN IF NOT EXISTS `userRole`       VARCHAR(50)  NULL AFTER `userName`,
  ADD COLUMN IF NOT EXISTS `ipAddress`      VARCHAR(45)  NULL AFTER `userRole`,
  ADD COLUMN IF NOT EXISTS `userAgent`      VARCHAR(500) NULL AFTER `ipAddress`,
  ADD COLUMN IF NOT EXISTS `entityName`     VARCHAR(200) NULL AFTER `entityId`,
  ADD COLUMN IF NOT EXISTS `projectNumber`  VARCHAR(20)  NULL AFTER `projectId`,
  ADD COLUMN IF NOT EXISTS `buildingId`     CHAR(36)     NULL AFTER `projectNumber`,
  ADD COLUMN IF NOT EXISTS `duration`       INT          NULL AFTER `createdAt`,
  ADD COLUMN IF NOT EXISTS `correlationId`  VARCHAR(50)  NULL AFTER `duration`,
  ADD COLUMN IF NOT EXISTS `parentEventId`  CHAR(36)     NULL AFTER `correlationId`,
  ADD COLUMN IF NOT EXISTS `sessionId`      VARCHAR(100) NULL AFTER `parentEventId`;

-- ────────────────────────────────────────────────────────────────────────────────────────
-- Step 5: Add missing indexes (IF NOT EXISTS = idempotent)
-- ────────────────────────────────────────────────────────────────────────────────────────
ALTER TABLE `system_events`
  ADD INDEX IF NOT EXISTS `system_events_eventCategory_idx`  (`eventCategory`),
  ADD INDEX IF NOT EXISTS `system_events_severity_idx`        (`severity`),
  ADD INDEX IF NOT EXISTS `system_events_correlationId_idx`   (`correlationId`),
  ADD INDEX IF NOT EXISTS `system_events_entityType_id_idx`   (`entityType`, `entityId`),
  ADD INDEX IF NOT EXISTS `system_events_cat_created_idx`     (`eventCategory`, `createdAt`),
  ADD INDEX IF NOT EXISTS `system_events_sev_created_idx`     (`severity`, `createdAt`);
