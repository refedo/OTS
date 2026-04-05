-- ============================================================
-- Pending migrations for v17.13.0 → v17.15.0
-- Run this file once on production to apply all pending changes.
-- Uses MySQL-compatible syntax with stored procedures for
-- safe re-runs (checks information_schema before adding columns).
-- ============================================================

-- Helper procedure: add column only if it does not already exist
DROP PROCEDURE IF EXISTS add_column_if_not_exists;
DELIMITER $$
CREATE PROCEDURE add_column_if_not_exists(
  IN p_table VARCHAR(64),
  IN p_column VARCHAR(64),
  IN p_definition TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = p_table
      AND COLUMN_NAME  = p_column
  ) THEN
    SET @ddl = CONCAT('ALTER TABLE `', p_table, '` ADD COLUMN `', p_column, '` ', p_definition);
    PREPARE stmt FROM @ddl;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END$$
DELIMITER ;

-- 1. Add updatedAt to task_messages (v17.13.0 — message editing)
CALL add_column_if_not_exists(
  'task_messages',
  'updatedAt',
  'DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)'
);

-- 2. Add lcr1 supplier name column to LcrEntry (v17.13.0 — LCR fix)
CALL add_column_if_not_exists(
  'lcr_entries',
  'lcr1',
  'VARCHAR(255) NULL'
);

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
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

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
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

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
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 4. Add lastReadAt to task_conversation_participants (v17.15.0 — unread indicators)
CALL add_column_if_not_exists(
  'task_conversation_participants',
  'lastReadAt',
  'DATETIME(3) NULL'
);

-- Cleanup helper procedure
DROP PROCEDURE IF EXISTS add_column_if_not_exists;

-- Done.
