-- Add lcrColumnMapping JSON field to SystemSettings
-- Stores LCR spreadsheet column index mapping so admins can update it without code changes

ALTER TABLE SystemSettings
  ADD COLUMN IF NOT EXISTS lcrColumnMapping JSON NULL;
