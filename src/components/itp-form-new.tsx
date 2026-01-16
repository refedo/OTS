'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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

type Activity = {
  id?: string;
  sequence: number;
  section: string;
  activityDescription: string;
  referenceDocument: string;
  acceptanceCriteria: string;
  verifyingDocument: string;
  activityByManuf: string;
  activityByTPI: string;
  activityByClient: string;
  remark: string;
  status: 'Pending' | 'Completed';
};

type User = {
  id: string;
  name: string;
  email: string;
  position: string | null;
  role: {
    name: string;
  };
};

type ITPFormProps = {
  projects: Project[];
  users: User[];
  itp?: any;
};

const SECTIONS = [
  'Before Manufacturing',
  'Materials',
  'During Fabrication',
  'NDT',
  'Final Inspection',
  'Documentation',
  'Pre-Shipment Inspection',
];

const ACTIVITY_BY_OPTIONS = ['-', 'H', 'W', 'R', 'SW', 'A'];

export function ITPFormNew({ projects, users, itp }: ITPFormProps) {
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
    itp?.activities?.map((a: any) => ({
      id: a.id,
      sequence: a.sequence,
      section: a.section || 'Before Manufacturing',
      activityDescription: a.activityDescription,
      referenceDocument: a.referenceDocument || '',
      acceptanceCriteria: a.acceptanceCriteria || '',
      verifyingDocument: a.verifyingDocument || '',
      activityByManuf: a.activityByManuf || '-',
      activityByTPI: a.activityByTPI || '-',
      activityByClient: a.activityByClient || '-',
      remark: a.remark || '',
      status: a.status,
    })) || []
  );
  const [currentSection, setCurrentSection] = useState('Before Manufacturing');

  // Auto-generate ITP number when project is selected
  const handleProjectChange = (projectId: string) => {
    setSelectedProject(projectId);
    if (projectId && !itp) {
      const project = projects.find(p => p.id === projectId);
      if (project) {
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

  const addActivity = (section: string) => {
    const maxSequence = activities.length > 0 ? Math.max(...activities.map(a => a.sequence)) : 0;
    setActivities([
      ...activities,
      {
        sequence: maxSequence + 1,
        section,
        activityDescription: '',
        referenceDocument: '',
        acceptanceCriteria: '',
        verifyingDocument: '',
        activityByManuf: '-',
        activityByTPI: '-',
        activityByClient: '-',
        remark: '',
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

  // Group activities by section
  const activitiesBySection = SECTIONS.map(section => ({
    section,
    activities: activities.filter(a => a.section === section),
  }));

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

      {/* Approval Information */}
      <Card>
        <CardHeader>
          <CardTitle>Approval Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Prepared By - Auto-filled from session */}
            <div className="space-y-2">
              <Label>Prepared By</Label>
              <Input
                value="Current User (Auto-filled on save)"
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">Automatically set to the creator</p>
            </div>

            {/* Approved By - Dropdown selector */}
            <div className="space-y-2">
              <Label htmlFor="approvedById">Assign Approver</Label>
              <select
                id="approvedById"
                name="approvedById"
                defaultValue={itp?.approvedById || ''}
                disabled={loading || itp?.status === 'Approved'}
                className="w-full h-10 px-3 rounded-md border bg-background"
              >
                <option value="">Select Approver (Optional)</option>
                {users
                  .filter(u => ['CEO', 'Admin', 'Manager'].includes(u.role.name))
                  .map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} {user.position ? `(${user.position})` : ''}
                    </option>
                  ))}
              </select>
              <p className="text-xs text-muted-foreground">
                {itp?.status === 'Approved' ? 'Already approved' : 'Assign a manager/admin to approve this ITP'}
              </p>
            </div>

            {/* Client Approved By */}
            <div className="space-y-2">
              <Label htmlFor="clientApprovedBy">Client Approved By</Label>
              <Input
                id="clientApprovedBy"
                name="clientApprovedBy"
                placeholder="Client representative name"
                defaultValue={itp?.clientApprovedBy || ''}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">Optional: Client representative</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activities by Section */}
      {activitiesBySection.map(({ section, activities: sectionActivities }) => (
        <Card key={section}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{section}</CardTitle>
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={() => addActivity(section)}
                disabled={loading}
              >
                <Plus className="size-4 mr-2" />
                Add Activity
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {sectionActivities.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No activities in this section. Click "Add Activity" to start.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead className="min-w-[200px]">Inspection and Test Plan</TableHead>
                      <TableHead className="min-w-[150px]">Reference Document</TableHead>
                      <TableHead className="min-w-[150px]">Acceptance Criteria</TableHead>
                      <TableHead className="min-w-[120px]">Verifying Document</TableHead>
                      <TableHead className="w-24">Manuf.</TableHead>
                      <TableHead className="w-24">TPI</TableHead>
                      <TableHead className="w-24">Client</TableHead>
                      <TableHead className="min-w-[120px]">Remark</TableHead>
                      <TableHead className="w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sectionActivities.map((activity, sectionIndex) => {
                      const globalIndex = activities.indexOf(activity);
                      return (
                        <TableRow key={globalIndex}>
                          <TableCell className="font-medium">{activity.sequence}</TableCell>
                          <TableCell>
                            <Textarea
                              value={activity.activityDescription}
                              onChange={(e) => updateActivity(globalIndex, 'activityDescription', e.target.value)}
                              placeholder="Activity description"
                              className="min-h-[60px]"
                              disabled={loading}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={activity.referenceDocument}
                              onChange={(e) => updateActivity(globalIndex, 'referenceDocument', e.target.value)}
                              placeholder="e.g., AWS D1.1"
                              disabled={loading}
                            />
                          </TableCell>
                          <TableCell>
                            <Textarea
                              value={activity.acceptanceCriteria}
                              onChange={(e) => updateActivity(globalIndex, 'acceptanceCriteria', e.target.value)}
                              placeholder="Criteria"
                              className="min-h-[60px]"
                              disabled={loading}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={activity.verifyingDocument}
                              onChange={(e) => updateActivity(globalIndex, 'verifyingDocument', e.target.value)}
                              placeholder="e.g., Report"
                              disabled={loading}
                            />
                          </TableCell>
                          <TableCell>
                            <select
                              value={activity.activityByManuf}
                              onChange={(e) => updateActivity(globalIndex, 'activityByManuf', e.target.value)}
                              disabled={loading}
                              className="w-full h-10 px-2 rounded-md border bg-background text-sm"
                            >
                              {ACTIVITY_BY_OPTIONS.map((opt) => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                            {activity.activityByManuf !== '-' && (
                              <div className={cn(
                                "text-xs mt-1 font-medium",
                                activity.activityByManuf === 'H' && "text-red-600",
                                activity.activityByManuf === 'W' && "text-blue-600",
                                activity.activityByManuf === 'R' && "text-green-600",
                                activity.activityByManuf === 'SW' && "text-orange-600",
                                activity.activityByManuf === 'A' && "text-purple-600"
                              )}>
                                {activity.activityByManuf === 'H' && 'Hold Point'}
                                {activity.activityByManuf === 'W' && 'Witness'}
                                {activity.activityByManuf === 'R' && 'Review'}
                                {activity.activityByManuf === 'SW' && 'Spot Witness'}
                                {activity.activityByManuf === 'A' && 'Approval'}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <select
                              value={activity.activityByTPI}
                              onChange={(e) => updateActivity(globalIndex, 'activityByTPI', e.target.value)}
                              disabled={loading}
                              className="w-full h-10 px-2 rounded-md border bg-background text-sm"
                            >
                              {ACTIVITY_BY_OPTIONS.map((opt) => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                            {activity.activityByTPI !== '-' && (
                              <div className={cn(
                                "text-xs mt-1 font-medium",
                                activity.activityByTPI === 'H' && "text-red-600",
                                activity.activityByTPI === 'W' && "text-blue-600",
                                activity.activityByTPI === 'R' && "text-green-600",
                                activity.activityByTPI === 'SW' && "text-orange-600",
                                activity.activityByTPI === 'A' && "text-purple-600"
                              )}>
                                {activity.activityByTPI === 'H' && 'Hold Point'}
                                {activity.activityByTPI === 'W' && 'Witness'}
                                {activity.activityByTPI === 'R' && 'Review'}
                                {activity.activityByTPI === 'SW' && 'Spot Witness'}
                                {activity.activityByTPI === 'A' && 'Approval'}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <select
                              value={activity.activityByClient}
                              onChange={(e) => updateActivity(globalIndex, 'activityByClient', e.target.value)}
                              disabled={loading}
                              className="w-full h-10 px-2 rounded-md border bg-background text-sm"
                            >
                              {ACTIVITY_BY_OPTIONS.map((opt) => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                            {activity.activityByClient !== '-' && (
                              <div className={cn(
                                "text-xs mt-1 font-medium",
                                activity.activityByClient === 'H' && "text-red-600",
                                activity.activityByClient === 'W' && "text-blue-600",
                                activity.activityByClient === 'R' && "text-green-600",
                                activity.activityByClient === 'SW' && "text-orange-600",
                                activity.activityByClient === 'A' && "text-purple-600"
                              )}>
                                {activity.activityByClient === 'H' && 'Hold Point'}
                                {activity.activityByClient === 'W' && 'Witness'}
                                {activity.activityByClient === 'R' && 'Review'}
                                {activity.activityByClient === 'SW' && 'Spot Witness'}
                                {activity.activityByClient === 'A' && 'Approval'}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Input
                              value={activity.remark}
                              onChange={(e) => updateActivity(globalIndex, 'remark', e.target.value)}
                              placeholder="Remark"
                              disabled={loading}
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeActivity(globalIndex)}
                              disabled={loading}
                            >
                              <Trash2 className="size-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Legend/Abbreviations */}
      <Card>
        <CardHeader>
          <CardTitle>Abbreviations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div>
            <span className="font-semibold">H: Hold Point</span> = Hold on the production till TPI Inspector performs inspection and supervise the required test
          </div>
          <div>
            <span className="font-semibold">W: Witness Point</span> = Manufacture shall notify client and TPI Inspector but there is no hold on the production; Client can waive this inspection based on TPI inspector accordingly.
          </div>
          <div>
            <span className="font-semibold">R: Document Review</span> = Review means Review document, which includes of material test certificates, WPS, PQR, NDT Procedures and etc. A: Approval
          </div>
          <div>
            <span className="font-semibold">SW: Spot Witness</span> = for items with spot witness manufacture shall notify TPI inspector as fulfilling the monitoring; For example one random visit for whole UT tests or one or two visits for whole surface preparation works for painting.
          </div>
          <div>
            <span className="font-semibold">MOM:</span> Minute of Meeting
          </div>
          <div>
            <span className="font-semibold">P.O:</span> Purchase Order
          </div>
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
