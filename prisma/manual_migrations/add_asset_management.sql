-- 18.12.0 — Add Asset Management tables (Asset, AssetAssignment, TrafficViolation, CarMaintenanceRecord)
--
-- Idempotent: uses CREATE TABLE IF NOT EXISTS.
-- MySQL does not support ALTER TABLE ADD COLUMN IF NOT EXISTS — use the
-- stored-procedure pattern for any column additions to existing tables.

-- ─── Asset table ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `Asset` (
  `id`              CHAR(36)     NOT NULL,
  `assetCode`       VARCHAR(50)  NOT NULL,
  `name`            VARCHAR(200) NOT NULL,
  `category`        ENUM('CAR','SIM_CARD','LAPTOP','TABLET','PHONE','KEY','TOOL','EQUIPMENT','OTHER') NOT NULL,
  `status`          ENUM('AVAILABLE','ASSIGNED','UNDER_MAINTENANCE','RETIRED','DAMAGED','LOST') NOT NULL DEFAULT 'AVAILABLE',
  -- Car-specific
  `plateNumber`     VARCHAR(30)  NULL,
  `vehicleMake`     VARCHAR(100) NULL,
  `vehicleModel`    VARCHAR(100) NULL,
  `vehicleYear`     INT          NULL,
  `vehicleColor`    VARCHAR(50)  NULL,
  `vin`             VARCHAR(50)  NULL,
  `currentOdometer` INT          NULL,
  -- SIM-specific
  `simNumber`       VARCHAR(30)  NULL,
  `mobileNumber`    VARCHAR(30)  NULL,
  `carrier`         VARCHAR(100) NULL,
  -- General
  `serialNumber`    VARCHAR(100) NULL,
  `make`            VARCHAR(100) NULL,
  `model`           VARCHAR(100) NULL,
  `purchaseDate`    DATE         NULL,
  `purchasePrice`   DECIMAL(12,2) NULL,
  `notes`           TEXT         NULL,
  -- Audit
  `createdById`     CHAR(36)     NOT NULL,
  `updatedById`     CHAR(36)     NULL,
  `createdAt`       DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`       DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `deletedAt`       DATETIME(3)  NULL,
  `deletedById`     CHAR(36)     NULL,
  `deleteReason`    VARCHAR(500) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `Asset_assetCode_key` (`assetCode`),
  INDEX `Asset_category_status_idx` (`category`, `status`),
  INDEX `Asset_deletedAt_idx` (`deletedAt`),
  CONSTRAINT `Asset_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `Asset_updatedById_fkey` FOREIGN KEY (`updatedById`) REFERENCES `User` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `Asset_deletedById_fkey` FOREIGN KEY (`deletedById`) REFERENCES `User` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── AssetAssignment table ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `AssetAssignment` (
  `id`           CHAR(36)    NOT NULL,
  `assetId`      CHAR(36)    NOT NULL,
  `employeeId`   CHAR(36)    NOT NULL,
  `assignedDate` DATE        NOT NULL,
  `returnedDate` DATE        NULL,
  `status`       ENUM('ACTIVE','RETURNED') NOT NULL DEFAULT 'ACTIVE',
  `returnReason` ENUM('VACATION','RESIGNATION','TERMINATION','TRANSFER','MAINTENANCE','EXPIRED','PROJECT_END','OTHER') NULL,
  `notes`        VARCHAR(500) NULL,
  -- Audit
  `createdById`  CHAR(36)    NOT NULL,
  `updatedById`  CHAR(36)    NULL,
  `createdAt`    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `deletedAt`    DATETIME(3) NULL,
  `deletedById`  CHAR(36)    NULL,
  `deleteReason` VARCHAR(500) NULL,
  PRIMARY KEY (`id`),
  INDEX `AssetAssignment_assetId_status_idx` (`assetId`, `status`),
  INDEX `AssetAssignment_employeeId_status_idx` (`employeeId`, `status`),
  INDEX `AssetAssignment_deletedAt_idx` (`deletedAt`),
  CONSTRAINT `AssetAssignment_assetId_fkey`    FOREIGN KEY (`assetId`)    REFERENCES `Asset`    (`id`) ON DELETE CASCADE  ON UPDATE CASCADE,
  CONSTRAINT `AssetAssignment_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee` (`id`) ON DELETE CASCADE  ON UPDATE CASCADE,
  CONSTRAINT `AssetAssignment_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `AssetAssignment_updatedById_fkey` FOREIGN KEY (`updatedById`) REFERENCES `User` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `AssetAssignment_deletedById_fkey` FOREIGN KEY (`deletedById`) REFERENCES `User` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── TrafficViolation table ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `TrafficViolation` (
  `id`               CHAR(36)      NOT NULL,
  `employeeId`       CHAR(36)      NOT NULL,
  `assetId`          CHAR(36)      NULL,
  `violationDate`    DATE          NOT NULL,
  `violationType`    VARCHAR(200)  NOT NULL,
  `violationAmount`  DECIMAL(12,2) NOT NULL,
  `status`           ENUM('PENDING','PAID_BY_EMPLOYEE','PAID_BY_COMPANY','DEDUCTED_FROM_PAYROLL') NOT NULL DEFAULT 'PENDING',
  `referenceNumber`  VARCHAR(100)  NULL,
  `issuingAuthority` VARCHAR(200)  NULL,
  `deductFromPayroll` TINYINT(1)   NOT NULL DEFAULT 0,
  `notes`            VARCHAR(500)  NULL,
  -- Audit
  `createdById`      CHAR(36)      NOT NULL,
  `updatedById`      CHAR(36)      NULL,
  `createdAt`        DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`        DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `deletedAt`        DATETIME(3)   NULL,
  `deletedById`      CHAR(36)      NULL,
  `deleteReason`     VARCHAR(500)  NULL,
  PRIMARY KEY (`id`),
  INDEX `TrafficViolation_employeeId_violationDate_idx` (`employeeId`, `violationDate`),
  INDEX `TrafficViolation_assetId_idx` (`assetId`),
  INDEX `TrafficViolation_deletedAt_idx` (`deletedAt`),
  CONSTRAINT `TrafficViolation_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee` (`id`) ON DELETE CASCADE  ON UPDATE CASCADE,
  CONSTRAINT `TrafficViolation_assetId_fkey`    FOREIGN KEY (`assetId`)    REFERENCES `Asset`    (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `TrafficViolation_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `TrafficViolation_updatedById_fkey` FOREIGN KEY (`updatedById`) REFERENCES `User` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `TrafficViolation_deletedById_fkey` FOREIGN KEY (`deletedById`) REFERENCES `User` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── CarMaintenanceRecord table ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `CarMaintenanceRecord` (
  `id`                  CHAR(36)     NOT NULL,
  `assetId`             CHAR(36)     NOT NULL,
  `maintenanceDate`     DATE         NOT NULL,
  `maintenanceType`     ENUM('OIL_CHANGE','BRAKE_SERVICE','TIRE_ROTATION','TIRE_REPLACEMENT','BATTERY_REPLACEMENT','AC_SERVICE','GENERAL_SERVICE','INSPECTION','REPAIR','ACCIDENT_REPAIR','FILTER_REPLACEMENT','SPARK_PLUGS','TRANSMISSION_SERVICE','COOLANT_FLUSH','OTHER') NOT NULL,
  `description`         VARCHAR(500) NOT NULL,
  `serviceCenter`       VARCHAR(200) NULL,
  `odometer`            INT          NULL,
  `cost`                DECIMAL(12,2) NULL,
  `nextServiceDate`     DATE         NULL,
  `nextServiceOdometer` INT          NULL,
  `partsReplaced`       VARCHAR(500) NULL,
  `invoiceNumber`       VARCHAR(100) NULL,
  `technician`          VARCHAR(200) NULL,
  `notes`               TEXT         NULL,
  -- Audit
  `createdById`         CHAR(36)     NOT NULL,
  `updatedById`         CHAR(36)     NULL,
  `createdAt`           DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`           DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `deletedAt`           DATETIME(3)  NULL,
  `deletedById`         CHAR(36)     NULL,
  `deleteReason`        VARCHAR(500) NULL,
  PRIMARY KEY (`id`),
  INDEX `CarMaintenanceRecord_assetId_maintenanceDate_idx` (`assetId`, `maintenanceDate`),
  INDEX `CarMaintenanceRecord_deletedAt_idx` (`deletedAt`),
  CONSTRAINT `CarMaintenanceRecord_assetId_fkey`    FOREIGN KEY (`assetId`)    REFERENCES `Asset` (`id`) ON DELETE CASCADE  ON UPDATE CASCADE,
  CONSTRAINT `CarMaintenanceRecord_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `CarMaintenanceRecord_updatedById_fkey` FOREIGN KEY (`updatedById`) REFERENCES `User` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `CarMaintenanceRecord_deletedById_fkey` FOREIGN KEY (`deletedById`) REFERENCES `User` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
