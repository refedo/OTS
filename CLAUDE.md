# CLAUDE.md

## Project Overview
Hexa Steel® OTS — enterprise ERP for steel fabrication.  
Stack: Next.js 15 (App Router) + TypeScript + Prisma + MySQL  
Deployment: hexasteel.sa/ots

---

## System Priority Order
1. Data integrity
2. Predictability
3. Performance
4. UX

---

## Versioning
- Patch (X.Y.Z): fixes  
- Minor (X.Y.0): features  
- Major (X.0.0): manual only  

On every change:
- Update package.json
- Update changelog.md + UI changelog

---

## Parallel Development Workflow

When multiple sessions run in parallel:
- **Do NOT run `version-manager.js` or touch any version file** during feature development
- Commit and push feature code only (no version bump in those commits)
- When all feature work is pushed, run the release step **once**:
  - `npm run release:patch` — for fixes
  - `npm run release:minor` — for features
- This script pulls the latest remote version first, then bumps from that, then pushes atomically
- If two sessions call `release` at the exact same moment and one fails, simply re-run it

---

## Development Rules
- Work directly on main
- No feature branches or PRs

---

## Core Stack
- Next.js 15
- TypeScript (strict)
- Prisma + MySQL
- Tailwind + shadcn/ui
- Zod (API validation)
- Pino logger
- JWT auth (ots_session)
- React Hook Form
- OpenAI + Anthropic

---

## Core Architecture

### Core Libraries
- db.ts → Prisma client (single source of truth)
- api-utils.ts → auth wrapper + audit
- env.ts → validated environment config
- logger.ts → structured logging
- permissions.ts → RBAC
- services/ → business logic layer
- scheduler/ → cron jobs
- ops-agent/ → automation engine

---

## Auth & API Rules

- All API routes must use withApiContext
- Session via JWT cookie (ots_session)
- Permissions enforced per request

### API Constraints
- Validate all inputs using Zod
- Use select (avoid overfetching)
- Prevent N+1 queries
- Always apply soft-delete filter:

```ts
where: { deletedAt: null }
```

---

## Database Rules

### Migrations
- Stored in: prisma/manual_migrations/
- Executed automatically on server start

### Critical Constraints
Never use MySQL-incompatible conditional DDL:
```sql
ALTER TABLE ... ADD COLUMN IF NOT EXISTS   -- MariaDB only, not MySQL
CREATE INDEX IF NOT EXISTS                 -- not supported in MySQL < 8.0.1
```

### Conditional Column Addition Pattern
Use the stored-procedure pattern for every ADD COLUMN and ADD INDEX:

```sql
DROP PROCEDURE IF EXISTS _mm_column_name;
DELIMITER $$
CREATE PROCEDURE _mm_column_name()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'your_table'
      AND COLUMN_NAME  = 'column_name'
  ) THEN
    ALTER TABLE your_table
      ADD COLUMN column_name VARCHAR(100) NULL AFTER previous_column;
  END IF;
END$$
DELIMITER ;
CALL _mm_column_name();
DROP PROCEDURE IF EXISTS _mm_column_name;
```

### Conditional Index Addition Pattern
```sql
DROP PROCEDURE IF EXISTS _mm_idx_name;
DELIMITER $$
CREATE PROCEDURE _mm_idx_name()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'your_table'
      AND INDEX_NAME   = 'idx_name'
  ) THEN
    ALTER TABLE your_table ADD INDEX idx_name (column_name);
  END IF;
END$$
DELIMITER ;
CALL _mm_idx_name();
DROP PROCEDURE IF EXISTS _mm_idx_name;
```

Rules:
- Name procedures with a short prefix matching the migration (e.g. `_mm_` for material master)
- Always DROP the procedure after CALL to leave no residue
- Check `information_schema.COLUMNS` for columns, `information_schema.STATISTICS` for indexes
- DDL inside procedure bodies does **not** require `PREPARE`/`EXECUTE` — write it directly

---

## Logging

Use structured logging only:
```ts
logger.info({ context }, 'message')
```

- No console.log / console.error / console.warn

---

## Frontend Rules

Standard layout:
1. Hero
2. KPI strip
3. Content cards

Constraints:
- Mobile-first responsive grids
- Consistent Tailwind usage
- Do not modify shadcn base components

### New Page Checklist
When a new page/route is developed, **always** do both:
1. Add it to `src/components/app-sidebar.tsx` under the appropriate section (with `newSince: 'YYYY-MM-DD'`)
2. Add it to `NAVIGATION_PERMISSIONS` in `src/lib/navigation-permissions.ts` with the correct permission(s)  
   — if the route has no permission requirement, set it to `null`  
   — if omitted, `hasAccessToRoute()` returns `false` and the item will be **invisible to all users**

---

## Hard Rules
- No `any` type
- No direct process.env usage (use env.ts)
- Always use centralized Prisma client
- Always validate API input
- Always apply soft-delete filter
- Do not implement without clear understanding

## Date Formatting Rule
**Always use `'en-SA-u-ca-gregory'` (not `'en-SA'`) for all date/time locale calls.**  
`'en-SA'` uses the Islamic/Hijri calendar by default and will show dates like "9 Dhu'l-Q. 1447 AH".  
`'en-SA-u-ca-gregory'` forces the Gregorian calendar with Arabic-region formatting (SAR currency, etc.).  
This applies to: `toLocaleDateString`, `toLocaleString`, `toLocaleTimeString`, and `Intl.DateTimeFormat`.  
Currency/number formatting (`Intl.NumberFormat`, `toLocaleString` with `style: 'currency'`) may keep `'en-SA'` since it only affects number symbols, not calendars.

---

## Anti-Patterns
- Business logic inside API routes
- Direct DB access in components
- Unvalidated input
- Silent failures (no logging)
- Over-fetching Prisma queries

---

## Decision Rules
- Prefer explicit over implicit
- Prefer deterministic logic over AI inference
- Prefer backend enforcement over frontend assumptions

---

## Ops Agent Rules
- Never mutate data without audit log
- Always operate through service layer
- No direct DB writes
- All operations must be idempotent

---

## Performance Rules
- Avoid full table scans
- Always paginate large queries
- Index critical foreign keys
- No blocking operations in API routes

---

## Agent Skills (`.agent/skills/`)

Project-specific reusable instructions for Claude Code sessions are stored in `.agent/skills/`.  
Each skill is a Markdown file that describes a repeatable procedure Claude should follow.

### Structure
```
.agent/skills/
  migration-pattern.md      # how to write idempotent MySQL migrations
  release-checklist.md      # steps before cutting a release
  api-route-template.md     # scaffold for new API routes
  ...
```

### Rules
- One skill per file, named with kebab-case
- Skills are **instructions**, not code — describe the steps, constraints, and patterns
- Reference the skill by filename when asking Claude: _"Follow `.agent/skills/migration-pattern.md`"_
- Keep skills DRY: if a rule already lives in CLAUDE.md, the skill links to it rather than duplicating it
- Skills complement CLAUDE.md — CLAUDE.md holds global invariants, skills hold task-specific procedures
