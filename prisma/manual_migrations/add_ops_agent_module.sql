-- Ops Agent Module migration (19.0.0)
-- Creates ops_agent_config, ops_agent_runs, and ops_risk_flags tables
-- Uses CREATE TABLE IF NOT EXISTS for idempotency (no stored procedure needed)

CREATE TABLE IF NOT EXISTS ops_agent_config (
  id              CHAR(36)     NOT NULL,
  mode            ENUM('READ_ONLY','ANNOTATE','FULL_ACTOR') NOT NULL DEFAULT 'READ_ONLY',
  enabledModules  JSON         NOT NULL,
  thresholds      JSON         NOT NULL,
  cronSchedule    VARCHAR(100) NOT NULL DEFAULT '0 7 * * 0-4',
  notifyWhatsApp  TINYINT(1)   NOT NULL DEFAULT 1,
  notifyPush      TINYINT(1)   NOT NULL DEFAULT 1,
  aiProvider      VARCHAR(50)  NOT NULL DEFAULT 'anthropic',
  aiModel         VARCHAR(100) NOT NULL DEFAULT 'claude-sonnet-4-6',
  aiApiKey        TEXT         NULL,
  aiBaseUrl       TEXT         NULL,
  updatedAt       DATETIME(3)  NOT NULL,
  updatedBy       VARCHAR(36)  NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ops_agent_runs (
  id              CHAR(36)     NOT NULL,
  triggeredBy     VARCHAR(100) NOT NULL,
  triggerType     VARCHAR(50)  NOT NULL,
  mode            ENUM('READ_ONLY','ANNOTATE','FULL_ACTOR') NOT NULL,
  status          ENUM('RUNNING','COMPLETED','FAILED') NOT NULL DEFAULT 'RUNNING',
  brief           JSON         NULL,
  actionsExecuted JSON         NULL,
  errorMessage    TEXT         NULL,
  sessionId       VARCHAR(200) NULL,
  inputTokens     INT          NULL,
  outputTokens    INT          NULL,
  durationMs      INT          NULL,
  createdAt       DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt       DATETIME(3)  NOT NULL,
  PRIMARY KEY (id),
  INDEX idx_ops_runs_status (status),
  INDEX idx_ops_runs_created (createdAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ops_risk_flags (
  id          CHAR(36)     NOT NULL,
  runId       CHAR(36)     NOT NULL,
  entityType  VARCHAR(50)  NOT NULL,
  entityId    VARCHAR(100) NOT NULL,
  entityLabel VARCHAR(300) NOT NULL,
  severity    ENUM('RED','AMBER','GREEN') NOT NULL,
  agentNote   TEXT         NOT NULL,
  module      VARCHAR(50)  NOT NULL,
  resolvedAt  DATETIME(3)  NULL,
  resolvedBy  VARCHAR(36)  NULL,
  createdAt   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  INDEX idx_ops_flags_runId (runId),
  INDEX idx_ops_flags_severity (severity),
  INDEX idx_ops_flags_module (module),
  CONSTRAINT fk_ops_flags_run FOREIGN KEY (runId) REFERENCES ops_agent_runs(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed default config row if none exists
INSERT INTO ops_agent_config (id, mode, enabledModules, thresholds, cronSchedule, notifyWhatsApp, notifyPush, updatedAt)
SELECT UUID(), 'READ_ONLY', '{"tasks":true,"projects":true,"hr":true,"pipeline":true}', '{"taskStaleDays":3,"projectStaleDays":7,"otApprovalHours":24}', '0 7 * * 0-4', 1, 1, NOW()
FROM dual
WHERE NOT EXISTS (SELECT 1 FROM ops_agent_config LIMIT 1);
