-- 19.17.1 — Add attachments JSON column to HrTrainingProgram (idempotent)
SET @col_exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME   = 'HrTrainingProgram'
    AND COLUMN_NAME  = 'attachments'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE HrTrainingProgram ADD COLUMN attachments JSON NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
