-- 18.7.0 — Migrate Employee.trade values into Employee.occupation, then drop
-- the trade column entirely. The HR/UX rename "Occupation → Position Title"
-- happens in code only; the database column name stays `occupation` so the
-- existing HrOccupation catalogue + indexes stay stable.
--
-- Idempotent: every step is guarded by an information_schema check so the
-- migration can be replayed safely. NOT using `ALTER ... IF EXISTS` because
-- MySQL 8 rejects that syntax inside ALTER COLUMN clauses (see CLAUDE.md).

-- ---------------------------------------------------------------------------
-- Step 1 — copy trade → occupation when occupation is empty
-- ---------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS migrate_trade_to_occupation_copy;
DELIMITER $$
CREATE PROCEDURE migrate_trade_to_occupation_copy()
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'Employee'
      AND COLUMN_NAME = 'trade'
  ) THEN
    UPDATE Employee
       SET occupation = trade
     WHERE trade IS NOT NULL
       AND trade <> ''
       AND (occupation IS NULL OR occupation = '');
  END IF;
END$$
DELIMITER ;
CALL migrate_trade_to_occupation_copy();
DROP PROCEDURE IF EXISTS migrate_trade_to_occupation_copy;

-- ---------------------------------------------------------------------------
-- Step 2 — drop the trade index
-- ---------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS migrate_trade_to_occupation_drop_index;
DELIMITER $$
CREATE PROCEDURE migrate_trade_to_occupation_drop_index()
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'Employee'
      AND INDEX_NAME = 'Employee_trade_idx'
  ) THEN
    ALTER TABLE Employee DROP INDEX Employee_trade_idx;
  END IF;
END$$
DELIMITER ;
CALL migrate_trade_to_occupation_drop_index();
DROP PROCEDURE IF EXISTS migrate_trade_to_occupation_drop_index;

-- ---------------------------------------------------------------------------
-- Step 3 — drop the trade column
-- ---------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS migrate_trade_to_occupation_drop_column;
DELIMITER $$
CREATE PROCEDURE migrate_trade_to_occupation_drop_column()
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'Employee'
      AND COLUMN_NAME = 'trade'
  ) THEN
    ALTER TABLE Employee DROP COLUMN trade;
  END IF;
END$$
DELIMITER ;
CALL migrate_trade_to_occupation_drop_column();
DROP PROCEDURE IF EXISTS migrate_trade_to_occupation_drop_column;
