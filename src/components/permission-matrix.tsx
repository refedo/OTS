'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Loader2, Save, CheckSquare, Square } from 'lucide-react';
import { PERMISSIONS } from '@/lib/permissions';

type Role = {
  id: string;
  name: string;
  permissions: any;
};

type PermissionMatrixProps = {
  role: Role;
};

export function PermissionMatrix({ role }: PermissionMatrixProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Initialize selected permissions from role
  const initialPermissions = Array.isArray(role.permissions) ? role.permissions : [];
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(initialPermissions);

  const togglePermission = (permissionId: string) => {
    setSelectedPermissions(prev =>
      prev.includes(permissionId)
        ? prev.filter(p => p !== permissionId)
        : [...prev, permissionId]
    );
  };

  const toggleCategory = (categoryId: string) => {
    const category = PERMISSIONS.find(cat => cat.id === categoryId);
    if (!category) return;

    const categoryPermissionIds = category.permissions.map(p => p.id);
    const allSelected = categoryPermissionIds.every(id => selectedPermissions.includes(id));

    if (allSelected) {
      // Deselect all in category
      setSelectedPermissions(prev => prev.filter(p => !categoryPermissionIds.includes(p)));
    } else {
      // Select all in category
      setSelectedPermissions(prev => {
        const newPerms = [...prev];
        categoryPermissionIds.forEach(id => {
          if (!newPerms.includes(id)) {
            newPerms.push(id);
          }
        });
        return newPerms;
      });
    }
  };

  const selectAll = () => {
    const allPermissionIds = PERMISSIONS.flatMap(cat => cat.permissions.map(p => p.id));
    setSelectedPermissions(allPermissionIds);
  };

  const deselectAll = () => {
    setSelectedPermissions([]);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/roles/${role.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ permissions: selectedPermissions }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update permissions');
      }

      router.push('/roles');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const isCategoryFullySelected = (categoryId: string): boolean => {
    const category = PERMISSIONS.find(cat => cat.id === categoryId);
    if (!category) return false;
    return category.permissions.every(p => selectedPermissions.includes(p.id));
  };

  const isCategoryPartiallySelected = (categoryId: string): boolean => {
    const category = PERMISSIONS.find(cat => cat.id === categoryId);
    if (!category) return false;
    const selected = category.permissions.filter(p => selectedPermissions.includes(p.id));
    return selected.length > 0 && selected.length < category.permissions.length;
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          {error}
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex items-center gap-3 pb-4 border-b">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={selectAll}
          disabled={loading}
        >
          <CheckSquare className="size-4" />
          Select All
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={deselectAll}
          disabled={loading}
        >
          <Square className="size-4" />
          Deselect All
        </Button>
        <div className="ml-auto text-sm text-muted-foreground">
          {selectedPermissions.length} permission{selectedPermissions.length !== 1 ? 's' : ''} selected
        </div>
      </div>

      {/* Permission Categories */}
      <div className="space-y-6">
        {PERMISSIONS.map((category) => {
          const isFullySelected = isCategoryFullySelected(category.id);
          const isPartiallySelected = isCategoryPartiallySelected(category.id);

          return (
            <div key={category.id} className="space-y-4">
              {/* Category Header */}
              <div className="flex items-center gap-3 pb-2 border-b">
                <Checkbox
                  id={`category-${category.id}`}
                  checked={isFullySelected}
                  onCheckedChange={() => toggleCategory(category.id)}
                  disabled={loading}
                  className={isPartiallySelected && !isFullySelected ? 'data-[state=unchecked]:bg-primary/20' : ''}
                />
                <Label
                  htmlFor={`category-${category.id}`}
                  className="text-base font-semibold cursor-pointer"
                >
                  {category.name}
                </Label>
                <span className="text-xs text-muted-foreground">
                  ({category.permissions.filter(p => selectedPermissions.includes(p.id)).length}/{category.permissions.length})
                </span>
              </div>

              {/* Permissions in Category */}
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 pl-8">
                {category.permissions.map((permission) => (
                  <div key={permission.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
                    <Checkbox
                      id={permission.id}
                      checked={selectedPermissions.includes(permission.id)}
                      onCheckedChange={() => togglePermission(permission.id)}
                      disabled={loading}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <Label
                        htmlFor={permission.id}
                        className="text-sm font-medium cursor-pointer leading-tight"
                      >
                        {permission.name}
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        {permission.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-6 border-t">
        <Button onClick={handleSubmit} disabled={loading}>
          {loading && <Loader2 className="size-4 animate-spin" />}
          <Save className="size-4" />
          Save Permissions
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={loading}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
