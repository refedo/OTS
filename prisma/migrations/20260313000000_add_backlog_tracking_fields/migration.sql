-- Add PROJECTS to BacklogCategory enum
ALTER TABLE `ProductBacklogItem`
  MODIFY `category` ENUM('CORE_SYSTEM','PRODUCTION','DESIGN','DETAILING','PROCUREMENT','QC','LOGISTICS','FINANCE','REPORTING','AI','GOVERNANCE','PROJECTS') NOT NULL;

-- Add activity trail tracking columns
ALTER TABLE `ProductBacklogItem`
  ADD COLUMN `reviewedById`  CHAR(36) NULL,
  ADD COLUMN `reviewedAt`    DATETIME(3) NULL,
  ADD COLUMN `plannedById`   CHAR(36) NULL,
  ADD COLUMN `completedById` CHAR(36) NULL;

-- Add FK for existing approvedById (was created without constraint)
ALTER TABLE `ProductBacklogItem`
  ADD CONSTRAINT `ProductBacklogItem_approvedById_fkey`
  FOREIGN KEY (`approvedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Add FKs for new tracking columns
ALTER TABLE `ProductBacklogItem`
  ADD CONSTRAINT `ProductBacklogItem_reviewedById_fkey`
  FOREIGN KEY (`reviewedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `ProductBacklogItem`
  ADD CONSTRAINT `ProductBacklogItem_plannedById_fkey`
  FOREIGN KEY (`plannedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `ProductBacklogItem`
  ADD CONSTRAINT `ProductBacklogItem_completedById_fkey`
  FOREIGN KEY (`completedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
