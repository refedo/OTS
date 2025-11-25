'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  FileText,
  Calendar,
  User,
  Building2,
  CheckCircle,
  XCircle,
  Clock,
  Edit,
  Plus,
  Save,
} from 'lucide-react';
import Link from 'next/link';

type DocumentSubmission = {
  id: string;
  submissionNumber: string;
  projectId: string;
  buildingId: string | null;
  documentType: string;
  section: string | null;
  title: string;
  description: string | null;
  revision: string;
  submissionDate: string;
  reviewDueDate: string | null;
  approvalDate: string | null;
  clientResponseDate: string | null;
  status: string;
  clientCode: string | null;
  clientResponse: string | null;
  clientComments: string | null;
  internalComments: string | null;
  rejectionReason: string | null;
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
  revisions: Array<{
    id: string;
    revision: string;
    submissionDate: string;
    status: string;
    comments: string | null;
    clientResponse: string | null;
    clientComments: string | null;
    approvalDate: string | null;
    submitter: {
      id: string;
      name: string;
    };
  }>;
};

const STATUS_OPTIONS = [
  'Released',
  'Hold',
  'Submitted for approval',
  'In progress',
  'Submitted to get code A',
  'Submitted for clarification',
];

const CLIENT_RESPONSE_OPTIONS = [
  'Approved',
  'Approved with Comments',
  'Rejected',
  'Resubmit',
];

export default function DocumentSubmissionDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [submission, setSubmission] = useState<DocumentSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [showRevisionForm, setShowRevisionForm] = useState(false);
  const [nextRevision, setNextRevision] = useState('');

  useEffect(() => {
    fetchSubmission();
  }, [params.id]);

  useEffect(() => {
    if (submission) {
      // Calculate next revision number based on all revisions
      const allRevisions = [submission.revision, ...submission.revisions.map(r => r.revision)];
      
      // Find the highest revision number
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
      
      // Next revision is max + 1
      setNextRevision(`R${maxRevisionNumber + 1}`);
    }
  }, [submission]);

  const fetchSubmission = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/document-submissions/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setSubmission(data);
      } else {
        alert('Failed to load submission');
        router.push('/document-timeline');
      }
    } catch (error) {
      console.error('Error fetching submission:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setUpdating(true);

    const formData = new FormData(e.currentTarget);
    const data: any = {
      status: formData.get('status') as string,
      clientResponse: formData.get('clientResponse') as string || null,
      clientComments: formData.get('clientComments') as string || null,
      clientCode: formData.get('clientCode') as string || null,
      internalComments: formData.get('internalComments') as string || null,
      rejectionReason: formData.get('rejectionReason') as string || null,
    };

    const clientResponseDate = formData.get('clientResponseDate') as string;
    if (clientResponseDate) data.clientResponseDate = clientResponseDate;

    const approvalDate = formData.get('approvalDate') as string;
    if (approvalDate) data.approvalDate = approvalDate;

    // Calculate days count if approved
    if (data.status.includes('Approved') && submission) {
      const submissionDate = new Date(submission.submissionDate);
      const responseDate = data.approvalDate ? new Date(data.approvalDate) : new Date();
      const diffTime = Math.abs(responseDate.getTime() - submissionDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      data.daysCount = diffDays;
    }

    try {
      const res = await fetch(`/api/document-submissions/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        await fetchSubmission();
        setEditMode(false);
        alert('Submission updated successfully');
      } else {
        const error = await res.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error updating submission:', error);
      alert('Failed to update submission');
    } finally {
      setUpdating(false);
    }
  };

  const handleRevisionSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setUpdating(true);

    const formData = new FormData(e.currentTarget);
    const newRevision = formData.get('revision') as string;
    const data = {
      revision: newRevision,
      submissionDate: formData.get('submissionDate') as string,
      status: formData.get('revisionStatus') as string,
      comments: formData.get('comments') as string || null,
    };

    try {
      const res = await fetch(`/api/document-submissions/${params.id}/revisions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        await fetchSubmission();
        setShowRevisionForm(false);
        alert('Revision added successfully');
      } else {
        const error = await res.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error adding revision:', error);
      alert('Failed to add revision');
    } finally {
      setUpdating(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  const getStatusColor = (status: string) => {
    if (status.includes('Approved')) return 'bg-green-100 text-green-800';
    if (status.includes('Rejected')) return 'bg-red-100 text-red-800';
    if (status.includes('Review')) return 'bg-yellow-100 text-yellow-800';
    return 'bg-blue-100 text-blue-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading submission...</p>
        </div>
      </div>
    );
  }

  if (!submission) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/document-timeline">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                <FileText className="h-8 w-8" />
                {submission.submissionNumber}
              </h1>
              <p className="text-muted-foreground mt-1">{submission.title}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {!editMode && (
              <Button onClick={() => setEditMode(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Update Status
              </Button>
            )}
            <Button variant="outline" onClick={() => setShowRevisionForm(!showRevisionForm)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Revision
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Document Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Project</Label>
                    <p className="font-medium">
                      {submission.project.projectNumber} - {submission.project.name}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Building</Label>
                    <p className="font-medium">
                      {submission.building
                        ? `${submission.building.designation} - ${submission.building.name}`
                        : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Document Type</Label>
                    <p className="font-medium">{submission.documentType}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Section</Label>
                    <p className="font-medium">{submission.section || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Current Revision</Label>
                    <Badge variant="secondary">{submission.revision}</Badge>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Client Code</Label>
                    <p className="font-medium">{submission.clientCode || 'N/A'}</p>
                  </div>
                </div>

                {submission.description && (
                  <div>
                    <Label className="text-muted-foreground">Description</Label>
                    <p className="text-sm">{submission.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Status Update Form */}
            {editMode && (
              <Card>
                <CardHeader>
                  <CardTitle>Update Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleUpdate} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="status">Status</Label>
                        <select
                          id="status"
                          name="status"
                          defaultValue={submission.status}
                          className="w-full h-10 px-3 rounded-md border bg-background"
                          disabled={updating}
                        >
                          {STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="clientResponse">Client Response</Label>
                        <select
                          id="clientResponse"
                          name="clientResponse"
                          defaultValue={submission.clientResponse || ''}
                          className="w-full h-10 px-3 rounded-md border bg-background"
                          disabled={updating}
                        >
                          <option value="">Not yet received</option>
                          {CLIENT_RESPONSE_OPTIONS.map((response) => (
                            <option key={response} value={response}>
                              {response}
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
                          defaultValue={
                            submission.clientResponseDate
                              ? submission.clientResponseDate.split('T')[0]
                              : ''
                          }
                          disabled={updating}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="approvalDate">Approval Date</Label>
                        <Input
                          id="approvalDate"
                          name="approvalDate"
                          type="date"
                          defaultValue={
                            submission.approvalDate ? submission.approvalDate.split('T')[0] : ''
                          }
                          disabled={updating}
                        />
                      </div>

                      <div className="space-y-2 col-span-2">
                        <Label htmlFor="clientCode">Client Code</Label>
                        <Input
                          id="clientCode"
                          name="clientCode"
                          defaultValue={submission.clientCode || ''}
                          disabled={updating}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="clientComments">Client Comments</Label>
                      <Textarea
                        id="clientComments"
                        name="clientComments"
                        rows={3}
                        defaultValue={submission.clientComments || ''}
                        disabled={updating}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="rejectionReason">Rejection Reason (if applicable)</Label>
                      <Textarea
                        id="rejectionReason"
                        name="rejectionReason"
                        rows={2}
                        defaultValue={submission.rejectionReason || ''}
                        disabled={updating}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="internalComments">Internal Comments</Label>
                      <Textarea
                        id="internalComments"
                        name="internalComments"
                        rows={3}
                        defaultValue={submission.internalComments || ''}
                        disabled={updating}
                      />
                    </div>

                    <div className="flex gap-2 pt-4 border-t sticky bottom-0 bg-white p-4 -mx-6 -mb-6">
                      <Button type="submit" disabled={updating} size="lg" className="flex-1">
                        {updating ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Updating...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            Save Changes
                          </>
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setEditMode(false)}
                        disabled={updating}
                        size="lg"
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Add Revision Form */}
            {showRevisionForm && (
              <Card>
                <CardHeader>
                  <CardTitle>Add New Revision</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleRevisionSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="revision">Revision Number</Label>
                        <Input
                          id="revision"
                          name="revision"
                          required
                          value={nextRevision}
                          readOnly
                          className="bg-muted/50 cursor-not-allowed"
                          title="Auto-generated based on previous revision"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="submissionDate">Submission Date</Label>
                        <Input
                          id="submissionDate"
                          name="submissionDate"
                          type="date"
                          required
                          defaultValue={new Date().toISOString().split('T')[0]}
                          disabled={updating}
                        />
                      </div>

                      <div className="space-y-2 col-span-2">
                        <Label htmlFor="revisionStatus">Status</Label>
                        <select
                          id="revisionStatus"
                          name="revisionStatus"
                          className="w-full h-10 px-3 rounded-md border bg-background"
                          disabled={updating}
                        >
                          {STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="comments">Comments</Label>
                      <Textarea
                        id="comments"
                        name="comments"
                        rows={3}
                        placeholder="Revision notes and changes"
                        disabled={updating}
                      />
                    </div>

                    <div className="flex gap-2 pt-4 border-t sticky bottom-0 bg-white p-4 -mx-6 -mb-6">
                      <Button type="submit" disabled={updating} size="lg" className="flex-1">
                        {updating ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Adding Revision...
                          </>
                        ) : (
                          <>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Revision
                          </>
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowRevisionForm(false)}
                        disabled={updating}
                        size="lg"
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Revision History */}
            {submission.revisions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Revision History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {submission.revisions.map((rev) => (
                      <div key={rev.id} className="border-l-2 border-primary pl-4 pb-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">{rev.revision}</Badge>
                            <Badge className={getStatusColor(rev.status)}>{rev.status}</Badge>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {formatDate(rev.submissionDate)}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-1">
                          Submitted by: {rev.submitter.name}
                        </p>
                        {rev.comments && (
                          <p className="text-sm mt-2">
                            <strong>Comments:</strong> {rev.comments}
                          </p>
                        )}
                        {rev.clientResponse && (
                          <p className="text-sm mt-1">
                            <strong>Client Response:</strong> {rev.clientResponse}
                          </p>
                        )}
                        {rev.clientComments && (
                          <p className="text-sm mt-1">
                            <strong>Client Comments:</strong> {rev.clientComments}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status Card */}
            <Card>
              <CardHeader>
                <CardTitle>Current Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <Badge className={`${getStatusColor(submission.status)} mt-1`}>
                    {submission.status}
                  </Badge>
                </div>

                {submission.clientResponse && (
                  <div>
                    <Label className="text-muted-foreground">Client Response</Label>
                    <Badge
                      variant={
                        submission.clientResponse.includes('Approved') ? 'default' : 'destructive'
                      }
                      className="mt-1"
                    >
                      {submission.clientResponse}
                    </Badge>
                  </div>
                )}

                {submission.daysCount !== null && (
                  <div>
                    <Label className="text-muted-foreground">Days to Approval</Label>
                    <p className="text-2xl font-bold">{submission.daysCount} days</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Timeline Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-muted-foreground">Submission Date</Label>
                  <p className="font-medium">{formatDate(submission.submissionDate)}</p>
                </div>

                {submission.reviewDueDate && (
                  <div>
                    <Label className="text-muted-foreground">Review Due Date</Label>
                    <p className="font-medium">{formatDate(submission.reviewDueDate)}</p>
                  </div>
                )}

                {submission.clientResponseDate && (
                  <div>
                    <Label className="text-muted-foreground">Client Response Date</Label>
                    <p className="font-medium">{formatDate(submission.clientResponseDate)}</p>
                  </div>
                )}

                {submission.approvalDate && (
                  <div>
                    <Label className="text-muted-foreground">Approval Date</Label>
                    <p className="font-medium">{formatDate(submission.approvalDate)}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* People Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  People
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-muted-foreground">Handled By</Label>
                  <p className="font-medium">
                    {submission.handler
                      ? `${submission.handler.name}${
                          submission.handler.position ? ` (${submission.handler.position})` : ''
                        }`
                      : 'Not assigned'}
                  </p>
                </div>

                <div>
                  <Label className="text-muted-foreground">Submitted By</Label>
                  <p className="font-medium">
                    {submission.submitter.name}
                    {submission.submitter.position && ` (${submission.submitter.position})`}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
    </div>
  );
}
