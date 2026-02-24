'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Plus, User, Shield, Phone, ShieldCheck } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PermissionsMatrix } from '@/components/permissions-matrix';
import { DEFAULT_ROLE_PERMISSIONS } from '@/lib/permissions';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

type Role = {
  id: string;
  name: string;
  description: string | null;
  permissions?: any;
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

type UserCreateFormProps = {
  roles: Role[];
  departments: Department[];
  managers: Manager[];
};

export function UserCreateForm({ roles, departments: initialDepartments, managers }: UserCreateFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [departments, setDepartments] = useState(initialDepartments);
  const [showDeptDialog, setShowDeptDialog] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [addingDept, setAddingDept] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [customPermissions, setCustomPermissions] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('basic');

  async function handleAddDepartment() {
    if (!newDeptName.trim()) return;
    
    setAddingDept(true);
    try {
      const response = await fetch('/api/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newDeptName.trim() }),
      });

      if (!response.ok) throw new Error('Failed to create department');

      const newDept = await response.json();
      setDepartments([...departments, newDept]);
      setNewDeptName('');
      setShowDeptDialog(false);
    } catch (err) {
      alert('Failed to create department');
    } finally {
      setAddingDept(false);
    }
  }

  const selectedRole = roles.find(r => r.id === selectedRoleId);
  const rolePermissions = selectedRole ? (DEFAULT_ROLE_PERMISSIONS[selectedRole.name] || []) : [];

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      position: formData.get('position') as string || null,
      roleId: formData.get('roleId') as string,
      departmentId: formData.get('departmentId') as string || null,
      reportsToId: formData.get('reportsToId') as string || null,
      status: formData.get('status') as string,
      isAdmin: formData.get('isAdmin') === 'on',
      mobileNumber: formData.get('mobileNumber') as string || null,
      customPermissions: customPermissions.length > 0 ? customPermissions : null,
    };

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create user');
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
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="basic">
            <User className="size-4" />
            Basic Information
          </TabsTrigger>
          <TabsTrigger value="permissions">
            <Shield className="size-4" />
            Custom Permissions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-6 mt-6">
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
            required
            disabled={loading}
          />
        </div>

        {/* Password */}
        <div className="space-y-2">
          <Label htmlFor="password">
            Password <span className="text-destructive">*</span>
          </Label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="••••••••"
            required
            minLength={8}
            disabled={loading}
          />
          <p className="text-xs text-muted-foreground">
            Minimum 8 characters
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
            value={selectedRoleId}
            onChange={(e) => setSelectedRoleId(e.target.value)}
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
          <div className="flex items-center justify-between">
            <Label htmlFor="departmentId">Department</Label>
            <Dialog open={showDeptDialog} onOpenChange={setShowDeptDialog}>
              <DialogTrigger asChild>
                <Button type="button" variant="ghost" size="sm" className="h-auto p-1 text-xs">
                  <Plus className="size-3 mr-1" />
                  Add New
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Department</DialogTitle>
                  <DialogDescription>
                    Create a new department to assign to users
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="newDeptName">Department Name</Label>
                    <Input
                      id="newDeptName"
                      value={newDeptName}
                      onChange={(e) => setNewDeptName(e.target.value)}
                      placeholder="e.g., Engineering"
                      disabled={addingDept}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleAddDepartment} disabled={addingDept || !newDeptName.trim()}>
                      {addingDept && <Loader2 className="size-4 animate-spin" />}
                      Create
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setShowDeptDialog(false)} disabled={addingDept}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <select
            id="departmentId"
            name="departmentId"
            disabled={loading}
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
            className="w-full h-9 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
          >
            <option value="">No Manager</option>
            {managers.map((manager) => (
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
            defaultValue="active"
            className="w-full h-9 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {/* Mobile Number */}
        <div className="space-y-2">
          <Label htmlFor="mobileNumber" className="flex items-center gap-1">
            <Phone className="size-3" />
            Mobile Number
          </Label>
          <Input
            id="mobileNumber"
            name="mobileNumber"
            type="tel"
            placeholder="+966512345678"
            disabled={loading}
            pattern="\+[0-9]{7,15}"
            title="International format: +CountryCode followed by number (e.g. +966512345678)"
          />
          <p className="text-xs text-muted-foreground">
            International format for WhatsApp notifications (e.g. +966512345678)
          </p>
        </div>

        {/* Is Administrator */}
        <div className="space-y-2">
          <Label className="flex items-center gap-1">
            <ShieldCheck className="size-3" />
            Administrator Privileges
          </Label>
          <div className="flex items-center gap-3 p-3 rounded-md border bg-muted/30">
            <input
              type="checkbox"
              id="isAdmin"
              name="isAdmin"
              disabled={loading}
              className="rounded border-slate-300 h-4 w-4"
            />
            <div>
              <label htmlFor="isAdmin" className="text-sm font-medium cursor-pointer">
                Grant administrator access
              </label>
              <p className="text-xs text-muted-foreground">
                Grants full system access regardless of role. User keeps their role title but gets all permissions.
              </p>
            </div>
          </div>
        </div>
      </div>
        </TabsContent>

        <TabsContent value="permissions" className="space-y-6 mt-6">
          {!selectedRoleId ? (
            <div className="p-6 rounded-lg border border-dashed text-center">
              <Shield className="size-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">
                Please select a role in the Basic Information tab first.
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                The role will determine the default permissions, which you can then customize here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/50 border">
                <h3 className="font-semibold text-sm mb-1">Custom Permissions Override</h3>
                <p className="text-sm text-muted-foreground">
                  By default, this user will inherit permissions from the <strong>{selectedRole?.name}</strong> role.
                  Use the matrix below to customize permissions for this specific user.
                </p>
              </div>
              <PermissionsMatrix
                selectedPermissions={customPermissions}
                onChange={setCustomPermissions}
                rolePermissions={rolePermissions}
                disabled={loading}
              />
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-4 border-t mt-6">
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="size-4 animate-spin" />}
          Create User
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
