'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Calendar,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Clock,
  Target,
  Building2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface BuildingProgress {
  id: string;
  name: string;
  designation: string;
  progress: number;
  expectedProgress: number;
  status: 'not-started' | 'on-track' | 'at-risk' | 'critical' | 'completed';
  startDate: string;
  endDate: string;
  daysRemaining: number;
  daysOverdue: number;
}

interface ActivitySummary {
  scopeType: string;
  scopeLabel: string;
  buildingCount: number;
  avgProgress: number;
  avgExpectedProgress: number;
  status: 'not-started' | 'on-track' | 'at-risk' | 'critical' | 'completed';
  buildings: BuildingProgress[];
}

interface ScheduleStats {
  totalActivities: number;
  completed: number;
  onTrack: number;
  atRisk: number;
  critical: number;
  notStarted: number;
  overallProgress: number;
}

interface PlanningActivitiesData {
  summary: ActivitySummary[];
  stats: ScheduleStats;
}

interface PlanningActivitiesWidgetProps {
  data: PlanningActivitiesData | null;
  onRefresh: () => void;
}

const statusConfig = {
  'completed': { color: 'bg-green-500', textColor: 'text-green-700', bgColor: 'bg-green-50', label: 'Completed', icon: CheckCircle },
  'on-track': { color: 'bg-blue-500', textColor: 'text-blue-700', bgColor: 'bg-blue-50', label: 'On Track', icon: Target },
  'at-risk': { color: 'bg-yellow-500', textColor: 'text-yellow-700', bgColor: 'bg-yellow-50', label: 'At Risk', icon: AlertTriangle },
  'critical': { color: 'bg-red-500', textColor: 'text-red-700', bgColor: 'bg-red-50', label: 'Critical', icon: AlertTriangle },
  'not-started': { color: 'bg-gray-400', textColor: 'text-gray-600', bgColor: 'bg-gray-50', label: 'Not Started', icon: Clock },
};

const scopeIcons: Record<string, string> = {
  design: '📐',
  shopDrawing: '📝',
  fabrication: '🔧',
  galvanization: '🔩',
  painting: '🎨',
  erection: '🏗️',
};

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function ActivityRow({ activity }: { activity: ActivitySummary }) {
  const [isOpen, setIsOpen] = useState(false);
  const config = statusConfig[activity.status];
  const StatusIcon = config.icon;
  const icon = scopeIcons[activity.scopeType] || '📋';

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <div className={cn(
          "flex items-center gap-4 p-3 rounded-lg cursor-pointer transition-colors hover:bg-muted/50",
          config.bgColor
        )}>
          <Button variant="ghost" size="icon" className="h-6 w-6 p-0">
            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
          
          <span className="text-xl">{icon}</span>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium">{activity.scopeLabel}</span>
              <Badge variant="outline" className="text-xs">
                {activity.buildingCount} building{activity.buildingCount !== 1 ? 's' : ''}
              </Badge>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Progress value={activity.avgProgress} className="h-2 flex-1" />
              <span className="text-sm font-medium w-12 text-right">{activity.avgProgress}%</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <StatusIcon className={cn("h-4 w-4", config.textColor)} />
            <Badge className={cn(config.color, "text-white")}>
              {config.label}
            </Badge>
          </div>
        </div>
      </CollapsibleTrigger>
      
      <CollapsibleContent>
        <div className="ml-12 mt-2 space-y-2 pb-2">
          {activity.buildings.map((building) => {
            const buildingConfig = statusConfig[building.status];
            const BuildingStatusIcon = buildingConfig.icon;
            
            return (
              <div 
                key={building.id} 
                className="flex items-center gap-3 p-2 rounded-md bg-background border text-sm"
              >
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{building.designation}</span>
                    <span className="text-muted-foreground">— {building.name}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Progress value={building.progress} className="h-1.5 flex-1" />
                    <span className="text-xs w-10 text-right">{building.progress}%</span>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(building.startDate)} - {formatDate(building.endDate)}
                    </span>
                    {building.daysOverdue > 0 ? (
                      <span className="text-red-600 font-medium">
                        {building.daysOverdue} days overdue
                      </span>
                    ) : building.daysRemaining > 0 ? (
                      <span>{building.daysRemaining} days remaining</span>
                    ) : null}
                  </div>
                </div>
                <BuildingStatusIcon className={cn("h-4 w-4", buildingConfig.textColor)} />
              </div>
            );
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function PlanningActivitiesWidget({ data, onRefresh }: PlanningActivitiesWidgetProps) {
  if (!data || !data.summary || data.summary.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Calendar className="h-5 w-5 text-indigo-600" />
            Planning Activities
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No planning activities found for this project.
            <br />
            <span className="text-xs">Add scope schedules to buildings to see progress here.</span>
          </p>
        </CardContent>
      </Card>
    );
  }

  const { summary, stats } = data;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Calendar className="h-5 w-5 text-indigo-600" />
          Planning Activities
        </CardTitle>
        <Button variant="ghost" size="icon" onClick={onRefresh}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Progress */}
        <div className="p-4 rounded-lg bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-indigo-900">Overall Project Progress</span>
            <span className="text-2xl font-bold text-indigo-700">{stats.overallProgress}%</span>
          </div>
          <Progress value={stats.overallProgress} className="h-3" />
          <div className="flex items-center justify-between mt-3 text-xs">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                {stats.completed} Completed
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                {stats.onTrack} On Track
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                {stats.atRisk} At Risk
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                {stats.critical} Critical
              </span>
            </div>
            <span className="text-muted-foreground">{stats.totalActivities} total activities</span>
          </div>
        </div>

        {/* Activities List */}
        <div className="space-y-2">
          {summary.map((activity) => (
            <ActivityRow key={activity.scopeType} activity={activity} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
