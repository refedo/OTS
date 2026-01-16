# Operation Stages Update

## Overview
Updated the operation stages to include 15 comprehensive milestones covering the entire project lifecycle from contract signing to erection completion.

## New Operation Stages (15 Total)

### 1. **CONTRACT_SIGNED** - Signing Contract
- **Order:** 1
- **Auto Source:** Manual
- **Description:** Contract signed with client
- **Color:** Blue (#3b82f6)
- **Icon:** 📝
- **Mandatory:** Yes

### 2. **DOWN_PAYMENT_RECEIVED** - Down Payment Receiving
- **Order:** 2
- **Auto Source:** Manual
- **Description:** Down payment received from client
- **Color:** Green (#10b981)
- **Icon:** 💰
- **Mandatory:** Yes

### 3. **DESIGN_SUBMITTED** - Design Submitted
- **Order:** 3
- **Auto Source:** `document_control:DESIGN_SUBMITTED`
- **Description:** Design package submitted to client
- **Color:** Orange (#f59e0b)
- **Icon:** 📐
- **Mandatory:** Yes

### 4. **DESIGN_APPROVED** - Design Approved
- **Order:** 4
- **Auto Source:** `document_control:DESIGN_APPROVED`
- **Description:** Design package approved by client
- **Color:** Green (#10b981)
- **Icon:** ✅
- **Mandatory:** Yes

### 5. **SHOP_SUBMITTED** - Shop Drawing Submitted
- **Order:** 5
- **Auto Source:** `document_control:SHOP_SUBMITTED`
- **Description:** Shop drawings submitted to client
- **Color:** Orange (#f59e0b)
- **Icon:** 📋
- **Mandatory:** Yes

### 6. **SHOP_APPROVED** - Shop Drawing Approved
- **Order:** 6
- **Auto Source:** `document_control:SHOP_APPROVED`
- **Description:** Shop drawings approved by client
- **Color:** Green (#10b981)
- **Icon:** ✅
- **Mandatory:** Yes

### 7. **PROCUREMENT_STARTED** - Procurement Started
- **Order:** 7
- **Auto Source:** `procurement:STARTED`
- **Description:** Material procurement initiated
- **Color:** Purple (#8b5cf6)
- **Icon:** 🛒
- **Mandatory:** Yes

### 8. **PRODUCTION_STARTED** - Production Started
- **Order:** 8
- **Auto Source:** `production:FIRST_LOG`
- **Description:** Production/fabrication started (captured from first production log)
- **Color:** Orange (#f59e0b)
- **Icon:** 🏭
- **Mandatory:** Yes
- **Note:** Automatically captured when the first production log is created

### 9. **PRODUCTION_COMPLETED** - Production Completed
- **Order:** 9
- **Auto Source:** `production:COMPLETED`
- **Description:** Production/fabrication completed
- **Color:** Green (#10b981)
- **Icon:** ✅
- **Mandatory:** Yes

### 10. **COATING_STARTED** - Coating Started
- **Order:** 10
- **Auto Source:** `coating:STARTED`
- **Description:** Coating/galvanizing process started
- **Color:** Orange (#f59e0b)
- **Icon:** 🎨
- **Mandatory:** No (optional for projects without coating)

### 11. **COATING_COMPLETED** - Coating Completed
- **Order:** 11
- **Auto Source:** `coating:COMPLETED`
- **Description:** Coating/galvanizing process completed
- **Color:** Green (#10b981)
- **Icon:** ✅
- **Mandatory:** No (optional for projects without coating)

### 12. **DISPATCHING_STARTED** - Dispatching Started
- **Order:** 12
- **Auto Source:** `dispatching:STARTED`
- **Description:** Dispatching/delivery started
- **Color:** Orange (#f59e0b)
- **Icon:** 🚚
- **Mandatory:** Yes

### 13. **DISPATCHING_COMPLETED** - Dispatching Completed
- **Order:** 13
- **Auto Source:** `dispatching:COMPLETED`
- **Description:** All materials dispatched to site
- **Color:** Green (#10b981)
- **Icon:** ✅
- **Mandatory:** Yes

### 14. **ERECTION_STARTED** - Erection Started
- **Order:** 14
- **Auto Source:** `erection:STARTED`
- **Description:** On-site erection/installation started
- **Color:** Orange (#f59e0b)
- **Icon:** 🏗️
- **Mandatory:** Yes

### 15. **ERECTION_COMPLETED** - Erection Completed
- **Order:** 15
- **Auto Source:** `erection:COMPLETED`
- **Description:** On-site erection/installation completed
- **Color:** Green (#10b981)
- **Icon:** 🎉
- **Mandatory:** Yes

## Database Changes

### Schema Updates
1. **OperationStageConfig Table:**
   - Renamed `orderIndex` → `stageOrder`
   - Added relation to `OperationEvent` via `stageCode`

2. **OperationEvent Table:**
   - Added `stageConfig` relation
   - Updated stage codes to match new naming convention

### Migration Steps

**Option 1: Manual SQL Execution (Recommended if dev server is running)**
```sql
-- Run the SQL file directly in your MySQL database
source prisma/migrations/update_operation_stages.sql
```

**Option 2: Prisma Migration (Requires stopping dev server)**
```bash
# Stop the dev server first
npm run dev (Ctrl+C)

# Run migration
npx prisma migrate dev --name update_operation_stages

# Regenerate Prisma client
npx prisma generate

# Run seed script
npx tsx prisma/seed-operation-stages.ts

# Restart dev server
npm run dev
```

## Automatic Event Capture

### Production Started (Special Case)
The `PRODUCTION_STARTED` event is automatically captured when the **first production log** is created for a project/building. This ensures accurate tracking of when actual fabrication begins.

**Implementation in Production Log API:**
```typescript
// When creating first production log
if (isFirstLog) {
  await captureProductionEvent({
    projectId,
    buildingId,
    stage: 'PRODUCTION_STARTED',
    eventDate: productionLog.date,
    status: 'Completed',
  });
}
```

### Other Auto-Captured Events
- **DESIGN_SUBMITTED/APPROVED** - From Document Control module
- **SHOP_SUBMITTED/APPROVED** - From Document Control module
- **PROCUREMENT_STARTED** - From Procurement module
- **PRODUCTION_COMPLETED** - From Production module
- **COATING_STARTED/COMPLETED** - From Coating/QC module
- **DISPATCHING_STARTED/COMPLETED** - From Dispatching module
- **ERECTION_STARTED/COMPLETED** - From Erection module

## Event Management Page

The Event Management page (`/operations/events`) now displays all 15 stages in the dropdown, allowing users to manually create events for any stage, especially:
- Contract Signing
- Down Payment Receiving
- Any stage that needs manual override or correction

## Color Coding System

- 🟢 **Green (#10b981)** - Completed/Approved stages
- 🟠 **Orange (#f59e0b)** - In Progress/Submitted stages
- 🔵 **Blue (#3b82f6)** - Initial stages (Contract)
- 🟣 **Purple (#8b5cf6)** - Procurement stages

## Benefits

1. **Complete Lifecycle Tracking** - From contract to completion
2. **Financial Milestones** - Track contract signing and payments
3. **Automatic Capture** - Most events captured automatically from existing modules
4. **Manual Override** - Can manually add/edit events via Event Management page
5. **Visual Timeline** - Color-coded stages for easy status identification
6. **Progress Monitoring** - Track project progress across all phases
7. **SLA Compliance** - Monitor delays at each stage

## Next Steps

1. **Run the migration** (see Migration Steps above)
2. **Update production log API** to capture PRODUCTION_STARTED event
3. **Test Event Management page** with new stages
4. **Update Operations Timeline** visualization to show all 15 stages
5. **Configure auto-capture** in other modules (procurement, coating, dispatching, erection)

## Files Created/Modified

- ✅ `prisma/schema.prisma` - Updated OperationStageConfig and OperationEvent models
- ✅ `prisma/seed-operation-stages.ts` - Seed script for new stages
- ✅ `prisma/migrations/update_operation_stages.sql` - Manual migration SQL
- ✅ `src/app/operations/events/page.tsx` - Event Management page (already supports new stages)
- ✅ `OPERATION_STAGES_UPDATE.md` - This documentation

## Status

✅ **Schema Updated**
✅ **Seed Script Created**
✅ **Migration SQL Ready**
✅ **Event Management Page Ready**
⏳ **Pending: Run Migration & Seed**
⏳ **Pending: Update Production Log API for auto-capture**
