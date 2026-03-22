-- Supply Chain Module — Permission Seeds
-- Add supply_chain permissions to relevant roles
-- 
-- Permissions to add:
--   supply_chain.view  → CEO, Admin, Manager, procurement_manager, procurement_viewer
--   supply_chain.sync  → Admin, procurement_manager
--   supply_chain.alias → Admin
--
-- Since permissions are stored as JSON arrays on the Role model,
-- use the following queries to add them:

-- Add supply_chain.view to CEO role
UPDATE Role
SET permissions = JSON_ARRAY_APPEND(
  COALESCE(permissions, JSON_ARRAY()),
  '$', 'supply_chain.view'
)
WHERE name = 'CEO'
  AND (permissions IS NULL OR NOT JSON_CONTAINS(permissions, '"supply_chain.view"'));

-- Add supply_chain.view + supply_chain.sync + supply_chain.alias to Admin role
UPDATE Role
SET permissions = JSON_ARRAY_APPEND(
  JSON_ARRAY_APPEND(
    JSON_ARRAY_APPEND(
      COALESCE(permissions, JSON_ARRAY()),
      '$', 'supply_chain.view'
    ),
    '$', 'supply_chain.sync'
  ),
  '$', 'supply_chain.alias'
)
WHERE name = 'Admin'
  AND (permissions IS NULL OR NOT JSON_CONTAINS(permissions, '"supply_chain.view"'));

-- Add supply_chain.view to Manager role
UPDATE Role
SET permissions = JSON_ARRAY_APPEND(
  COALESCE(permissions, JSON_ARRAY()),
  '$', 'supply_chain.view'
)
WHERE name = 'Manager'
  AND (permissions IS NULL OR NOT JSON_CONTAINS(permissions, '"supply_chain.view"'));

-- Add supply_chain.view + supply_chain.sync to procurement_manager (if exists)
UPDATE Role
SET permissions = JSON_ARRAY_APPEND(
  JSON_ARRAY_APPEND(
    COALESCE(permissions, JSON_ARRAY()),
    '$', 'supply_chain.view'
  ),
  '$', 'supply_chain.sync'
)
WHERE name = 'procurement_manager'
  AND (permissions IS NULL OR NOT JSON_CONTAINS(permissions, '"supply_chain.view"'));

-- Add supply_chain.view to procurement_viewer (if exists)
UPDATE Role
SET permissions = JSON_ARRAY_APPEND(
  COALESCE(permissions, JSON_ARRAY()),
  '$', 'supply_chain.view'
)
WHERE name = 'procurement_viewer'
  AND (permissions IS NULL OR NOT JSON_CONTAINS(permissions, '"supply_chain.view"'));
