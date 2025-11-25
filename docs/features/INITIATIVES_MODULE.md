# Initiatives Module Documentation

## Overview
The Initiatives module enables Hexa Steel® to track and manage internal strategic and improvement initiatives aligned with company goals. It provides comprehensive tracking of initiative phases, milestones, responsible persons, timelines, progress, and KPI impact.

---

## Table of Contents
1. [Features](#features)
2. [Database Schema](#database-schema)
3. [API Endpoints](#api-endpoints)
4. [User Interface](#user-interface)
5. [Permissions](#permissions)
6. [Initiative Lifecycle](#initiative-lifecycle)
7. [Progress Calculation](#progress-calculation)
8. [Integration with Other Modules](#integration-with-other-modules)
9. [Usage Guide](#usage-guide)

---

## Features

### Core Capabilities
- ✅ Create and manage strategic initiatives
- ✅ Track initiative progress with milestones and tasks
- ✅ Auto-generated initiative numbers (INIT-YYYY-NNN format)
- ✅ Link initiatives to KPIs for measurable outcomes
- ✅ Assign owners and departments
- ✅ Set priorities and track status
- ✅ Budget tracking
- ✅ Timeline management (planned vs actual)
- ✅ Progress auto-calculation
- ✅ Analytics dashboard
- ✅ Role-based access control

### Initiative Categories
- Digital Transformation
- Lean Management
- AI & Automation
- Human Capital Development
- Knowledge & Learning
- Factory Optimization
- Sustainability & Green Building
- Operational Excellence

---

## Database Schema

### Initiative Model
```prisma
model Initiative {
  id                 String   @id @default(uuid())
  initiativeNumber   String   @unique
  name               String
  category           String?
  description        String?
  objective          String?
  ownerId            String
  departmentId       String?
  status             String   @default("Planned")
  priority           String   @default("Medium")
  startDate          DateTime?
  endDate            DateTime?
  actualStartDate    DateTime?
  actualEndDate      DateTime?
  progress           Float?   @default(0)
  budget             Float?   @default(0)
  kpiImpact          Json?
  notes              String?
  createdBy          String
  updatedBy          String
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
}
```

**Status Values:**
- `Planned` - Initiative is planned but not started
- `In Progress` - Currently being executed
- `On Hold` - Temporarily paused
- `Completed` - Successfully finished
- `Cancelled` - Discontinued

**Priority Levels:**
- `Low` - Nice to have
- `Medium` - Standard priority
- `High` - Important
- `Critical` - Urgent and critical

### InitiativeMilestone Model
```prisma
model InitiativeMilestone {
  id             String   @id @default(uuid())
  initiativeId   String
  name           String
  description    String?
  plannedDate    DateTime?
  actualDate     DateTime?
  progress       Float?   @default(0)
  status         String   @default("Pending")
  responsibleId  String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}
```

**Milestone Status:**
- `Pending` - Not started
- `In Progress` - Currently working on
- `Completed` - Finished
- `Delayed` - Past planned date

### InitiativeTask Model
```prisma
model InitiativeTask {
  id             String   @id @default(uuid())
  initiativeId   String
  taskName       String
  assignedTo     String?
  startDate      DateTime?
  endDate        DateTime?
  status         String   @default("Pending")
  progress       Float?   @default(0)
  notes          String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}
```

---

## API Endpoints

### Initiatives

#### GET /api/initiatives
List all initiatives with optional filters.

**Query Parameters:**
- `departmentId` - Filter by department
- `ownerId` - Filter by owner
- `status` - Filter by status
- `category` - Filter by category
- `priority` - Filter by priority

**Response:**
```json
[
  {
    "id": "uuid",
    "initiativeNumber": "INIT-2025-001",
    "name": "Digital Transformation Initiative",
    "category": "Digital Transformation",
    "status": "In Progress",
    "priority": "High",
    "progress": 45.5,
    "owner": { "id": "uuid", "name": "John Doe" },
    "department": { "id": "uuid", "name": "IT" },
    "milestones": [...],
    "tasks": [...]
  }
]
```

#### POST /api/initiatives
Create a new initiative.

**Required Role:** Admin or Manager

**Request Body:**
```json
{
  "name": "AI Implementation Initiative",
  "category": "AI & Automation",
  "description": "Implement AI-powered quality control",
  "objective": "Reduce defects by 30%",
  "ownerId": "uuid",
  "departmentId": "uuid",
  "priority": "Critical",
  "startDate": "2025-01-01",
  "endDate": "2025-12-31",
  "budget": 500000,
  "kpiImpact": ["kpi-id-1", "kpi-id-2"]
}
```

**Response:** Created initiative object with auto-generated `initiativeNumber`

#### GET /api/initiatives/:id
Get single initiative with full details.

**Response:**
```json
{
  "id": "uuid",
  "initiativeNumber": "INIT-2025-001",
  "name": "Digital Transformation Initiative",
  "milestones": [
    {
      "id": "uuid",
      "name": "Phase 1 Complete",
      "status": "Completed",
      "progress": 100,
      "plannedDate": "2025-03-31",
      "actualDate": "2025-03-28"
    }
  ],
  "tasks": [...]
}
```

#### PATCH /api/initiatives/:id
Update initiative.

**Required Role:** Admin or Manager

**Request Body:** Partial initiative object

#### DELETE /api/initiatives/:id
Delete initiative.

**Required Role:** Admin only

### Milestones

#### POST /api/initiatives/:id/milestones
Add milestone to initiative.

**Request Body:**
```json
{
  "name": "Phase 1 Completion",
  "description": "Complete initial setup",
  "plannedDate": "2025-03-31",
  "responsibleId": "uuid",
  "progress": 0,
  "status": "Pending"
}
```

#### PATCH /api/initiatives/:id/milestones/:mid
Update milestone progress/status.

**Request Body:**
```json
{
  "progress": 75,
  "status": "In Progress",
  "actualDate": "2025-03-28"
}
```

#### DELETE /api/initiatives/:id/milestones/:mid
Delete milestone.

### Tasks

#### POST /api/initiatives/:id/tasks
Add task to initiative.

**Request Body:**
```json
{
  "taskName": "Setup development environment",
  "assignedTo": "uuid",
  "startDate": "2025-01-15",
  "endDate": "2025-01-20",
  "status": "Pending",
  "progress": 0
}
```

#### PATCH /api/initiatives/:id/tasks/:tid
Update task.

#### DELETE /api/initiatives/:id/tasks/:tid
Delete task.

### Dashboard

#### GET /api/initiatives/dashboard
Get analytics summary.

**Query Parameters:**
- `departmentId` - Filter by department
- `ownerId` - Filter by owner
- `category` - Filter by category

**Response:**
```json
{
  "summary": {
    "totalInitiatives": 15,
    "averageCompletion": 62.5,
    "totalBudget": 5000000,
    "totalMilestones": 45,
    "completedMilestones": 28,
    "delayedMilestones": 3
  },
  "byStatus": {
    "Planned": 3,
    "In Progress": 8,
    "Completed": 4
  },
  "byCategory": {...},
  "topInitiatives": [...],
  "delayedInitiatives": [...]
}
```

---

## User Interface

### Pages

#### /initiatives
**List View**
- Table display of all initiatives
- Filters: Status, Category, Priority, Department
- Search by name, number, or owner
- Columns: Initiative #, Name, Owner, Department, Category, Priority, Status, Progress, Timeline
- Actions: View, Edit, Delete

#### /initiatives/new
**Create Initiative Form**
- Initiative details
- Owner and department selection
- Timeline settings
- Budget allocation
- KPI impact selection
- Category assignment

#### /initiatives/:id
**Initiative Detail Dashboard**
- Overview card with key metrics
- Progress visualization
- Milestone timeline
- Task list
- KPI impact chart
- Notes and updates section

#### /initiatives/:id/milestones
**Milestone Timeline View**
- Visual timeline of milestones
- Planned vs actual dates
- Progress indicators
- Responsible persons
- Status tracking

#### /initiatives/:id/tasks
**Tasks Management**
- Task list with progress
- Assignment management
- Status updates
- Completion tracking

#### /initiatives/dashboard
**Analytics Dashboard**
- Total initiatives by status (pie chart)
- Average completion percentage
- Initiatives by category (bar chart)
- Top 5 initiatives by progress
- Delayed initiatives list
- Budget summary
- Department distribution

---

## Permissions

### Role-Based Access

| Action | Admin | Manager | Employee | HR | Finance |
|--------|-------|---------|----------|----|---------| 
| View All Initiatives | ✅ | ✅ | ✅ | ✅ | ✅ |
| View Assigned Initiatives | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create Initiative | ✅ | ✅ | ❌ | ❌ | ❌ |
| Edit Initiative | ✅ | ✅* | ❌ | ❌ | ❌ |
| Delete Initiative | ✅ | ❌ | ❌ | ❌ | ❌ |
| Add/Edit Milestones | ✅ | ✅* | ❌ | ❌ | ❌ |
| Add/Edit Tasks | ✅ | ✅* | ❌ | ❌ | ❌ |
| View Budget | ✅ | ✅ | ❌ | ❌ | ✅ |
| View Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ |

*Managers can only edit initiatives in their own department

---

## Initiative Lifecycle

### 1. Planning Phase
- Create initiative with objectives
- Define category and priority
- Assign owner and department
- Set timeline and budget
- Link to relevant KPIs
- Status: `Planned`

### 2. Execution Phase
- Update status to `In Progress`
- Set actual start date
- Add milestones
- Create tasks
- Assign responsibilities
- Track progress

### 3. Monitoring Phase
- Update milestone progress
- Complete tasks
- Monitor KPI impact
- Adjust timelines if needed
- Handle delays

### 4. Completion Phase
- Mark all milestones as completed
- Complete all tasks
- Set actual end date
- Update status to `Completed`
- Document outcomes
- Measure KPI impact

### 5. Review Phase
- Analyze results
- Document lessons learned
- Update notes
- Archive initiative

---

## Progress Calculation

### Auto-Calculation Formula
```
Initiative Progress = (Milestone Progress + Task Progress) / 2

Where:
- Milestone Progress = Average of all milestone progress percentages
- Task Progress = Average of all task progress percentages
```

### Calculation Triggers
- When a milestone is created/updated/deleted
- When a task is created/updated/deleted
- Automatically recalculates initiative progress

### Example
```
Initiative has:
- 3 Milestones: 100%, 75%, 50% → Average: 75%
- 4 Tasks: 100%, 100%, 50%, 25% → Average: 68.75%

Initiative Progress = (75 + 68.75) / 2 = 71.875% ≈ 72%
```

---

## Integration with Other Modules

### KPI Module
- Link initiatives to KPI definitions
- Track KPI improvement from initiatives
- Show initiative impact on KPI dashboard
- Filter KPIs by related initiatives

### Task Module
- Initiative tasks are separate from project tasks
- Shared UI components for task management
- Similar status and progress tracking

### Planning Module
- Convert initiative phases to planning rows
- Track planned vs actual durations
- Link initiative milestones to project phases

### User Module
- Assign initiative owners
- Track user involvement
- Show initiatives in user profiles

### Department Module
- Department-level initiative tracking
- Filter initiatives by department
- Department performance metrics

---

## Usage Guide

### Creating an Initiative

1. Navigate to **Initiatives** → **New Initiative**
2. Fill in basic information:
   - Name (required)
   - Category
   - Description
   - Objective
3. Assign ownership:
   - Select Owner (required)
   - Select Department (optional)
4. Set priority and status
5. Define timeline:
   - Start Date
   - End Date
6. Set budget (optional)
7. Link KPIs (optional)
8. Add notes
9. Click **Create Initiative**

### Adding Milestones

1. Open initiative detail page
2. Go to **Milestones** tab
3. Click **Add Milestone**
4. Enter:
   - Milestone name
   - Description
   - Planned date
   - Assign responsible person
5. Click **Save**

### Tracking Progress

1. Open initiative detail page
2. Update milestone progress:
   - Click on milestone
   - Update progress percentage
   - Change status if needed
   - Set actual completion date
3. Update task progress:
   - Mark tasks as complete
   - Update progress percentages
4. Initiative progress auto-updates

### Monitoring Delays

1. Go to **Initiatives Dashboard**
2. Check **Delayed Initiatives** section
3. View initiatives past their end date
4. See days overdue
5. Take corrective action

### Viewing Analytics

1. Navigate to **Initiatives** → **Dashboard**
2. View summary metrics
3. Analyze by:
   - Status distribution
   - Category breakdown
   - Department performance
   - Budget allocation
4. Filter by department, owner, or category
5. Export reports (future feature)

---

## Best Practices

### Initiative Planning
- Define clear, measurable objectives
- Link to relevant KPIs
- Set realistic timelines
- Assign appropriate budget
- Choose correct category

### Milestone Management
- Break initiatives into logical phases
- Set achievable milestone dates
- Assign clear responsibilities
- Update progress regularly
- Document completion

### Task Management
- Create specific, actionable tasks
- Assign to appropriate team members
- Set realistic deadlines
- Track progress weekly
- Complete tasks promptly

### Progress Tracking
- Update progress at least weekly
- Mark milestones complete on time
- Document delays immediately
- Adjust timelines when needed
- Communicate status changes

### KPI Integration
- Link initiatives to measurable KPIs
- Track KPI improvement
- Document initiative impact
- Use data for decision-making

---

## Future Enhancements

### Planned Features
- [ ] Email notifications for overdue milestones
- [ ] Weekly progress reports
- [ ] Initiative templates
- [ ] Gantt chart view
- [ ] Resource allocation tracking
- [ ] Risk management
- [ ] Document attachments
- [ ] Comments and discussions
- [ ] Initiative dependencies
- [ ] Export to PDF/Excel
- [ ] Mobile app support
- [ ] Integration with external tools

### Notification System
- Milestone overdue alerts
- Initiative completion <70% after end date
- Weekly summary reports
- Status change notifications
- Assignment notifications

---

## Technical Notes

### Performance Considerations
- Initiatives list is paginated (future)
- Dashboard uses aggregated queries
- Progress calculation is async
- Indexes on key fields for fast filtering

### Security
- All endpoints require authentication
- Role-based access control enforced
- Audit trail maintained (createdBy, updatedBy)
- Sensitive data (budget) restricted by role

### Data Integrity
- Cascade delete for milestones and tasks
- Foreign key constraints enforced
- Transaction support for critical operations
- Validation at API and database level

---

## Support

For questions or issues with the Initiatives module:
- Contact: IT Department
- Email: it@hexasteel.com
- Documentation: `/docs/features/INITIATIVES_MODULE.md`

---

**Last Updated:** January 18, 2025  
**Version:** 1.0  
**Module Status:** ✅ Production Ready
