-- Add lcr1 (supplier name) field to LcrEntry table
-- This completes the LCR1 section which previously had lcr1Amount and lcr1PricePerTon
-- but was missing the supplier name string (it was incorrectly stored in lcr2 column)
ALTER TABLE LcrEntry
  ADD COLUMN lcr1 VARCHAR(255) NULL AFTER ratio1to2Lcr1;
