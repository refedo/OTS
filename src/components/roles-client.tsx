'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, MoreVertical, Shield, Users, Edit, Trash2, Key, Copy } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Role = {
  id: string;
  name: string;
  description: string | null;
  permissions: any;
  createdAt: Date;
  _count: {
    users: number;
  };
};

type RolesClientProps = {
  roles: Role[];
};

export function RolesClient({ roles }: RolesClientProps) {
  const router = useRouter();

  const handleAction = async (action: string, roleId: string, roleName?: string) => {
    switch (action) {
      case 'edit':
        router.push(`/roles/${roleId}/edit`);
        break;
      case 'permissions':
        router.push(`/roles/${roleId}/permissions`);
        break;
      case 'duplicate':
        if (confirm(`Create a duplicate of "${roleName}"?`)) {
          try {
            const response = await fetch(`/api/roles/${roleId}/duplicate`, {
              method: 'POST',
            });

            if (!response.ok) {
              throw new Error('Failed to duplicate role');
            }

            const newRole = await response.json();
            router.refresh();
            router.push(`/roles/${newRole.id}/edit`);
          } catch (error) {
            alert('Failed to duplicate role. Please try again.');
            console.error('Duplicate error:', error);
          }
        }
        break;
      case 'delete':
        if (confirm('Are you sure you want to delete this role? Users with this role will need to be reassigned.')) {
          try {
            const response = await fetch(`/api/roles/${roleId}`, {
              method: 'DELETE',
            });

            if (!response.ok) {
              throw new Error('Failed to delete role');
            }

            router.refresh();
          } catch (error) {
            alert('Failed to delete role. Please try again.');
            console.error('Delete error:', error);
          }
        }
        break;
    }
  };

  const getPermissionCount = (permissions: any): number => {
    if (!permissions) return 0;
    if (Array.isArray(permissions)) return permissions.length;
    return 0;
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto p-6 lg:p-8 space-y-8 max-lg:pt-20">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Roles & Permissions</h1>
            <p className="text-muted-foreground mt-1">
              Manage roles and their permissions
            </p>
          </div>
          <Link href="/roles/create">
            <Button>
              <Plus className="size-4" />
              Add Role
            </Button>
          </Link>
        </div>

        {/* Roles Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {roles.map((role) => (
            <Card key={role.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Shield className="size-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{role.name}</CardTitle>
                      <CardDescription className="text-xs mt-1">
                        {role.description || 'No description'}
                      </CardDescription>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm">
                        <MoreVertical className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleAction('edit', role.id)}>
                        <Edit className="size-4 mr-2" />
                        Edit Role
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleAction('permissions', role.id)}>
                        <Key className="size-4 mr-2" />
                        Manage Permissions
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleAction('duplicate', role.id, role.name)}>
                        <Copy className="size-4 mr-2" />
                        Duplicate Role
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleAction('delete', role.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="size-4 mr-2" />
                        Delete Role
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="size-4" />
                      <span>Users</span>
                    </div>
                    <span className="font-medium">{role._count.users}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Key className="size-4" />
                      <span>Permissions</span>
                    </div>
                    <span className="font-medium">{getPermissionCount(role.permissions)}</span>
                  </div>
                  <div className="pt-3 border-t">
                    <Link href={`/roles/${role.id}/permissions`}>
                      <Button variant="outline" size="sm" className="w-full">
                        <Key className="size-4" />
                        Manage Permissions
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {roles.length === 0 && (
            <Card className="col-span-full">
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <p className="text-muted-foreground mb-4">No roles found</p>
                  <Link href="/roles/create">
                    <Button>
                      <Plus className="size-4" />
                      Create First Role
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </main>
  );
}
