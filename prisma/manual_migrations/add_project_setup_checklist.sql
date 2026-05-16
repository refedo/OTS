-- Create ProjectSetupChecklist table
CREATE TABLE IF NOT EXISTS `ProjectSetupChecklist` (
  `id` CHAR(36) NOT NULL,
  `projectId` CHAR(36) NOT NULL,
  `contractReceived` VARCHAR(10) NULL,
  `answers` JSON NULL,
  `notifications` JSON NULL,
  `spcsAttachment` VARCHAR(500) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `ProjectSetupChecklist_projectId_key` (`projectId`),
  INDEX `ProjectSetupChecklist_contractReceived_idx` (`contractReceived`),
  CONSTRAINT `ProjectSetupChecklist_projectId_fkey`
    FOREIGN KEY (`projectId`) REFERENCES `Project` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
