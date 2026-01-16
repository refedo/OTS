'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Mail, Building2, ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

type HierarchyNode = {
  id: string;
  name: string;
  email: string;
  role: { name: string };
  department: { name: string } | null;
  reportsToId: string | null;
  subordinates?: HierarchyNode[];
  _count?: { subordinates: number };
};

type OrganizationChartProps = {
  hierarchy: HierarchyNode[];
};

function TreeNode({ node, level = 0 }: { node: HierarchyNode; level?: number }) {
  const [isExpanded, setIsExpanded] = useState(level < 2); // Auto-expand first 2 levels
  const hasSubordinates = node.subordinates && node.subordinates.length > 0;

  return (
    <div className="relative">
      {/* Node Card */}
      <Card className="hover:shadow-lg transition-all duration-200 border-2">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* Avatar */}
            <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <User className="size-6 text-primary" />
            </div>

            {/* User Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-base">{node.name}</h3>
                <Badge variant="secondary" className="text-xs">
                  {node.role.name}
                </Badge>
              </div>

              <div className="space-y-1 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Mail className="size-3" />
                  <span className="truncate">{node.email}</span>
                </div>
                {node.department && (
                  <div className="flex items-center gap-2">
                    <Building2 className="size-3" />
                    <span>{node.department.name}</span>
                  </div>
                )}
              </div>

              {hasSubordinates && (
                <div className="mt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="h-7 text-xs"
                  >
                    {isExpanded ? (
                      <>
                        <ChevronDown className="size-3 mr-1" />
                        Hide {node.subordinates!.length} subordinate{node.subordinates!.length !== 1 ? 's' : ''}
                      </>
                    ) : (
                      <>
                        <ChevronRight className="size-3 mr-1" />
                        Show {node.subordinates!.length} subordinate{node.subordinates!.length !== 1 ? 's' : ''}
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subordinates */}
      {hasSubordinates && isExpanded && (
        <div className="ml-8 mt-4 space-y-4 border-l-2 border-muted pl-4">
          {node.subordinates!.map((subordinate) => (
            <TreeNode key={subordinate.id} node={subordinate} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function OrganizationChart({ hierarchy }: OrganizationChartProps) {
  if (hierarchy.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              No organization structure found. Start by creating users and assigning reporting relationships.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {hierarchy.map((node) => (
        <TreeNode key={node.id} node={node} />
      ))}
    </div>
  );
}
