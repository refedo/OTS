-- Add purpose column to HrLetter table
-- Used for salary certificates and other letters to indicate the target (e.g. "embassy", "bank")
ALTER TABLE HrLetter ADD COLUMN purpose VARCHAR(500) NULL AFTER contentEn;
