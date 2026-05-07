-- v23.0.1: Unify activity names — rename 'dispatch' → 'delivery' across BuildingActivity
-- and 'delivery_logistics' → 'delivery' in Task.mainActivity

-- Rename dispatch → delivery in BuildingActivity.activityType
UPDATE BuildingActivity
SET activityType = 'delivery'
WHERE activityType = 'dispatch';

-- Rename delivery_logistics → delivery in Task.mainActivity
UPDATE Task
SET mainActivity = 'delivery'
WHERE mainActivity = 'delivery_logistics';

-- Also update any activityLabel references in BuildingActivity
UPDATE BuildingActivity
SET activityLabel = 'Delivery'
WHERE activityType = 'delivery' AND (activityLabel = 'Dispatch' OR activityLabel = 'Dispatch & Delivery');
