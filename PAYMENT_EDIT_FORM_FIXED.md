# Payment Edit Form Fixed

## Issue
When editing a project, users entered percentage values (e.g., 30, 40) in the "Payment Percentage (%)" field, but:
1. The percentages were not displaying on the project detail page
2. Only the milestone text was showing, not the percentage

## Root Cause
The edit form had a fundamental design flaw:
- **Label said:** "Down Payment Percentage (%)"
- **Field stored:** Payment amount (not percentage)
- **Milestone field stored:** Only description text (e.g., "D", "advac")

When users entered "0.3" or "30" in the percentage field, it was being stored as a payment amount of 0.3 or 30 (currency), not as a percentage. The milestone field only contained the description without the percentage prefix.

## Solution Applied

### 1. Form Submission Logic (`project-form-full.tsx` Lines 78-135)

Added `processPayment` function that:
1. Takes the percentage value entered by the user
2. Takes the description text entered by the user
3. Calculates the actual payment amount: `amount = contractValue × percentage ÷ 100`
4. Formats the milestone field: `"30% - description"`

```typescript
const processPayment = (key: string, milestoneKey: string) => {
  const percentage = getNumber(key); // User enters percentage
  const milestoneText = getString(milestoneKey); // User enters description
  
  if (!percentage || !milestoneText) {
    return { amount: null, milestone: milestoneText };
  }
  
  const amount = contractValue > 0 ? (contractValue * percentage / 100) : 0;
  const milestone = `${percentage}% - ${milestoneText}`;
  
  return { amount, milestone };
};
```

### 2. Form Display Logic (`project-form-full.tsx` Lines 397-449)

Updated form fields to:
1. Extract percentage from milestone field when editing existing projects
2. Display percentage in the percentage field
3. Display only description in the milestone field

```typescript
// Extract percentage and description from milestone field
const milestoneValue = (project as any)[payment.milestone] || '';
let percentageValue = '';
let descriptionValue = milestoneValue;

// Check if milestone contains percentage (format: "30% - description")
if (milestoneValue && milestoneValue.includes('%')) {
  const match = milestoneValue.match(/^(\d+(?:\.\d+)?)\s*%\s*-\s*(.+)$/);
  if (match) {
    percentageValue = match[1];
    descriptionValue = match[2];
  }
}
```

## How It Works Now

### User Input (Edit Form):
- **Down Payment Percentage (%):** 30
- **Payment Milestone / Condition:** Down payment upon signing
- **Contract Value:** 100,000

### Data Stored in Database:
- `downPayment`: 30,000 (calculated: 100,000 × 30 ÷ 100)
- `downPaymentMilestone`: "30% - Down payment upon signing"

### Display on Project Detail Page:
- **Percentage:** 30%
- **Terms:** Down payment upon signing

## Backward Compatibility

For old projects without percentage in milestone:
- Form calculates percentage from amount ÷ contract value
- Displays calculated percentage in the percentage field
- When saved, it will be reformatted with the new structure

## Instructions for Users

When editing payment terms:
1. Enter the **percentage** (e.g., 30, not 0.3)
2. Enter the **description** (e.g., "Down payment upon signing")
3. Make sure **Contract Value** is filled in
4. Save the project

The system will:
- Calculate the payment amount automatically
- Store the percentage with the description
- Display correctly on the project detail page

---
**Fixed on:** 2026-01-16 at 11:15 PM UTC+03:00
