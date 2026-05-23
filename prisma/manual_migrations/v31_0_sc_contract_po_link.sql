-- Add PO reference fields to SubcontractorContract

DELIMITER $$

DROP PROCEDURE IF EXISTS add_sc_po_fields $$
CREATE PROCEDURE add_sc_po_fields()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'SubcontractorContract'
    AND COLUMN_NAME = 'dolibarr_po_id'
  ) THEN
    ALTER TABLE `SubcontractorContract` ADD COLUMN `dolibarr_po_id` INT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'SubcontractorContract'
    AND COLUMN_NAME = 'dolibarr_po_ref'
  ) THEN
    ALTER TABLE `SubcontractorContract` ADD COLUMN `dolibarr_po_ref` VARCHAR(100) NULL;
  END IF;
END $$

CALL add_sc_po_fields() $$
DROP PROCEDURE IF EXISTS add_sc_po_fields $$

DELIMITER ;
