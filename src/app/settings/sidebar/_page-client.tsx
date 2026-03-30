'use client';

import { useState, useEffect } from 'react';
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
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GripVertical, Save, RotateCcw, Loader2, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// The canonical section names in the default order
const DEFAULT_SECTIONS = [
  'Tasks',
  'Operations Control',
  'Notifications',
  'Projects',
  'Production',
  'Quality Control',
  'Documentation',
  'Business Planning',
  'Knowledge Center',
  'Supply Chain',
  'Product Backlog',
  'Organization',
  'Financial Reports',
  'Dolibarr ERP',
  'Settings',
];

interface SortableItemProps {
  id: string;
  index: number;
}

function SortableItem({ id, index }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-3 rounded-lg border bg-card px-4 py-3 select-none',
        isDragging ? 'shadow-lg opacity-80 z-50' : 'hover:bg-muted/40'
      )}
    >
      <span className="text-xs text-muted-foreground w-5 text-right shrink-0">{index + 1}</span>
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-0.5 touch-none"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="text-sm font-medium flex-1">{id}</span>
    </div>
  );
}

export default function SidebarOrderPage() {
  const [sections, setSections] = useState<string[]>(DEFAULT_SECTIONS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isAdminOrCeo, setIsAdminOrCeo] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    async function load() {
      try {
        // Check current user role
        const meRes = await fetch('/api/auth/me', { credentials: 'include' });
        if (meRes.ok) {
          const me = await meRes.json();
          const allowed = me.isAdmin || ['Admin', 'CEO', 'admin'].includes(me.role);
          setIsAdminOrCeo(allowed);
        }

        // Load saved order
        const orderRes = await fetch('/api/settings/sidebar-order');
        if (orderRes.ok) {
          const { order } = await orderRes.json();
          if (Array.isArray(order) && order.length > 0) {
            // Merge: keep saved order, append any new sections not in saved list
            const merged = [
              ...order.filter((s: string) => DEFAULT_SECTIONS.includes(s)),
              ...DEFAULT_SECTIONS.filter((s) => !order.includes(s)),
            ];
            setSections(merged);
          }
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setSections((prev) => {
        const oldIndex = prev.indexOf(active.id as string);
        const newIndex = prev.indexOf(over.id as string);
        return arrayMove(prev, oldIndex, newIndex);
      });
      setSaved(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch('/api/settings/sidebar-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: sections }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    setSections(DEFAULT_SECTIONS);
    setSaved(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdminOrCeo) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <Settings2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm">Sidebar order management is available to Admin and CEO users only.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings2 className="h-5 w-5" />
          Sidebar Order
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Drag sections to reorder them. Changes apply globally to all user accounts.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Navigation Sections</CardTitle>
          <CardDescription>Drag &amp; drop to rearrange the sidebar menu groups</CardDescription>
        </CardHeader>
        <CardContent>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={sections} strategy={verticalListSortingStrategy}>
              <div className="space-y-1.5">
                {sections.map((section, index) => (
                  <SortableItem key={section} id={section} index={index} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save Order
        </Button>
        <Button variant="outline" onClick={handleReset}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset to Default
        </Button>
        {saved && (
          <Badge variant="secondary" className="text-green-700 bg-green-50 border-green-200">
            Saved — reloading sidebar will apply the new order
          </Badge>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Note: Users will see the updated order on their next page load.
        The top-level items (Dashboard, Early Warning, Project Status Tracker, AI Assistant) always stay pinned at the top.
      </p>
    </div>
  );
}
