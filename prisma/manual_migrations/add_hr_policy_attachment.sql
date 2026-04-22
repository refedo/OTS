-- 19.16.6 — Add attachmentUrl to HrPolicy for PDF uploads (idempotent)
-- Add seed default policies

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'HrPolicy' AND COLUMN_NAME = 'attachmentUrl');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE HrPolicy ADD COLUMN attachmentUrl VARCHAR(1000) NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Seed default company policies (idempotent — skip if titleEn already exists)
INSERT IGNORE INTO HrPolicy (id, titleEn, titleAr, contentEn, contentAr, category, version, effectiveDate, status, createdById, createdAt, updatedAt)
SELECT UUID(), 'Annual Leave Policy', 'سياسة الإجازة السنوية',
  'Employees are entitled to annual leave as per Saudi Labor Law Article 109. Full-time employees receive 21 calendar days of paid annual leave after completing one year of service, increasing to 30 days after five consecutive years. Leave requests must be submitted at least 14 days in advance through the OTS system and approved by the direct manager. Unused leave days may be carried forward as per company policy. Employees may not waive their annual leave entitlement for monetary compensation while still employed.',
  'يحق للموظفين الحصول على إجازة سنوية وفقاً لنظام العمل السعودي المادة 109. يحصل الموظفون بدوام كامل على 21 يوماً تقويمياً من الإجازة السنوية المدفوعة بعد إكمال سنة واحدة من الخدمة، وتزداد إلى 30 يوماً بعد خمس سنوات متتالية.',
  'HR', 'v1.0', CURDATE(), 'ACTIVE', (SELECT id FROM User WHERE role_id = (SELECT id FROM Role WHERE name = 'Admin') LIMIT 1), NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM HrPolicy WHERE titleEn = 'Annual Leave Policy' AND deletedAt IS NULL);

INSERT IGNORE INTO HrPolicy (id, titleEn, titleAr, contentEn, contentAr, category, version, effectiveDate, status, createdById, createdAt, updatedAt)
SELECT UUID(), 'Code of Conduct', 'مدونة السلوك المهني',
  'All employees must maintain the highest standards of professional conduct. This includes treating colleagues, clients, and stakeholders with respect and dignity. Harassment, discrimination, and bullying of any kind will not be tolerated. Employees must avoid conflicts of interest and maintain confidentiality of company information. Violations may result in disciplinary action up to and including termination.',
  'يجب على جميع الموظفين الحفاظ على أعلى معايير السلوك المهني. يشمل ذلك معاملة الزملاء والعملاء وأصحاب المصلحة باحترام وكرامة.',
  'Conduct', 'v1.0', CURDATE(), 'ACTIVE', (SELECT id FROM User WHERE role_id = (SELECT id FROM Role WHERE name = 'Admin') LIMIT 1), NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM HrPolicy WHERE titleEn = 'Code of Conduct' AND deletedAt IS NULL);

INSERT IGNORE INTO HrPolicy (id, titleEn, titleAr, contentEn, contentAr, category, version, effectiveDate, status, createdById, createdAt, updatedAt)
SELECT UUID(), 'Workplace Safety Policy', 'سياسة السلامة في مكان العمل',
  'Hexa Steel is committed to providing a safe working environment for all employees. All staff must comply with safety regulations, wear appropriate PPE in designated areas, report hazards immediately, and participate in safety training. Steel fabrication areas require mandatory hard hats, safety boots, gloves, and eye protection. Failure to comply with safety protocols may result in disciplinary action.',
  'تلتزم هكسا ستيل بتوفير بيئة عمل آمنة لجميع الموظفين. يجب على جميع الموظفين الامتثال لأنظمة السلامة وارتداء معدات الحماية الشخصية المناسبة.',
  'Safety', 'v1.0', CURDATE(), 'ACTIVE', (SELECT id FROM User WHERE role_id = (SELECT id FROM Role WHERE name = 'Admin') LIMIT 1), NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM HrPolicy WHERE titleEn = 'Workplace Safety Policy' AND deletedAt IS NULL);

INSERT IGNORE INTO HrPolicy (id, titleEn, titleAr, contentEn, contentAr, category, version, effectiveDate, status, createdById, createdAt, updatedAt)
SELECT UUID(), 'IT Security & Acceptable Use Policy', 'سياسة أمن المعلومات والاستخدام المقبول',
  'Company IT resources including computers, email, and network access are provided for business purposes. Employees must use strong passwords, enable two-factor authentication where available, and never share credentials. Unauthorized software installation is prohibited. Company data must not be stored on personal devices without IT approval. Report any suspected security incidents to IT immediately.',
  'يتم توفير موارد تقنية المعلومات بما في ذلك أجهزة الكمبيوتر والبريد الإلكتروني والوصول إلى الشبكة لأغراض العمل.',
  'IT', 'v1.0', CURDATE(), 'ACTIVE', (SELECT id FROM User WHERE role_id = (SELECT id FROM Role WHERE name = 'Admin') LIMIT 1), NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM HrPolicy WHERE titleEn = 'IT Security & Acceptable Use Policy' AND deletedAt IS NULL);

INSERT IGNORE INTO HrPolicy (id, titleEn, titleAr, contentEn, contentAr, category, version, effectiveDate, status, createdById, createdAt, updatedAt)
SELECT UUID(), 'Expense Reimbursement Policy', 'سياسة تعويض المصاريف',
  'Employees may claim reimbursement for legitimate business expenses. All claims must be submitted within 30 days with original receipts. Pre-approval is required for expenses exceeding SAR 500. Travel, accommodation, and meal allowances follow the company rate schedule. Claims are processed in the next payroll cycle after approval.',
  'يمكن للموظفين المطالبة بتعويض المصاريف التجارية المشروعة. يجب تقديم جميع المطالبات خلال 30 يوماً مع الإيصالات الأصلية.',
  'Finance', 'v1.0', CURDATE(), 'ACTIVE', (SELECT id FROM User WHERE role_id = (SELECT id FROM Role WHERE name = 'Admin') LIMIT 1), NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM HrPolicy WHERE titleEn = 'Expense Reimbursement Policy' AND deletedAt IS NULL);

INSERT IGNORE INTO HrPolicy (id, titleEn, titleAr, contentEn, contentAr, category, version, effectiveDate, status, createdById, createdAt, updatedAt)
SELECT UUID(), 'Attendance & Working Hours Policy', 'سياسة الحضور وساعات العمل',
  'Standard working hours are 8 hours per day, 6 days per week (48 hours/week) as per Saudi Labor Law. During Ramadan, Muslim employees work 6 hours per day. Employees must clock in/out using the designated attendance system. Tardiness of more than 15 minutes requires manager notification. Three unexcused absences in one month may trigger disciplinary procedures.',
  'ساعات العمل القياسية هي 8 ساعات يومياً، 6 أيام في الأسبوع (48 ساعة/أسبوع) وفقاً لنظام العمل السعودي.',
  'HR', 'v1.0', CURDATE(), 'ACTIVE', (SELECT id FROM User WHERE role_id = (SELECT id FROM Role WHERE name = 'Admin') LIMIT 1), NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM HrPolicy WHERE titleEn = 'Attendance & Working Hours Policy' AND deletedAt IS NULL);

INSERT IGNORE INTO HrPolicy (id, titleEn, titleAr, contentEn, contentAr, category, version, effectiveDate, status, createdById, createdAt, updatedAt)
SELECT UUID(), 'End of Service Benefits Policy', 'سياسة مكافأة نهاية الخدمة',
  'End of service award is calculated per Saudi Labor Law Articles 84-86. Employees completing 2+ years receive one-third of monthly wage per year for the first five years, and half a monthly wage per year thereafter. Full award is granted upon resignation after 10+ years or upon termination. The calculation is based on the last actual wage including all allowances.',
  'يتم احتساب مكافأة نهاية الخدمة وفقاً لنظام العمل السعودي المواد 84-86.',
  'HR', 'v1.0', CURDATE(), 'ACTIVE', (SELECT id FROM User WHERE role_id = (SELECT id FROM Role WHERE name = 'Admin') LIMIT 1), NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM HrPolicy WHERE titleEn = 'End of Service Benefits Policy' AND deletedAt IS NULL);

INSERT IGNORE INTO HrPolicy (id, titleEn, titleAr, contentEn, contentAr, category, version, effectiveDate, status, createdById, createdAt, updatedAt)
SELECT UUID(), 'Anti-Corruption & Bribery Policy', 'سياسة مكافحة الفساد والرشوة',
  'Hexa Steel has zero tolerance for corruption and bribery. Employees must not offer, give, solicit, or accept any form of bribe or kickback. Gifts from business partners exceeding SAR 200 in value must be declared to management. Employees must report any suspected corruption through the confidential reporting channel. Whistleblower protections apply to all good-faith reports.',
  'تتبنى هكسا ستيل سياسة عدم التسامح مع الفساد والرشوة.',
  'Conduct', 'v1.0', CURDATE(), 'ACTIVE', (SELECT id FROM User WHERE role_id = (SELECT id FROM Role WHERE name = 'Admin') LIMIT 1), NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM HrPolicy WHERE titleEn = 'Anti-Corruption & Bribery Policy' AND deletedAt IS NULL);
