-- Ops Agent AI config migration (19.0.0)
-- Adds aiProvider, aiModel, aiApiKey columns to ops_agent_config
-- Idempotent: uses stored-procedure pattern with information_schema guards
-- NOTE: END and $$ are on separate lines so the startup migration parser detects the boundary

DROP PROCEDURE IF EXISTS add_ops_agent_ai_config;
DELIMITER $$
CREATE PROCEDURE add_ops_agent_ai_config()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'ops_agent_config'
      AND COLUMN_NAME = 'aiProvider'
  ) THEN
    ALTER TABLE ops_agent_config ADD COLUMN aiProvider VARCHAR(50) NOT NULL DEFAULT 'anthropic';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'ops_agent_config'
      AND COLUMN_NAME = 'aiModel'
  ) THEN
    ALTER TABLE ops_agent_config ADD COLUMN aiModel VARCHAR(100) NOT NULL DEFAULT 'claude-sonnet-4-6';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'ops_agent_config'
      AND COLUMN_NAME = 'aiApiKey'
  ) THEN
    ALTER TABLE ops_agent_config ADD COLUMN aiApiKey TEXT NULL;
  END IF;
END
$$
DELIMITER ;
CALL add_ops_agent_ai_config();
DROP PROCEDURE IF EXISTS add_ops_agent_ai_config;
