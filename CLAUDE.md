# Hexa Steel® OTS — Claude Code Guidelines

## Project Overview
Enterprise ERP for steel fabrication projects. Next.js 15 App Router + TypeScript + Prisma + MySQL.
Deployed at `hexasteel.sa/ots` with optional `NEXT_PUBLIC_BASE_PATH` subpath.
**Current version:** `16.1.0` — Supply Chain UX Improvements & Dolibarr Integrations (Minor Release)

---

## Development Branch
Always develop on: `claude/review-ots-improvements-LJzXb`
Never push directly to `main`.

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
