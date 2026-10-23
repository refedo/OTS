
# Supplier Qualification Intake — OTS™ Implementation (22 October 2026)

## Starting point
- OTS main SHA `7882b725`, existing supplier pages, ScApprovedSupplier register and Dolibarr-sourced supplier service. Last merged OTS PR #619 excludes the internal OTS host from search indexing.
- Website `rebuild/website-v3` SHA `0964ff92`; independent V3.23 supplier registration feature is isolated in `refedo/hexasteel.sa:feature/v323-supplier-registration`.
- Website R1 documented management estimate 68%; R2 and R3 0%. Supplier code is not production acceptance.

## Planned versus developed
- Separate `ScSupplierApplication` MySQL/Prisma model and additive startup SQL, retaining approved supplier master.
- HMAC-protected, server-to-server public intake, passwordless email code tracking, reference and email verification, capped attempts and resubmission.
- Document uploads: 1–3 PDF files, 2 MB each; PDF header check, private 0700 folder, 0600 files, mandatory ClamAV scan before saving an application, no public file URLs.
- Employee Supply Chain interface for filter/review/decision with permission `supply_chain.manage`, protected download URLs, optimistic conflict rejection, transactional approved-register promotion (not Dolibarr third-party creation).
- New PR-triggerable isolated GitHub Actions tests, Prisma validation, TypeScript and build.

## Deployment activation checklist (no current deployment authorization)
1. Set OTS `SUPPLIER_INTAKE_API_KEY` to a strong independently generated 32+ character secret and same value in website `SUPPLIER_OTS_API_KEY`. Set `SUPPLIER_OTP_SECRET` to different random 32+ characters. Never commit credentials.
2. Configure OTS `SUPPLIER_DOCUMENT_DIR` as a persistent directory outside web root and source tree (root-owned setup, accessible only to dedicated app account); include it in encrypted backup and retention policy. Set absolute `SUPPLIER_CLAMSCAN_PATH` to a functional, continuously updated ClamAV executable. Fail closed if scanning fails.
3. Set OTS `SUPPLIER_MAIL_RESEND_API_KEY`, `SUPPLIER_MAIL_FROM` with verified sending authorization, `SUPPLIER_NOTIFY_EMAIL` with verified operational mailbox.
4. On website set `SUPPLIER_REGISTRATION_ENABLED=true`, `SUPPLIER_OTS_BASE_URL=https://ots.hexasteel.sa`, `SUPPLIER_OTS_API_KEY`, `SUPPLIER_TURNSTILE_SECRET_KEY`, and public `NEXT_PUBLIC_SUPPLIER_TURNSTILE_SITE_KEY`. Turnstile challenge must include hexasteel.sa domain.
5. Ensure nginx / Cloudflare limits request bodies to 9 MB and applies rate limits to public paths; configure outbound HTTPS to Resend and Turnstile. Test file scanning, failure recovery, database backup and rollback after authorized OTS rollout.
6. Verify Supply Chain role permissions; test two-app submission, actual mailbox receipt, code expiry/attempts, resubmission, document retrieval only after employee authorization, and registry creation only on reviewer approval.
7. Supplier **application** and vendor **approval** are distinct. Dolibarr creation is intentionally deferred; no client banking or tax-ID uploads requested.

## Security and acceptance caveats
- OTS public intake must remain disabled until confirmed. Roll back by setting `SUPPLIER_INTAKE_ENABLED=false` and website `SUPPLIER_REGISTRATION_ENABLED=false`, without removing retained records.
- Email notifications are best-effort on received applications; status records are durable. Monitoring/reconciliation of provider failures should be validated before production acceptance.
- HTTPS server-to-server key should be rotateable without downtime; endpoint private key never exposed to browsers.
- TypeScript/build/CI evidence is verified separately. No main merge, no production deployment, no staging domain requested.
- Official programme position unchanged: R1 68%, R2 0%, R3 0%. No claim of operational acceptance.

## 24 October 2026 — Supply Chain navigation follow-up

- Added **Supply Chain → Supplier Applications** entry to the global OTS sidebar with `supply_chain.manage` visibility. Existing Supplier Portal and Approved Suppliers pages already linked to the intake dashboard.
- Added permission and link tests on isolated branch `feature/ots-supplier-applications-sidebar` from OTS main `7b114b85` (PR #620 integrated).
- This change does not modify database schema, deployment settings, vendor master or website main branch. Deployment and acceptance remain separately verified.

- Follow-up product coverage: per-product category retained in the existing JSON products array (backward compatible, no SQL migration), displayed in OTS supplier-review UI. Multi-category supplier registration on website PR #29 depends on this upgrade being deployed first.
