'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSessionValidator } from '@/hooks/use-session-validator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { showConfirmation } from '@/components/ui/confirmation-dialog';
import {
  Plus, Search, ChevronUp, ChevronDown, ChevronsUpDown,
  MoreHorizontal, Eye, CheckCircle, XCircle, Layers,
  AlertTriangle, TrendingUp, ShieldCheck, ListTodo,
  Github, Loader2,
} from 'lucide-react';

interface BacklogItem {
  id: string;
  code: string;
  title: string;
  type: string;
  category: string;
  priority: string;
  status: string;
  complianceFlag: boolean;
  createdAt: string;
  createdBy: { id: string; name: string };
  tasks: Array<{ id: string; title: string; status: string }>;
  githubIssueNumber?: number | null;
}

type SortKey = 'code' | 'title' | 'type' | 'priority' | 'status' | 'createdBy';
type SortDir = 'asc' | 'desc';

const PRIORITY_ORDER: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
const STATUS_ORDER: Record<string, number> = {
  BLOCKED: 0, IN_PROGRESS: 1, PLANNED: 2, APPROVED: 3,
  UNDER_REVIEW: 4, IDEA: 5, COMPLETED: 6, DROPPED: 7,
};

function codeNum(code: string) {
  return parseInt(code.match(/\d+$/)?.[0] ?? '0');
}

export default function BacklogBoard() {
  const { isValidating } = useSessionValidator();
  const router = useRouter();
  const [items, setItems] = useState<BacklogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ type: '', category: '', status: 'OPEN', priority: '', search: '' });
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: 'code', dir: 'asc' });
  const [bulkSyncing, setBulkSyncing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number; failed: number } | null>(null);

  const fetchBacklogItems = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.type) params.append('type', filters.type);
      if (filters.category) params.append('category', filters.category);
      if (filters.status && filters.status !== 'OPEN') params.append('status', filters.status);
      if (filters.priority) params.append('priority', filters.priority);
      if (filters.search) params.append('search', filters.search);
      const response = await fetch(`/api/backlog?${params.toString()}`);
      if (response.ok) {
        const data: BacklogItem[] = await response.json();
        setItems(filters.status === 'OPEN' ? data.filter(i => i.status !== 'COMPLETED' && i.status !== 'DROPPED') : data);
      }
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchBacklogItems(); }, [fetchBacklogItems]);

  const handleSort = (key: SortKey) => {
    setSort(prev => prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' });
  };

  const sorted = [...items].sort((a, b) => {
    const mul = sort.dir === 'asc' ? 1 : -1;
    switch (sort.key) {
      case 'code':     return mul * (codeNum(a.code) - codeNum(b.code));
      case 'title':    return mul * a.title.localeCompare(b.title);
      case 'type':     return mul * a.type.localeCompare(b.type);
      case 'priority': return mul * ((PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9));
      case 'status':   return mul * ((STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9));
      case 'createdBy': return mul * a.createdBy.name.localeCompare(b.createdBy.name);
      default:         return 0;
    }
  });

  const patchStatus = async (id: string, status: string, label: string) => {
    const res = await fetch(`/api/backlog/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      showConfirmation({ type: 'success', title: `${label}`, message: `Item marked as ${label.toLowerCase()}.` });
      fetchBacklogItems();
    } else {
      const err = await res.json();
      showConfirmation({ type: 'error', title: 'Failed', message: err.error || 'Could not update status.' });
    }
  };

  const handleBulkGitHubSync = () => {
    const unsynced = sorted.filter(i => !i.githubIssueNumber);
    if (unsynced.length === 0) {
      showConfirmation({ type: 'success', title: 'All synced', message: 'All visible items are already linked to GitHub issues.' });
      return;
    }
    showConfirmation({
      type: 'warning',
      title: 'Push to GitHub',
      message: `This will create GitHub issues for ${unsynced.length} item${unsynced.length !== 1 ? 's' : ''} that are not yet synced. Continue?`,
      confirmText: 'Push All',
      onConfirm: async () => {
        setBulkSyncing(true);
        setBulkProgress({ done: 0, total: unsynced.length, failed: 0 });
        try {
          const res = await fetch('/api/backlog/github/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: unsynced.map(i => i.id) }),
          });
          const data = await res.json();
          if (res.ok) {
            setBulkProgress({ done: data.succeeded, total: data.total, failed: data.failed });
            showConfirmation({
              type: data.failed > 0 ? 'warning' : 'success',
              title: 'Bulk Sync Complete',
              message: `${data.succeeded} issue${data.succeeded !== 1 ? 's' : ''} created on GitHub.${data.failed > 0 ? ` ${data.failed} failed — check your GitHub token and repo settings.` : ''}`,
            });
            fetchBacklogItems();
          } else {
            showConfirmation({ type: 'error', title: 'Sync Failed', message: data.error || 'Failed to push to GitHub' });
          }
        } catch {
          showConfirmation({ type: 'error', title: 'Sync Failed', message: 'Failed to connect to GitHub' });
        } finally {
          setBulkSyncing(false);
          setBulkProgress(null);
        }
      },
    });
  };

  const getPriorityStyle = (p: string) => {
    switch (p) {
      case 'CRITICAL': return 'bg-red-100 text-red-800 border-red-300';
      case 'HIGH':     return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'MEDIUM':   return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'LOW':      return 'bg-green-100 text-green-800 border-green-300';
      default:         return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getStatusStyle = (s: string) => {
    switch (s) {
      case 'IDEA':         return 'bg-slate-100 text-slate-600';
      case 'UNDER_REVIEW': return 'bg-blue-100 text-blue-700';
      case 'APPROVED':     return 'bg-green-100 text-green-700';
      case 'PLANNED':      return 'bg-violet-100 text-violet-700';
      case 'IN_PROGRESS':  return 'bg-indigo-100 text-indigo-700';
      case 'BLOCKED':      return 'bg-red-100 text-red-700';
      case 'COMPLETED':    return 'bg-emerald-100 text-emerald-700';
      case 'DROPPED':      return 'bg-gray-100 text-gray-400';
      default:             return 'bg-gray-100 text-gray-600';
    }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sort.key !== col) return <ChevronsUpDown className="size-3 opacity-40" />;
    return sort.dir === 'asc' ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />;
  };

  const SortTh = ({ col, label, className = '' }: { col: SortKey; label: string; className?: string }) => (
    <th
      onClick={() => handleSort(col)}
      className={`px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer select-none hover:text-foreground transition-colors ${className}`}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <SortIcon col={col} />
      </span>
    </th>
  );

  const stats = [
    {
      label: 'Total Items',
      value: items.length,
      icon: <ListTodo className="size-5" />,
      color: 'text-primary',
      bg: 'bg-primary/10',
      filter: null,
    },
    {
      label: 'High / Critical',
      value: items.filter(i => ['HIGH', 'CRITICAL'].includes(i.priority)).length,
      icon: <AlertTriangle className="size-5" />,
      color: 'text-orange-600',
      bg: 'bg-orange-100',
      filter: { key: 'priority', value: 'HIGH' },
    },
    {
      label: 'In Progress',
      value: items.filter(i => ['APPROVED', 'PLANNED', 'IN_PROGRESS'].includes(i.status)).length,
      icon: <TrendingUp className="size-5" />,
      color: 'text-green-600',
      bg: 'bg-green-100',
      filter: { key: 'status', value: 'IN_PROGRESS' },
    },
    {
      label: 'Completed',
      value: items.filter(i => i.status === 'COMPLETED').length,
      icon: <CheckCircle className="size-5" />,
      color: 'text-emerald-600',
      bg: 'bg-emerald-100',
      filter: { key: 'status', value: 'COMPLETED' },
    },
    {
      label: 'Compliance',
      value: items.filter(i => i.complianceFlag).length,
      icon: <ShieldCheck className="size-5" />,
      color: 'text-purple-600',
      bg: 'bg-purple-100',
      filter: null,
    },
  ];

  if (isValidating) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading backlog...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen">
      <div className="p-6 lg:p-8 space-y-6 max-lg:pt-20">

        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Product Backlog</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Single source of truth for features, bugs, tech debt, and system improvements
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              onClick={handleBulkGitHubSync}
              disabled={bulkSyncing || loading}
            >
              {bulkSyncing ? (
                <><Loader2 className="size-4 mr-2 animate-spin" />
                  {bulkProgress ? `${bulkProgress.done}/${bulkProgress.total}` : 'Pushing...'}</>
              ) : (
                <><Github className="size-4 mr-2" />Push All to GitHub</>
              )}
            </Button>
            <Button className="shrink-0" onClick={() => router.push('/backlog/new')}>
              <Plus className="size-4 mr-2" />
              New Backlog Item
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {stats.map(s => (
            <Card
              key={s.label}
              className={`border-0 shadow-sm transition-all ${s.filter ? 'cursor-pointer hover:shadow-md hover:scale-[1.02]' : ''}`}
              onClick={s.filter ? (() => {
                const fk = s.filter!.key as keyof typeof filters;
                const fv = s.filter!.value;
                setFilters(prev => ({ ...prev, [fk]: prev[fk] === fv ? '' : fv }));
              }) : undefined}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`p-2 rounded-lg ${s.bg} ${s.color}`}>{s.icon}</div>
                <div>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3 pt-4 px-4">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Filters</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={filters.search}
                  onChange={e => setFilters({ ...filters, search: e.target.value })}
                  className="pl-8 h-9 text-sm"
                />
              </div>
              {[
                { key: 'type', options: [['', 'All Types'], ['FEATURE', 'Feature'], ['BUG', 'Bug'], ['TECH_DEBT', 'Tech Debt'], ['PERFORMANCE', 'Performance'], ['REPORTING', 'Reporting'], ['REFACTOR', 'Refactor'], ['COMPLIANCE', 'Compliance'], ['INSIGHT', 'Insight']] },
                { key: 'priority', options: [['', 'All Priorities'], ['CRITICAL', 'Critical'], ['HIGH', 'High'], ['MEDIUM', 'Medium'], ['LOW', 'Low']] },
                { key: 'status', options: [['', 'All Statuses'], ['OPEN', 'Open'], ['IDEA', 'Idea'], ['UNDER_REVIEW', 'Under Review'], ['APPROVED', 'Approved'], ['PLANNED', 'Planned'], ['IN_PROGRESS', 'In Progress'], ['BLOCKED', 'Blocked'], ['COMPLETED', 'Completed'], ['DROPPED', 'Dropped']] },
                { key: 'category', options: [['', 'All Categories'], ['CORE_SYSTEM', 'Core System'], ['PRODUCTION', 'Production'], ['DESIGN', 'Design'], ['DETAILING', 'Detailing'], ['PROCUREMENT', 'Procurement'], ['QC', 'QC'], ['LOGISTICS', 'Logistics'], ['FINANCE', 'Finance'], ['REPORTING', 'Reporting'], ['AI', 'AI'], ['GOVERNANCE', 'Governance'], ['PROJECTS', 'Projects']] },
              ].map(({ key, options }) => (
                <select
                  key={key}
                  value={filters[key as keyof typeof filters]}
                  onChange={e => setFilters({ ...filters, [key]: e.target.value })}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  {options.map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                </select>
              ))}
            </div>
            {(filters.type || filters.category || filters.priority || filters.search || (filters.status !== 'OPEN' && filters.status !== '')) && (
              <button
                onClick={() => setFilters({ type: '', category: '', status: 'OPEN', priority: '', search: '' })}
                className="mt-3 text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
              >
                Clear all filters
              </button>
            )}
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted/40">
                <tr>
                  <SortTh col="code"      label="Code"       className="w-28" />
                  <SortTh col="title"     label="Title" />
                  <SortTh col="type"      label="Type"       className="w-32 hidden md:table-cell" />
                  <SortTh col="priority"  label="Priority"   className="w-28" />
                  <SortTh col="status"    label="Status"     className="w-32" />
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-24 hidden lg:table-cell">
                    Tasks
                  </th>
                  <SortTh col="createdBy" label="Creator"    className="w-32 hidden lg:table-cell" />
                  <th className="px-4 py-3 w-12" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
                    </td>
                  </tr>
                ) : sorted.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-16 text-center">
                      <Layers className="size-10 mx-auto mb-3 text-muted-foreground/40" />
                      <p className="text-muted-foreground text-sm">No backlog items found.</p>
                      <Button size="sm" className="mt-4" onClick={() => router.push('/backlog/new')}>
                        <Plus className="size-3.5 mr-1.5" /> Create first item
                      </Button>
                    </td>
                  </tr>
                ) : (
                  sorted.map(item => (
                    <tr
                      key={item.id}
                      onClick={() => router.push(`/backlog/${item.id}`)}
                      className="hover:bg-muted/40 cursor-pointer transition-colors group"
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-xs font-mono font-semibold text-muted-foreground">{item.code}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm font-medium">{item.title}</span>
                          {item.complianceFlag && (
                            <Badge variant="outline" className="text-xs px-1.5 py-0 border-purple-300 text-purple-700 bg-purple-50 shrink-0">
                              C
                            </Badge>
                          )}
                          {item.githubIssueNumber && (
                            <Badge variant="outline" className="text-xs px-1.5 py-0 border-gray-300 text-gray-500 bg-gray-50 shrink-0 gap-0.5 hidden lg:inline-flex">
                              <Github className="size-2.5" />#{item.githubIssueNumber}
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap hidden md:table-cell">
                        <span className="text-xs text-muted-foreground">{item.type.replace(/_/g, ' ')}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge variant="outline" className={`text-xs ${getPriorityStyle(item.priority)}`}>
                          {item.priority}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusStyle(item.status)}`}>
                          {item.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap hidden lg:table-cell">
                        {item.tasks.length > 0 ? (
                          <span className="text-xs text-primary font-medium">{item.tasks.length} task{item.tasks.length !== 1 ? 's' : ''}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap hidden lg:table-cell">
                        <span className="text-xs text-muted-foreground">{item.createdBy.name}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right" onClick={e => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-7 data-[state=open]:bg-muted">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem onClick={() => router.push(`/backlog/${item.id}`)}>
                              <Eye className="size-4 mr-2" /> View
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {!['APPROVED', 'PLANNED', 'IN_PROGRESS', 'COMPLETED', 'DROPPED'].includes(item.status) && (
                              <DropdownMenuItem onClick={() => patchStatus(item.id, 'APPROVED', 'Approved')} className="text-green-700">
                                <CheckCircle className="size-4 mr-2" /> Approve
                              </DropdownMenuItem>
                            )}
                            {!['COMPLETED', 'DROPPED'].includes(item.status) && (
                              <DropdownMenuItem onClick={() => patchStatus(item.id, 'COMPLETED', 'Completed')} className="text-emerald-700">
                                <CheckCircle className="size-4 mr-2" /> Complete
                              </DropdownMenuItem>
                            )}
                            {item.status !== 'DROPPED' && (
                              <DropdownMenuItem onClick={() => patchStatus(item.id, 'DROPPED', 'Dropped')} className="text-destructive">
                                <XCircle className="size-4 mr-2" /> Drop
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {!loading && sorted.length > 0 && (
            <div className="px-4 py-2.5 border-t bg-muted/20 text-xs text-muted-foreground">
              Showing {sorted.length} of {items.length} item{items.length !== 1 ? 's' : ''}
            </div>
          )}
        </Card>

      </div>
    </main>
  );
}
