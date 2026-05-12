-- Add deleteReason column to SubcontractorPaymentCertificate for soft-delete justification.

DELIMITER $$

DROP PROCEDURE IF EXISTS add_sc_cert_delete_reason$$

CREATE PROCEDURE add_sc_cert_delete_reason()
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME   = 'SubcontractorPaymentCertificate'
          AND COLUMN_NAME  = 'deleteReason'
    ) THEN
        ALTER TABLE `SubcontractorPaymentCertificate`
            ADD COLUMN `deleteReason` VARCHAR(500) NULL AFTER `deletedById`;
    END IF;
END$$

DELIMITER ;

CALL add_sc_cert_delete_reason();
DROP PROCEDURE IF EXISTS add_sc_cert_delete_reason;
