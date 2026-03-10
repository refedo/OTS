-- Check recent system events
SELECT 
  e.id,
  e.eventType,
  e.category,
  e.entityType,
  e.entityId,
  e.description,
  u.name as userName,
  e.createdAt
FROM SystemEvent e
LEFT JOIN User u ON e.userId = u.id
ORDER BY e.createdAt DESC
LIMIT 50;

-- Check events by entity type
SELECT 
  entityType,
  COUNT(*) as count,
  MAX(createdAt) as lastEvent
FROM SystemEvent
GROUP BY entityType
ORDER BY count DESC;

-- Check if any Project or Building events exist
SELECT 
  COUNT(*) as projectEvents
FROM SystemEvent
WHERE entityType = 'Project';

SELECT 
  COUNT(*) as buildingEvents
FROM SystemEvent
WHERE entityType = 'Building';
