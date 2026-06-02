-- v44_2: Ensure unit_cost and total_cost exist on inv_stock_ledger
-- Re-applies the cost columns that v44_1_inv_ledger_cost previously failed to add
-- because it referenced the non-existent column name 'reference_no' (snake_case)
-- instead of the actual 'referenceNo' (camelCase). The original run was tracked as
-- complete in _startup_migrations despite the ALTER TABLE silently failing.

DROP PROCEDURE IF EXISTS _v44_2_unit_cost;
DELIMITER $$
CREATE PROCEDURE _v44_2_unit_cost()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'inv_stock_ledger'
      AND COLUMN_NAME  = 'unit_cost'
  ) THEN
    ALTER TABLE inv_stock_ledger
      ADD COLUMN unit_cost DECIMAL(12,4) NULL;
  END IF;
END$$
DELIMITER ;
CALL _v44_2_unit_cost();
DROP PROCEDURE IF EXISTS _v44_2_unit_cost;

DROP PROCEDURE IF EXISTS _v44_2_total_cost;
DELIMITER $$
CREATE PROCEDURE _v44_2_total_cost()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'inv_stock_ledger'
      AND COLUMN_NAME  = 'total_cost'
  ) THEN
    ALTER TABLE inv_stock_ledger
      ADD COLUMN total_cost DECIMAL(12,2) NULL;
  END IF;
END$$
DELIMITER ;
CALL _v44_2_total_cost();
DROP PROCEDURE IF EXISTS _v44_2_total_cost;
