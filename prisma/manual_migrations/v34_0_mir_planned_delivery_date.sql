-- v34.0 — MIR: add planned_delivery_date column
-- Stores the Dolibarr PO "Planned date of delivery" (date_livraison) so
-- inspectors can compare actual receipt date against the planned delivery.

DROP PROCEDURE IF EXISTS mir_add_planned_delivery_date;
DELIMITER $$
CREATE PROCEDURE mir_add_planned_delivery_date()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'material_inspection_receipts'
      AND COLUMN_NAME = 'planned_delivery_date'
  ) THEN
    ALTER TABLE material_inspection_receipts
      ADD COLUMN planned_delivery_date DATETIME NULL DEFAULT NULL
      AFTER receipt_date;
  END IF;
END$$
DELIMITER ;
CALL mir_add_planned_delivery_date();
DROP PROCEDURE IF EXISTS mir_add_planned_delivery_date;
