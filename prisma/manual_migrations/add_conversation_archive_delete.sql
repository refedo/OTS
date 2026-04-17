-- Migration: add_conversation_archive_delete.sql
-- Adds per-user archive tracking to conversation participants
-- and soft-delete support to standalone conversations.

DROP PROCEDURE IF EXISTS add_conversation_archive_delete;
DELIMITER $$
CREATE PROCEDURE add_conversation_archive_delete()
BEGIN
  -- archivedAt on conversation_participants (standalone)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'conversation_participants'
      AND COLUMN_NAME = 'archivedAt'
  ) THEN
    ALTER TABLE conversation_participants ADD COLUMN archivedAt DATETIME NULL;
  END IF;

  -- archivedAt on task_conversation_participants (task-linked)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'task_conversation_participants'
      AND COLUMN_NAME = 'archivedAt'
  ) THEN
    ALTER TABLE task_conversation_participants ADD COLUMN archivedAt DATETIME NULL;
  END IF;

  -- deletedAt on conversations (soft-delete for standalone)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'conversations'
      AND COLUMN_NAME = 'deletedAt'
  ) THEN
    ALTER TABLE conversations ADD COLUMN deletedAt DATETIME NULL;
  END IF;
END$$
DELIMITER ;
CALL add_conversation_archive_delete();
DROP PROCEDURE IF EXISTS add_conversation_archive_delete;
