-- 19.12.0 — HR Policies, Onboarding Tasks, Training Programs
-- Idempotent migration: CREATE TABLE IF NOT EXISTS + stored procedures for ALTER TABLE

-- ─── HrPolicy ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `HrPolicy` (
  `id`            CHAR(36)       NOT NULL,
  `titleEn`       VARCHAR(255)   NOT NULL,
  `titleAr`       VARCHAR(255)   NULL,
  `contentEn`     TEXT           NULL,
  `contentAr`     TEXT           NULL,
  `category`      VARCHAR(100)   NOT NULL DEFAULT 'General',
  `version`       VARCHAR(20)    NOT NULL DEFAULT 'v1.0',
  `effectiveDate` DATE           NOT NULL,
  `status`        VARCHAR(20)    NOT NULL DEFAULT 'ACTIVE',
  `createdById`   CHAR(36)       NOT NULL,
  `updatedById`   CHAR(36)       NULL,
  `deletedById`   CHAR(36)       NULL,
  `deleteReason`  VARCHAR(500)   NULL,
  `createdAt`     DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`     DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `deletedAt`     DATETIME(3)    NULL,
  PRIMARY KEY (`id`),
  KEY `HrPolicy_category_status_idx` (`category`, `status`),
  KEY `HrPolicy_deletedAt_idx`       (`deletedAt`),
  CONSTRAINT `HrPolicy_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `HrPolicy_updatedById_fkey` FOREIGN KEY (`updatedById`) REFERENCES `User` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `HrPolicy_deletedById_fkey` FOREIGN KEY (`deletedById`) REFERENCES `User` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── HrOnboardingTask ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `HrOnboardingTask` (
  `id`          CHAR(36)       NOT NULL,
  `labelEn`     VARCHAR(255)   NOT NULL,
  `labelAr`     VARCHAR(255)   NULL,
  `description` VARCHAR(1000)  NULL,
  `sortOrder`   INT            NOT NULL DEFAULT 0,
  `isRequired`  TINYINT(1)     NOT NULL DEFAULT 1,
  `isActive`    TINYINT(1)     NOT NULL DEFAULT 1,
  `createdAt`   DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`   DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `HrOnboardingTask_sortOrder_idx` (`sortOrder`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── HrTrainingProgram ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `HrTrainingProgram` (
  `id`              CHAR(36)       NOT NULL,
  `titleEn`         VARCHAR(255)   NOT NULL,
  `titleAr`         VARCHAR(255)   NULL,
  `descriptionEn`   TEXT           NULL,
  `descriptionAr`   TEXT           NULL,
  `category`        VARCHAR(100)   NOT NULL DEFAULT 'General',
  `durationHours`   INT            NOT NULL DEFAULT 0,
  `targetAudience`  VARCHAR(255)   NULL,
  `scheduledDate`   DATE           NULL,
  `status`          VARCHAR(20)    NOT NULL DEFAULT 'PLANNED',
  `notes`           TEXT           NULL,
  `createdById`     CHAR(36)       NOT NULL,
  `createdAt`       DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`       DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `deletedAt`       DATETIME(3)    NULL,
  `deletedById`     CHAR(36)       NULL,
  `deleteReason`    VARCHAR(500)   NULL,
  PRIMARY KEY (`id`),
  KEY `HrTrainingProgram_category_status_idx` (`category`, `status`),
  KEY `HrTrainingProgram_deletedAt_idx`       (`deletedAt`),
  CONSTRAINT `HrTrainingProgram_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `HrTrainingProgram_deletedById_fkey` FOREIGN KEY (`deletedById`) REFERENCES `User` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Seed default onboarding tasks ───────────────────────────────────────────
-- Only insert if table is empty
DROP PROCEDURE IF EXISTS seed_onboarding_tasks;
DELIMITER $$
CREATE PROCEDURE seed_onboarding_tasks()
BEGIN
  IF (SELECT COUNT(*) FROM `HrOnboardingTask`) = 0 THEN
    INSERT INTO `HrOnboardingTask` (`id`, `labelEn`, `labelAr`, `sortOrder`, `isRequired`) VALUES
      (UUID(), 'Identity documents collected (Iqama, Passport)', 'استلام وثائق الهوية (الإقامة، جواز السفر)', 1, 1),
      (UUID(), 'Employment contract signed', 'توقيع عقد العمل', 2, 1),
      (UUID(), 'OTS system access granted', 'منح صلاحية الدخول لنظام OTS', 3, 1),
      (UUID(), 'Company email account created', 'إنشاء حساب البريد الإلكتروني الرسمي', 4, 1),
      (UUID(), 'Access badge issued', 'إصدار بطاقة الدخول', 5, 1),
      (UUID(), 'Safety induction completed', 'إتمام التعريف بسلامة العمل', 6, 1),
      (UUID(), 'PPE / Uniform issued', 'تسليم معدات الوقاية / الزي الرسمي', 7, 1),
      (UUID(), 'Bank account / IBAN collected for WPS', 'استلام رقم الحساب البنكي / IBAN لنظام حماية الأجور', 8, 1),
      (UUID(), 'GOSI registration submitted', 'تقديم طلب التسجيل في التأمينات الاجتماعية', 9, 1),
      (UUID(), 'Medical insurance enrolled', 'التسجيل في التأمين الطبي', 10, 1);
  END IF;
END$$
DELIMITER ;
CALL seed_onboarding_tasks();
DROP PROCEDURE IF EXISTS seed_onboarding_tasks;
