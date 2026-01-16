-- SQL Script to Delete Seeded Projects
-- Run this in your MySQL client or through Prisma Studio

-- Disable foreign key checks temporarily
SET FOREIGN_KEY_CHECKS = 0;

-- Delete Project 1: Industrial Complex 277
DELETE FROM `Task` WHERE `projectId` = '37c076a9-6fa2-4e50-983c-8375838c207d';
DELETE FROM `ProjectAssignment` WHERE `projectId` = '37c076a9-6fa2-4e50-983c-8375838c207d';
DELETE FROM `Document` WHERE `projectId` = '37c076a9-6fa2-4e50-983c-8375838c207d';
DELETE FROM `Milestone` WHERE `projectId` = '37c076a9-6fa2-4e50-983c-8375838c207d';
DELETE FROM `ProjectPlan` WHERE `projectId` = '37c076a9-6fa2-4e50-983c-8375838c207d';
DELETE FROM `ScopeSchedule` WHERE `projectId` = '37c076a9-6fa2-4e50-983c-8375838c207d';
DELETE FROM `WPSPass` WHERE `wpsId` IN (SELECT `id` FROM `WPS` WHERE `projectId` = '37c076a9-6fa2-4e50-983c-8375838c207d');
DELETE FROM `WPS` WHERE `projectId` = '37c076a9-6fa2-4e50-983c-8375838c207d';
DELETE FROM `ITPActivity` WHERE `itpId` IN (SELECT `id` FROM `ITP` WHERE `projectId` = '37c076a9-6fa2-4e50-983c-8375838c207d');
DELETE FROM `ITP` WHERE `projectId` = '37c076a9-6fa2-4e50-983c-8375838c207d';
DELETE FROM `Building` WHERE `projectId` = '37c076a9-6fa2-4e50-983c-8375838c207d';
DELETE FROM `Project` WHERE `id` = '37c076a9-6fa2-4e50-983c-8375838c207d';

-- Delete Project 2: Manufacturing Plant 274
DELETE FROM `Task` WHERE `projectId` = '76257ced-485e-476e-9bae-04c71f0cf034';
DELETE FROM `ProjectAssignment` WHERE `projectId` = '76257ced-485e-476e-9bae-04c71f0cf034';
DELETE FROM `Document` WHERE `projectId` = '76257ced-485e-476e-9bae-04c71f0cf034';
DELETE FROM `Milestone` WHERE `projectId` = '76257ced-485e-476e-9bae-04c71f0cf034';
DELETE FROM `ProjectPlan` WHERE `projectId` = '76257ced-485e-476e-9bae-04c71f0cf034';
DELETE FROM `ScopeSchedule` WHERE `projectId` = '76257ced-485e-476e-9bae-04c71f0cf034';
DELETE FROM `WPSPass` WHERE `wpsId` IN (SELECT `id` FROM `WPS` WHERE `projectId` = '76257ced-485e-476e-9bae-04c71f0cf034');
DELETE FROM `WPS` WHERE `projectId` = '76257ced-485e-476e-9bae-04c71f0cf034';
DELETE FROM `ITPActivity` WHERE `itpId` IN (SELECT `id` FROM `ITP` WHERE `projectId` = '76257ced-485e-476e-9bae-04c71f0cf034');
DELETE FROM `ITP` WHERE `projectId` = '76257ced-485e-476e-9bae-04c71f0cf034';
DELETE FROM `Building` WHERE `projectId` = '76257ced-485e-476e-9bae-04c71f0cf034';
DELETE FROM `Project` WHERE `id` = '76257ced-485e-476e-9bae-04c71f0cf034';

-- Delete Project 3: Commercial Tower 257
DELETE FROM `Task` WHERE `projectId` = 'a6d06934-31d8-4355-97ad-b216b3c8b59a';
DELETE FROM `ProjectAssignment` WHERE `projectId` = 'a6d06934-31d8-4355-97ad-b216b3c8b59a';
DELETE FROM `Document` WHERE `projectId` = 'a6d06934-31d8-4355-97ad-b216b3c8b59a';
DELETE FROM `Milestone` WHERE `projectId` = 'a6d06934-31d8-4355-97ad-b216b3c8b59a';
DELETE FROM `ProjectPlan` WHERE `projectId` = 'a6d06934-31d8-4355-97ad-b216b3c8b59a';
DELETE FROM `ScopeSchedule` WHERE `projectId` = 'a6d06934-31d8-4355-97ad-b216b3c8b59a';
DELETE FROM `WPSPass` WHERE `wpsId` IN (SELECT `id` FROM `WPS` WHERE `projectId` = 'a6d06934-31d8-4355-97ad-b216b3c8b59a');
DELETE FROM `WPS` WHERE `projectId` = 'a6d06934-31d8-4355-97ad-b216b3c8b59a';
DELETE FROM `ITPActivity` WHERE `itpId` IN (SELECT `id` FROM `ITP` WHERE `projectId` = 'a6d06934-31d8-4355-97ad-b216b3c8b59a');
DELETE FROM `ITP` WHERE `projectId` = 'a6d06934-31d8-4355-97ad-b216b3c8b59a';
DELETE FROM `Building` WHERE `projectId` = 'a6d06934-31d8-4355-97ad-b216b3c8b59a';
DELETE FROM `Project` WHERE `id` = 'a6d06934-31d8-4355-97ad-b216b3c8b59a';

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

SELECT 'Projects deleted successfully!' AS Result;
