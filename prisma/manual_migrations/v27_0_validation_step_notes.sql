-- Add step-level notes and overall status to ProjectValidation
-- Each PREPARE / EXECUTE / DEALLOCATE is on its own line so the startup
-- migration runner sends them as three separate single-statement queries
-- (multipleStatements: false only executes the first statement in a string).

-- salesStepNotes
SET @col_ssn = (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND LOWER(table_name) = 'projectvalidation'
        AND column_name = 'salesStepNotes'
    ),
    'SELECT 1',
    (SELECT CONCAT('ALTER TABLE `', table_name, '` ADD COLUMN `salesStepNotes` JSON NULL AFTER `salesValidatedAt`')
     FROM information_schema.tables
     WHERE table_schema = DATABASE() AND LOWER(table_name) = 'projectvalidation' LIMIT 1)
  )
);
PREPARE s_ssn FROM @col_ssn;
EXECUTE s_ssn;
DEALLOCATE PREPARE s_ssn;

-- salesStatus
SET @col_ss = (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND LOWER(table_name) = 'projectvalidation'
        AND column_name = 'salesStatus'
    ),
    'SELECT 1',
    (SELECT CONCAT('ALTER TABLE `', table_name, '` ADD COLUMN `salesStatus` VARCHAR(30) NOT NULL DEFAULT ''pending'' AFTER `salesStepNotes`')
     FROM information_schema.tables
     WHERE table_schema = DATABASE() AND LOWER(table_name) = 'projectvalidation' LIMIT 1)
  )
);
PREPARE s_ss FROM @col_ss;
EXECUTE s_ss;
DEALLOCATE PREPARE s_ss;

-- projectsStepNotes
SET @col_psn = (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND LOWER(table_name) = 'projectvalidation'
        AND column_name = 'projectsStepNotes'
    ),
    'SELECT 1',
    (SELECT CONCAT('ALTER TABLE `', table_name, '` ADD COLUMN `projectsStepNotes` JSON NULL AFTER `projectsValidatedAt`')
     FROM information_schema.tables
     WHERE table_schema = DATABASE() AND LOWER(table_name) = 'projectvalidation' LIMIT 1)
  )
);
PREPARE s_psn FROM @col_psn;
EXECUTE s_psn;
DEALLOCATE PREPARE s_psn;

-- projectsStatus
SET @col_ps = (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND LOWER(table_name) = 'projectvalidation'
        AND column_name = 'projectsStatus'
    ),
    'SELECT 1',
    (SELECT CONCAT('ALTER TABLE `', table_name, '` ADD COLUMN `projectsStatus` VARCHAR(30) NOT NULL DEFAULT ''pending'' AFTER `projectsStepNotes`')
     FROM information_schema.tables
     WHERE table_schema = DATABASE() AND LOWER(table_name) = 'projectvalidation' LIMIT 1)
  )
);
PREPARE s_ps FROM @col_ps;
EXECUTE s_ps;
DEALLOCATE PREPARE s_ps;

-- operationsStepNotes
SET @col_osn = (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND LOWER(table_name) = 'projectvalidation'
        AND column_name = 'operationsStepNotes'
    ),
    'SELECT 1',
    (SELECT CONCAT('ALTER TABLE `', table_name, '` ADD COLUMN `operationsStepNotes` JSON NULL AFTER `operationsValidatedAt`')
     FROM information_schema.tables
     WHERE table_schema = DATABASE() AND LOWER(table_name) = 'projectvalidation' LIMIT 1)
  )
);
PREPARE s_osn FROM @col_osn;
EXECUTE s_osn;
DEALLOCATE PREPARE s_osn;

-- operationsStatus
SET @col_os = (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND LOWER(table_name) = 'projectvalidation'
        AND column_name = 'operationsStatus'
    ),
    'SELECT 1',
    (SELECT CONCAT('ALTER TABLE `', table_name, '` ADD COLUMN `operationsStatus` VARCHAR(30) NOT NULL DEFAULT ''pending'' AFTER `operationsStepNotes`')
     FROM information_schema.tables
     WHERE table_schema = DATABASE() AND LOWER(table_name) = 'projectvalidation' LIMIT 1)
  )
);
PREPARE s_os FROM @col_os;
EXECUTE s_os;
DEALLOCATE PREPARE s_os;
