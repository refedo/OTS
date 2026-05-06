-- ============================================================
-- v22.14.0 — Backfill steel scope quantities from building weight
-- For existing Steel ScopeOfWork records with no quantity set,
-- populate quantity from Building.weight and set unit = 'ton'.
-- Safe to run multiple times (WHERE quantity IS NULL guard).
-- ============================================================

UPDATE ScopeOfWork sow
JOIN Building b ON sow.buildingId = b.id
SET
  sow.quantity = b.weight,
  sow.unit     = 'ton'
WHERE
  sow.scopeType  = 'steel'
  AND sow.quantity IS NULL
  AND b.weight IS NOT NULL
  AND b.deletedAt IS NULL;
