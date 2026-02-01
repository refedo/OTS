-- Fix Document Controller role permissions
-- This ensures they have task editing permissions and only financial restrictions

-- Step 1: Check current state
SELECT id, name, permissions, restrictedModules 
FROM Role 
WHERE name = 'Document Controller';

-- Step 2: Ensure Document Controller has task permissions
-- Update the permissions to include task management permissions
UPDATE Role 
SET permissions = JSON_ARRAY(
  'users.view',
  'roles.view',
  'projects.view',
  'projects.view_all',
  'buildings.view',
  'tasks.view',
  'tasks.view_all',
  'tasks.create',
  'tasks.edit',
  'tasks.assign',
  'documents.view',
  'documents.upload',
  'documents.edit',
  'documents.approve',
  'quality.view_itp',
  'quality.view_wps',
  'quality.view_rfi',
  'quality.create_rfi'
)
WHERE name = 'Document Controller';

-- Step 3: Set ONLY financial restrictions (not task_management)
UPDATE Role 
SET restrictedModules = JSON_ARRAY('financial_contracts', 'financial_reports')
WHERE name = 'Document Controller';

-- Step 4: Verify the changes
SELECT id, name, permissions, restrictedModules 
FROM Role 
WHERE name = 'Document Controller';
