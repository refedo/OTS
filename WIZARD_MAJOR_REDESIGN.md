# Project Setup Wizard - Major Redesign

## Overview
Complete redesign of the project setup wizard with significant structural changes to better align with real-world project management workflows.

## Major Changes

### 1. Wizard Steps: 4 → 5 Steps

**Old Structure:**
1. Project Information
2. Buildings
3. Schedule & Coating
4. Upload Parts

**New Structure:**
1. Project Information
2. Buildings
3. **Scope Schedules** (NEW - Separated)
4. **Coating System** (NEW - Separated)
5. Upload Parts

---

## Step-by-Step Changes

### Step 1: Project Information ✅
**Scope of Work Updates:**
- ✅ Added: **Shop Drawing**
- ✅ Added: **Roof Sheeting**
- ✅ Added: **Wall Sheeting**
- ✅ Renamed: "Design & Engineering" → **"Design"**
- ✅ Renamed: "Erection & Installation" → **"Erection"**
- ❌ Removed: "Testing & Commissioning"

**Final Scope List:**
1. Design
2. Shop Drawing (NEW)
3. Fabrication
4. Galvanization
5. Painting
6. Roof Sheeting (NEW)
7. Wall Sheeting (NEW)
8. Delivery & Logistics
9. Erection

### Step 2: Buildings ✅
**Changes:**
- ❌ **Removed**: Start Date & End Date fields from buildings
- Buildings now only have: Name & Designation
- Dates moved to scope level (Step 3)

**Rationale:**
- Buildings don't have single start/end dates
- Different scopes have different timelines per building
- More accurate project scheduling

### Step 3: Scope Schedules (COMPLETELY NEW) ✅
**Revolutionary Design:**

**Structure:**
- Organized by **Building**
- Each building shows all selected scopes
- Each scope has its own schedule

**Features:**
- ✅ **Start Date** for each scope per building
- ✅ **End Date** for each scope per building
- ✅ **Duration Calculation** - Auto-calculates days between dates
- ✅ **Dynamic UI** - Only shows scopes selected in Step 1
- ✅ **Building-centric view** - Clear visual hierarchy

**Example:**
```
Building A
  ├─ Design: Jan 1 - Jan 15 (15 days)
  ├─ Fabrication: Jan 16 - Feb 28 (44 days)
  └─ Galvanization: Mar 1 - Mar 15 (15 days)

Building B
  ├─ Design: Feb 1 - Feb 15 (15 days)
  ├─ Fabrication: Feb 16 - Mar 31 (44 days)
  └─ Galvanization: Apr 1 - Apr 15 (15 days)
```

### Step 4: Coating System (COMPLETELY NEW) ✅
**Revolutionary Design:**

**Old Approach:**
- Single dropdown with predefined options
- Single microns field
- Single RAL field

**New Approach:**
- ✅ **Multiple Coats** - Add unlimited coating layers
- ✅ **Dynamic List** - Add/Remove coats as needed
- ✅ **Per-Coat Details:**
  - Coat Name (free text)
  - Microns (optional)
  - RAL Number (optional)

**Features:**
- No dropdown restrictions
- Support for complex coating systems
- Real-world coating specifications
- Auto-detects galvanization

**Example:**
```
Coat 1: Hot-Dip Galvanization (85 microns)
Coat 2: Epoxy Primer (40 microns) - RAL 7035
Coat 3: Polyurethane Topcoat (60 microns) - RAL 9006
```

### Step 5: Upload Parts ✅
- Unchanged (was Step 4, now Step 5)
- Optional assembly parts upload

---

## Technical Implementation

### New Types
```typescript
type Building = {
  id: string;
  name: string;
  designation: string;
  // Removed: startDate, endDate
};

type ScopeSchedule = {
  scopeId: string;
  scopeLabel: string;
  buildingId: string;  // NEW - Links to building
  startDate: string;
  endDate: string;
};

type CoatingCoat = {  // NEW
  id: string;
  coatName: string;
  microns: string;
  ralNumber: string;
};
```

### New Functions
```typescript
// Duration calculation
calculateDuration(startDate, endDate): number

// Coating management
addCoatingCoat()
removeCoatingCoat(id)
updateCoatingCoat(id, field, value)

// Scope schedule management (updated)
updateScopeSchedule(buildingId, scopeId, field, value)
```

### State Management
- `scopeSchedules` - Array of schedules per building per scope
- `coatingCoats` - Array of coating layers
- Removed: `coatingSystem`, `coatingMicrons`, `ralNumber` (single values)

### Validation Updates
```typescript
Step 1: Project info + scope selection
Step 2: Buildings (name + designation)
Step 3: All scope schedules have dates ✅
Step 4: At least 1 coating coat with name ✅
Step 5: Optional (upload)
```

---

## Key Benefits

### 1. Accurate Scheduling
- **Building-level granularity** - Each building has its own timeline
- **Scope-level precision** - Each scope tracked independently
- **Duration visibility** - Instant calculation of timeframes
- **Realistic planning** - Reflects actual project workflows

### 2. Flexible Coating System
- **No limitations** - Enter any coating system
- **Multi-layer support** - Complex coating specifications
- **Complete details** - Microns, RAL, custom names
- **Industry standard** - Matches real coating specs

### 3. Better Data Quality
- **More detailed** - Captures actual project structure
- **More accurate** - Scope-level scheduling
- **More flexible** - No predefined restrictions
- **More useful** - Better for reporting and tracking

### 4. Improved UX
- **Clear hierarchy** - Building → Scopes → Dates
- **Visual feedback** - Duration calculations
- **Intuitive flow** - Logical step progression
- **Dynamic UI** - Adapts to selections

---

## Data Flow

### Project Creation
1. **Step 1**: Select scopes → Creates scope list
2. **Step 2**: Add buildings → Creates scope schedules for each building
3. **Step 3**: Set dates → Populates scope schedules
4. **Step 4**: Add coats → Creates coating specification
5. **Step 5**: Upload parts → Optional file upload

### Database Storage
```
Project
  ├─ Basic Info (name, number, client, manager)
  ├─ Scope of Work (generated text from checkboxes)
  ├─ Coating System (generated text from coats)
  └─ Buildings
       └─ (name, designation only)

Scope Schedules (TODO: Requires new table)
  ├─ Building ID
  ├─ Scope Type
  ├─ Start Date
  └─ End Date
```

---

## Future Enhancements

### Phase 1 (Immediate)
- [ ] Create `ScopeSchedule` database table
- [ ] Create API endpoints for scope schedules
- [ ] Persist scope schedules on project creation
- [ ] Display scope schedules on project detail page

### Phase 2 (Short-term)
- [ ] Gantt chart visualization of scope schedules
- [ ] Critical path analysis
- [ ] Schedule conflict detection
- [ ] Automatic schedule suggestions

### Phase 3 (Long-term)
- [ ] Resource allocation per scope
- [ ] Cost tracking per scope
- [ ] Progress tracking per scope
- [ ] Automated schedule updates based on production logs

---

## Migration Notes

### Breaking Changes
- Buildings no longer have `startDate` and `endDate`
- Coating system is now multi-layer (stored as formatted text)
- Scope schedules are per-building (not project-wide)

### Backward Compatibility
- Existing projects unaffected
- New wizard creates projects with new structure
- Old manual entry form still works

---

## Usage Example

### Creating a 2-Building Project

**Step 1: Project Info**
- Project: PRJ-2025-001
- Client: ABC Corp
- Scopes: ✓ Design, ✓ Fabrication, ✓ Galvanization, ✓ Painting

**Step 2: Buildings**
- Building A (Main Hall)
- Building B (Warehouse)

**Step 3: Scope Schedules**
```
Building A (Main Hall)
  Design: Jan 1 - Jan 31 (31 days)
  Fabrication: Feb 1 - Mar 31 (59 days)
  Galvanization: Apr 1 - Apr 15 (15 days)
  Painting: Apr 16 - Apr 30 (15 days)

Building B (Warehouse)
  Design: Feb 1 - Feb 28 (28 days)
  Fabrication: Mar 1 - Apr 30 (61 days)
  Galvanization: May 1 - May 15 (15 days)
  Painting: May 16 - May 31 (16 days)
```

**Step 4: Coating System**
```
Coat 1: Hot-Dip Galvanization (85 microns)
Coat 2: Epoxy Primer (40 microns) - RAL 7035
Coat 3: Polyurethane Topcoat (60 microns) - RAL 9010
```

**Step 5: Upload Parts**
- Upload: project_parts.xlsx

---

## Summary

This redesign transforms the wizard from a simple form into a powerful project planning tool that accurately reflects real-world construction workflows. The separation of schedules by building and scope, combined with flexible coating specifications, provides unprecedented detail and accuracy in project setup.

**Result**: Better data, better planning, better projects.
