-- Check Walaa's current permissions
SELECT 
  u.id,
  u.name,
  u.email,
  u.isAdmin,
  r.name as roleName,
  r.permissions
FROM User u
JOIN Role r ON u.roleId = r.id
WHERE u.email = 'walaa.ali@hexametals.com';

-- Check if Projects Coordinator role has the required permissions
SELECT 
  id,
  name,
  JSON_CONTAINS(permissions, '"projects.create"') as has_projects_create,
  JSON_CONTAINS(permissions, '"projects.edit"') as has_projects_edit,
  JSON_CONTAINS(permissions, '"projects.view"') as has_projects_view,
  JSON_CONTAINS(permissions, '"quality.create_itp"') as has_quality_create_itp,
  JSON_CONTAINS(permissions, '"quality.edit_itp"') as has_quality_edit_itp
FROM Role
WHERE name = 'Projects Coordinator';

-- If permissions are missing, this query will show what needs to be added
-- (Run this manually after checking the above results)
