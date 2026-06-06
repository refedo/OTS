-- ============================================================
-- v45.1 — Un-private tasks owned by inactive/deactivated users
--
-- When a user self-assigns a task the system auto-sets isPrivate=true.
-- If that user's account is later deactivated, their private tasks become
-- invisible to everyone (including admins), effectively orphaning them.
--
-- This migration makes those tasks visible again by clearing isPrivate
-- for any task where BOTH the creator and the assignee are inactive users.
-- Personal tasks where at least one active participant remains are left alone.
-- ============================================================

UPDATE Task t
JOIN User creator  ON creator.id  = t.createdById
LEFT JOIN User assignee ON assignee.id = t.assignedToId
SET t.isPrivate = 0
WHERE t.isPrivate     = 1
  AND t.deletedAt     IS NULL
  AND creator.status  = 'inactive'
  AND (t.assignedToId IS NULL OR assignee.status = 'inactive');
