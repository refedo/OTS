-- v23.2.0: Seed steel scopeOfWorkId for all unlinked AssemblyPart records
-- "Steel" is the default scope for all production log entries and PTS-synced parts.
-- This backfills any parts (including newly PTS-synced ones) that lack a scopeOfWorkId.

UPDATE AssemblyPart ap
JOIN ScopeOfWork sow
  ON sow.buildingId = ap.buildingId
  AND sow.scopeType = 'steel'
SET ap.scopeOfWorkId = sow.id
WHERE ap.scopeOfWorkId IS NULL
  AND ap.buildingId IS NOT NULL
  AND ap.deletedAt IS NULL;

-- Also cover project-level parts (buildingId IS NULL): link to ANY steel scope
-- in the same project as a best-effort default (rare scenario).
UPDATE AssemblyPart ap
JOIN (
  SELECT projectId, MIN(id) AS steelScopeId
  FROM ScopeOfWork
  WHERE scopeType = 'steel'
  GROUP BY projectId
) best ON best.projectId = ap.projectId
SET ap.scopeOfWorkId = best.steelScopeId
WHERE ap.scopeOfWorkId IS NULL
  AND ap.buildingId IS NULL
  AND ap.deletedAt IS NULL;
