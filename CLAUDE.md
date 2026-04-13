# Hexa Steel® OTS — Claude Code Guidelines

## Project Overview
Enterprise ERP for steel fabrication projects. Next.js 15 App Router + TypeScript + Prisma + MySQL.
Deployed at `hexasteel.sa/ots` with optional `NEXT_PUBLIC_BASE_PATH` subpath.
**Current version:** `18.6.0` — **Minor:** Dolibarr leaves sync (one-way read-only mirror of `llx_holiday` into OTS `LeaveRequest`) + payroll calculator fix. Ships `DolibarrLeaveSyncLog` model, `LeaveRequest.source` / `dolibarrHolidayId` fields via idempotent `add_dolibarr_leaves_sync.sql`, three new `LeaveType` seeds (`PERMITTED`, `UNPERMITTED`, `URGENT`) matching the Dolibarr catalogue, `DolibarrClient.getAllHolidays()` / `getHolidayTypes()`, `runDolibarrLeaveSync()` service, `POST/GET /api/hr/leave-requests/sync`, a nightly 03:00 Riyadh cron (`DolibarrLeavesSyncScheduler`), and a "Sync from Dolibarr" button + last-run summary on `/hr/leaves`. Only approved Dolibarr holidays (statut=3) land — they mirror in as `status=APPROVED`, `source=DOLIBARR`, bypassing the native approval chain. Dedup against Google-Sheet attendance is enforced by the payroll calculator: any day covered by an APPROVED LeaveRequest (any source) is excluded from attendance absence + overtime summation so Dolibarr leaves always win over sheet codes. Gated by a new `hr.leaves.sync` permission (added to HR role). As part of the same payroll fix, the `sumOvertimeHours` / `sumAbsencesInPeriod` raw SQL queries referencing the wrong table name (`Attendance`) are replaced with proper `prisma.attendanceRecord.findMany()` calls against the real `AttendanceRecord` model + `ABSENT_NO_PERMISSION` / `ABSENT_WITH_PERMISSION` status values, fixing a silent-zero bug in Phase 3 payroll runs.

**Previous version:** `18.5.0` — **Minor:** HR Phase 3 — Leaves, Payroll, WPS export, Payslip PDFs and End-of-Service gratuity. Nine new Prisma models (`LeaveType`, `LeaveRequest`, `LeaveBalance`, `PayrollPeriod`, `PayrollLine`, `PayrollAdjustment`, `WpsExport`, `EndOfServiceAward` + enums) ship via the idempotent `add_hr_phase_3.sql` migration, which also seeds six default leave types and seven `SystemConfig` defaults (daily-rate basis, GOSI rates, overtime multiplier, WPS bank, approval chain, carry-over cap, default accrual). `Employee` gains `isGosiSubject Boolean` + `gosiSalary Decimal?` so GOSI can run on a contract figure separate from basic — surfaced in the employee form and tracked by the Dolibarr-sync preserve list. A configurable approval chain (`MANAGER_HR_CEO` default, `HR_ONLY` / `MANAGER_HR` alternatives) drives leave workflow, stamping a dedicated approver column per stage; over-balance requests are allowed with an advance-balance warning. The payroll calculator snapshots compensation per line, counts working-day attendance (excluding Fridays + `PublicHoliday` rows), supports three daily-rate bases (`THIRTY` / `WORKING_DAYS_IN_MONTH` / `WEEKLY_AVERAGE`), applies 1.5× overtime, GOSI 10%/12%, unpaid-leave + absence deductions and per-line adjustments, then flows DRAFT → CALCULATED → APPROVED → LOCKED. Alinma-flavoured WPS CSV generator writes SAMA-compliant files under `public/outputs/wps/`, jsPDF-based payslip generator writes per-employee A4 PDFs under `public/outputs/payslips/<periodId>/`, and the KSA end-of-service calculator (0.5 mo/yr first 5 years, 1 mo/yr thereafter, prorated) upserts `EndOfServiceAward`. Eighteen new `hr.*` permissions gate the flow; `/hr/setup` gains Leave Types + Payroll Settings tabs, and two new top-level pages ship at `/hr/leaves` and `/hr/payroll` (with a per-period detail page driving calculate / approve / lock / WPS / payslip actions). Sidebar gets Leaves + Payroll entries under HR.

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