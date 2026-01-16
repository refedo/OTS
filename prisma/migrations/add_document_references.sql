-- Create DocumentReference junction table for many-to-many relationships
CREATE TABLE IF NOT EXISTS `DocumentReference` (
  `id` CHAR(36) NOT NULL,
  `documentId` CHAR(36) NOT NULL,
  `referencedDocumentId` CHAR(36) NOT NULL,
  `referenceType` VARCHAR(50) NOT NULL DEFAULT 'Related Form',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `DocumentReference_documentId_idx` (`documentId`),
  INDEX `DocumentReference_referencedDocumentId_idx` (`referencedDocumentId`),
  CONSTRAINT `DocumentReference_documentId_fkey` FOREIGN KEY (`documentId`) REFERENCES `Document` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `DocumentReference_referencedDocumentId_fkey` FOREIGN KEY (`referencedDocumentId`) REFERENCES `Document` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
