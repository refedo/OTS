# Project Setup Wizard - Updates

## Changes Made

### Step 1: Scope of Work Updates

**Added:**
- ✅ Roof Sheeting
- ✅ Wall Sheeting

**Removed:**
- ❌ Testing & Commissioning

**Renamed:**
- "Erection & Installation" → "Erection"

**Current Scope Options:**
1. Design & Engineering
2. Fabrication
3. Galvanization
4. Painting
5. Roof Sheeting (NEW)
6. Wall Sheeting (NEW)
7. Delivery & Logistics
8. Erection (renamed)

### Step 3: Schedule & Coating System - Major Redesign

#### Building Schedules
- Remains the same
- Set start/end dates for each building

#### Scope Schedules (NEW)
- **Dynamic schedule creation** based on selected scope in Step 1
- Each checked scope item gets its own schedule section
- Required fields:
  - Start Date
  - End Date
- Auto-populated when scope is selected
- Auto-removed when scope is unchecked

**Example:**
If user selects "Fabrication", "Galvanization", and "Painting" in Step 1:
- Step 3 will show 3 separate schedule sections
- Each with its own start/end date fields
- All must be filled to proceed

#### Coating System (REDESIGNED)
**Old Design:**
- Dropdown with predefined options

**New Design:**
- **Coating System** - Free text input field
  - User can enter any coating system
  - Examples: "Hot-Dip Galvanization", "Powder Coating", "Wet Paint"
  - Auto-detects galvanization (if text contains "galvaniz")
  
- **Microns** - Number input (optional)
  - Coating thickness
  - Example: 85
  
- **RAL Number** - Text input (optional)
  - Color specification
  - Example: RAL 7035

**Layout:**
All three fields displayed in a single row (3 columns on desktop)

## Technical Implementation

### New Types
```typescript
type ScopeSchedule = {
  scopeId: string;
  scopeLabel: string;
  startDate: string;
  endDate: string;
};
```

### New State Variables
- `scopeSchedules: ScopeSchedule[]` - Tracks schedules for each scope
- `coatingMicrons: string` - Coating thickness
- `ralNumber: string` - RAL color code

### New Functions
- `updateScopeSchedule()` - Updates start/end dates for scope schedules
- Enhanced `toggleScope()` - Auto-creates/removes scope schedules

### Validation Updates
Step 3 now validates:
1. All buildings have start/end dates
2. All scope schedules have start/end dates (NEW)
3. Coating system is filled

## User Experience Improvements

### Dynamic Scope Schedules
- **Automatic**: Schedules created when scope is checked
- **Clean**: Schedules removed when scope is unchecked
- **Visual**: Each scope gets its own card with clear labeling
- **Flexible**: Only shows schedules for selected scopes

### Flexible Coating System
- **No restrictions**: Enter any coating system name
- **Additional details**: Specify microns and RAL number
- **Smart detection**: Auto-sets galvanized flag
- **Better data**: More accurate coating specifications

## Benefits

1. **More Accurate Scheduling**
   - Building-level schedules
   - Scope-level schedules
   - Better project timeline visibility

2. **Better Coating Data**
   - Custom coating system names
   - Technical specifications (microns)
   - Color specifications (RAL)

3. **Improved Flexibility**
   - Not limited to predefined coating systems
   - Can specify exact requirements
   - Better for diverse projects

4. **Enhanced Data Quality**
   - More detailed information captured
   - Better tracking of project phases
   - Improved reporting capabilities

## Example Workflow

### Step 1: Select Scope
User checks:
- ✓ Fabrication
- ✓ Galvanization
- ✓ Painting
- ✓ Erection

### Step 3: Set Schedules

**Building Schedules:**
- Building A: Jan 1 - Mar 31

**Scope Schedules (Auto-created):**
- Fabrication: Jan 1 - Jan 31
- Galvanization: Feb 1 - Feb 15
- Painting: Feb 16 - Feb 28
- Erection: Mar 1 - Mar 31

**Coating System:**
- System: "Hot-Dip Galvanization + Powder Coating"
- Microns: 85
- RAL: RAL 7035

## Database Impact

### Projects Table
- `coatingSystem` - Stores custom coating system name
- `galvanized` - Auto-set based on coating system text

### Future Enhancement
Consider adding a separate `ScopeSchedule` table to store:
- projectId
- scopeType
- startDate
- endDate

This would enable better tracking and reporting of scope timelines.
