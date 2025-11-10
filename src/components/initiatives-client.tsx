'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
import { Search, Plus, MoreVertical, Eye, Edit, Trash2, TrendingUp, Target } from 'lucide-react';

type Initiative = {
  id: string;
  initiativeNumber: string;
  name: string;
  category: string | null;
  status: string;
  priority: string;
  progress: number | null;
  startDate: string | null;
  endDate: string | null;
  budget: number | null;
  owner: { id: string; name: string; email: string; position: string | null };
  department: { id: string; name: string } | null;
  milestones: any[];
  tasks: any[];
};

type User = {
  id: string;
  name: string;
  email: string;
  position: string | null;
};

type Department = {
  id: string;
  name: string;
};

type InitiativesClientProps = {
  initialInitiatives: Initiative[];
  userRole: string;
  userId: string;
  allUsers: User[];
  allDepartments: Department[];
};

const statusColors = {
  Planned: 'bg-gray-100 text-gray-800 border-gray-300',
  'In Progress': 'bg-blue-100 text-blue-800 border-blue-300',
  'On Hold': 'bg-yellow-100 text-yellow-800 border-yellow-300',
  Completed: 'bg-green-100 text-green-800 border-green-300',
  Cancelled: 'bg-red-100 text-red-800 border-red-300',
};

const priorityColors = {
  Low: 'bg-gray-100 text-gray-800 border-gray-300',
  Medium: 'bg-orange-100 text-orange-800 border-orange-300',
  High: 'bg-red-100 text-red-800 border-red-300',
  Critical: 'bg-purple-100 text-purple-800 border-purple-300',
};

const categories = [
  'Digital Transformation',
  'Lean Management',
  'AI & Automation',
  'Human Capital Development',
  'Knowledge & Learning',
  'Factory Optimization',
  'Sustainability & Green Building',
  'Operational Excellence',
];

export function InitiativesClient({ 
  initialInitiatives, 
  userRole, 
  userId,
  allUsers,
  allDepartments,
}: InitiativesClientProps) {
  const router = useRouter();
  const [initiatives, setInitiatives] = useState<Initiative[]>(initialInitiatives);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('');

  const canManage = ['Admin', 'Manager'].includes(userRole);

  const filteredInitiatives = useMemo(() => {
    return initiatives.filter((initiative) => {
      const matchesSearch = !search || 
        initiative.name.toLowerCase().includes(search.toLowerCase()) ||
        initiative.initiativeNumber.toLowerCase().includes(search.toLowerCase()) ||
        initiative.owner.name.toLowerCase().includes(search.toLowerCase());
      
      const matchesStatus = !statusFilter || initiative.status === statusFilter;
      const matchesCategory = !categoryFilter || initiative.category === categoryFilter;
      const matchesPriority = !priorityFilter || initiative.priority === priorityFilter;
      const matchesDepartment = !departmentFilter || initiative.department?.id === departmentFilter;

      return matchesSearch && matchesStatus && matchesCategory && matchesPriority && matchesDepartment;
    });
  }, [initiatives, search, statusFilter, categoryFilter, priorityFilter, departmentFilter]);

  const handleDelete = async (initiativeId: string) => {
    if (!confirm('Are you sure you want to delete this initiative?')) return;

    try {
      const response = await fetch(`/api/initiatives/${initiativeId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete initiative');

      setInitiatives(initiatives.filter(i => i.id !== initiativeId));
      router.refresh();
    } catch (error) {
      alert('Failed to delete initiative');
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    const d = new Date(date);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  };

  return (
    <div className="container mx-auto p-6 lg:p-8 space-y-6 max-lg:pt-20">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Target className="h-8 w-8 text-primary" />
            Initiatives
          </h1>
          <p className="text-muted-foreground mt-1">
            Track and manage strategic initiatives
          </p>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <Button asChild>
              <Link href="/initiatives/new">
                <Plus className="size-4 mr-2" />
                New Initiative
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/initiatives/dashboard">
                <TrendingUp className="size-4 mr-2" />
                Dashboard
              </Link>
            </Button>
          </div>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search initiatives..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Status Filter */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">Status:</span>
              <Button
                variant={!statusFilter ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('')}
              >
                All
              </Button>
              {Object.keys(statusColors).map((status) => (
                <Button
                  key={status}
                  variant={statusFilter === status ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter(status)}
                >
                  {status}
                </Button>
              ))}
            </div>

            {/* Additional Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">Filters:</span>
              
              {/* Category Filter */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="h-9 px-3 rounded-md border bg-background text-sm"
              >
                <option value="">All Categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>

              {/* Priority Filter */}
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="h-9 px-3 rounded-md border bg-background text-sm"
              >
                <option value="">All Priorities</option>
                {Object.keys(priorityColors).map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </select>

              {/* Department Filter */}
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="h-9 px-3 rounded-md border bg-background text-sm"
              >
                <option value="">All Departments</option>
                {allDepartments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Initiatives Table */}
      {filteredInitiatives.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <p className="text-center text-muted-foreground">
              {initiatives.length === 0
                ? 'No initiatives yet. Create your first initiative!'
                : 'No initiatives match your filters.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Initiative #</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Timeline</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInitiatives.map((initiative) => (
                  <TableRow key={initiative.id}>
                    <TableCell className="font-medium">
                      {initiative.initiativeNumber}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{initiative.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {initiative.milestones.length} milestones, {initiative.tasks.length} tasks
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="text-sm">{initiative.owner.name}</div>
                        <div className="text-xs text-muted-foreground">{initiative.owner.position}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {initiative.department ? (
                        <span className="text-sm">{initiative.department.name}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {initiative.category ? (
                        <span className="text-sm">{initiative.category}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={priorityColors[initiative.priority as keyof typeof priorityColors]}
                      >
                        {initiative.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={statusColors[initiative.status as keyof typeof statusColors]}
                      >
                        {initiative.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="w-24">
                        <div className="flex items-center gap-2">
                          <Progress value={initiative.progress || 0} className="h-2" />
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {Math.round(initiative.progress || 0)}%
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{formatDate(initiative.startDate)} - {formatDate(initiative.endDate)}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/initiatives/${initiative.id}`}>
                              <Eye className="size-4 mr-2" />
                              View Details
                            </Link>
                          </DropdownMenuItem>
                          {canManage && (
                            <>
                              <DropdownMenuItem asChild>
                                <Link href={`/initiatives/${initiative.id}/edit`}>
                                  <Edit className="size-4 mr-2" />
                                  Edit
                                </Link>
                              </DropdownMenuItem>
                              {userRole === 'Admin' && (
                                <DropdownMenuItem
                                  onClick={() => handleDelete(initiative.id)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="size-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              )}
                            </>
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
  );
}
