-- Create task_attachments table
CREATE TABLE `task_attachments` (
  `id`           CHAR(36)     NOT NULL,
  `taskId`       CHAR(36)     NOT NULL,
  `fileName`     VARCHAR(191) NOT NULL,
  `filePath`     VARCHAR(191) NOT NULL,
  `fileType`     VARCHAR(191) NULL,
  `fileSize`     INT          NULL,
  `uploadedById` CHAR(36)     NOT NULL,
  `uploadedAt`   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`),
  INDEX `task_attachments_taskId_idx` (`taskId`),
  CONSTRAINT `task_attachments_taskId_fkey`
    FOREIGN KEY (`taskId`) REFERENCES `Task`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `task_attachments_uploadedById_fkey`
    FOREIGN KEY (`uploadedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
