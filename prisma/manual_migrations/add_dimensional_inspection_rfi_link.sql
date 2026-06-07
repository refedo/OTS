-- Add rfiRequestId to DimensionalInspection for grouping batch inspection reports

DROP PROCEDURE IF EXISTS _mm_dim_rfi_id;
DELIMITER $$
CREATE PROCEDURE _mm_dim_rfi_id()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'DimensionalInspection'
      AND COLUMN_NAME  = 'rfiRequestId'
  ) THEN
    ALTER TABLE DimensionalInspection
      ADD COLUMN rfiRequestId CHAR(36) NULL AFTER productionLogId,
      ADD CONSTRAINT fk_dim_rfi FOREIGN KEY (rfiRequestId) REFERENCES RFIRequest(id) ON DELETE SET NULL;
  END IF;
END$$
DELIMITER ;
CALL _mm_dim_rfi_id();
DROP PROCEDURE IF EXISTS _mm_dim_rfi_id;

DROP PROCEDURE IF EXISTS _mm_dim_rfi_idx;
DELIMITER $$
CREATE PROCEDURE _mm_dim_rfi_idx()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'DimensionalInspection'
      AND INDEX_NAME   = 'DimensionalInspection_rfiRequestId_idx'
  ) THEN
    ALTER TABLE DimensionalInspection ADD INDEX DimensionalInspection_rfiRequestId_idx (rfiRequestId);
  END IF;
END$$
DELIMITER ;
CALL _mm_dim_rfi_idx();
DROP PROCEDURE IF EXISTS _mm_dim_rfi_idx;
