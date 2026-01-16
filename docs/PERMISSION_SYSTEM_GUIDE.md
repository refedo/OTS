# Permission System Guide

## Overview
This guide explains how to properly integrate new modules into the RBAC (Role-Based Access Control) system to ensure proper permission enforcement.

## ⚠️ CRITICAL: Always Add Permissions for New Modules

**Every new module MUST be added to the permission system, or users will see it regardless of their role.**

## Step-by-Step Guide for Adding a New Module

### Step 1: Define Module Permissions
**File:** `src/lib/permissions.ts`

Add a new permission category for your module in the `PERMISSIONS` array:

```typescript
{
  id: 'your_module',
  name: 'Your Module Name',
  permissions: [
    { 
      id: 'your_module.view', 
      name: 'View Module', 
      description: 'Access and view the module', 
      category: 'your_module' 
    },
    { 
      id: 'your_module.create', 
      name: 'Create Items', 
      description: 'Create new items in the module', 
      category: 'your_module' 
    },
    { 
      id: 'your_module.edit', 
      name: 'Edit Items', 
      description: 'Modify existing items', 
      category: 'your_module' 
    },
    { 
      id: 'your_module.delete', 
      name: 'Delete Items', 
      description: 'Delete items from the module', 
      category: 'your_module' 
    },
  ],
}
```

**Permission Naming Convention:**
- Format: `module.action`
- Examples: `production.view_dashboard`, `quality.create_itp`, `business.manage_kpis`
- Use descriptive action names: `view`, `create`, `edit`, `delete`, `manage`, `approve`, etc.

### Step 2: Map Routes to Permissions
**File:** `src/lib/navigation-permissions.ts`

Add route mappings in the `NAVIGATION_PERMISSIONS` object:

```typescript
// Your Module
'/your-module': ['your_module.view'],
'/your-module/create': ['your_module.create'],
'/your-module/edit': ['your_module.edit'],
'/your-module/settings': ['your_module.manage', 'settings.edit'],
```

**Important Notes:**
- Array of permissions = user needs ANY of them (OR logic)
- Use `null` only for truly public routes (e.g., changelog)
- Most routes should require at least one permission

### Step 3: Update Role Permissions
**File:** `src/lib/permissions.ts` (in `DEFAULT_ROLE_PERMISSIONS`)

Add your module permissions to each role:

```typescript
Admin: ALL_PERMISSIONS.map(p => p.id), // Admin gets everything automatically

Manager: [
  // ... existing permissions
  // Your Module
  'your_module.view',
  'your_module.create',
  'your_module.edit',
  'your_module.delete',
  'your_module.manage',
],

Engineer: [
  // ... existing permissions
  // Your Module (Limited Access)
  'your_module.view',
  'your_module.create',
  'your_module.edit',
],

Operator: [
  // ... existing permissions
  // Your Module (View Only)
  'your_module.view',
],
```

**Role Guidelines:**
- **Admin**: Full access to everything (automatic)
- **Manager**: Full access to most modules, can manage teams
- **Engineer**: Can view and create, limited management
- **Operator**: Mostly view-only, can log production data

### Step 4: Add Server-Side Protection (Optional but Recommended)
**File:** Your API route (e.g., `src/app/api/your-module/route.ts`)

```typescript
import { checkPermission, checkAnyPermission } from '@/lib/permission-checker';

export async function GET() {
  // Check if user has permission
  const hasAccess = await checkPermission('your_module.view');
  if (!hasAccess) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  
  // Your logic here
}

export async function POST() {
  // Check if user has ANY of these permissions
  const hasAccess = await checkAnyPermission(['your_module.create', 'your_module.manage']);
  if (!hasAccess) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  
  // Your logic here
}
```

### Step 5: Test Your Implementation

1. **Create a test user** with limited permissions:
   - Go to `/users/create`
   - Select a non-Admin role
   - Go to **Custom Permissions** tab
   - Select ONLY your new module permissions
   - Create the user

2. **Login as test user** and verify:
   - ✅ User can see your module in the sidebar
   - ✅ User can access the module routes
   - ✅ Other modules are hidden

3. **Create another test user WITHOUT your module permissions**:
   - Login and verify:
   - ✅ Your module is NOT visible in the sidebar
   - ✅ Direct URL access is blocked (if server-side protection added)

## Current Module Permissions

### Core Modules
- **Users**: `users.*`
- **Roles**: `roles.*`
- **Departments**: `departments.*`
- **Projects**: `projects.*`
- **Buildings**: `buildings.*`
- **Tasks**: `tasks.*`

### Production & Quality
- **Production**: `production.*`
- **Quality Control**: `quality.*`
- **Planning**: `planning.*`
- **Documents**: `documents.*`

### Advanced Modules
- **Reports**: `reports.*`
- **Risk Management**: `risk.*`
- **Operations Control**: `operations.*`
- **Business Planning**: `business.*`
- **Knowledge Center**: `knowledge.*`
- **Product Backlog**: `backlog.*`
- **Notifications**: `notifications.*`, `events.*`, `governance.*`
- **AI Assistant**: `ai.*`
- **Timeline**: `timeline.*`
- **Settings**: `settings.*`

## Permission System Architecture

### How It Works

```
User Login
    ↓
JWT Token (contains role)
    ↓
Sidebar Component Loads
    ↓
Fetch /api/auth/me (returns permissions array)
    ↓
Filter Navigation Items
    ↓
Display Only Authorized Modules
```

### Permission Priority

1. **Custom Permissions** (if set on user) - Completely overrides role
2. **Role Permissions** (default) - Inherited from role definition

### Files in the Permission System

| File | Purpose |
|------|---------|
| `src/lib/permissions.ts` | Permission definitions & role defaults |
| `src/lib/navigation-permissions.ts` | Route-to-permission mapping |
| `src/lib/permission-checker.ts` | Server-side permission checking |
| `src/components/permissions-matrix.tsx` | UI for selecting permissions |
| `src/components/app-sidebar.tsx` | Filters navigation by permissions |
| `src/app/api/auth/me/route.ts` | Returns user permissions |
| `src/app/api/auth/session/route.ts` | Session validation with permissions |

## Common Mistakes to Avoid

### ❌ DON'T: Skip adding permissions
```typescript
// This makes the module visible to everyone!
'/your-module': null,
```

### ✅ DO: Always require permissions
```typescript
'/your-module': ['your_module.view'],
```

### ❌ DON'T: Use overly broad permissions
```typescript
// Too broad - gives access to unrelated modules
'/your-module': ['projects.view'],
```

### ✅ DO: Create specific permissions
```typescript
'/your-module': ['your_module.view'],
```

### ❌ DON'T: Forget to update all roles
```typescript
// Only Admin and Manager can access - Engineer/Operator locked out
Manager: ['your_module.view'],
Engineer: [], // MISSING!
Operator: [], // MISSING!
```

### ✅ DO: Consider all roles
```typescript
Manager: ['your_module.view', 'your_module.manage'],
Engineer: ['your_module.view', 'your_module.create'],
Operator: ['your_module.view'], // At least view access
```

## Checklist for New Modules

- [ ] Added permission category to `PERMISSIONS` array
- [ ] Created specific permission IDs (e.g., `module.view`, `module.create`)
- [ ] Added route mappings to `NAVIGATION_PERMISSIONS`
- [ ] Updated `Admin` role (automatic via `ALL_PERMISSIONS`)
- [ ] Updated `Manager` role permissions
- [ ] Updated `Engineer` role permissions
- [ ] Updated `Operator` role permissions
- [ ] Added server-side permission checks in API routes
- [ ] Tested with user having permissions
- [ ] Tested with user WITHOUT permissions
- [ ] Verified sidebar filtering works correctly

## Database Schema

The permission system uses these fields:

```prisma
model Role {
  id          String  @id @default(uuid())
  name        String  @unique
  permissions Json?   // Array of permission IDs
}

model User {
  id                String  @id @default(uuid())
  roleId            String
  customPermissions Json?   // Optional: overrides role permissions
  role              Role    @relation(fields: [roleId], references: [id])
}
```

## Updating Existing Roles in Database

After adding new permissions, you may want to update existing roles:

```sql
-- Update Manager role with new permissions
UPDATE Role 
SET permissions = JSON_ARRAY(
  -- ... all existing permissions
  'your_module.view',
  'your_module.create'
)
WHERE name = 'Manager';
```

Or use Prisma:

```typescript
await prisma.role.update({
  where: { name: 'Manager' },
  data: {
    permissions: [...existingPermissions, 'your_module.view', 'your_module.create']
  }
});
```

## Best Practices

1. **Granular Permissions**: Create specific permissions for different actions
2. **Consistent Naming**: Follow the `module.action` convention
3. **Role Hierarchy**: Admin > Manager > Engineer > Operator
4. **Test Thoroughly**: Always test with multiple role types
5. **Document Changes**: Update this guide when adding major modules
6. **Server-Side Protection**: Always add API route protection for sensitive operations
7. **User Experience**: Provide clear error messages when access is denied

## Future Enhancements

Consider these improvements:

- [ ] Permission groups for easier management
- [ ] Dynamic permission loading from database
- [ ] Audit logging for permission changes
- [ ] Permission inheritance system
- [ ] Time-based permissions (temporary access)
- [ ] Department-level permissions
- [ ] Project-level permissions

## Support

For questions or issues with the permission system:
1. Check this guide first
2. Review existing module implementations
3. Test with the permission matrix UI at `/users/create`
4. Check browser console for permission errors
5. Review API logs for 403 Forbidden errors

---

**Remember: Every new module MUST be added to the permission system!**
