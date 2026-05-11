-- Migration: v24_4_settings_pdf_font
-- Adds pdfFont column to system_settings for configurable PDF font family

DROP PROCEDURE IF EXISTS add_pdf_font_column;

DELIMITER $$
CREATE PROCEDURE add_pdf_font_column()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name   = 'system_settings'
      AND column_name  = 'pdfFont'
  ) THEN
    ALTER TABLE system_settings
      ADD COLUMN pdfFont VARCHAR(50) NOT NULL DEFAULT 'helvetica';
  END IF;
END$$
DELIMITER ;

CALL add_pdf_font_column();
DROP PROCEDURE IF EXISTS add_pdf_font_column;
