'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';

type User = { id: string; name: string; position: string | null };

type ProjectFormProps = {
  project?: any;
  projectManagers: User[];
  salesEngineers: User[];
};

export function ProjectForm({ project, projectManagers, salesEngineers }: ProjectFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    
    const getString = (key: string) => {
      const val = formData.get(key) as string;
      return val && val.trim() ? val : null;
    };

    const getNumber = (key: string) => {
      const val = formData.get(key) as string;
      return val && val.trim() ? parseFloat(val) : null;
    };

    const data = {
      projectNumber: formData.get('projectNumber') as string,
      estimationNumber: getString('estimationNumber'),
      name: formData.get('name') as string,
      clientName: formData.get('clientName') as string,
      projectManagerId: formData.get('projectManagerId') as string,
      salesEngineerId: getString('salesEngineerId'),
      status: formData.get('status') as string,
      contractDate: getString('contractDate'),
      plannedStartDate: getString('plannedStartDate'),
      plannedEndDate: getString('plannedEndDate'),
      contractValue: getNumber('contractValue'),
      projectLocation: getString('projectLocation'),
      scopeOfWork: getString('scopeOfWork'),
      remarks: getString('remarks'),
    };

    try {
      const url = project?.id ? `/api/projects/${project.id}` : '/api/projects';
      const method = project?.id ? 'PATCH' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to save project');

      if (project?.id) {
        router.push(`/projects/${result.id}`);
      } else {
        router.push('/projects');
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          {error}
        </div>
      )}

      <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-sm">
        <strong>Quick Start:</strong> Fill in the essential fields below to create the project. You can add detailed financial information, technical specifications, and other details by editing the project after creation.
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="projectNumber">Project Number <span className="text-destructive">*</span></Label>
          <Input id="projectNumber" name="projectNumber" defaultValue={project?.projectNumber} required disabled={loading} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="estimationNumber">Estimation Number</Label>
          <Input id="estimationNumber" name="estimationNumber" defaultValue={project?.estimationNumber || ''} disabled={loading} />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="name">Project Name <span className="text-destructive">*</span></Label>
          <Input id="name" name="name" defaultValue={project?.name} required disabled={loading} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="clientName">Client Name <span className="text-destructive">*</span></Label>
          <Input id="clientName" name="clientName" defaultValue={project?.client?.name || ''} required disabled={loading} placeholder="Enter client name" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="projectManagerId">Project Manager <span className="text-destructive">*</span></Label>
          <select id="projectManagerId" name="projectManagerId" required disabled={loading} defaultValue={project?.projectManagerId} className="w-full h-10 px-3 rounded-md border bg-background">
            <option value="">Select a manager</option>
            {projectManagers.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="salesEngineerId">Sales Engineer</Label>
          <select id="salesEngineerId" name="salesEngineerId" disabled={loading} defaultValue={project?.salesEngineerId || ''} className="w-full h-10 px-3 rounded-md border bg-background">
            <option value="">Select a sales engineer</option>
            {salesEngineers.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Status <span className="text-destructive">*</span></Label>
          <select id="status" name="status" required disabled={loading} defaultValue={project?.status || 'Draft'} className="w-full h-10 px-3 rounded-md border bg-background">
            <option value="Draft">Draft</option>
            <option value="Active">Active</option>
            <option value="Completed">Completed</option>
            <option value="On Hold">On Hold</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="contractDate">Contract Date</Label>
          <Input id="contractDate" name="contractDate" type="date" defaultValue={project?.contractDate?.split('T')[0]} disabled={loading} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="plannedStartDate">Planned Start Date</Label>
          <Input id="plannedStartDate" name="plannedStartDate" type="date" defaultValue={project?.plannedStartDate?.split('T')[0]} disabled={loading} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="plannedEndDate">Planned End Date</Label>
          <Input id="plannedEndDate" name="plannedEndDate" type="date" defaultValue={project?.plannedEndDate?.split('T')[0]} disabled={loading} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="contractValue">Contract Value</Label>
          <Input id="contractValue" name="contractValue" type="number" step="0.01" defaultValue={project?.contractValue || ''} disabled={loading} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="projectLocation">Project Location</Label>
          <Input id="projectLocation" name="projectLocation" defaultValue={project?.projectLocation || ''} disabled={loading} />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="scopeOfWork">Scope of Work</Label>
          <Textarea id="scopeOfWork" name="scopeOfWork" defaultValue={project?.scopeOfWork || ''} disabled={loading} rows={3} />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="remarks">Remarks</Label>
          <Textarea id="remarks" name="remarks" defaultValue={project?.remarks || ''} disabled={loading} rows={3} />
        </div>
      </div>

      <div className="flex gap-4">
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="size-4 animate-spin" />}
          {project?.id ? 'Update Project' : 'Create Project'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
