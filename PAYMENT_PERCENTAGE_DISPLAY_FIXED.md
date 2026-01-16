# Payment Percentage Display Fixed

## Issue
The project detail page was calculating and displaying percentages from payment amounts, but the user wanted to see the exact percentage values they entered during the wizard creation process.

## Solution Applied

### 1. Wizard - Store Percentage in Milestone Field
**File:** `src/app/projects/wizard/page.tsx` (Line 297)

The wizard now stores the percentage along with the description in the milestone field:
```typescript
const milestoneWithPercentage = `${percentage}% - ${term.description}`;
```

**Example:**
- User enters: 20% with description "Down payment upon signing"
- Stored as: `"20% - Down payment upon signing"`

### 2. Project Detail - Extract and Display Percentage
**File:** `src/components/project-details.tsx` (Lines 310-362)

The display logic now:
1. **Extracts the percentage** from the milestone field using regex pattern `/^(\d+(?:\.\d+)?)\s*%/`
2. **Separates the description** by splitting on ` - `
3. **Falls back to calculation** if the milestone doesn't contain a percentage (for old projects)

**Display Logic:**
- **Percentage Column:** Shows the exact percentage entered (e.g., "20%")
- **Terms Column:** Shows only the description part (e.g., "Down payment upon signing")

## Result

### Before
- Percentage: Calculated from amount ÷ contract value
- Terms: Full milestone text or hardcoded fallback

### After
- Percentage: Exact value entered in wizard (e.g., "20%", "40%")
- Terms: Clean description without percentage prefix

## Example Display

| Schedule | Percentage | Terms |
|----------|-----------|-------|
| Down Payment | 20% | Down payment upon signing |
| Payment 2 | 40% | Against shop drawings approval |
| Payment 3 | 40% | After fabrication completion |

## Backward Compatibility
For projects created before this fix (without percentage in milestone):
- Falls back to calculating percentage from amount/contract value
- Displays the full milestone text as-is

## Testing
Create a new project via the wizard:
1. Enter payment terms with specific percentages
2. View the project detail page
3. Verify the exact percentages you entered are displayed

---
**Fixed on:** 2026-01-16 at 11:05 PM UTC+03:00
