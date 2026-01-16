-- Clear existing stages
DELETE FROM `operationstageconfig`;

-- Insert new operation stages
INSERT INTO `operationstageconfig` (`id`, `stageCode`, `stageName`, `orderIndex`, `autoSource`, `description`, `color`, `icon`, `isMandatory`, `createdAt`, `updatedAt`) VALUES
(UUID(), 'CONTRACT_SIGNED', 'Signing Contract', 1, NULL, 'Contract signed with client', '#3b82f6', '📝', 1, NOW(), NOW()),
(UUID(), 'DOWN_PAYMENT_RECEIVED', 'Down Payment Receiving', 2, NULL, 'Down payment received from client', '#10b981', '💰', 1, NOW(), NOW()),
(UUID(), 'DESIGN_SUBMITTED', 'Design Submitted', 3, 'document_control:DESIGN_SUBMITTED', 'Design package submitted to client', '#f59e0b', '📐', 1, NOW(), NOW()),
(UUID(), 'DESIGN_APPROVED', 'Design Approved', 4, 'document_control:DESIGN_APPROVED', 'Design package approved by client', '#10b981', '✅', 1, NOW(), NOW()),
(UUID(), 'SHOP_SUBMITTED', 'Shop Drawing Submitted', 5, 'document_control:SHOP_SUBMITTED', 'Shop drawings submitted to client', '#f59e0b', '📋', 1, NOW(), NOW()),
(UUID(), 'SHOP_APPROVED', 'Shop Drawing Approved', 6, 'document_control:SHOP_APPROVED', 'Shop drawings approved by client', '#10b981', '✅', 1, NOW(), NOW()),
(UUID(), 'PROCUREMENT_STARTED', 'Procurement Started', 7, 'procurement:STARTED', 'Material procurement initiated', '#8b5cf6', '🛒', 1, NOW(), NOW()),
(UUID(), 'PRODUCTION_STARTED', 'Production Started', 8, 'production:FIRST_LOG', 'Production/fabrication started (first production log)', '#f59e0b', '🏭', 1, NOW(), NOW()),
(UUID(), 'PRODUCTION_COMPLETED', 'Production Completed', 9, 'production:COMPLETED', 'Production/fabrication completed', '#10b981', '✅', 1, NOW(), NOW()),
(UUID(), 'COATING_STARTED', 'Coating Started', 10, 'coating:STARTED', 'Coating/galvanizing process started', '#f59e0b', '🎨', 0, NOW(), NOW()),
(UUID(), 'COATING_COMPLETED', 'Coating Completed', 11, 'coating:COMPLETED', 'Coating/galvanizing process completed', '#10b981', '✅', 0, NOW(), NOW()),
(UUID(), 'DISPATCHING_STARTED', 'Dispatching Started', 12, 'dispatching:STARTED', 'Dispatching/delivery started', '#f59e0b', '🚚', 1, NOW(), NOW()),
(UUID(), 'DISPATCHING_COMPLETED', 'Dispatching Completed', 13, 'dispatching:COMPLETED', 'All materials dispatched to site', '#10b981', '✅', 1, NOW(), NOW()),
(UUID(), 'ERECTION_STARTED', 'Erection Started', 14, 'erection:STARTED', 'On-site erection/installation started', '#f59e0b', '🏗️', 1, NOW(), NOW()),
(UUID(), 'ERECTION_COMPLETED', 'Erection Completed', 15, 'erection:COMPLETED', 'On-site erection/installation completed', '#10b981', '🎉', 1, NOW(), NOW());
