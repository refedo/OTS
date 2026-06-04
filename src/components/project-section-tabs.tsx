'use client';

import { useState } from 'react';
import { Building2, Calendar, History, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BuildingScopesView } from '@/components/building-scopes-view';
import { BuildingsList } from '@/components/buildings-list';
import { ScopeSchedulesView } from '@/components/scope-schedules-view';
import { EntityTimeline } from '@/components/events/EntityTimeline';
import { cn } from '@/lib/utils';
import Link from 'next/link';

type Building = {
  id: string;
  designation: string;
  name: string;
  description: string | null;
  location: string | null;
  weight: number | null;
};

type ScopeOfWork = {
  id: string;
  buildingId: string;
  scopeType: string;
  scopeLabel: string;
  customLabel?: string;
  specification?: string;
  activities: Array<{
    id: string;
    activityType: string;
    activityLabel: string;
    isApplicable: boolean;
  }>;
};

type ScopeSchedule = {
  id: string;
  [key: string]: unknown;
};

type ProjectSectionTabsProps = {
  projectId: string;
  buildings: Building[];
  scopeOfWorks: ScopeOfWork[];
  scopeSchedules: ScopeSchedule[];
  canEdit: boolean;
};

const TABS = [
  { id: 'buildings', label: 'Buildings & Scope', icon: Building2 },
  { id: 'schedule', label: 'Schedule', icon: Calendar },
  { id: 'events', label: 'Events', icon: History },
] as const;

type TabId = (typeof TABS)[number]['id'];

export function ProjectSectionTabs({
  projectId,
  buildings,
  scopeOfWorks,
  scopeSchedules,
  canEdit,
}: ProjectSectionTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>('buildings');

  return (
    <div className="mt-6">
      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b mb-0 px-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px',
              activeTab === id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/40'
            )}
          >
            <Icon className="size-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="pt-4 space-y-4">
        {activeTab === 'buildings' && (
          <>
            <BuildingScopesView
              buildings={buildings}
              scopeOfWorks={scopeOfWorks}
              buildingActivities={[]}
              projectId={projectId}
              canEdit={canEdit}
            />
            <BuildingsList
              projectId={projectId}
              buildings={buildings}
              canEdit={canEdit}
            />
            {canEdit && buildings.length === 0 && (
              <div className="text-center py-6">
                <Link href={`/projects/wizard?resume=${projectId}`}>
                  <Button variant="outline">
                    <Plus className="size-4 mr-2" />
                    Add Buildings via Setup Wizard
                  </Button>
                </Link>
              </div>
            )}
          </>
        )}

        {activeTab === 'schedule' && (
          <>
            {scopeSchedules.length > 0 ? (
              <ScopeSchedulesView schedules={scopeSchedules} />
            ) : (
              <div className="text-center py-12 text-muted-foreground border rounded-lg">
                <Calendar className="size-10 mx-auto mb-2 opacity-20" />
                <p className="text-sm">No scope schedules configured yet.</p>
                <p className="text-xs mt-1">Scope schedules are set up via the project timeline.</p>
                <Link href={`/projects/${projectId}/timeline`}>
                  <Button variant="outline" size="sm" className="mt-4">
                    Open Timeline
                  </Button>
                </Link>
              </div>
            )}
          </>
        )}

        {activeTab === 'events' && (
          <EntityTimeline
            entityType="Project"
            entityId={projectId}
          />
        )}
      </div>
    </div>
  );
}
