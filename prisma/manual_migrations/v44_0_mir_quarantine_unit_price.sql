-- v44_0: Add quarantine_qty and unit_price to material_inspection_receipt_items

DROP PROCEDURE IF EXISTS _v44_quarantine_qty;
DELIMITER $$
CREATE PROCEDURE _v44_quarantine_qty()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'material_inspection_receipt_items'
      AND COLUMN_NAME  = 'quarantine_qty'
  ) THEN
    ALTER TABLE material_inspection_receipt_items
      ADD COLUMN quarantine_qty DOUBLE NOT NULL DEFAULT 0 AFTER rejected_qty;
  END IF;
END$$
DELIMITER ;
CALL _v44_quarantine_qty();
DROP PROCEDURE IF EXISTS _v44_quarantine_qty;

DROP PROCEDURE IF EXISTS _v44_unit_price;
DELIMITER $$
CREATE PROCEDURE _v44_unit_price()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'material_inspection_receipt_items'
      AND COLUMN_NAME  = 'unit_price'
  ) THEN
    ALTER TABLE material_inspection_receipt_items
      ADD COLUMN unit_price DECIMAL(12,4) NULL AFTER unit;
  END IF;
END$$
DELIMITER ;
CALL _v44_unit_price();
DROP PROCEDURE IF EXISTS _v44_unit_price;
