-- Create standalone Conversation module tables
-- These are separate from the task-linked conversation system (TaskMessage, TaskConversationParticipant)

CREATE TABLE conversations (
  id          CHAR(36)     NOT NULL,
  topic       VARCHAR(500) NOT NULL,
  createdById CHAR(36)     NOT NULL,
  createdAt   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  INDEX idx_conversations_createdById (createdById),
  FOREIGN KEY (createdById) REFERENCES User(id)
);

CREATE TABLE conversation_messages (
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

CREATE TABLE conversation_participants (
  conversationId CHAR(36)    NOT NULL,
  userId         CHAR(36)    NOT NULL,
  invitedById    CHAR(36)    NULL,
  joinedAt       DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (conversationId, userId),
  FOREIGN KEY (conversationId) REFERENCES conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (userId) REFERENCES User(id),
  FOREIGN KEY (invitedById) REFERENCES User(id)
);
