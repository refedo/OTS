'use client';

import { useState, useEffect } from 'react';
import ProjectSummaryWidget from './widgets/ProjectSummaryWidget';
import TaskSummaryWidget from './widgets/TaskSummaryWidget';
import KPISummaryWidget from './widgets/KPISummaryWidget';
import ObjectivesSummaryWidget from './widgets/ObjectivesSummaryWidget';
import WeeklyProductionWidget from './widgets/WeeklyProductionWidget';
import { Button } from '@/components/ui/button';
import { Plus, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface Widget {
  id: string;
  widgetType: string;
  widgetSize: string;
  position: number;
  isVisible: boolean;
}

const WIDGET_COMPONENTS: { [key: string]: React.ComponentType } = {
  PROJECT_SUMMARY: ProjectSummaryWidget,
  TASK_SUMMARY: TaskSummaryWidget,
  KPI_SUMMARY: KPISummaryWidget,
  OBJECTIVE_SUMMARY: ObjectivesSummaryWidget,
  WEEKLY_PRODUCTION: WeeklyProductionWidget,
};

const WIDGET_DEFINITIONS = [
  { type: 'PROJECT_SUMMARY', name: 'Project Summary', description: 'Overview of all projects', size: 'medium' },
  { type: 'TASK_SUMMARY', name: 'Tasks Overview', description: 'Your tasks and deadlines', size: 'medium' },
  { type: 'KPI_SUMMARY', name: 'KPI Dashboard', description: 'Performance indicators', size: 'large' },
  { type: 'OBJECTIVE_SUMMARY', name: 'Company Objectives', description: 'Strategic goals tracking', size: 'medium' },
  { type: 'WEEKLY_PRODUCTION', name: 'Weekly Production', description: 'Production trends and metrics', size: 'large' },
];

export default function WidgetContainer() {
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const fetchWidgets = async () => {
    try {
      const response = await fetch('/api/dashboard/widgets');
      if (response.ok) {
        const data = await response.json();
        setWidgets(data);
      }
    } catch (error) {
      console.error('Failed to fetch widgets:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWidgets();
  }, []);

  const addWidget = async (widgetType: string, widgetSize: string) => {
    try {
      const response = await fetch('/api/dashboard/widgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ widgetType, widgetSize }),
      });

      if (response.ok) {
        await fetchWidgets();
        setAddDialogOpen(false);
      }
    } catch (error) {
      console.error('Failed to add widget:', error);
    }
  };

  const removeWidget = async (widgetId: string) => {
    try {
      const response = await fetch(`/api/dashboard/widgets?widgetId=${widgetId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchWidgets();
      }
    } catch (error) {
      console.error('Failed to remove widget:', error);
    }
  };

  const getGridClass = (size: string) => {
    switch (size) {
      case 'small':
        return 'col-span-1';
      case 'large':
        return 'col-span-2';
      default:
        return 'col-span-1';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const existingWidgetTypes = widgets.map(w => w.widgetType);
  const availableWidgets = WIDGET_DEFINITIONS.filter(
    def => !existingWidgetTypes.includes(def.type)
  );

  return (
    <div className="space-y-6">
      {/* Add Widget Button */}
      <div className="flex justify-end">
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4 mr-2" />
              Add Widget
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Dashboard Widget</DialogTitle>
              <DialogDescription>
                Choose a widget to add to your dashboard
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-4">
              {availableWidgets.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  All available widgets are already on your dashboard
                </p>
              ) : (
                availableWidgets.map((widget) => (
                  <button
                    key={widget.type}
                    onClick={() => addWidget(widget.type, widget.size)}
                    className="flex flex-col items-start p-4 rounded-lg border hover:border-primary hover:bg-accent transition-colors text-left"
                  >
                    <p className="font-semibold">{widget.name}</p>
                    <p className="text-sm text-muted-foreground">{widget.description}</p>
                  </button>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Widgets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {widgets.map((widget) => {
          const WidgetComponent = WIDGET_COMPONENTS[widget.widgetType];
          if (!WidgetComponent) return null;

          return (
            <div key={widget.id} className={getGridClass(widget.widgetSize)}>
              <WidgetComponent />
            </div>
          );
        })}
      </div>

      {widgets.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">No widgets on your dashboard yet</p>
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="size-4 mr-2" />
            Add Your First Widget
          </Button>
        </div>
      )}
    </div>
  );
}
