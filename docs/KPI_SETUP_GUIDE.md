# KPI Engine Setup Guide

## 🚀 Complete Setup Instructions

This guide will help you set up the KPI Engine with seed data, scheduled jobs, and event hooks.

---

## Step 1: Install Dependencies

```bash
# Install node-cron for scheduled jobs
npm install node-cron
npm install -D @types/node-cron
```

---

## Step 2: Generate Prisma Client

The Prisma client needs to be regenerated to include the new KPI models:

```bash
# Generate Prisma client
npx prisma generate
```

**Note:** If you see errors about KPI models not existing, this is because the Prisma client hasn't been regenerated yet. The `npx prisma generate` command will fix this.

---

## Step 3: Seed KPI Definitions

Run the seed script to create 8 sample KPI definitions:

```bash
# Run the KPI seed script
npx ts-node prisma/seed-kpi.ts
```

**This will create:**
1. **PROD_PRODUCTIVITY** - Production Productivity (tons/hr)
2. **QC_NCR_CLOSURE** - NCR Closure Rate (%)
3. **PROJECT_ON_TIME** - On-Time Project Completion (%)
4. **QC_RFI_APPROVAL** - RFI Approval Rate (%)
5. **PLANNING_ADHERENCE** - Phase Schedule Adherence (%)
6. **PROD_OUTPUT** - Production Output (logs count)
7. **QC_NCR_RATE** - NCR Generation Rate (count)
8. **PROJECT_ACTIVE** - Active Projects (count)

---

## Step 4: Initialize KPI Scheduler (Optional)

To enable automatic KPI calculations, add the scheduler to your server startup.

### Option A: Next.js App Router (Recommended)

Create or update `src/app/api/init/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { initializeKPISystem } from '@/lib/kpi/init';

// This endpoint initializes the KPI system
export async function GET() {
  try {
    initializeKPISystem();
    return NextResponse.json({ message: 'KPI System initialized' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to initialize KPI System' }, { status: 500 });
  }
}
```

Then call this endpoint once after server starts:
```bash
curl http://localhost:3000/api/init
```

### Option B: Custom Server

If you're using a custom server (e.g., `server.ts`):

```typescript
import { initializeKPISystem } from './src/lib/kpi/init';

// After server starts
initializeKPISystem();
```

---

## Step 5: Trigger Initial Calculation

After seeding, trigger the first KPI calculation:

### Via API:

```bash
# Calculate all monthly KPIs
curl -X POST http://localhost:3000/api/kpi/recalculate \
  -H "Content-Type: application/json" \
  -d '{"frequency": "monthly"}'

# Or calculate all weekly KPIs
curl -X POST http://localhost:3000/api/kpi/recalculate \
  -H "Content-Type: application/json" \
  -d '{"frequency": "weekly"}'
```

### Via UI:

1. Go to `/kpi/definitions`
2. Click on a KPI definition
3. Click "Recalculate" button

---

## ✅ Verification

### Check KPI Definitions

```bash
# View all KPI definitions
curl http://localhost:3000/api/kpi/definitions
```

### Check Dashboard

Visit: `http://localhost:3000/kpi/dashboard`

You should see:
- Summary statistics
- KPI cards
- Any active alerts

---

## 🔄 How It Works

### Scheduled Jobs

Once initialized, the scheduler will run automatically:

- **Daily KPIs**: Every day at 03:00 UTC
- **Weekly KPIs**: Every Monday at 04:00 UTC
- **Monthly KPIs**: 1st day of month at 04:00 UTC

### Event Hooks

KPIs are automatically recalculated when:

✅ **Production Log Created** → Recalculates production KPIs
✅ **NCR Created/Updated** → Recalculates QC KPIs
✅ **RFI Status Changed** → Recalculates QC KPIs
✅ **Project Completed** → Recalculates project KPIs

### Manual Triggers

You can also trigger calculations manually:

1. **Via API**: `POST /api/kpi/recalculate`
2. **Via UI**: KPI Definitions page → Recalculate button

---

## 📊 KPI Formulas Explained

### 1. Production Productivity
```
Formula: {PRODUCTION.PROCESSED_TONS_30D} / {PRODUCTION.MAN_HOURS_30D}
Target: 0.5 tons/hr
Frequency: Monthly
```
Measures how many tons are produced per man-hour.

### 2. NCR Closure Rate
```
Formula: ({QC.NCR_CLOSED_COUNT} / {QC.NCR_TOTAL_COUNT}) * 100
Target: 90%
Frequency: Monthly
```
Percentage of NCRs that are closed within the period.

### 3. On-Time Project Completion
```
Formula: ({PROJECT.COMPLETED_ON_TIME} / {PROJECT.COMPLETED_TOTAL}) * 100
Target: 85%
Frequency: Monthly
```
Percentage of projects completed on or before deadline.

### 4. RFI Approval Rate
```
Formula: ({QC.RFI_APPROVED_COUNT} / {QC.RFI_TOTAL_COUNT}) * 100
Target: 95%
Frequency: Weekly
```
Percentage of RFIs that are approved (vs rejected).

### 5. Phase Schedule Adherence
```
Formula: {PLANNING.PHASE_ADHERENCE}
Target: 80%
Frequency: Monthly
```
Percentage of project phases completed on schedule.

### 6. Production Output
```
Formula: {PRODUCTION.LOGS_COUNT}
Target: 100 logs
Frequency: Weekly
```
Number of production logs created (activity measure).

### 7. NCR Generation Rate
```
Formula: {QC.NCR_OPEN_COUNT}
Target: 5 NCRs (lower is better)
Frequency: Weekly
```
Number of open NCRs (quality issue indicator).

### 8. Active Projects
```
Formula: {PROJECT.ACTIVE_COUNT}
Target: 10 projects
Frequency: Daily
```
Number of currently active projects (workload measure).

---

## 🎯 Status Determination

KPIs are automatically assigned a status based on their value vs target:

- **OK** (Green): Value ≥ 90% of target
- **Warning** (Yellow): Value ≥ 70% and < 90% of target
- **Critical** (Red): Value < 70% of target

### Examples:

**Production Productivity:**
- Target: 0.5 tons/hr
- Value: 0.48 tons/hr → **OK** (96% of target)
- Value: 0.40 tons/hr → **Warning** (80% of target)
- Value: 0.30 tons/hr → **Critical** (60% of target)

**NCR Closure Rate:**
- Target: 90%
- Value: 92% → **OK** (102% of target)
- Value: 75% → **Warning** (83% of target)
- Value: 60% → **Critical** (67% of target)

---

## 🔧 Troubleshooting

### Issue: Prisma errors about KPI models

**Solution:**
```bash
npx prisma generate
```

### Issue: Scheduler not running

**Solution:**
1. Check if `initializeKPISystem()` was called
2. Check server logs for scheduler messages
3. Verify node-cron is installed

### Issue: KPIs not calculating

**Solution:**
1. Check if KPI definitions exist: `GET /api/kpi/definitions`
2. Trigger manual calculation: `POST /api/kpi/recalculate`
3. Check server logs for errors
4. Verify source data exists (production logs, NCRs, etc.)

### Issue: No data in dashboard

**Solution:**
1. Seed KPI definitions: `npx ts-node prisma/seed-kpi.ts`
2. Trigger calculation: `POST /api/kpi/recalculate`
3. Verify you have source data (production logs, projects, etc.)

---

## 📝 Next Steps

After setup:

1. **View Dashboard**: `/kpi/dashboard`
2. **Manage KPIs**: `/kpi/definitions`
3. **Check Alerts**: `/kpi/alerts`
4. **Manual Entries**: `/kpi/manual`

---

## 🔐 Permissions

Remember RBAC rules:

- **Admin**: Full access, can create/edit KPIs
- **Manager**: View department KPIs, create manual entries
- **HR**: View company and employee KPIs
- **Employee**: View own KPIs only

---

## 📚 Additional Resources

- **Complete Documentation**: `docs/KPI_ENGINE.md`
- **Quick Start**: `docs/KPI_QUICK_START.md`
- **Safe Migrations**: `docs/SAFE_MIGRATIONS.md`

---

**Your KPI Engine is now ready to use!** 🎉
