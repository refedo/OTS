-- 22.2.0 — Gap 5: Competence Matrix (ISO 9001 §7.2)

DROP PROCEDURE IF EXISTS create_ims_competence_entry;
DELIMITER $$
CREATE PROCEDURE create_ims_competence_entry()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ImsCompetenceEntry'
  ) THEN
    CREATE TABLE `ImsCompetenceEntry` (
      `id`             CHAR(36)     NOT NULL PRIMARY KEY,
      `employeeId`     CHAR(36)     NOT NULL,
      `competenceArea` VARCHAR(50)  NOT NULL,
      `status`         VARCHAR(20)  NOT NULL,
      `evidenceRef`    VARCHAR(255) NULL,
      `assessedById`   CHAR(36)     NULL,
      `assessedAt`     DATETIME(3)  NULL,
      `expiryDate`     DATETIME(3)  NULL,
      `createdAt`      DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      `updatedAt`      DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      UNIQUE KEY `uq_competence` (`employeeId`, `competenceArea`),
      INDEX `idx_ice_employee`   (`employeeId`),
      INDEX `idx_ice_area`       (`competenceArea`),
      CONSTRAINT `fk_ice_employee`  FOREIGN KEY (`employeeId`)   REFERENCES `Employee`(`id`) ON DELETE CASCADE,
      CONSTRAINT `fk_ice_assessor`  FOREIGN KEY (`assessedById`) REFERENCES `User`(`id`) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  END IF;
END$$
DELIMITER ;
CALL create_ims_competence_entry();
DROP PROCEDURE IF EXISTS create_ims_competence_entry;
