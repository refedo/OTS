-- Add CEO role to the database if it doesn't exist
INSERT INTO Role (id, name, description, createdAt, updatedAt)
SELECT 
  UUID(),
  'CEO',
  'Chief Executive Officer - Superadmin with all system privileges',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM Role WHERE name = 'CEO');
