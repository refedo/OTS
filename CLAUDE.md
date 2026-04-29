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

### Critical Constraint
Never use:
```sql
ALTER TABLE ... ADD COLUMN IF NOT EXISTS
```

Use conditional stored procedure pattern instead.

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
