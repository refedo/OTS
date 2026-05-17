-- Backfill MaterialInspectionReceipt status based on item inspection results
-- Logic mirrors computeReceiptStatus() in items/route.ts

UPDATE material_inspection_receipts r
SET status = (
  SELECT
    CASE
      WHEN COUNT(*) = 0 THEN 'In Progress'
      WHEN SUM(CASE WHEN i.inspection_result = 'Accepted' THEN 1 ELSE 0 END) = COUNT(*)
        AND SUM(CASE WHEN i.received_qty >= i.ordered_qty THEN 1 ELSE 0 END) = COUNT(*)
        THEN 'Received and Accepted'
      WHEN SUM(CASE WHEN i.inspection_result = 'Rejected' THEN 1 ELSE 0 END) = COUNT(*)
        AND SUM(CASE WHEN i.received_qty > 0 THEN 1 ELSE 0 END) > 0
        THEN 'Rejected'
      WHEN SUM(CASE WHEN i.inspection_result != 'Pending' THEN 1 ELSE 0 END) > 0
        THEN 'Partially Accepted'
      WHEN SUM(CASE WHEN i.received_qty > 0 THEN 1 ELSE 0 END) > 0
        THEN 'Partially Received'
      ELSE 'In Progress'
    END
  FROM material_inspection_receipt_items i
  WHERE i.receipt_id = r.id
)
;
