# Project Migration & Excel Upload Module

## Overview

The Project Migration & Excel Upload Module enables seamless transition from legacy Google Sheets-based PTS (Project Tracking System) to the new web-based OTS (Operations Tracking System) platform.

## Features

### 1. Export Functionality
- **Export All Projects**: Download complete list of projects and buildings as Excel
- **Export Single Project**: Download specific project with its buildings
- **Download Template**: Get empty Excel template for new imports

### 2. Import Functionality
- **Excel Upload**: Upload .xlsx files with project and building data
- **Data Validation**: Comprehensive validation before database commit
- **Error Reporting**: Detailed error messages with row numbers
- **Update Support**: Update existing projects or create new ones

### 3. Security
- **Role-Based Access**: Only Admin and PMO users can access
- **Rate Limiting**: 10 file uploads per hour per user
- **File Validation**: MIME type and size checks (max 10MB)
- **Server-Side Validation**: All validation happens on server

## Excel Template Structure

### Sheet 1: Projects

**Required Columns:**
- `Project #` - Unique project code/number
- `Project Name` - Name of the project

**Optional Columns:**
- `Estimation #` - Estimation number
- `Client Name` - Client/customer name
- `Project Manager` - Name of project manager
- `Sales Engineer` - Name of sales engineer
- `Contract Date` - Contract signing date (YYYY-MM-DD)
- `Down Payment Date` - Down payment received date
- `Planned Start Date` - Project start date
- `Planned End Date` - Project completion date
- `Status` - One of: Draft, Active, On-Hold, Completed, Cancelled
- `Contract Value` - Total contract value (numeric)
- `Tonnage` - Total tonnage (numeric)
- `Down Payment` - Down payment amount
- `Payment 2` through `Payment 6` - Payment milestones
- `H.O Retention` - Head office retention amount
- `Incoterm` - Delivery terms (EXW, FOB, CIF, DDP, etc.)
- `Scope of Work` - Project scope description
- `Structure Type` - Type of structure
- `Project Nature` - Nature/category of project
- `No. of structures` - Number of structures
- `Erection Subcontractor` - Subcontractor name
- `Cranes Included?` - Yes/No
- `Surveyor Our Scope` - Yes/No
- `Galvanized` - Yes/No
- `Galvanization Microns` - Galvanization thickness
- `Area` - Total area in m²
- `m2/Ton` - Area per ton ratio
- `Paint Coat 1` through `Paint Coat 4` - Paint specifications
- `Coat 1 - Microns` through `Coat 4 - Microns` - Paint thickness
- `Location` - Project location
- `Remarks` - Additional notes

### Sheet 2: Buildings

**Required Columns:**
- `Project Code` - Must match a Project # from Projects sheet
- `Building Code` - Unique building code within project
- `Building Name` - Name of the building

**Optional Columns:**
- `Building Type` - One of: HR, PEB, MEP, Modular, Other
- `Area m2` - Building area in square meters
- `Weight Tons` - Building weight in tons
- `Remarks` - Additional notes

## API Endpoints

### GET /api/projects/export
Export all projects and buildings to Excel.

**Authentication:** Required (Admin/PMO)

**Response:** Excel file download

### GET /api/projects/export/[projectId]
Export single project and its buildings to Excel.

**Authentication:** Required (Admin/PMO)

**Parameters:**
- `projectId` - UUID of the project

**Response:** Excel file download

### GET /api/projects/template
Download empty Excel template.

**Authentication:** Required (Admin/PMO)

**Response:** Excel file download

### POST /api/projects/import
Import projects and buildings from Excel file.

**Authentication:** Required (Admin/PMO)

**Request Body:** multipart/form-data
- `file` - Excel file (.xlsx)

**Response:**
```json
{
  "success": true,
  "message": "Successfully imported...",
  "projectsCreated": 5,
  "projectsUpdated": 2,
  "buildingsCreated": 15,
  "buildingsUpdated": 3,
  "warnings": [],
  "rateLimitRemaining": 9
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Validation failed",
  "errors": [
    {
      "row": 3,
      "field": "project_code",
      "message": "Project code is required",
      "severity": "critical"
    }
  ],
  "warnings": []
}
```

## Validation Rules

### Critical Errors (Import Blocked)
- Missing required columns in Excel sheets
- Missing or empty `project_code` in Projects sheet
- Duplicate `project_code` in Projects sheet
- Missing or empty `building_code` in Buildings sheet
- Building references non-existent `project_code`
- Invalid enum values (Status, Building Type)

### Warnings (Import Continues)
- Missing optional fields (client_name, project_manager, etc.)
- Invalid date formats (auto-corrected when possible)
- Non-numeric values in numeric fields (auto-coerced)

## Usage Guide

### Exporting Projects

1. Navigate to `/projects/migration`
2. Click "Download All Projects (Excel)"
3. Excel file will be downloaded with all current projects

### Importing Projects

1. Navigate to `/projects/migration`
2. Click "Download Empty Template" to get started
3. Fill in the Projects and Buildings sheets
4. Drag and drop the file or click "Browse Files"
5. Click "Import Projects"
6. Review validation results
7. Fix any errors and re-upload if needed

### Updating Existing Projects

1. Export current projects
2. Modify the Excel file
3. Re-import the file
4. Projects with matching `Project #` will be updated
5. New projects will be created

## Data Mapping from Legacy PTS

| PTS Field | OTS Field | Notes |
|-----------|-----------|-------|
| Project | project_code | Unique identifier |
| Building | building_code | Unique within project |
| Client | client_name | Auto-creates client if not exists |
| Area | area_m2 | Numeric value |
| Weight | weight_tons | Numeric value |
| Start | planned_start_date | Date format |
| Finish | planned_end_date | Date format |
| Notes | remarks | Text field |

## Error Handling

### File Upload Errors
- **Invalid file type**: Only .xlsx files accepted
- **File too large**: Maximum 10MB
- **Rate limit exceeded**: Wait until reset time

### Validation Errors
- **Missing sheets**: Excel must contain "Projects" and "Buildings" sheets
- **Missing columns**: Required columns must be present
- **Invalid data**: Data must match expected format and constraints

### Import Errors
- **Database errors**: Transaction rolled back, no partial imports
- **Foreign key violations**: Buildings must reference valid projects
- **Duplicate keys**: Project codes must be unique

## Rate Limiting

- **Limit**: 10 file uploads per hour per user
- **Reset**: Automatically resets after 1 hour
- **Response**: HTTP 429 with reset time when exceeded

## Security Considerations

1. **Authentication**: All endpoints require valid JWT token
2. **Authorization**: Only Admin and PMO roles can access
3. **File Validation**: MIME type and size checked server-side
4. **SQL Injection**: Prisma ORM prevents SQL injection
5. **Rate Limiting**: Prevents abuse and DoS attacks

## File Structure

```
src/
├── app/
│   ├── api/
│   │   └── projects/
│   │       ├── export/
│   │       │   ├── route.ts              # Export all projects
│   │       │   └── [projectId]/route.ts  # Export single project
│   │       ├── import/
│   │       │   └── route.ts              # Import projects
│   │       └── template/
│   │           └── route.ts              # Download template
│   └── projects/
│       └── migration/
│           └── page.tsx                  # Frontend UI
├── lib/
│   ├── services/
│   │   └── project-import.service.ts     # Database operations
│   ├── types/
│   │   └── project-migration.ts          # TypeScript types
│   └── utils/
│       ├── excel-generator.ts            # Excel export logic
│       ├── excel-parser.ts               # Excel import logic
│       └── rate-limiter.ts               # Rate limiting
└── scripts/
    └── generate-sample-template.ts       # Sample data generator
```

## Testing

### Generate Sample Template
```bash
npx tsx scripts/generate-sample-template.ts
```

This creates `OTS_Sample_Import_Template.xlsx` with example data.

### Manual Testing Checklist

- [ ] Download empty template
- [ ] Download all projects export
- [ ] Download single project export
- [ ] Import valid Excel file
- [ ] Import file with validation errors
- [ ] Import file with warnings
- [ ] Update existing projects
- [ ] Test rate limiting (11 uploads)
- [ ] Test with non-Admin user
- [ ] Test with invalid file types
- [ ] Test with oversized files

## Troubleshooting

### "Unauthorized" Error
- Ensure you're logged in
- Check if your role is Admin or PMO

### "Rate limit exceeded"
- Wait for the reset time shown in error message
- Contact admin to reset if needed

### "Invalid Excel structure"
- Ensure sheets are named exactly "Projects" and "Buildings"
- Check that required columns are present
- Download template for reference

### "Project manager not found"
- User name must match exactly
- System will use default if not found (with warning)
- Check user exists in system

### "Building references non-existent project"
- Ensure `Project Code` in Buildings sheet matches `Project #` in Projects sheet
- Check for typos in project codes

## Best Practices

1. **Always backup**: Export current data before large imports
2. **Test first**: Use sample data to test import process
3. **Validate offline**: Check data in Excel before uploading
4. **Small batches**: Import in smaller batches for easier error tracking
5. **Review warnings**: Address warnings even if import succeeds
6. **Keep templates**: Save working templates for future use

## Support

For issues or questions:
1. Check this documentation
2. Review error messages carefully
3. Contact system administrator
4. Check application logs for detailed errors

## Version History

- **v1.0.0** (2024-11-29): Initial release
  - Export all projects
  - Export single project
  - Import from Excel
  - Template download
  - Validation and error reporting
  - Rate limiting
