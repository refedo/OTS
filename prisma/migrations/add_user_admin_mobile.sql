-- Add isAdmin flag and mobileNumber to User table
-- isAdmin: allows admin privileges without requiring "Admin" role
-- mobileNumber: international format phone number for WhatsApp notifications

ALTER TABLE `User` ADD COLUMN `isAdmin` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `User` ADD COLUMN `mobileNumber` VARCHAR(20) NULL;
