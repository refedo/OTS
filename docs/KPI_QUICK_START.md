# KPI Engine - Quick Start Guide

## ✅ What's Been Completed

### 1. Database Models (100% Complete)
All KPI tables have been added to your database:
- ✅ `KPIDefinition` - KPI formulas and configuration
- ✅ `KPIScore` - Calculated KPI values
- ✅ `KPITarget` - Target values per entity
- ✅ `KPIManualEntry` - Manual entries with approval
- ✅ `KPIHistory` - Complete audit trail
- ✅ `KPIAlert` - Threshold breach alerts

### 2. Formula Engine (100% Complete)
- ✅ Token-based formula language
- ✅ 15+ predefined tokens
- ✅ 5 ready-to-use formulas
- ✅ Automatic entity filtering
- ✅ Period-based calculations

### 3. Calculator Engine (100% Complete)
- ✅ Automatic KPI calculation
- ✅ Batch processing
- ✅ Status determination (ok/warning/critical)
- ✅ Alert generation
- ✅ Manual entry approval

---

## 🚀 Quick Test

### Test Formula Evaluation

Create a test file: `test-kpi.ts`

```typescript
import { evaluateFormula } from './src/lib/kpi/formula-parser';

async function testKPI() {
  const result = await evaluateFormula(
    '{PRODUCTION.PROCESSED_TONS_30D} / {PRODUCTION.MAN_HOURS_30D}',
    'company',
    null,
    new Date('2025-01-01'),
    new Date('2025-01-31')
  );
  
  console.log('Productivity:', result.value, 'tons/hr');
  console.log('Raw values:', result.rawValues);
}

testKPI();
```

Run:
```bash
npx ts-node test-kpi.ts
```

---

## 📋 Next Implementation Steps

### Priority 1: API Endpoints (Week 1)

Create these files:

#### 1. KPI Definitions API
**File**: `src/app/api/kpi/definitions/route.ts`
```typescript
// GET - List all KPI definitions
// POST - Create new KPI definition (Admin only)
```

**File**: `src/app/api/kpi/definitions/[id]/route.ts`
```typescript
// GET - Get single KPI definition
// PATCH - Update KPI definition (Admin only)
// DELETE - Delete KPI definition (Admin only)
```

#### 2. KPI Scores API
**File**: `src/app/api/kpi/scores/route.ts`
```typescript
// GET - Get KPI scores with filters
// Query params: entityType, entityId, kpiId, periodStart, periodEnd
```

#### 3. Manual Entries API
**File**: `src/app/api/kpi/manual-entries/route.ts`
```typescript
// GET - List manual entries
// POST - Create manual entry (Manager/Admin)
```

**File**: `src/app/api/kpi/manual-entries/[id]/approve/route.ts`
```typescript
// PATCH - Approve manual entry (Manager/Admin)
```

#### 4. Dashboard API
**File**: `src/app/api/kpi/dashboard/route.ts`
```typescript
// GET - Company/Department dashboard data
```

**File**: `src/app/api/kpi/dashboard/employee/[id]/route.ts`
```typescript
// GET - Employee KPI dashboard
```

#### 5. Alerts API
**File**: `src/app/api/kpi/alerts/route.ts`
```typescript
// GET - List alerts
```

**File**: `src/app/api/kpi/alerts/[id]/acknowledge/route.ts`
```typescript
// PATCH - Acknowledge alert
```

#### 6. Recalculation API
**File**: `src/app/api/kpi/recalculate/route.ts`
```typescript
// POST - Trigger manual recalculation (Admin only)
```

---

### Priority 2: UI Pages (Week 2)

#### 1. KPI Definitions Management
**File**: `src/app/kpi/definitions/page.tsx`
- List all KPI definitions
- Create/Edit/Delete KPIs
- Test formula button
- Admin only

#### 2. Company Dashboard
**File**: `src/app/kpi/dashboard/page.tsx`
- Company-wide KPI cards
- Department comparison
- Trend charts
- Export button

#### 3. Department Dashboard
**File**: `src/app/kpi/department/[id]/page.tsx`
- Department KPI cards
- Team member comparison
- Project KPIs in department

#### 4. Employee Dashboard
**File**: `src/app/kpi/employee/[id]/page.tsx`
- Individual KPI scores
- Historical trends
- Radar chart
- Manual entries

#### 5. Project Dashboard
**File**: `src/app/kpi/project/[id]/page.tsx`
- Project-specific KPIs
- Phase performance
- Team performance

#### 6. Manual Entries
**File**: `src/app/kpi/manual/page.tsx`
- Create manual entries
- Approval queue
- History

#### 7. Alerts Center
**File**: `src/app/kpi/alerts/page.tsx`
- Active alerts list
- Acknowledge button
- Alert history

---

### Priority 3: Scheduled Jobs (Week 3)

**File**: `src/lib/kpi/scheduler.ts`

```typescript
import cron from 'node-cron';
import { recalculateKPIsByFrequency } from './calculator';

// Daily job @ 03:00
cron.schedule('0 3 * * *', async () => {
  console.log('Running daily KPI calculation...');
  await recalculateKPIsByFrequency('daily');
});

// Weekly job @ Monday 04:00
cron.schedule('0 4 * * 1', async () => {
  console.log('Running weekly KPI calculation...');
  await recalculateKPIsByFrequency('weekly');
});

// Monthly job @ 1st day 04:00
cron.schedule('0 4 1 * *', async () => {
  console.log('Running monthly KPI calculation...');
  await recalculateKPIsByFrequency('monthly');
});
```

Install dependency:
```bash
npm install node-cron
npm install -D @types/node-cron
```

---

### Priority 4: Event Hooks (Week 3)

Add hooks to existing API routes:

#### Production Log Hook
**File**: `src/app/api/production/logs/route.ts`

```typescript
// After creating/updating production log
import { calculateAndStoreKPI } from '@/lib/kpi/calculator';

// Recalculate production KPIs
const productionKPIs = await prisma.kPIDefinition.findMany({
  where: {
    isActive: true,
    sourceModules: { array_contains: 'production' }
  }
});

for (const kpi of productionKPIs) {
  await calculateAndStoreKPI(
    kpi.id,
    'project',
    productionLog.assemblyPart.projectId,
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    new Date()
  );
}
```

#### NCR Hook
**File**: `src/app/api/qc/ncr/route.ts`

```typescript
// After NCR status change
// Recalculate QC KPIs
```

#### Project Completion Hook
**File**: `src/app/api/projects/[id]/route.ts`

```typescript
// After project status = 'Completed'
// Recalculate project KPIs
```

---

### Priority 5: Seed Data (Week 4)

**File**: `prisma/seed-kpi.ts`

```typescript
import { PrismaClient } from '@prisma/client';
import { PREDEFINED_FORMULAS } from '../src/lib/kpi/formula-parser';

const prisma = new PrismaClient();

async function seedKPIs() {
  // Get admin user
  const admin = await prisma.user.findFirst({
    where: { role: { name: 'Admin' } }
  });

  if (!admin) {
    console.error('Admin user not found');
    return;
  }

  // Seed predefined KPIs
  for (const [key, kpi] of Object.entries(PREDEFINED_FORMULAS)) {
    await prisma.kPIDefinition.create({
      data: {
        code: kpi.code,
        name: kpi.name,
        description: kpi.description,
        formula: kpi.formula,
        frequency: 'monthly',
        weight: 10,
        target: kpi.target,
        unit: kpi.unit,
        calculationType: 'auto',
        sourceModules: ['production', 'qc', 'projects'],
        createdById: admin.id,
        updatedById: admin.id,
      },
    });
    console.log(`✓ Created KPI: ${kpi.name}`);
  }
}

seedKPIs()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

Run:
```bash
npx ts-node prisma/seed-kpi.ts
```

---

## 🎯 Available Formulas

### 1. Production Productivity
```
Formula: {PRODUCTION.PROCESSED_TONS_30D} / {PRODUCTION.MAN_HOURS_30D}
Unit: tons/hr
Target: 0.5
```

### 2. NCR Closure Rate
```
Formula: ({QC.NCR_CLOSED_COUNT} / {QC.NCR_TOTAL_COUNT}) * 100
Unit: %
Target: 90
```

### 3. Project On-Time Completion
```
Formula: ({PROJECT.COMPLETED_ON_TIME} / {PROJECT.COMPLETED_TOTAL}) * 100
Unit: %
Target: 85
```

### 4. RFI Approval Rate
```
Formula: ({QC.RFI_APPROVED_COUNT} / {QC.RFI_TOTAL_COUNT}) * 100
Unit: %
Target: 95
```

### 5. Phase Schedule Adherence
```
Formula: {PLANNING.PHASE_ADHERENCE}
Unit: %
Target: 80
```

---

## 📊 Adding New Tokens

To add a new metric token:

1. Open `src/lib/kpi/formula-parser.ts`
2. Add to `TOKEN_LIBRARY`:

```typescript
'MODULE.NEW_METRIC': async (entityType, entityId, periodStart, periodEnd) => {
  const where: any = {
    createdAt: { gte: periodStart, lte: periodEnd },
  };
  
  // Add entity filtering
  if (entityType === 'project' && entityId) {
    where.projectId = entityId;
  } else if (entityType === 'department' && entityId) {
    where.departmentId = entityId;
  } else if (entityType === 'user' && entityId) {
    where.userId = entityId;
  }
  
  // Query and return numeric value
  const result = await prisma.model.aggregate({
    where,
    _sum: { field: true },
  });
  
  return result._sum.field || 0;
}
```

3. Use in formulas: `{MODULE.NEW_METRIC}`

---

## 🔐 RBAC Permissions

### Admin
- ✅ Create/Edit/Delete KPI definitions
- ✅ View all KPIs (company/department/employee/project)
- ✅ Approve manual entries
- ✅ Trigger recalculations
- ✅ Acknowledge alerts

### Manager
- ✅ View department KPIs
- ✅ View team member KPIs
- ✅ Create manual entries for team
- ✅ Approve manual entries for team
- ✅ Acknowledge department alerts

### HR
- ✅ View company-wide KPIs
- ✅ View all employee KPIs
- ✅ Export reports

### Employee
- ✅ View own KPIs only
- ✅ View own manual entries
- ❌ Cannot create manual entries (manager does)

---

## 📚 Documentation Files

1. **KPI_ENGINE.md** - Complete technical documentation
2. **SAFE_MIGRATIONS.md** - Database migration guide
3. **KPI_QUICK_START.md** - This file

---

## ✅ Verification Checklist

- [x] Database models created
- [x] Schema synced with `db push`
- [x] Formula parser implemented
- [x] Calculator engine implemented
- [x] Token library with 15+ tokens
- [x] 5 predefined formulas
- [x] Documentation created
- [ ] API endpoints (Week 1)
- [ ] UI pages (Week 2)
- [ ] Scheduled jobs (Week 3)
- [ ] Event hooks (Week 3)
- [ ] Seed data (Week 4)

---

## 🚀 Start Building

**Next Step**: Create the API endpoints

Start with:
```bash
mkdir -p src/app/api/kpi/definitions
touch src/app/api/kpi/definitions/route.ts
```

Then implement the GET and POST handlers following the patterns in your existing API routes.

---

**Foundation Complete! Ready for API and UI development.** 🎉
