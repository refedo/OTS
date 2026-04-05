-- ============================================================
-- Pending migrations for v17.13.0 → v17.15.0
-- Run this file once on production to apply all pending changes.
-- Each ALTER uses IF NOT EXISTS / IF EXISTS where supported,
-- and CREATE TABLE uses IF NOT EXISTS so it is safe to re-run.
-- ============================================================

-- 1. Add updatedAt to task_messages (v17.13.0 — message editing)
ALTER TABLE task_messages
  ADD COLUMN IF NOT EXISTS updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3);

-- 2. Add lcr1 supplier name column to LcrEntry (v17.13.0 — LCR fix)
ALTER TABLE LcrEntry
  ADD COLUMN IF NOT EXISTS lcr1 VARCHAR(255) NULL AFTER ratio1to2Lcr1;

-- 3. Standalone conversations tables (v17.14.0)
CREATE TABLE IF NOT EXISTS conversations (
  id          CHAR(36)     NOT NULL,
  topic       VARCHAR(500) NOT NULL,
  createdById CHAR(36)     NOT NULL,
  createdAt   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  INDEX idx_conversations_createdById (createdById),
  FOREIGN KEY (createdById) REFERENCES User(id)
);

CREATE TABLE IF NOT EXISTS conversation_messages (
  id             CHAR(36)    NOT NULL,
  conversationId CHAR(36)    NOT NULL,
  userId         CHAR(36)    NOT NULL,
  content        LONGTEXT    NOT NULL,
  attachments    JSON        NULL,
  createdAt      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  INDEX idx_conv_messages_conversationId (conversationId),
  INDEX idx_conv_messages_createdAt (createdAt),
  FOREIGN KEY (conversationId) REFERENCES conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (userId) REFERENCES User(id)
);

CREATE TABLE IF NOT EXISTS conversation_participants (
  conversationId CHAR(36)    NOT NULL,
  userId         CHAR(36)    NOT NULL,
  invitedById    CHAR(36)    NULL,
  joinedAt       DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  lastReadAt     DATETIME(3) NULL,
  PRIMARY KEY (conversationId, userId),
  FOREIGN KEY (conversationId) REFERENCES conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (userId) REFERENCES User(id),
  FOREIGN KEY (invitedById) REFERENCES User(id)
);

-- 4. Add lastReadAt to task_conversation_participants (v17.15.0 — unread indicators)
ALTER TABLE task_conversation_participants
  ADD COLUMN IF NOT EXISTS lastReadAt DATETIME(3) NULL AFTER joinedAt;

-- Done.
