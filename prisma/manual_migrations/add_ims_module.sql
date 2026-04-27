-- 22.0.0 — IMS (Integrated Management System) Module
-- Document Control + Risk & Opportunity Register
-- ISO 9001:2015 / ISO 14001:2015 / ISO 45001:2018

-- ──────────────────────────────────────────────────────────────────────────────
-- ImsCategory
-- ──────────────────────────────────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS create_ims_category;
DELIMITER $$
CREATE PROCEDURE create_ims_category()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ImsCategory'
  ) THEN
    CREATE TABLE ImsCategory (
      id          CHAR(36)     NOT NULL PRIMARY KEY,
      code        VARCHAR(10)  NOT NULL UNIQUE,
      name        VARCHAR(100) NOT NULL,
      nameAr      VARCHAR(100),
      level       INT          NOT NULL DEFAULT 1,
      description TEXT,
      isActive    TINYINT(1)   NOT NULL DEFAULT 1,
      createdAt   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updatedAt   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      INDEX idx_ims_cat_code (code),
      INDEX idx_ims_cat_active (isActive)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  END IF;
END$$
DELIMITER ;
CALL create_ims_category();
DROP PROCEDURE IF EXISTS create_ims_category;

-- ──────────────────────────────────────────────────────────────────────────────
-- ImsDocument
-- ──────────────────────────────────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS create_ims_document;
DELIMITER $$
CREATE PROCEDURE create_ims_document()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ImsDocument'
  ) THEN
    CREATE TABLE ImsDocument (
      id                  CHAR(36)     NOT NULL PRIMARY KEY,
      documentNumber      VARCHAR(50)  NOT NULL UNIQUE,
      title               VARCHAR(255) NOT NULL,
      titleAr             VARCHAR(255),
      categoryId          CHAR(36)     NOT NULL,
      departmentId        CHAR(36),
      status              VARCHAR(30)  NOT NULL DEFAULT 'DRAFT',
      currentVersion      VARCHAR(20)  NOT NULL DEFAULT '1.0',
      ownerId             CHAR(36),
      reviewerId          CHAR(36),
      applicableStandards JSON,
      scope               TEXT,
      purpose             TEXT,
      site                VARCHAR(100),
      confidentiality     VARCHAR(20)  NOT NULL DEFAULT 'INTERNAL',
      reviewFrequencyDays INT          NOT NULL DEFAULT 365,
      lastReviewDate      DATETIME(3),
      nextReviewDate      DATETIME(3),
      fileUrl             VARCHAR(512),
      issuedAt            DATETIME(3),
      deletedAt           DATETIME(3),
      deletedById         CHAR(36),
      createdAt           DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updatedAt           DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      createdById         CHAR(36),
      updatedById         CHAR(36),
      INDEX idx_ims_doc_status       (status),
      INDEX idx_ims_doc_category     (categoryId),
      INDEX idx_ims_doc_department   (departmentId),
      INDEX idx_ims_doc_owner        (ownerId),
      INDEX idx_ims_doc_next_review  (nextReviewDate),
      INDEX idx_ims_doc_deleted      (deletedAt),
      CONSTRAINT fk_ims_doc_category   FOREIGN KEY (categoryId)   REFERENCES ImsCategory(id),
      CONSTRAINT fk_ims_doc_dept       FOREIGN KEY (departmentId) REFERENCES Department(id),
      CONSTRAINT fk_ims_doc_owner      FOREIGN KEY (ownerId)      REFERENCES User(id),
      CONSTRAINT fk_ims_doc_reviewer   FOREIGN KEY (reviewerId)   REFERENCES User(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  END IF;
END$$
DELIMITER ;
CALL create_ims_document();
DROP PROCEDURE IF EXISTS create_ims_document;

-- ──────────────────────────────────────────────────────────────────────────────
-- ImsRevision
-- ──────────────────────────────────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS create_ims_revision;
DELIMITER $$
CREATE PROCEDURE create_ims_revision()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ImsRevision'
  ) THEN
    CREATE TABLE ImsRevision (
      id                 CHAR(36)     NOT NULL PRIMARY KEY,
      documentId         CHAR(36)     NOT NULL,
      version            VARCHAR(20)  NOT NULL,
      changeDescription  TEXT,
      changeType         VARCHAR(20)  NOT NULL DEFAULT 'MINOR',
      status             VARCHAR(30)  NOT NULL DEFAULT 'DRAFT',
      fileUrl            VARCHAR(512),
      preparedById       CHAR(36),
      reviewedById       CHAR(36),
      approvedById       CHAR(36),
      effectiveDate      DATETIME(3),
      workflowInstanceId CHAR(36),
      createdAt          DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updatedAt          DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      INDEX idx_ims_rev_doc    (documentId),
      INDEX idx_ims_rev_status (status),
      CONSTRAINT fk_ims_rev_doc      FOREIGN KEY (documentId)   REFERENCES ImsDocument(id) ON DELETE CASCADE,
      CONSTRAINT fk_ims_rev_prepared FOREIGN KEY (preparedById) REFERENCES User(id),
      CONSTRAINT fk_ims_rev_reviewed FOREIGN KEY (reviewedById) REFERENCES User(id),
      CONSTRAINT fk_ims_rev_approved FOREIGN KEY (approvedById) REFERENCES User(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  END IF;
END$$
DELIMITER ;
CALL create_ims_revision();
DROP PROCEDURE IF EXISTS create_ims_revision;

-- ──────────────────────────────────────────────────────────────────────────────
-- ImsDistribution
-- ──────────────────────────────────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS create_ims_distribution;
DELIMITER $$
CREATE PROCEDURE create_ims_distribution()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ImsDistribution'
  ) THEN
    CREATE TABLE ImsDistribution (
      id         CHAR(36)    NOT NULL PRIMARY KEY,
      documentId CHAR(36)    NOT NULL,
      revisionId CHAR(36),
      issuedAt   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      issuedById CHAR(36),
      notes      TEXT,
      createdAt  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updatedAt  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      INDEX idx_ims_dist_doc (documentId),
      CONSTRAINT fk_ims_dist_doc FOREIGN KEY (documentId) REFERENCES ImsDocument(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  END IF;
END$$
DELIMITER ;
CALL create_ims_distribution();
DROP PROCEDURE IF EXISTS create_ims_distribution;

-- ──────────────────────────────────────────────────────────────────────────────
-- ImsDistributionRecipient
-- ──────────────────────────────────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS create_ims_dist_recipient;
DELIMITER $$
CREATE PROCEDURE create_ims_dist_recipient()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ImsDistributionRecipient'
  ) THEN
    CREATE TABLE ImsDistributionRecipient (
      id                CHAR(36)    NOT NULL PRIMARY KEY,
      distributionId    CHAR(36)    NOT NULL,
      userId            CHAR(36)    NOT NULL,
      acknowledgedAt    DATETIME(3),
      acknowledgeMethod VARCHAR(50),
      createdAt         DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updatedAt         DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      UNIQUE KEY uq_ims_dist_user (distributionId, userId),
      INDEX idx_ims_dr_dist (distributionId),
      INDEX idx_ims_dr_user (userId),
      CONSTRAINT fk_ims_dr_dist FOREIGN KEY (distributionId) REFERENCES ImsDistribution(id) ON DELETE CASCADE,
      CONSTRAINT fk_ims_dr_user FOREIGN KEY (userId)         REFERENCES User(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  END IF;
END$$
DELIMITER ;
CALL create_ims_dist_recipient();
DROP PROCEDURE IF EXISTS create_ims_dist_recipient;

-- ──────────────────────────────────────────────────────────────────────────────
-- ImsChangeRequest (DCR)
-- ──────────────────────────────────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS create_ims_change_request;
DELIMITER $$
CREATE PROCEDURE create_ims_change_request()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ImsChangeRequest'
  ) THEN
    CREATE TABLE ImsChangeRequest (
      id                 CHAR(36)     NOT NULL PRIMARY KEY,
      dcrNumber          VARCHAR(50)  NOT NULL UNIQUE,
      title              VARCHAR(255) NOT NULL,
      description        TEXT,
      reason             TEXT,
      documentId         CHAR(36),
      requestedById      CHAR(36)     NOT NULL,
      status             VARCHAR(30)  NOT NULL DEFAULT 'SUBMITTED',
      priority           VARCHAR(20)  NOT NULL DEFAULT 'MEDIUM',
      workflowInstanceId CHAR(36),
      deletedAt          DATETIME(3),
      createdAt          DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updatedAt          DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      INDEX idx_ims_dcr_status    (status),
      INDEX idx_ims_dcr_doc       (documentId),
      INDEX idx_ims_dcr_requester (requestedById),
      INDEX idx_ims_dcr_deleted   (deletedAt),
      CONSTRAINT fk_ims_dcr_doc       FOREIGN KEY (documentId)    REFERENCES ImsDocument(id),
      CONSTRAINT fk_ims_dcr_requester FOREIGN KEY (requestedById) REFERENCES User(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  END IF;
END$$
DELIMITER ;
CALL create_ims_change_request();
DROP PROCEDURE IF EXISTS create_ims_change_request;

-- ──────────────────────────────────────────────────────────────────────────────
-- ImsClause
-- ──────────────────────────────────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS create_ims_clause;
DELIMITER $$
CREATE PROCEDURE create_ims_clause()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ImsClause'
  ) THEN
    CREATE TABLE ImsClause (
      id        CHAR(36)     NOT NULL PRIMARY KEY,
      standard  VARCHAR(20)  NOT NULL,
      clause    VARCHAR(20)  NOT NULL,
      title     VARCHAR(255) NOT NULL,
      titleAr   VARCHAR(255),
      parentId  CHAR(36),
      level     INT          NOT NULL DEFAULT 1,
      isActive  TINYINT(1)   NOT NULL DEFAULT 1,
      createdAt DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updatedAt DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      UNIQUE KEY uq_ims_clause_std_num (standard, clause),
      INDEX idx_ims_clause_standard (standard),
      INDEX idx_ims_clause_parent   (parentId),
      CONSTRAINT fk_ims_clause_parent FOREIGN KEY (parentId) REFERENCES ImsClause(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  END IF;
END$$
DELIMITER ;
CALL create_ims_clause();
DROP PROCEDURE IF EXISTS create_ims_clause;

-- ──────────────────────────────────────────────────────────────────────────────
-- ImsClauseMapping
-- ──────────────────────────────────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS create_ims_clause_mapping;
DELIMITER $$
CREATE PROCEDURE create_ims_clause_mapping()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ImsClauseMapping'
  ) THEN
    CREATE TABLE ImsClauseMapping (
      id         CHAR(36)    NOT NULL PRIMARY KEY,
      clauseId   CHAR(36)    NOT NULL,
      documentId CHAR(36)    NOT NULL,
      notes      TEXT,
      createdAt  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updatedAt  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      UNIQUE KEY uq_ims_mapping (clauseId, documentId),
      INDEX idx_ims_mapping_clause (clauseId),
      INDEX idx_ims_mapping_doc    (documentId),
      CONSTRAINT fk_ims_mapping_clause FOREIGN KEY (clauseId)   REFERENCES ImsClause(id)   ON DELETE CASCADE,
      CONSTRAINT fk_ims_mapping_doc    FOREIGN KEY (documentId) REFERENCES ImsDocument(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  END IF;
END$$
DELIMITER ;
CALL create_ims_clause_mapping();
DROP PROCEDURE IF EXISTS create_ims_clause_mapping;

-- ──────────────────────────────────────────────────────────────────────────────
-- ImsRisk
-- ──────────────────────────────────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS create_ims_risk;
DELIMITER $$
CREATE PROCEDURE create_ims_risk()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ImsRisk'
  ) THEN
    CREATE TABLE ImsRisk (
      id                  CHAR(36)     NOT NULL PRIMARY KEY,
      riskNumber          VARCHAR(50)  NOT NULL UNIQUE,
      type                VARCHAR(20)  NOT NULL DEFAULT 'RISK',
      title               VARCHAR(255) NOT NULL,
      titleAr             VARCHAR(255),
      description         TEXT,
      source              VARCHAR(255),
      applicableStandards JSON,
      category            VARCHAR(50)  NOT NULL,
      status              VARCHAR(30)  NOT NULL DEFAULT 'OPEN',
      ownerId             CHAR(36),
      departmentId        CHAR(36),
      currentLikelihood   INT          NOT NULL DEFAULT 1,
      currentSeverity     INT          NOT NULL DEFAULT 1,
      currentRiskLevel    INT          NOT NULL DEFAULT 1,
      currentRiskRating   VARCHAR(20)  NOT NULL DEFAULT 'LOW',
      reviewFrequencyDays INT          NOT NULL DEFAULT 90,
      nextReviewDate      DATETIME(3),
      lastReviewDate      DATETIME(3),
      deletedAt           DATETIME(3),
      deletedById         CHAR(36),
      createdAt           DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updatedAt           DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      createdById         CHAR(36),
      updatedById         CHAR(36),
      INDEX idx_ims_risk_type       (type),
      INDEX idx_ims_risk_status     (status),
      INDEX idx_ims_risk_category   (category),
      INDEX idx_ims_risk_rating     (currentRiskRating),
      INDEX idx_ims_risk_owner      (ownerId),
      INDEX idx_ims_risk_dept       (departmentId),
      INDEX idx_ims_risk_review     (nextReviewDate),
      INDEX idx_ims_risk_deleted    (deletedAt),
      CONSTRAINT fk_ims_risk_owner  FOREIGN KEY (ownerId)      REFERENCES User(id),
      CONSTRAINT fk_ims_risk_dept   FOREIGN KEY (departmentId) REFERENCES Department(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  END IF;
END$$
DELIMITER ;
CALL create_ims_risk();
DROP PROCEDURE IF EXISTS create_ims_risk;

-- ──────────────────────────────────────────────────────────────────────────────
-- ImsRiskAssessment
-- ──────────────────────────────────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS create_ims_risk_assessment;
DELIMITER $$
CREATE PROCEDURE create_ims_risk_assessment()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ImsRiskAssessment'
  ) THEN
    CREATE TABLE ImsRiskAssessment (
      id               CHAR(36)    NOT NULL PRIMARY KEY,
      riskId           CHAR(36)    NOT NULL,
      likelihood       INT         NOT NULL,
      severity         INT         NOT NULL,
      riskLevel        INT         NOT NULL,
      riskRating       VARCHAR(20) NOT NULL,
      assessmentType   VARCHAR(30) NOT NULL DEFAULT 'PERIODIC',
      existingControls TEXT,
      recommendations  TEXT,
      assessedById     CHAR(36),
      createdAt        DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updatedAt        DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      INDEX idx_ims_ra_risk (riskId),
      CONSTRAINT fk_ims_ra_risk     FOREIGN KEY (riskId)      REFERENCES ImsRisk(id) ON DELETE CASCADE,
      CONSTRAINT fk_ims_ra_assessor FOREIGN KEY (assessedById) REFERENCES User(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  END IF;
END$$
DELIMITER ;
CALL create_ims_risk_assessment();
DROP PROCEDURE IF EXISTS create_ims_risk_assessment;

-- ──────────────────────────────────────────────────────────────────────────────
-- ImsRiskTreatment
-- ──────────────────────────────────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS create_ims_risk_treatment;
DELIMITER $$
CREATE PROCEDURE create_ims_risk_treatment()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ImsRiskTreatment'
  ) THEN
    CREATE TABLE ImsRiskTreatment (
      id            CHAR(36)    NOT NULL PRIMARY KEY,
      riskId        CHAR(36)    NOT NULL,
      treatmentType VARCHAR(30) NOT NULL,
      description   TEXT,
      responsibleId CHAR(36),
      targetDate    DATETIME(3),
      completedDate DATETIME(3),
      status        VARCHAR(20) NOT NULL DEFAULT 'PLANNED',
      effectiveness VARCHAR(20),
      notes         TEXT,
      createdAt     DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updatedAt     DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      INDEX idx_ims_rt_risk        (riskId),
      INDEX idx_ims_rt_status      (status),
      INDEX idx_ims_rt_responsible (responsibleId),
      CONSTRAINT fk_ims_rt_risk        FOREIGN KEY (riskId)        REFERENCES ImsRisk(id) ON DELETE CASCADE,
      CONSTRAINT fk_ims_rt_responsible FOREIGN KEY (responsibleId) REFERENCES User(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  END IF;
END$$
DELIMITER ;
CALL create_ims_risk_treatment();
DROP PROCEDURE IF EXISTS create_ims_risk_treatment;

-- ──────────────────────────────────────────────────────────────────────────────
-- ImsHazardIdentification
-- ──────────────────────────────────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS create_ims_hazard;
DELIMITER $$
CREATE PROCEDURE create_ims_hazard()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ImsHazardIdentification'
  ) THEN
    CREATE TABLE ImsHazardIdentification (
      id                CHAR(36)     NOT NULL PRIMARY KEY,
      riskId            CHAR(36)     NOT NULL,
      hazardType        VARCHAR(30)  NOT NULL,
      hazardDescription TEXT,
      location          VARCHAR(255),
      affectedPersonnel VARCHAR(255),
      controlHierarchy  VARCHAR(30)  NOT NULL,
      controlMeasures   TEXT,
      createdAt         DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updatedAt         DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      INDEX idx_ims_hazard_risk (riskId),
      CONSTRAINT fk_ims_hazard_risk FOREIGN KEY (riskId) REFERENCES ImsRisk(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  END IF;
END$$
DELIMITER ;
CALL create_ims_hazard();
DROP PROCEDURE IF EXISTS create_ims_hazard;
