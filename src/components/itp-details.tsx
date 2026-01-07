'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ArrowLeft, Edit, Trash2, Send, CheckCircle, XCircle, FileText, Calendar, User, Copy, Save, Download } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

type ITP = {
  id: string;
  itpNumber: string;
  revision: number;
  type: string;
  status: string;
  jobNo: string | null;
  client: string | null;
  applicableCodes: string | null;
  remarks: string | null;
  dateCreated: string;
  dateApproved: string | null;
  clientApprovedBy: string | null;
  project: {
    id: string;
    projectNumber: string;
    name: string;
    client: { id: string; name: string };
  };
  createdBy: { id: string; name: string; email: string };
  approvedBy: { id: string; name: string; email: string } | null;
  activities: Array<{
    id: string;
    sequence: number;
    activityDescription: string;
    verifyingDocument: string | null;
    inspectionType: string;
    acceptanceCriteria: string | null;
    reportsReference: string | null;
    status: string;
    completedDate: string | null;
    signA: { id: string; name: string } | null;
    signB: { id: string; name: string } | null;
    signC: { id: string; name: string } | null;
  }>;
};

const statusColors = {
  Draft: 'bg-gray-100 text-gray-800 border-gray-300',
  'Under Review': 'bg-blue-100 text-blue-800 border-blue-300',
  Approved: 'bg-green-100 text-green-800 border-green-300',
  Rejected: 'bg-red-100 text-red-800 border-red-300',
};

const inspectionTypeColors = {
  H: 'bg-red-100 text-red-800 border-red-300',
  W: 'bg-blue-100 text-blue-800 border-blue-300',
  M: 'bg-orange-100 text-orange-800 border-orange-300',
  R: 'bg-green-100 text-green-800 border-green-300',
  RI: 'bg-gray-100 text-gray-800 border-gray-300',
};

type Project = {
  id: string;
  projectNumber: string;
  name: string;
};

type ITPDetailsProps = {
  itp: ITP;
  userRole: string;
  userId: string;
  projects: Project[];
};

export function ITPDetails({ itp, userRole, userId, projects }: ITPDetailsProps) {
  const router = useRouter();
  const [approvalDialog, setApprovalDialog] = useState(false);
  const [cloneDialog, setCloneDialog] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'submit' | 'approve' | 'reject'>('submit');
  const [clientApprover, setClientApprover] = useState('');
  const [cloneProjectId, setCloneProjectId] = useState('');
  const [cloneItpNumber, setCloneItpNumber] = useState('');
  const [processing, setProcessing] = useState(false);

  const canEdit = ['CEO', 'Admin', 'Manager', 'Engineer'].includes(userRole) && itp.status === 'Draft';
  const canDelete = ['CEO', 'Admin'].includes(userRole);
  const canSubmit = ['CEO', 'Admin', 'Manager', 'Engineer'].includes(userRole) && itp.status === 'Draft';
  const canApprove = ['CEO', 'Admin', 'Manager'].includes(userRole) && itp.status === 'Under Review';
  const canSaveAsTemplate = ['CEO', 'Admin', 'Manager'].includes(userRole) && itp.type === 'CUSTOM';
  const canClone = ['CEO', 'Admin', 'Manager', 'Engineer'].includes(userRole);

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${day}/${month}/${year}`;
  };

  const handleApprovalAction = async () => {
    setProcessing(true);
    try {
      const response = await fetch(`/api/itp/${itp.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: approvalAction,
          clientApprovedBy: clientApprover || null,
        }),
      });

      if (!response.ok) throw new Error('Failed to process approval');

      setApprovalDialog(false);
      router.refresh();
    } catch (error) {
      alert('Failed to process approval action');
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this ITP?')) return;

    try {
      const response = await fetch(`/api/itp/${itp.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete ITP');

      router.push('/itp');
      router.refresh();
    } catch (error) {
      alert('Failed to delete ITP');
    }
  };

  const handleSaveAsTemplate = async () => {
    if (!confirm('Save this ITP as a STANDARD template? This will change its type to STANDARD.')) return;

    setProcessing(true);
    try {
      const response = await fetch(`/api/itp/${itp.id}/template`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to save as template');

      alert('ITP saved as template successfully!');
      router.refresh();
    } catch (error) {
      alert('Failed to save as template');
    } finally {
      setProcessing(false);
    }
  };

  const handleClone = async () => {
    if (!cloneProjectId || !cloneItpNumber) {
      alert('Please select a project and enter an ITP number');
      return;
    }

    setProcessing(true);
    try {
      const response = await fetch(`/api/itp/${itp.id}/clone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: cloneProjectId,
          itpNumber: cloneItpNumber,
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to clone ITP');

      setCloneDialog(false);
      router.push(`/itp/${result.id}`);
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to clone ITP');
    } finally {
      setProcessing(false);
    }
  };

  const handleExportPDF = () => {
    window.print();
  };

  return (
    <>
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          main {
            background: white !important;
          }
          @page {
            margin: 1cm;
          }
        }
      `}</style>
      <main className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <div className="container mx-auto p-6 lg:p-8 max-w-7xl max-lg:pt-20">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6 print:mb-4">
          <Button variant="ghost" size="icon" asChild className="print:hidden">
            <Link href="/itp">
              <ArrowLeft className="size-5" />
            </Link>
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{itp.itpNumber}</h1>
              <Badge variant="outline" className={statusColors[itp.status as keyof typeof statusColors]}>
                {itp.status}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1">
              Revision {itp.revision} • {itp.project.projectNumber} - {itp.project.name}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={handleExportPDF}
              className="print:hidden"
            >
              <Download className="size-4 mr-2" />
              Save as PDF
            </Button>
            {canClone && (
              <Button
                variant="outline"
                onClick={() => setCloneDialog(true)}
              >
                <Copy className="size-4 mr-2" />
                Clone
              </Button>
            )}
            {canSaveAsTemplate && (
              <Button
                variant="outline"
                onClick={handleSaveAsTemplate}
                disabled={processing}
              >
                <Save className="size-4 mr-2" />
                Save as Template
              </Button>
            )}
            {canSubmit && (
              <Button
                variant="default"
                onClick={() => {
                  setApprovalAction('submit');
                  setApprovalDialog(true);
                }}
              >
                <Send className="size-4 mr-2" />
                Submit for Review
              </Button>
            )}
            {canApprove && (
              <>
                <Button
                  variant="default"
                  onClick={() => {
                    setApprovalAction('approve');
                    setApprovalDialog(true);
                  }}
                >
                  <CheckCircle className="size-4 mr-2" />
                  Approve
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setApprovalAction('reject');
                    setApprovalDialog(true);
                  }}
                  className="text-destructive"
                >
                  <XCircle className="size-4 mr-2" />
                  Reject
                </Button>
              </>
            )}
            {canEdit && (
              <Button variant="outline" asChild className="print:hidden">
                <Link href={`/itp/${itp.id}/edit`}>
                  <Edit className="size-4 mr-2" />
                  Edit
                </Link>
              </Button>
            )}
            {canDelete && (
              <Button variant="outline" onClick={handleDelete} className="text-destructive print:hidden">
                <Trash2 className="size-4 mr-2" />
                Delete
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header Information */}
            <Card>
              <CardHeader>
                <CardTitle>ITP Information</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label className="text-muted-foreground">ITP Number</Label>
                  <p className="font-medium">{itp.itpNumber}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Revision</Label>
                  <p className="font-medium">{itp.revision}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Type</Label>
                  <Badge variant="outline" className={itp.type === 'STANDARD' ? 'bg-purple-100 text-purple-800' : 'bg-orange-100 text-orange-800'}>
                    {itp.type}
                  </Badge>
                </div>
                <div>
                  <Label className="text-muted-foreground">Job No.</Label>
                  <p className="font-medium">{itp.jobNo || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Client</Label>
                  <p className="font-medium">{itp.client || itp.project.client.name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Project</Label>
                  <Link href={`/projects/${itp.project.id}`} className="font-medium hover:underline">
                    {itp.project.projectNumber} - {itp.project.name}
                  </Link>
                </div>
                {itp.applicableCodes && (
                  <div className="md:col-span-2">
                    <Label className="text-muted-foreground">Applicable Codes & Standards</Label>
                    <p className="font-medium">{itp.applicableCodes}</p>
                  </div>
                )}
                {itp.remarks && (
                  <div className="md:col-span-2">
                    <Label className="text-muted-foreground">Remarks</Label>
                    <p className="font-medium whitespace-pre-wrap">{itp.remarks}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Activities Table */}
            <Card>
              <CardHeader>
                <CardTitle>Inspection Activities ({itp.activities.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {itp.activities.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">No activities defined</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">#</TableHead>
                          <TableHead className="min-w-[200px]">Activity Description</TableHead>
                          <TableHead>Document</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Acceptance Criteria</TableHead>
                          <TableHead>Reports</TableHead>
                          <TableHead>Sign A</TableHead>
                          <TableHead>Sign B</TableHead>
                          <TableHead>Sign C</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {itp.activities.map((activity, index) => (
                          <TableRow key={activity.id}>
                            <TableCell className="font-medium">{index + 1}</TableCell>
                            <TableCell className="max-w-[300px]">
                              <p className="text-sm">{activity.activityDescription}</p>
                            </TableCell>
                            <TableCell>
                              <p className="text-sm">{activity.verifyingDocument || '-'}</p>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-xs",
                                  inspectionTypeColors[activity.inspectionType as keyof typeof inspectionTypeColors]
                                )}
                              >
                                {activity.inspectionType}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <p className="text-sm">{activity.acceptanceCriteria || '-'}</p>
                            </TableCell>
                            <TableCell>
                              <p className="text-sm">{activity.reportsReference || '-'}</p>
                            </TableCell>
                            <TableCell>
                              <p className="text-xs">{activity.signA?.name || '-'}</p>
                            </TableCell>
                            <TableCell>
                              <p className="text-xs">{activity.signB?.name || '-'}</p>
                            </TableCell>
                            <TableCell>
                              <p className="text-xs">{activity.signC?.name || '-'}</p>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

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
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Approval Status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="size-4" />
                  Approval Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-muted-foreground text-xs">Prepared By</Label>
                  <div className="mt-1">
                    <p className="font-medium text-sm">{itp.createdBy.name}</p>
                    <p className="text-xs text-muted-foreground">{itp.createdBy.email}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(itp.dateCreated)}</p>
                  </div>
                </div>

                {itp.approvedBy && (
                  <div>
                    <Label className="text-muted-foreground text-xs">Approved By</Label>
                    <div className="mt-1">
                      <p className="font-medium text-sm">{itp.approvedBy.name}</p>
                      <p className="text-xs text-muted-foreground">{itp.approvedBy.email}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(itp.dateApproved)}</p>
                    </div>
                  </div>
                )}

                {itp.clientApprovedBy && (
                  <div>
                    <Label className="text-muted-foreground text-xs">Client Approval</Label>
                    <div className="mt-1">
                      <p className="font-medium text-sm">{itp.clientApprovedBy}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Document Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="size-4" />
                  Document Control
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <Label className="text-muted-foreground text-xs">Document Code</Label>
                  <p className="font-medium">HEXA-DOC-INSP-003</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Created</Label>
                  <p className="font-medium">{formatDate(itp.dateCreated)}</p>
                </div>
                {itp.dateApproved && (
                  <div>
                    <Label className="text-muted-foreground text-xs">Approved</Label>
                    <p className="font-medium">{formatDate(itp.dateApproved)}</p>
                  </div>
                )}
                <div>
                  <Label className="text-muted-foreground text-xs">Activities</Label>
                  <p className="font-medium">{itp.activities.length} total</p>
                  <p className="text-xs text-muted-foreground">
                    {itp.activities.filter(a => a.status === 'Completed').length} completed
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Approval Dialog */}
      <Dialog open={approvalDialog} onOpenChange={setApprovalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {approvalAction === 'submit' && 'Submit for Review'}
              {approvalAction === 'approve' && 'Approve ITP'}
              {approvalAction === 'reject' && 'Reject ITP'}
            </DialogTitle>
            <DialogDescription>
              {approvalAction === 'submit' && 'Submit this ITP for manager review and approval.'}
              {approvalAction === 'approve' && 'Approve this ITP and mark it as ready for use.'}
              {approvalAction === 'reject' && 'Reject this ITP and send it back for revision.'}
            </DialogDescription>
          </DialogHeader>

          {approvalAction === 'approve' && (
            <div className="space-y-2">
              <Label htmlFor="clientApprover">Client Approver (Optional)</Label>
              <Input
                id="clientApprover"
                placeholder="Client representative name"
                value={clientApprover}
                onChange={(e) => setClientApprover(e.target.value)}
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setApprovalDialog(false)} disabled={processing}>
              Cancel
            </Button>
            <Button onClick={handleApprovalAction} disabled={processing}>
              {processing ? 'Processing...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clone Dialog */}
      <Dialog open={cloneDialog} onOpenChange={setCloneDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clone ITP</DialogTitle>
            <DialogDescription>
              Create a copy of this ITP for another project. All activities will be copied.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cloneProject">
                Target Project <span className="text-destructive">*</span>
              </Label>
              <select
                id="cloneProject"
                value={cloneProjectId}
                onChange={(e) => {
                  setCloneProjectId(e.target.value);
                  const project = projects.find(p => p.id === e.target.value);
                  if (project) {
                    setCloneItpNumber(`${project.projectNumber}-ITP-001`);
                  }
                }}
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

            <div className="space-y-2">
              <Label htmlFor="cloneItpNumber">
                New ITP Number <span className="text-destructive">*</span>
              </Label>
              <Input
                id="cloneItpNumber"
                placeholder="e.g., P2024-001-ITP-001"
                value={cloneItpNumber}
                onChange={(e) => setCloneItpNumber(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Auto-generated based on selected project
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCloneDialog(false)} disabled={processing}>
              Cancel
            </Button>
            <Button onClick={handleClone} disabled={processing || !cloneProjectId || !cloneItpNumber}>
              {processing ? 'Cloning...' : 'Clone ITP'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
    </>
  );
}
