-- Check Walaa's permissions
SELECT 
  u.name,
  u.email,
  u.isAdmin,
  r.name as roleName,
  JSON_CONTAINS(r.permissions, '"projects.create"') as has_create,
  JSON_CONTAINS(r.permissions, '"projects.edit"') as has_edit,
  JSON_LENGTH(r.permissions) as total_permissions
FROM User u
JOIN Role r ON u.roleId = r.id
WHERE u.email = 'walaa.ali@hexametals.com';

-- Check what permissions the role actually has
SELECT 
  name,
  permissions
FROM Role
WHERE name = 'Projects Coordinator';

-- Check system events count
SELECT 
  COUNT(*) as total_events,
  COUNT(CASE WHEN entityType = 'Project' THEN 1 END) as project_events,
  COUNT(CASE WHEN entityType = 'Building' THEN 1 END) as building_events
FROM SystemEvent;
