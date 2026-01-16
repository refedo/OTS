# Work Orders Module - Fixes Applied

## Issues Fixed

### 1. ✅ Processing Location & Team Dropdowns
**Issue**: Location and team were text inputs instead of dropdowns from production settings.

**Solution**:
- Changed to dropdown selects
- Fetch from `/api/settings/production/locations?activeOnly=true`
- Fetch from `/api/settings/production/teams?activeOnly=true`
- Only shows active locations and teams

**Files Modified**:
- `src/app/production/work-orders/new/page.tsx`

### 2. ✅ Date Selection with Validation
**Issue**: Dates were automatically set from fabrication schedule without user control or validation.

**Solution**:
- Added date input fields for start and end dates
- Pre-fills with fabrication schedule dates as suggestions
- Shows fabrication schedule reference for context
- Validates end date against fabrication schedule end date
- Shows warning if end date exceeds schedule: "⚠️ Warning: End date exceeds fabrication schedule end date"

**Features**:
- Date inputs with calendar picker
- Real-time validation
- Visual warning in orange text
- Fabrication schedule reference box showing:
  - Schedule Start date
  - Schedule End date
  - Reminder that WO dates should be within timeframe

**Files Modified**:
- `src/app/production/work-orders/new/page.tsx`
- `src/app/api/work-orders/route.ts`

### 3. ✅ Fixed 500 Internal Server Error
**Issue**: Database table `WorkOrder` doesn't exist yet - migration not run.

**Solution**:
- The migration file was created but not executed
- Need to run: `migrate-work-orders.bat`

**Root Cause**: 
- Prisma schema was updated with WorkOrder and WorkOrderPart models
- Migration was created but database not updated
- API tries to access non-existent tables

**How to Fix**:
```bash
# Run the migration
migrate-work-orders.bat

# Or manually
npx prisma migrate dev --name add_work_order_module

# Then generate Prisma client
npx prisma generate
```

## Changes Summary

### Frontend Changes (`src/app/production/work-orders/new/page.tsx`)

#### New State Variables
```typescript
const [processingLocations, setProcessingLocations] = useState<ProcessingLocation[]>([]);
const [processingTeams, setProcessingTeams] = useState<ProcessingTeam[]>([]);
const [selectedLocation, setSelectedLocation] = useState('');
const [selectedTeam, setSelectedTeam] = useState('');
const [fabricationSchedule, setFabricationSchedule] = useState<any>(null);
const [plannedStartDate, setPlannedStartDate] = useState('');
const [plannedEndDate, setPlannedEndDate] = useState('');
const [dateWarning, setDateWarning] = useState('');
```

#### New Fetch Functions
```typescript
fetchProcessingLocations() // Fetches from production settings
fetchProcessingTeams()      // Fetches from production settings
fetchFabricationSchedule()  // Fetches schedule for date suggestions
```

#### Date Validation Logic
```typescript
useEffect(() => {
  if (plannedEndDate && fabricationSchedule) {
    const woEnd = new Date(plannedEndDate);
    const fabEnd = new Date(fabricationSchedule.endDate);
    
    if (woEnd > fabEnd) {
      setDateWarning('⚠️ Warning: End date exceeds fabrication schedule end date');
    } else {
      setDateWarning('');
    }
  }
}, [plannedEndDate, fabricationSchedule]);
```

#### UI Changes in Step 4

**Before**:
```tsx
<Input placeholder="e.g., Workshop A, Bay 3" />
<Input placeholder="e.g., Team Alpha, Shift 1" />
```

**After**:
```tsx
<select>
  <option value="">Select location...</option>
  {processingLocations.map(location => (
    <option key={location.id} value={location.name}>
      {location.name}
    </option>
  ))}
</select>

<select>
  <option value="">Select team...</option>
  {processingTeams.map(team => (
    <option key={team.id} value={team.name}>
      {team.name}
    </option>
  ))}
</select>

<Input type="date" value={plannedStartDate} />
<Input type="date" value={plannedEndDate} />
{dateWarning && <p className="text-orange-600">{dateWarning}</p>}
```

### Backend Changes (`src/app/api/work-orders/route.ts`)

#### Request Body
```typescript
// Added to request body
plannedStartDate: string;
plannedEndDate: string;
```

#### Date Handling Logic
```typescript
// Use provided dates or fallback to fabrication schedule
let startDate: Date;
let endDate: Date;

if (plannedStartDate && plannedEndDate) {
  startDate = new Date(plannedStartDate);
  endDate = new Date(plannedEndDate);
} else {
  // Fallback to fabrication schedule
  const fabricationSchedule = await prisma.scopeSchedule.findUnique({
    where: {
      buildingId_scopeType: { buildingId, scopeType: 'fabrication' }
    }
  });
  
  if (!fabricationSchedule) {
    return NextResponse.json({ 
      error: 'No fabrication schedule found and no dates provided.' 
    }, { status: 400 });
  }
  
  startDate = fabricationSchedule.startDate;
  endDate = fabricationSchedule.endDate;
}
```

## Testing Checklist

### Before Testing
- [ ] Run migration: `migrate-work-orders.bat`
- [ ] Ensure production settings have locations and teams configured
- [ ] Ensure projects have fabrication schedules

### Test Cases

#### 1. Processing Location Dropdown
- [ ] Navigate to Create Work Order
- [ ] Go to Step 4
- [ ] Verify location dropdown shows locations from production settings
- [ ] Verify only active locations are shown
- [ ] Select a location and verify it's saved

#### 2. Processing Team Dropdown
- [ ] In Step 4
- [ ] Verify team dropdown shows teams from production settings
- [ ] Verify only active teams are shown
- [ ] Select a team and verify it's saved

#### 3. Date Selection & Validation
- [ ] Select a building with fabrication schedule
- [ ] In Step 4, verify dates are pre-filled with schedule dates
- [ ] Verify fabrication schedule reference box shows correct dates
- [ ] Change end date to exceed schedule end date
- [ ] Verify warning appears: "⚠️ Warning: End date exceeds..."
- [ ] Change end date to be within schedule
- [ ] Verify warning disappears

#### 4. Work Order Creation
- [ ] Complete all steps
- [ ] Submit work order
- [ ] Verify no 500 error
- [ ] Verify work order is created successfully
- [ ] Verify dates are saved correctly
- [ ] Verify location and team are saved

## Production Settings Setup

If you haven't set up processing locations and teams yet:

### 1. Add Processing Locations
Navigate to: **Settings → Production → Locations**

Add locations like:
- Workshop A
- Workshop B
- Bay 1
- Bay 2
- Assembly Area
- Welding Station

### 2. Add Processing Teams
Navigate to: **Settings → Production → Teams**

Add teams like:
- Team Alpha
- Team Beta
- Shift 1
- Shift 2
- Welding Team
- Assembly Team

## Migration Instructions

### Step 1: Run Migration
```bash
# Windows
migrate-work-orders.bat

# Or manually
npx prisma migrate dev --name add_work_order_module
```

### Step 2: Generate Prisma Client
```bash
npx prisma generate
```

### Step 3: Restart Development Server
```bash
npm run dev
```

### Step 4: Verify Tables Created
Check your database for these new tables:
- `WorkOrder`
- `WorkOrderPart`

## Error Messages

### "No fabrication schedule found and no dates provided"
**Cause**: Building doesn't have a fabrication schedule and no dates were manually entered.

**Solution**: 
1. Go to Planning module
2. Create a fabrication schedule for the building
3. Or manually enter dates in the work order form

### "Failed to fetch processing locations"
**Cause**: Production settings API not accessible or no locations configured.

**Solution**:
1. Check API endpoint: `/api/settings/production/locations`
2. Add locations in production settings

### "Failed to fetch processing teams"
**Cause**: Production settings API not accessible or no teams configured.

**Solution**:
1. Check API endpoint: `/api/settings/production/teams`
2. Add teams in production settings

## Benefits of Changes

1. **Standardization**: Using predefined locations and teams ensures consistency
2. **Data Quality**: Dropdown prevents typos and variations
3. **Flexibility**: Users can adjust dates while staying informed about schedule
4. **Validation**: Warns users when dates exceed planned timeframe
5. **User Experience**: Pre-filled dates save time while allowing customization
6. **Traceability**: Locations and teams from settings can be tracked and managed centrally

## Future Enhancements

- [ ] Add validation to prevent start date after end date
- [ ] Add calendar view for date selection
- [ ] Show workload for each location/team
- [ ] Suggest optimal dates based on workload
- [ ] Add date range validation (minimum duration)
- [ ] Show conflicts with other work orders
