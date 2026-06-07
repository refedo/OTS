-- v46_0: Add checked_by, approved_by, approval_status, approval_notes to DimensionalInspection

DROP PROCEDURE IF EXISTS _v46_dim_checked_by;
DELIMITER $$
CREATE PROCEDURE _v46_dim_checked_by()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'DimensionalInspection'
      AND COLUMN_NAME  = 'checkedById'
  ) THEN
    ALTER TABLE DimensionalInspection
      ADD COLUMN checkedById CHAR(36) NULL AFTER inspectorId;
  END IF;
END$$
DELIMITER ;
CALL _v46_dim_checked_by();
DROP PROCEDURE IF EXISTS _v46_dim_checked_by;

DROP PROCEDURE IF EXISTS _v46_dim_approved_by;
DELIMITER $$
CREATE PROCEDURE _v46_dim_approved_by()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'DimensionalInspection'
      AND COLUMN_NAME  = 'approvedById'
  ) THEN
    ALTER TABLE DimensionalInspection
      ADD COLUMN approvedById CHAR(36) NULL AFTER checkedById;
  END IF;
END$$
DELIMITER ;
CALL _v46_dim_approved_by();
DROP PROCEDURE IF EXISTS _v46_dim_approved_by;

DROP PROCEDURE IF EXISTS _v46_dim_approval_status;
DELIMITER $$
CREATE PROCEDURE _v46_dim_approval_status()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'DimensionalInspection'
      AND COLUMN_NAME  = 'approvalStatus'
  ) THEN
    ALTER TABLE DimensionalInspection
      ADD COLUMN approvalStatus VARCHAR(30) NOT NULL DEFAULT 'Draft' AFTER approvedById;
  END IF;
END$$
DELIMITER ;
CALL _v46_dim_approval_status();
DROP PROCEDURE IF EXISTS _v46_dim_approval_status;

DROP PROCEDURE IF EXISTS _v46_dim_approval_notes;
DELIMITER $$
CREATE PROCEDURE _v46_dim_approval_notes()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'DimensionalInspection'
      AND COLUMN_NAME  = 'approvalNotes'
  ) THEN
    ALTER TABLE DimensionalInspection
      ADD COLUMN approvalNotes TEXT NULL AFTER approvalStatus;
  END IF;
END$$
DELIMITER ;
CALL _v46_dim_approval_notes();
DROP PROCEDURE IF EXISTS _v46_dim_approval_notes;

-- FK index for checkedById
DROP PROCEDURE IF EXISTS _v46_dim_idx_checked;
DELIMITER $$
CREATE PROCEDURE _v46_dim_idx_checked()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'DimensionalInspection'
      AND INDEX_NAME   = 'DimensionalInspection_checkedById_idx'
  ) THEN
    ALTER TABLE DimensionalInspection ADD INDEX DimensionalInspection_checkedById_idx (checkedById);
  END IF;
END$$
DELIMITER ;
CALL _v46_dim_idx_checked();
DROP PROCEDURE IF EXISTS _v46_dim_idx_checked;

-- FK index for approvedById
DROP PROCEDURE IF EXISTS _v46_dim_idx_approved;
DELIMITER $$
CREATE PROCEDURE _v46_dim_idx_approved()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'DimensionalInspection'
      AND INDEX_NAME   = 'DimensionalInspection_approvedById_idx'
  ) THEN
    ALTER TABLE DimensionalInspection ADD INDEX DimensionalInspection_approvedById_idx (approvedById);
  END IF;
END$$
DELIMITER ;
CALL _v46_dim_idx_approved();
DROP PROCEDURE IF EXISTS _v46_dim_idx_approved;
