'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

type Role = {
  id: string;
  name: string;
  description: string | null;
};

type Department = {
  id: string;
  name: string;
  description: string | null;
};

type Manager = {
  id: string;
  name: string;
  role: { name: string };
};

type User = {
  id: string;
  name: string;
  email: string;
  position: string | null;
  status: string;
  roleId: string;
  departmentId: string | null;
  reportsToId: string | null;
};

type UserEditFormProps = {
  user: User;
  roles: Role[];
  departments: Department[];
  managers: Manager[];
};

export function UserEditForm({ user, roles, departments, managers }: UserEditFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      position: formData.get('position') as string || null,
      password: formData.get('password') as string || undefined,
      roleId: formData.get('roleId') as string,
      departmentId: formData.get('departmentId') as string || null,
      reportsToId: formData.get('reportsToId') as string || null,
      status: formData.get('status') as string,
    };

    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update user');
      }

      router.push('/users');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          {error}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor="name">
            Full Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="name"
            name="name"
            type="text"
            placeholder="John Doe"
            defaultValue={user.name}
            required
            disabled={loading}
          />
        </div>

        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="email">
            Email Address <span className="text-destructive">*</span>
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="john.doe@hexasteel.com"
            defaultValue={user.email}
            required
            disabled={loading}
          />
        </div>

        {/* Password */}
        <div className="space-y-2">
          <Label htmlFor="password">
            New Password
          </Label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="Leave blank to keep current"
            minLength={8}
            disabled={loading}
          />
          <p className="text-xs text-muted-foreground">
            Only fill this if you want to change the password
          </p>
        </div>

        {/* Position/Title */}
        <div className="space-y-2">
          <Label htmlFor="position">Position / Job Title</Label>
          <Input
            id="position"
            name="position"
            type="text"
            placeholder="e.g., Senior Engineer, Project Manager"
            defaultValue={user.position || ''}
            disabled={loading}
          />
          <p className="text-xs text-muted-foreground">
            Optional job title or position
          </p>
        </div>

        {/* Role */}
        <div className="space-y-2">
          <Label htmlFor="roleId">
            Role <span className="text-destructive">*</span>
          </Label>
          <select
            id="roleId"
            name="roleId"
            required
            disabled={loading}
            defaultValue={user.roleId}
            className="w-full h-9 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
          >
            <option value="">Select a role</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            Defines user permissions
          </p>
        </div>

        {/* Department */}
        <div className="space-y-2">
          <Label htmlFor="departmentId">Department</Label>
          <select
            id="departmentId"
            name="departmentId"
            disabled={loading}
            defaultValue={user.departmentId || ''}
            className="w-full h-9 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
          >
            <option value="">No Department</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </select>
        </div>

        {/* Reports To */}
        <div className="space-y-2">
          <Label htmlFor="reportsToId">Reports To</Label>
          <select
            id="reportsToId"
            name="reportsToId"
            disabled={loading}
            defaultValue={user.reportsToId || ''}
            className="w-full h-9 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
          >
            <option value="">No Manager</option>
            {managers.filter(m => m.id !== user.id).map((manager) => (
              <option key={manager.id} value={manager.id}>
                {manager.name} ({manager.role.name})
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            Select the manager this user reports to
          </p>
        </div>

        {/* Status */}
        <div className="space-y-2">
          <Label htmlFor="status">
            Status <span className="text-destructive">*</span>
          </Label>
          <select
            id="status"
            name="status"
            required
            disabled={loading}
            defaultValue={user.status}
            className="w-full h-9 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-4 border-t">
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="size-4 animate-spin" />}
          Update User
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
    </form>
  );
}
