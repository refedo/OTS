-- Create ProjectCoatingSystem table
CREATE TABLE IF NOT EXISTS `ProjectCoatingSystem` (
  `id` CHAR(36) NOT NULL,
  `projectId` CHAR(36) NOT NULL,
  `name` VARCHAR(255) NULL,
  `appliesToAll` BOOLEAN NOT NULL DEFAULT TRUE,
  `coats` JSON NOT NULL,
  `isGalvanized` BOOLEAN NOT NULL DEFAULT FALSE,
  `galvanizationMicrons` INT NULL,
  `sortOrder` INT NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `ProjectCoatingSystem_projectId_idx` (`projectId`),
  CONSTRAINT `ProjectCoatingSystem_projectId_fkey`
    FOREIGN KEY (`projectId`) REFERENCES `Project` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create ProjectCoatingSystemBuilding junction table
CREATE TABLE IF NOT EXISTS `ProjectCoatingSystemBuilding` (
  `coatingSystemId` CHAR(36) NOT NULL,
  `buildingId` CHAR(36) NOT NULL,
  PRIMARY KEY (`coatingSystemId`, `buildingId`),
  INDEX `ProjectCoatingSystemBuilding_buildingId_idx` (`buildingId`),
  CONSTRAINT `ProjectCoatingSystemBuilding_coatingSystemId_fkey`
    FOREIGN KEY (`coatingSystemId`) REFERENCES `ProjectCoatingSystem` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ProjectCoatingSystemBuilding_buildingId_fkey`
    FOREIGN KEY (`buildingId`) REFERENCES `Building` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
