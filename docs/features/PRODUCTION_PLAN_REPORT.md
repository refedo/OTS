# Monthly Production Plan Report

## Overview
The Monthly Production Plan report provides a comprehensive view of production planning with daily tonnage distribution across all buildings. It calculates monthly quotas based on fabrication schedules and tracks progress against planned timelines.

## Features

### 1. **Daily Tonnage Distribution**
- Automatically distributes building tonnage across months based on fabrication schedule
- Calculates the number of days a building's production falls within each month
- Allocates tonnage proportionally to each month

**Example:**
- Building: 100 tons total
- Schedule: Jan 15 to Feb 15 (31 days total)
- Jan allocation: (17 days / 31 days) × 100 = 54.84 tons
- Feb allocation: (14 days / 31 days) × 100 = 45.16 tons

### 2. **Key Metrics**

#### Building Weight
- Total tonnage from assembly parts (`AssemblyPart.netWeightTotal`)
- Converted from kg to tons (÷ 1000)

#### Produced
- Actual produced tonnage calculated as average of:
  - Fit-up process
  - Welding process
  - Visualization process
- Based on production logs with part weights

#### Planned Progress
- Time-based progress percentage
- Formula: `(Days Elapsed / Total Days) × 100`
- Shows where production should be based on schedule

#### Declared Progress
- Actual production progress percentage
- Formula: `(Produced Tonnage / Building Weight) × 100`
- Shows actual production completion

#### Quota
- Monthly allocated tonnage for the selected month
- Based on fabrication schedule dates
- Calculated using daily distribution logic

#### Quota with Back Log (BL)
- Monthly quota + accumulated shortfall from previous months
- Back Log = Previous months' quotas - Produced tonnage
- Helps track cumulative production targets

### 3. **Monthly Targets**

#### Monthly Target
- Sum of all buildings' quotas for the selected month
- Shows planned production for the month

#### Monthly Target w/ BL
- Sum of all buildings' quotas including back logs
- Shows total required production including catch-up

### 4. **Report Filters**
- **Month**: Select any month to view production plan
- **Project**: Optional filter to view specific project

### 5. **Data Sources**

#### Assembly Parts (`AssemblyPart`)
- `netWeightTotal`: Building tonnage (kg)
- Grouped by `buildingId`

#### Scope Schedule (`ScopeSchedule`)
- `scopeType = 'fabrication'`: Fabrication schedule
- `startDate`: Production start date
- `endDate`: Production end date

#### Production Logs (`ProductionLog`)
- `processType`: Fit-up, Welding, Visualization
- `processedQty`: Quantity processed
- `assemblyPart.singlePartWeight`: Part weight for tonnage calculation

## Usage

### Accessing the Report
1. Navigate to **Production** → **Production Plan**
2. Select the desired month
3. Optionally filter by project
4. Click **Generate Report**

### Interpreting Results

#### Progress Indicators
- **Green**: Declared progress ≥ Planned progress (on track or ahead)
- **Yellow**: Declared progress is 0-10% behind planned
- **Red**: Declared progress is >10% behind planned

#### Export
- Click **Export to Excel** to download CSV file
- Includes all columns and totals

## Technical Implementation

### API Endpoint
```
GET /api/production/reports/production-plan
```

**Parameters:**
- `month` (required): Format YYYY-MM
- `projectId` (optional): Filter by specific project

**Response:**
```json
{
  "month": "2025-12",
  "monthlyTarget": 407.1,
  "monthlyTargetWithBL": 407.1,
  "data": [
    {
      "projectNumber": "270",
      "projectName": "Project Name",
      "buildingDesignation": "BLD1",
      "buildingName": "Building Name",
      "buildingWeight": 100.00,
      "produced": 50.00,
      "plannedProgress": 59.0,
      "declaredProgress": 50.0,
      "quota": 25.50,
      "quotaWithBackLog": 30.00,
      "startDate": "2025-11-15T00:00:00.000Z",
      "endDate": "2026-01-15T00:00:00.000Z"
    }
  ]
}
```

### Frontend Page
```
/production/reports/production-plan
```

## Calculation Logic

### Days in Month for Range
```typescript
function getDaysInMonthForRange(startDate, endDate, year, month) {
  // Get month boundaries
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);
  
  // Find overlap
  const rangeStart = max(startDate, monthStart);
  const rangeEnd = min(endDate, monthEnd);
  
  // Calculate days
  return daysBetween(rangeStart, rangeEnd) + 1;
}
```

### Monthly Quota
```typescript
const totalDays = daysBetween(startDate, endDate) + 1;
const daysInMonth = getDaysInMonthForRange(startDate, endDate, year, month);
const quota = (daysInMonth / totalDays) × buildingWeight;
```

### Back Log Calculation
```typescript
// Sum all quotas from start date to end of previous month
let totalQuotaUpToPrevMonth = 0;
for (let m = startMonth; m < selectedMonth; m++) {
  const monthQuota = calculateQuotaForMonth(m);
  totalQuotaUpToPrevMonth += monthQuota;
}

// Back log = What should have been produced - What was produced
const backLog = max(0, totalQuotaUpToPrevMonth - producedTonnage);
```

## Benefits

1. **Accurate Planning**: Daily distribution ensures precise monthly targets
2. **Progress Tracking**: Compare planned vs actual progress
3. **Back Log Management**: Track cumulative shortfalls
4. **Resource Allocation**: Plan resources based on monthly quotas
5. **Performance Analysis**: Identify buildings falling behind schedule

## Future Enhancements

- [ ] Add weekly breakdown view
- [ ] Include resource allocation recommendations
- [ ] Add trend analysis and forecasting
- [ ] Export to PDF with charts
- [ ] Add email notifications for falling behind schedule
- [ ] Include weather/holiday adjustments
