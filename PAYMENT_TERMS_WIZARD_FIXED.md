# Payment Terms Wizard Integration Fixed

## Issue
Payment terms configured in Step 5 of the project wizard were not being saved to the database. The wizard collected the payment terms data but didn't send it to the API during project creation.

## Root Cause
The `handleSubmit` function in the wizard (`page.tsx`) was missing the logic to convert the payment terms array into the individual payment fields that the database expects:
- `downPayment` / `downPaymentMilestone`
- `payment2` / `payment2Milestone`
- `payment3` / `payment3Milestone`
- etc.

## Solution Applied

### Updated `src/app/projects/wizard/page.tsx` (Lines 287-317)

Added conversion logic before creating the project:

```typescript
// Convert payment terms array to individual payment fields
const paymentData: any = {};
paymentTerms.forEach((term, index) => {
  const paymentNum = index + 1;
  const percentage = parseFloat(term.percentage) || 0;
  const amount = contractValue ? (parseFloat(contractValue) * percentage / 100) : 0;
  
  if (paymentNum === 1) {
    paymentData.downPayment = amount;
    paymentData.downPaymentMilestone = term.description;
  } else {
    paymentData[`payment${paymentNum}`] = amount;
    paymentData[`payment${paymentNum}Milestone`] = term.description;
  }
});

// Include payment terms in project data
const projectData = {
  // ... other fields
  ...paymentData, // Include payment terms
};
```

## How It Works

1. **User enters payment terms in Step 5:**
   - Payment 1: 20% - "Down payment upon signing"
   - Payment 2: 40% - "Against shop drawings approval"
   - Payment 3: 40% - "After fabrication completion"

2. **Wizard converts to database format:**
   - `downPayment`: 20% of contract value
   - `downPaymentMilestone`: "Down payment upon signing"
   - `payment2`: 40% of contract value
   - `payment2Milestone`: "Against shop drawings approval"
   - `payment3`: 40% of contract value
   - `payment3Milestone`: "After fabrication completion"

3. **Data is saved to database**

4. **Project detail page displays the actual terms** (from previous fix)

## Result
✅ Payment terms entered in the wizard are now saved to the database
✅ Payment terms display correctly on the project detail page
✅ Both amount and milestone description are captured
✅ Supports up to 6 payment terms

## Testing
Create a new project using the wizard:
1. Go to http://localhost:3000/projects/wizard
2. Complete Steps 1-4
3. In Step 5, add payment terms with percentages and descriptions
4. Complete the wizard
5. View the created project - payment terms should now display correctly

---
**Fixed on:** 2026-01-16 at 10:58 PM UTC+03:00
