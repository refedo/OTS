-- Ensure is_locked column exists in fin_journal_entries
-- This column was added in v17.3.x to support manual (locked) journal entries.
-- Safe to run multiple times (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).

ALTER TABLE fin_journal_entries
  ADD COLUMN IF NOT EXISTS is_locked TINYINT(1) NOT NULL DEFAULT 0
    COMMENT '1 = manual locked entry (not deleted on sync), 0 = auto-generated';

-- Add index if it doesn't already exist
-- MySQL doesn't support IF NOT EXISTS for indexes, so we use a stored procedure trick
SET @sql = (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.statistics
      WHERE table_schema = DATABASE()
        AND table_name = 'fin_journal_entries'
        AND index_name = 'idx_is_locked'
    ),
    'SELECT 1',
    'ALTER TABLE fin_journal_entries ADD INDEX idx_is_locked (is_locked)'
  )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
