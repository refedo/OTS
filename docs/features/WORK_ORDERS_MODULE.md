# Work Orders Module

## Overview
The Work Orders module provides a comprehensive system for creating, managing, and tracking production work orders. Work orders are automatically integrated with the production plan timeline and calculate weight percentages to ensure production stays within planned schedules.

## Key Features

### 1. **Multi-Step Work Order Creation**
A guided 4-step wizard to create work orders:

#### Step 1: Project & Building Selection
- Select the project
- Select the building within the project
- Validates that fabrication schedule exists

#### Step 2: Group Selection
- View all parts grouped by Name field (GABLE ANGLE, BEAM, COLUMN, etc.)
- Groups are based on the "Name" column from assembly parts list
- See part count and total weight for each group
- Select one or multiple groups
- Visual card-based selection interface

#### Step 3: Part Selection
- View all parts within selected groups
- Parts are displayed with Assembly Mark - Part Mark (e.g., "C1 - C1-1")
- Shows part designation, quantity, and weight
- Select individual parts or use "Select All" for each group
- Real-time total weight calculation

#### Step 4: Responsibility Assignment
- Assign production engineer responsible for the work order
- Specify processing location (e.g., Workshop A, Bay 3)
- Specify processing team (e.g., Team Alpha, Shift 1)
- Add optional description/notes
- View work order summary before creation

### 2. **Automatic Work Order Naming**
Work orders are automatically named based on:
- Building designation
- Selected groups
- Weight percentage of building

**Example**: `BLD1 - Columns, Rafters (33.5%)`

### 3. **Production Plan Integration**
- **Timeline Binding**: Work order dates are automatically set from the building's fabrication schedule
- **Weight Percentage**: Calculates WO weight as percentage of total building weight
- **Schedule Validation**: Ensures fabrication schedule exists before creating WO
- **Time Constraint**: Production period cannot exceed the planned fabrication end date

### 4. **Progress Tracking**
- Real-time progress calculation based on completed parts
- Visual progress bars with color coding:
  - **Red**: 0-30% progress
  - **Yellow**: 30-70% progress
  - **Green**: 70-100% progress
- Part-level status tracking (Pending, In Progress, Completed)

### 5. **Work Order List & Management**
- View all work orders with filters:
  - Filter by project
  - Filter by status
- Dashboard statistics:
  - Total orders
  - Pending, In Progress, Completed counts
  - Total weight across all orders
- Detailed work order cards showing:
  - WO number and name
  - Status badge
  - Project and building info
  - Assigned engineer
  - Weight and percentage
  - Timeline
  - Progress bar
  - Parts completion status

## Database Schema

### WorkOrder Model
```prisma
model WorkOrder {
  id                    String
  workOrderNumber       String    // Auto-generated: WO-YYYY-NNNN
  projectId             String
  buildingId            String
  name                  String    // Auto-generated
  description           String?
  selectedGroups        Json      // Array of group names
  productionEngineerId  String
  processingLocation    String?
  processingTeam        String?
  totalWeight           Decimal   // kg
  weightPercentage      Decimal   // % of building weight
  plannedStartDate      DateTime  // From fabrication schedule
  plannedEndDate        DateTime  // From fabrication schedule
  actualStartDate       DateTime?
  actualEndDate         DateTime?
  status                String    // Pending, In Progress, Completed, Cancelled
  progress              Decimal   // 0-100%
}
```

### WorkOrderPart Model
```prisma
model WorkOrderPart {
  id                String
  workOrderId       String
  assemblyPartId    String
  partDesignation   String
  assemblyMark      String
  partMark          String
  quantity          Int
  weight            Decimal
  processedQuantity Int
  status            String  // Pending, In Progress, Completed
}
```

## API Endpoints

### GET `/api/work-orders`
List all work orders with optional filters

**Query Parameters:**
- `projectId`: Filter by project
- `buildingId`: Filter by building
- `status`: Filter by status

**Response:**
```json
[
  {
    "id": "uuid",
    "workOrderNumber": "WO-2025-0001",
    "name": "BLD1 - Columns (33.5%)",
    "status": "In Progress",
    "progress": 45.5,
    "totalWeight": 50000,
    "weightPercentage": 33.5,
    "plannedStartDate": "2025-01-15",
    "plannedEndDate": "2025-02-15",
    "project": {
      "projectNumber": "270",
      "name": "Project Name"
    },
    "building": {
      "designation": "BLD1",
      "name": "Building Name"
    },
    "productionEngineer": {
      "name": "John Doe"
    },
    "parts": [...]
  }
]
```

### POST `/api/work-orders`
Create a new work order

**Request Body:**
```json
{
  "projectId": "uuid",
  "buildingId": "uuid",
  "selectedGroups": ["Columns", "Rafters"],
  "selectedPartIds": ["uuid1", "uuid2", ...],
  "productionEngineerId": "uuid",
  "processingLocation": "Workshop A",
  "processingTeam": "Team Alpha",
  "description": "Optional notes"
}
```

**Response:**
```json
{
  "id": "uuid",
  "workOrderNumber": "WO-2025-0001",
  "name": "BLD1 - Columns, Rafters (45.2%)",
  ...
}
```

### GET `/api/work-orders/parts-grouped`
Get parts grouped by Name field for a building

**Query Parameters:**
- `buildingId`: Building ID (required)

**Response:**
```json
[
  {
    "groupName": "GABLE ANGLE",
    "parts": [...],
    "count": 25,
    "totalWeight": 50000
  },
  {
    "groupName": "BEAM",
    "parts": [...],
    "count": 40,
    "totalWeight": 30000
  },
  {
    "groupName": "COLUMN",
    "parts": [...],
    "count": 15,
    "totalWeight": 60000
  }
]
```

### GET `/api/work-orders/[id]`
Get single work order details

### PATCH `/api/work-orders/[id]`
Update work order

### DELETE `/api/work-orders/[id]`
Delete work order

## Usage Guide

### Creating a Work Order

1. **Navigate to Work Orders**
   - Go to Production → Work Orders
   - Click "Create Work Order"

2. **Step 1: Select Project & Building**
   - Choose the project from dropdown
   - Choose the building from dropdown
   - System validates fabrication schedule exists

3. **Step 2: Select Groups**
   - View all available groups based on Name field (GABLE ANGLE, BEAM, COLUMN, etc.)
   - Click on group cards to select
   - Multiple groups can be selected
   - See part count and weight for each group

4. **Step 3: Select Parts**
   - View all parts in selected groups
   - Click individual parts to select/deselect
   - Use "Select All" button for each group
   - See real-time total weight calculation

5. **Step 4: Assign Responsibility**
   - Select production engineer from dropdown
   - Enter processing location (optional)
   - Enter processing team (optional)
   - Add description/notes (optional)
   - Review summary before creating

6. **Submit**
   - Click "Create Work Order"
   - System generates WO number automatically
   - Redirects to work orders list

### Viewing Work Orders

1. **Work Orders List**
   - View all work orders in card format
   - See key information at a glance
   - Filter by project or status

2. **Statistics Dashboard**
   - Total orders count
   - Pending, In Progress, Completed counts
   - Total weight across all orders

3. **Work Order Details**
   - Click "View Details" on any work order
   - See complete information
   - View all parts and their status
   - Track progress

## Integration with Production Plan

### Timeline Synchronization
- Work order dates are automatically set from the building's fabrication schedule in the production plan
- Ensures work orders align with overall project timeline
- Prevents scheduling conflicts

### Weight-Based Planning
- Calculates work order weight as percentage of building weight
- Example: If WO contains 50 tons and building is 150 tons, WO is 33.3%
- Helps in resource allocation and scheduling
- Ensures production capacity is not exceeded

### Schedule Validation
- System checks for fabrication schedule before allowing WO creation
- If no schedule exists, prompts user to create production plan first
- Ensures all work orders are within planned timeframes

## Progress Calculation

### Part-Level Progress
Each part in a work order has a status:
- **Pending**: Not started
- **In Progress**: Partially processed
- **Completed**: Fully processed

### Work Order Progress
```
Progress = (Completed Parts / Total Parts) × 100
```

### Visual Indicators
- **0-30%**: Red progress bar (Behind schedule)
- **30-70%**: Yellow progress bar (On track)
- **70-100%**: Green progress bar (Good progress)

## Best Practices

### 1. **Group Selection**
- Select related parts together (e.g., all columns)
- Consider fabrication sequence
- Balance work order size (not too large, not too small)

### 2. **Weight Distribution**
- Aim for 20-40% of building weight per work order
- Allows for parallel work orders
- Easier progress tracking

### 3. **Engineer Assignment**
- Assign based on expertise and workload
- Consider team availability
- Balance work across engineers

### 4. **Timeline Management**
- Create work orders early in the fabrication period
- Allow buffer time for unexpected delays
- Monitor progress regularly

### 5. **Part Selection**
- Select complete assemblies when possible
- Consider dependencies between parts
- Group parts by processing requirements

## Workflow Example

### Scenario: Creating WO for Gable Angles

1. **Initial Setup**
   - Project: 270 - Steel Structure
   - Building: BLD1 - Main Building
   - Fabrication Schedule: Jan 15 - Feb 15, 2025

2. **Group Selection**
   - Select "GABLE ANGLE" group
   - 25 parts, 50 tons total

3. **Part Review**
   - Review all gable angle parts (GA1-GA1, GA1-GA2, etc.)
   - Parts show as: Assembly Mark - Part Mark (e.g., "GA1 - GA1-1")
   - Select all or specific parts
   - Total: 20 parts selected, 40 tons

4. **Assignment**
   - Engineer: John Doe
   - Location: Workshop A, Bay 1
   - Team: Team Alpha

5. **Result**
   - WO Number: WO-2025-0001
   - Name: BLD1 - GABLE ANGLE (26.7%)
   - Timeline: Jan 15 - Feb 15, 2025
   - Status: Pending
   - Progress: 0%

6. **Tracking**
   - As parts are processed, update part status
   - Progress automatically updates
   - Monitor against timeline

## Reporting & Analytics

### Available Metrics
- Work orders by status
- Progress by engineer
- Weight distribution across work orders
- Timeline adherence
- Completion rates

### Future Enhancements
- [ ] Gantt chart view of work orders
- [ ] Resource allocation optimization
- [ ] Automated progress updates from production logs
- [ ] Work order templates
- [ ] Batch work order creation
- [ ] Email notifications for milestones
- [ ] Mobile app for field updates
- [ ] Integration with ERP systems

## Troubleshooting

### "No fabrication schedule found"
**Solution**: Create a production plan for the building first in Planning module

### Work order not showing in list
**Solution**: Check filters - may be filtered out by project or status

### Cannot select parts
**Solution**: Ensure groups are selected first in Step 2

### Progress not updating
**Solution**: Update part status in work order details page

### Weight percentage seems wrong
**Solution**: Verify all assembly parts have correct weights in raw data

## Migration

To add the Work Orders module to your database:

```bash
# Run the migration script
migrate-work-orders.bat

# Or manually
npx prisma migrate dev --name add_work_order_module
```

## Security & Permissions

- Only authorized users can create work orders
- Engineers can only view their assigned work orders
- Managers can view all work orders
- Admin can delete work orders

## Performance Considerations

- Work orders are indexed by project, building, engineer, and status
- Part selection is optimized with grouped queries
- Progress calculation is cached
- Large work orders (>100 parts) may take longer to load
