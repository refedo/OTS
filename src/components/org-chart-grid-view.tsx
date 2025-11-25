'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Mail, Building2, Briefcase, Users } from 'lucide-react';
import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';

type HierarchyNode = {
  id: string;
  name: string;
  email: string;
  position: string | null;
  role: { name: string };
  department: { name: string } | null;
  reportsToId: string | null;
  subordinates?: HierarchyNode[];
  _count?: { subordinates: number };
};

type GridViewProps = {
  hierarchy: HierarchyNode[];
};

// Flatten the hierarchy for grid display
function flattenHierarchy(nodes: HierarchyNode[]): HierarchyNode[] {
  const result: HierarchyNode[] = [];
  
  function traverse(node: HierarchyNode) {
    result.push(node);
    if (node.subordinates) {
      node.subordinates.forEach(traverse);
    }
  }
  
  nodes.forEach(traverse);
  return result;
}

export function OrgChartGridView({ hierarchy }: GridViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  
  const allUsers = useMemo(() => flattenHierarchy(hierarchy), [hierarchy]);
  
  const filteredUsers = useMemo(() => {
    if (!searchQuery) return allUsers;
    
    const query = searchQuery.toLowerCase();
    return allUsers.filter(user =>
      user.name.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query) ||
      user.role.name.toLowerCase().includes(query) ||
      user.position?.toLowerCase().includes(query) ||
      user.department?.name.toLowerCase().includes(query)
    );
  }, [allUsers, searchQuery]);

  if (allUsers.length === 0) {
    return (
      <div className="text-center py-12 border rounded-lg">
        <p className="text-muted-foreground">
          No organization structure found. Start by creating users and assigning reporting relationships.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="max-w-md">
        <Input
          placeholder="Search by name, email, role, position, or department..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full"
        />
      </div>

      {/* Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredUsers.map((user) => (
          <Card key={user.id} className="hover:shadow-lg transition-all">
            <CardHeader className="pb-3">
              <div className="flex items-start gap-3">
                {/* Avatar */}
                <div className="size-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0 border-2 border-primary/20">
                  <User className="size-6 text-primary" />
                </div>

                {/* Name & Role */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-base truncate">{user.name}</h3>
                  <Badge variant="secondary" className="text-xs mt-1">
                    {user.role.name}
                  </Badge>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-2 text-sm">
              {/* Position */}
              {user.position && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Briefcase className="size-3 shrink-0" />
                  <span className="truncate font-medium text-foreground">{user.position}</span>
                </div>
              )}

              {/* Email */}
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="size-3 shrink-0" />
                <span className="truncate">{user.email}</span>
              </div>

              {/* Department */}
              {user.department && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Building2 className="size-3 shrink-0" />
                  <span className="truncate">{user.department.name}</span>
                </div>
              )}

              {/* Subordinates Count */}
              {user.subordinates && user.subordinates.length > 0 && (
                <div className="flex items-center gap-2 text-muted-foreground pt-2 border-t">
                  <Users className="size-3 shrink-0" />
                  <span className="text-xs">
                    {user.subordinates.length} direct report{user.subordinates.length !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* No Results */}
      {filteredUsers.length === 0 && (
        <div className="text-center py-12 border rounded-lg">
          <p className="text-muted-foreground">
            No users found matching "{searchQuery}"
          </p>
        </div>
      )}

      {/* Count */}
      <div className="text-sm text-muted-foreground text-center">
        Showing {filteredUsers.length} of {allUsers.length} user{allUsers.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}
