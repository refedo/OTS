-- 20.1.0 — Add leaveDaysCompensated column to PayrollAdjustment (idempotent)
-- Supports Annual Leave Allowance entitlement kind.
-- Uses SET/PREPARE/EXECUTE pattern — stored procedures do not work via Prisma
-- prepared-statement protocol (error 1295).
SET @col_exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME   = 'PayrollAdjustment'
    AND COLUMN_NAME  = 'leaveDaysCompensated'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE PayrollAdjustment ADD COLUMN leaveDaysCompensated DECIMAL(6,2) NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
