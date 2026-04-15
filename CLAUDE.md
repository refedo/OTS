# Hexa Steel® OTS — Claude Code Guidelines

## Project Overview
Enterprise ERP for steel fabrication projects. Next.js 15 App Router + TypeScript + Prisma + MySQL.
Deployed at `hexasteel.sa/ots` with optional `NEXT_PUBLIC_BASE_PATH` subpath.
**Current version:** `18.11.0` — **Minor:** Notification & Announcement System. Ships three new Prisma models (`Announcement`, `AnnouncementTarget`, `AnnouncementDismissal`) + idempotent migration `prisma/manual_migrations/add_announcements.sql`. Announcements are created by HR, carry a serial number (ANN-YY-NNN auto-generated), a subject, rich-text content, a start/end date window (controls visibility period), a `bannerEnabled` flag (renders a floating violet banner on every page until dismissed), and a `targetType` (`ALL` or `SPECIFIC` with employee picker). Three new permissions: `announcements.{view,create,manage}`. Full CRUD API at `/api/announcements` + `/api/announcements/[id]`; active-feed endpoint at `/api/announcements/active` (filters to current user, in-window, non-deleted); per-user dismissal endpoint at `/api/announcements/[id]/dismiss` (upsert, idempotent). New page `/notifications/announcements` (gated by any `announcements.*` permission) shows a hero banner, 4 KPI tiles (live / upcoming / banners / total), search + status filter, expandable card list with timeline-style left-border color coding, and a create/edit dialog with all fields including an inline employee picker for targeted announcements. `AnnouncementBanner` component polls `/api/announcements/active` on mount and every 5 minutes, renders a dismissible bottom-right floating card (paginated when multiple active banners exist) — injected into `ResponsiveLayout` so it appears on every page. Sidebar gains "Announcements" (Megaphone icon, `newSince` badge) under the Notifications section. Push service `getNotificationUrl()` now routes `ANNOUNCEMENT` type to `/notifications/announcements`. Task due-date notifications already shipped via the `DEADLINE_WARNING` cron at `POST /api/cron/deadline-reminders` (sends push 2 days before due date). Mobile push deep links were already wired in `public/sw.js` — the `announcement` entity type is now added to `entityRoutes` so tapping an announcement push opens the announcements page.

**Previous version:** `18.10.0` — **Minor:** Payroll Engine Phase 3 — **Loans, Custodies, WPS SIF generator**. Ships two new Prisma models (`Loan`, `Custody`) with full CRUD APIs and a Finance tab on the employee detail page. `Loan` tracks monthly installment deductions with a year-warning flag (required when `installmentsTotal > 12`). `Custody` tracks cash advances / company assets with a per-custody `deductionAmount` that finance sets to control per-payroll recovery. Both integrate into the payroll calculator: `loanDeduction` sums `installmentAmount` for all ACTIVE loans with remaining installments; `custodyDeduction` sums `deductionAmount` for OPEN/PARTIALLY_SETTLED custodies capped at the outstanding balance. Two new `Decimal(12,2)` columns (`loanDeduction`, `custodyDeduction`) added to `PayrollLine` via idempotent stored-procedure migration (`prisma/manual_migrations/add_loans_custodies.sql`). Payroll period approval now advances `installmentsPaid` on loans and `settledAmount` on custodies, auto-completing loans and auto-settling custodies when the balance reaches zero. Payslip PDF updated to conditionally render Loan/Custody deduction rows. New `src/lib/services/hr/wps-sif-generator.ts` generates a SAMA WPS SIF file (pipe-delimited, EH header + ED records per employee) alongside the existing Alinma CSV; exposed via `POST /api/hr/payroll-periods/[id]/wps-sif` with a `GET` validation endpoint that reports missing IBANs / National IDs before generation. Both `WPS_EMPLOYER_ID` and `WPS_BANK_ID` env vars added to `src/lib/env.ts`. Four new permissions: `hr.loans.{view,manage}` and `hr.custodies.{view,manage}` — all four added to the HR role bundle. Employee detail page gains a "Finance" tab (gated by `hr.loans.view || hr.custodies.view`) showing KPI tiles for active loan count, loan balance, open custody count, and outstanding custody balance, plus vertical cards for each loan (with progress bar + cancel) and custody (with inline deduction-amount editor).

**Previous version:** `18.9.1` — **Patch:** Employee history tab UI beautification + Frontend Design Guidelines in CLAUDE.md.

**Previous version:** `18.9.0` — **Minor:** HR/Payroll module redesign — **Phase 1: employment + salary history foundation**. Per Walid's requirement that "HR knows that this employee was a fabricator from date x to date y with a basic of xxx, and then he got promoted and become a foreman from date z, with a basic of nnn", OTS now tracks each employee's position and compensation as two independent timelines with contiguous date ranges and a single open row at a time. Ships two new Prisma models: (a) `EmployeePositionHistory` with `effectiveFrom` / `effectiveTo` date range, `positionTitle`, optional section/division/`departmentId`, and a `EmployeePositionChangeReason` enum covering HIRED / PROMOTED / TRANSFERRED / DEMOTED / ROLE_CHANGE / RESIGNED / TERMINATED / REHIRED; (b) `EmployeeSalaryHistory` with snapshot columns for `basicSalary` + housing / transport / mobile / food / other allowances (all Decimal(12,2)), an `EmployeeSalaryChangeReason` enum (HIRED / ANNUAL_INCREMENT / PROMOTION / ADJUSTMENT / COLA / CORRECTION / DEMOTION), and a full CEO-signed approval cycle — `EmployeeSalaryApprovalStatus` (DRAFT → PENDING_HR → PENDING_CEO → APPROVED / REJECTED) with dedicated submittedBy / hrApprovedBy / ceoApprovedBy / rejectedBy audit fields. Per Walid's explicit rule "only CEO approves a raise — it goes in a cycle approval but the final approval belongs only to a CEO", the new permission `hr.employee.salaryHistory.approveCeo` is CEO-only; HR gets `approveHr` (forwards to CEO) plus the `manage` permissions to draft and submit. Both models use `char(36)` UUIDs, the AssemblyPart audit pattern (createdById / updatedById / deletedAt / deletedById / deleteReason), and have back-relations wired on `User`, `Department`, and `Employee`. Idempotent manual migration at `prisma/manual_migrations/add_employee_history.sql` uses `CREATE TABLE IF NOT EXISTS` for both tables with full FK constraints to `Employee(id)` (CASCADE), `Department(id)` (SET NULL), and `User(id)` (SET NULL on audit FKs). Backfill script `scripts/backfill-employee-history.ts` seeds one open HIRED row per existing Employee dated from `dateOfJoining`, mirroring the current `occupation` + section + division + departmentId + compensation as the "anchor" the payroll calculator will resolve against. Six new permission IDs in `src/lib/permissions.ts` under the HR category: `hr.employee.positionHistory.{view,manage}`, `hr.employee.salaryHistory.{view,manage,approveHr,approveCeo}`; HR bundle gets everything except `approveCeo`, CEO role gets all via `ALL_PERMISSIONS.map`. `scripts/update-hr-role-permissions.ts` is extended to merge the new perms into Walid's existing runtime HR role and to grant `approveCeo` to CEO — idempotent, safe to re-run. Seven new API routes: `GET/POST /api/hr/employees/[id]/position-history`, `PUT/DELETE .../position-history/[historyId]`, `GET/POST /api/hr/employees/[id]/salary-history`, `PUT/DELETE .../salary-history/[historyId]`, and the action route `POST .../salary-history/[historyId]/status` which enforces the valid state transitions server-side and — on the final `approveCeo` step only — closes the prior open row, sets the new row's `effectiveTo` to null, and mirrors the new comp onto `Employee.basicSalary` + allowances so the legacy payroll page keeps working unchanged. Position-history `POST` also mirrors the new position onto `Employee.occupation` / section / division / departmentId unless `syncEmployeeMaster: false` is passed. DRAFT salary rows are the only mutable state — once PENDING they are frozen except through the /status route (reject + re-draft to correct). New UI: `src/components/hr/employee-history-tab.tsx` renders a dual timeline inside a new "History" tab on `/hr/employees/[id]`, gated by `hr.employee.{position,salary}History.view`. Each row shows the effective date range, full comp breakdown, status badge, linked position change, submitter/approver audit trail, and context-aware action buttons (Submit to HR / HR approve / CEO approve / Reject) that appear only when the current user holds the matching permission. Draft dialog lets HR record a raise with an optional "Submit for HR approval immediately" checkbox that pushes it straight to PENDING_HR on save. `src/app/hr/employees/[id]/page.tsx` wraps the existing `EmployeeForm` in a new client component `EmployeeDetailTabs` with two top-level tabs (Record / History); users without either history-view permission see the form inline exactly as before. Pure foundation release — the payroll calculator rewrite (Phase 2), loans / custody / commissions tables (Phase 3), and per-employee SOA + payslip PDF export (Phase 4) depend on this but land in separate releases. No changes to existing payroll or leaves code paths; Walid's ongoing 18.8.2 Dolibarr leaves sync fix is unaffected.

**Previous version:** `18.8.2` — **Patch:** Trim the Dolibarr holidays SELECT to only the columns OTS actually reads. 18.8.1 dropped `h.nb_open_day` after the first live run; the second live run then hit `Unknown column 'h.date_approval' in 'field list'` for the same reason — older Dolibarr schema. Instead of playing whack-a-mole one column at a time, `fetchApprovedDolibarrHolidays()` now selects only `rowid`, `fk_user`, `date_debut`, `date_fin`, `statut`, `description`, `date_create` plus the JOINed `t.code` / `t.label`. `halfday`, `fk_type`, `date_approval` and `nb_open_day` are all dropped — none were read anywhere in `sync-dolibarr-leaves.ts`. `DolibarrHolidayDbRow` is slimmed down to match. The query should now be portable across every Dolibarr release we care about.

**Previous version:** `18.8.1` — **Patch:** Drop `h.nb_open_day` from the Dolibarr holidays SELECT query in `src/lib/dolibarr/dolibarr-db.ts`. First live run of 18.8.0 against Walid's `llxvv_holiday` table returned `Unknown column 'h.nb_open_day' in 'field list'` — the column exists in newer Dolibarr schemas but NOT on this install. OTS never actually used it (calendar/working days are computed from `date_debut`/`date_fin` directly in `sync-dolibarr-leaves.ts`), so it's dropped from both the SELECT statement and the `DolibarrHolidayDbRow` interface. No other changes.

**Previous version:** `18.8.0` — **Minor:** Plan B for real this time — **bypass the broken Dolibarr `/api/index.php/holidays` REST endpoint entirely and read `llxvv_holiday` straight from the Dolibarr MySQL database**. After five consecutive diagnostic attempts (18.7.1 → 18.7.6) couldn't unbreak the REST endpoint even with the module enabled, the class file present, the API-key user holding `holiday/read`, and the edge proxy cache-busted, Walid confirmed the underlying database is fully populated (`SELECT COUNT(*) FROM llxvv_holiday WHERE statut=3` returns 46 approved rows) and said "i prefer going with db". New `src/lib/dolibarr/dolibarr-db.ts` ships a `mysql2/promise` read-only pool (capped at 3 connections, keep-alive, UTC-forced via `timezone:'Z'`, `multipleStatements` off). Table prefix is read from the new `DOLIBARR_DB_TABLE_PREFIX` env var (default `llx_`, Walid's install uses `llxvv_`) and validated against `/^[a-z][a-z0-9_]*_$/` before interpolation — mysql2 cannot parameterise table names, so this regex is the only guard against SQL injection here, and anything that doesn't match is rejected loudly at pool init. Six new env vars wired through `src/lib/env.ts`: `DOLIBARR_DB_HOST`, `_PORT`, `_USER`, `_PASSWORD`, `_DATABASE`, `_TABLE_PREFIX`; four non-port values are required or the pool throws `DolibarrDbNotConfiguredError` which the API surfaces as a clean 503. `runDolibarrLeaveSync()` in `src/lib/services/hr/sync-dolibarr-leaves.ts` is rewritten from the REST path: dropped `createDolibarrClient()`, `getAllHolidays()`, `buildTypeMap()`, `tsToDate()` and the whole Unix-timestamp conversion layer. It now calls `fetchApprovedDolibarrHolidays()` which runs a single LEFT JOIN between `<prefix>holiday` and `<prefix>c_holiday_types` so `type_code` + `type_label` land in the same round-trip that used to need a second `/holiday/types` REST call — and mysql2 returns native JS `Date` objects so the date handling collapses to direct `row.date_debut` / `row.date_fin` reads. Leave type mapping is now a hardcoded `Record<string, string>` over the exact five codes HR actually uses on Walid's install (confirmed against the live `llxvv_c_holiday_types` catalogue): `LEAVE_SICK → SICK`, `LEAVE_PERMISSION → PERMITTED`, `LEAVE_ANNUAL → ANNUAL`, `LEAVE_FAMILY → URGENT`, `LEAVE_WITHOUT_PE → UNPERMITTED`. **Varchar(16) truncation caveat:** Dolibarr's `c_holiday_types.code` column is `varchar(16)` so `LEAVE_WITHOUT_PERMISSION` truncates to `LEAVE_WITHOUT_PE` on disk — both forms are mapped for safety. The ~30 Greek default holiday types (5D1Y, 6D2Y, etc.) intentionally fall through to the label-based fallback map (preserved from 18.6.0) and then to the default leave type, each with a soft warning logged into `DolibarrLeaveSyncLog`. New `GET /api/hr/leave-requests/db-ping` endpoint runs `SELECT VERSION()` + a COUNT of approved holidays against `<prefix>holiday`, returning server version / table prefix / latency / holiday count so admins can verify end-to-end reachability from the browser before firing a real sync — gated by `hr.leaves.sync`. `/hr/payroll` reverts the 18.7.6 amputation: `runSync()` in `payroll-periods-client.tsx` runs employees THEN leaves again, with leaves as a soft-fail — any failure keeps the amber warning panel + `console.warn` pattern from 18.7.5, but the employee sync and the payroll calc carry on regardless. The "Leaves" row is back in the sync status strip alongside "Employees" with created/updated/skipped/no-emp/dedup pills, and `loadLastSync()` fetches both sync histories in parallel again. Hero subtitle restored to "Sync fresh employee & leave data from Dolibarr, then run a calc." **No schema changes** — the existing `LeaveRequest.source` + `dolibarrHolidayId` unique fields from 18.6.0 are reused as-is, so idempotency and the payroll calculator's dedup logic keep working without any migration. The underlying `DolibarrLeavesSyncScheduler` cron + the `/hr/leaves` page's own sync button inherit the new DB path for free.

**Previous version:** `18.7.6` — **Patch:** Plan B on the Dolibarr `/holidays` saga — **cut the leaves sync from the payroll flow entirely**. After Walid confirmed the Leave Request Management module is enabled in the Dolibarr admin UI AND `llxvv_const` has `MAIN_MODULE_HOLIDAY=1, entity=1` (the table prefix on this install is `llxvv_`, not `llx_`, which is why the first SELECT came back empty), the `/api/index.php/holidays` endpoint still returns `HTTP/2 200`, `content-type: text/html`, body `"API not found (failed to include API file)"` with `x-proxy-cache: MISS`. Superseded by 18.8.0 which ships the actual Plan B — direct MySQL access to the Dolibarr database bypassing the broken REST endpoint entirely. Hero description in 18.7.6 was updated from "Sync fresh employee & leave data" to "Sync fresh employee data… leaves are read from the attendance sheet", and 18.8.0 reverts that once the direct-DB path works.

**Previous version:** `18.7.5` — **Patch:** Fix a pure UX bug on `/hr/payroll` reported by Walid ("payroll is showing an error and it loads salaries in nowhere"). When the Dolibarr leaves sync soft-failed (the path shipped in 18.7.3), `runSync()` in `payroll-periods-client.tsx` was calling `setLeaveSyncWarning(body.error ?? body.message ?? fallback)` — which dumped the entire verbose `DolibarrHolidaysNotAvailableError` paragraph (the 18.7.4 three-paragraph technical description with proxy-cache purge advice, module-enable steps, server-side diagnosis, everything) straight into the amber warning strip on the payroll page. The verbose text belongs in server logs and the browser console for admins, not in front of every user who clicks "Sync from Dolibarr". Replaced both `setLeaveSyncWarning()` call sites (the non-OK response path + the thrown-error catch path) with a single short user-friendly line: *"Dolibarr leaves sync unavailable — payroll will use attendance-sheet codes only."* The raw `body.error` / `e.message` is still captured and pushed to `console.warn('[payroll] Dolibarr leaves sync failed:', ...)` so browser DevTools retains the technical detail for anyone debugging. The amber-panel chrome around it (title "Leaves sync skipped — employee sync succeeded" + the fine-print hint "Payroll calculation will still run using attendance-sheet codes only. Fix the Dolibarr /holidays endpoint at your leisure.") is unchanged — it was fine in 18.7.3, only the middle line was leaking. No schema, sync or route logic touched.

**Previous version:** `18.7.4` — **Patch:** Actual root cause of the Dolibarr `/holidays` sync failure: **edge-proxy cache hit**, not Dolibarr. Walid ran two direct curls against the live instance and the response headers were definitive — `/api/index.php/users?limit=1` came back `HTTP/2 200` with `content-type: application/json`, `x-powered-by: Luracast Restler v3.1.0`, and `x-proxy-cache: MISS`; `/api/index.php/holidays?limit=1` came back `HTTP/2 200` with `content-type: text/html`, no `x-powered-by: Restler` header at all, and **`x-proxy-cache: HIT`** + body "API not found (failed to include API file)". The failing response is being served from a nginx/LiteSpeed/Cloudflare edge cache without ever reaching PHP, which is why the Dolibarr `php_errorlog` and `documents/dolibarr.log` showed no recent entries and why every diagnosis-from-Dolibarr-side fix was chasing a ghost — PHP wasn't running. At some earlier point Dolibarr returned the line-402 fallback (when the endpoint really was broken), the edge cached that HTTP 200 + HTML body, and it's been serving it stale ever since. Fix is twofold: **(a) client-side cache-busting** in `DolibarrClient.request()` — every call now appends a unique `_ts=<ms>` query param and sends `Cache-Control: no-cache, no-store, must-revalidate` + `Pragma: no-cache` request headers so any proxy along the way bypasses its cache (Dolibarr's Restler endpoint ignores unknown query params so `_ts` is harmless upstream). This alone should unbreak the sync for Walid immediately after restart. **(b) the `DolibarrHolidaysNotAvailableError` message** is rewritten to make "purge the host-level cache (LiteSpeed / Cloudflare / nginx reverse proxy) and add a bypass rule for `<domain>/erp/api/*`" the #1 action, with server-side diagnoses (Leave Requests module off, missing class file, parse error) demoted to #2 "only if #1 doesn't fix it". The generic non-JSON parse error in `request()` also now inspects `x-proxy-cache` / `x-powered-by` on the response and appends `[proxy cache HIT — edge proxy is serving a stale cached response without hitting PHP]` to the error message when it detects the signature. Carries forward 18.7.3's soft-fail so even without this cache fix, `/hr/payroll` still ran employee sync + calculated payroll.

**Previous version:** `18.7.3` — **Patch:** Decouple `/hr/payroll`'s "Sync from Dolibarr" button from the broken holidays endpoint per Walid's question ("why is the payroll failing while we already have a salaries sync working perfectly in financial module?"). The financial Salaries sync calls `/api/index.php/salaries` (the `llx_salary` / `llx_payment_salary` payment tables) which works fine — but the payroll page's own sync button chains two unrelated endpoints: `/api/hr/employees/sync` (→ Dolibarr `/users` ✅) followed by `/api/hr/leave-requests/sync` (→ Dolibarr `/holidays` ❌). Before 18.7.3 the second call's failure was thrown as a hard error, breaking the whole flow. But payroll calculation does NOT need the Dolibarr leaves sync to have run — OTS has always calculated payroll from `Employee` + `AttendanceRecord` sheet data, and the Dolibarr leaves sync from 18.6.0 was an *enhancement* that dedupes sheet codes against approved Dolibarr holidays. So `runSync()` in `payroll-periods-client.tsx` now (a) fails hard only on employee sync (the real dependency), (b) catches leaves-sync failures into a new `leaveSyncWarning` state so the employee sync still reports success, (c) shows the warning as an amber strip explaining that payroll will fall back to attendance-sheet codes only, and (d) no longer blocks the sync button on `hr.leaves.sync` permission — `hr.employee.sync` alone is enough since leaves is optional. Net effect: a broken Dolibarr `/holidays` endpoint can no longer block payroll calculation. Carries forward the 18.7.2 corrected `DolibarrHolidaysNotAvailableError` diagnosis.

**Previous version:** `18.7.2` — **Patch:** Correct the `DolibarrHolidaysNotAvailableError` diagnosis after Walid shared a screenshot of the actual `public_html/erp/api/index.php` lines 397-406 on `erp.hexametals.com`. The 18.7.1 "set `display_errors = Off`" advice was **wrong**: line 402 is not a PHP notice banner, it's Dolibarr's **own** fallback code that literally reads `print 'API not found (failed to include API file)';` immediately before `header('HTTP/1.1 501 ...')` on line 403. So the "headers already sent" warning is a **secondary** symptom of Dolibarr's own buggy error-handling path — the **primary** cause is that `include_once $dir_part_file` on line 398 failed (or `$dir_part_file` came back empty) specifically for the holidays API class, while products/thirdparties/salaries/users all load fine on the same instance. Rewrote the docstring + runtime error message with the real fixes in probability order: (1) **the Leave Requests (Holiday) module is disabled at the Dolibarr instance level** — top-right ⚙ → Modules / Applications → search "Leave" → enable the toggle. The API-key user having `holiday/read` does NOT help if the module is off at the instance level, because the router only scans enabled modules when resolving `$dir_part_file`. This is the #1 cause of this exact symptom. (2) Verify `<dolibarr-root>/holiday/class/api_holidays.class.php` exists and is readable by the PHP process owner; if missing, re-upload the entire `holiday/` folder from the matching Dolibarr release zip. (3) Check the line in `<dolibarr-root>/api/php_errorlog` **immediately before** the "headers already sent" warning — any `PHP Parse error` / `Fatal error` mentioning `holiday/class/` names the broken file; re-upload just that file. (4) Sanity-check the API-key user has `holiday/read` under Users & Groups → Permissions. Pure diagnostic copy fix — no schema, sync or route logic changed.

**Previous version:** `18.7.1` — **Patch:** Rewrite `DolibarrHolidaysNotAvailableError` around the PHP "headers already sent" warning from Walid's error log. (Superseded by 18.7.2 — the "set display_errors=Off" advice was wrong once Walid's screenshot of api/index.php:397-406 revealed that line 402 is Dolibarr's own `print` fallback, not a PHP notice banner.)

**Previous version:** `18.7.0` — **Minor:** Drop `Employee.trade` and rename "Occupation" → "Position Title" everywhere in the UI per Walid's instruction ("take all the values in employee 'trade' and put it as 'occupation' — i was preferring occupation to be position title (more elite and more professional) — and then we can safely remove 'trade'"). Migration `prisma/manual_migrations/migrate_trade_to_occupation.sql` is fully idempotent: copies `Employee.trade` into `Employee.occupation` only where the destination is empty, drops the `Employee_trade_idx` index, then drops the column — each step guarded by an `information_schema` check. The Prisma schema removes the `trade` field + index from `Employee`; `ManpowerSlot.trade` is preserved (it's a different concept — the slot's worker template). The Dolibarr employee sync now writes `apiUser.job` directly into `Employee.occupation` instead of `trade`. The HR setup tab "Occupations" is relabeled to "Position Titles" (the catalogue table `HrOccupation` and its `/api/hr/occupations` endpoint stay unchanged so historical data + the existing dropdown source stay stable). The employee form drops the free-text Trade input entirely and the Occupation `<Select>` is now labelled "Position Title". The employees list relabels its sortable column + filter from "Trade" → "Position Title" (now reading from the `occupation` column instead of the dropped `trade`). Sweeps `EmployeePicker`, `user-create-form`, `dashboard/users/create`, `users/create`, `hr/attendance/timesheet`, `hr/attendance/mapping`, the employees `[id]` detail page, the `hr/employees` server page select, the `hr/employees` API route schemas + filter param, the `hr/attendance` route's employee select, and the `[id]` PUT `TRACKED_SYNC_FIELDS` array — all `Employee.trade` references replaced or removed. The unrelated `wps-aws-d1-pdf-generator.ts` `Electrode trade name` PDF label is left untouched.

**Previous version:** `18.6.3` — **Patch:** Reverted the Dolibarr direct-MySQL holidays fallback. The OTS holidays REST call already follows the exact same pattern as `/products`, `/thirdparties`, `/invoices`, `/salaries`, `/projects`, `/supplierorders` and `/users` — when `getHolidays()` fails the root cause is on the Dolibarr server, not in OTS. Deleted `src/lib/dolibarr/dolibarr-db.ts`, removed the `DOLIBARR_DB_HOST/PORT/USER/PASSWORD/DATABASE` env vars from `src/lib/env.ts`, stripped the DB-fallback branch out of `runDolibarrLeaveSync()`, and rewrote `DolibarrHolidaysNotAvailableError`'s message to give administrators the three concrete server-side fixes (grant the API-key user the `holiday/read` permission, delete `htdocs/api/temp/routes.php` to clear Dolibarr's stale API-route cache, and verify `htdocs/holiday/class/api_holidays.class.php` exists + is readable by the PHP process). Carries forward the 18.6.2 employee SN natural-numeric sort fix.

**Previous version:** `18.6.2` — Dolibarr direct-MySQL fallback for holidays + employee SN natural sort. (Reverted in 18.6.3 — the MySQL approach was deemed unnecessary since the REST integration pattern already works for every other endpoint.)

**Previous version:** `18.6.1` — HR UI polish + payroll sync button + Dolibarr holidays fallback. `/hr/leaves` and `/hr/payroll` rebuilt on a shared design language (gradient hero, 4 KPI tiles, slate cards, pill counters, empty states); `/hr/payroll` gains its own "Sync from Dolibarr" button (employees + leaves sequentially); `DolibarrClient.request()` survives non-JSON responses; `getHolidays()` wraps missing-module cases in a typed `DolibarrHolidaysNotAvailableError` and the API returns 503 with a user-friendly message instead of the raw `Unexpected token 'A', 'API not fo'...` parse error.

**Previous version:** `18.6.0` — **Minor:** Dolibarr leaves sync (one-way read-only mirror of `llx_holiday` into OTS `LeaveRequest`) + payroll calculator fix. Ships `DolibarrLeaveSyncLog` model, `LeaveRequest.source` / `dolibarrHolidayId` fields via idempotent `add_dolibarr_leaves_sync.sql`, three new `LeaveType` seeds (`PERMITTED`, `UNPERMITTED`, `URGENT`) matching the Dolibarr catalogue, `DolibarrClient.getAllHolidays()` / `getHolidayTypes()`, `runDolibarrLeaveSync()` service, `POST/GET /api/hr/leave-requests/sync`, a nightly 03:00 Riyadh cron (`DolibarrLeavesSyncScheduler`), and a "Sync from Dolibarr" button + last-run summary on `/hr/leaves`. Only approved Dolibarr holidays (statut=3) land — they mirror in as `status=APPROVED`, `source=DOLIBARR`, bypassing the native approval chain. Dedup against Google-Sheet attendance is enforced by the payroll calculator: any day covered by an APPROVED LeaveRequest (any source) is excluded from attendance absence + overtime summation so Dolibarr leaves always win over sheet codes. Gated by a new `hr.leaves.sync` permission (added to HR role). As part of the same payroll fix, the `sumOvertimeHours` / `sumAbsencesInPeriod` raw SQL queries referencing the wrong table name (`Attendance`) are replaced with proper `prisma.attendanceRecord.findMany()` calls against the real `AttendanceRecord` model + `ABSENT_NO_PERMISSION` / `ABSENT_WITH_PERMISSION` status values, fixing a silent-zero bug in Phase 3 payroll runs.

---

## Versioning
- **Patch** (17.4.X): Bug fixes, UI tweaks, layout fixes — bump automatically
- **Minor** (17.X.0): New features, new pages, new API endpoints — bump automatically
- **Major** (X.0.0): Only bumped when explicitly instructed by the user
- Update the version in both `CLAUDE.md` and `package.json` on every commit
- Update changelog.md and /changelog page content on every version update
---

## Development Branch
Push directly to `main`. No feature branches, no PRs — commit and push to `main` directly.

---

## Tech Stack
- **Framework:** Next.js 15 (App Router, Turbopack)
- **Language:** TypeScript 5 (strict mode)
- **ORM:** Prisma 6 + MySQL 8
- **UI:** shadcn/ui + Radix UI + Tailwind CSS 4
- **Validation:** Zod (already a dependency — use it everywhere)
- **Logging:** Pino via `@/lib/logger` (never use `console.log` in production code)
- **Auth:** JWT cookies (`ots_session`) + `withApiContext` wrapper
- **Forms:** React Hook Form + `@hookform/resolvers/zod`

---

## File Structure Conventions
```
src/
  app/
    api/<resource>/route.ts      # API routes (GET, POST)
    api/<resource>/[id]/route.ts # API routes (GET, PUT, DELETE)
    <page>/page.tsx              # Page components
  components/
    ui/                          # shadcn/ui base components (don't modify)
    <domain>/                    # Domain-specific components
  lib/
    db.ts                        # Prisma client (import as `prisma`)
    logger.ts                    # Pino logger (import as `logger`)
    api-utils.ts                 # withApiContext, logActivity, logAuditEvent
    jwt.ts                       # Session verification
    services/                    # Business logic services
    utils/                       # Pure utility functions
  hooks/                         # React hooks
  contexts/                      # React context providers
prisma/
  schema.prisma                  # DB schema (92 models)
```

---

## API Route Patterns

### Standard API Route Template
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';

const createSchema = z.object({
  name: z.string().min(1),
  // ... fields
});

export const GET = withApiContext(async (req, session) => {
  try {
    const data = await prisma.entity.findMany({ where: { deletedAt: null } });
    return NextResponse.json(data);
  } catch (error) {
    logger.error({ error }, 'Failed to fetch entities');
    return NextResponse.json({ error: 'Failed to fetch entities' }, { status: 500 });
  }
});

export const POST = withApiContext(async (req, session) => {
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }
  // ... create logic
});
```

### Auth & Role Checks
- Use `withApiContext` for all routes (handles auth + audit context)
- Role check pattern: `if (!['Admin', 'Manager'].includes(session!.role))`
- Session is `null` only if `requireAuth: false` is passed

### Soft Deletes
Always filter: `where: { deletedAt: null }` in queries on soft-deletable models.

---

## Logging Rules
- **Never** use `console.log`, `console.error`, `console.warn` in source files
- Import: `import { logger } from '@/lib/logger'`
- Usage:
  ```typescript
  logger.info({ projectId }, 'Project created');
  logger.error({ error, userId }, 'Failed to create project');
  logger.warn({ sessionId }, 'Session expired');
  logger.debug({ query }, 'DB query');  // dev only
  ```
- Always pass structured context as first arg, message as second

---

## Type Safety Rules
- **Never** use `any` — use `unknown` + type narrowing, or define proper interfaces
- For Prisma result types: use `Prisma.EntityGetPayload<typeof query>` or infer with `typeof`
- For generic API handlers: use proper generics, not `any`
- Suppress with `@ts-ignore` only as absolute last resort with a comment explaining why

---

## Database Patterns
- Import prisma: `import prisma from '@/lib/db'`
- Soft-delete support: models have `deletedAt`, `deletedById`, `deleteReason`
- Audit tracking: models have `createdAt`, `updatedAt`, `createdById`, `updatedById`
- Use `select` instead of loading full models when returning API responses
- Avoid N+1: use `include` or `select` with nested relations in a single query

---

## Database Migrations (Manual SQL)
- Store manual migration files in `prisma/manual_migrations/`
- **NEVER use `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`** — MySQL does NOT support this syntax (causes `ERROR 1064`). This mistake recurs — treat it as a hard rule.
- Always use the stored procedure pattern with `information_schema.COLUMNS`:
  ```sql
  DROP PROCEDURE IF EXISTS migration_name;
  DELIMITER $$
  CREATE PROCEDURE migration_name()
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'YourTable'
        AND COLUMN_NAME = 'yourColumn'
    ) THEN
      ALTER TABLE YourTable ADD COLUMN yourColumn TYPE NULL;
    END IF;
  END$$
  DELIMITER ;
  CALL migration_name();
  DROP PROCEDURE IF EXISTS migration_name;
  ```
- See `prisma/manual_migrations/add_task_soft_delete.sql` as the canonical example.

---

## Component Patterns
- Server Components by default in `app/` directory
- Add `'use client'` only when needed (event handlers, hooks, browser APIs)
- shadcn/ui components live in `src/components/ui/` — never modify them directly
- Use `cn()` from `@/lib/utils` for conditional classnames

---

## Frontend Design Guidelines
Every HR/admin page must follow the established OTS design language. When building or beautifying a page, apply all of the following patterns:

### Page Shell
```tsx
<div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
    {/* Hero → KPI strip → content cards */}
  </div>
</div>
```

### Hero Banner
Gradient banner at the top of every major page. Use a domain-appropriate color (sky/blue for HR, emerald for payroll, violet for manpower, amber for projects):
```tsx
<div className="rounded-2xl border bg-gradient-to-br from-sky-600 via-sky-500 to-blue-600 p-6 md:p-8 text-white shadow-lg relative overflow-hidden">
  {/* decorative blobs */}
  <div className="absolute -top-4 -right-4 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
  <div className="absolute -bottom-8 -left-8 w-48 h-48 bg-white/5 rounded-full blur-3xl" />
  <div className="relative z-10">
    <div className="flex items-center gap-3 mb-2">
      <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
        <Icon className="h-5 w-5" />
      </div>
      <h1 className="text-2xl font-bold">Page Title</h1>
    </div>
    <p className="text-sky-100 text-sm">Subtitle</p>
  </div>
</div>
```

### KPI Tiles
Row of 3–5 stat tiles below the hero. Use tone colors: `sky`, `emerald`, `amber`, `rose`, `violet`:
```tsx
<div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
  <div className="rounded-xl border bg-gradient-to-b from-sky-50 to-white border-sky-200 p-4 shadow-sm">
    <p className="text-xs text-sky-600 font-medium uppercase tracking-wide">Label</p>
    <p className="text-2xl font-bold text-sky-700 mt-1">42</p>
    <p className="text-xs text-sky-500 mt-0.5">sub-label</p>
  </div>
</div>
```

### Content Cards
Use `rounded-2xl border bg-white shadow-sm` for main content cards. Card headers: `flex items-center justify-between px-6 py-4 border-b`.

### Timeline Rows (position/history lists)
Each timeline entry: left-side colored dot + vertical connector line, right-side content block. Current row (no `effectiveTo`) gets a filled dot in the brand color + "Current" badge in green. Historical rows get a hollow dot in `slate-300`.

### Status Badges
- `APPROVED` / `CURRENT` → `bg-emerald-100 text-emerald-700 border-emerald-200`
- `PENDING_HR` / `PENDING_CEO` → `bg-amber-100 text-amber-700 border-amber-200`
- `DRAFT` → `bg-slate-100 text-slate-600 border-slate-200`
- `REJECTED` → `bg-rose-100 text-rose-700 border-rose-200`

### Salary Breakdown Card
Show allowances in a compact 2-col grid with SAR labels. Always render the total package as a larger bold number below the grid with a subtle top-border separator.

### Typography
- Section titles inside cards: `text-sm font-semibold text-slate-700`
- Meta text (dates, authors): `text-xs text-slate-400`
- Money amounts: always formatted `toLocaleString('en-US', {minimumFractionDigits:2})` with `SAR` prefix or suffix

### Responsive
All grids go single-column on mobile (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`). Tables switch to card stacks on `< sm`.

### Trigger: when to apply this guide
Apply these patterns any time you create a new page, add a new section to an existing page, or are asked to "beautify" or "polish" a component. The `/hr/leaves` and `/hr/payroll` pages are the canonical references — read them before starting UI work on any HR module page.

---

## Environment Variables
Required vars are validated at startup via `src/lib/env.ts`.
Never access `process.env` directly in components — import from `src/lib/env.ts`.

---

## What NOT To Do
- Don't add `console.log` — use the logger
- Don't use `any` — define proper types
- Don't skip Zod validation on API endpoints
- Don't create new components in `src/components/ui/` (those are shadcn-managed)
- Don't use `prisma` from `@prisma/client` directly — always import from `@/lib/db`
- Don't hardcode strings that belong in env vars
- Don't add comments to code that is self-explanatory
- Don't add error handling for impossible scenarios
- **Never write `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`** — MySQL doesn't support it; use the stored procedure pattern in the Database Migrations section
- Do not make any changes until you have 95% confidence in what you need to build. Ask me follow-up questions until you reach that confidence.