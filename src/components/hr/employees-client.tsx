'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Users,
  Plus,
  Search,
  RefreshCw,
  Languages,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  AlertTriangle,
  UserCheck,
  UserX,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type EmployeeRow = {
  id: string;
  employmentId: string;
  fullNameEn: string;
  fullNameAr: string | null;
  nationalId: string | null;
  status: string;
  department: string | null;
  section: string | null;
  division: string | null;
  occupation: string | null;
  dateOfJoining: string;
  dateOfLeaving: string | null;
  basicSalary: string | null;
  lastSyncedFromDolibarrAt: string | null;
  manuallyEditedFields: string[];
};

type SortKey =
  | 'employmentId'
  | 'name'
  | 'occupation'
  | 'department'
  | 'status'
  | 'dateOfJoining'
  | 'basicSalary'
  | 'lastSyncedFromDolibarrAt';
type SortDir = 'asc' | 'desc';

type Props = {
  employees: EmployeeRow[];
  canViewCompensation: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  reconciliationComplete: boolean;
};

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  ACTIVE:     { label: 'Active',      cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  ON_LEAVE:   { label: 'On Leave',    cls: 'bg-amber-100 text-amber-700 border-amber-200' },
  SUSPENDED:  { label: 'Suspended',   cls: 'bg-orange-100 text-orange-700 border-orange-200' },
  TERMINATED: { label: 'Terminated',  cls: 'bg-rose-100 text-rose-700 border-rose-200' },
  RESIGNED:   { label: 'Resigned',    cls: 'bg-slate-100 text-slate-600 border-slate-200' },
};

export function EmployeesClient({
  employees,
  canViewCompensation,
  canCreate,
  canEdit,
  reconciliationComplete,
}: Props) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [occupationFilter, setOccupationFilter] = useState<string>('all');
  const [showArabic, setShowArabic] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('employmentId');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const occupations = useMemo(() => {
    const set = new Set<string>();
    for (const e of employees) if (e.occupation) set.add(e.occupation);
    return Array.from(set).sort();
  }, [employees]);

  const kpis = useMemo(() => ({
    total:      employees.length,
    active:     employees.filter(e => e.status === 'ACTIVE').length,
    onLeave:    employees.filter(e => e.status === 'ON_LEAVE').length,
    inactive:   employees.filter(e => ['TERMINATED', 'RESIGNED', 'SUSPENDED'].includes(e.status)).length,
  }), [employees]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const matches = employees.filter((e) => {
      if (statusFilter !== 'all' && e.status !== statusFilter) return false;
      if (occupationFilter !== 'all' && e.occupation !== occupationFilter) return false;
      if (!q) return true;
      return (
        e.fullNameEn.toLowerCase().includes(q) ||
        (e.fullNameAr ?? '').toLowerCase().includes(q) ||
        e.employmentId.toLowerCase().includes(q) ||
        (e.nationalId ?? '').toLowerCase().includes(q)
      );
    });

    const dir = sortDir === 'asc' ? 1 : -1;
    const getValue = (e: EmployeeRow): string | number => {
      switch (sortKey) {
        case 'employmentId': {
          const digits = e.employmentId.replace(/[^0-9]/g, '');
          const n = digits ? parseInt(digits, 10) : NaN;
          return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER;
        }
        case 'name':
          return (showArabic && e.fullNameAr ? e.fullNameAr : e.fullNameEn).toLowerCase();
        case 'occupation':
          return (e.occupation ?? '').toLowerCase();
        case 'department':
          return (e.department ?? '').toLowerCase();
        case 'status':
          return e.status;
        case 'dateOfJoining':
          return e.dateOfJoining;
        case 'basicSalary':
          return e.basicSalary ? Number(e.basicSalary) : -Infinity;
        case 'lastSyncedFromDolibarrAt':
          return e.lastSyncedFromDolibarrAt ?? '';
      }
    };

    return [...matches].sort((a, b) => {
      const av = getValue(a);
      const bv = getValue(b);
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }, [employees, search, statusFilter, occupationFilter, sortKey, sortDir, showArabic]);

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="ml-1 inline h-3 w-3 opacity-40" />;
    return sortDir === 'asc'
      ? <ArrowUp className="ml-1 inline h-3 w-3" />
      : <ArrowDown className="ml-1 inline h-3 w-3" />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Hero */}
        <div className="rounded-2xl border bg-gradient-to-br from-sky-600 via-sky-500 to-blue-600 p-6 md:p-8 text-white shadow-lg relative overflow-hidden">
          <div className="absolute -top-4 -right-4 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute -bottom-8 -left-8 w-48 h-48 bg-white/5 rounded-full blur-3xl" />
          <div className="relative z-10 flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <Users className="h-5 w-5" />
                </div>
                <h1 className="text-2xl font-bold">Employees</h1>
              </div>
              <p className="text-sky-100 text-sm">
                {filtered.length === employees.length
                  ? `${employees.length} employees in the registry`
                  : `Showing ${filtered.length} of ${employees.length} employees`}
                {!reconciliationComplete && (
                  <span className="ml-2 inline-flex items-center gap-1 text-amber-200">
                    <AlertTriangle className="h-3 w-3" />
                    Identity reconciliation pending
                  </span>
                )}
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm"
                className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                onClick={() => setShowArabic((v) => !v)}>
                <Languages className="mr-2 h-4 w-4" />
                {showArabic ? 'English' : 'العربية'}
              </Button>
              <Link href="/hr/employees/sync">
                <Button variant="outline" size="sm"
                  className="bg-white/10 border-white/30 text-white hover:bg-white/20">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Sync from Dolibarr
                </Button>
              </Link>
              {canCreate && (
                <Link href="/hr/employees/new">
                  <Button size="sm" className="bg-white text-sky-700 hover:bg-sky-50 border-0 shadow-sm">
                    <Plus className="mr-2 h-4 w-4" />
                    New Employee
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* KPI Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-xl border bg-gradient-to-b from-sky-50 to-white border-sky-200 p-4 shadow-sm">
            <p className="text-xs text-sky-600 font-medium uppercase tracking-wide">Total</p>
            <p className="text-2xl font-bold text-sky-700 mt-1">{kpis.total}</p>
            <p className="text-xs text-sky-500 mt-0.5">all employees</p>
          </div>
          <div className="rounded-xl border bg-gradient-to-b from-emerald-50 to-white border-emerald-200 p-4 shadow-sm">
            <div className="flex items-center gap-1.5 mb-1">
              <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
              <p className="text-xs text-emerald-600 font-medium uppercase tracking-wide">Active</p>
            </div>
            <p className="text-2xl font-bold text-emerald-700">{kpis.active}</p>
            <p className="text-xs text-emerald-500 mt-0.5">currently working</p>
          </div>
          <div className="rounded-xl border bg-gradient-to-b from-amber-50 to-white border-amber-200 p-4 shadow-sm">
            <div className="flex items-center gap-1.5 mb-1">
              <Clock className="h-3.5 w-3.5 text-amber-600" />
              <p className="text-xs text-amber-600 font-medium uppercase tracking-wide">On Leave</p>
            </div>
            <p className="text-2xl font-bold text-amber-700">{kpis.onLeave}</p>
            <p className="text-xs text-amber-500 mt-0.5">on approved leave</p>
          </div>
          <div className="rounded-xl border bg-gradient-to-b from-rose-50 to-white border-rose-200 p-4 shadow-sm">
            <div className="flex items-center gap-1.5 mb-1">
              <UserX className="h-3.5 w-3.5 text-rose-600" />
              <p className="text-xs text-rose-600 font-medium uppercase tracking-wide">Inactive</p>
            </div>
            <p className="text-2xl font-bold text-rose-700">{kpis.inactive}</p>
            <p className="text-xs text-rose-500 mt-0.5">terminated / resigned</p>
          </div>
        </div>

        {/* Filters + Table */}
        <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
          {/* Filter bar */}
          <div className="px-6 py-4 border-b bg-slate-50/50 flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search name, employment ID, national ID…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-white"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px] bg-white">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="ON_LEAVE">On leave</SelectItem>
                <SelectItem value="SUSPENDED">Suspended</SelectItem>
                <SelectItem value="TERMINATED">Terminated</SelectItem>
                <SelectItem value="RESIGNED">Resigned</SelectItem>
              </SelectContent>
            </Select>
            <Select value={occupationFilter} onValueChange={setOccupationFilter}>
              <SelectTrigger className="w-[200px] bg-white">
                <SelectValue placeholder="Position Title" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All position titles</SelectItem>
                {occupations.map((o) => (
                  <SelectItem key={o} value={o}>{o}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50/30 text-left">
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide cursor-pointer select-none hover:text-slate-700"
                    onClick={() => toggleSort('employmentId')}>
                    ID <SortIcon col="employmentId" />
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide cursor-pointer select-none hover:text-slate-700"
                    onClick={() => toggleSort('name')}>
                    Name <SortIcon col="name" />
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide cursor-pointer select-none hover:text-slate-700"
                    onClick={() => toggleSort('occupation')}>
                    Position Title <SortIcon col="occupation" />
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide cursor-pointer select-none hover:text-slate-700"
                    onClick={() => toggleSort('department')}>
                    Department <SortIcon col="department" />
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide cursor-pointer select-none hover:text-slate-700"
                    onClick={() => toggleSort('status')}>
                    Status <SortIcon col="status" />
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide cursor-pointer select-none hover:text-slate-700"
                    onClick={() => toggleSort('dateOfJoining')}>
                    Joined <SortIcon col="dateOfJoining" />
                  </th>
                  {canViewCompensation && (
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide cursor-pointer select-none hover:text-slate-700"
                      onClick={() => toggleSort('basicSalary')}>
                      Basic Salary <SortIcon col="basicSalary" />
                    </th>
                  )}
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide cursor-pointer select-none hover:text-slate-700"
                    onClick={() => toggleSort('lastSyncedFromDolibarrAt')}>
                    Sync <SortIcon col="lastSyncedFromDolibarrAt" />
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={canViewCompensation ? 8 : 7}
                      className="px-4 py-16 text-center text-slate-400">
                      <Users className="h-10 w-10 mx-auto mb-2 text-slate-200" />
                      No employees match the current filters.
                    </td>
                  </tr>
                )}
                {filtered.map((e) => {
                  const displayName = showArabic && e.fullNameAr ? e.fullNameAr : e.fullNameEn;
                  const edited = e.manuallyEditedFields.length > 0;
                  const statusCfg = STATUS_CONFIG[e.status] ?? { label: e.status, cls: 'bg-slate-100 text-slate-600 border-slate-200' };
                  return (
                    <tr
                      key={e.id}
                      className={cn('hover:bg-sky-50/30 transition-colors', canEdit && 'cursor-pointer')}
                      onClick={() => canEdit && router.push(`/hr/employees/${e.id}`)}
                    >
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{e.employmentId}</td>
                      <td className="px-4 py-3" dir={showArabic && e.fullNameAr ? 'rtl' : 'ltr'}>
                        <span className="font-medium text-slate-800">{displayName}</span>
                        {edited && (
                          <span className="ml-2 text-[10px] bg-violet-100 text-violet-600 border border-violet-200 px-1.5 py-0.5 rounded-full">
                            Edited
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{e.occupation ?? <span className="text-slate-300">—</span>}</td>
                      <td className="px-4 py-3 text-slate-600">{e.department ?? <span className="text-slate-300">—</span>}</td>
                      <td className="px-4 py-3">
                        <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border', statusCfg.cls)}>
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{e.dateOfJoining.slice(0, 10)}</td>
                      {canViewCompensation && (
                        <td className="px-4 py-3 text-slate-700 font-medium text-xs">
                          {e.basicSalary
                            ? `${Number(e.basicSalary).toLocaleString('en-US', { minimumFractionDigits: 2 })} SAR`
                            : <span className="text-slate-300">—</span>}
                        </td>
                      )}
                      <td className="px-4 py-3 text-xs text-slate-400">
                        {e.lastSyncedFromDolibarrAt
                          ? new Date(e.lastSyncedFromDolibarrAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                          : <span className="text-rose-400">Never</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
