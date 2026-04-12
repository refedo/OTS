'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Search, RefreshCw, Languages } from 'lucide-react';

type EmployeeRow = {
  id: string;
  employmentId: string;
  fullNameEn: string;
  fullNameAr: string | null;
  nationalId: string | null;
  status: string;
  trade: string | null;
  department: string | null;
  dateOfJoining: string;
  dateOfLeaving: string | null;
  basicSalary: string | null;
  lastSyncedFromDolibarrAt: string | null;
  manuallyEditedFields: string[];
};

type Props = {
  employees: EmployeeRow[];
  canViewCompensation: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  reconciliationComplete: boolean;
};

const STATUS_VARIANTS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  ON_LEAVE: 'bg-yellow-100 text-yellow-800',
  SUSPENDED: 'bg-orange-100 text-orange-800',
  TERMINATED: 'bg-red-100 text-red-800',
  RESIGNED: 'bg-gray-100 text-gray-800',
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
  const [tradeFilter, setTradeFilter] = useState<string>('all');
  const [showArabic, setShowArabic] = useState(false);

  const trades = useMemo(() => {
    const set = new Set<string>();
    for (const e of employees) if (e.trade) set.add(e.trade);
    return Array.from(set).sort();
  }, [employees]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return employees.filter((e) => {
      if (statusFilter !== 'all' && e.status !== statusFilter) return false;
      if (tradeFilter !== 'all' && e.trade !== tradeFilter) return false;
      if (!q) return true;
      return (
        e.fullNameEn.toLowerCase().includes(q) ||
        (e.fullNameAr ?? '').toLowerCase().includes(q) ||
        e.employmentId.toLowerCase().includes(q) ||
        (e.nationalId ?? '').toLowerCase().includes(q)
      );
    });
  }, [employees, search, statusFilter, tradeFilter]);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Employees</h1>
          <p className="text-sm text-muted-foreground">
            {employees.length} employees total
            {!reconciliationComplete && (
              <span className="ml-2 text-amber-600">
                · Identity reconciliation pending
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowArabic((v) => !v)}>
            <Languages className="mr-2 h-4 w-4" />
            {showArabic ? 'English' : 'العربية'}
          </Button>
          <Link href="/hr/employees/sync">
            <Button variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Sync from Dolibarr
            </Button>
          </Link>
          {canCreate && (
            <Link href="/hr/employees/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Employee
              </Button>
            </Link>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search name, employment ID, national ID…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
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
            <Select value={tradeFilter} onValueChange={setTradeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Trade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All trades</SelectItem>
                {trades.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="p-2 font-medium">ID</th>
                  <th className="p-2 font-medium">Name</th>
                  <th className="p-2 font-medium">Trade</th>
                  <th className="p-2 font-medium">Department</th>
                  <th className="p-2 font-medium">Status</th>
                  <th className="p-2 font-medium">Joined</th>
                  {canViewCompensation && <th className="p-2 font-medium">Basic Salary</th>}
                  <th className="p-2 font-medium">Sync</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={canViewCompensation ? 8 : 7} className="p-6 text-center text-muted-foreground">
                      No employees match the current filters.
                    </td>
                  </tr>
                )}
                {filtered.map((e) => {
                  const displayName =
                    showArabic && e.fullNameAr ? e.fullNameAr : e.fullNameEn;
                  const edited = e.manuallyEditedFields.length > 0;
                  return (
                    <tr
                      key={e.id}
                      className="border-b hover:bg-muted/40 cursor-pointer"
                      onClick={() => canEdit && router.push(`/hr/employees/${e.id}`)}
                    >
                      <td className="p-2 font-mono text-xs">{e.employmentId}</td>
                      <td
                        className="p-2 font-medium"
                        dir={showArabic && e.fullNameAr ? 'rtl' : 'ltr'}
                      >
                        {displayName}
                        {edited && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            Edited
                          </Badge>
                        )}
                      </td>
                      <td className="p-2">{e.trade ?? '—'}</td>
                      <td className="p-2">{e.department ?? '—'}</td>
                      <td className="p-2">
                        <span
                          className={`px-2 py-0.5 rounded text-xs ${STATUS_VARIANTS[e.status] ?? ''}`}
                        >
                          {e.status}
                        </span>
                      </td>
                      <td className="p-2">{e.dateOfJoining.slice(0, 10)}</td>
                      {canViewCompensation && (
                        <td className="p-2">
                          {e.basicSalary ? `${Number(e.basicSalary).toLocaleString()} SAR` : '—'}
                        </td>
                      )}
                      <td className="p-2 text-xs text-muted-foreground">
                        {e.lastSyncedFromDolibarrAt
                          ? new Date(e.lastSyncedFromDolibarrAt).toLocaleDateString()
                          : 'Never'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
