-- 19.15.1 — Add contentEn to HrLetter (bilingual translation storage)
--           Add ceoSignatureUrl to SystemSettings (CEO signature image)

DROP PROCEDURE IF EXISTS add_letter_bilingual_ceo_sig;
DELIMITER $$
CREATE PROCEDURE add_letter_bilingual_ceo_sig()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'HrLetter'
      AND COLUMN_NAME = 'contentEn'
  ) THEN
    ALTER TABLE HrLetter ADD COLUMN contentEn TEXT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'SystemSettings'
      AND COLUMN_NAME = 'ceoSignatureUrl'
  ) THEN
    ALTER TABLE SystemSettings ADD COLUMN ceoSignatureUrl VARCHAR(1000) NULL;
  END IF;
END$$
DELIMITER ;
CALL add_letter_bilingual_ceo_sig();
DROP PROCEDURE IF EXISTS add_letter_bilingual_ceo_sig;
