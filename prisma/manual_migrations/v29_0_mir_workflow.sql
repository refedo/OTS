-- v29.0 MIR workflow fields
-- Adds workflow status tracking columns to material_inspection_receipts:
-- workflow_status, submitted_at/by, reviewed_at/by/notes, approved_at/by/notes
-- Each PREPARE / EXECUTE / DEALLOCATE is on its own line so the startup
-- migration runner sends them as three separate single-statement queries
-- (multipleStatements: false only executes the first statement in a string).

-- workflow_status
SET @col_ws = (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND LOWER(table_name) = 'material_inspection_receipts'
        AND column_name = 'workflow_status'
    ),
    'SELECT 1',
    (SELECT CONCAT('ALTER TABLE `', table_name, '` ADD COLUMN `workflow_status` VARCHAR(50) NOT NULL DEFAULT ''Draft'' AFTER `status`')
     FROM information_schema.tables
     WHERE table_schema = DATABASE() AND LOWER(table_name) = 'material_inspection_receipts' LIMIT 1)
  )
);
PREPARE s_ws FROM @col_ws;
EXECUTE s_ws;
DEALLOCATE PREPARE s_ws;

-- submitted_at
SET @col_sat = (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND LOWER(table_name) = 'material_inspection_receipts'
        AND column_name = 'submitted_at'
    ),
    'SELECT 1',
    (SELECT CONCAT('ALTER TABLE `', table_name, '` ADD COLUMN `submitted_at` DATETIME NULL AFTER `workflow_status`')
     FROM information_schema.tables
     WHERE table_schema = DATABASE() AND LOWER(table_name) = 'material_inspection_receipts' LIMIT 1)
  )
);
PREPARE s_sat FROM @col_sat;
EXECUTE s_sat;
DEALLOCATE PREPARE s_sat;

-- submitted_by_id
SET @col_sbi = (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND LOWER(table_name) = 'material_inspection_receipts'
        AND column_name = 'submitted_by_id'
    ),
    'SELECT 1',
    (SELECT CONCAT('ALTER TABLE `', table_name, '` ADD COLUMN `submitted_by_id` CHAR(36) NULL AFTER `submitted_at`')
     FROM information_schema.tables
     WHERE table_schema = DATABASE() AND LOWER(table_name) = 'material_inspection_receipts' LIMIT 1)
  )
);
PREPARE s_sbi FROM @col_sbi;
EXECUTE s_sbi;
DEALLOCATE PREPARE s_sbi;

-- reviewed_at
SET @col_rat = (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND LOWER(table_name) = 'material_inspection_receipts'
        AND column_name = 'reviewed_at'
    ),
    'SELECT 1',
    (SELECT CONCAT('ALTER TABLE `', table_name, '` ADD COLUMN `reviewed_at` DATETIME NULL AFTER `submitted_by_id`')
     FROM information_schema.tables
     WHERE table_schema = DATABASE() AND LOWER(table_name) = 'material_inspection_receipts' LIMIT 1)
  )
);
PREPARE s_rat FROM @col_rat;
EXECUTE s_rat;
DEALLOCATE PREPARE s_rat;

-- reviewed_by_id
SET @col_rbi = (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND LOWER(table_name) = 'material_inspection_receipts'
        AND column_name = 'reviewed_by_id'
    ),
    'SELECT 1',
    (SELECT CONCAT('ALTER TABLE `', table_name, '` ADD COLUMN `reviewed_by_id` CHAR(36) NULL AFTER `reviewed_at`')
     FROM information_schema.tables
     WHERE table_schema = DATABASE() AND LOWER(table_name) = 'material_inspection_receipts' LIMIT 1)
  )
);
PREPARE s_rbi FROM @col_rbi;
EXECUTE s_rbi;
DEALLOCATE PREPARE s_rbi;

-- review_notes
SET @col_rn = (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND LOWER(table_name) = 'material_inspection_receipts'
        AND column_name = 'review_notes'
    ),
    'SELECT 1',
    (SELECT CONCAT('ALTER TABLE `', table_name, '` ADD COLUMN `review_notes` TEXT NULL AFTER `reviewed_by_id`')
     FROM information_schema.tables
     WHERE table_schema = DATABASE() AND LOWER(table_name) = 'material_inspection_receipts' LIMIT 1)
  )
);
PREPARE s_rn FROM @col_rn;
EXECUTE s_rn;
DEALLOCATE PREPARE s_rn;

-- approved_at
SET @col_aat = (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND LOWER(table_name) = 'material_inspection_receipts'
        AND column_name = 'approved_at'
    ),
    'SELECT 1',
    (SELECT CONCAT('ALTER TABLE `', table_name, '` ADD COLUMN `approved_at` DATETIME NULL AFTER `review_notes`')
     FROM information_schema.tables
     WHERE table_schema = DATABASE() AND LOWER(table_name) = 'material_inspection_receipts' LIMIT 1)
  )
);
PREPARE s_aat FROM @col_aat;
EXECUTE s_aat;
DEALLOCATE PREPARE s_aat;

-- approved_by_id
SET @col_abi = (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND LOWER(table_name) = 'material_inspection_receipts'
        AND column_name = 'approved_by_id'
    ),
    'SELECT 1',
    (SELECT CONCAT('ALTER TABLE `', table_name, '` ADD COLUMN `approved_by_id` CHAR(36) NULL AFTER `approved_at`')
     FROM information_schema.tables
     WHERE table_schema = DATABASE() AND LOWER(table_name) = 'material_inspection_receipts' LIMIT 1)
  )
);
PREPARE s_abi FROM @col_abi;
EXECUTE s_abi;
DEALLOCATE PREPARE s_abi;

-- approval_notes
SET @col_an = (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND LOWER(table_name) = 'material_inspection_receipts'
        AND column_name = 'approval_notes'
    ),
    'SELECT 1',
    (SELECT CONCAT('ALTER TABLE `', table_name, '` ADD COLUMN `approval_notes` TEXT NULL AFTER `approved_by_id`')
     FROM information_schema.tables
     WHERE table_schema = DATABASE() AND LOWER(table_name) = 'material_inspection_receipts' LIMIT 1)
  )
);
PREPARE s_an FROM @col_an;
EXECUTE s_an;
DEALLOCATE PREPARE s_an;
