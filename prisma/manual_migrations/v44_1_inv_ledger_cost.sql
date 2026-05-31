-- v44_1: Add unit_cost and total_cost to inv_stock_ledger

DROP PROCEDURE IF EXISTS _v44_unit_cost;
DELIMITER $$
CREATE PROCEDURE _v44_unit_cost()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'inv_stock_ledger'
      AND COLUMN_NAME  = 'unit_cost'
  ) THEN
    ALTER TABLE inv_stock_ledger
      ADD COLUMN unit_cost DECIMAL(12,4) NULL AFTER reference_no;
  END IF;
END$$
DELIMITER ;
CALL _v44_unit_cost();
DROP PROCEDURE IF EXISTS _v44_unit_cost;

DROP PROCEDURE IF EXISTS _v44_total_cost;
DELIMITER $$
CREATE PROCEDURE _v44_total_cost()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'inv_stock_ledger'
      AND COLUMN_NAME  = 'total_cost'
  ) THEN
    ALTER TABLE inv_stock_ledger
      ADD COLUMN total_cost DECIMAL(12,2) NULL AFTER unit_cost;
  END IF;
END$$
DELIMITER ;
CALL _v44_total_cost();
DROP PROCEDURE IF EXISTS _v44_total_cost;
