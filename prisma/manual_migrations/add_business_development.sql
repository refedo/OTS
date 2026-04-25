-- ─────────────────────────────────────────────────────────────────────────
-- Business Development module (v20.0.0)
-- Creates: BdCompany, BdDocument, BdRequest, BdArchiveEntry
-- All tables use IF NOT EXISTS + stored-procedure pattern for idempotency.
-- ─────────────────────────────────────────────────────────────────────────

-- ── BdCompany ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `BdCompany` (
  `id`                 CHAR(36)     NOT NULL,
  `name`               VARCHAR(255) NOT NULL,
  `logoUrl`            VARCHAR(512)          DEFAULT NULL,
  `contactName`        VARCHAR(255)          DEFAULT NULL,
  `contactEmail`       VARCHAR(255)          DEFAULT NULL,
  `contactPhone`       VARCHAR(80)           DEFAULT NULL,
  `registrationStatus` VARCHAR(30)  NOT NULL DEFAULT 'NOT_STARTED',
  `registrationDate`   DATETIME(3)           DEFAULT NULL,
  `registrationExpiry` DATETIME(3)           DEFAULT NULL,
  `whatNext`           TEXT                  DEFAULT NULL,
  `notes`              TEXT                  DEFAULT NULL,
  `deletedAt`          DATETIME(3)           DEFAULT NULL,
  `deletedById`        CHAR(36)              DEFAULT NULL,
  `deleteReason`       VARCHAR(512)          DEFAULT NULL,
  `createdAt`          DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`          DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `createdById`        CHAR(36)              DEFAULT NULL,
  `updatedById`        CHAR(36)              DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_bdcompany_status` (`registrationStatus`),
  KEY `idx_bdcompany_deleted` (`deletedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── BdDocument ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `BdDocument` (
  `id`          CHAR(36)     NOT NULL,
  `companyId`   CHAR(36)     NOT NULL,
  `title`       VARCHAR(255) NOT NULL,
  `fileUrl`     VARCHAR(512)          DEFAULT NULL,
  `status`      VARCHAR(30)  NOT NULL DEFAULT 'SUBMITTED',
  `submittedAt` DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `deletedAt`   DATETIME(3)           DEFAULT NULL,
  `createdAt`   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_bddocument_company` (`companyId`),
  KEY `idx_bddocument_deleted` (`deletedAt`),
  CONSTRAINT `fk_bddocument_company` FOREIGN KEY (`companyId`) REFERENCES `BdCompany` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── BdRequest ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `BdRequest` (
  `id`          CHAR(36)     NOT NULL,
  `companyId`   CHAR(36)     NOT NULL,
  `title`       VARCHAR(255) NOT NULL,
  `requestType` VARCHAR(80)           DEFAULT NULL,
  `status`      VARCHAR(30)  NOT NULL DEFAULT 'NEW',
  `receivedAt`  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `deletedAt`   DATETIME(3)           DEFAULT NULL,
  `createdAt`   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_bdrequest_company` (`companyId`),
  KEY `idx_bdrequest_deleted` (`deletedAt`),
  CONSTRAINT `fk_bdrequest_company` FOREIGN KEY (`companyId`) REFERENCES `BdCompany` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── BdArchiveEntry ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `BdArchiveEntry` (
  `id`        CHAR(36)     NOT NULL,
  `companyId` CHAR(36)     NOT NULL,
  `entryType` VARCHAR(50)  NOT NULL,
  `content`   TEXT                  DEFAULT NULL,
  `createdAt` DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_bdarchive_company` (`companyId`),
  UNIQUE KEY `uq_bdarchive_company_type` (`companyId`, `entryType`),
  CONSTRAINT `fk_bdarchive_company` FOREIGN KEY (`companyId`) REFERENCES `BdCompany` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
