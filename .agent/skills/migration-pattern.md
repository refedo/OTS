# Skill: MySQL Migration Pattern

Use this skill whenever writing or fixing a `prisma/manual_migrations/*.sql` file.

## Rules

- File naming: `vMAJOR_MINOR_description.sql` (e.g. `v36_1_material_master_enrichment.sql`)
- Every statement must be idempotent — migrations run automatically on every server start
- Never use `ADD COLUMN IF NOT EXISTS` or `CREATE INDEX IF NOT EXISTS` (MySQL incompatible)
- Use the conditional stored-procedure pattern for all DDL — see CLAUDE.md § "Database Rules"

## Column Addition Template

```sql
DROP PROCEDURE IF EXISTS _<prefix>_<column>;
DELIMITER $$
CREATE PROCEDURE _<prefix>_<column>()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = '<table>'
      AND COLUMN_NAME  = '<column>'
  ) THEN
    ALTER TABLE <table>
      ADD COLUMN <column> <TYPE> <constraints> AFTER <previous_column>;
  END IF;
END$$
DELIMITER ;
CALL _<prefix>_<column>();
DROP PROCEDURE IF EXISTS _<prefix>_<column>;
```

## Index Addition Template

```sql
DROP PROCEDURE IF EXISTS _<prefix>_idx_<name>;
DELIMITER $$
CREATE PROCEDURE _<prefix>_idx_<name>()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = '<table>'
      AND INDEX_NAME   = '<index_name>'
  ) THEN
    ALTER TABLE <table> ADD INDEX <index_name> (<column>);
  END IF;
END$$
DELIMITER ;
CALL _<prefix>_idx_<name>();
DROP PROCEDURE IF EXISTS _<prefix>_idx_<name>;
```

## Table Creation Template

```sql
DROP PROCEDURE IF EXISTS create_<table>;
DELIMITER $$
CREATE PROCEDURE create_<table>()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '<table>'
  ) THEN
    CREATE TABLE `<table>` (
      ...
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  END IF;
END$$
DELIMITER ;
CALL create_<table>();
DROP PROCEDURE IF EXISTS create_<table>;
```

## Checklist Before Committing a Migration

- [ ] No `ADD COLUMN IF NOT EXISTS` anywhere in the file
- [ ] No `CREATE INDEX IF NOT EXISTS` anywhere in the file
- [ ] Every procedure is DROPPED after CALL
- [ ] Column order (AFTER clause) matches the intended schema
- [ ] ENUMs use single-quoted values
- [ ] Indexes are added after all columns are added
