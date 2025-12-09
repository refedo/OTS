'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { CheckCircle, Clock, XCircle, Trash2, CheckCheck, LayoutGrid, LayoutList } from 'lucide-react';
import { useRouter } from 'next/navigation';

type WPSListProps = {
  wpsList: any[];
  projects: any[];
  canApprove: boolean;
};

export function WPSList({ wpsList, projects, canApprove }: WPSListProps) {
  const router = useRouter();
  const [selectedWPS, setSelectedWPS] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  const filteredWPS = projectFilter === 'all' 
    ? wpsList 
    : wpsList.filter(wps => wps.projectId === projectFilter);

  const toggleWPS = (id: string) => {
    const newSelected = new Set(selectedWPS);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedWPS(newSelected);
  };

  const toggleAll = () => {
    if (selectedWPS.size === filteredWPS.length) {
      setSelectedWPS(new Set());
    } else {
      setSelectedWPS(new Set(filteredWPS.map(wps => wps.id)));
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const deletePromises = Array.from(selectedWPS).map(id =>
        fetch(`/api/wps/${id}`, { method: 'DELETE' })
      );
      await Promise.all(deletePromises);
      setSelectedWPS(new Set());
      setShowDeleteDialog(false);
      router.refresh();
    } catch (error) {
      console.error('Error deleting WPS:', error);
      alert('Failed to delete some WPS records');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      const approvePromises = Array.from(selectedWPS).map(id =>
        fetch(`/api/wps/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'Approved' }),
        })
      );
      await Promise.all(approvePromises);
      setSelectedWPS(new Set());
      setShowApproveDialog(false);
      router.refresh();
    } catch (error) {
      console.error('Error approving WPS:', error);
      alert('Failed to approve some WPS records');
    } finally {
      setIsApproving(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Approved':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'Draft':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'Superseded':
        return <XCircle className="h-4 w-4 text-gray-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Draft':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Superseded':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const selectedDraftCount = Array.from(selectedWPS).filter(id => {
    const wps = wpsList.find(w => w.id === id);
    return wps?.status === 'Draft';
  }).length;

  return (
    <>
      {/* Filters and Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 flex gap-2 flex-wrap">
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Filter by project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.projectNumber} - {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex border rounded-md">
            <Button
              variant={viewMode === 'card' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('card')}
              className="rounded-r-none"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'table' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
              className="rounded-l-none"
            >
              <LayoutList className="h-4 w-4" />
            </Button>
          </div>

          <div
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium border border-input rounded-md hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors"
            onClick={toggleAll}
          >
            <Checkbox
              checked={selectedWPS.size === filteredWPS.length && filteredWPS.length > 0}
            />
            <span>{selectedWPS.size === filteredWPS.length && filteredWPS.length > 0 ? 'Deselect All' : 'Select All'}</span>
          </div>
        </div>

        {selectedWPS.size > 0 && (
          <div className="flex gap-2">
            <span className="text-sm text-muted-foreground self-center">
              {selectedWPS.size} selected
            </span>
            {canApprove && selectedDraftCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowApproveDialog(true)}
              >
                <CheckCheck className="mr-2 h-4 w-4" />
                Approve ({selectedDraftCount})
              </Button>
            )}
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete ({selectedWPS.size})
            </Button>
          </div>
        )}
      </div>

      {/* Card View */}
      {viewMode === 'card' && (
        <div className="grid gap-4">
          {filteredWPS.map((wps) => (
            <Card key={wps.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={selectedWPS.has(wps.id)}
                    onCheckedChange={() => toggleWPS(wps.id)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <CardTitle className="text-xl">
                        {wps.wpsNumber}
                      </CardTitle>
                      <span className="text-sm text-muted-foreground">
                        Rev. {wps.revision}
                      </span>
                      <div className={`flex items-center gap-1 px-2 py-1 rounded-md border text-xs font-medium ${getStatusColor(wps.status)}`}>
                        {getStatusIcon(wps.status)}
                        {wps.status}
                      </div>
                    </div>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <p>
                        <span className="font-medium">Project:</span> {wps.project.projectNumber} - {wps.project.name}
                      </p>
                      <p>
                        <span className="font-medium">Client:</span> {wps.project.client.name}
                      </p>
                      <p>
                        <span className="font-medium">Process:</span> {wps.weldingProcess}
                      </p>
                      <p>
                        <span className="font-medium">Created:</span> {new Date(wps.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })}
                      </p>
                      {wps.supportingPQR && (
                        <p>
                          <span className="font-medium">PQR:</span> {wps.supportingPQR}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Link href={`/wps/${wps.id}`}>
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </Link>
                    {wps.status === 'Draft' && (
                      <Link href={`/wps/${wps.id}/edit`}>
                        <Button variant="ghost" size="sm">
                          Edit
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Prepared By</p>
                    <p className="font-medium">{wps.preparedBy.name}</p>
                    {wps.preparedBy.position && (
                      <p className="text-xs text-muted-foreground">{wps.preparedBy.position}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-muted-foreground">Approved By</p>
                    <p className="font-medium">
                      {wps.approvedBy?.name || 'Pending'}
                    </p>
                    {wps.approvedBy?.position && (
                      <p className="text-xs text-muted-foreground">{wps.approvedBy.position}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-muted-foreground">Welding Passes</p>
                    <p className="font-medium">{wps._count.passes} passes</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Date Issued</p>
                    <p className="font-medium">
                      {wps.dateIssued
                        ? new Date(wps.dateIssued).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })
                        : 'Not issued'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Table View */}
      {viewMode === 'table' && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedWPS.size === filteredWPS.length && filteredWPS.length > 0}
                      onCheckedChange={toggleAll}
                    />
                  </TableHead>
                  <TableHead>WPS Number</TableHead>
                  <TableHead>Rev</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Process</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Prepared By</TableHead>
                  <TableHead>Approved By</TableHead>
                  <TableHead>Passes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWPS.map((wps) => (
                  <TableRow key={wps.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedWPS.has(wps.id)}
                        onCheckedChange={() => toggleWPS(wps.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{wps.wpsNumber}</TableCell>
                    <TableCell>{wps.revision}</TableCell>
                    <TableCell>
                      <div className={`flex items-center gap-1 px-2 py-1 rounded-md border text-xs font-medium w-fit ${getStatusColor(wps.status)}`}>
                        {getStatusIcon(wps.status)}
                        {wps.status}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[200px] truncate">
                        {wps.project.projectNumber} - {wps.project.name}
                      </div>
                    </TableCell>
                    <TableCell>{wps.weldingProcess}</TableCell>
                    <TableCell>{new Date(wps.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })}</TableCell>
                    <TableCell>{wps.preparedBy.name}</TableCell>
                    <TableCell>{wps.approvedBy?.name || 'Pending'}</TableCell>
                    <TableCell>{wps._count.passes}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Link href={`/wps/${wps.id}`}>
                          <Button variant="outline" size="sm">
                            View
                          </Button>
                        </Link>
                        {wps.status === 'Draft' && (
                          <Link href={`/wps/${wps.id}/edit`}>
                            <Button variant="ghost" size="sm">
                              Edit
                            </Button>
                          </Link>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete WPS Records</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedWPS.size} WPS record(s)? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Approve Confirmation Dialog */}
      <AlertDialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve WPS Records</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to approve {selectedDraftCount} Draft WPS record(s)? This will change their status to Approved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isApproving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleApprove}
              disabled={isApproving}
            >
              {isApproving ? 'Approving...' : 'Approve'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
