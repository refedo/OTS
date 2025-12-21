'use client';

import { useState, useEffect } from 'react';
import { PERMISSIONS, PermissionCategory } from '@/lib/permissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Info } from 'lucide-react';

type PermissionsMatrixProps = {
  selectedPermissions: string[];
  onChange: (permissions: string[]) => void;
  rolePermissions?: string[];
  disabled?: boolean;
};

export function PermissionsMatrix({
  selectedPermissions,
  onChange,
  rolePermissions = [],
  disabled = false,
}: PermissionsMatrixProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(PERMISSIONS.map(cat => cat.id))
  );

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const togglePermission = (permissionId: string) => {
    const newPermissions = selectedPermissions.includes(permissionId)
      ? selectedPermissions.filter(p => p !== permissionId)
      : [...selectedPermissions, permissionId];
    onChange(newPermissions);
  };

  const toggleAllInCategory = (category: PermissionCategory) => {
    const categoryPermissionIds = category.permissions.map(p => p.id);
    const allSelected = categoryPermissionIds.every(id => selectedPermissions.includes(id));
    
    let newPermissions: string[];
    if (allSelected) {
      newPermissions = selectedPermissions.filter(id => !categoryPermissionIds.includes(id));
    } else {
      const toAdd = categoryPermissionIds.filter(id => !selectedPermissions.includes(id));
      newPermissions = [...selectedPermissions, ...toAdd];
    }
    onChange(newPermissions);
  };

  const isCategoryFullySelected = (category: PermissionCategory) => {
    return category.permissions.every(p => selectedPermissions.includes(p.id));
  };

  const isCategoryPartiallySelected = (category: PermissionCategory) => {
    const selected = category.permissions.filter(p => selectedPermissions.includes(p.id));
    return selected.length > 0 && selected.length < category.permissions.length;
  };

  const isPermissionFromRole = (permissionId: string) => {
    return rolePermissions.includes(permissionId);
  };

  return (
    <div className="space-y-4">
      {rolePermissions.length > 0 && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
          <Info className="size-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
          <div className="text-sm text-blue-900 dark:text-blue-100">
            <p className="font-medium">Role-based permissions are shown with a badge.</p>
            <p className="text-blue-700 dark:text-blue-300 mt-1">
              Custom permissions will override the role defaults. Uncheck a permission to deny access even if the role has it.
            </p>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {PERMISSIONS.map((category) => {
          const isExpanded = expandedCategories.has(category.id);
          const fullySelected = isCategoryFullySelected(category);
          const partiallySelected = isCategoryPartiallySelected(category);

          return (
            <Card key={category.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <Checkbox
                      id={`category-${category.id}`}
                      checked={fullySelected}
                      onCheckedChange={() => toggleAllInCategory(category)}
                      disabled={disabled}
                      className={partiallySelected ? 'data-[state=checked]:bg-primary/50' : ''}
                    />
                    <div
                      className="flex-1 cursor-pointer"
                      onClick={() => toggleCategory(category.id)}
                    >
                      <CardTitle className="text-base font-semibold">
                        {category.name}
                      </CardTitle>
                      <CardDescription className="text-xs mt-0.5">
                        {category.permissions.length} permissions
                        {partiallySelected && ` • ${category.permissions.filter(p => selectedPermissions.includes(p.id)).length} selected`}
                      </CardDescription>
                    </div>
                    <Badge variant={isExpanded ? 'default' : 'outline'} className="text-xs">
                      {isExpanded ? 'Collapse' : 'Expand'}
                    </Badge>
                  </div>
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent className="pt-0">
                  <div className="grid gap-3 pl-8">
                    {category.permissions.map((permission) => {
                      const isChecked = selectedPermissions.includes(permission.id);
                      const fromRole = isPermissionFromRole(permission.id);

                      return (
                        <div
                          key={permission.id}
                          className="flex items-start gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors"
                        >
                          <Checkbox
                            id={permission.id}
                            checked={isChecked}
                            onCheckedChange={() => togglePermission(permission.id)}
                            disabled={disabled}
                            className="mt-0.5"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <Label
                                htmlFor={permission.id}
                                className="font-medium text-sm cursor-pointer"
                              >
                                {permission.name}
                              </Label>
                              {fromRole && (
                                <Badge variant="secondary" className="text-xs">
                                  From Role
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {permission.description}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
        <span className="text-sm font-medium">Total Permissions Selected</span>
        <Badge variant="default" className="text-sm">
          {selectedPermissions.length} / {PERMISSIONS.flatMap(c => c.permissions).length}
        </Badge>
      </div>
    </div>
  );
}
