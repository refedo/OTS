/*
  Warnings:

  - You are about to drop the column `isSystem` on the `role` table. All the data in the column will be lost.
  - You are about to drop the `permission` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `rolepermission` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `rolepermission` DROP FOREIGN KEY `RolePermission_permissionId_fkey`;

-- DropForeignKey
ALTER TABLE `rolepermission` DROP FOREIGN KEY `RolePermission_roleId_fkey`;

-- AlterTable
ALTER TABLE `role` DROP COLUMN `isSystem`,
    ADD COLUMN `permissions` JSON NULL;

-- DropTable
DROP TABLE `permission`;

-- DropTable
DROP TABLE `rolepermission`;
