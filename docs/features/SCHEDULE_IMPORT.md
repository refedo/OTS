# Schedule Import Feature

## Overview
The Schedule Import feature allows you to bulk import project schedules from Excel files into the planning system. This is useful for importing schedules from external planning tools or updating multiple schedules at once.

## Accessing the Feature
Navigate to: **Planning** (`http://localhost:3000/planning`)

You'll find two new buttons:
- **Download Template**: Downloads a sample CSV/Excel template
- **Import Excel**: Upload your Excel file to import schedules

## Excel File Format

### Required Columns
Your Excel file must contain the following columns (case-insensitive):

1. **Project**: Project number or project name
2. **Building**: Building designation or building name
3. **Activity**: Activity/scope name (see supported activities below)
4. **Start Date**: Schedule start date
5. **End Date**: Schedule end date

### Example Format

| Project | Building | Activity | Start Date | End Date |
|---------|----------|----------|------------|----------|
| 270 | BLD1 | Fabrication | 2025-01-15 | 2025-02-15 |
| 270 | BLD1 | Painting | 2025-02-16 | 2025-03-01 |
| 275 | WH | Design | 2025-01-01 | 2025-01-31 |

### Supported Activities
The following activity names are recognized (case-insensitive):

- **Design**
- **Shop Drawing** / **Shop Drawings**
- **Procurement** / **Supply** / **Procurement/Supply**
- **Fabrication**
- **Galvanization**
- **Painting**
- **Roof Sheeting**
- **Wall Sheeting**
- **Delivery** / **Logistics** / **Delivery & Logistics**
- **Erection**

## Date Formats

The import supports multiple date formats:

1. **Excel Date Numbers**: Native Excel date serial numbers
2. **ISO Format**: `YYYY-MM-DD` (e.g., `2025-01-15`)
3. **Standard Formats**: Most common date formats recognized by JavaScript

**Recommended**: Use `YYYY-MM-DD` format for best compatibility

## How to Import

### Step 1: Prepare Your Excel File
1. Click **Download Template** to get a sample file
2. Fill in your schedule data following the format
3. Save the file as `.xlsx`, `.xls`, or `.csv`

### Step 2: Import the File
1. Click **Import Excel** button
2. Select your prepared Excel file
3. Wait for the import to complete

### Step 3: Review Results
After import, you'll see a summary showing:
- **Success**: Number of schedules imported successfully
- **Failed**: Number of schedules that failed to import
- **Errors**: Detailed error messages for failed imports

## Import Behavior

### New Schedules
- If a schedule doesn't exist (unique combination of building + activity), it will be created

### Existing Schedules
- If a schedule already exists, it will be **updated** with the new dates
- This allows you to update schedules by re-importing

### Validation Rules
1. **Project must exist**: The project number/name must match an existing project
2. **Building must exist**: The building must exist in the specified project
3. **Valid activity**: Activity name must match one of the supported activities
4. **Valid dates**: Start date must be before end date
5. **All fields required**: All columns must have values

## Error Handling

### Common Errors

**"Project not found"**
- The project number/name doesn't match any existing project
- Check spelling and ensure the project exists in the system

**"Building not found"**
- The building doesn't exist in the specified project
- Verify the building designation/name and project combination

**"Unknown activity"**
- The activity name doesn't match supported activities
- Use one of the activity names from the supported list

**"Invalid date format"**
- The date couldn't be parsed
- Use `YYYY-MM-DD` format or Excel date format

**"Start date must be before end date"**
- The end date is earlier than the start date
- Check your dates and swap if necessary

**"Missing required data"**
- One or more required fields are empty
- Ensure all columns have values for each row

## Tips for Successful Import

1. **Use the Template**: Start with the downloaded template to ensure correct format
2. **Check Project Numbers**: Verify project numbers match exactly
3. **Verify Buildings**: Ensure buildings exist before importing
4. **Date Format**: Use `YYYY-MM-DD` format for dates
5. **Test Small**: Import a few rows first to test before bulk import
6. **Review Errors**: Check error messages carefully to fix issues

## Example Import Scenarios

### Scenario 1: New Project Schedule
Import all schedules for a new project at once:

```csv
Project,Building,Activity,Start Date,End Date
270,BLD1,Design,2025-01-01,2025-01-31
270,BLD1,Fabrication,2025-02-01,2025-03-31
270,BLD1,Painting,2025-04-01,2025-04-15
270,BLD2,Design,2025-01-01,2025-01-31
270,BLD2,Fabrication,2025-02-15,2025-04-15
```

### Scenario 2: Update Existing Schedules
Re-import with updated dates to modify existing schedules:

```csv
Project,Building,Activity,Start Date,End Date
270,BLD1,Fabrication,2025-02-05,2025-04-05
270,BLD1,Painting,2025-04-06,2025-04-20
```

### Scenario 3: Multiple Projects
Import schedules for multiple projects:

```csv
Project,Building,Activity,Start Date,End Date
270,BLD1,Fabrication,2025-01-15,2025-02-15
275,WH,Fabrication,2025-02-01,2025-03-01
278,Zone B,Fabrication,2025-03-01,2025-04-30
```

## API Endpoint

### POST `/api/scope-schedules/import`

**Request**: Multipart form data with file upload

**Response**:
```json
{
  "message": "Import completed",
  "results": {
    "success": 10,
    "failed": 2,
    "errors": [
      "Row 5: Project '999' not found",
      "Row 8: Invalid date format"
    ]
  }
}
```

## Technical Details

### File Processing
- Uses `xlsx` library to parse Excel files
- Supports `.xlsx`, `.xls`, and `.csv` formats
- Handles Excel date serial numbers automatically

### Database Operations
- Uses `upsert` logic: creates new or updates existing
- Unique constraint: `buildingId` + `scopeType`
- Transactional: Each row is processed independently

### Performance
- Processes rows sequentially
- Suitable for files with hundreds of schedules
- For very large files (1000+ rows), consider splitting

## Troubleshooting

### Import Button Disabled
- Check that you're not already importing
- Refresh the page if stuck

### No Success Count
- Verify all rows have errors
- Check error messages for common issues
- Ensure projects and buildings exist

### Partial Import
- Some rows succeeded, some failed
- Successfully imported rows are saved
- Fix errors and re-import failed rows

### Dates Not Parsing
- Use `YYYY-MM-DD` format
- Avoid text dates like "January 15, 2025"
- Ensure Excel cells are formatted as dates

## Future Enhancements

- [ ] Support for Excel formulas in date cells
- [ ] Bulk delete via import
- [ ] Import validation preview before saving
- [ ] Support for additional schedule metadata
- [ ] Import history and rollback
