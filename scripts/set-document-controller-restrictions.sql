-- Set financial module restrictions for Document Controller role
-- Run this SQL query in your database to restrict financial access

UPDATE Role 
SET restrictedModules = '["financial_contracts", "financial_reports"]'
WHERE name = 'Document Controller';

-- Verify the update
SELECT id, name, restrictedModules 
FROM Role 
WHERE name = 'Document Controller';
