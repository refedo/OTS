-- v33.0 — MIR Backfill: dolibarr_soc_id + workflow_status
-- Part A: Backfill dolibarr_soc_id for old MIRs that have a supplier_name but no soc_id
--         (dolibarr_soc_id was added in v32.0, so MIRs created before that have NULL)
-- Part B: Backfill workflow_status = 'Inspected' for MIRs that are fully received & accepted
--         but still show 'Draft' because they predate the auto-advance logic

-- ── Part A: Backfill dolibarr_soc_id ────────────────────────────────────────

DROP PROCEDURE IF EXISTS mir_backfill_soc_id;
DELIMITER $$
CREATE PROCEDURE mir_backfill_soc_id()
BEGIN
  UPDATE material_inspection_receipts mir
  SET mir.dolibarr_soc_id = (
    SELECT dt.dolibarr_id
    FROM dolibarr_thirdparties dt
    WHERE dt.name = mir.supplier_name
    LIMIT 1
  )
  WHERE mir.dolibarr_soc_id IS NULL
    AND mir.supplier_name IS NOT NULL;
END$$
DELIMITER ;
CALL mir_backfill_soc_id();
DROP PROCEDURE IF EXISTS mir_backfill_soc_id;

-- ── Part B: Backfill workflow_status for completed MIRs ─────────────────────

DROP PROCEDURE IF EXISTS mir_backfill_workflow_status;
DELIMITER $$
CREATE PROCEDURE mir_backfill_workflow_status()
BEGIN
  -- Mark as Inspected: fully received & accepted but still sitting at Draft
  UPDATE material_inspection_receipts
  SET workflow_status = 'Inspected',
      submitted_at    = COALESCE(submitted_at, updated_at, NOW())
  WHERE workflow_status = 'Draft'
    AND status IN ('Received and Accepted', 'Partially Accepted', 'Rejected');
END$$
DELIMITER ;
CALL mir_backfill_workflow_status();
DROP PROCEDURE IF EXISTS mir_backfill_workflow_status;
