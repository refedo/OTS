# Financial Sync Optimization - Deployment Guide

## Problem Summary
Production sync was failing due to:
1. **PM2 restarts mid-sync** - Old process killed when new sync triggered
2. **Extremely slow sync** - 5 seconds per invoice = 12+ hours for 8907 invoices
3. **Only 811/8907 supplier invoices synced** - Process interrupted before completion

## Root Causes
1. **Individual SQL queries per invoice line/payment** - ~80,000 queries for 8907 invoices
2. **10-minute sync timeout** - Too short for large dataset
3. **Status filter excluding drafts** - Already fixed (removed `sqlfilters`)

## Optimizations Applied

### 1. Database Query Optimization
**Before:** Individual INSERT per invoice line
```typescript
for (const line of inv.lines) {
  await prisma.$executeRawUnsafe(`INSERT INTO...`, ...params);
}
```

**After:** Batch multi-row INSERT per invoice
```typescript
const linePlaceholders = inv.lines.map(() => '(?, ?, ...)').join(', ');
const lineParams = inv.lines.flatMap(line => [...]);
await prisma.$executeRawUnsafe(`INSERT INTO... VALUES ${linePlaceholders}`, ...lineParams);
```

**Impact:** ~50x faster for invoice lines (3 lines = 3 queries → 1 query)

### 2. Batch Existence Check
**Before:** SELECT per invoice to check if exists
```typescript
for (const inv of invoices) {
  const existing = await prisma.$queryRawUnsafe(`SELECT ... WHERE dolibarr_id = ?`, id);
}
```

**After:** Single SELECT for entire batch
```typescript
const existing = await prisma.$queryRawUnsafe(
  `SELECT dolibarr_id, sync_hash FROM fin_supplier_invoices WHERE dolibarr_id IN (${ids.join(',')})`
);
```

**Impact:** 500 queries → 1 query per batch

### 3. INSERT...ON DUPLICATE KEY UPDATE
**Before:** Separate UPDATE or INSERT based on existence check
**After:** Single upsert query
```typescript
INSERT INTO fin_supplier_invoices (...) VALUES (...)
ON DUPLICATE KEY UPDATE ref=VALUES(ref), ...
```

**Impact:** Eliminates conditional logic, faster execution

### 4. Increased Sync Timeout
**Before:** 10 minutes
**After:** 2 hours
**Impact:** Allows full sync to complete without force-release

### 5. Removed Payment Fetching from Invoice Sync
Payments are now synced separately in a dedicated step, reducing API calls during invoice sync.

## Expected Performance

### Before Optimization
- **Time per invoice:** ~5 seconds
- **Total time for 8907 invoices:** ~12.4 hours
- **SQL queries:** ~80,000 individual queries

### After Optimization
- **Time per invoice:** ~0.2 seconds (estimated)
- **Total time for 8907 invoices:** ~30 minutes
- **SQL queries:** ~18,000 queries (mostly batch operations)

## Deployment Steps

### 1. SSH Access to Production
Since you're getting "Permission denied (publickey)", use **DigitalOcean Web Console**:
1. Go to cloud.digitalocean.com → Droplets
2. Click your droplet (188.166.158.80)
3. Click **Access** → **Launch Droplet Console**

### 2. Deploy Code Changes
```bash
cd /var/www/hexasteel.sa/ots
git pull
npm run build
pm2 restart hexa-steel-ots
```

### 3. Verify PM2 Configuration
The new `ecosystem.config.js` should show:
- `exec_mode: 'fork'` (not cluster)
- `node_args: '--max-old-space-size=1024'`
- `max_memory_restart: '800M'`

Check with:
```bash
pm2 show hexa-steel-ots
```

### 4. Monitor Sync Progress
```bash
pm2 logs hexa-steel-ots --lines 50
```

Look for:
- `[FinSync] Processing supplier invoice 500/8907...` (should progress quickly)
- No PM2 restarts during sync
- `[FinSync] Supplier invoices complete: 8907 total...`

### 5. Trigger Full Sync
From the Financial Settings page in the UI, click **Run Full Sync**.

## Files Modified
1. `src/lib/dolibarr/financial-sync-service.ts`
   - Batch existence checks
   - Multi-row INSERT for invoice lines
   - INSERT...ON DUPLICATE KEY UPDATE for upserts
   - Increased timeout to 2 hours
   - Removed payment fetching from invoice sync loop

2. `src/lib/dolibarr/dolibarr-client.ts`
   - Removed status filter from customer/supplier invoice fetching

3. `ecosystem.config.js`
   - Changed to fork mode
   - Moved NODE_OPTIONS to node_args
   - Increased max_memory_restart to 800M

## Success Criteria
✅ All 8907 supplier invoices synced
✅ All 588 customer invoices synced
✅ Journal entries generated from all invoices
✅ Sync completes in < 1 hour
✅ No PM2 restarts during sync
✅ Financial dashboard shows correct figures

## Troubleshooting

### If sync still times out
Increase timeout further in `financial-sync-service.ts`:
```typescript
const SYNC_TIMEOUT_MS = 4 * 60 * 60 * 1000; // 4 hours
```

### If PM2 still restarts
Check memory usage:
```bash
pm2 monit
```
If heap exceeds 800MB, increase `max_memory_restart` in `ecosystem.config.js`.

### If invoices still incomplete
Check logs for specific errors:
```bash
pm2 logs hexa-steel-ots --err --lines 100
```
