# ⚠️ IMPORTANT: Run Migration First!

## The 500 Error Fix

The work orders module requires database tables that don't exist yet.

## Quick Fix (3 Steps)

### Step 1: Run Migration
Double-click this file:
```
migrate-work-orders.bat
```

Or run in terminal:
```bash
npx prisma migrate dev --name add_work_order_module
```

### Step 2: Generate Prisma Client
```bash
npx prisma generate
```

### Step 3: Restart Dev Server
```bash
npm run dev
```

## What This Does

Creates two new database tables:
- `WorkOrder` - Stores work order information
- `WorkOrderPart` - Stores parts in each work order

## After Migration

1. ✅ Work Orders will work without 500 errors
2. ✅ You can create work orders
3. ✅ All features will be functional

## Setup Production Settings (Optional but Recommended)

For the dropdowns to work, add:

### Processing Locations
Settings → Production → Locations
- Workshop A
- Workshop B
- Bay 1, Bay 2, etc.

### Processing Teams
Settings → Production → Teams
- Team Alpha
- Team Beta
- Shift 1, Shift 2, etc.

## Test After Migration

1. Go to Production → Work Orders → Create Work Order
2. Select project and building
3. Select groups and parts
4. Verify dropdowns show locations and teams
5. Verify dates are pre-filled
6. Create work order
7. Should succeed without 500 error!

---

**Need Help?** Check `WORK_ORDERS_FIXES.md` for detailed information.
