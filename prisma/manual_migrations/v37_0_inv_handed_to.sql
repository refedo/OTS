-- Add handedToId to inv_mir_outs for "handed to / received by" tracking

-- Step 1: Ensure closed_at exists (may be absent on databases where the table
--         pre-dated v36_0 and the CREATE TABLE branch was skipped)
DROP PROCEDURE IF EXISTS _v37_closed_at;
DELIMITER $$
CREATE PROCEDURE _v37_closed_at()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'inv_mir_outs'
      AND COLUMN_NAME  = 'closedAt'
  ) THEN
    ALTER TABLE inv_mir_outs
      ADD COLUMN `closedAt` DATETIME(3) NULL AFTER `rejectionReason`;
  END IF;
END$$
DELIMITER ;
CALL _v37_closed_at();
DROP PROCEDURE IF EXISTS _v37_closed_at;

-- Step 2: Add handed_to_id after closed_at
DROP PROCEDURE IF EXISTS _v37_handed_to;
DELIMITER $$
CREATE PROCEDURE _v37_handed_to()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'inv_mir_outs'
      AND COLUMN_NAME  = 'handed_to_id'
  ) THEN
    ALTER TABLE inv_mir_outs
      ADD COLUMN `handed_to_id` CHAR(36) NULL AFTER `closedAt`;
  END IF;
END$$
DELIMITER ;
CALL _v37_handed_to();
DROP PROCEDURE IF EXISTS _v37_handed_to;

-- Step 3: Add index on handed_to_id
DROP PROCEDURE IF EXISTS _v37_idx_handed_to;
DELIMITER $$
CREATE PROCEDURE _v37_idx_handed_to()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'inv_mir_outs'
      AND INDEX_NAME   = 'inv_mir_outs_handed_to_id_idx'
  ) THEN
    ALTER TABLE inv_mir_outs
      ADD INDEX `inv_mir_outs_handed_to_id_idx` (`handed_to_id`);
  END IF;
END$$
DELIMITER ;
CALL _v37_idx_handed_to();
DROP PROCEDURE IF EXISTS _v37_idx_handed_to;
