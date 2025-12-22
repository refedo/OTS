'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Network, List, LayoutGrid, GitBranch, Workflow } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OrganizationChart } from '@/components/organization-chart';
import { OrgChartTreeView } from '@/components/org-chart-tree-view';
import { OrgChartListView } from '@/components/org-chart-list-view';
import { OrgChartGridView } from '@/components/org-chart-grid-view';
import { OrgChartFlowchartView } from '@/components/org-chart-flowchart-view';

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

type ViewType = 'hierarchy' | 'tree' | 'list' | 'grid' | 'flowchart';

type OrganizationChartViewsProps = {
  hierarchy: HierarchyNode[];
};

const views = [
  { id: 'flowchart' as ViewType, name: 'Flowchart', icon: Workflow, description: 'Professional org chart with boxes' },
  { id: 'hierarchy' as ViewType, name: 'Hierarchy', icon: Network, description: 'Expandable cards with connections' },
  { id: 'tree' as ViewType, name: 'Tree', icon: GitBranch, description: 'Visual tree structure' },
  { id: 'list' as ViewType, name: 'List', icon: List, description: 'Compact hierarchical list' },
  { id: 'grid' as ViewType, name: 'Grid', icon: LayoutGrid, description: 'Card grid with search' },
];

export function OrganizationChartViews({ hierarchy }: OrganizationChartViewsProps) {
  const [currentView, setCurrentView] = useState<ViewType>('flowchart');

  return (
    <div className="space-y-6">
      {/* View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b">
        <div className="flex items-center gap-2 overflow-x-auto">
          {views.map((view) => {
            const Icon = view.icon;
            return (
              <Button
                key={view.id}
                variant={currentView === view.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCurrentView(view.id)}
                className={cn(
                  "flex items-center gap-2 whitespace-nowrap",
                  currentView === view.id && "shadow-md"
                )}
              >
                <Icon className="size-4" />
                {view.name}
              </Button>
            );
          })}
        </div>

        {/* Current View Description */}
        <div className="text-sm text-muted-foreground hidden md:block">
          {views.find(v => v.id === currentView)?.description}
        </div>
      </div>

      {/* View Content */}
      <div className="min-h-[400px]">
        {currentView === 'flowchart' && <OrgChartFlowchartView hierarchy={hierarchy} />}
        {currentView === 'hierarchy' && <OrganizationChart hierarchy={hierarchy} />}
        {currentView === 'tree' && <OrgChartTreeView hierarchy={hierarchy} />}
        {currentView === 'list' && <OrgChartListView hierarchy={hierarchy} />}
        {currentView === 'grid' && <OrgChartGridView hierarchy={hierarchy} />}
      </div>
    </div>
  );
}
