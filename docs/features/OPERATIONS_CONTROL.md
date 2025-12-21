# Operations Control System

## Overview

The Operations Control System is a **predictive, flow-aware operational control layer** that transforms OTS from a recording/reporting system into a proactive risk management platform. It monitors work across all modules and provides early warnings for potential issues.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Operations Control Dashboard                  │
│                    /operations-control                          │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │ Reads
                              │
┌─────────────────────────────────────────────────────────────────┐
│                    Early Warning Engine                          │
│                    (RiskEvent Detection)                         │
│  - Delay risks      - Bottleneck risks                          │
│  - Dependency risks - Overload risks                            │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │ Analyzes
                              │
┌─────────────────────────────────────────────────────────────────┐
│                    Resource Capacity Layer                       │
│  - Labor capacity   - Equipment capacity                        │
│  - Material availability - Space constraints                    │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │ Monitors
                              │
┌─────────────────────────────────────────────────────────────────┐
│                    Dependency Tracking Layer                     │
│  - Finish-to-Start (FS)  - Start-to-Start (SS)                 │
│  - Finish-to-Finish (FF) - Circular detection                  │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │ Links
                              │
┌─────────────────────────────────────────────────────────────────┐
│                    WorkUnit Abstraction Layer                    │
│  Wraps: Tasks, Production, QC, Documents, Procurement           │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │ References
                              │
┌─────────────────────────────────────────────────────────────────┐
│              Existing OTS Modules                                │
│  Tasks │ Production │ QC │ Engineering │ Procurement            │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. WorkUnits (Foundation)

WorkUnits are the abstraction layer that wraps existing module records:

| WorkUnit Type | References |
|---------------|------------|
| `DESIGN` | Engineering tasks, drawings |
| `PROCUREMENT` | Material orders, supplier items |
| `PRODUCTION` | Assembly parts, production logs |
| `QC` | Inspections, RFIs, NCRs |
| `DOCUMENTATION` | Document submissions, approvals |

**Key Fields:**
- `referenceModule`: Which module the work belongs to
- `referenceId`: ID of the actual record
- `plannedStart` / `plannedEnd`: Scheduled dates
- `actualStart` / `actualEnd`: Real dates (auto-set on status change)
- `status`: NOT_STARTED, IN_PROGRESS, BLOCKED, COMPLETED

### 2. Dependencies (Relationships)

Dependencies define how WorkUnits relate to each other:

| Type | Meaning |
|------|---------|
| `FS` (Finish-to-Start) | B cannot start until A finishes |
| `SS` (Start-to-Start) | B cannot start until A starts |
| `FF` (Finish-to-Finish) | B cannot finish until A finishes |

**Features:**
- Circular dependency detection (prevents infinite loops)
- Upstream/downstream chain traversal
- Delay impact analysis (cascading effects)

### 3. Resource Capacity (Constraints)

Tracks available capacity vs. required load:

| Resource Type | Examples |
|---------------|----------|
| `LABOR` | Welders, fitters, painters |
| `EQUIPMENT` | Cranes, welding machines |
| `MATERIAL` | Steel plates, bolts |
| `SPACE` | Bay areas, storage |

**Analysis:**
- Capacity per day vs. scheduled load
- Overload detection (>100% utilization)
- Bottleneck identification

### 4. Risk Events (Warnings)

The Early Warning Engine detects risks automatically:

| Risk Type | Trigger |
|-----------|---------|
| `DELAY` | WorkUnit behind schedule |
| `BOTTLENECK` | Resource overloaded |
| `DEPENDENCY` | Blocked by upstream delay |
| `OVERLOAD` | Capacity exceeded |

| Severity | Criteria |
|----------|----------|
| `CRITICAL` | >5 days delay or >150% overload |
| `HIGH` | 3-5 days delay or >120% overload |
| `MEDIUM` | 1-2 days delay or >100% overload |
| `LOW` | Approaching deadline |

## How to Populate Data

### Option 1: Manual API Calls

#### Create WorkUnits
```bash
POST /api/work-units
{
  "name": "Fabrication - Building A",
  "type": "PRODUCTION",
  "projectId": "project-uuid",
  "plannedStart": "2025-01-01",
  "plannedEnd": "2025-01-15",
  "referenceModule": "AssemblyPart",
  "referenceId": "assembly-uuid"
}
```

#### Create Dependencies
```bash
POST /api/work-units/dependencies
{
  "fromWorkUnitId": "design-workunit-uuid",
  "toWorkUnitId": "production-workunit-uuid",
  "dependencyType": "FS",
  "lagDays": 0
}
```

#### Create Resource Capacity
```bash
POST /api/resource-capacity
{
  "resourceType": "LABOR",
  "resourceName": "Welding Team A",
  "capacityPerDay": 8,
  "unit": "HOURS"
}
```

#### Run Early Warning Engine
```bash
POST /api/risk-events/run
```

### Option 2: Seed Script

Run the seed script to populate test data:

```bash
npx ts-node prisma/seeds/operations-control-seed.ts
```

### Option 3: Automatic Integration (Future)

The system can be configured to automatically create WorkUnits when:
- Tasks are created/updated
- Production logs are recorded
- QC inspections are scheduled
- Documents are submitted

## API Reference

### WorkUnits
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/work-units` | GET | List with filters |
| `/api/work-units` | POST | Create new |
| `/api/work-units/[id]` | GET | Get by ID |
| `/api/work-units/[id]` | PATCH | Update |
| `/api/work-units/[id]` | DELETE | Delete |
| `/api/work-units/at-risk` | GET | Get at-risk items |

### Dependencies
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/work-units/dependencies` | GET | List dependencies |
| `/api/work-units/dependencies` | POST | Create dependency |
| `/api/work-units/dependencies/[id]` | GET | Get by ID |
| `/api/work-units/dependencies/[id]` | DELETE | Delete |
| `/api/work-units/[id]/chain` | GET | Get dependency chain |
| `/api/work-units/[id]/impact` | GET | Get delay impact |

### Resource Capacity
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/resource-capacity` | GET | List capacities |
| `/api/resource-capacity` | POST | Create capacity |
| `/api/resource-capacity/[id]` | GET | Get by ID |
| `/api/resource-capacity/[id]` | PATCH | Update |
| `/api/resource-capacity/[id]` | DELETE | Delete |
| `/api/resource-capacity/[id]/analysis` | GET | Capacity vs load |
| `/api/resource-capacity/overloaded` | GET | Overloaded resources |
| `/api/resource-capacity/summary` | GET | Summary stats |

### Risk Events
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/risk-events` | GET | List active risks |
| `/api/risk-events/[id]` | GET | Get by ID |
| `/api/risk-events/[id]` | PATCH | Resolve risk |
| `/api/risk-events/run` | POST | Run engine |
| `/api/risk-events/summary` | GET | Risk summary |

### Operations Control
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/operations-control` | GET | Dashboard data |

## Dashboard Features

The Operations Control page (`/operations-control`) displays:

1. **Summary Cards**
   - Total active risks
   - Critical risks count
   - High risks count
   - Affected projects count

2. **Active Risks Table**
   - Sorted by severity (CRITICAL → LOW)
   - Shows type, reason, affected projects
   - Recommended actions

3. **Affected Projects**
   - Projects with risk counts
   - Breakdown by severity

4. **Priority Actions**
   - Actions from CRITICAL and HIGH risks
   - Quick reference for immediate attention

5. **Risk Type Breakdown**
   - DELAY, BOTTLENECK, DEPENDENCY, OVERLOAD counts

## Best Practices

1. **Create WorkUnits for critical path items** - Focus on items that affect project timelines
2. **Define dependencies accurately** - Use correct dependency types (FS, SS, FF)
3. **Set realistic capacity** - Don't overestimate resource availability
4. **Run the engine regularly** - Schedule daily runs or trigger on data changes
5. **Resolve risks promptly** - Mark risks as resolved when addressed
