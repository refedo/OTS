# Fix Migration Drift Without Data Loss

## Problem
The database schema exists but Prisma migration history is out of sync. This happens when the database was created/modified outside of Prisma migrations.

## Solution: Baseline the Existing Database

### Step 1: Create a baseline migration (without applying it)

```bash
npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/0_init/migration.sql
```

This creates a migration file that represents your current schema.

### Step 2: Mark the baseline as applied (without running it)

```bash
npx prisma migrate resolve --applied 0_init
```

This tells Prisma "this migration is already applied to the database" without actually running it.

### Step 3: Now create the new migration for Phase 1 modules

```bash
npx prisma migrate dev --name add_qc_specialized_modules
```

This will only create migrations for the NEW tables (MaterialInspection, WeldingInspection, etc.)

## Alternative: Use db push for development

If you're still in development and want to avoid migration files:

```bash
npx prisma db push
```

This syncs your schema to the database without creating migration files. Good for rapid development.

## What Each Command Does

- `migrate diff`: Compares two schemas and generates SQL
- `migrate resolve --applied`: Marks a migration as applied without running it
- `migrate dev`: Creates and applies new migrations
- `db push`: Syncs schema directly (no migration history)

## Recommendation

For your situation, use **db push** since you're actively developing:

```bash
npx prisma db push
```

Then later when you're ready for production, create proper migrations.
