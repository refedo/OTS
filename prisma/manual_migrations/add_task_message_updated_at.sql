-- Add updatedAt column to task_messages for message editing support
ALTER TABLE task_messages
  ADD COLUMN updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3);
