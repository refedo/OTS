-- Migration: add_work_unit_types.sql
-- Adds DETAILING, COATING, DISPATCH, ERECTION to the WorkUnitType enum
-- so the full steel fabrication sequence can be modelled as distinct WorkUnits:
--   DOCUMENTATION → DESIGN → DETAILING → PROCUREMENT → PRODUCTION → COATING → DISPATCH → ERECTION
--
-- Idempotent: checks COLUMN_TYPE before executing ALTER TABLE.

DROP PROCEDURE IF EXISTS add_work_unit_types;
DELIMITER $$
CREATE PROCEDURE add_work_unit_types()
BEGIN
  -- ── work_units.type ────────────────────────────────────────────────────────
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'work_units'
      AND COLUMN_NAME  = 'type'
      AND COLUMN_TYPE LIKE '%DETAILING%'
  ) THEN
    ALTER TABLE work_units
      MODIFY COLUMN type
        ENUM('DESIGN','PROCUREMENT','PRODUCTION','QC','DOCUMENTATION',
             'DETAILING','COATING','DISPATCH','ERECTION')
        NOT NULL;
  END IF;

  -- ── dependency_blueprint_steps.fromType ────────────────────────────────────
  IF EXISTS (
    SELECT 1 FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'dependency_blueprint_steps'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME  = 'dependency_blueprint_steps'
        AND COLUMN_NAME = 'fromType'
        AND COLUMN_TYPE LIKE '%DETAILING%'
    ) THEN
      ALTER TABLE dependency_blueprint_steps
        MODIFY COLUMN fromType
          ENUM('DESIGN','PROCUREMENT','PRODUCTION','QC','DOCUMENTATION',
               'DETAILING','COATING','DISPATCH','ERECTION')
          NOT NULL;

      ALTER TABLE dependency_blueprint_steps
        MODIFY COLUMN toType
          ENUM('DESIGN','PROCUREMENT','PRODUCTION','QC','DOCUMENTATION',
               'DETAILING','COATING','DISPATCH','ERECTION')
          NOT NULL;
    END IF;
  END IF;
END$$
DELIMITER ;
CALL add_work_unit_types();
DROP PROCEDURE IF EXISTS add_work_unit_types;
