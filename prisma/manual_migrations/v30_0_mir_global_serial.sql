-- Renumber all MIRs to use a global serial (not monthly reset)
-- Format stays MIR-YYMM-NNNN, but NNNN is now a global sequence ordered by creation date

-- Step 1: Temporarily clear receipt_number to avoid unique constraint conflicts
UPDATE material_inspection_receipts
SET receipt_number = CONCAT('TEMP-', id);

-- Step 2: Assign new sequential numbers ordered by creation date
-- YYMM comes from each record's own created_at date
SET @seq = 0;
UPDATE material_inspection_receipts r
JOIN (
  SELECT id,
    (@seq := @seq + 1) AS seq_num,
    DATE_FORMAT(created_at, '%y%m') AS yymm
  FROM material_inspection_receipts
  ORDER BY created_at ASC
) AS ordered ON r.id = ordered.id
SET r.receipt_number = CONCAT('MIR-', ordered.yymm, '-', LPAD(ordered.seq_num, 4, '0'));
