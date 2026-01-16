'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from 'lucide-react';

type ScopeSchedule = {
  id: string;
  scopeType: string;
  scopeLabel: string;
  startDate: string;
  endDate: string;
  building: {
    id: string;
    name: string;
    designation: string;
  };
};

type ScopeSchedulesViewProps = {
  schedules: ScopeSchedule[];
};

export function ScopeSchedulesView({ schedules }: ScopeSchedulesViewProps) {
  // Group schedules by building
  const schedulesByBuilding = schedules.reduce((acc, schedule) => {
    const buildingId = schedule.building.id;
    if (!acc[buildingId]) {
      acc[buildingId] = {
        building: schedule.building,
        schedules: [],
      };
    }
    acc[buildingId].schedules.push(schedule);
    return acc;
  }, {} as Record<string, { building: ScopeSchedule['building']; schedules: ScopeSchedule[] }>);

  const calculateDuration = (startDate: string, endDate: string): number => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="size-5" />
          Scope Schedules
        </CardTitle>
        <CardDescription>
          Timeline for each scope of work by building
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {Object.values(schedulesByBuilding).map(({ building, schedules }) => (
          <div key={building.id} className="space-y-3">
            <h3 className="font-semibold text-lg">
              {building.name} ({building.designation})
            </h3>
            <div className="grid gap-3">
              {schedules.map((schedule) => {
                const duration = calculateDuration(schedule.startDate, schedule.endDate);
                return (
                  <div
                    key={schedule.id}
                    className="border rounded-lg p-4 bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium">{schedule.scopeLabel}</h4>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <span>
                            <span className="font-medium">Start:</span> {formatDate(schedule.startDate)}
                          </span>
                          <span>→</span>
                          <span>
                            <span className="font-medium">End:</span> {formatDate(schedule.endDate)}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary">{duration}</div>
                        <div className="text-xs text-muted-foreground">days</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
