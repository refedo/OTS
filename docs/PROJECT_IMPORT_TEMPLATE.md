# Project Import Template - Payment Terms Update

## Overview
This document describes the Excel format for importing/updating projects with the new payment percentage structure.

## Excel Sheet Structure

### Required Columns

| Column Name | Type | Description | Example |
|------------|------|-------------|---------|
| `project_code` | Text | Unique project identifier | `HS-2024-001` |
| `project_name` | Text | Project name | `Steel Factory Building` |
| `client_name` | Text | Client name | `ABC Corporation` |
| `contract_value` | Number | Total contract value in SAR | `1000000` |

### Payment Terms Columns (All Optional)

#### Down Payment
| Column Name | Type | Description | Example |
|------------|------|-------------|---------|
| `down_payment_percentage` | Number | Percentage (0-100) | `30` |
| `down_payment_milestone` | Text | Milestone description | `Upon Contract Signing` |
| `down_payment` | Number | Calculated amount (optional) | `300000` |

#### Payment 2
| Column Name | Type | Description | Example |
|------------|------|-------------|---------|
| `payment_2_percentage` | Number | Percentage (0-100) | `40` |
| `payment_2_milestone` | Text | Milestone description | `After Production` |
| `payment_2` | Number | Calculated amount (optional) | `400000` |

#### Payment 3
| Column Name | Type | Description | Example |
|------------|------|-------------|---------|
| `payment_3_percentage` | Number | Percentage (0-100) | `20` |
| `payment_3_milestone` | Text | Milestone description | `After Delivery` |
| `payment_3` | Number | Calculated amount (optional) | `200000` |

#### Payment 4-6
Similar structure for `payment_4`, `payment_5`, and `payment_6` with their respective `_percentage` and `_milestone` columns.

## Simplified Format for Payment Terms Update

If you only want to update payment terms for existing projects, you can use a minimal format:

### Minimum Required Columns
- `project_code` - To identify the project
- `contract_value` - For percentage calculations
- `down_payment_percentage` + `down_payment_milestone`
- `payment_2_percentage` + `payment_2_milestone`
- Additional payment percentages as needed

### Example Excel Data

```
project_code | contract_value | down_payment_percentage | down_payment_milestone | payment_2_percentage | payment_2_milestone | payment_3_percentage | payment_3_milestone
HS-2024-001  | 1000000       | 30                     | Contract Signing       | 50                   | After Production    | 20                   | After Delivery
HS-2024-002  | 500000        | 40                     | Down Payment          | 60                   | Final Payment       |                      |
HS-2024-003  | 750000        | 25                     | Advance               | 25                   | Milestone 1         | 25                   | Milestone 2
```

## Import Behavior

### Update Mode
- If `project_code` exists: Updates the project with new payment terms
- If `project_code` doesn't exist: Creates new project

### Percentage Calculation
- If you provide `percentage` only: System calculates amount automatically
- If you provide both `percentage` and `amount`: Both are saved
- If you provide `amount` only: Percentage is calculated if contract_value exists

## Notes

1. **Percentages should add up to 100%** (or less if retention applies)
2. **Milestone descriptions** help identify payment stages
3. **Contract value** is required for automatic percentage calculations
4. The system will **preserve existing data** for columns not included in the import
5. You can update **only payment terms** without affecting other project data

## How to Use

1. Export current projects to get the project codes
2. Create Excel file with columns above
3. Fill in payment percentages and milestones
4. Import through the Projects page → Import button
5. Review the import summary for any errors or warnings

## Example Use Case: Bulk Payment Terms Update

To update payment terms for all projects:

1. Keep it simple with these columns:
   - `project_code`
   - `contract_value` (if not already in system)
   - `down_payment_percentage`
   - `down_payment_milestone`
   - `payment_2_percentage`
   - `payment_2_milestone`
   - (Add more payment columns as needed)

2. The import will update only the payment-related fields
3. All other project data remains unchanged
