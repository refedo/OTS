-- ============================================================
-- INV — Inventory & Warehouse Management (v24.0.0)
-- Form range: HEXA-FRM-029 to HEXA-FRM-031
-- ============================================================
-- Creates 9 tables, seeds 6 warehouses, 7 production locations,
-- and 6 INV permission codes into the permissions column of roles.
-- All tables use conditional stored-procedure pattern (IF NOT EXISTS).
-- ============================================================

-- ── 1. InvWarehouse ─────────────────────────────────────────
DROP PROCEDURE IF EXISTS create_inv_warehouses;
DELIMITER $$
CREATE PROCEDURE create_inv_warehouses()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_warehouses'
  ) THEN
    CREATE TABLE `inv_warehouses` (
      `id`          CHAR(36)     NOT NULL,
      `code`        VARCHAR(30)  NOT NULL,
      `name`        VARCHAR(100) NOT NULL,
      `type`        ENUM('RAW_MATERIAL','CONSUMABLE','OFFCUT') NOT NULL,
      `siteId`      VARCHAR(10)  NOT NULL,
      `siteName`    VARCHAR(50)  NOT NULL,
      `isActive`    TINYINT(1)   NOT NULL DEFAULT 1,
      `createdById` CHAR(36)     NOT NULL,
      `createdAt`   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      `updatedAt`   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      `deletedAt`   DATETIME(3)  NULL,
      PRIMARY KEY (`id`),
      UNIQUE KEY `inv_warehouses_code_key` (`code`),
      KEY `inv_warehouses_siteId_idx` (`siteId`),
      KEY `inv_warehouses_type_idx` (`type`),
      KEY `inv_warehouses_isActive_idx` (`isActive`),
      KEY `inv_warehouses_createdById_fkey` (`createdById`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  END IF;
END$$
DELIMITER ;
CALL create_inv_warehouses();
DROP PROCEDURE IF EXISTS create_inv_warehouses;

-- ── 2. InvLocation ──────────────────────────────────────────
DROP PROCEDURE IF EXISTS create_inv_locations;
DELIMITER $$
CREATE PROCEDURE create_inv_locations()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_locations'
  ) THEN
    CREATE TABLE `inv_locations` (
      `id`          CHAR(36)     NOT NULL,
      `code`        VARCHAR(30)  NOT NULL,
      `name`        VARCHAR(100) NOT NULL,
      `siteId`      VARCHAR(10)  NOT NULL,
      `isActive`    TINYINT(1)   NOT NULL DEFAULT 1,
      `createdById` CHAR(36)     NOT NULL,
      `createdAt`   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      `updatedAt`   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      `deletedAt`   DATETIME(3)  NULL,
      PRIMARY KEY (`id`),
      UNIQUE KEY `inv_locations_code_key` (`code`),
      KEY `inv_locations_siteId_idx` (`siteId`),
      KEY `inv_locations_isActive_idx` (`isActive`),
      KEY `inv_locations_createdById_fkey` (`createdById`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  END IF;
END$$
DELIMITER ;
CALL create_inv_locations();
DROP PROCEDURE IF EXISTS create_inv_locations;

-- ── 3. InvItem ──────────────────────────────────────────────
DROP PROCEDURE IF EXISTS create_inv_items;
DELIMITER $$
CREATE PROCEDURE create_inv_items()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_items'
  ) THEN
    CREATE TABLE `inv_items` (
      `id`            CHAR(36)     NOT NULL,
      `code`          VARCHAR(50)  NOT NULL,
      `name`          VARCHAR(150) NOT NULL,
      `description`   TEXT         NULL,
      `unit`          VARCHAR(20)  NOT NULL,
      `category`      ENUM('STRUCTURAL_STEEL','PLATE','PIPE','CONSUMABLE','FASTENER','PAINT','ELECTRICAL','OFFCUT','OTHER') NOT NULL,
      `defaultWhType` ENUM('RAW_MATERIAL','CONSUMABLE','OFFCUT') NOT NULL,
      `minStockLevel` DOUBLE       NOT NULL DEFAULT 0,
      `isActive`      TINYINT(1)   NOT NULL DEFAULT 1,
      `createdById`   CHAR(36)     NOT NULL,
      `createdAt`     DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      `updatedAt`     DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      `deletedAt`     DATETIME(3)  NULL,
      PRIMARY KEY (`id`),
      UNIQUE KEY `inv_items_code_key` (`code`),
      KEY `inv_items_category_idx` (`category`),
      KEY `inv_items_defaultWhType_idx` (`defaultWhType`),
      KEY `inv_items_isActive_idx` (`isActive`),
      KEY `inv_items_createdById_fkey` (`createdById`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  END IF;
END$$
DELIMITER ;
CALL create_inv_items();
DROP PROCEDURE IF EXISTS create_inv_items;

-- ── 4. InvStockBalance ──────────────────────────────────────
DROP PROCEDURE IF EXISTS create_inv_stock_balances;
DELIMITER $$
CREATE PROCEDURE create_inv_stock_balances()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_stock_balances'
  ) THEN
    CREATE TABLE `inv_stock_balances` (
      `id`          CHAR(36)    NOT NULL,
      `warehouseId` CHAR(36)    NOT NULL,
      `itemId`      CHAR(36)    NOT NULL,
      `quantity`    DOUBLE      NOT NULL DEFAULT 0,
      `updatedAt`   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      PRIMARY KEY (`id`),
      UNIQUE KEY `inv_stock_balances_warehouseId_itemId_key` (`warehouseId`, `itemId`),
      KEY `inv_stock_balances_warehouseId_idx` (`warehouseId`),
      KEY `inv_stock_balances_itemId_idx` (`itemId`),
      CONSTRAINT `inv_stock_balances_warehouseId_fkey` FOREIGN KEY (`warehouseId`) REFERENCES `inv_warehouses` (`id`),
      CONSTRAINT `inv_stock_balances_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `inv_items` (`id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  END IF;
END$$
DELIMITER ;
CALL create_inv_stock_balances();
DROP PROCEDURE IF EXISTS create_inv_stock_balances;

-- ── 5. InvStockLedger ───────────────────────────────────────
DROP PROCEDURE IF EXISTS create_inv_stock_ledger;
DELIMITER $$
CREATE PROCEDURE create_inv_stock_ledger()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_stock_ledger'
  ) THEN
    CREATE TABLE `inv_stock_ledger` (
      `id`            CHAR(36)    NOT NULL,
      `warehouseId`   CHAR(36)    NOT NULL,
      `itemId`        CHAR(36)    NOT NULL,
      `direction`     ENUM('IN','OUT') NOT NULL,
      `movementType`  ENUM('STOCK_IN','ISSUE','RETURN','ADJUSTMENT') NOT NULL,
      `quantity`      DOUBLE      NOT NULL,
      `balanceAfter`  DOUBLE      NOT NULL,
      `referenceType` VARCHAR(30) NULL,
      `referenceId`   CHAR(36)    NULL,
      `referenceNo`   VARCHAR(50) NULL,
      `projectId`     CHAR(36)    NULL,
      `locationId`    CHAR(36)    NULL,
      `mirOutId`      CHAR(36)    NULL,
      `returnId`      CHAR(36)    NULL,
      `notes`         TEXT        NULL,
      `performedById` CHAR(36)    NOT NULL,
      `createdAt`     DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (`id`),
      KEY `inv_stock_ledger_warehouseId_idx` (`warehouseId`),
      KEY `inv_stock_ledger_itemId_idx` (`itemId`),
      KEY `inv_stock_ledger_direction_idx` (`direction`),
      KEY `inv_stock_ledger_movementType_idx` (`movementType`),
      KEY `inv_stock_ledger_projectId_idx` (`projectId`),
      KEY `inv_stock_ledger_createdAt_idx` (`createdAt`),
      CONSTRAINT `inv_stock_ledger_warehouseId_fkey` FOREIGN KEY (`warehouseId`) REFERENCES `inv_warehouses` (`id`),
      CONSTRAINT `inv_stock_ledger_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `inv_items` (`id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  END IF;
END$$
DELIMITER ;
CALL create_inv_stock_ledger();
DROP PROCEDURE IF EXISTS create_inv_stock_ledger;

-- ── 6. InvMirOut ────────────────────────────────────────────
DROP PROCEDURE IF EXISTS create_inv_mir_outs;
DELIMITER $$
CREATE PROCEDURE create_inv_mir_outs()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_mir_outs'
  ) THEN
    CREATE TABLE `inv_mir_outs` (
      `id`              CHAR(36)    NOT NULL,
      `mirOutNumber`    VARCHAR(25) NOT NULL,
      `materialType`    ENUM('RAW_MATERIAL','CONSUMABLE') NOT NULL,
      `siteId`          VARCHAR(10) NOT NULL,
      `projectId`       CHAR(36)    NULL,
      `locationId`      CHAR(36)    NOT NULL,
      `status`          ENUM('DRAFT','PENDING_APPROVAL','APPROVED','ISSUED','PARTIALLY_ISSUED','REJECTED','CLOSED') NOT NULL DEFAULT 'DRAFT',
      `notes`           TEXT        NULL,
      `requestedById`   CHAR(36)    NOT NULL,
      `submittedAt`     DATETIME(3) NULL,
      `submittedById`   CHAR(36)    NULL,
      `approvedAt`      DATETIME(3) NULL,
      `approvedById`    CHAR(36)    NULL,
      `issuedAt`        DATETIME(3) NULL,
      `issuedById`      CHAR(36)    NULL,
      `rejectedAt`      DATETIME(3) NULL,
      `rejectedById`    CHAR(36)    NULL,
      `rejectionReason` TEXT        NULL,
      `closedAt`        DATETIME(3) NULL,
      `createdAt`       DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      `updatedAt`       DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      `deletedAt`       DATETIME(3) NULL,
      PRIMARY KEY (`id`),
      UNIQUE KEY `inv_mir_outs_mirOutNumber_key` (`mirOutNumber`),
      KEY `inv_mir_outs_status_idx` (`status`),
      KEY `inv_mir_outs_materialType_idx` (`materialType`),
      KEY `inv_mir_outs_siteId_idx` (`siteId`),
      KEY `inv_mir_outs_projectId_idx` (`projectId`),
      KEY `inv_mir_outs_requestedById_idx` (`requestedById`),
      KEY `inv_mir_outs_createdAt_idx` (`createdAt`),
      CONSTRAINT `inv_mir_outs_locationId_fkey` FOREIGN KEY (`locationId`) REFERENCES `inv_locations` (`id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  END IF;
END$$
DELIMITER ;
CALL create_inv_mir_outs();
DROP PROCEDURE IF EXISTS create_inv_mir_outs;

-- ── 7. InvMirOutLine ────────────────────────────────────────
DROP PROCEDURE IF EXISTS create_inv_mir_out_lines;
DELIMITER $$
CREATE PROCEDURE create_inv_mir_out_lines()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_mir_out_lines'
  ) THEN
    CREATE TABLE `inv_mir_out_lines` (
      `id`           CHAR(36)    NOT NULL,
      `mirOutId`     CHAR(36)    NOT NULL,
      `itemId`       CHAR(36)    NOT NULL,
      `warehouseId`  CHAR(36)    NOT NULL,
      `qtyRequested` DOUBLE      NOT NULL,
      `qtyIssued`    DOUBLE      NOT NULL DEFAULT 0,
      `status`       ENUM('PENDING','ISSUED','PARTIAL','CANCELLED') NOT NULL DEFAULT 'PENDING',
      `createdAt`    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      `updatedAt`    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      PRIMARY KEY (`id`),
      KEY `inv_mir_out_lines_mirOutId_idx` (`mirOutId`),
      KEY `inv_mir_out_lines_itemId_idx` (`itemId`),
      KEY `inv_mir_out_lines_warehouseId_idx` (`warehouseId`),
      CONSTRAINT `inv_mir_out_lines_mirOutId_fkey` FOREIGN KEY (`mirOutId`) REFERENCES `inv_mir_outs` (`id`) ON DELETE CASCADE,
      CONSTRAINT `inv_mir_out_lines_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `inv_items` (`id`),
      CONSTRAINT `inv_mir_out_lines_warehouseId_fkey` FOREIGN KEY (`warehouseId`) REFERENCES `inv_warehouses` (`id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  END IF;
END$$
DELIMITER ;
CALL create_inv_mir_out_lines();
DROP PROCEDURE IF EXISTS create_inv_mir_out_lines;

-- ── 8. InvReturn ────────────────────────────────────────────
DROP PROCEDURE IF EXISTS create_inv_returns;
DELIMITER $$
CREATE PROCEDURE create_inv_returns()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_returns'
  ) THEN
    CREATE TABLE `inv_returns` (
      `id`              CHAR(36)    NOT NULL,
      `returnNumber`    VARCHAR(20) NOT NULL,
      `returnType`      ENUM('UNUSED_STOCK','OFFCUT') NOT NULL,
      `siteId`          VARCHAR(10) NOT NULL,
      `locationId`      CHAR(36)    NOT NULL,
      `warehouseId`     CHAR(36)    NOT NULL,
      `itemId`          CHAR(36)    NOT NULL,
      `quantity`        DOUBLE      NOT NULL,
      `description`     TEXT        NULL,
      `mirOutId`        CHAR(36)    NULL,
      `status`          ENUM('PENDING','RECEIVED','REJECTED') NOT NULL DEFAULT 'PENDING',
      `requestedById`   CHAR(36)    NOT NULL,
      `receivedAt`      DATETIME(3) NULL,
      `receivedById`    CHAR(36)    NULL,
      `rejectedAt`      DATETIME(3) NULL,
      `rejectedById`    CHAR(36)    NULL,
      `rejectionReason` TEXT        NULL,
      `createdAt`       DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      `updatedAt`       DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      `deletedAt`       DATETIME(3) NULL,
      PRIMARY KEY (`id`),
      UNIQUE KEY `inv_returns_returnNumber_key` (`returnNumber`),
      KEY `inv_returns_status_idx` (`status`),
      KEY `inv_returns_returnType_idx` (`returnType`),
      KEY `inv_returns_siteId_idx` (`siteId`),
      KEY `inv_returns_warehouseId_idx` (`warehouseId`),
      KEY `inv_returns_itemId_idx` (`itemId`),
      KEY `inv_returns_createdAt_idx` (`createdAt`),
      CONSTRAINT `inv_returns_locationId_fkey` FOREIGN KEY (`locationId`) REFERENCES `inv_locations` (`id`),
      CONSTRAINT `inv_returns_warehouseId_fkey` FOREIGN KEY (`warehouseId`) REFERENCES `inv_warehouses` (`id`),
      CONSTRAINT `inv_returns_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `inv_items` (`id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  END IF;
END$$
DELIMITER ;
CALL create_inv_returns();
DROP PROCEDURE IF EXISTS create_inv_returns;

-- ── 9. InvAdjustment ────────────────────────────────────────
DROP PROCEDURE IF EXISTS create_inv_adjustments;
DELIMITER $$
CREATE PROCEDURE create_inv_adjustments()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_adjustments'
  ) THEN
    CREATE TABLE `inv_adjustments` (
      `id`               CHAR(36)    NOT NULL,
      `adjustmentNumber` VARCHAR(20) NOT NULL,
      `warehouseId`      CHAR(36)    NOT NULL,
      `itemId`           CHAR(36)    NOT NULL,
      `systemQty`        DOUBLE      NOT NULL,
      `physicalQty`      DOUBLE      NOT NULL,
      `variance`         DOUBLE      NOT NULL,
      `reason`           TEXT        NOT NULL,
      `authorizedById`   CHAR(36)    NOT NULL,
      `createdAt`        DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (`id`),
      UNIQUE KEY `inv_adjustments_adjustmentNumber_key` (`adjustmentNumber`),
      KEY `inv_adjustments_warehouseId_idx` (`warehouseId`),
      KEY `inv_adjustments_itemId_idx` (`itemId`),
      KEY `inv_adjustments_createdAt_idx` (`createdAt`),
      CONSTRAINT `inv_adjustments_warehouseId_fkey` FOREIGN KEY (`warehouseId`) REFERENCES `inv_warehouses` (`id`),
      CONSTRAINT `inv_adjustments_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `inv_items` (`id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  END IF;
END$$
DELIMITER ;
CALL create_inv_adjustments();
DROP PROCEDURE IF EXISTS create_inv_adjustments;

-- ── SEED: Warehouses ────────────────────────────────────────
-- Uses system user (first admin) or a placeholder UUID if no users exist yet.
-- The FK constraint is on createdById but seeds use a safe pattern.

DROP PROCEDURE IF EXISTS seed_inv_warehouses;
DELIMITER $$
CREATE PROCEDURE seed_inv_warehouses()
BEGIN
  DECLARE v_admin_id CHAR(36) DEFAULT NULL;

  -- Get first user with admin/manager role, fall back to any user
  SELECT id INTO v_admin_id FROM `User` WHERE role IN ('Admin','Manager') ORDER BY createdAt ASC LIMIT 1;
  IF v_admin_id IS NULL THEN
    SELECT id INTO v_admin_id FROM `User` ORDER BY createdAt ASC LIMIT 1;
  END IF;

  IF v_admin_id IS NOT NULL THEN
    -- Factory 001 warehouses
    IF NOT EXISTS (SELECT 1 FROM `inv_warehouses` WHERE `code` = 'RM-WH-F001') THEN
      INSERT INTO `inv_warehouses` (`id`,`code`,`name`,`type`,`siteId`,`siteName`,`isActive`,`createdById`)
      VALUES (UUID(),'RM-WH-F001','Raw Material Warehouse — Factory 001','RAW_MATERIAL','F001','Factory 001',1,v_admin_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM `inv_warehouses` WHERE `code` = 'CM-WH-F001') THEN
      INSERT INTO `inv_warehouses` (`id`,`code`,`name`,`type`,`siteId`,`siteName`,`isActive`,`createdById`)
      VALUES (UUID(),'CM-WH-F001','Consumables Warehouse — Factory 001','CONSUMABLE','F001','Factory 001',1,v_admin_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM `inv_warehouses` WHERE `code` = 'OC-WH-F001') THEN
      INSERT INTO `inv_warehouses` (`id`,`code`,`name`,`type`,`siteId`,`siteName`,`isActive`,`createdById`)
      VALUES (UUID(),'OC-WH-F001','Off-cuts Warehouse — Factory 001','OFFCUT','F001','Factory 001',1,v_admin_id);
    END IF;
    -- Factory 003 warehouses
    IF NOT EXISTS (SELECT 1 FROM `inv_warehouses` WHERE `code` = 'RM-WH-F003') THEN
      INSERT INTO `inv_warehouses` (`id`,`code`,`name`,`type`,`siteId`,`siteName`,`isActive`,`createdById`)
      VALUES (UUID(),'RM-WH-F003','Raw Material Warehouse — Factory 003','RAW_MATERIAL','F003','Factory 003',1,v_admin_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM `inv_warehouses` WHERE `code` = 'CM-WH-F003') THEN
      INSERT INTO `inv_warehouses` (`id`,`code`,`name`,`type`,`siteId`,`siteName`,`isActive`,`createdById`)
      VALUES (UUID(),'CM-WH-F003','Consumables Warehouse — Factory 003','CONSUMABLE','F003','Factory 003',1,v_admin_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM `inv_warehouses` WHERE `code` = 'OC-WH-F003') THEN
      INSERT INTO `inv_warehouses` (`id`,`code`,`name`,`type`,`siteId`,`siteName`,`isActive`,`createdById`)
      VALUES (UUID(),'OC-WH-F003','Off-cuts Warehouse — Factory 003','OFFCUT','F003','Factory 003',1,v_admin_id);
    END IF;
  END IF;
END$$
DELIMITER ;
CALL seed_inv_warehouses();
DROP PROCEDURE IF EXISTS seed_inv_warehouses;

-- ── SEED: Production Locations ──────────────────────────────
DROP PROCEDURE IF EXISTS seed_inv_locations;
DELIMITER $$
CREATE PROCEDURE seed_inv_locations()
BEGIN
  DECLARE v_admin_id CHAR(36) DEFAULT NULL;
  SELECT id INTO v_admin_id FROM `User` WHERE role IN ('Admin','Manager') ORDER BY createdAt ASC LIMIT 1;
  IF v_admin_id IS NULL THEN
    SELECT id INTO v_admin_id FROM `User` ORDER BY createdAt ASC LIMIT 1;
  END IF;

  IF v_admin_id IS NOT NULL THEN
    -- Factory 001 locations
    IF NOT EXISTS (SELECT 1 FROM `inv_locations` WHERE `code` = 'LOC-F001-FAB') THEN
      INSERT INTO `inv_locations` (`id`,`code`,`name`,`siteId`,`isActive`,`createdById`)
      VALUES (UUID(),'LOC-F001-FAB','Factory 001 — Fabrication Area','F001',1,v_admin_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM `inv_locations` WHERE `code` = 'LOC-F001-ASSY') THEN
      INSERT INTO `inv_locations` (`id`,`code`,`name`,`siteId`,`isActive`,`createdById`)
      VALUES (UUID(),'LOC-F001-ASSY','Factory 001 — Assembly Area','F001',1,v_admin_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM `inv_locations` WHERE `code` = 'LOC-F001-BLAST') THEN
      INSERT INTO `inv_locations` (`id`,`code`,`name`,`siteId`,`isActive`,`createdById`)
      VALUES (UUID(),'LOC-F001-BLAST','Factory 001 — Blasting & Painting','F001',1,v_admin_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM `inv_locations` WHERE `code` = 'LOC-F001-YARD') THEN
      INSERT INTO `inv_locations` (`id`,`code`,`name`,`siteId`,`isActive`,`createdById`)
      VALUES (UUID(),'LOC-F001-YARD','Factory 001 — Laydown Yard','F001',1,v_admin_id);
    END IF;
    -- Factory 003 locations
    IF NOT EXISTS (SELECT 1 FROM `inv_locations` WHERE `code` = 'LOC-F003-FAB') THEN
      INSERT INTO `inv_locations` (`id`,`code`,`name`,`siteId`,`isActive`,`createdById`)
      VALUES (UUID(),'LOC-F003-FAB','Factory 003 — Fabrication Area','F003',1,v_admin_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM `inv_locations` WHERE `code` = 'LOC-F003-ASSY') THEN
      INSERT INTO `inv_locations` (`id`,`code`,`name`,`siteId`,`isActive`,`createdById`)
      VALUES (UUID(),'LOC-F003-ASSY','Factory 003 — Assembly Area','F003',1,v_admin_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM `inv_locations` WHERE `code` = 'LOC-F003-YARD') THEN
      INSERT INTO `inv_locations` (`id`,`code`,`name`,`siteId`,`isActive`,`createdById`)
      VALUES (UUID(),'LOC-F003-YARD','Factory 003 — Laydown Yard','F003',1,v_admin_id);
    END IF;
  END IF;
END$$
DELIMITER ;
CALL seed_inv_locations();
DROP PROCEDURE IF EXISTS seed_inv_locations;
