-- Add linked_po_dolibarr_id to fin_supplier_invoices
-- Stores the Dolibarr PO rowid directly linked to each supplier invoice,
-- derived from origin_id (invoices created from POs) or linked_objects.order_supplier
-- (invoices manually linked to POs via Related Objects in Dolibarr).

SET @sql_col = (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'fin_supplier_invoices'
        AND column_name = 'linked_po_dolibarr_id'
    ),
    'SELECT 1',
    'ALTER TABLE fin_supplier_invoices ADD COLUMN linked_po_dolibarr_id INT NULL AFTER fk_projet'
  )
);
PREPARE stmt FROM @sql_col;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql_idx = (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.statistics
      WHERE table_schema = DATABASE()
        AND table_name = 'fin_supplier_invoices'
        AND index_name = 'idx_linked_po_dolibarr_id'
    ),
    'SELECT 1',
    'ALTER TABLE fin_supplier_invoices ADD INDEX idx_linked_po_dolibarr_id (linked_po_dolibarr_id)'
  )
);
PREPARE stmt FROM @sql_idx;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Backfill from dolibarr_raw: invoices that were created directly from a PO
UPDATE fin_supplier_invoices
SET linked_po_dolibarr_id = CAST(JSON_UNQUOTE(JSON_EXTRACT(dolibarr_raw, '$.origin_id')) AS UNSIGNED)
WHERE linked_po_dolibarr_id IS NULL
  AND dolibarr_raw IS NOT NULL
  AND JSON_UNQUOTE(JSON_EXTRACT(dolibarr_raw, '$.origin_type')) = 'order_supplier'
  AND CAST(JSON_UNQUOTE(JSON_EXTRACT(dolibarr_raw, '$.origin_id')) AS UNSIGNED) > 0;
