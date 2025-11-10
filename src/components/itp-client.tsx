'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Search, Plus, MoreVertical, Eye, Edit, Trash2, FileText, CheckCircle, Clock, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

type ITP = {
  id: string;
  itpNumber: string;
  revision: number;
  type: string;
  status: string;
  jobNo: string | null;
  client: string | null;
  dateCreated: string;
  dateApproved: string | null;
  project: {
    id: string;
    projectNumber: string;
    name: string;
    client: { id: string; name: string };
  };
  createdBy: { id: string; name: string; email: string };
  approvedBy: { id: string; name: string; email: string } | null;
  _count: { activities: number };
};

const statusColors = {
  Draft: 'bg-gray-100 text-gray-800 border-gray-300',
  'Under Review': 'bg-blue-100 text-blue-800 border-blue-300',
  Approved: 'bg-green-100 text-green-800 border-green-300',
  Rejected: 'bg-red-100 text-red-800 border-red-300',
};

const typeColors = {
  STANDARD: 'bg-purple-100 text-purple-800 border-purple-300',
  CUSTOM: 'bg-orange-100 text-orange-800 border-orange-300',
};

type ITPClientProps = {
  initialITPs: ITP[];
  userRole: string;
};

export function ITPClient({ initialITPs, userRole }: ITPClientProps) {
  const router = useRouter();
  const [itps, setITPs] = useState<ITP[]>(initialITPs);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');

  const canCreate = ['Admin', 'Manager', 'Engineer'].includes(userRole);
  const canDelete = userRole === 'Admin';

  const filteredITPs = useMemo(() => {
    return itps.filter((itp) => {
      const matchesSearch = !search || 
        itp.itpNumber.toLowerCase().includes(search.toLowerCase()) ||
        itp.project.projectNumber.toLowerCase().includes(search.toLowerCase()) ||
        itp.project.name.toLowerCase().includes(search.toLowerCase()) ||
        itp.client?.toLowerCase().includes(search.toLowerCase());
      
      const matchesStatus = !statusFilter || itp.status === statusFilter;
      const matchesType = !typeFilter || itp.type === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [itps, search, statusFilter, typeFilter]);

  const handleDelete = async (itpId: string) => {
    if (!confirm('Are you sure you want to delete this ITP? This will also delete all associated activities.')) return;

    try {
      const response = await fetch(`/api/itp/${itpId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete ITP');

      setITPs(itps.filter(i => i.id !== itpId));
    } catch (error) {
      alert('Failed to delete ITP');
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${day}/${month}/${year}`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Approved':
        return <CheckCircle className="size-4" />;
      case 'Under Review':
        return <Clock className="size-4" />;
      case 'Rejected':
        return <XCircle className="size-4" />;
      default:
        return <FileText className="size-4" />;
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto p-6 lg:p-8 space-y-6 max-lg:pt-20">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Inspection & Test Plans (ITP)</h1>
            <p className="text-muted-foreground mt-1">
              Manage quality control inspection and test plans
            </p>
          </div>
          {canCreate && (
            <Button asChild>
              <Link href="/itp/new">
                <Plus className="size-4 mr-2" />
                Create ITP
              </Link>
            </Button>
          )}
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total ITPs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{itps.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Draft</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{itps.filter(i => i.status === 'Draft').length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Under Review</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{itps.filter(i => i.status === 'Under Review').length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Approved</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{itps.filter(i => i.status === 'Approved').length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search ITPs by number, project, or client..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Filter buttons */}
              <div className="flex flex-wrap gap-2 items-center">
                {/* Status filters */}
                <span className="text-sm text-muted-foreground">Status:</span>
                <Button
                  variant={statusFilter === '' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('')}
                >
                  All
                </Button>
                <Button
                  variant={statusFilter === 'Draft' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('Draft')}
                >
                  Draft
                </Button>
                <Button
                  variant={statusFilter === 'Under Review' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('Under Review')}
                >
                  Under Review
                </Button>
                <Button
                  variant={statusFilter === 'Approved' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('Approved')}
                >
                  Approved
                </Button>

                <div className="h-6 w-px bg-border" />

                {/* Type filters */}
                <span className="text-sm text-muted-foreground">Type:</span>
                <Button
                  variant={typeFilter === '' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTypeFilter('')}
                >
                  All
                </Button>
                <Button
                  variant={typeFilter === 'STANDARD' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTypeFilter('STANDARD')}
                >
                  Standard
                </Button>
                <Button
                  variant={typeFilter === 'CUSTOM' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTypeFilter('CUSTOM')}
                >
                  Custom
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ITP Table */}
        {filteredITPs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                {search || statusFilter || typeFilter
                  ? 'No ITPs found matching your filters'
                  : 'No ITPs yet. Create your first ITP!'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ITP Number</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Activities</TableHead>
                    <TableHead>Created By</TableHead>
                    <TableHead>Date Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredITPs.map((itp) => (
                    <TableRow key={itp.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{itp.itpNumber}</p>
                          <p className="text-xs text-muted-foreground">Rev. {itp.revision}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{itp.project.projectNumber}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1">{itp.project.name}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={typeColors[itp.type as keyof typeof typeColors]}
                        >
                          {itp.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            "flex items-center gap-1 w-fit",
                            statusColors[itp.status as keyof typeof statusColors]
                          )}
                        >
                          {getStatusIcon(itp.status)}
                          {itp.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{itp._count.activities} activities</span>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm">{itp.createdBy.name}</p>
                          <p className="text-xs text-muted-foreground">{itp.createdBy.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{formatDate(itp.dateCreated)}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => router.push(`/itp/${itp.id}`)}>
                              <Eye className="size-4" />
                              View Details
                            </DropdownMenuItem>
                            {canCreate && itp.status === 'Draft' && (
                              <DropdownMenuItem onClick={() => router.push(`/itp/${itp.id}/edit`)}>
                                <Edit className="size-4" />
                                Edit ITP
                              </DropdownMenuItem>
                            )}
                            {canDelete && (
                              <DropdownMenuItem
                                onClick={() => handleDelete(itp.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="size-4" />
                                Delete
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
