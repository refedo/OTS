# Field Mapping Feature - Project Migration Module

## Overview

The Field Mapping feature allows users to import Excel files with custom column names by mapping their columns to OTS fields. This makes the import process much more flexible and user-friendly.

## How It Works

### User Workflow

1. **Upload Excel File** - User selects an Excel file
2. **Choose Import Method**:
   - **Direct Import**: Uses automatic column name matching (existing behavior)
   - **Map Fields**: Opens field mapper for custom column mapping
3. **Map Columns** (if using Map Fields):
   - System extracts column headers from Excel
   - User maps each Excel column to corresponding OTS field
   - Auto-mapping suggests matches based on column names
   - Required fields are highlighted
4. **Import** - System imports data using the custom mappings

### Technical Flow

```
User uploads file
     ↓
Click "Map Fields"
     ↓
POST /api/projects/extract-columns
     ↓
Display FieldMapper component
     ↓
User maps columns
     ↓
POST /api/projects/import (with mappings)
     ↓
Import complete
```

## Components

### 1. FieldMapper Component
**Location**: `src/components/project-migration/field-mapper.tsx`

**Features**:
- Visual column mapping interface
- Auto-mapping based on column name similarity
- Sheet type selector (Projects/Buildings)
- Required field validation
- Skip column option
- Auto-map button to re-run auto-mapping

**Props**:
```typescript
interface FieldMapperProps {
  excelColumns: string[];
  onMappingComplete: (mappings: Record<string, string>) => void;
  onCancel: () => void;
}
```

### 2. Excel Parser Updates
**Location**: `src/lib/utils/excel-parser.ts`

**New Functions**:
- `extractExcelColumns(buffer)` - Extract column headers
- `parseExcelFileWithMapping(buffer, projectMappings, buildingMappings)` - Parse with custom mappings
- `mapProjectRow(normalized)` - Map normalized data to ProjectRow
- `mapBuildingRow(normalized)` - Map normalized data to BuildingRow

### 3. API Endpoints

#### Extract Columns
**Endpoint**: `POST /api/projects/extract-columns`

**Request**: multipart/form-data with Excel file

**Response**:
```json
{
  "success": true,
  "columns": {
    "projects": ["Project", "Name", "Client", ...],
    "buildings": ["Project", "Building", "Name", ...]
  }
}
```

#### Import with Mappings
**Endpoint**: `POST /api/projects/import`

**Request**: multipart/form-data
- `file`: Excel file
- `projectMappings`: JSON string of column mappings (optional)
- `buildingMappings`: JSON string of column mappings (optional)

**Example Mappings**:
```json
{
  "Project": "project_code",
  "Name": "project_name",
  "Client": "client_name"
}
```

## Auto-Mapping Logic

The system automatically suggests mappings based on:

1. **Exact Match**: Column name exactly matches OTS field
   - `project_code` → `project_code`

2. **Normalized Match**: After removing special characters
   - `Project #` → `project_code`
   - `Project Name` → `project_name`

3. **Common Aliases**:
   - `Project` → `project_code`
   - `Client` → `client_name`
   - `PM` → `project_manager`
   - `Start` → `planned_start_date`
   - `Finish` → `planned_end_date`
   - `Building` → `building_code`
   - `Notes` → `remarks`

## OTS Fields Reference

### Projects Sheet Fields

**Required**:
- `project_code` - Project # (unique identifier)
- `project_name` - Project Name

**Optional** (40+ fields):
- Basic: estimation_number, client_name, location, status, remarks
- Dates: contract_date, down_payment_date, planned_start_date, planned_end_date
- Financial: contract_value, tonnage, down_payment, payment_2-6, ho_retention
- Technical: structure_type, project_nature, no_of_structures, incoterm
- Coating: galvanized, galvanization_microns, area, m2_per_ton
- Paint: paint_coat_1-4, coat_1-4_microns
- Personnel: project_manager, sales_engineer, erection_subcontractor
- Flags: cranes_included, surveyor_our_scope

### Buildings Sheet Fields

**Required**:
- `project_code` - Must match a project
- `building_code` - Building identifier
- `building_name` - Building name

**Optional**:
- `building_type` - HR, PEB, MEP, Modular, Other
- `area_m2` - Area in square meters
- `weight_tons` - Weight in tons
- `remarks` - Additional notes

## Usage Examples

### Example 1: Legacy PTS Format

**Excel Columns**:
- Project
- Building
- Client
- Area
- Weight
- Start
- Finish
- Notes

**Auto-Mapped To**:
- Project → project_code
- Building → building_code
- Client → client_name
- Area → area
- Weight → tonnage
- Start → planned_start_date
- Finish → planned_end_date
- Notes → remarks

### Example 2: Custom Format

**Excel Columns**:
- Proj No
- Proj Name
- Customer
- PM Name
- Contract Val
- Start Date

**User Maps To**:
- Proj No → project_code
- Proj Name → project_name
- Customer → client_name
- PM Name → project_manager
- Contract Val → contract_value
- Start Date → planned_start_date

## Benefits

1. **Flexibility**: Import from any Excel format
2. **No Template Required**: Users can use their existing spreadsheets
3. **Visual Mapping**: Clear interface shows what maps to what
4. **Auto-Mapping**: Saves time with intelligent suggestions
5. **Validation**: Ensures required fields are mapped
6. **Backward Compatible**: Direct import still works for template files

## UI Features

### Import Section Updates

**Before**:
- Single "Import Projects" button

**After**:
- "Map Fields" button (secondary style)
- "Direct Import" button (primary style)
- Helper text: "Use 'Map Fields' if your columns don't match the template exactly"

### Field Mapper Modal

- Full-screen overlay with dark background
- Centered modal with scroll support
- Two-column layout: Excel Column → OTS Field
- Dropdown selectors for each column
- Sheet type tabs (Projects/Buildings)
- Auto-Map button to re-run suggestions
- Required field warnings
- Cancel and Continue buttons

## Testing

### Test Cases

1. **Auto-Mapping**:
   - Upload file with standard column names
   - Verify auto-mapping suggestions are correct
   - Verify required fields are mapped

2. **Custom Mapping**:
   - Upload file with non-standard columns
   - Manually map all columns
   - Verify import succeeds

3. **Partial Mapping**:
   - Map only required fields
   - Skip optional columns
   - Verify import succeeds with warnings

4. **Invalid Mapping**:
   - Try to continue without mapping required fields
   - Verify error message displays
   - Verify Continue button is disabled

5. **Direct Import**:
   - Upload template file
   - Use Direct Import button
   - Verify works as before

## Future Enhancements

Potential improvements:

- [ ] Save mapping presets for reuse
- [ ] Import mapping from JSON file
- [ ] Export mapping to JSON file
- [ ] Column preview (show sample data)
- [ ] Batch mapping (map multiple columns at once)
- [ ] Mapping validation before import
- [ ] Support for calculated fields
- [ ] Custom field transformations

## Troubleshooting

### "Failed to extract columns"
- Check Excel file format (.xlsx)
- Verify sheets are named "Projects" and "Buildings"
- Ensure file has header row

### "Missing required fields"
- Map all required fields (marked with "Required")
- Cannot skip project_code, project_name, building_code, building_name

### "Import failed after mapping"
- Check data types match (dates, numbers, etc.)
- Verify project codes in Buildings sheet exist in Projects sheet
- Review validation errors in import result

## Summary

The Field Mapping feature makes the Project Migration Module significantly more flexible by allowing users to import data from any Excel format. The intuitive interface with auto-mapping makes it easy to use while maintaining data integrity through validation.

**Key Files**:
- `src/components/project-migration/field-mapper.tsx`
- `src/lib/utils/excel-parser.ts`
- `src/app/api/projects/extract-columns/route.ts`
- `src/app/api/projects/import/route.ts`
- `src/app/projects/migration/page.tsx`
