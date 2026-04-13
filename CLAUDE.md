# Hexa Steel® OTS — Claude Code Guidelines

## Project Overview
Enterprise ERP for steel fabrication projects. Next.js 15 App Router + TypeScript + Prisma + MySQL.
Deployed at `hexasteel.sa/ots` with optional `NEXT_PUBLIC_BASE_PATH` subpath.
**Current version:** `18.7.4` — **Patch:** Actual root cause of the Dolibarr `/holidays` sync failure: **edge-proxy cache hit**, not Dolibarr. Walid ran two direct curls against the live instance and the response headers were definitive — `/api/index.php/users?limit=1` came back `HTTP/2 200` with `content-type: application/json`, `x-powered-by: Luracast Restler v3.1.0`, and `x-proxy-cache: MISS`; `/api/index.php/holidays?limit=1` came back `HTTP/2 200` with `content-type: text/html`, no `x-powered-by: Restler` header at all, and **`x-proxy-cache: HIT`** + body "API not found (failed to include API file)". The failing response is being served from a nginx/LiteSpeed/Cloudflare edge cache without ever reaching PHP, which is why the Dolibarr `php_errorlog` and `documents/dolibarr.log` showed no recent entries and why every diagnosis-from-Dolibarr-side fix was chasing a ghost — PHP wasn't running. At some earlier point Dolibarr returned the line-402 fallback (when the endpoint really was broken), the edge cached that HTTP 200 + HTML body, and it's been serving it stale ever since. Fix is twofold: **(a) client-side cache-busting** in `DolibarrClient.request()` — every call now appends a unique `_ts=<ms>` query param and sends `Cache-Control: no-cache, no-store, must-revalidate` + `Pragma: no-cache` request headers so any proxy along the way bypasses its cache (Dolibarr's Restler endpoint ignores unknown query params so `_ts` is harmless upstream). This alone should unbreak the sync for Walid immediately after restart. **(b) the `DolibarrHolidaysNotAvailableError` message** is rewritten to make "purge the host-level cache (LiteSpeed / Cloudflare / nginx reverse proxy) and add a bypass rule for `<domain>/erp/api/*`" the #1 action, with server-side diagnoses (Leave Requests module off, missing class file, parse error) demoted to #2 "only if #1 doesn't fix it". The generic non-JSON parse error in `request()` also now inspects `x-proxy-cache` / `x-powered-by` on the response and appends `[proxy cache HIT — edge proxy is serving a stale cached response without hitting PHP]` to the error message when it detects the signature. Carries forward 18.7.3's soft-fail so even without this cache fix, `/hr/payroll` still ran employee sync + calculated payroll.

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