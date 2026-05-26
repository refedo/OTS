-- Add handedToId to inv_mir_outs for "handed to / received by" tracking
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
      ADD COLUMN handed_to_id CHAR(36) NULL AFTER closed_at;
  END IF;
END$$
DELIMITER ;
CALL _v37_handed_to();
DROP PROCEDURE IF EXISTS _v37_handed_to;
