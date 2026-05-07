-- ============================================================
-- v22.15.0 — Add scopeOfWorkId to Task table
-- Links each task to a specific ScopeOfWork (per building).
-- Defaults all existing tasks that belong to a building to the
-- steel scope of that building.
-- Safe to run multiple times (IF NOT EXISTS guards).
-- ============================================================

DROP PROCEDURE IF EXISTS add_column_if_not_exists;
DELIMITER $$
CREATE PROCEDURE add_column_if_not_exists(
  IN p_table VARCHAR(64),
  IN p_column VARCHAR(64),
  IN p_definition TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = p_table
      AND COLUMN_NAME  = p_column
  ) THEN
    SET @ddl = CONCAT('ALTER TABLE `', p_table, '` ADD COLUMN `', p_column, '` ', p_definition);
    PREPARE stmt FROM @ddl;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END$$
DELIMITER ;

-- ── Task.scopeOfWorkId ───────────────────────────────────────
CALL add_column_if_not_exists(
  'Task',
  'scopeOfWorkId',
  'CHAR(36) NULL'
);

-- ── Index ────────────────────────────────────────────────────
SET @idx_exists = (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME   = 'Task'
    AND INDEX_NAME   = 'Task_scopeOfWorkId_idx'
);
SET @sql = IF(@idx_exists = 0,
  'ALTER TABLE `Task` ADD INDEX `Task_scopeOfWorkId_idx` (`scopeOfWorkId`)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

DROP PROCEDURE IF EXISTS add_column_if_not_exists;

-- ── Backfill: set steel scope for existing tasks with a building ─
UPDATE `Task` t
JOIN `ScopeOfWork` sow ON sow.buildingId = t.buildingId AND sow.scopeType = 'steel'
SET t.scopeOfWorkId = sow.id
WHERE t.scopeOfWorkId IS NULL
  AND t.buildingId IS NOT NULL
  AND t.deletedAt IS NULL;
