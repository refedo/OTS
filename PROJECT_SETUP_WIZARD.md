# Project Setup Wizard

## Overview
A comprehensive 4-step wizard to simplify and streamline project creation in the MRP system.

## Features

### Step 1: Project Information
- **Project Number** - Unique identifier
- **Project Name** - Descriptive name
- **Client Name** - Direct text input (no need to create client first)
- **Project Manager** - Select from managers/admins
- **Contractual Tonnage** - Optional tonnage value
- **Scope of Work** - Checkbox selection with auto-generated description:
  - Design & Engineering
  - Fabrication
  - Galvanization
  - Painting
  - Delivery & Logistics
  - Erection & Installation
  - Testing & Commissioning

### Step 2: Buildings
- Add multiple buildings dynamically
- Each building requires:
  - Building Name
  - Designation (e.g., BLD-A, BLD-B)
- Remove buildings as needed
- Minimum 1 building required

### Step 3: Schedule & Coating
- **Building Schedules** - Set dates for each building:
  - Start Date
  - End Date
- **Coating System** - Select from:
  - Hot-Dip Galvanization
  - Powder Coating
  - Wet Paint
  - Galvanization + Paint
  - None
- Auto-sets galvanized flag based on coating selection

### Step 4: Upload Assembly Parts (Optional)
- Upload Excel file with assembly parts
- Can be skipped and done later from project details page
- Supports .xlsx and .xls formats

## Key Improvements

### Simplified Workflow
- **No client creation required** - Enter client name directly
- **Scope auto-generation** - Check boxes, get formatted description
- **Building-level schedules** - More accurate than project-level dates
- **Engineering tonnage removed** - Calculated from assembly parts automatically

### User Experience
- **Visual progress indicator** - Shows current step and completion
- **Step validation** - Can't proceed without required fields
- **Back navigation** - Can go back to edit previous steps
- **Responsive design** - Works on all screen sizes

### Data Integrity
- All required fields validated
- Dates validated per building
- Coating system determines galvanization flag
- Atomic transaction - all or nothing

## API Updates

### Buildings API (`/api/buildings`)
- Added POST endpoint
- Supports `startDate` and `endDate` fields
- Creates buildings with schedule information

### Projects API (`/api/projects`)
- Added `coatingSystem` field to schema
- Supports `clientName` for direct entry
- Maintains backward compatibility

## Access

### URL
`/projects/wizard`

### Permissions
- Admin
- Manager

### Navigation
- **Primary button** on projects list page: "Setup Wizard"
- **Secondary button**: "Manual Entry" (existing form)

## Technical Details

### File Structure
```
src/app/projects/wizard/page.tsx - Main wizard component
src/app/api/buildings/route.ts - Building creation API
src/app/api/projects/route.ts - Project creation API (updated)
```

### State Management
- React useState for form data
- Step-by-step validation
- File upload handling
- Dynamic building list management

### Workflow
1. User fills step 1 → validates → proceeds
2. User adds buildings in step 2 → validates → proceeds
3. User sets schedules and coating in step 3 → validates → proceeds
4. User optionally uploads parts in step 4 → submits
5. System creates project, buildings, and uploads parts
6. User redirected to project details page

## Benefits

1. **Faster project creation** - Guided workflow
2. **Fewer errors** - Validation at each step
3. **Better data quality** - Required fields enforced
4. **Improved UX** - Visual feedback and progress
5. **Flexibility** - Can skip optional steps
6. **Scalability** - Easy to add more steps/fields

## Future Enhancements

- Save draft functionality
- Template support (save/load project templates)
- Bulk building import from Excel
- Project cloning feature
- Email notifications on completion
- Integration with document management
