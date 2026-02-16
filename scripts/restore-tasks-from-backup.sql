-- =====================================================
-- TASK RESTORATION SCRIPT
-- Restores tasks and task audit logs from backup
-- =====================================================

-- Step 1: Create temporary backup table
CREATE TABLE IF NOT EXISTS tasks_backup LIKE tasks;
CREATE TABLE IF NOT EXISTS task_audit_log_backup LIKE task_audit_log;

-- Step 2: Check current task count (should show 0 or very few)
SELECT COUNT(*) as current_task_count FROM tasks;

-- Step 3: After importing backup, restore tasks
-- This will be done after you import the backup database
-- The commands below assume you've imported to a separate database called 'ots_db_backup'

-- Step 4: Restore tasks from backup database
INSERT INTO tasks 
SELECT * FROM ots_db_backup.tasks
WHERE id NOT IN (SELECT id FROM tasks);

-- Step 5: Restore task audit logs
INSERT INTO task_audit_log
SELECT * FROM ots_db_backup.task_audit_log
WHERE id NOT IN (SELECT id FROM task_audit_log);

-- Step 6: Verify restoration
SELECT 
    COUNT(*) as total_tasks,
    COUNT(CASE WHEN status = 'Pending' THEN 1 END) as pending_tasks,
    COUNT(CASE WHEN status = 'In Progress' THEN 1 END) as in_progress_tasks,
    COUNT(CASE WHEN status = 'Completed' THEN 1 END) as completed_tasks
FROM tasks;

-- Step 7: Check latest tasks
SELECT id, title, status, createdAt, updatedAt 
FROM tasks 
ORDER BY createdAt DESC 
LIMIT 10;
