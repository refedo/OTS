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
  Download,
  LayoutList,
  LayoutGrid,
  FileSpreadsheet,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type EmployeeRow = {
  id: string;
  employmentId: string;
  fullNameEn: string;
  fullNameAr: string | null;
  nationalId: string | null;
  boarderNumber: string | null;
  passportNumber: string | null;
  sponsorNumber: string | null;
  contractEndDate: string | null;
  contractType: string | null;
  workingLocation: string | null;
  status: string;
  department: string | null;
  section: string | null;
  division: string | null;
  occupation: string | null;
  dateOfJoining: string;
  dateOfLeaving: string | null;
  basicSalary: string | null;
  housingAllowance: string | null;
  transportAllowance: string | null;
  mobileAllowance: string | null;
  foodAllowance: string | null;
  otherAllowances: string | null;
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
type ViewMode = 'compact' | 'full';

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

function fmt(val: string | null | undefined, decimals = 2): string {
  if (!val) return '—';
  const n = Number(val);
  return Number.isFinite(n) ? n.toLocaleString('en-US', { minimumFractionDigits: decimals }) : '—';
}

function fmtDate(val: string | null | undefined): string {
  if (!val) return '—';
  return val.slice(0, 10);
}

export function EmployeesClient({
  employees,
  canViewCompensation,
  canCreate,
  canEdit,
  reconciliationComplete,
}: Props) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ACTIVE');
  const [occupationFilter, setOccupationFilter] = useState<string>('all');
  const [showArabic, setShowArabic] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('employmentId');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [viewMode, setViewMode] = useState<ViewMode>('compact');

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
        (e.nationalId ?? '').toLowerCase().includes(q) ||
        (e.boarderNumber ?? '').toLowerCase().includes(q)
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
        default:
          return '';
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

  const exportExcel = async () => {
    const XLSX = await import('xlsx');
    const rows = filtered.map((e) => {
      const base: Record<string, string | number | null> = {
        'Employment ID': e.employmentId,
        'Full Name (EN)': e.fullNameEn,
        'Full Name (AR)': e.fullNameAr ?? '',
        'National ID / Iqama': e.nationalId ?? '',
        'Boarder Number': e.boarderNumber ?? '',
        'Passport Number': e.passportNumber ?? '',
        'Sponsor Number': e.sponsorNumber ?? '',
        'Status': STATUS_CONFIG[e.status]?.label ?? e.status,
        'Position Title': e.occupation ?? '',
        'Department': e.department ?? '',
        'Section': e.section ?? '',
        'Division': e.division ?? '',
        'Date of Joining': fmtDate(e.dateOfJoining),
        'Date of Leaving': fmtDate(e.dateOfLeaving),
        'Contract Type': e.contractType ?? '',
        'Contract End Date': fmtDate(e.contractEndDate),
        'Working Location': e.workingLocation ?? '',
        'Last Synced': e.lastSyncedFromDolibarrAt
          ? new Date(e.lastSyncedFromDolibarrAt).toLocaleDateString('en-GB')
          : 'Never',
      };
      if (canViewCompensation) {
        base['Basic Salary (SAR)'] = e.basicSalary ? Number(e.basicSalary) : 0;
        base['Housing Allowance'] = e.housingAllowance ? Number(e.housingAllowance) : 0;
        base['Transport Allowance'] = e.transportAllowance ? Number(e.transportAllowance) : 0;
        base['Mobile Allowance'] = e.mobileAllowance ? Number(e.mobileAllowance) : 0;
        base['Food Allowance'] = e.foodAllowance ? Number(e.foodAllowance) : 0;
        base['Other Allowances'] = e.otherAllowances ? Number(e.otherAllowances) : 0;
        const total =
          (e.basicSalary ? Number(e.basicSalary) : 0) +
          (e.housingAllowance ? Number(e.housingAllowance) : 0) +
          (e.transportAllowance ? Number(e.transportAllowance) : 0) +
          (e.mobileAllowance ? Number(e.mobileAllowance) : 0) +
          (e.foodAllowance ? Number(e.foodAllowance) : 0) +
          (e.otherAllowances ? Number(e.otherAllowances) : 0);
        base['Total Package (SAR)'] = total;
      }
      return base;
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Employees');
    const date = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `OTS_Employees_${date}.xlsx`);
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
              <Button variant="outline" size="sm"
                className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                onClick={exportExcel}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Export Excel
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
          <button
            onClick={() => setStatusFilter('all')}
            className={cn('rounded-xl border p-4 shadow-sm text-left transition-all',
              statusFilter === 'all'
                ? 'bg-gradient-to-b from-sky-100 to-sky-50 border-sky-300 ring-2 ring-sky-200'
                : 'bg-gradient-to-b from-sky-50 to-white border-sky-200 hover:border-sky-300')}>
            <p className="text-xs text-sky-600 font-medium uppercase tracking-wide">Total</p>
            <p className="text-2xl font-bold text-sky-700 mt-1">{kpis.total}</p>
            <p className="text-xs text-sky-500 mt-0.5">all employees</p>
          </button>
          <button
            onClick={() => setStatusFilter('ACTIVE')}
            className={cn('rounded-xl border p-4 shadow-sm text-left transition-all',
              statusFilter === 'ACTIVE'
                ? 'bg-gradient-to-b from-emerald-100 to-emerald-50 border-emerald-300 ring-2 ring-emerald-200'
                : 'bg-gradient-to-b from-emerald-50 to-white border-emerald-200 hover:border-emerald-300')}>
            <div className="flex items-center gap-1.5 mb-1">
              <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
              <p className="text-xs text-emerald-600 font-medium uppercase tracking-wide">Active</p>
            </div>
            <p className="text-2xl font-bold text-emerald-700">{kpis.active}</p>
            <p className="text-xs text-emerald-500 mt-0.5">currently working</p>
          </button>
          <button
            onClick={() => setStatusFilter('ON_LEAVE')}
            className={cn('rounded-xl border p-4 shadow-sm text-left transition-all',
              statusFilter === 'ON_LEAVE'
                ? 'bg-gradient-to-b from-amber-100 to-amber-50 border-amber-300 ring-2 ring-amber-200'
                : 'bg-gradient-to-b from-amber-50 to-white border-amber-200 hover:border-amber-300')}>
            <div className="flex items-center gap-1.5 mb-1">
              <Clock className="h-3.5 w-3.5 text-amber-600" />
              <p className="text-xs text-amber-600 font-medium uppercase tracking-wide">On Leave</p>
            </div>
            <p className="text-2xl font-bold text-amber-700">{kpis.onLeave}</p>
            <p className="text-xs text-amber-500 mt-0.5">on approved leave</p>
          </button>
          <button
            onClick={() => setStatusFilter('TERMINATED')}
            className={cn('rounded-xl border p-4 shadow-sm text-left transition-all',
              ['TERMINATED', 'RESIGNED', 'SUSPENDED'].includes(statusFilter)
                ? 'bg-gradient-to-b from-rose-100 to-rose-50 border-rose-300 ring-2 ring-rose-200'
                : 'bg-gradient-to-b from-rose-50 to-white border-rose-200 hover:border-rose-300')}>
            <div className="flex items-center gap-1.5 mb-1">
              <UserX className="h-3.5 w-3.5 text-rose-600" />
              <p className="text-xs text-rose-600 font-medium uppercase tracking-wide">Inactive</p>
            </div>
            <p className="text-2xl font-bold text-rose-700">{kpis.inactive}</p>
            <p className="text-xs text-rose-500 mt-0.5">terminated / resigned</p>
          </button>
        </div>

        {/* Filters + Table */}
        <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
          {/* Filter bar */}
          <div className="px-6 py-4 border-b bg-slate-50/50 flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search name, ID, iqama, boarder number…"
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
            {/* View mode toggle */}
            <div className="flex border rounded-lg overflow-hidden bg-white ml-auto">
              <button
                onClick={() => setViewMode('compact')}
                className={cn('px-3 py-2 flex items-center gap-1.5 text-xs font-medium transition-colors',
                  viewMode === 'compact'
                    ? 'bg-sky-600 text-white'
                    : 'text-slate-500 hover:bg-slate-50')}>
                <LayoutList className="h-3.5 w-3.5" />
                Compact
              </button>
              <button
                onClick={() => setViewMode('full')}
                className={cn('px-3 py-2 flex items-center gap-1.5 text-xs font-medium border-l transition-colors',
                  viewMode === 'full'
                    ? 'bg-sky-600 text-white'
                    : 'text-slate-500 hover:bg-slate-50')}>
                <LayoutGrid className="h-3.5 w-3.5" />
                Full Details
              </button>
            </div>
          </div>

          {viewMode === 'compact' ? (
            /* Compact table view */
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
          ) : (
            /* Full details card grid */
            <div className="p-6">
              {filtered.length === 0 ? (
                <div className="py-16 text-center text-slate-400">
                  <Users className="h-10 w-10 mx-auto mb-2 text-slate-200" />
                  No employees match the current filters.
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {filtered.map((e) => {
                    const displayName = showArabic && e.fullNameAr ? e.fullNameAr : e.fullNameEn;
                    const statusCfg = STATUS_CONFIG[e.status] ?? { label: e.status, cls: 'bg-slate-100 text-slate-600 border-slate-200' };
                    const totalPackage = canViewCompensation
                      ? (Number(e.basicSalary ?? 0) + Number(e.housingAllowance ?? 0) +
                         Number(e.transportAllowance ?? 0) + Number(e.mobileAllowance ?? 0) +
                         Number(e.foodAllowance ?? 0) + Number(e.otherAllowances ?? 0))
                      : null;

                    return (
                      <div
                        key={e.id}
                        className={cn('rounded-xl border bg-white shadow-sm overflow-hidden', canEdit && 'cursor-pointer hover:border-sky-300 hover:shadow-md transition-all')}
                        onClick={() => canEdit && router.push(`/hr/employees/${e.id}`)}
                      >
                        {/* Card header */}
                        <div className="flex items-center justify-between px-4 py-3 bg-slate-50/50 border-b">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center text-sky-700 font-bold text-sm">
                              {e.fullNameEn.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-800 text-sm" dir={showArabic && e.fullNameAr ? 'rtl' : 'ltr'}>
                                {displayName}
                              </p>
                              <p className="text-xs text-slate-400 font-mono">{e.employmentId}</p>
                            </div>
                          </div>
                          <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border', statusCfg.cls)}>
                            {statusCfg.label}
                          </span>
                        </div>

                        {/* Card body */}
                        <div className="px-4 py-3 space-y-3">
                          {/* Identity */}
                          <div>
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Identity</p>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                              <div className="flex justify-between">
                                <span className="text-slate-400">Iqama (National ID)</span>
                                <span className="text-slate-700 font-mono">{e.nationalId ?? '—'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400">Boarder No.</span>
                                <span className="text-slate-700 font-mono">{e.boarderNumber ?? '—'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400">Passport</span>
                                <span className="text-slate-700 font-mono">{e.passportNumber ?? '—'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400">Sponsor No.</span>
                                <span className="text-slate-700 font-mono">{e.sponsorNumber ?? '—'}</span>
                              </div>
                            </div>
                          </div>

                          {/* Employment */}
                          <div className="border-t pt-2">
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Employment</p>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                              <div className="flex justify-between">
                                <span className="text-slate-400">Position</span>
                                <span className="text-slate-700">{e.occupation ?? '—'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400">Department</span>
                                <span className="text-slate-700">{e.department ?? '—'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400">Joined</span>
                                <span className="text-slate-700">{fmtDate(e.dateOfJoining)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400">Contract End</span>
                                <span className={cn('text-slate-700', e.contractEndDate && new Date(e.contractEndDate) < new Date() && 'text-rose-600 font-semibold')}>
                                  {fmtDate(e.contractEndDate)}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400">Contract Type</span>
                                <span className="text-slate-700">{e.contractType ?? '—'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400">Location</span>
                                <span className="text-slate-700">{e.workingLocation ?? '—'}</span>
                              </div>
                            </div>
                          </div>

                          {/* Compensation */}
                          {canViewCompensation && (
                            <div className="border-t pt-2">
                              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Compensation (SAR)</p>
                              <div className="grid grid-cols-3 gap-x-4 gap-y-1 text-xs">
                                <div className="flex justify-between col-span-1">
                                  <span className="text-slate-400">Basic</span>
                                  <span className="text-slate-700 font-medium">{fmt(e.basicSalary)}</span>
                                </div>
                                <div className="flex justify-between col-span-1">
                                  <span className="text-slate-400">Housing</span>
                                  <span className="text-slate-700">{fmt(e.housingAllowance)}</span>
                                </div>
                                <div className="flex justify-between col-span-1">
                                  <span className="text-slate-400">Transport</span>
                                  <span className="text-slate-700">{fmt(e.transportAllowance)}</span>
                                </div>
                                <div className="flex justify-between col-span-1">
                                  <span className="text-slate-400">Mobile</span>
                                  <span className="text-slate-700">{fmt(e.mobileAllowance)}</span>
                                </div>
                                <div className="flex justify-between col-span-1">
                                  <span className="text-slate-400">Food</span>
                                  <span className="text-slate-700">{fmt(e.foodAllowance)}</span>
                                </div>
                                <div className="flex justify-between col-span-1">
                                  <span className="text-slate-400">Other</span>
                                  <span className="text-slate-700">{fmt(e.otherAllowances)}</span>
                                </div>
                              </div>
                              {totalPackage !== null && (
                                <div className="mt-2 pt-2 border-t flex justify-between text-xs font-semibold">
                                  <span className="text-slate-500">Total Package</span>
                                  <span className="text-sky-700">{totalPackage.toLocaleString('en-US', { minimumFractionDigits: 2 })} SAR</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
