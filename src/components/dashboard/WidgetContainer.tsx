'use client';

import { useState, useEffect } from 'react';
import ProjectSummaryWidget from './widgets/ProjectSummaryWidget';
import TaskSummaryWidget from './widgets/TaskSummaryWidget';
import KPISummaryWidget from './widgets/KPISummaryWidget';
import ObjectivesSummaryWidget from './widgets/ObjectivesSummaryWidget';
import WeeklyProductionWidget from './widgets/WeeklyProductionWidget';
import WorkOrdersWidget from './widgets/WorkOrdersWidget';
import { Button } from '@/components/ui/button';
import { Plus, Loader2, X, GripVertical } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';

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
  WORK_ORDERS: WorkOrdersWidget,
};

const WIDGET_DEFINITIONS = [
  { type: 'PROJECT_SUMMARY', name: 'Project Summary', description: 'Overview of all projects', size: 'medium' },
  { type: 'TASK_SUMMARY', name: 'Tasks Overview', description: 'Your tasks and deadlines', size: 'medium' },
  { type: 'KPI_SUMMARY', name: 'KPI Dashboard', description: 'Performance indicators', size: 'large' },
  { type: 'OBJECTIVE_SUMMARY', name: 'Company Objectives', description: 'Strategic goals tracking', size: 'medium' },
  { type: 'WEEKLY_PRODUCTION', name: 'Weekly Production', description: 'Production trends and metrics', size: 'large' },
  { type: 'WORK_ORDERS', name: 'Work Orders', description: 'Ongoing work orders status', size: 'medium' },
];

// Sortable Widget Wrapper
function SortableWidget({ widget, children }: { widget: Widget; children: React.ReactNode }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widget.id });

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group ${widget.widgetSize === 'large' ? 'sm:col-span-2' : 'col-span-1'}`}
      {...attributes}
    >
      {/* Drag Handle */}
      <div
        {...listeners}
        className="absolute top-2 left-2 z-10 p-1 rounded cursor-move hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity"
        title="Drag to reorder"
      >
        <GripVertical className="size-4 text-muted-foreground" />
      </div>
      
      {/* Remove button - visible on hover */}
      <Button
        variant="destructive"
        size="icon"
        className="absolute top-2 right-2 z-10 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const widgetDef = WIDGET_DEFINITIONS.find(d => d.type === widget.widgetType);
          if (confirm(`Remove "${widgetDef?.name || 'this widget'}" from dashboard?`)) {
            // This will be handled by the parent component
            const event = new CustomEvent('removeWidget', { detail: widget.id });
            window.dispatchEvent(event);
          }
        }}
        title="Remove widget"
      >
        <X className="size-3" />
      </Button>
      {children}
    </div>
  );
}

export default function WidgetContainer() {
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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

  useEffect(() => {
    // Listen for custom remove widget events
    const handleRemoveWidget = (event: CustomEvent) => {
      removeWidget(event.detail);
    };
    
    window.addEventListener('removeWidget', handleRemoveWidget as EventListener);
    return () => window.removeEventListener('removeWidget', handleRemoveWidget as EventListener);
  }, []);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = widgets.findIndex((widget) => widget.id === active.id);
      const newIndex = widgets.findIndex((widget) => widget.id === over?.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const newWidgets = arrayMove(widgets, oldIndex, newIndex);
        
        // Update positions in the array
        const updatedWidgets = newWidgets.map((widget, index) => ({
          ...widget,
          position: index,
        }));
        
        setWidgets(updatedWidgets);
        
        // Save to backend
        try {
          await Promise.all(
            updatedWidgets.map(widget =>
              fetch(`/api/dashboard/widgets/${widget.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ position: widget.position }),
              })
            )
          );
        } catch (error) {
          console.error('Failed to update widget positions:', error);
          // Revert to original positions if save fails
          setWidgets(widgets);
        }
      }
    }
  };

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

      {/* Widgets Grid - Mobile optimized with drag and drop */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={widgets.map(w => w.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {widgets.map((widget) => {
              const WidgetComponent = WIDGET_COMPONENTS[widget.widgetType];
              if (!WidgetComponent) return null;

              return (
                <SortableWidget key={widget.id} widget={widget}>
                  <WidgetComponent />
                </SortableWidget>
              );
            })}
          </div>
        </SortableContext>
      </DndContext>

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
