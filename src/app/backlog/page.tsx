'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSessionValidator } from '@/hooks/use-session-validator';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search } from 'lucide-react';

interface BacklogItem {
  id: string;
  code: string;
  title: string;
  description: string;
  type: string;
  category: string;
  businessReason: string;
  expectedValue: string | null;
  priority: string;
  status: string;
  affectedModules: string[];
  riskLevel: string;
  complianceFlag: boolean;
  createdAt: string;
  tasks: Array<{
    id: string;
    title: string;
    status: string;
  }>;
}

export default function BacklogBoard() {
  const { isValidating } = useSessionValidator();
  const router = useRouter();
  const [items, setItems] = useState<BacklogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    type: '',
    category: '',
    status: '',
    priority: '',
    search: '',
  });
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchBacklogItems();
  }, [filters]);

  const fetchBacklogItems = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.type) params.append('type', filters.type);
      if (filters.category) params.append('category', filters.category);
      if (filters.status) params.append('status', filters.status);
      if (filters.priority) params.append('priority', filters.priority);
      if (filters.search) params.append('search', filters.search);

      const response = await fetch(`/api/backlog?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setItems(data);
      }
    } catch (error) {
      console.error('Error fetching backlog items:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return 'bg-red-100 text-red-800 border-red-300';
      case 'HIGH': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'LOW': return 'bg-green-100 text-green-800 border-green-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'IDEA': return 'bg-gray-100 text-gray-700';
      case 'UNDER_REVIEW': return 'bg-blue-100 text-blue-700';
      case 'APPROVED': return 'bg-green-100 text-green-700';
      case 'PLANNED': return 'bg-purple-100 text-purple-700';
      case 'IN_PROGRESS': return 'bg-indigo-100 text-indigo-700';
      case 'BLOCKED': return 'bg-red-100 text-red-700';
      case 'COMPLETED': return 'bg-emerald-100 text-emerald-700';
      case 'DROPPED': return 'bg-gray-100 text-gray-500';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (isValidating || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading backlog...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto p-6 lg:p-8 space-y-6 max-lg:pt-20">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Product Backlog</h1>
            <p className="text-muted-foreground mt-1">
              Single source of truth for features, bugs, tech debt, and system improvements
            </p>
          </div>
          <Button 
            className="bg-primary hover:bg-primary/90"
            onClick={() => router.push('/backlog/new')}
          >
            <Plus className="size-4 mr-2" />
            New Backlog Item
          </Button>
        </div>

        {/* Filters Card */}
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Search
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search by title, code, or reason..."
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    className="pl-9"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Type
                </label>
                <select
                  value={filters.type}
                  onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">All Types</option>
                  <option value="FEATURE">Feature</option>
                  <option value="BUG">Bug</option>
                  <option value="TECH_DEBT">Tech Debt</option>
                  <option value="PERFORMANCE">Performance</option>
                  <option value="REPORTING">Reporting</option>
                  <option value="REFACTOR">Refactor</option>
                  <option value="COMPLIANCE">Compliance</option>
                  <option value="INSIGHT">Insight</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Priority
                </label>
                <select
                  value={filters.priority}
                  onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">All Priorities</option>
                  <option value="CRITICAL">Critical</option>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">All Statuses</option>
                  <option value="IDEA">Idea</option>
                  <option value="UNDER_REVIEW">Under Review</option>
                  <option value="APPROVED">Approved</option>
                  <option value="PLANNED">Planned</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="BLOCKED">Blocked</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="DROPPED">Dropped</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Category
                </label>
                <select
                  value={filters.category}
                  onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">All Categories</option>
                  <option value="CORE_SYSTEM">Core System</option>
                  <option value="PRODUCTION">Production</option>
                  <option value="DESIGN">Design</option>
                  <option value="DETAILING">Detailing</option>
                  <option value="PROCUREMENT">Procurement</option>
                  <option value="QC">QC</option>
                  <option value="LOGISTICS">Logistics</option>
                  <option value="FINANCE">Finance</option>
                  <option value="REPORTING">Reporting</option>
                  <option value="AI">AI</option>
                  <option value="GOVERNANCE">Governance</option>
                </select>
              </div>
            </div>

            <div className="mt-4 flex justify-between items-center">
              <Button
                variant="ghost"
                onClick={() => setFilters({ type: '', category: '', status: '', priority: '', search: '' })}
              >
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Table Card */}
        <Card>
          <CardContent className="p-0">
            <table className="min-w-full divide-y">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Tasks
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                      No backlog items found. Create your first item to get started.
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => router.push(`/backlog/${item.id}`)}
                      className="hover:bg-muted/50 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {item.code}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center">
                          {item.title}
                          {item.complianceFlag && (
                            <Badge variant="secondary" className="ml-2">
                              Compliance
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {item.type.replace('_', ' ')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant="outline" className={getPriorityColor(item.priority)}>
                          {item.priority}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge className={getStatusColor(item.status)}>
                          {item.status.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {item.tasks.length > 0 ? (
                          <span className="text-primary">
                            {item.tasks.length} task{item.tasks.length !== 1 ? 's' : ''}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">No tasks</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/backlog/${item.id}`);
                          }}
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Total Items</div>
              <div className="text-2xl font-bold">{items.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">High/Critical Priority</div>
              <div className="text-2xl font-bold text-orange-600">
                {items.filter(i => ['HIGH', 'CRITICAL'].includes(i.priority)).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Approved</div>
              <div className="text-2xl font-bold text-green-600">
                {items.filter(i => ['APPROVED', 'PLANNED', 'IN_PROGRESS'].includes(i.status)).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Compliance Items</div>
              <div className="text-2xl font-bold text-purple-600">
                {items.filter(i => i.complianceFlag).length}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
