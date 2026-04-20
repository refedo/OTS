-- 19.13.0 — Multi-template onboarding checklists
-- Adds HrOnboardingChecklist and links HrOnboardingTask to it.
-- Seeds 3 default checklists (General, Office & Admin, Production & Site).
-- Migrates any orphan tasks (no checklistId) into the General checklist.

-- ─── HrOnboardingChecklist table ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `HrOnboardingChecklist` (
  `id`           CHAR(36)      NOT NULL,
  `nameEn`       VARCHAR(255)  NOT NULL,
  `nameAr`       VARCHAR(255)  NULL,
  `description`  TEXT          NULL,
  `forPositions` TEXT          NULL,
  `isDefault`    TINYINT(1)    NOT NULL DEFAULT 0,
  `isActive`     TINYINT(1)    NOT NULL DEFAULT 1,
  `sortOrder`    INT           NOT NULL DEFAULT 0,
  `createdAt`    DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`    DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_checklist_active_sort` (`isActive`, `sortOrder`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Add checklistId to HrOnboardingTask ─────────────────────────────────────
DROP PROCEDURE IF EXISTS add_checklist_id_col;
DELIMITER $$
CREATE PROCEDURE add_checklist_id_col()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'HrOnboardingTask'
      AND COLUMN_NAME  = 'checklistId'
  ) THEN
    ALTER TABLE `HrOnboardingTask` ADD COLUMN `checklistId` CHAR(36) NULL AFTER `id`;
    ALTER TABLE `HrOnboardingTask` ADD KEY `idx_task_checklist_active_sort` (`checklistId`, `isActive`, `sortOrder`);
  END IF;
END$$
DELIMITER ;
CALL add_checklist_id_col();
DROP PROCEDURE IF EXISTS add_checklist_id_col;

-- ─── Seed checklists + tasks ──────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS seed_onboarding_checklists;
DELIMITER $$
CREATE PROCEDURE seed_onboarding_checklists()
BEGIN
  DECLARE gen_id  CHAR(36);
  DECLARE off_id  CHAR(36);
  DECLARE pro_id  CHAR(36);

  IF (SELECT COUNT(*) FROM `HrOnboardingChecklist`) = 0 THEN

    SET gen_id = UUID();
    SET off_id = UUID();
    SET pro_id = UUID();

    INSERT INTO `HrOnboardingChecklist`
      (`id`, `nameEn`, `nameAr`, `description`, `forPositions`, `isDefault`, `isActive`, `sortOrder`)
    VALUES
      (gen_id, 'General Onboarding', 'الإجراءات العامة للتوظيف',
       'Standard checklist for all new employees', NULL, 1, 1, 1),
      (off_id, 'Office & Admin', 'الإداريون والمكتبيون',
       'Checklist for office, administrative and engineering staff',
       '["Administrator","HR Officer","Accountant","Secretary","Coordinator","Office Manager","Project Manager","Engineer","Safety Officer","Planner","Estimator"]',
       0, 1, 2),
      (pro_id, 'Production & Site', 'الإنتاج والموقع',
       'Checklist for production, fabrication and site workers',
       '["Fabricator","Welder","Fitter","Rigger","Foreman","Supervisor","Painter","QC Inspector","Helper","Operator","Driver","Blaster"]',
       0, 1, 3);

    -- General checklist tasks (10 items)
    INSERT INTO `HrOnboardingTask`
      (`id`, `checklistId`, `labelEn`, `labelAr`, `description`, `sortOrder`, `isRequired`, `isActive`)
    VALUES
      (UUID(), gen_id, 'Identity documents collected (Iqama, Passport)',
       'استلام وثائق الهوية (الإقامة، جواز السفر)', 'Collect and verify all identity documents', 1, 1, 1),
      (UUID(), gen_id, 'Employment contract signed',
       'توقيع عقد العمل', 'Ensure contract is signed by both parties', 2, 1, 1),
      (UUID(), gen_id, 'OTS system access granted',
       'منح صلاحية الدخول لنظام OTS', 'Create user account with appropriate role', 3, 1, 1),
      (UUID(), gen_id, 'Safety induction completed',
       'إتمام التعريف بسلامة العمل', 'Mandatory safety briefing for all staff', 4, 1, 1),
      (UUID(), gen_id, 'Access badge issued',
       'إصدار بطاقة الدخول', 'Gate and facility access badge', 5, 1, 1),
      (UUID(), gen_id, 'Bank account / IBAN collected for WPS',
       'استلام رقم الحساب البنكي / IBAN لنظام حماية الأجور', 'Required for payroll processing', 6, 1, 1),
      (UUID(), gen_id, 'GOSI registration submitted',
       'تقديم طلب التسجيل في التأمينات الاجتماعية', 'GOSI enrollment within first month', 7, 1, 1),
      (UUID(), gen_id, 'Medical insurance enrolled',
       'التسجيل في التأمين الطبي', 'Add employee to company medical plan', 8, 1, 1),
      (UUID(), gen_id, 'Emergency contact information recorded',
       'تسجيل معلومات الاتصال في حالات الطوارئ', 'Next of kin details stored in system', 9, 0, 1),
      (UUID(), gen_id, 'Employee photo taken and uploaded',
       'التقاط صورة الموظف ورفعها', 'For ID badge and employee record', 10, 0, 1);

    -- Office & Admin tasks (8 items)
    INSERT INTO `HrOnboardingTask`
      (`id`, `checklistId`, `labelEn`, `labelAr`, `description`, `sortOrder`, `isRequired`, `isActive`)
    VALUES
      (UUID(), off_id, 'Company email account created',
       'إنشاء حساب البريد الإلكتروني الرسمي', 'Set up corporate email address', 1, 1, 1),
      (UUID(), off_id, 'Laptop / workstation assigned',
       'تخصيص جهاز الحاسوب', 'Issue and log equipment in asset registry', 2, 1, 1),
      (UUID(), off_id, 'Software tools access configured',
       'تهيئة صلاحيات أدوات البرمجيات', 'MS Office, ERP, communication tools', 3, 1, 1),
      (UUID(), off_id, 'HR system orientation completed',
       'استكمال التوجيه على نظام الموارد البشرية', 'Walkthrough of OTS HR and leaves module', 4, 1, 1),
      (UUID(), off_id, 'Meeting with direct manager scheduled',
       'جدولة اجتماع مع المدير المباشر', 'Initial one-on-one orientation meeting', 5, 1, 1),
      (UUID(), off_id, 'IT security policy acknowledged',
       'الإقرار بسياسة أمن المعلومات', 'Sign IT acceptable use policy', 6, 1, 1),
      (UUID(), off_id, 'Organizational chart reviewed',
       'مراجعة الهيكل التنظيمي', 'Understand reporting lines and departments', 7, 0, 1),
      (UUID(), off_id, 'Office tour completed',
       'جولة تعريفية في المكتب', 'Facility walkthrough including prayer rooms and cafeteria', 8, 0, 1);

    -- Production & Site tasks (10 items)
    INSERT INTO `HrOnboardingTask`
      (`id`, `checklistId`, `labelEn`, `labelAr`, `description`, `sortOrder`, `isRequired`, `isActive`)
    VALUES
      (UUID(), pro_id, 'PPE issued (helmet, vest, gloves, boots)',
       'توزيع معدات الحماية الشخصية (خوذة، سترة، قفازات، أحذية)', 'All PPE items logged and signed for', 1, 1, 1),
      (UUID(), pro_id, 'Site safety induction completed',
       'استكمال توجيه السلامة الميدانية', 'Mandatory site-specific safety briefing', 2, 1, 1),
      (UUID(), pro_id, 'Work area and station assigned',
       'تخصيص منطقة العمل والمحطة', 'Physical workspace and tools assigned', 3, 1, 1),
      (UUID(), pro_id, 'Supervisor introduction completed',
       'تقديم الموظف لمشرفه', 'Introduced to direct supervisor and team', 4, 1, 1),
      (UUID(), pro_id, 'Attendance machine registered (fingerprint)',
       'تسجيل بصمة الإصبع في جهاز الحضور', 'Biometric enrollment for attendance tracking', 5, 1, 1),
      (UUID(), pro_id, 'Emergency procedures briefing',
       'إحاطة بإجراءات الطوارئ', 'Fire exits, assembly points, first aid location', 6, 1, 1),
      (UUID(), pro_id, 'Uniform / workwear issued',
       'تسليم الزي الرسمي / ملابس العمل', 'Company uniform issued and logged', 7, 0, 1),
      (UUID(), pro_id, 'Tools and equipment familiarization',
       'التعريف بالأدوات والمعدات', 'Walkthrough of machinery and equipment usage', 8, 1, 1),
      (UUID(), pro_id, 'Quality standards briefing',
       'إحاطة بمعايير الجودة', 'Steel fabrication quality and QC requirements', 9, 0, 1),
      (UUID(), pro_id, 'Shift schedule confirmed',
       'تأكيد جدول الوردية', 'Working hours, shift rotations, overtime policy', 10, 1, 1);

    -- Migrate any orphan tasks (from previous migration seed) into General checklist
    UPDATE `HrOnboardingTask` SET `checklistId` = gen_id WHERE `checklistId` IS NULL;

  END IF;
END$$
DELIMITER ;
CALL seed_onboarding_checklists();
DROP PROCEDURE IF EXISTS seed_onboarding_checklists;
