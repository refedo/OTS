-- ============================================================
-- v22.16.0 — Ensure isCeoTask is NOT NULL with DEFAULT FALSE
-- Tasks created before this column existed may have NULL.
-- NULL rows are silently excluded by WHERE isCeoTask = 0,
-- making those tasks invisible to non-CEO users.
-- ============================================================

DROP PROCEDURE IF EXISTS _mm_task_is_ceo_backfill;
DELIMITER $$
CREATE PROCEDURE _mm_task_is_ceo_backfill()
BEGIN
  -- Add the column if it was never created
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'Task'
      AND COLUMN_NAME  = 'isCeoTask'
  ) THEN
    ALTER TABLE `Task`
      ADD COLUMN `isCeoTask` TINYINT(1) NOT NULL DEFAULT 0;
  END IF;

  -- Backfill any NULL rows to 0 (false)
  UPDATE `Task` SET `isCeoTask` = 0 WHERE `isCeoTask` IS NULL;

  -- Tighten the column to NOT NULL DEFAULT 0 if it was created nullable
  ALTER TABLE `Task`
    MODIFY COLUMN `isCeoTask` TINYINT(1) NOT NULL DEFAULT 0;
END$$
DELIMITER ;
CALL _mm_task_is_ceo_backfill();
DROP PROCEDURE IF EXISTS _mm_task_is_ceo_backfill;
