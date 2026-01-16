# Business Planning Module (HSPS)
## Hexa Strategic Planning System

**Status:** Database schema and API endpoints implemented  
**Created:** November 25, 2025

---

## Overview

The Business Planning Module is a comprehensive strategic planning system for Hexa Steel® OTS that combines OKR, Balanced Scorecard, Hoshin Kanri, and EOS methodologies into a unified HSPS (Hexa Strategic Planning System).

---

## System Architecture

### A. Strategic Foundation (Static Data)
**Purpose:** Define company's long-term vision and values

**Fields:**
- Vision Statement
- Mission Statement
- Core Values (DNA) - Array
- BHAG (Big Hairy Audacious Goal) - 10-25 year target
- 3-Year Outlook
- Strategic Pillars/Principles - Array

**API Endpoints:**
- `GET /api/business-planning/strategic-foundation` - Fetch foundation
- `POST /api/business-planning/strategic-foundation` - Create/Update foundation

---

### B. SWOT Analysis (Yearly)
**Purpose:** Annual strategic analysis

**Fields:**
- Year
- Strengths (Array)
- Weaknesses (Array)
- Opportunities (Array)
- Threats (Array)
- Recommended Strategies (Array)

**API Endpoints:**
- `GET /api/business-planning/swot?year=2025` - Fetch SWOT by year
- `GET /api/business-planning/swot` - Fetch all SWOT analyses
- `POST /api/business-planning/swot` - Create/Update SWOT
- `DELETE /api/business-planning/swot?year=2025` - Delete SWOT

---

### C. Annual Plan (Per Year)
**Purpose:** Yearly strategic plan with objectives, KPIs, and initiatives

**Components:**

#### 1. Annual Plan
- Year
- Theme
- Strategic Priorities (3-7 items)
- Status (Draft | Active | Completed | Archived)

#### 2. Company Objectives (OKRs)
- Title & Description
- Category (Financial | Customer | Internal Process | Learning & Growth)
- Owner
- Tags (strategy pillar, department)
- Priority (Low | Medium | High | Critical)
- Status (Not Started | On Track | At Risk | Behind | Completed)
- Progress (0-100%)
- Key Results (nested)

#### 3. Key Results
- Title & Description
- Target Value & Current Value
- Unit (%, count, $, tons, etc.)
- Measurement Type (Numeric | Milestone | Boolean)
- Status
- Due Date
- Progress Updates (tracking over time)

#### 4. Balanced Scorecard KPIs
- Name & Description
- Category (BSC 4 perspectives)
- Target Value & Current Value
- Unit & Frequency (Monthly | Quarterly | Annually)
- Owner
- Formula/Data Source
- Status
- Measurements (time-series data)

#### 5. Annual Initiatives
- Name & Description
- Linked to Objective/KPI
- Expected Impact
- Timeline (start/end dates)
- Owner & Department
- Status (Planned | In Progress | On Hold | Completed | Cancelled)
- Progress (0-100%)
- Budget

**API Endpoints:**
- `GET /api/business-planning/annual-plans?year=2025` - Fetch plan by year
- `GET /api/business-planning/annual-plans` - Fetch all plans
- `POST /api/business-planning/annual-plans` - Create annual plan
- `GET /api/business-planning/annual-plans/[id]` - Fetch single plan with full details
- `PATCH /api/business-planning/annual-plans/[id]` - Update plan
- `DELETE /api/business-planning/annual-plans/[id]` - Delete plan

**Objectives API:**
- `GET /api/business-planning/objectives?annualPlanId=xxx` - Fetch objectives
- `POST /api/business-planning/objectives` - Create objective with key results

---

### D. Department Plans (Per Year, Per Department)
**Purpose:** Align department goals with company objectives

**Components:**

#### 1. Department Plan
- Annual Plan ID
- Department ID
- Year
- Vision (department-specific)
- Priorities (Array)
- Risks & Blockers (Array)
- Dependencies with other teams (Array)

#### 2. Department Objectives
- Linked to Company Objective (optional)
- Title & Description
- Owner
- Status & Progress

#### 3. Department KPIs
- Linked to Company BSC KPI (optional)
- Name & Description
- Category (BSC-aligned)
- Target Value & Current Value
- Unit & Frequency (Monthly | Quarterly)
- Owner
- Status
- Measurements (time-series)

#### 4. Department Initiatives
- Name & Description
- Timeline
- Owner
- Status & Progress

---

### E. Execution Layer
**Purpose:** Track weekly issues and blockers (EOS style)

#### Weekly Issues
- Title & Description
- Department
- Raised By & Assigned To
- Priority (Low | Medium | High | Critical)
- Status (Open | In Progress | Resolved | Closed)
- Due Date & Resolved Date
- Resolution Notes

---

## Dashboard & Analytics

### Main Dashboard API
**Endpoint:** `GET /api/business-planning/dashboard?year=2025`

**Returns:**
- **OKR Progress:**
  - Total objectives
  - Status breakdown (Not Started, On Track, At Risk, Behind, Completed)
  - Average progress percentage
  
- **Key Results Stats:**
  - Total key results
  - Status breakdown
  - Average completion percentage
  
- **Initiative Stats:**
  - Total initiatives
  - Status breakdown
  - Average progress
  - Total budget
  
- **BSC KPI Stats (by category):**
  - Financial perspective
  - Customer perspective
  - Internal Process perspective
  - Learning & Growth perspective
  - Status breakdown for each
  
- **Department Performance:**
  - Objectives, KPIs, Initiatives count per department
  - Completion rates
  
- **Weekly Issues Summary:**
  - Total issues (last 30 days)
  - Status breakdown
  - Priority breakdown

---

## Database Schema Summary

### Core Models (17 tables)
1. `StrategicFoundation` - Company vision/mission
2. `SwotAnalysis` - Yearly SWOT
3. `AnnualPlan` - Yearly plan container
4. `CompanyObjective` - Company OKRs
5. `KeyResult` - Measurable outcomes
6. `KeyResultProgress` - Progress tracking
7. `BalancedScorecardKPI` - Company KPIs
8. `BSCKPIMeasurement` - KPI measurements
9. `AnnualInitiative` - Strategic initiatives
10. `DepartmentPlan` - Department yearly plan
11. `DepartmentObjective` - Dept objectives
12. `DepartmentKPI` - Dept KPIs
13. `DepartmentKPIMeasurement` - Dept KPI tracking
14. `DepartmentInitiative` - Dept initiatives
15. `WeeklyIssue` - EOS-style issues

### Key Relationships
- Annual Plan → Objectives → Key Results → Progress Updates
- Annual Plan → BSC KPIs → Measurements
- Annual Plan → Initiatives (linked to objectives)
- Annual Plan → Department Plans → Dept Objectives/KPIs/Initiatives
- Company Objectives ← Department Objectives (alignment)
- Company BSC KPIs ← Department KPIs (cascade)

---

## Features

### ✅ Implemented
1. **Complete database schema** with all models and relationships
2. **Migration created** and applied successfully
3. **Core API endpoints:**
   - Strategic Foundation (GET, POST)
   - SWOT Analysis (GET, POST, DELETE)
   - Annual Plans (GET, POST, PATCH, DELETE)
   - Objectives (GET, POST)
   - Dashboard (GET with comprehensive analytics)

### 🚧 Pending Implementation
1. **Additional API endpoints:**
   - Key Results CRUD
   - BSC KPIs CRUD
   - Initiatives CRUD
   - Department Plans CRUD
   - Department Objectives/KPIs/Initiatives CRUD
   - Weekly Issues CRUD
   - Progress update endpoints

2. **UI Components:**
   - Strategic Foundation page
   - SWOT Analysis page
   - Annual Plan dashboard
   - OKR management interface
   - BSC KPI dashboard
   - Department planning interface
   - Weekly issues tracker
   - Comprehensive analytics dashboards

3. **Navigation:**
   - Add "Business Planning" section to sidebar
   - Create layout.tsx for the module
   - Add navigation links

4. **Seed Data:**
   - Example strategic foundation
   - Sample SWOT analysis
   - Demo annual plan with objectives
   - Sample KPIs and initiatives

---

## Next Steps

### Phase 1: Complete API Layer (Priority: High)
- Create remaining CRUD endpoints for all entities
- Add update/delete endpoints for objectives
- Implement Key Results management API
- Build BSC KPI management API
- Create Department Plans API
- Implement Weekly Issues API

### Phase 2: UI Development (Priority: High)
- Strategic Foundation form
- SWOT Analysis interface (drag-drop, editable lists)
- Annual Plan creation wizard
- OKR management dashboard
- BSC KPI dashboard with charts
- Department planning interface
- Weekly issues board (Kanban-style)

### Phase 3: Analytics & Dashboards (Priority: Medium)
- Executive dashboard (company-wide view)
- Department dashboards
- OKR progress charts (Recharts)
- BSC heatmaps
- Initiative timeline (Gantt-style)
- KPI trend charts

### Phase 4: Integration & Polish (Priority: Medium)
- Link to existing KPI Engine module
- Connect initiatives to existing Initiative module
- Export to PDF/Excel
- Email notifications for deadlines
- Progress reminders
- Role-based permissions

---

## Technical Notes

### Prisma Client Regeneration
After migration, regenerate Prisma client:
```bash
npx prisma generate
```

### TypeScript Errors
Current TypeScript errors in API files are expected and will resolve after Prisma client regeneration.

### Data Structure
- All JSON fields use Prisma's `Json` type for flexible array/object storage
- Strategic priorities, core values, SWOT items, tags, risks, dependencies all stored as JSON arrays
- Allows for dynamic, flexible data without schema changes

### Performance Considerations
- Indexes added on frequently queried fields (year, status, category, etc.)
- Cascade deletes configured for data integrity
- Efficient queries with selective includes

---

## Integration Points

### Existing Modules
- **KPI Engine:** Can link BSC KPIs to existing KPI definitions
- **Initiatives Module:** Annual Initiatives can reference existing Initiative records
- **Department Module:** Full integration with department structure
- **User Module:** All ownership and assignment fields

### Future Enhancements
- **Project Module:** Link initiatives to actual projects
- **Document Module:** Attach strategic documents
- **Operations Timeline:** Track initiative milestones
- **Reporting:** Comprehensive strategic reports

---

## Documentation Files
- `BUSINESS_PLANNING_MODULE.md` - This file (overview)
- `BUSINESS_PLANNING_API.md` - Detailed API documentation (to be created)
- `BUSINESS_PLANNING_UI_GUIDE.md` - UI component guide (to be created)
- `HSPS_METHODOLOGY.md` - Methodology explanation (to be created)

---

**Module Status:** Foundation Complete - Ready for UI Development  
**Database:** ✅ Migrated  
**API:** 🟡 Partial (core endpoints done)  
**UI:** ⏳ Pending  
**Testing:** ⏳ Pending
