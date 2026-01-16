# Missing Modules Permission Fix

## Problem Identified
Many modules were appearing to all users regardless of their role because they had no permission assignments:
- Early Warning (Risk Dashboard)
- Operations Control
- Business Planning
- Knowledge Center
- Product Backlog
- Notifications
- AI Assistant
- Timeline modules

## Solution Applied

### 1. Added New Permission Categories
**File:** `src/lib/permissions.ts`

Added 8 new permission categories with 50+ new permissions:

#### Risk Management & Early Warning
- `risk.view_dashboard` - Access early warning dashboard
- `risk.view_alerts` - View risk alerts
- `risk.manage` - Create and manage risks

#### Operations Control
- `operations.view_dashboard` - Access operations control
- `operations.view_intelligence` - View intelligence data
- `operations.view_work_units` - View work units
- `operations.manage_work_units` - Manage work units
- `operations.view_dependencies` - View dependencies
- `operations.manage_dependencies` - Manage dependencies
- `operations.view_capacity` - View capacity planning
- `operations.ai_digest` - Access AI risk digest

#### Business Planning & Strategy
- `business.view_dashboard` - View business dashboard
- `business.view_foundation` - View strategic foundation
- `business.edit_foundation` - Edit strategic foundation
- `business.view_swot` - View SWOT analysis
- `business.edit_swot` - Edit SWOT analysis
- `business.view_objectives` - View OKRs
- `business.manage_objectives` - Manage OKRs
- `business.view_kpis` - View KPIs
- `business.manage_kpis` - Manage KPIs
- `business.view_initiatives` - View initiatives
- `business.manage_initiatives` - Manage initiatives
- `business.view_dept_plans` - View department plans
- `business.manage_dept_plans` - Manage department plans
- `business.view_issues` - View weekly issues
- `business.manage_issues` - Manage weekly issues

#### Knowledge Center
- `knowledge.view` - Access knowledge center
- `knowledge.create` - Create knowledge entries
- `knowledge.edit` - Edit knowledge entries
- `knowledge.delete` - Delete knowledge entries
- `knowledge.validate` - Validate knowledge entries

#### Product Backlog & Development
- `backlog.view` - View backlog board
- `backlog.create` - Create backlog items
- `backlog.edit` - Edit backlog items
- `backlog.delete` - Delete backlog items
- `backlog.prioritize` - Prioritize backlog
- `backlog.ceo_center` - Access CEO control center

#### Notifications & Events
- `notifications.view` - View own notifications
- `notifications.view_all` - View all notifications
- `notifications.manage` - Manage notifications
- `events.view` - View system events
- `events.manage` - Manage events
- `governance.view` - Access governance center

#### AI Assistant
- `ai.use` - Use AI assistant
- `ai.view_history` - View AI history
- `ai.admin` - AI administration

#### Timeline & Scheduling
- `timeline.view` - View timelines
- `timeline.edit` - Edit timelines
- `timeline.operations` - Operations timeline
- `timeline.engineering` - Engineering timeline
- `timeline.events` - Event management

### 2. Updated Navigation Permissions
**File:** `src/lib/navigation-permissions.ts`

Changed from generic/null permissions to specific module permissions:

**Before:**
```typescript
'/risk-dashboard': ['reports.view', 'projects.view'], // Too broad
'/ai-assistant': null, // Everyone could access
'/notifications': null, // Everyone could access
```

**After:**
```typescript
'/risk-dashboard': ['risk.view_dashboard', 'risk.view_alerts'],
'/ai-assistant': ['ai.use'],
'/notifications': ['notifications.view'],
```

### 3. Updated All Role Permissions
**File:** `src/lib/permissions.ts` (DEFAULT_ROLE_PERMISSIONS)

#### Admin Role
- Automatically gets ALL permissions (no changes needed)

#### Manager Role
Added full access to new modules:
- Risk Management: All permissions
- Operations Control: All permissions
- Business Planning: All permissions
- Knowledge Center: View, Create, Edit, Validate
- Product Backlog: View, Create, Edit, Prioritize
- Notifications: View, View All
- AI Assistant: Use, View History
- Timeline: All permissions

#### Engineer Role
Added appropriate access:
- Risk Management: View dashboard, View alerts
- Operations Control: View dashboard, intelligence, work units, dependencies, capacity
- Business Planning: View only (dashboard, foundation, SWOT, objectives, KPIs, initiatives)
- Knowledge Center: View, Create, Edit
- Product Backlog: View, Create, Edit
- Notifications: View
- AI Assistant: Use, View History
- Timeline: View, Operations, Engineering

#### Operator Role
Added limited access:
- Risk Management: View dashboard, View alerts
- Operations Control: View dashboard, View work units
- Knowledge Center: View only
- Notifications: View
- AI Assistant: Use
- Timeline: View, Operations

## Impact

### Before Fix
- ❌ All users could see all modules
- ❌ No permission enforcement on new modules
- ❌ RBAC system incomplete

### After Fix
- ✅ Users only see modules they have permissions for
- ✅ Complete permission coverage for all modules
- ✅ Proper role-based access control

## Testing

1. **Create test user with Operator role:**
   - Should see: Dashboard, Tasks, Production (view), Risk Dashboard (view), Operations Control (view), Knowledge Center (view), Notifications, AI Assistant, Timeline (view)
   - Should NOT see: User Management, Role Management, Business Planning (edit), Product Backlog (manage), Settings

2. **Create test user with Engineer role:**
   - Should see: Most modules with create/edit access
   - Should NOT see: User Management (create/edit), Role Management, Business Planning (manage), CEO Control Center

3. **Create test user with Manager role:**
   - Should see: Almost all modules with full access
   - Should NOT see: Some admin-only features

## Files Modified

1. ✅ `src/lib/permissions.ts` - Added 8 new categories, 50+ permissions
2. ✅ `src/lib/navigation-permissions.ts` - Updated all route mappings
3. ✅ `docs/PERMISSION_SYSTEM_GUIDE.md` - Created comprehensive guide

## For Future Development

**⚠️ CRITICAL: Always add new modules to the permission system!**

Follow the guide at `docs/PERMISSION_SYSTEM_GUIDE.md` when creating new modules.

### Quick Checklist:
1. [ ] Add permission category to `src/lib/permissions.ts`
2. [ ] Map routes in `src/lib/navigation-permissions.ts`
3. [ ] Update all role permissions in `DEFAULT_ROLE_PERMISSIONS`
4. [ ] Add server-side checks in API routes
5. [ ] Test with multiple role types

## Database Update Required

After deploying these changes, existing roles in the database should be updated with new permissions:

```typescript
// Run this script or similar to update existing roles
import { PrismaClient } from '@prisma/client';
import { DEFAULT_ROLE_PERMISSIONS } from '@/lib/permissions';

const prisma = new PrismaClient();

async function updateRolePermissions() {
  for (const [roleName, permissions] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
    await prisma.role.update({
      where: { name: roleName },
      data: { permissions: permissions }
    });
    console.log(`Updated ${roleName} role with ${permissions.length} permissions`);
  }
}

updateRolePermissions();
```

## Summary

All missing modules now have proper permission assignments. The RBAC system is complete and will properly restrict access based on user roles and custom permissions. Future modules must follow the established pattern to maintain security.
