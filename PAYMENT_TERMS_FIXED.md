# Payment Terms Display Fixed

## Issue
Payment terms configured during project wizard creation were not displaying on the project detail page. The Finance section showed hardcoded text instead of the actual milestone terms entered during project creation.

### What Was Showing
- Down Payment: "down payment to be paid upon the signing of contract." (hardcoded)
- Payment 2-6: "of the value to be loaded after production" (hardcoded)

### What Should Show
- Down Payment: Value from `downPaymentMilestone` field
- Payment 2-6: Values from `payment2Milestone`, `payment3Milestone`, etc. fields

## Root Cause
The `project-details.tsx` component was displaying hardcoded placeholder text instead of reading the actual milestone terms from the database fields:
- `downPaymentMilestone`
- `payment2Milestone`
- `payment3Milestone`
- `payment4Milestone`
- `payment5Milestone`
- `payment6Milestone`

## Solution Applied

### Updated `project-details.tsx` (Lines 308-326)

**Before:**
```typescript
<td className="px-3 py-2">down payment to be paid upon the signing of contract.</td>
// ...
const ack = (project as any)[`payment${num}Ack`];
<td className="px-3 py-2">{ack || 'of the value to be loaded after production'}</td>
```

**After:**
```typescript
<td className="px-3 py-2">{project.downPaymentMilestone || 'down payment to be paid upon the signing of contract.'}</td>
// ...
const milestone = (project as any)[`payment${num}Milestone`];
<td className="px-3 py-2">{milestone || '-'}</td>
```

## Changes Made
1. **Down Payment Terms**: Now displays `project.downPaymentMilestone` with fallback to default text
2. **Payment 2-6 Terms**: Now displays actual milestone values from `payment2Milestone`, `payment3Milestone`, etc.
3. **Empty Values**: Shows "-" instead of generic placeholder text when no milestone is set

## Result
✅ Payment terms entered during project wizard creation now correctly display on the project detail page
✅ Each payment schedule row shows its specific milestone/terms
✅ Finance section accurately reflects the configured payment structure

## Testing
Refresh the project detail page at:
http://localhost:3000/projects/dfdf681a-a725-4054-bda2-7b409b38376f

The Payment Schedule table should now show the actual terms configured during project creation.

---
**Fixed on:** 2026-01-16 at 10:54 PM UTC+03:00
