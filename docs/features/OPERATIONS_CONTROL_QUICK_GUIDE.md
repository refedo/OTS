# Operations Control System - Quick Guide

## Overview

The **Operations Control** system is a breakthrough feature that provides **real-time risk detection and early warning** for your manufacturing operations. It automatically tracks all work across the system and alerts you to potential problems before they become critical.

---

## Data Source: Real vs Seeded

**The Operations Control dashboard shows REAL DATA from your system.**

- **RiskEvents** are detected automatically by the Early Warning Engine
- **WorkUnits** are created automatically when you create Tasks, WorkOrders, RFIs, or DocumentSubmissions
- **No seed data** is used - if you see "No Active Risks", it means your operations are healthy

---

## What Changed: Old vs New Input Method

### OLD Method (Manual Tracking)
| Action | What You Had to Do |
|--------|-------------------|
| Create Task | Create task only - no tracking |
| Create WorkOrder | Create work order only - no tracking |
| Create RFI | Create RFI only - no tracking |
| Track Progress | Manually check each module separately |
| Detect Risks | Manually review deadlines and statuses |
| Get Warnings | None - problems discovered too late |

### NEW Method (Automatic Tracking)
| Action | What Happens Automatically |
|--------|---------------------------|
| Create Task | ✅ WorkUnit auto-created for Operations Control |
| Create WorkOrder | ✅ WorkUnit auto-created + validation warnings |
| Create RFI | ✅ WorkUnit auto-created for QC tracking |
| Create DocumentSubmission | ✅ WorkUnit auto-created for documentation tracking |
| Update Status | ✅ WorkUnit status auto-synced |
| Track Progress | ✅ Centralized in Operations Control dashboard |
| Detect Risks | ✅ Early Warning Engine runs every hour |
| Get Warnings | ✅ Real-time warnings before problems escalate |

---

## How the New System Works

### 1. Automatic Work Tracking

When you create work in any module, the system automatically creates a **WorkUnit** to track it:

```
Task Created → WorkUnit (DESIGN/PROCUREMENT/DOCUMENTATION)
WorkOrder Created → WorkUnit (PRODUCTION)
RFI Created → WorkUnit (QC)
DocumentSubmission Created → WorkUnit (DOCUMENTATION)
```

### 2. Automatic Status Sync

When you update the status of any tracked item, the corresponding WorkUnit is automatically updated:

```
Task: "Pending" → "In Progress" → "Completed"
       ↓              ↓              ↓
WorkUnit: NOT_STARTED → IN_PROGRESS → COMPLETED
```

### 3. Early Warning Engine (Hourly)

Every hour, the system automatically scans all WorkUnits and detects risks:

| Risk Type | What It Detects |
|-----------|-----------------|
| **DELAY** | Work items past their due date |
| **BOTTLENECK** | Too many items stuck in same status |
| **DEPENDENCY** | Blocked items waiting on others |
| **OVERLOAD** | Too much work assigned to one person |

### 4. "No Silent Work" Rule

The system validates work creation to ensure proper tracking:

**WorkOrder Creation:**
- ⚠️ Warning if no scope schedules defined
- ⚠️ Warning if no fabrication schedule
- 🛑 Blocked if parts already in another active WorkOrder

**Production Log Creation:**
- ⚠️ Warning if part not in any WorkOrder
- ℹ️ Info if WorkOrder not tracked in Operations Control

---

## Using the Operations Control Dashboard

### Access
Navigate to: **http://localhost:3000/operations-control**

### Dashboard Sections

#### 1. Summary Cards
- **Total Active Risks** - All unresolved risks
- **Critical** - Immediate attention required
- **High** - Address within 24 hours
- **Affected Projects** - Projects with active risks

#### 2. Active Risks Table
Shows all detected risks with:
- Severity (CRITICAL, HIGH, MEDIUM, LOW)
- Type (Delay, Bottleneck, Dependency, Overload)
- Affected Projects
- Reason for the risk
- Detection date

#### 3. Affected Projects
Lists projects sorted by risk severity, showing:
- Project number and name
- Client name
- Risk counts by severity

#### 4. Recommended Actions
Priority actions from CRITICAL and HIGH risks:
- Numbered by priority
- Actionable suggestions
- Based on risk type

---

## Risk Severity Levels

| Severity | Color | Meaning | Response Time |
|----------|-------|---------|---------------|
| **CRITICAL** | 🔴 Red | Immediate threat to delivery | Now |
| **HIGH** | 🟠 Orange | Significant risk | Within 24 hours |
| **MEDIUM** | 🟡 Yellow | Potential issue | Within 1 week |
| **LOW** | 🔵 Blue | Minor concern | When convenient |

---

## Risk Types Explained

### DELAY
**Cause:** Work items past their planned end date
**Example:** WorkOrder due Dec 10, still "In Progress" on Dec 15
**Action:** Expedite work, reassign resources, or adjust schedule

### BOTTLENECK
**Cause:** Too many items stuck at same stage
**Example:** 50+ parts waiting for QC inspection
**Action:** Add resources to bottleneck stage, prioritize critical items

### DEPENDENCY
**Cause:** Work blocked waiting for other items
**Example:** Fabrication waiting for design approval
**Action:** Resolve blocking items first, escalate if needed

### OVERLOAD
**Cause:** Too much work assigned to one person/team
**Example:** Engineer has 20+ active tasks
**Action:** Redistribute work, hire additional resources

---

## Self-Healing Loop

The system is designed to **automatically clear risks** when you fix the root cause:

```
1. Risk Detected → RiskEvent created
2. You Fix the Issue → Status changes to Completed
3. WorkUnit Auto-Updated → Status = COMPLETED
4. Next Engine Run → Risk condition no longer met
5. Risk Resolved → No longer appears in dashboard
```

---

## Environment Configuration

### Enable/Disable Scheduler

In your `.env` file:
```
# Enable hourly risk detection
ENABLE_RISK_SCHEDULER=true

# Disable scheduler (for testing)
ENABLE_RISK_SCHEDULER=false
```

### Manual Risk Detection

You can trigger the Early Warning Engine manually via API:
```
POST /api/operations-control/run-engine
```

---

## Console Logs

The system logs all automatic actions:

```
[WorkUnitSync] ✓ Created WorkUnit for Task abc123 (DESIGN)
[WorkUnitSync] ✓ Updated WorkUnit xyz789 status: IN_PROGRESS → COMPLETED
[EarlyWarningEngine] Starting risk evaluation...
[EarlyWarningEngine] Evaluated 150 work units, found 3 risks
[WorkOrder] Tracking warnings: [{ code: 'NO_FABRICATION_SCHEDULE', ... }]
```

---

## Quick Reference

### What Creates WorkUnits Automatically
- ✅ Tasks (via Tasks module)
- ✅ WorkOrders (via Work Orders module)
- ✅ RFIs (via QC module)
- ✅ DocumentSubmissions (via Document Control)

### What Updates WorkUnits Automatically
- ✅ Status changes in any of the above
- ✅ WorkOrder progress from production logs

### What Triggers Risk Detection
- ✅ Hourly scheduler (when enabled)
- ✅ Manual API call

### What Clears Risks
- ✅ Completing the work (status → COMPLETED)
- ✅ Resolving the root cause
- ✅ Manual resolution via API

---

## Troubleshooting

### "No Active Risks" but I know there are problems
1. Check if `ENABLE_RISK_SCHEDULER=true` in `.env`
2. Restart the server after changing `.env`
3. Verify WorkUnits exist: Check if work was created after the system was implemented

### Risks not clearing after fixing issues
1. Ensure the source record status is updated (not just the WorkUnit)
2. Wait for the next hourly scheduler run
3. Check console logs for sync errors

### Warnings not showing on WorkOrder creation
1. Ensure `WorkTrackingValidatorService` is imported in the route
2. Check console for validation errors

---

## Summary

The Operations Control system transforms your MRP from a **reactive** system to a **proactive** one:

| Before | After |
|--------|-------|
| Discover problems when it's too late | Get warned before problems escalate |
| Manual tracking across modules | Automatic centralized tracking |
| No visibility into risks | Real-time risk dashboard |
| Silent work goes unnoticed | "No Silent Work" validation |
| Status updates are isolated | Status syncs across system |

**The goal:** Never be surprised by a missed deadline or bottleneck again.
