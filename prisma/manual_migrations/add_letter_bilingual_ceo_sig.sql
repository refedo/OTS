-- 19.15.1 — Add contentEn to HrLetter (bilingual translation storage)
--           Add ceoSignatureUrl to system_settings (CEO signature image)
--           Widen letterNumber to VARCHAR(100) to support longer serial masks
-- Uses information_schema checks to avoid duplicate-column errors (1060).

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'HrLetter' AND COLUMN_NAME = 'contentEn');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE HrLetter ADD COLUMN contentEn TEXT NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

ALTER TABLE HrLetter MODIFY COLUMN letterNumber VARCHAR(100) NOT NULL;

SET @col_exists2 = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'system_settings' AND COLUMN_NAME = 'ceoSignatureUrl');
SET @sql2 = IF(@col_exists2 = 0, 'ALTER TABLE system_settings ADD COLUMN ceoSignatureUrl VARCHAR(1000) NULL', 'SELECT 1');
PREPARE stmt2 FROM @sql2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;
