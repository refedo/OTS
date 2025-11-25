# Initiatives Module - Quick Setup Guide

## ✅ Completed Components

### 1. Database Schema ✅
- **Models Created:**
  - `Initiative` - Main initiative tracking
  - `InitiativeMilestone` - Milestone management
  - `InitiativeTask` - Task tracking
- **Relations Added:**
  - User relations (owner, creator, updater, responsible, assignee)
  - Department relations
- **Database Migration:** ✅ Completed

### 2. API Endpoints ✅
All REST endpoints implemented with RBAC:

**Initiatives:**
- `GET /api/initiatives` - List with filters
- `POST /api/initiatives` - Create (Admin/Manager)
- `GET /api/initiatives/:id` - Get details
- `PATCH /api/initiatives/:id` - Update (Admin/Manager)
- `DELETE /api/initiatives/:id` - Delete (Admin only)

**Milestones:**
- `POST /api/initiatives/:id/milestones` - Add milestone
- `PATCH /api/initiatives/:id/milestones/:mid` - Update milestone
- `DELETE /api/initiatives/:id/milestones/:mid` - Delete milestone

**Tasks:**
- `POST /api/initiatives/:id/tasks` - Add task
- `PATCH /api/initiatives/:id/tasks/:tid` - Update task
- `DELETE /api/initiatives/:id/tasks/:tid` - Delete task

**Analytics:**
- `GET /api/initiatives/dashboard` - Dashboard data

### 3. User Interface ✅
**Pages Created:**
- `/initiatives` - List view with filters ✅
- Navigation added to sidebar ✅

**Components:**
- `InitiativesClient` - Main list component ✅
- Progress bar component ✅

### 4. Features Implemented ✅
- Auto-generated initiative numbers (INIT-YYYY-NNN)
- Progress auto-calculation from milestones and tasks
- Role-based access control
- Filtering by status, category, priority, department
- Search functionality
- Color-coded status and priority badges

---

## 🔨 Remaining Pages to Build

### Priority 1: Core Functionality
1. **Initiative Detail Page** (`/initiatives/:id`)
   - Overview dashboard
   - Milestone list
   - Task list
   - Progress visualization
   - Edit functionality

2. **Create/Edit Initiative Form** (`/initiatives/new`, `/initiatives/:id/edit`)
   - Form with all fields
   - Owner/department selection
   - Date pickers
   - KPI selection
   - Category dropdown

### Priority 2: Enhanced Views
3. **Analytics Dashboard** (`/initiatives/dashboard`)
   - Summary statistics
   - Charts (status, category, department)
   - Top initiatives
   - Delayed initiatives list

4. **Milestone Timeline** (`/initiatives/:id/milestones`)
   - Visual timeline
   - Gantt-style view
   - Milestone management

5. **Task Management** (`/initiatives/:id/tasks`)
   - Task list
   - Progress tracking
   - Assignment management

---

## 🚀 Quick Start

### 1. Access the Module
Navigate to: **Initiatives** in the sidebar (under Management section)

### 2. Create Your First Initiative
```bash
# Via UI:
1. Click "New Initiative" button
2. Fill in the form (currently needs to be built)

# Via API (temporary):
POST /api/initiatives
{
  "name": "Digital Transformation 2025",
  "category": "Digital Transformation",
  "ownerId": "your-user-id",
  "priority": "High",
  "startDate": "2025-01-01",
  "endDate": "2025-12-31"
}
```

### 3. View Initiatives
Go to `/initiatives` to see the list with:
- Filters by status, category, priority, department
- Search by name or number
- Progress visualization
- Actions menu (View, Edit, Delete)

---

## 📋 Next Steps for Development

### Immediate Tasks
1. **Build Create Form** (`/initiatives/new`)
   - Copy structure from `/projects/new`
   - Add all initiative fields
   - Implement form validation
   - Handle API submission

2. **Build Detail Page** (`/initiatives/:id`)
   - Fetch initiative data
   - Display overview cards
   - Show milestones and tasks
   - Add edit/delete actions

3. **Build Dashboard** (`/initiatives/dashboard`)
   - Fetch dashboard data from API
   - Create chart components
   - Display statistics
   - Add filters

### Code Templates

#### Create Form Structure
```typescript
// src/app/initiatives/new/page.tsx
import { InitiativeForm } from '@/components/initiative-form';

export default async function NewInitiativePage() {
  // Fetch users, departments
  return <InitiativeForm mode="create" />;
}
```

#### Detail Page Structure
```typescript
// src/app/initiatives/[id]/page.tsx
import { InitiativeDetail } from '@/components/initiative-detail';

export default async function InitiativeDetailPage({ params }) {
  // Fetch initiative data
  return <InitiativeDetail initiative={data} />;
}
```

---

## 🎨 UI Components Needed

### Forms
- [ ] Initiative form component
- [ ] Milestone form dialog
- [ ] Task form dialog

### Display
- [ ] Initiative overview card
- [ ] Milestone timeline component
- [ ] Task list component
- [ ] Progress chart component
- [ ] KPI impact chart

### Charts (using Recharts)
- [ ] Status distribution pie chart
- [ ] Category bar chart
- [ ] Progress trend line chart
- [ ] Budget allocation chart

---

## 🔧 Configuration

### Initiative Categories
Defined in `initiatives-client.tsx`:
```typescript
const categories = [
  'Digital Transformation',
  'Lean Management',
  'AI & Automation',
  'Human Capital Development',
  'Knowledge & Learning',
  'Factory Optimization',
  'Sustainability & Green Building',
  'Operational Excellence',
];
```

### Status Colors
```typescript
const statusColors = {
  Planned: 'bg-gray-100 text-gray-800',
  'In Progress': 'bg-blue-100 text-blue-800',
  'On Hold': 'bg-yellow-100 text-yellow-800',
  Completed: 'bg-green-100 text-green-800',
  Cancelled: 'bg-red-100 text-red-800',
};
```

---

## 📊 Testing

### Test Data Creation
```sql
-- Create test initiative
INSERT INTO Initiative (
  id, initiativeNumber, name, category, 
  ownerId, status, priority, progress,
  createdBy, updatedBy
) VALUES (
  UUID(), 'INIT-2025-001', 'Test Initiative',
  'Digital Transformation', 'user-id',
  'In Progress', 'High', 45.5,
  'user-id', 'user-id'
);
```

### API Testing
```bash
# List initiatives
curl http://localhost:3000/api/initiatives

# Get single initiative
curl http://localhost:3000/api/initiatives/{id}

# Create initiative
curl -X POST http://localhost:3000/api/initiatives \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","ownerId":"uuid"}'
```

---

## 📝 Notes

### Progress Calculation
- Automatically updates when milestones/tasks change
- Formula: `(Milestone Avg + Task Avg) / 2`
- Triggers on create/update/delete operations

### Permissions
- **Admin:** Full access
- **Manager:** Create/edit in own department
- **Employee:** View only
- **HR/Finance:** View with restrictions

### Integration Points
- **KPI Module:** Link initiatives to KPIs via `kpiImpact` JSON field
- **Task Module:** Separate task system for initiatives
- **Planning Module:** Future integration for phase conversion

---

## 🐛 Known Issues
None currently - module is in initial release state.

---

## 📚 Resources

- **Full Documentation:** `/docs/features/INITIATIVES_MODULE.md`
- **API Endpoints:** See documentation for complete API reference
- **Database Schema:** `prisma/schema.prisma` lines 1141-1225

---

## ✅ Checklist for Production

- [x] Database models created
- [x] Database migrated
- [x] API endpoints implemented
- [x] List page created
- [x] Navigation added
- [x] Documentation written
- [ ] Create form built
- [ ] Detail page built
- [ ] Dashboard built
- [ ] Milestone management
- [ ] Task management
- [ ] Notifications implemented
- [ ] Testing completed
- [ ] User training provided

---

**Status:** 🟡 Core functionality complete, UI pages in progress  
**Ready for:** API testing, data entry via API, list view usage  
**Next Priority:** Build create form and detail page
