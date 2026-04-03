-- Migration: Add attachments column to task_messages
-- Date: 2026-04-03
-- Description: Allows conversation messages to carry file attachments (images, PDFs, etc.)

ALTER TABLE `task_messages`
  ADD COLUMN `attachments` JSON NULL AFTER `content`;
