# KPI Engine Documentation

## Overview

The KPI Engine is an automated performance measurement system that collects metrics from existing modules, calculates KPIs, and provides dashboards for employees, departments, and company-wide performance tracking.

## ✅ Completed Components

### 1. Database Models (Prisma Schema)

**Models Created:**
- `KPIDefinition` - Stores KPI formulas, targets, and metadata
- `KPIScore` - Stores calculated KPI values per entity and period
- `KPITarget` - Stores target values for departments/projects/company
- `KPIManualEntry` - Stores manual KPI entries requiring approval
- `KPIHistory` - Audit log of all KPI actions
- `KPIAlert` - Stores threshold breach alerts

**Key Features:**
- Full RBAC integration with User model
- Cascade delete for data integrity
- Comprehensive indexing for performance
- JSON fields for flexible data storage

### 2. Formula Parser & Token Library

**File:** `src/lib/kpi/formula-parser.ts`

**Supported Tokens:**

#### Production Tokens
- `{PRODUCTION.PROCESSED_TONS_30D}` - Total tons produced
- `{PRODUCTION.MAN_HOURS_30D}` - Total man-hours logged
- `{PRODUCTION.LOGS_COUNT}` - Number of production logs

#### QC Tokens
- `{QC.NCR_OPEN_COUNT}` - Open NCRs
- `{QC.NCR_TOTAL_COUNT}` - Total NCRs
- `{QC.NCR_CLOSED_COUNT}` - Closed NCRs
- `{QC.RFI_APPROVED_COUNT}` - Approved RFIs
- `{QC.RFI_TOTAL_COUNT}` - Total RFIs

#### Project Tokens
- `{PROJECT.COMPLETED_ON_TIME}` - Projects completed on schedule
- `{PROJECT.COMPLETED_TOTAL}` - Total completed projects
- `{PROJECT.ACTIVE_COUNT}` - Active projects

#### Planning Tokens
- `{PLANNING.PHASE_ADHERENCE}` - Phase schedule adherence percentage

**Predefined Formulas:**
1. **Production Productivity**: `{PRODUCTION.PROCESSED_TONS_30D} / {PRODUCTION.MAN_HOURS_30D}`
2. **NCR Closure Rate**: `({QC.NCR_CLOSED_COUNT} / {QC.NCR_TOTAL_COUNT}) * 100`
3. **Project On-Time**: `({PROJECT.COMPLETED_ON_TIME} / {PROJECT.COMPLETED_TOTAL}) * 100`
4. **RFI Approval Rate**: `({QC.RFI_APPROVED_COUNT} / {QC.RFI_TOTAL_COUNT}) * 100`
5. **Phase Adherence**: `{PLANNING.PHASE_ADHERENCE}`

### 3. KPI Calculator Engine

**File:** `src/lib/kpi/calculator.ts`

**Functions:**
- `calculateKPI()` - Calculate single KPI for entity/period
- `calculateAndStoreKPI()` - Calculate and persist to database
- `calculateKPIsForAllEntities()` - Batch calculation
- `recalculateKPIsByFrequency()` - Recalc by frequency (daily/weekly/monthly)
- `approveManualEntry()` - Approve manual KPI entries
- `checkAndCreateAlerts()` - Auto-create alerts on threshold breach

**Status Determination:**
- **OK**: Value ≥ 90% of target
- **Warning**: Value ≥ 70% and < 90% of target
- **Critical**: Value < 70% of target

## 🔄 Next Steps (To Be Implemented)

### Phase 2: API Endpoints

**Required Endpoints:**
```
GET    /api/kpi/definitions           - List KPI definitions
POST   /api/kpi/definitions           - Create KPI definition
PATCH  /api/kpi/definitions/:id       - Update KPI definition
DELETE /api/kpi/definitions/:id       - Delete KPI definition

GET    /api/kpi/scores                - Get KPI scores (filtered)
POST   /api/kpi/scores/recalculate    - Trigger recalculation

GET    /api/kpi/manual-entries        - List manual entries
POST   /api/kpi/manual-entries        - Create manual entry
PATCH  /api/kpi/manual-entries/:id/approve - Approve entry

GET    /api/kpi/dashboard             - Dashboard data
GET    /api/kpi/dashboard/employee/:id - Employee KPIs
GET    /api/kpi/dashboard/department/:id - Department KPIs
GET    /api/kpi/dashboard/project/:id - Project KPIs

GET    /api/kpi/alerts                - List alerts
PATCH  /api/kpi/alerts/:id/acknowledge - Acknowledge alert

GET    /api/kpi/history/:kpiId        - Audit history
```

**RBAC Rules:**
- **Admin**: Full access to all endpoints
- **Manager**: View department KPIs, create/approve manual entries for team
- **HR**: View company and employee KPIs
- **Employee**: View own KPIs only

### Phase 3: UI Components

**Pages Required:**

1. **KPI Definitions Management** (`/kpi/definitions`)
   - List all KPI definitions
   - Create/Edit/Delete KPIs
   - Test formula evaluation
   - Admin only

2. **Company Dashboard** (`/kpi/dashboard`)
   - Company-wide KPI overview
   - Department comparison
   - Trend charts
   - Export functionality

3. **Department Dashboard** (`/kpi/department/:id`)
   - Department-specific KPIs
   - Team member comparison
   - Project KPIs within department

4. **Employee Dashboard** (`/kpi/employee/:id`)
   - Individual KPI scores
   - Historical trends
   - Manual entries
   - Radar chart for skills

5. **Project Dashboard** (`/kpi/project/:id`)
   - Project-specific KPIs
   - Phase performance
   - Team performance on project

6. **Manual Entries** (`/kpi/manual`)
   - Create manual KPI entries
   - Approval queue for managers
   - History of manual entries

7. **Alerts** (`/kpi/alerts`)
   - List of active alerts
   - Acknowledge alerts
   - Alert history

**UI Components:**
- KPI Card (value, target, status badge, sparkline)
- KPI Table (sortable, filterable)
- Trend Chart (line/bar charts)
- Radar Chart (for employee skills)
- Status Badge (ok/warning/critical)
- Formula Editor (with token autocomplete)

### Phase 4: Scheduled Jobs

**Implementation using node-cron or BullMQ:**

```typescript
// Daily job @ 03:00
cron.schedule('0 3 * * *', async () => {
  await recalculateKPIsByFrequency('daily');
});

// Weekly job @ Monday 04:00
cron.schedule('0 4 * * 1', async () => {
  await recalculateKPIsByFrequency('weekly');
});

// Monthly job @ 1st day 04:00
cron.schedule('0 4 1 * *', async () => {
  await recalculateKPIsByFrequency('monthly');
});
```

**Job Dashboard:**
- Last run timestamp
- Success/failure status
- Error logs
- Manual trigger button

### Phase 5: Event-Driven Hooks

**Hooks to Implement:**

```typescript
// After production log creation/update
productionLog.onCreate/onUpdate => {
  recalculate production KPIs for project/department/user
}

// After NCR status change
ncrReport.onStatusChange => {
  recalculate QC KPIs
}

// After project completion
project.onComplete => {
  recalculate project completion KPIs
}

// After RFI approval/rejection
rfiRequest.onStatusChange => {
  recalculate RFI KPIs
}
```

### Phase 6: Notifications

**Alert System:**
- In-app notifications
- Email notifications (critical alerts)
- Alert aggregation (daily digest)
- Notification preferences per user

**Alert Levels:**
- **Warning** (< 90% target): In-app notification to manager
- **Critical** (< 70% target): In-app + email to manager & HR

### Phase 7: Seed Data

**Sample KPI Definitions to Seed:**

1. **PROD_ON_TIME** - On-Time Production %
2. **PROD_PRODUCTIVITY** - Tons per labor-hour
3. **QC_NCR_CLOSURE** - NCR Closure Rate %
4. **PROJECT_ON_TIME** - On-Time Project Completion %
5. **QC_RFI_APPROVAL** - RFI Approval Rate %
6. **PLANNING_ADHERENCE** - Phase Schedule Adherence %
7. **SAFETY_INCIDENTS** - Safety Incident Count (manual)
8. **HR_ATTENDANCE** - Attendance Rate % (manual)

## Database Migration

To apply the KPI models to your database:

```bash
# Generate migration
npx prisma migrate dev --name add_kpi_engine

# Or push directly (development)
npx prisma db push

# Generate Prisma client
npx prisma generate
```

## Formula Language Guide

### Token Syntax
Tokens are wrapped in curly braces: `{MODULE.METRIC}`

### Example Formulas

**Simple Division:**
```
{PRODUCTION.PROCESSED_TONS_30D} / {PRODUCTION.MAN_HOURS_30D}
```

**Percentage Calculation:**
```
({QC.NCR_CLOSED_COUNT} / {QC.NCR_TOTAL_COUNT}) * 100
```

**Conditional Logic (future):**
```
{PROJECT.COMPLETED_ON_TIME} > 0 ? ({PROJECT.COMPLETED_ON_TIME} / {PROJECT.COMPLETED_TOTAL}) * 100 : 0
```

### Adding New Tokens

1. Add token function to `TOKEN_LIBRARY` in `formula-parser.ts`
2. Follow naming convention: `{MODULE.METRIC_NAME}`
3. Return numeric value
4. Handle entity filtering (user/department/project)
5. Handle period filtering (periodStart/periodEnd)

Example:
```typescript
'MODULE.NEW_METRIC': async (entityType, entityId, periodStart, periodEnd) => {
  const where: any = {
    createdAt: { gte: periodStart, lte: periodEnd },
  };
  
  if (entityType === 'project' && entityId) {
    where.projectId = entityId;
  }
  
  const result = await prisma.model.aggregate({
    where,
    _sum: { field: true },
  });
  
  return result._sum.field || 0;
}
```

## Security Considerations

1. **Formula Evaluation**: Uses `Function` constructor - only allow admin to create/edit formulas
2. **SQL Injection**: All queries use Prisma ORM - safe from SQL injection
3. **RBAC**: All API endpoints must check user permissions
4. **Data Privacy**: Employee KPIs only visible to employee, manager, HR, and admin
5. **Audit Trail**: All KPI actions logged in `KPIHistory`

## Performance Optimization

1. **Indexing**: All foreign keys and frequently queried fields are indexed
2. **Batch Processing**: Calculate multiple KPIs in parallel
3. **Caching**: Consider Redis for frequently accessed KPI scores
4. **Materialized Views**: For complex aggregations, use DB views
5. **Throttling**: Limit manual recalculation requests

## Testing Strategy

### Unit Tests
- Formula parser token evaluation
- Status determination logic
- Period date calculation

### Integration Tests
- KPI calculation with mock data
- Manual entry approval workflow
- Alert creation on threshold breach

### E2E Tests
- Complete KPI lifecycle
- Dashboard data accuracy
- Permission enforcement

## Maintenance

### Regular Tasks
- Review and optimize slow KPI formulas
- Archive old KPI scores (> 2 years)
- Monitor job execution logs
- Update targets quarterly

### Troubleshooting
- Check job logs for calculation errors
- Verify token functions return correct data
- Validate formula syntax
- Check entity relationships

## Future Enhancements

1. **Custom Dashboards**: Allow users to create custom KPI dashboards
2. **Benchmarking**: Compare KPIs against industry standards
3. **Predictive Analytics**: ML models to predict future KPI trends
4. **Mobile App**: Native mobile app for KPI viewing
5. **API Webhooks**: External systems can subscribe to KPI updates
6. **Advanced Formulas**: Support for more complex calculations
7. **KPI Templates**: Pre-built KPI sets for different industries
8. **Goal Setting**: Set individual goals and track progress

## Support

For questions or issues:
- Check this documentation
- Review formula-parser.ts for available tokens
- Check calculator.ts for calculation logic
- Review Prisma schema for data model

---

**Status**: Foundation Complete ✅
**Next Priority**: API Endpoints & UI Components
**Estimated Completion**: Phase 2-3 (2-3 weeks), Phase 4-7 (1-2 weeks)
