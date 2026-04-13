# Hexa Steel® OTS — Claude Code Guidelines

## Project Overview
Enterprise ERP for steel fabrication projects. Next.js 15 App Router + TypeScript + Prisma + MySQL.
Deployed at `hexasteel.sa/ots` with optional `NEXT_PUBLIC_BASE_PATH` subpath.
**Current version:** `18.7.1` — **Patch:** Rewrite `DolibarrHolidaysNotAvailableError` around the real-world root cause of Walid's `/hr/leaves` sync failure on `erp.hexametals.com`. The PHP error log showed `PHP Warning: Cannot modify header information - headers already sent by (output started at api/index.php:402) in api/index.php on line 403`, and no `api/temp/` folder exists on the install — so the previous "delete the stale API route cache" advice was wrong. That warning is a classic output-buffer violation: something on line 402 emits bytes before Restler sets `Content-Type: application/json` on line 403, so the holidays response gets corrupted before Restler can ship it. OTS sees the corrupted body as non-JSON and the API hits our typed `DolibarrHolidaysNotAvailableError` path. The new docstring + runtime error message list the real fixes in probability order: (1) `display_errors = Off` + `log_errors = On` in php.ini via cPanel → MultiPHP INI Editor — PHP notices printed inline on shared hosting are the most common cause and are a standard production setting anyway; (2) re-upload `<dolibarr-root>/holiday/class/api_holidays.class.php` from the official Dolibarr release zip in case a BOM or whitespace crept in before `<?php`; (3) inspect `<dolibarr-root>/api/index.php` around line 402 for any `echo`/`print`/stray HTML (rare, only if hand-edited); (4) verify the API-key user has the `holiday/read` permission. No other files changed — this is a pure diagnostic copy fix so the next administrator who hits this wall gets the right actions surfaced in the OTS error banner instead of the misleading cache-file advice from 18.6.3.

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