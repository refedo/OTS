-- Migration: Seed default "Steel" scope of work for existing buildings
-- Date: 2026-04-03
-- Description: Backfills a ScopeOfWork record with scopeType='steel' for every
--              building that doesn't already have one.

INSERT INTO ScopeOfWork (id, projectId, buildingId, scopeType, scopeLabel, createdAt, updatedAt)
SELECT UUID(), b.projectId, b.id, 'steel', 'Steel', NOW(3), NOW(3)
FROM Building b
LEFT JOIN ScopeOfWork s ON s.buildingId = b.id AND s.scopeType = 'steel'
WHERE s.id IS NULL AND b.deletedAt IS NULL;
