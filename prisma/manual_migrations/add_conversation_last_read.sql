-- Add lastReadAt to track unread status per participant

ALTER TABLE task_conversation_participants
  ADD COLUMN lastReadAt DATETIME(3) NULL AFTER joinedAt;

ALTER TABLE conversation_participants
  ADD COLUMN lastReadAt DATETIME(3) NULL AFTER joinedAt;
