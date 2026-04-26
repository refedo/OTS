# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
Hexa Steel® OTS — enterprise ERP for steel fabrication projects. Next.js 15 App Router + TypeScript + Prisma + MySQL. Deployed at `hexasteel.sa/ots` with optional `NEXT_PUBLIC_BASE_PATH` subpath.

**Current version:** `21.1.0` — Dolibarr extrafield resolution + Loan approval workflow. Dolibarr employee sync now resolves numeric extrafield IDs (department, nationality, marital status) to text labels via direct MySQL lookups, and wires `Employee.reportsToId` / `User.reportsToId` from `fk_user_resp`. Loan creation now starts the `hr-loan-approval` workflow (Manager → HR Manager); migration `loan_approval_workflow.sql` seeds the definition and adds `PENDING_APPROVAL` to `LoanStatus`.

---

## Commands

```bash
npm run dev          # Start dev server (Turbopack)
npm run build        # Generate Prisma client + Next.js build (4 GB heap)
npm run lint         # ESLint
npm test             # Vitest unit tests
npm run test:watch   # Vitest watch mode
npm run db:seed      # Seed database
npx prisma generate  # Regenerate Prisma client after schema changes
npx prisma migrate deploy  # Run pending Prisma migrations
```

---

## Versioning
- **Patch** (X.Y.Z): Bug fixes, UI tweaks — bump automatically
- **Minor** (X.Y.0): New features, pages, API endpoints — bump automatically
- **Major** (X.0.0): Only when explicitly instructed
- Update version in both `CLAUDE.md` and `package.json` on every commit
- Update `changelog.md` and the `/changelog` page on every version update

---

## Development Branch
Push directly to `main`. No feature branches, no PRs.

---

## Tech Stack
- **Framework:** Next.js 15 (App Router, Turbopack)
- **Language:** TypeScript 5 (strict mode)
- **ORM:** Prisma 6 + MySQL 8
- **UI:** shadcn/ui + Radix UI + Tailwind CSS 4
- **Validation:** Zod — use it on every API endpoint
- **Logging:** Pino via `@/lib/logger` — never `console.log`
- **Auth:** JWT cookies (`ots_session`) + `withApiContext` wrapper
- **Forms:** React Hook Form + `@hookform/resolvers/zod`
- **AI:** `@anthropic-ai/sdk` (Ops Agent, letter translation), `openai`
- **Integrations:** Dolibarr ERP (REST + direct MySQL), Google Sheets (LCR sync), Nextcloud, Libre MES (InfluxDB + PostgreSQL)

---

## Architecture

### Key lib modules
```
src/lib/
  db.ts                    # Prisma client — always import from here
  api-utils.ts             # withApiContext, logAuditEvent
  jwt.ts                   # Session tokens
  logger.ts                # Pino structured logger
  env.ts                   # Validated env config — never use process.env directly
  permissions.ts           # 30 permission categories (RBAC)
  navigation-permissions.ts # Route-level permission gates
  startup-migrations.ts    # Runs idempotent SQL on server start
  services/                # Business logic (payroll, sync, PDF, EWS, etc.)
  dolibarr/                # Dolibarr REST client + direct MySQL pool
  google-sheets/           # LCR sync
  scheduler/               # node-cron job registry
  ops-agent/               # Claude-powered autonomous sweep engine
```

### Prisma schema
163 models across: RBAC (`User`, `Role`), Projects, Tasks, Production (`AssemblyPart`, `ProductionLog`, `WorkOrder`), QC (`ITP`, `WPS`, `RFIRequest`, `NCRReport`), HR (Employee, payroll, leaves, assets, loans, letters), Financial, KPIs/OKRs, Strategic Planning, Governance/Audit, Notifications, AI interactions, and external integrations.

### Auth flow
`withApiContext` (in `api-utils.ts`) verifies the `ots_session` JWT cookie and passes a typed `session` object to every handler. Session is `null` only if `requireAuth: false` is explicitly passed. Permission checks use `resolveUserPermissions()` from `permission-checker.ts`.

### Database migrations
New columns are added via idempotent SQL files in `prisma/manual_migrations/` that are executed automatically on server start by `startup-migrations.ts`.

---

## API Route Patterns

```typescript
import { NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';

const createSchema = z.object({ name: z.string().min(1) });

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
  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }
  // ...
});
```

- Soft-delete filter: always `where: { deletedAt: null }` on soft-deletable models
- Role check pattern: `if (!['Admin', 'Manager'].includes(session!.role))`
- Use `select` instead of loading full models in API responses; avoid N+1 with `include`

---

## Database Migrations (Manual SQL)

Store files in `prisma/manual_migrations/`. They run automatically on server start.

**NEVER use `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`** — MySQL does not support this syntax (`ERROR 1064`). Always use the stored-procedure pattern:

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

See `prisma/manual_migrations/add_task_soft_delete.sql` as the canonical example.

---

## Frontend Design Guidelines

Every page follows this layout: **hero banner → KPI tile strip → content cards**.

### Page shell
```tsx
<div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
    {/* hero → KPI strip → cards */}
  </div>
</div>
```

### Hero banner
Gradient banner at the top of every major page. Domain color mapping: sky/blue = HR, emerald = payroll, violet = manpower/ops, amber = projects.
```tsx
<div className="rounded-2xl border bg-gradient-to-br from-sky-600 via-sky-500 to-blue-600 p-6 md:p-8 text-white shadow-lg relative overflow-hidden">
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

### KPI tiles
```tsx
<div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
  <div className="rounded-xl border bg-gradient-to-b from-sky-50 to-white border-sky-200 p-4 shadow-sm">
    <p className="text-xs text-sky-600 font-medium uppercase tracking-wide">Label</p>
    <p className="text-2xl font-bold text-sky-700 mt-1">42</p>
    <p className="text-xs text-sky-500 mt-0.5">sub-label</p>
  </div>
</div>
```

### Content cards
`rounded-2xl border bg-white shadow-sm`. Card headers: `flex items-center justify-between px-6 py-4 border-b`.

### Status badges
- `APPROVED` / `CURRENT` → `bg-emerald-100 text-emerald-700 border-emerald-200`
- `PENDING_HR` / `PENDING_CEO` → `bg-amber-100 text-amber-700 border-amber-200`
- `DRAFT` → `bg-slate-100 text-slate-600 border-slate-200`
- `REJECTED` → `bg-rose-100 text-rose-700 border-rose-200`

### Typography & formatting
- Section titles: `text-sm font-semibold text-slate-700`
- Meta text: `text-xs text-slate-400`
- Money: `toLocaleString('en-US', { minimumFractionDigits: 2 })` with SAR prefix/suffix
- All grids: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`; tables switch to card stacks below `sm`

The `/hr/leaves` and `/hr/payroll` pages are the canonical design references.

---

## Logging

```typescript
import { logger } from '@/lib/logger';

logger.info({ projectId }, 'Project created');
logger.error({ error, userId }, 'Failed to create project');
logger.warn({ sessionId }, 'Session expired');
logger.debug({ query }, 'DB query'); // dev only
```

Structured context object first, message string second. Never `console.*` in source files.

---

## Hard Rules
- **Never** `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` — use the stored-procedure pattern
- **Never** `console.log/error/warn` — use `logger`
- **Never** `any` — use `unknown` + narrowing or proper interfaces
- **Never** `import { PrismaClient } from '@prisma/client'` — always `import prisma from '@/lib/db'`
- **Never** `process.env.X` in components — import from `src/lib/env.ts`
- **Never** modify files in `src/components/ui/` (shadcn-managed)
- **Always** validate API input with Zod
- **Always** `where: { deletedAt: null }` on soft-deletable models
- Do not make changes until you have 95% confidence in what needs to be built — ask follow-up questions first
