-- ============================================================
-- v22.13.0 — Per-building scope detail fields
-- Adds location to Building; adds quantity, spec, and coating
-- fields to ScopeOfWork to support multi-scope projects.
-- Safe for re-runs via conditional stored procedure pattern.
-- ============================================================

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

-- ── Building ────────────────────────────────────────────────
CALL add_column_if_not_exists(
  'Building',
  'location',
  'VARCHAR(500) NULL'
);

-- ── ScopeOfWork — quantity & unit ───────────────────────────
CALL add_column_if_not_exists(
  'ScopeOfWork',
  'quantity',
  'DECIMAL(10,2) NULL'
);

CALL add_column_if_not_exists(
  'ScopeOfWork',
  'unit',
  'VARCHAR(20) NULL'
);

-- ── ScopeOfWork — sandwich panel (roof/wall sheeting) ───────
CALL add_column_if_not_exists(
  'ScopeOfWork',
  'ralColor',
  'VARCHAR(20) NULL'
);

CALL add_column_if_not_exists(
  'ScopeOfWork',
  'panelThickness',
  'INT NULL'
);

CALL add_column_if_not_exists(
  'ScopeOfWork',
  'ribHeight',
  'INT NULL'
);

CALL add_column_if_not_exists(
  'ScopeOfWork',
  'upperSheetThick',
  'DECIMAL(5,2) NULL'
);

CALL add_column_if_not_exists(
  'ScopeOfWork',
  'lowerSheetThick',
  'DECIMAL(5,2) NULL'
);

CALL add_column_if_not_exists(
  'ScopeOfWork',
  'panelProfile',
  'VARCHAR(20) NULL'
);

-- ── ScopeOfWork — deck panel ────────────────────────────────
CALL add_column_if_not_exists(
  'ScopeOfWork',
  'deckProfile',
  'VARCHAR(100) NULL'
);

CALL add_column_if_not_exists(
  'ScopeOfWork',
  'hasShearStuds',
  'TINYINT(1) NOT NULL DEFAULT 0'
);

CALL add_column_if_not_exists(
  'ScopeOfWork',
  'shearStudQty',
  'INT NULL'
);

CALL add_column_if_not_exists(
  'ScopeOfWork',
  'shearStudSpecs',
  'VARCHAR(255) NULL'
);

-- ── ScopeOfWork — metal works custom items ──────────────────
CALL add_column_if_not_exists(
  'ScopeOfWork',
  'metalWorkItems',
  'JSON NULL'
);

-- ── ScopeOfWork — per-scope coating override ────────────────
CALL add_column_if_not_exists(
  'ScopeOfWork',
  'coatingSameAsProject',
  'TINYINT(1) NOT NULL DEFAULT 1'
);

CALL add_column_if_not_exists(
  'ScopeOfWork',
  'scopeCoatingSystem',
  'JSON NULL'
);

DROP PROCEDURE IF EXISTS add_column_if_not_exists;
