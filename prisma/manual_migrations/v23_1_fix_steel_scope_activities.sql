-- v23.1.0: Fix steel scope BuildingActivity records
-- 1. All activities on a steel ScopeOfWork should be isApplicable = true.
--    Previously some were saved as false due to a tracker default bug.
-- 2. Insert the 7 standard tracker activity records for any steel scope that
--    has a ScopeOfWork but is missing one or more BuildingActivity rows.

-- Step 1: Ensure all existing steel-scope activities are marked applicable
UPDATE BuildingActivity ba
JOIN ScopeOfWork sow ON sow.id = ba.scopeOfWorkId
SET ba.isApplicable = 1
WHERE sow.scopeType = 'steel'
  AND ba.isApplicable = 0;

-- Step 2: Insert missing activity rows for steel scopes
-- Using a temporary reference table for the 7 standard types
CREATE TEMPORARY TABLE _steel_activity_defs (
  activityType VARCHAR(50) NOT NULL,
  activityLabel VARCHAR(100) NOT NULL,
  sortOrder INT NOT NULL
);

INSERT INTO _steel_activity_defs VALUES
  ('design',       'Design',       1),
  ('detailing',    'Detailing',    2),
  ('procurement',  'Procurement',  3),
  ('production',   'Production',   4),
  ('coating',      'Coating',      5),
  ('delivery',     'Delivery',     6),
  ('erection',     'Erection',     7);

INSERT INTO BuildingActivity (id, projectId, buildingId, scopeOfWorkId, activityType, activityLabel, isApplicable, sortOrder, createdAt, updatedAt)
SELECT
  UUID(),
  sow.projectId,
  sow.buildingId,
  sow.id,
  def.activityType,
  def.activityLabel,
  1,
  def.sortOrder,
  NOW(3),
  NOW(3)
FROM ScopeOfWork sow
CROSS JOIN _steel_activity_defs def
LEFT JOIN BuildingActivity ba
  ON ba.scopeOfWorkId = sow.id AND ba.activityType = def.activityType
WHERE sow.scopeType = 'steel'
  AND ba.id IS NULL;

DROP TEMPORARY TABLE _steel_activity_defs;
