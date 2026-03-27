-- Migration: system_event_summaries table + performance indexes
-- Part 6: Retention & Performance for System Events Framework

-- Daily aggregate table for archived events
CREATE TABLE IF NOT EXISTS `system_event_summaries` (
  `id`             INT            NOT NULL AUTO_INCREMENT,
  `summary_date`   DATE           NOT NULL,
  `event_category` VARCHAR(30)    NULL,
  `event_type`     VARCHAR(60)    NULL,
  `severity`       VARCHAR(20)    NOT NULL,
  `count`          INT            NOT NULL DEFAULT 0,
  `created_at`     DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`     DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `system_event_summaries_date_cat_type_sev` (`summary_date`, `event_category`, `event_type`, `severity`),
  KEY `system_event_summaries_summary_date_idx` (`summary_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Composite index on (event_category, created_at) for efficient retention queries
-- (category + time range scans used by cleanup cron)
ALTER TABLE `system_events`
  ADD INDEX IF NOT EXISTS `system_events_cat_created_idx` (`event_category`, `created_at`);

-- Composite index on (severity, created_at) for dashboard error-rate queries
ALTER TABLE `system_events`
  ADD INDEX IF NOT EXISTS `system_events_sev_created_idx` (`severity`, `created_at`);
