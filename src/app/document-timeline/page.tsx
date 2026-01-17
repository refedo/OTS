'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Plus,
  Filter,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Eye,
  Edit,
  Trash2,
  Save,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Upload,
} from 'lucide-react';
import { ImportModal } from '@/components/ImportModal';
import Link from 'next/link';

type DocumentSubmission = {
  id: string;
  submissionNumber: string;
  projectId: string;
  buildingId: string | null;
  documentType: string;
  section: string | null;
  title: string;
  revision: string;
  submissionDate: string;
  reviewDueDate: string | null;
  approvalDate: string | null;
  status: string;
  clientCode: string | null;
  clientResponse: string | null;
  daysCount: number | null;
  project: {
    id: string;
    projectNumber: string;
    name: string;
  };
  building: {
    id: string;
    designation: string;
    name: string;
  } | null;
  handler: {
    id: string;
    name: string;
    position: string | null;
  } | null;
  submitter: {
    id: string;
    name: string;
    position: string | null;
  };
  revisions: any[];
};

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

const STATUS_COLORS: Record<string, string> = {
  'Released': 'bg-green-100 text-green-800',
  'Hold': 'bg-red-100 text-red-800',
  'Submitted for approval': 'bg-blue-100 text-blue-800',
  'In progress': 'bg-yellow-100 text-yellow-800',
  'Submitted to get code A': 'bg-purple-100 text-purple-800',
  'Submitted for clarification': 'bg-orange-100 text-orange-800',
};

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
  'Detailing',
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

export default function DocumentTimelinePage() {
  const [submissions, setSubmissions] = useState<DocumentSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filterProject, setFilterProject] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSection, setFilterSection] = useState('');
  const [filterHandledBy, setFilterHandledBy] = useState('');
  const [filterBuilding, setFilterBuilding] = useState('');
  const [projects, setProjects] = useState<any[]>([]);
  const [buildings, setBuildings] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingRevisionFor, setAddingRevisionFor] = useState<string | null>(null);
  const [sortField, setSortField] = useState<string>('submissionDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [newRevisionData, setNewRevisionData] = useState({
    revision: '',
    submissionDate: new Date().toISOString().split('T')[0],
    status: '',
    handledBy: '',
    documentType: [] as string[],
    comments: '',
  });
  const [showImportModal, setShowImportModal] = useState(false);
  const [importProjectId, setImportProjectId] = useState('');

  const downloadTemplate = () => {
    const headers = [
      'Project Number',
      'Building Name',
      'Title',
      'Document Type',
      'Section',
      'Revision',
      'Submission Date',
      'Review Due Date',
      'Approval Date',
      'Status',
      'Client Code',
      'Client Response',
      'Handler',
      'Submitter'
    ];
    const csvContent = headers.join(',') + '\n';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'document-submissions-template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  useEffect(() => {
    fetchProjects();
    fetchUsers();
    fetchSubmissions();
  }, []);

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

  const fetchBuildingsForProject = async (projectId: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/buildings`);
      if (res.ok) {
        const data = await res.json();
        setBuildings(prev => {
          const filtered = prev.filter(b => b.projectId !== projectId);
          return [...filtered, ...data];
        });
      }
    } catch (error) {
      console.error('Error fetching buildings:', error);
    }
  };

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterProject) params.append('projectId', filterProject);
      if (filterType) params.append('documentType', filterType);
      if (filterStatus) params.append('status', filterStatus);

      const res = await fetch(`/api/document-submissions?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        // Flatten submissions to include revisions as separate rows
        const flattenedData: any[] = [];
        data.forEach((submission: any) => {
          // Add the main submission (keep original revision and title)
          flattenedData.push({
            ...submission,
            isMainSubmission: true,
            displayRevision: submission.revision,
            originalTitle: submission.title, // Store original title
          });
          // Add each revision as a separate row
          if (submission.revisions && submission.revisions.length > 0) {
            submission.revisions.forEach((revision: any) => {
              // Generate title for this specific revision
              const revisionSubmission = {
                ...submission,
                revision: revision.revision,
                handler: revision.handler || submission.handler,
                documentType: revision.documentType || submission.documentType,
              };
              
              flattenedData.push({
                ...submission,
                id: `${submission.id}-rev-${revision.id}`,
                originalId: submission.id,
                revisionId: revision.id,
                isRevision: true,
                displayRevision: revision.revision,
                title: generateDocumentTitle(revisionSubmission), // Generate title for this revision
                submissionDate: revision.submissionDate,
                status: revision.status,
                clientResponse: null, // Keep empty for revisions
                clientCode: null, // Keep empty for revisions
                clientResponseDate: null, // Keep empty for revisions
                comments: revision.comments,
                clientComments: revision.clientComments,
                approvalDate: revision.approvalDate,
                submitter: revision.submitter,
                handler: revision.handler || submission.handler,
              });
            });
          }
        });
        setSubmissions(flattenedData);
      }
    } catch (error) {
      console.error('Error fetching submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter submissions
  const filteredSubmissions = submissions.filter((submission) => {
    if (filterSection && submission.section !== filterSection) return false;
    if (filterHandledBy && submission.handler?.id !== filterHandledBy) return false;
    if (filterBuilding && submission.buildingId !== filterBuilding) return false;
    return true;
  });

  // Sort submissions
  const sortedSubmissions = [...filteredSubmissions].sort((a, b) => {
    let aValue: any;
    let bValue: any;

    // Handle nested objects and special fields
    switch (sortField) {
      case 'project':
        aValue = a.project?.name || '';
        bValue = b.project?.name || '';
        break;
      case 'building':
        aValue = a.building?.designation || '';
        bValue = b.building?.designation || '';
        break;
      case 'handler':
        aValue = a.handler?.name || '';
        bValue = b.handler?.name || '';
        break;
      case 'revision':
      case 'displayRevision':
        // Extract number from R0, R1, etc.
        const aRev = ((a as any).displayRevision || a.revision || '').replace(/\D/g, '');
        const bRev = ((b as any).displayRevision || b.revision || '').replace(/\D/g, '');
        aValue = parseInt(aRev) || 0;
        bValue = parseInt(bRev) || 0;
        break;
      case 'daysCount':
        aValue = a.daysCount || 0;
        bValue = b.daysCount || 0;
        break;
      default:
        aValue = a[sortField as keyof DocumentSubmission];
        bValue = b[sortField as keyof DocumentSubmission];
    }

    if (aValue === null || aValue === undefined) return 1;
    if (bValue === null || bValue === undefined) return -1;

    if (sortOrder === 'asc') {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
    }
  });

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, [filterProject, filterType, filterStatus, filterSection, filterHandledBy, filterBuilding]);

  const addNewSubmission = () => {
    const newSubmission: any = {
      id: `temp-${Date.now()}`,
      submissionNumber: 'NEW',
      projectId: '',
      buildingId: null,
      documentType: '',
      section: '',
      title: '',
      revision: 'R0',
      submissionDate: new Date().toISOString().split('T')[0],
      reviewDueDate: null,
      approvalDate: null,
      status: '', // Empty status - must be selected
      clientCode: null,
      clientResponse: null,
      clientResponseDate: null,
      daysCount: null,
      tonnage: null,
      remarks: null,
      handledBy: null,
      isNew: true,
      project: { id: '', projectNumber: '', name: '' },
      building: null,
      handler: null,
      submitter: { id: '', name: '', position: null },
      revisions: [],
    };
    setSubmissions([newSubmission, ...submissions]);
  };

  const updateSubmission = (id: string, field: string, value: any) => {
    setSubmissions(prev => prev.map(s => {
      if (s.id === id) {
        const updated = { ...s, [field]: value };
        
        // If project changes, reset building and fetch buildings
        if (field === 'projectId' && value) {
          updated.buildingId = null;
          fetchBuildingsForProject(value);
          const project = projects.find(p => p.id === value);
          if (project) {
            updated.project = {
              id: project.id,
              projectNumber: project.projectNumber,
              name: project.name,
            };
          }
        }
        
        // If building changes, update building object
        if (field === 'buildingId' && value) {
          const building = buildings.find(b => b.id === value);
          if (building) {
            updated.building = {
              id: building.id,
              designation: building.designation,
              name: building.name,
            };
          }
        }
        
        // If handler changes, update handler object
        if (field === 'handledBy' && value) {
          const user = users.find(u => u.id === value);
          if (user) {
            updated.handler = {
              id: user.id,
              name: user.name,
              position: user.position,
            };
          }
        }
        
        // Auto-generate title when relevant fields change
        if (['projectId', 'buildingId', 'section', 'handledBy', 'revision', 'clientCode'].includes(field)) {
          updated.title = generateDocumentTitle(updated);
        }
        
        return updated;
      }
      return s;
    }));
  };

  const saveSubmission = async (id: string) => {
    const submission = submissions.find(s => s.id === id);
    if (!submission || !(submission as any).isNew) return;

    // Validate required fields
    if (!submission.projectId) {
      alert('Please select a project');
      return;
    }
    if (!submission.documentType) {
      alert('Please select at least one document type');
      return;
    }
    if (!submission.status) {
      alert('Please select a status');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/document-submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: submission.projectId,
          buildingId: submission.buildingId || null,
          documentType: submission.documentType,
          section: submission.section || null,
          title: submission.title,
          revision: submission.revision || 'R0',
          handledBy: (submission as any).handledBy || null,
          submissionDate: submission.submissionDate,
          reviewDueDate: submission.reviewDueDate || null,
          status: submission.status,
          clientCode: submission.clientCode || null,
          internalComments: (submission as any).remarks || null,
        }),
      });

      if (res.ok) {
        const savedSubmission = await res.json();
        setSubmissions(prev => prev.map(s =>
          s.id === id ? { ...savedSubmission, isNew: false } : s
        ));
        alert('Submission saved successfully!');
      } else {
        const error = await res.json();
        console.error('Server error response:', error);
        const errorMessage = error.message || error.error || 'Unknown error';
        const errorDetails = error.details ? JSON.stringify(error.details, null, 2) : '';
        alert(`Failed to create document submission\n\nError: ${errorMessage}\n\n${errorDetails}`);
      }
    } catch (error) {
      console.error('Error saving submission:', error);
      alert(`Failed to save submission\n\nError: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const removeSubmission = (id: string) => {
    setSubmissions(prev => prev.filter(s => s.id !== id));
  };

  const deleteSubmission = async (id: string, submissionNumber: string) => {
    if (!confirm(`Are you sure you want to delete submission ${submissionNumber}? This action cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/document-submissions/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setSubmissions(prev => prev.filter(s => s.id !== id));
        alert('Submission deleted successfully!');
      } else {
        const error = await res.json();
        console.error('Server error response:', error);
        const errorMessage = error.message || error.error || 'Unknown error';
        alert(`Failed to delete submission\n\nError: ${errorMessage}`);
      }
    } catch (error) {
      console.error('Error deleting submission:', error);
      alert(`Failed to delete submission\n\nError: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const deleteRevision = async (originalId: string, revisionId: string, revisionNumber: string) => {
    if (!confirm(`Are you sure you want to delete revision ${revisionNumber}? This action cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/document-submissions/${originalId}/revisions/${revisionId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        fetchSubmissions(); // Reload to refresh the list
        alert('Revision deleted successfully!');
      } else {
        const error = await res.json();
        console.error('Server error response:', error);
        const errorMessage = error.message || error.error || 'Unknown error';
        alert(`Failed to delete revision\n\nError: ${errorMessage}`);
      }
    } catch (error) {
      console.error('Error deleting revision:', error);
      alert(`Failed to delete revision\n\nError: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const startEditing = (id: string) => {
    setEditingId(id);
    const submission = submissions.find(s => s.id === id);
    if (submission?.projectId) {
      fetchBuildingsForProject(submission.projectId);
    }
  };

  const cancelEditing = () => {
    setEditingId(null);
    fetchSubmissions(); // Reload to discard changes
  };

  const saveEdit = async (id: string) => {
    const submission = submissions.find(s => s.id === id);
    if (!submission) return;

    // Check if this is a revision
    const isRevision = (submission as any).isRevision;
    const originalId = (submission as any).originalId;
    const revisionId = (submission as any).revisionId;

    // Validate required fields
    if (!submission.status) {
      alert('Please select a status');
      return;
    }

    setSaving(true);
    try {
      const updateData: any = {
        status: submission.status,
        clientCode: submission.clientCode || null,
      };

      // Add optional fields if they exist
      if ((submission as any).clientResponseDate) {
        updateData.approvalDate = (submission as any).clientResponseDate;
      }
      if ((submission as any).remarks) {
        if (isRevision) {
          updateData.comments = (submission as any).remarks;
        } else {
          updateData.internalComments = (submission as any).remarks;
        }
      }

      // Use different endpoint for revisions
      const endpoint = isRevision 
        ? `/api/document-submissions/${originalId}/revisions/${revisionId}`
        : `/api/document-submissions/${id}`;

      const res = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      if (res.ok) {
        await res.json(); // Consume response
        setEditingId(null);
        await fetchSubmissions(); // Reload all data to get updated values
        alert('Submission updated successfully!');
      } else {
        const error = await res.json();
        console.error('Server error response:', error);
        const errorMessage = error.message || error.error || 'Unknown error';
        alert(`Failed to update submission\n\nError: ${errorMessage}`);
      }
    } catch (error) {
      console.error('Error updating submission:', error);
      alert(`Failed to update submission\n\nError: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const startAddingRevision = (submissionId: string) => {
    const submission = submissions.find(s => s.id === submissionId);
    if (!submission) return;

    // Calculate next revision number
    const allRevisions = [submission.revision, ...(submission.revisions || []).map((r: any) => r.revision)];
    let maxRevisionNumber = -1;
    allRevisions.forEach(rev => {
      const match = rev.match(/R(\d+)/);
      if (match) {
        const num = parseInt(match[1]);
        if (num > maxRevisionNumber) {
          maxRevisionNumber = num;
        }
      }
    });

    setNewRevisionData({
      revision: `R${maxRevisionNumber + 1}`,
      submissionDate: new Date().toISOString().split('T')[0],
      status: '',
      handledBy: (submission as any).handledBy || '',
      documentType: submission.documentType ? submission.documentType.split(', ') : [],
      comments: '',
    });
    setAddingRevisionFor(submissionId);
  };

  const cancelAddingRevision = () => {
    setAddingRevisionFor(null);
    setNewRevisionData({
      revision: '',
      submissionDate: new Date().toISOString().split('T')[0],
      status: '',
      handledBy: '',
      documentType: [],
      comments: '',
    });
  };

  const saveRevision = async (submissionId: string) => {
    if (!newRevisionData.status) {
      alert('Please select a status');
      return;
    }

    const submission = submissions.find(s => s.id === submissionId);
    if (!submission) return;

    // Validate revision date is not before the last submission/revision date
    const allDates = [
      submission.submissionDate,
      ...(submission.revisions || []).map((r: any) => r.submissionDate)
    ];
    const latestDate = new Date(Math.max(...allDates.map((d: string) => new Date(d).getTime())));
    const revisionDate = new Date(newRevisionData.submissionDate);
    
    if (revisionDate < latestDate) {
      alert(`Revision date cannot be before the latest submission date (${latestDate.toLocaleDateString('en-GB')})`);
      return;
    }

    setSaving(true);
    try {

      // Prepare revision data
      const revisionPayload = {
        ...newRevisionData,
        documentType: newRevisionData.documentType.join(', '),
      };

      const res = await fetch(`/api/document-submissions/${submissionId}/revisions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(revisionPayload),
      });

      if (res.ok) {
        // Update main submission title with new revision parameters
        const updatedSubmission = {
          ...submission,
          revision: newRevisionData.revision,
          handler: newRevisionData.handledBy ? users.find(u => u.id === newRevisionData.handledBy) : submission.handler,
          documentType: newRevisionData.documentType.join(', '),
        };
        const newTitle = generateDocumentTitle(updatedSubmission);

        // Update main submission with new title
        await fetch(`/api/document-submissions/${submissionId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: newTitle,
          }),
        });

        await fetchSubmissions();
        setAddingRevisionFor(null);
        alert('Revision added successfully!');
      } else {
        const error = await res.json();
        console.error('Server error response:', error);
        const errorMessage = error.message || error.error || 'Unknown error';
        alert(`Failed to add revision\n\nError: ${errorMessage}`);
      }
    } catch (error) {
      console.error('Error adding revision:', error);
      alert(`Failed to add revision\n\nError: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  const calculateDaysCount = (submissionDate: string, responseDate: string | null) => {
    if (!responseDate) return null;
    const start = new Date(submissionDate);
    const end = new Date(responseDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const generateDocumentTitle = (submission: any) => {
    const parts = [];
    
    // Project Number
    if (submission.project?.projectNumber) {
      parts.push(submission.project.projectNumber);
    }
    
    // Building Extension
    if (submission.building?.designation) {
      parts.push(submission.building.designation);
    }
    
    // Section Code (3 letters, 4 for Procurement/Production)
    if (submission.section) {
      let sectionCode = '';
      const section = submission.section.toLowerCase();
      
      // Special cases: Procurement and Production need 4 letters
      if (section.includes('procurement')) {
        sectionCode = 'PROC';
      } else if (section.includes('production')) {
        sectionCode = 'PROD';
      } else {
        // Default: first 3 letters of the section name
        const sectionName = submission.section
          .split(/[\s-]+/)[0] // Get first word
          .replace(/[^a-zA-Z]/g, ''); // Remove non-letters
        sectionCode = sectionName.substring(0, 3).toUpperCase();
      }
      
      parts.push(sectionCode);
    }
    
    // Handler Initials
    if (submission.handler?.name) {
      const initials = submission.handler.name
        .split(' ')
        .map((word: string) => word.charAt(0).toUpperCase())
        .join('');
      parts.push(initials);
    }
    
    // Revision
    if (submission.revision) {
      parts.push(submission.revision);
    }
    
    // Client Code (extract code letter)
    if (submission.clientCode) {
      const codeMatch = submission.clientCode.match(/Code ([ABC])/);
      if (codeMatch) {
        parts.push(codeMatch[1]);
      }
    }
    
    return parts.length > 0 ? parts.join('-') : '';
  };

  const getStatusIcon = (status: string) => {
    if (status.includes('Approved')) return <CheckCircle className="h-4 w-4" />;
    if (status.includes('Rejected')) return <XCircle className="h-4 w-4" />;
    if (status.includes('Review')) return <Clock className="h-4 w-4" />;
    return <AlertCircle className="h-4 w-4" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <FileText className="h-8 w-8" />
              Document Controlling Timeline
            </h1>
            <p className="text-muted-foreground mt-1">
              Track submission, review, approval, and client responses for all project documentation
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={addNewSubmission}>
              <Plus className="h-4 w-4 mr-2" />
              Quick Add
            </Button>
            <Button variant="outline" onClick={downloadTemplate}>
              <FileText className="h-4 w-4 mr-2" />
              Download Template
            </Button>
            <Button variant="outline" onClick={() => setShowImportModal(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Import
            </Button>
            <Link href="/document-timeline/new">
              <Button variant="outline">
                <FileText className="h-4 w-4 mr-2" />
                New Form
              </Button>
            </Link>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Project</Label>
                <select
                  value={filterProject}
                  onChange={(e) => setFilterProject(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border bg-background"
                >
                  <option value="">All Projects</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.projectNumber} - {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label>Building</Label>
                <select
                  value={filterBuilding}
                  onChange={(e) => setFilterBuilding(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border bg-background"
                >
                  <option value="">All Buildings</option>
                  {buildings.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.designation} - {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label>Section</Label>
                <select
                  value={filterSection}
                  onChange={(e) => setFilterSection(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border bg-background"
                >
                  <option value="">All Sections</option>
                  {SECTION_OPTIONS.map((section) => (
                    <option key={section} value={section}>
                      {section}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label>Document Type</Label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border bg-background"
                >
                  <option value="">All Types</option>
                  {DOCUMENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label>Handled By</Label>
                <select
                  value={filterHandledBy}
                  onChange={(e) => setFilterHandledBy(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border bg-background"
                >
                  <option value="">All Handlers</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} {user.position ? `(${user.position})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border bg-background"
                >
                  <option value="">All Statuses</option>
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submissions Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading submissions...</p>
                </div>
              </div>
            ) : submissions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center p-6">
                <FileText className="h-16 w-16 text-muted-foreground/20 mb-4" />
                <p className="text-lg font-semibold mb-2">No document submissions found</p>
                <p className="text-muted-foreground mb-4">
                  Create your first submission to start tracking documents
                </p>
                <Link href="/document-timeline/new">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Submission
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        <button
                          onClick={() => handleSort('submissionNumber')}
                          className="flex items-center gap-1 hover:text-primary transition-colors"
                        >
                          Submission #
                          {sortField === 'submissionNumber' ? (
                            sortOrder === 'asc' ? <ArrowUp className="size-4" /> : <ArrowDown className="size-4" />
                          ) : (
                            <ArrowUpDown className="size-4 opacity-50" />
                          )}
                        </button>
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        <button
                          onClick={() => handleSort('project')}
                          className="flex items-center gap-1 hover:text-primary transition-colors"
                        >
                          Project
                          {sortField === 'project' ? (
                            sortOrder === 'asc' ? <ArrowUp className="size-4" /> : <ArrowDown className="size-4" />
                          ) : (
                            <ArrowUpDown className="size-4 opacity-50" />
                          )}
                        </button>
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        <button
                          onClick={() => handleSort('building')}
                          className="flex items-center gap-1 hover:text-primary transition-colors"
                        >
                          Building
                          {sortField === 'building' ? (
                            sortOrder === 'asc' ? <ArrowUp className="size-4" /> : <ArrowDown className="size-4" />
                          ) : (
                            <ArrowUpDown className="size-4 opacity-50" />
                          )}
                        </button>
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        <button
                          onClick={() => handleSort('section')}
                          className="flex items-center gap-1 hover:text-primary transition-colors"
                        >
                          Section
                          {sortField === 'section' ? (
                            sortOrder === 'asc' ? <ArrowUp className="size-4" /> : <ArrowDown className="size-4" />
                          ) : (
                            <ArrowUpDown className="size-4 opacity-50" />
                          )}
                        </button>
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        <button
                          onClick={() => handleSort('documentType')}
                          className="flex items-center gap-1 hover:text-primary transition-colors"
                        >
                          Document Type
                          {sortField === 'documentType' ? (
                            sortOrder === 'asc' ? <ArrowUp className="size-4" /> : <ArrowDown className="size-4" />
                          ) : (
                            <ArrowUpDown className="size-4 opacity-50" />
                          )}
                        </button>
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        <button
                          onClick={() => handleSort('title')}
                          className="flex items-center gap-1 hover:text-primary transition-colors"
                        >
                          Title
                          {sortField === 'title' ? (
                            sortOrder === 'asc' ? <ArrowUp className="size-4" /> : <ArrowDown className="size-4" />
                          ) : (
                            <ArrowUpDown className="size-4 opacity-50" />
                          )}
                        </button>
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        <button
                          onClick={() => handleSort('displayRevision')}
                          className="flex items-center gap-1 hover:text-primary transition-colors"
                        >
                          Revision
                          {sortField === 'displayRevision' ? (
                            sortOrder === 'asc' ? <ArrowUp className="size-4" /> : <ArrowDown className="size-4" />
                          ) : (
                            <ArrowUpDown className="size-4 opacity-50" />
                          )}
                        </button>
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        <button
                          onClick={() => handleSort('handler')}
                          className="flex items-center gap-1 hover:text-primary transition-colors"
                        >
                          Handled By
                          {sortField === 'handler' ? (
                            sortOrder === 'asc' ? <ArrowUp className="size-4" /> : <ArrowDown className="size-4" />
                          ) : (
                            <ArrowUpDown className="size-4 opacity-50" />
                          )}
                        </button>
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        <button
                          onClick={() => handleSort('submissionDate')}
                          className="flex items-center gap-1 hover:text-primary transition-colors"
                        >
                          Submission Date
                          {sortField === 'submissionDate' ? (
                            sortOrder === 'asc' ? <ArrowUp className="size-4" /> : <ArrowDown className="size-4" />
                          ) : (
                            <ArrowUpDown className="size-4 opacity-50" />
                          )}
                        </button>
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        <button
                          onClick={() => handleSort('status')}
                          className="flex items-center gap-1 hover:text-primary transition-colors"
                        >
                          Status
                          {sortField === 'status' ? (
                            sortOrder === 'asc' ? <ArrowUp className="size-4" /> : <ArrowDown className="size-4" />
                          ) : (
                            <ArrowUpDown className="size-4 opacity-50" />
                          )}
                        </button>
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        <button
                          onClick={() => handleSort('clientCode')}
                          className="flex items-center gap-1 hover:text-primary transition-colors"
                        >
                          Client Code
                          {sortField === 'clientCode' ? (
                            sortOrder === 'asc' ? <ArrowUp className="size-4" /> : <ArrowDown className="size-4" />
                          ) : (
                            <ArrowUpDown className="size-4 opacity-50" />
                          )}
                        </button>
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        <button
                          onClick={() => handleSort('clientResponseDate')}
                          className="flex items-center gap-1 hover:text-primary transition-colors"
                        >
                          Client Response Date
                          {sortField === 'clientResponseDate' ? (
                            sortOrder === 'asc' ? <ArrowUp className="size-4" /> : <ArrowDown className="size-4" />
                          ) : (
                            <ArrowUpDown className="size-4 opacity-50" />
                          )}
                        </button>
                      </th>
                      <th className="px-4 py-3 text-center text-sm font-semibold">
                        <button
                          onClick={() => handleSort('daysCount')}
                          className="flex items-center gap-1 hover:text-primary transition-colors mx-auto"
                        >
                          Days Count
                          {sortField === 'daysCount' ? (
                            sortOrder === 'asc' ? <ArrowUp className="size-4" /> : <ArrowDown className="size-4" />
                          ) : (
                            <ArrowUpDown className="size-4 opacity-50" />
                          )}
                        </button>
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Tonnage</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Remarks</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedSubmissions.map((submission, index) => {
                      const isNew = (submission as any).isNew;
                      const isRevision = (submission as any).isRevision;
                      const isMainSubmission = (submission as any).isMainSubmission;
                      const isEditing = editingId === submission.id;
                      const projectBuildings = buildings.filter(b => b.projectId === submission.projectId);
                      
                      // Determine row color based on client code
                      let rowColorClass = '';
                      if (submission.clientCode) {
                        if (submission.clientCode.includes('Code A') || submission.clientCode.includes('01')) {
                          rowColorClass = 'bg-green-100 hover:bg-green-200';
                        } else if (submission.clientCode.includes('Code B') || submission.clientCode.includes('02')) {
                          rowColorClass = 'bg-orange-100 hover:bg-orange-200';
                        } else if (submission.clientCode.includes('Code C') || submission.clientCode.includes('03')) {
                          rowColorClass = 'bg-red-100 hover:bg-red-200';
                        }
                      }
                      
                      return (
                      <React.Fragment key={submission.id}>
                      <tr
                        key={submission.id}
                        className={`border-b transition-colors ${
                          rowColorClass || (index % 2 === 0 ? 'bg-white hover:bg-muted/30' : 'bg-muted/10 hover:bg-muted/30')
                        } ${isNew ? 'bg-blue-50' : ''} ${isEditing ? 'bg-yellow-50' : ''} ${isRevision ? 'border-l-4 border-l-blue-400' : ''}`}
                      >
                        <td className="px-4 py-3">
                          <span className="font-mono text-sm font-semibold">
                            {submission.submissionNumber}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {isNew ? (
                            <select
                              value={submission.projectId}
                              onChange={(e) => updateSubmission(submission.id, 'projectId', e.target.value)}
                              className="w-full h-9 px-2 rounded border bg-background text-sm"
                            >
                              <option value="">Select Project</option>
                              {projects.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.projectNumber} - {p.name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <div>
                              <div className="font-medium text-sm">{submission.project.projectNumber}</div>
                              <div className="text-xs text-muted-foreground truncate max-w-[150px]">
                                {submission.project.name}
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {isNew ? (
                            <select
                              value={submission.buildingId || ''}
                              onChange={(e) => updateSubmission(submission.id, 'buildingId', e.target.value || null)}
                              className="w-full h-9 px-2 rounded border bg-background text-sm"
                              disabled={!submission.projectId}
                            >
                              <option value="">No Building</option>
                              {projectBuildings.map((b) => (
                                <option key={b.id} value={b.id}>
                                  {b.designation}
                                </option>
                              ))}
                            </select>
                          ) : submission.building ? (
                            <Badge variant="outline">{submission.building.designation}</Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {isNew ? (
                            <select
                              value={submission.section || ''}
                              onChange={(e) => updateSubmission(submission.id, 'section', e.target.value)}
                              className="w-full h-9 px-2 rounded border bg-background text-sm"
                            >
                              <option value="">Select Section</option>
                              {SECTION_OPTIONS.map((section) => (
                                <option key={section} value={section}>
                                  {section}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-sm">{submission.section || '-'}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {isNew ? (
                            <select
                              multiple
                              value={submission.documentType ? submission.documentType.split(', ') : []}
                              onChange={(e) => {
                                const selected = Array.from(e.target.selectedOptions, option => option.value);
                                updateSubmission(submission.id, 'documentType', selected.join(', '));
                              }}
                              className="w-full min-h-[80px] px-2 rounded border bg-background text-sm"
                              size={5}
                            >
                              {DOCUMENT_TYPES.map((type) => (
                                <option key={type} value={type}>
                                  {type}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <div className="text-sm max-w-[200px]">
                              {submission.documentType.split(', ').map((type, idx) => (
                                <Badge key={idx} variant="outline" className="mr-1 mb-1">
                                  {type}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {isNew ? (
                            <Input
                              value={submission.title}
                              readOnly
                              className="h-9 text-sm bg-muted/50 cursor-not-allowed"
                              placeholder="Auto-generated"
                              title="Title is auto-generated from project, building, section, handler, revision, and client code"
                            />
                          ) : (
                            <div className="max-w-[200px] truncate text-sm" title={submission.title}>
                              {submission.title}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {isNew ? (
                            <Input
                              value={submission.revision}
                              onChange={(e) => updateSubmission(submission.id, 'revision', e.target.value)}
                              className="h-9 text-sm w-20"
                              placeholder="R0"
                            />
                          ) : (
                            <Badge variant={isRevision ? "outline" : "secondary"}>
                              {(submission as any).displayRevision || submission.revision}
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {isNew ? (
                            <select
                              value={(submission as any).handledBy || ''}
                              onChange={(e) => updateSubmission(submission.id, 'handledBy', e.target.value || null)}
                              className="w-full h-9 px-2 rounded border bg-background text-sm"
                            >
                              <option value="">Not Assigned</option>
                              {users.map((u) => (
                                <option key={u.id} value={u.id}>
                                  {u.name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-sm">{submission.handler?.name || '-'}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {isNew ? (
                            <Input
                              type="date"
                              value={submission.submissionDate}
                              onChange={(e) => updateSubmission(submission.id, 'submissionDate', e.target.value)}
                              className="h-9 text-sm"
                            />
                          ) : (
                            <span className="text-sm">{formatDate(submission.submissionDate)}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {isNew || isEditing ? (
                            <select
                              value={submission.status}
                              onChange={(e) => updateSubmission(submission.id, 'status', e.target.value)}
                              className="w-full h-9 px-2 rounded border bg-background text-sm"
                            >
                              <option value="">Select Status</option>
                              {STATUS_OPTIONS.map((status) => (
                                <option key={status} value={status}>
                                  {status}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <Badge className={STATUS_COLORS[submission.status] || 'bg-gray-100 text-gray-800'}>
                              <span className="flex items-center gap-1">
                                {getStatusIcon(submission.status)}
                                {submission.status}
                              </span>
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {isNew || isEditing ? (
                            <select
                              value={submission.clientCode || ''}
                              onChange={(e) => updateSubmission(submission.id, 'clientCode', e.target.value)}
                              className="w-full h-9 px-2 rounded border bg-background text-sm"
                            >
                              <option value="">No Code Yet</option>
                              {CLIENT_CODE_OPTIONS.map((option) => (
                                <option key={option.code} value={option.code}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          ) : submission.clientCode ? (
                            <Badge
                              variant={
                                submission.clientCode.includes('Code A')
                                  ? 'default'
                                  : submission.clientCode.includes('Code B')
                                  ? 'secondary'
                                  : 'destructive'
                              }
                            >
                              {submission.clientCode}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {isNew || isEditing ? (
                            <Input
                              type="date"
                              value={(submission as any).clientResponseDate || submission.approvalDate || ''}
                              onChange={(e) => updateSubmission(submission.id, 'clientResponseDate', e.target.value)}
                              className="h-9 text-sm"
                            />
                          ) : (
                            <span className="text-sm">{formatDate(submission.approvalDate)}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {(() => {
                            const days = calculateDaysCount(submission.submissionDate, submission.approvalDate);
                            return days !== null ? (
                              <span className="font-semibold text-primary">{days} days</span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            );
                          })()}
                        </td>
                        <td className="px-4 py-3">
                          {isNew || isEditing ? (
                            <Input
                              type="number"
                              step="0.01"
                              value={(submission as any).tonnage || ''}
                              onChange={(e) => updateSubmission(submission.id, 'tonnage', e.target.value)}
                              className="h-9 text-sm w-24"
                              placeholder="0.00"
                            />
                          ) : (
                            <span className="text-sm">{(submission as any).tonnage || '-'}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {isNew || isEditing ? (
                            <Input
                              value={(submission as any).remarks || ''}
                              onChange={(e) => updateSubmission(submission.id, 'remarks', e.target.value)}
                              className="h-9 text-sm"
                              placeholder="Remarks"
                            />
                          ) : (
                            <span className="text-sm">{(submission as any).remarks || '-'}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            {isNew ? (
                              <>
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => saveSubmission(submission.id)}
                                  disabled={saving}
                                >
                                  <Save className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeSubmission(submission.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </>
                            ) : isEditing ? (
                              <>
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => saveEdit(submission.id)}
                                  disabled={saving}
                                  title="Save Changes"
                                  className="min-w-[80px]"
                                >
                                  <Save className="h-4 w-4 mr-1" />
                                  Save
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={cancelEditing}
                                  title="Cancel"
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </>
                            ) : isRevision ? (
                              <>
                                <Link href={`/document-timeline/${(submission as any).originalId}`}>
                                  <Button variant="ghost" size="sm" title="View Parent Submission">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </Link>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => startEditing(submission.id)}
                                  title="Edit Revision"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteRevision(
                                    (submission as any).originalId,
                                    (submission as any).revisionId,
                                    (submission as any).displayRevision
                                  )}
                                  title="Delete Revision"
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Link href={`/document-timeline/${submission.id}`}>
                                  <Button variant="ghost" size="sm" title="View Details">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </Link>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => startAddingRevision(submission.id)}
                                  title="Add Revision"
                                >
                                  <Plus className="h-4 w-4 text-blue-500" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => startEditing(submission.id)}
                                  title="Edit Submission"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteSubmission(submission.id, submission.submissionNumber)}
                                  title="Delete Submission"
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                      {/* Inline Revision Form */}
                      {addingRevisionFor === submission.id && isMainSubmission && (
                        <tr className="bg-blue-50 border-l-4 border-l-blue-500">
                          <td className="px-4 py-3 text-sm font-semibold">
                            Rev {newRevisionData.revision}
                          </td>
                          <td className="px-4 py-3">
                            <select
                              multiple
                              value={newRevisionData.documentType}
                              onChange={(e) => {
                                const selected = Array.from(e.target.selectedOptions, option => option.value);
                                setNewRevisionData({...newRevisionData, documentType: selected});
                              }}
                              className="w-full h-20 px-2 rounded border bg-background text-sm"
                            >
                              {DOCUMENT_TYPES.map((type: string) => (
                                <option key={type} value={type}>
                                  {type}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <select
                              value={newRevisionData.handledBy}
                              onChange={(e) => setNewRevisionData({...newRevisionData, handledBy: e.target.value})}
                              className="w-full h-9 px-2 rounded border bg-background text-sm"
                            >
                              <option value="">Select Handler</option>
                              {users.map((user) => (
                                <option key={user.id} value={user.id}>
                                  {user.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <Input
                              type="date"
                              value={newRevisionData.submissionDate}
                              onChange={(e) => setNewRevisionData({...newRevisionData, submissionDate: e.target.value})}
                              className="h-9 text-sm"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <select
                              value={newRevisionData.status}
                              onChange={(e) => setNewRevisionData({...newRevisionData, status: e.target.value})}
                              className="w-full h-9 px-2 rounded border bg-background text-sm"
                            >
                              <option value="">Select Status</option>
                              {STATUS_OPTIONS.map((status) => (
                                <option key={status} value={status}>
                                  {status}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td colSpan={4} className="px-4 py-3">
                            <Input
                              value={newRevisionData.comments}
                              onChange={(e) => setNewRevisionData({...newRevisionData, comments: e.target.value})}
                              placeholder="Revision comments..."
                              className="h-9 text-sm"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => saveRevision(submission.id)}
                                disabled={saving}
                                title="Save Revision"
                              >
                                <Save className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={cancelAddingRevision}
                                title="Cancel"
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                    );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Import Modal */}
        <ImportModal
          isOpen={showImportModal}
          onClose={() => {
            setShowImportModal(false);
            setImportProjectId('');
            fetchSubmissions();
          }}
          title="Import Document Submissions"
          fields={[
            { key: 'projectNumber', label: 'Project Number', required: true },
            { key: 'buildingName', label: 'Building Name', required: true },
            { key: 'title', label: 'Title', required: true },
            { key: 'documentType', label: 'Document Type' },
            { key: 'section', label: 'Section' },
            { key: 'revision', label: 'Revision' },
            { key: 'submissionDate', label: 'Submission Date' },
            { key: 'reviewDueDate', label: 'Review Due Date' },
            { key: 'approvalDate', label: 'Approval Date' },
            { key: 'status', label: 'Status' },
            { key: 'clientCode', label: 'Client Code' },
            { key: 'clientResponse', label: 'Client Response' },
            { key: 'handler', label: 'Handler' },
            { key: 'submitter', label: 'Submitter' },
          ]}
          onImport={async (data, mapping) => {
            const res = await fetch('/api/document-submissions/import-multi', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ data, mapping }),
            });
            if (!res.ok) {
              const error = await res.json();
              throw new Error(error.message || 'Import failed');
            }
            const result = await res.json();
            return result.results;
          }}
          sampleData="Project Number,Building Name,Title,Document Type,Section,Revision,Submission Date,Status,Handler"
        />

    </div>
  );
}
