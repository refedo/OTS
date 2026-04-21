-- 19.16.0 — HrLetterTemplate: per-type reason/subject/body templates
--           HrCirculation + HrCirculationRecipient: multi-recipient broadcast letters

DROP PROCEDURE IF EXISTS add_hr_letter_templates_circulations;
DELIMITER $$
CREATE PROCEDURE add_hr_letter_templates_circulations()
BEGIN
  -- HrLetterTemplate
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'HrLetterTemplate'
  ) THEN
    CREATE TABLE HrLetterTemplate (
      id         CHAR(36)     NOT NULL,
      letterType VARCHAR(50)  NOT NULL,
      reasonCode VARCHAR(80)  NOT NULL,
      subjectAr  VARCHAR(500) NOT NULL,
      subjectEn  VARCHAR(500) NOT NULL,
      bodyAr     TEXT         NULL,
      bodyEn     TEXT         NULL,
      sortOrder  INT          NOT NULL DEFAULT 0,
      isActive   TINYINT(1)   NOT NULL DEFAULT 1,
      createdAt  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updatedAt  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id),
      INDEX idx_HrLetterTemplate_letterType (letterType)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  END IF;

  -- HrCirculation
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'HrCirculation'
  ) THEN
    CREATE TABLE HrCirculation (
      id                CHAR(36)     NOT NULL,
      circulationNumber VARCHAR(30)  NOT NULL,
      subject           VARCHAR(500) NOT NULL,
      subjectEn         VARCHAR(500) NULL,
      content           TEXT         NULL,
      contentEn         TEXT         NULL,
      language          VARCHAR(20)  NOT NULL DEFAULT 'ARABIC',
      status            VARCHAR(20)  NOT NULL DEFAULT 'PENDING_CEO',
      targetType        VARCHAR(20)  NOT NULL DEFAULT 'ALL',
      attachmentUrl     VARCHAR(1000) NULL,
      issuedAt          DATE         NOT NULL,
      notes             VARCHAR(500) NULL,
      approvedById      CHAR(36)     NULL,
      approvedAt        DATETIME(3)  NULL,
      rejectedById      CHAR(36)     NULL,
      rejectedAt        DATETIME(3)  NULL,
      rejectionReason   VARCHAR(500) NULL,
      createdById       CHAR(36)     NOT NULL,
      createdAt         DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updatedAt         DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      deletedAt         DATETIME(3)  NULL,
      deletedById       CHAR(36)     NULL,
      PRIMARY KEY (id),
      UNIQUE KEY uq_HrCirculation_number (circulationNumber),
      INDEX idx_HrCirculation_status (status),
      INDEX idx_HrCirculation_deletedAt (deletedAt)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  END IF;

  -- HrCirculationRecipient
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'HrCirculationRecipient'
  ) THEN
    CREATE TABLE HrCirculationRecipient (
      id             CHAR(36)    NOT NULL,
      circulationId  CHAR(36)    NOT NULL,
      employeeId     CHAR(36)    NULL,
      departmentId   CHAR(36)    NULL,
      readAt         DATETIME(3) NULL,
      createdAt      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id),
      INDEX idx_HrCirculationRecipient_circ (circulationId),
      INDEX idx_HrCirculationRecipient_emp (employeeId),
      INDEX idx_HrCirculationRecipient_dept (departmentId),
      CONSTRAINT fk_HrCircRecipient_circ FOREIGN KEY (circulationId) REFERENCES HrCirculation (id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  END IF;

  -- Seed built-in templates (idempotent: only insert if table is empty)
  IF (SELECT COUNT(*) FROM HrLetterTemplate) = 0 THEN
    -- ATTENTION letter reasons
    INSERT INTO HrLetterTemplate (id, letterType, reasonCode, subjectAr, subjectEn, bodyAr, bodyEn, sortOrder) VALUES
    (UUID(), 'ATTENTION', 'TASK_DELAY',
      'تنبيه: تأخر في إنجاز المهام',
      'Attention: Delay in Task Completion',
      'بناءً على متابعة سير العمل، لوحظ تأخر في إنجاز المهام المسندة إليكم والمفصلة أدناه. نأمل منكم الاهتمام بإنجاز هذه المهام في أقرب وقت ممكن والتواصل مع مشرفكم المباشر.',
      'Based on our work monitoring, we have noted a delay in completing the tasks assigned to you as detailed below. We kindly ask you to prioritize completing these tasks at the earliest opportunity and coordinate with your direct supervisor.',
      1),
    (UUID(), 'ATTENTION', 'ATTENDANCE',
      'تنبيه: انتظام الحضور والانصراف',
      'Attention: Attendance Regularity',
      'نود لفت انتباهكم إلى أهمية الالتزام بمواعيد الحضور والانصراف المحددة. يُرجى الانتظام في الدوام وإشعار الإدارة مسبقاً في حال وجود أي ظروف طارئة.',
      'We would like to draw your attention to the importance of adhering to the designated work hours. Please ensure regular attendance and notify management in advance should any exceptional circumstances arise.',
      2),
    (UUID(), 'ATTENTION', 'CONDUCT',
      'تنبيه: السلوك الوظيفي',
      'Attention: Professional Conduct',
      'وردت إلى إدارة الموارد البشرية ملاحظات بشأن السلوك الوظيفي. نحثكم على الالتزام بميثاق الشرف المهني وأخلاقيات العمل المعمول بها في المؤسسة.',
      'The HR department has received observations regarding your professional conduct. We urge you to adhere to the professional code of ethics and work standards of the organization.',
      3),
    -- FIRST_WARNING reasons
    (UUID(), 'FIRST_WARNING', 'TASK_DELAY',
      'إنذار أول: تأخر متكرر في إنجاز المهام',
      'First Warning: Repeated Delay in Task Completion',
      'استناداً إلى سجلات الأداء، يتبيّن تكرار التأخر في إنجاز المهام المسندة إليكم رغم التنبيهات السابقة. هذا الإنذار الأول ويُعدّ قيداً رسمياً في ملفكم الوظيفي.',
      'Based on performance records, repeated delays in completing assigned tasks have been noted despite previous warnings. This is a formal first warning and will be recorded in your employment file.',
      1),
    (UUID(), 'FIRST_WARNING', 'ATTENDANCE',
      'إنذار أول: تكرار التغيب بدون إذن',
      'First Warning: Repeated Unauthorized Absence',
      'ثبت لدى إدارة الموارد البشرية تكراركم للتغيب عن العمل دون إذن مسبق. يُعدّ هذا إنذاراً أولاً رسمياً.',
      'The HR department has confirmed repeated unauthorized absences from work. This constitutes a formal first warning.',
      2),
    -- FINAL_WARNING reasons
    (UUID(), 'FINAL_WARNING', 'TASK_DELAY',
      'إنذار أخير: إخفاق مستمر في إنجاز المهام',
      'Final Warning: Continued Failure to Complete Tasks',
      'على الرغم من الإنذارات السابقة، لا يزال الأداء الوظيفي دون المستوى المطلوب. هذا إنذار أخير وأي تقصير إضافي سيستوجب اتخاذ الإجراءات التأديبية المناسبة.',
      'Despite previous warnings, your performance continues to fall below the required standards. This is a final warning; any further negligence will result in appropriate disciplinary action.',
      1),
    -- QUESTIONING reasons
    (UUID(), 'QUESTIONING', 'TASK_DELAY',
      'استفسار: أسباب التأخر في إنجاز المهام',
      'Query: Reasons for Delay in Task Completion',
      'يُرجى تقديم إفادتكم الخطية خلال 48 ساعة من استلام هذا الخطاب موضحاً فيها الأسباب التي أدت إلى التأخر في إنجاز المهام المذكورة أدناه.',
      'Please submit your written explanation within 48 hours of receiving this letter, clearly stating the reasons for the delay in completing the tasks mentioned below.',
      1),
    (UUID(), 'QUESTIONING', 'CONDUCT',
      'استفسار: توضيح بشأن الواقعة',
      'Query: Clarification Regarding the Incident',
      'تُطلب منكم إفادة خطية خلال 48 ساعة من استلام هذا الخطاب توضح فيها ملابسات الواقعة المشار إليها.',
      'A written statement is required from you within 48 hours of receiving this letter explaining the circumstances of the referenced incident.',
      2);
  END IF;
END$$
DELIMITER ;
CALL add_hr_letter_templates_circulations();
DROP PROCEDURE IF EXISTS add_hr_letter_templates_circulations;
