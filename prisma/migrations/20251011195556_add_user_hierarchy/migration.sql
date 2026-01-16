-- AlterTable
ALTER TABLE `user` ADD COLUMN `reportsToId` CHAR(36) NULL;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_reportsToId_fkey` FOREIGN KEY (`reportsToId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
