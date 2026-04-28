-- ============================================================
-- BD Document multi-file attachments (v22.2.0)
-- Adds an `attachments` JSON column to BdDocument so each
-- document record can hold multiple named file attachments.
-- Safe to re-run — uses stored procedure pattern.
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

-- attachments: JSON array of { name: string, url: string }
CALL add_column_if_not_exists(
  'BdDocument',
  'attachments',
  'MEDIUMTEXT NULL'
);

DROP PROCEDURE IF EXISTS add_column_if_not_exists;
