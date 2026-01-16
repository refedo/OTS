'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Save, FileText } from 'lucide-react';
import Link from 'next/link';

const DOCUMENT_TYPES = [
  'Architectural Drawing',
  'Structural Design Package',
  'SAP Model',
  'Connection Design',
  'Calculation Note',
  'Approval Drawings',
  'CRS (Comments Resolution Sheet)',
  'RAD (Request for Approval Drawing)',
  'RFI',
  'Shop Drawing',
  'Fabrication Package',
  'Fabrication Drawing',
  'Erection Drawing',
  'As-Built Drawing',
  'Quality Documents',
  'Test Reports',
  'Material Certificates',
  'Other',
];

const SECTION_OPTIONS = [
  'Estimation',
  'Sales',
  'Design',
  'Detailing',
  'Procurement',
  'Production',
  'QC',
  'Coating',
  'Packing & Delivery',
  'Erection',
  'PM',
  'Finance',
  'Contracts',
];

const STATUS_OPTIONS = [
  'Released',
  'Hold',
  'Submitted for approval',
  'In progress',
  'Submitted to get code A',
  'Submitted for clarification',
];

const CLIENT_CODE_OPTIONS = [
  { code: 'Code A - 01', label: 'Code A - 01 (Approved)' },
  { code: 'Code B - 02', label: 'Code B - 02 (Approved As Noted)' },
  { code: 'Code C - 03', label: 'Code C - 03 (Rejected)' },
];

export default function NewDocumentSubmissionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [buildings, setBuildings] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedBuilding, setSelectedBuilding] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedHandler, setSelectedHandler] = useState('');
  const [selectedRevision, setSelectedRevision] = useState('R0');
  const [selectedClientCode, setSelectedClientCode] = useState('');
  const [selectedDocTypes, setSelectedDocTypes] = useState<string[]>([]);
  const [autoTitle, setAutoTitle] = useState('');

  useEffect(() => {
    fetchProjects();
    fetchUsers();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      fetchBuildings(selectedProject);
    } else {
      setBuildings([]);
    }
  }, [selectedProject]);

  // Auto-generate title when relevant fields change
  useEffect(() => {
    const parts = [];
    
    // Project Number
    const project = projects.find(p => p.id === selectedProject);
    if (project?.projectNumber) {
      parts.push(project.projectNumber);
    }
    
    // Building Extension
    const building = buildings.find(b => b.id === selectedBuilding);
    if (building?.designation) {
      parts.push(building.designation);
    }
    
    // Section (use full section name)
    if (selectedSection) {
      parts.push(selectedSection);
    }
    
    // Handler Initials
    const handler = users.find(u => u.id === selectedHandler);
    if (handler?.name) {
      const initials = handler.name
        .split(' ')
        .map((word: string) => word.charAt(0).toUpperCase())
        .join('');
      parts.push(initials);
    }
    
    // Revision
    if (selectedRevision) {
      parts.push(selectedRevision);
    }
    
    // Client Code
    if (selectedClientCode) {
      const codeMatch = selectedClientCode.match(/Code ([ABC])/);
      if (codeMatch) {
        parts.push(codeMatch[1]);
      }
    }
    
    setAutoTitle(parts.length > 0 ? parts.join('-') : '');
  }, [selectedProject, selectedBuilding, selectedSection, selectedHandler, selectedRevision, selectedClientCode, projects, buildings, users]);

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects');
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchBuildings = async (projectId: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/buildings`);
      if (res.ok) {
        const data = await res.json();
        setBuildings(data);
      }
    } catch (error) {
      console.error('Error fetching buildings:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      projectId: formData.get('projectId') as string,
      buildingId: formData.get('buildingId') as string || null,
      documentType: selectedDocTypes.join(', '),
      section: formData.get('section') as string || null,
      title: formData.get('title') as string,
      description: formData.get('description') as string || null,
      revision: formData.get('revision') as string || 'R0',
      handledBy: formData.get('handledBy') as string || null,
      submissionDate: formData.get('submissionDate') as string,
      reviewDueDate: formData.get('reviewDueDate') as string || null,
      status: formData.get('status') as string || 'In progress',
      clientCode: formData.get('clientCode') as string || null,
      clientResponseDate: formData.get('clientResponseDate') as string || null,
      internalComments: formData.get('remarks') as string || null,
    };

    try {
      const res = await fetch('/api/document-submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        const submission = await res.json();
        router.push(`/document-timeline/${submission.id}`);
      } else {
        const error = await res.json();
        console.error('Server error response:', error);
        const errorMessage = error.message || error.error || 'Unknown error';
        const errorDetails = error.details ? JSON.stringify(error.details, null, 2) : '';
        alert(`Failed to create document submission\n\nError: ${errorMessage}\n\nDetails:\n${errorDetails}\n\nPlease check the console for more information.`);
      }
    } catch (error) {
      console.error('Error creating submission:', error);
      alert(`Failed to create submission\n\nError: ${error instanceof Error ? error.message : 'Unknown error'}\n\nPlease check the browser console (F12) for more details.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
          <Link href="/document-timeline">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <FileText className="h-8 w-8" />
              New Document Submission
            </h1>
            <p className="text-muted-foreground mt-1">
              Create a new document submission for tracking
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Submission Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Project & Building */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="projectId">
                    Project <span className="text-destructive">*</span>
                  </Label>
                  <select
                    id="projectId"
                    name="projectId"
                    required
                    value={selectedProject}
                    onChange={(e) => setSelectedProject(e.target.value)}
                    className="w-full h-10 px-3 rounded-md border bg-background"
                    disabled={loading}
                  >
                    <option value="">Select a project</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.projectNumber} - {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="buildingId">Building (Optional)</Label>
                  <select
                    id="buildingId"
                    name="buildingId"
                    value={selectedBuilding}
                    onChange={(e) => setSelectedBuilding(e.target.value)}
                    className="w-full h-10 px-3 rounded-md border bg-background"
                    disabled={loading || !selectedProject}
                  >
                    <option value="">No specific building</option>
                    {buildings.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.designation} - {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Document Type & Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="documentType">
                    Document Type <span className="text-destructive">*</span>
                  </Label>
                  <div className="text-xs text-muted-foreground mb-2">
                    Hold Ctrl (Windows) or Cmd (Mac) to select multiple types
                  </div>
                  <select
                    id="documentType"
                    name="documentType"
                    multiple
                    value={selectedDocTypes}
                    onChange={(e) => {
                      const selected = Array.from(e.target.selectedOptions, option => option.value);
                      setSelectedDocTypes(selected);
                    }}
                    className="w-full min-h-[120px] px-3 rounded-md border bg-background"
                    disabled={loading}
                    size={8}
                  >
                    {DOCUMENT_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                  {selectedDocTypes.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {selectedDocTypes.map((type) => (
                        <Badge key={type} variant="secondary" className="text-xs">
                          {type}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="section">Section</Label>
                  <select
                    id="section"
                    name="section"
                    value={selectedSection}
                    onChange={(e) => setSelectedSection(e.target.value)}
                    className="w-full h-10 px-3 rounded-md border bg-background"
                    disabled={loading}
                  >
                    <option value="">Select section</option>
                    {SECTION_OPTIONS.map((section) => (
                      <option key={section} value={section}>
                        {section}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">
                  Document Title (Auto-generated)
                </Label>
                <Input
                  id="title"
                  name="title"
                  value={autoTitle}
                  readOnly
                  className="bg-muted/50 cursor-not-allowed"
                  placeholder="Auto-generated from project, building, section, handler, revision, and client code"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  rows={3}
                  placeholder="Additional details about the document"
                  disabled={loading}
                />
              </div>

              {/* Revision & Handled By */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="revision">Revision</Label>
                  <Input
                    id="revision"
                    name="revision"
                    value={selectedRevision}
                    onChange={(e) => setSelectedRevision(e.target.value)}
                    placeholder="e.g., R0, R1, R2"
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="handledBy">Handled By (Developer/Engineer)</Label>
                  <select
                    id="handledBy"
                    name="handledBy"
                    value={selectedHandler}
                    onChange={(e) => setSelectedHandler(e.target.value)}
                    className="w-full h-10 px-3 rounded-md border bg-background"
                    disabled={loading}
                  >
                    <option value="">Select user</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} {u.position ? `(${u.position})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dates */}
              <div className="space-y-2">
                <Label htmlFor="submissionDate">
                  Submission Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="submissionDate"
                  name="submissionDate"
                  type="date"
                  required
                  defaultValue={new Date().toISOString().split('T')[0]}
                  disabled={loading}
                />
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label htmlFor="status">
                  Status <span className="text-destructive">*</span>
                </Label>
                <select
                  id="status"
                  name="status"
                  required
                  className="w-full h-10 px-3 rounded-md border bg-background"
                  disabled={loading}
                >
                  <option value="">Select Status</option>
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>

              {/* Client Code & Response Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="clientCode">Client Code</Label>
                  <select
                    id="clientCode"
                    name="clientCode"
                    value={selectedClientCode}
                    onChange={(e) => setSelectedClientCode(e.target.value)}
                    className="w-full h-10 px-3 rounded-md border bg-background"
                    disabled={loading}
                  >
                    <option value="">No Code Yet</option>
                    {CLIENT_CODE_OPTIONS.map((option) => (
                      <option key={option.code} value={option.code}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="clientResponseDate">Client Response Date</Label>
                  <Input
                    id="clientResponseDate"
                    name="clientResponseDate"
                    type="date"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Tonnage */}
              <div className="space-y-2">
                <Label htmlFor="tonnage">Tonnage (tons)</Label>
                <Input
                  id="tonnage"
                  name="tonnage"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  disabled={loading}
                />
              </div>

              {/* Remarks */}
              <div className="space-y-2">
                <Label htmlFor="remarks">Remarks</Label>
                <Textarea
                  id="remarks"
                  name="remarks"
                  rows={3}
                  placeholder="Additional notes and comments"
                  disabled={loading}
                />
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-4 mt-6">
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Create Submission
                </>
              )}
            </Button>
            <Link href="/document-timeline">
              <Button type="button" variant="outline" disabled={loading}>
                Cancel
              </Button>
            </Link>
          </div>
        </form>
    </div>
  );
}
