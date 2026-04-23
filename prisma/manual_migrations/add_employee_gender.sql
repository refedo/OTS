-- Add gender column to Employee table
-- Synced from Dolibarr gender field (man/woman → MALE/FEMALE)
ALTER TABLE Employee ADD COLUMN gender VARCHAR(10) NULL AFTER transferType;
