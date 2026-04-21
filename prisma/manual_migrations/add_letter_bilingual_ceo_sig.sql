-- 19.15.1 — Add contentEn to HrLetter (bilingual translation storage)
--           Add ceoSignatureUrl to system_settings (CEO signature image)
--           Widen letterNumber to VARCHAR(100) to support longer serial masks
-- Direct ALTER TABLE approach — no stored procedures (CREATE PROCEDURE fails
-- with error 1295 in Prisma's prepared-statement protocol).
-- Duplicate-column errors (1060) on re-run are caught as non-fatal by the
-- startup migration runner and startup continues normally.

ALTER TABLE HrLetter ADD COLUMN contentEn TEXT NULL;

ALTER TABLE HrLetter MODIFY COLUMN letterNumber VARCHAR(100) NOT NULL;

ALTER TABLE system_settings ADD COLUMN ceoSignatureUrl VARCHAR(1000) NULL;
