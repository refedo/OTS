'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, Plus, Trash2, Save } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

type Project = {
  id: string;
  projectNumber: string;
  name: string;
  client: { name: string };
};

type User = {
  id: string;
  name: string;
  email: string;
  position: string | null;
};

type Activity = {
  id?: string;
  sequence: number;
  activityDescription: string;
  verifyingDocument: string;
  inspectionType: 'H' | 'W' | 'M' | 'R' | 'RI';
  acceptanceCriteria: string;
  reportsReference: string;
  signAId: string;
  signBId: string;
  signCId: string;
  status: 'Pending' | 'Completed';
};

type ITPFormProps = {
  projects: Project[];
  users: User[];
  itp?: any;
};

const inspectionTypes = [
  { value: 'H', label: 'H - Hold', color: 'bg-red-100 text-red-800 border-red-300' },
  { value: 'W', label: 'W - Witness', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  { value: 'M', label: 'M - Monitor', color: 'bg-orange-100 text-orange-800 border-orange-300' },
  { value: 'R', label: 'R - Review', color: 'bg-green-100 text-green-800 border-green-300' },
  { value: 'RI', label: 'RI - Review of Inspection', color: 'bg-gray-100 text-gray-800 border-gray-300' },
];

export function ITPForm({ projects, users, itp }: ITPFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedProject, setSelectedProject] = useState(itp?.projectId || '');
  const [itpNumber, setItpNumber] = useState(itp?.itpNumber || '');
  const [standardCodes, setStandardCodes] = useState<string[]>(
    itp?.applicableCodes ? itp.applicableCodes.split(', ').filter((c: string) => 
      ['AWS D1.1', 'AISC 360&303', 'ASTM', 'SSPC-SP&SSPC-PA'].includes(c)
    ) : ['AWS D1.1', 'AISC 360&303', 'ASTM', 'SSPC-SP&SSPC-PA']
  );
  const [customCodes, setCustomCodes] = useState(
    itp?.applicableCodes ? itp.applicableCodes.split(', ').filter((c: string) => 
      !['AWS D1.1', 'AISC 360&303', 'ASTM', 'SSPC-SP&SSPC-PA'].includes(c)
    ).join(', ') : ''
  );
  const [activities, setActivities] = useState<Activity[]>(
    itp?.activities?.map((a: any, idx: number) => ({
      id: a.id,
      sequence: a.sequence,
      activityDescription: a.activityDescription,
      verifyingDocument: a.verifyingDocument || '',
      inspectionType: a.inspectionType,
      acceptanceCriteria: a.acceptanceCriteria || '',
      reportsReference: a.reportsReference || '',
      signAId: a.signAId || '',
      signBId: a.signBId || '',
      signCId: a.signCId || '',
      status: a.status,
    })) || []
  );

  // Auto-generate ITP number when project is selected
  const handleProjectChange = (projectId: string) => {
    setSelectedProject(projectId);
    if (projectId && !itp) {
      const project = projects.find(p => p.id === projectId);
      if (project) {
        // Generate ITP number: ProjectNumber-ITP-001
        setItpNumber(`${project.projectNumber}-ITP-001`);
      }
    }
  };

  const toggleStandardCode = (code: string) => {
    setStandardCodes(prev =>
      prev.includes(code)
        ? prev.filter(c => c !== code)
        : [...prev, code]
    );
  };

  const addActivity = () => {
    setActivities([
      ...activities,
      {
        sequence: activities.length,
        activityDescription: '',
        verifyingDocument: '',
        inspectionType: 'H',
        acceptanceCriteria: '',
        reportsReference: '',
        signAId: '',
        signBId: '',
        signCId: '',
        status: 'Pending',
      },
    ]);
  };

  const removeActivity = (index: number) => {
    setActivities(activities.filter((_, i) => i !== index));
  };

  const updateActivity = (index: number, field: keyof Activity, value: any) => {
    const updated = [...activities];
    updated[index] = { ...updated[index], [field]: value };
    setActivities(updated);
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    
    try {
      // Combine standard codes and custom codes
      const allCodes = [...standardCodes];
      if (customCodes.trim()) {
        allCodes.push(...customCodes.split(',').map((c: string) => c.trim()).filter((c: string) => c));
      }
      const applicableCodesString = allCodes.join(', ');

      // Create/Update ITP
      const itpData = {
        itpNumber: itpNumber,
        revision: parseInt(formData.get('revision') as string) || 0,
        projectId: selectedProject,
        type: formData.get('type') as string,
        jobNo: (formData.get('jobNo') as string) || null,
        client: (formData.get('client') as string) || null,
        applicableCodes: applicableCodesString || null,
        remarks: (formData.get('remarks') as string) || null,
      };

      const itpUrl = itp ? `/api/itp/${itp.id}` : '/api/itp';
      const itpMethod = itp ? 'PATCH' : 'POST';

      const itpResponse = await fetch(itpUrl, {
        method: itpMethod,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itpData),
      });

      const itpResult = await itpResponse.json();
      if (!itpResponse.ok) throw new Error(itpResult.error || 'Failed to save ITP');

      const itpId = itpResult.id;

      // Save activities
      for (const activity of activities) {
        const activityData = {
          ...activity,
          signAId: activity.signAId || null,
          signBId: activity.signBId || null,
          signCId: activity.signCId || null,
        };

        if (activity.id) {
          // Update existing activity
          await fetch(`/api/itp/${itpId}/activities/${activity.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(activityData),
          });
        } else {
          // Create new activity
          await fetch(`/api/itp/${itpId}/activities`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(activityData),
          });
        }
      }

      router.push(`/itp/${itpId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  const selectedProjectData = projects.find(p => p.id === selectedProject);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          {error}
        </div>
      )}

      {/* Header Information */}
      <Card>
        <CardHeader>
          <CardTitle>ITP Header Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Project */}
            <div className="space-y-2">
              <Label htmlFor="projectId">
                Project <span className="text-destructive">*</span>
              </Label>
              <select
                id="projectId"
                name="projectId"
                value={selectedProject}
                onChange={(e) => handleProjectChange(e.target.value)}
                required
                disabled={loading || !!itp}
                className="w-full h-10 px-3 rounded-md border bg-background"
              >
                <option value="">Select Project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.projectNumber} - {project.name}
                  </option>
                ))}
              </select>
            </div>

            {/* ITP Number - Auto-generated */}
            <div className="space-y-2">
              <Label htmlFor="itpNumber">
                ITP Number <span className="text-destructive">*</span>
              </Label>
              <Input
                id="itpNumber"
                name="itpNumber"
                value={itpNumber}
                onChange={(e) => setItpNumber(e.target.value)}
                placeholder="Select project to auto-generate"
                required
                disabled={loading}
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">Auto-generated based on project number</p>
            </div>

            {/* Revision */}
            <div className="space-y-2">
              <Label htmlFor="revision">Revision</Label>
              <Input
                id="revision"
                name="revision"
                type="number"
                min="0"
                defaultValue={itp?.revision || 0}
                disabled={loading}
              />
            </div>

            {/* Type */}
            <div className="space-y-2">
              <Label htmlFor="type">
                Type <span className="text-destructive">*</span>
              </Label>
              <select
                id="type"
                name="type"
                defaultValue={itp?.type || 'CUSTOM'}
                required
                disabled={loading}
                className="w-full h-10 px-3 rounded-md border bg-background"
              >
                <option value="STANDARD">Standard (HEXA Template)</option>
                <option value="CUSTOM">Custom (Client-Specific)</option>
              </select>
            </div>

            {/* Job No */}
            <div className="space-y-2">
              <Label htmlFor="jobNo">Job No.</Label>
              <Input
                id="jobNo"
                name="jobNo"
                placeholder="Job number"
                defaultValue={itp?.jobNo || selectedProjectData?.projectNumber || ''}
                disabled={loading}
              />
            </div>

            {/* Client */}
            <div className="space-y-2">
              <Label htmlFor="client">Client</Label>
              <Input
                id="client"
                name="client"
                placeholder="Client name"
                defaultValue={itp?.client || selectedProjectData?.client.name || ''}
                disabled={loading}
              />
            </div>
          </div>

          {/* Applicable Codes */}
          <div className="space-y-3">
            <Label>Applicable Codes & Standards</Label>
            <div className="space-y-2">
              {/* Standard Codes Checkboxes */}
              <div className="grid gap-3 md:grid-cols-2">
                {['AWS D1.1', 'AISC 360&303', 'ASTM', 'SSPC-SP&SSPC-PA'].map((code) => (
                  <div key={code} className="flex items-center space-x-2">
                    <Checkbox
                      id={code}
                      checked={standardCodes.includes(code)}
                      onCheckedChange={() => toggleStandardCode(code)}
                      disabled={loading}
                    />
                    <Label
                      htmlFor={code}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {code}
                    </Label>
                  </div>
                ))}
              </div>
              
              {/* Custom Codes Input */}
              <div className="space-y-2 pt-2">
                <Label htmlFor="customCodes" className="text-sm text-muted-foreground">
                  Additional Codes (comma-separated)
                </Label>
                <Input
                  id="customCodes"
                  placeholder="e.g., ISO 9001, EN 1090"
                  value={customCodes}
                  onChange={(e) => setCustomCodes(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          {/* Remarks */}
          <div className="space-y-2">
            <Label htmlFor="remarks">Remarks</Label>
            <Textarea
              id="remarks"
              name="remarks"
              placeholder="Additional notes or remarks"
              defaultValue={itp?.remarks || ''}
              disabled={loading}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Activities Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Inspection Activities</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addActivity} disabled={loading}>
              <Plus className="size-4 mr-2" />
              Add Activity
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {activities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No activities added yet. Click "Add Activity" to start.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead className="min-w-[200px]">Activity Description</TableHead>
                    <TableHead className="min-w-[150px]">Verifying Document</TableHead>
                    <TableHead className="w-32">Inspection Type</TableHead>
                    <TableHead className="min-w-[150px]">Acceptance Criteria</TableHead>
                    <TableHead className="min-w-[120px]">Reports Ref.</TableHead>
                    <TableHead className="min-w-[150px]">Sign A</TableHead>
                    <TableHead className="min-w-[150px]">Sign B</TableHead>
                    <TableHead className="min-w-[150px]">Sign C</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activities.map((activity, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell>
                        <Textarea
                          value={activity.activityDescription}
                          onChange={(e) => updateActivity(index, 'activityDescription', e.target.value)}
                          placeholder="Activity description"
                          className="min-h-[60px]"
                          disabled={loading}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={activity.verifyingDocument}
                          onChange={(e) => updateActivity(index, 'verifyingDocument', e.target.value)}
                          placeholder="Document ref."
                          disabled={loading}
                        />
                      </TableCell>
                      <TableCell>
                        <select
                          value={activity.inspectionType}
                          onChange={(e) => updateActivity(index, 'inspectionType', e.target.value)}
                          disabled={loading}
                          className="w-full h-10 px-3 rounded-md border bg-background"
                        >
                          {inspectionTypes.map((type) => (
                            <option key={type.value} value={type.value}>
                              {type.value}
                            </option>
                          ))}
                        </select>
                        <Badge
                          variant="outline"
                          className={cn(
                            "mt-1 text-xs",
                            inspectionTypes.find(t => t.value === activity.inspectionType)?.color
                          )}
                        >
                          {inspectionTypes.find(t => t.value === activity.inspectionType)?.label.split(' - ')[1]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Textarea
                          value={activity.acceptanceCriteria}
                          onChange={(e) => updateActivity(index, 'acceptanceCriteria', e.target.value)}
                          placeholder="Criteria"
                          className="min-h-[60px]"
                          disabled={loading}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={activity.reportsReference}
                          onChange={(e) => updateActivity(index, 'reportsReference', e.target.value)}
                          placeholder="Report ref."
                          disabled={loading}
                        />
                      </TableCell>
                      <TableCell>
                        <select
                          value={activity.signAId}
                          onChange={(e) => updateActivity(index, 'signAId', e.target.value)}
                          disabled={loading}
                          className="w-full h-10 px-3 rounded-md border bg-background text-sm"
                        >
                          <option value="">-</option>
                          {users.map((user) => (
                            <option key={user.id} value={user.id}>
                              {user.name}
                            </option>
                          ))}
                        </select>
                      </TableCell>
                      <TableCell>
                        <select
                          value={activity.signBId}
                          onChange={(e) => updateActivity(index, 'signBId', e.target.value)}
                          disabled={loading}
                          className="w-full h-10 px-3 rounded-md border bg-background text-sm"
                        >
                          <option value="">-</option>
                          {users.map((user) => (
                            <option key={user.id} value={user.id}>
                              {user.name}
                            </option>
                          ))}
                        </select>
                      </TableCell>
                      <TableCell>
                        <select
                          value={activity.signCId}
                          onChange={(e) => updateActivity(index, 'signCId', e.target.value)}
                          disabled={loading}
                          className="w-full h-10 px-3 rounded-md border bg-background text-sm"
                        >
                          <option value="">-</option>
                          {users.map((user) => (
                            <option key={user.id} value={user.id}>
                              {user.name}
                            </option>
                          ))}
                        </select>
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeActivity(index)}
                          disabled={loading}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-4 justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="size-4 animate-spin mr-2" />}
          <Save className="size-4 mr-2" />
          {itp ? 'Update ITP' : 'Create ITP'}
        </Button>
      </div>
    </form>
  );
}
