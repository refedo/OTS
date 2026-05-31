-- v41_0: Add inv_sites table for factory/site management
-- Sites are the canonical source for siteId/siteName used across warehouses and locations.

DROP PROCEDURE IF EXISTS _v41_inv_sites_tbl;
DELIMITER $$
CREATE PROCEDURE _v41_inv_sites_tbl()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'inv_sites'
  ) THEN
    CREATE TABLE inv_sites (
      id            CHAR(36)      NOT NULL,
      code          VARCHAR(10)   NOT NULL,
      name          VARCHAR(100)  NOT NULL,
      description   VARCHAR(255)  NULL,
      isActive      TINYINT(1)    NOT NULL DEFAULT 1,
      createdById   CHAR(36)      NOT NULL,
      createdAt     DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updatedAt     DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      deletedAt     DATETIME(3)   NULL,
      PRIMARY KEY (id),
      UNIQUE KEY uq_inv_sites_code (code),
      INDEX idx_inv_sites_active (isActive)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  END IF;
END$$
DELIMITER ;
CALL _v41_inv_sites_tbl();
DROP PROCEDURE IF EXISTS _v41_inv_sites_tbl;

-- Seed from distinct siteId/siteName pairs already stored on warehouses
DROP PROCEDURE IF EXISTS _v41_inv_sites_seed;
DELIMITER $$
CREATE PROCEDURE _v41_inv_sites_seed()
BEGIN
  DECLARE v_creator CHAR(36);
  SELECT id INTO v_creator FROM users ORDER BY createdAt ASC LIMIT 1;

  INSERT IGNORE INTO inv_sites (id, code, name, isActive, createdById, createdAt, updatedAt)
  SELECT UUID(), w.siteId, w.siteName, 1, v_creator, NOW(3), NOW(3)
  FROM (
    SELECT DISTINCT siteId, siteName
    FROM inv_warehouses
    WHERE deletedAt IS NULL
  ) w;
END$$
DELIMITER ;
CALL _v41_inv_sites_seed();
DROP PROCEDURE IF EXISTS _v41_inv_sites_seed;
