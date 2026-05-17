-- Backfill MaterialInspectionReceipt status based on item inspection results
-- Logic mirrors computeReceiptStatus() in items/route.ts

UPDATE material_inspection_receipts r
SET status = (
  SELECT
    CASE
      WHEN COUNT(*) = 0 THEN 'In Progress'
      WHEN SUM(CASE WHEN i.inspectionResult = 'Accepted' THEN 1 ELSE 0 END) = COUNT(*)
        AND SUM(CASE WHEN i.receivedQty >= i.orderedQty THEN 1 ELSE 0 END) = COUNT(*)
        THEN 'Received and Accepted'
      WHEN SUM(CASE WHEN i.inspectionResult = 'Rejected' THEN 1 ELSE 0 END) = COUNT(*)
        AND SUM(CASE WHEN i.receivedQty > 0 THEN 1 ELSE 0 END) > 0
        THEN 'Rejected'
      WHEN SUM(CASE WHEN i.inspectionResult != 'Pending' THEN 1 ELSE 0 END) > 0
        THEN 'Partially Accepted'
      WHEN SUM(CASE WHEN i.receivedQty > 0 THEN 1 ELSE 0 END) > 0
        THEN 'Partially Received'
      ELSE 'In Progress'
    END
  FROM material_inspection_receipt_items i
  WHERE i.receiptId = r.id
)
WHERE r.deletedAt IS NULL OR r.deletedAt IS NOT NULL;
