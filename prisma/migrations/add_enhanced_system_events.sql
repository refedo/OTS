-- Enhanced System Events Migration
-- Adds additional fields for enterprise-grade event tracking

-- Add severity index for filtering
ALTER TABLE system_events ADD INDEX idx_severity (severity);

-- Add correlation_id column for grouping related events
-- This is stored in metadata JSON, but we can query it via JSON path
-- No schema change needed as metadata already supports this

-- Note: The existing schema already supports all required fields via the metadata JSON column:
-- - userName, userRole, ipAddress, userAgent (stored in metadata)
-- - entityName, projectNumber, buildingId (stored in metadata)
-- - changedFields, duration, correlationId, parentEventId, sessionId (stored in metadata)

-- The SystemEvent model is already sufficient for enterprise-grade event tracking.
-- This migration just adds an index for severity-based filtering.
