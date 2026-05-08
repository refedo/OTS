'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Plus, Archive, RotateCcw, Pencil, Save, X, Building2, Layers, Network, Briefcase, CalendarClock, Banknote, Settings2, RefreshCw, Loader2, AlertTriangle, CheckCircle2, Bug, Link2, Hash, FileText } from 'lucide-react';
import { LetterSerialsSetupTab } from './letter-serials-setup-tab';
import { LetterTemplatesSetupTab } from './letter-templates-setup-tab';

type Department = {
  id: string;
  name: string;
  description: string | null;
  archivedAt: string | null;
  parentId: string | null;
};

type HrSection = {
  id: string;
  name: string;
  displayOrder: number;
  archivedAt: string | null;
};

type ManagedListItem = {
  id: string;
  name: string;
  displayOrder: number;
  archivedAt: string | null;
};

type LeaveTypeItem = {
  id: string;
  code: string;
  nameEn: string;
  nameAr: string | null;
  payType: 'FULLY_PAID' | 'HALF_PAID' | 'UNPAID';
  monthlyAccrualDays: number;
  annualAccrualDays: number;
  maxCarryOverDays: number;
  requiresMedicalCertificate: boolean;
  allowNegativeBalance: boolean;
  countPublicHolidays: boolean;
  displayOrder: number;
  archivedAt: string | null;
};

type AttendanceSyncLog = {
  id: string;
  startedAt: string;
  finishedAt: string | null;
  status: string;
  spreadsheetId: string;
  tabName: string;
  rowsRead: number;
  rowsCreated: number;
  rowsUpdated: number;
  rowsUnchanged: number;
  employeeOrphans: unknown;
  slotOrphans: unknown;
  hardErrors: unknown;
  softWarnings: unknown;
  durationMs: number | null;
  triggeredBy: { id: string; name: string; email: string } | null;
};

type EmployeeSyncLog = {
  id: string;
  startedAt: string;
  finishedAt: string | null;
  status: string;
  rowsRead: number;
  rowsCreated: number;
  rowsUpdated: number;
  rowsSkipped: number;
  fieldsPreserved: number;
  linksEstablished: number;
  hardErrors: unknown;
  softWarnings: unknown;
  apiResponseMs: number | null;
  triggeredBy: { id: string; name: string; email: string } | null;
};

type IdentityUser = {
  id: string;
  name: string;
  email: string;
  position: string | null;
  dolibarrUserId: number | null;
  employeeId: string | null;
  reconciledAt: string | null;
  role: { id: string; name: string } | null;
};

type Props = {
  initialDepartments: Department[];
  initialSections: HrSection[];
  initialDivisions: ManagedListItem[];
  initialOccupations: ManagedListItem[];
  initialLeaveTypes: LeaveTypeItem[];
  canManageDepartments: boolean;
  canCreateDepartment: boolean;
  canDeleteDepartment: boolean;
  canManageSections: boolean;
  canManageLeaveTypes: boolean;
  canManagePayrollSettings: boolean;
  attendanceLogs: AttendanceSyncLog[];
  canAttendanceSync: boolean;
  canAttendanceProbe: boolean;
  employeeSyncLogs: EmployeeSyncLog[];
  canEmployeeSync: boolean;
  reconciliationComplete: boolean;
  identityUsers: IdentityUser[];
  canIdentityReconcile: boolean;
};

export function HrSetupClient({
  initialDepartments,
  initialSections,
  initialDivisions,
  initialOccupations,
  initialLeaveTypes,
  canManageDepartments,
  canCreateDepartment,
  canDeleteDepartment,
  canManageSections,
  canManageLeaveTypes,
  canManagePayrollSettings,
  attendanceLogs,
  canAttendanceSync,
  canAttendanceProbe,
  employeeSyncLogs,
  canEmployeeSync,
  reconciliationComplete,
  identityUsers,
  canIdentityReconcile,
}: Props) {
  const router = useRouter();
  const [departments, setDepartments] = useState<Department[]>(initialDepartments);
  const [sections, setSections] = useState<HrSection[]>(initialSections);
  const [error, setError] = useState<string | null>(null);

  // Department state
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptDesc, setNewDeptDesc] = useState('');
  const [newDeptParentId, setNewDeptParentId] = useState('');
  const [editDeptId, setEditDeptId] = useState<string | null>(null);
  const [editDeptName, setEditDeptName] = useState('');
  const [editDeptDesc, setEditDeptDesc] = useState('');
  const [editDeptParentId, setEditDeptParentId] = useState('');
  const [creatingDept, setCreatingDept] = useState(false);

  // Section state
  const [newSectionName, setNewSectionName] = useState('');
  const [editSectionId, setEditSectionId] = useState<string | null>(null);
  const [editSectionName, setEditSectionName] = useState('');
  const [editSectionOrder, setEditSectionOrder] = useState(0);
  const [creatingSection, setCreatingSection] = useState(false);

  async function handleApi(fn: () => Promise<Response>, onOk: () => void) {
    setError(null);
    try {
      const res = await fn();
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
      onOk();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed');
    }
  }

  // -----------------------------------------------------------------------
  // Departments
  // -----------------------------------------------------------------------
  async function createDepartment() {
    if (!newDeptName.trim()) return;
    setCreatingDept(true);
    await handleApi(
      () =>
        fetch('/api/departments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: newDeptName.trim(),
            description: newDeptDesc.trim() || undefined,
            parentId: newDeptParentId || null,
          }),
        }),
      () => {
        setNewDeptName('');
        setNewDeptDesc('');
        setNewDeptParentId('');
        fetchDepartments();
      },
    );
    setCreatingDept(false);
  }

  async function saveDepartment(id: string) {
    await handleApi(
      () =>
        fetch(`/api/departments/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: editDeptName.trim(),
            description: editDeptDesc.trim() || null,
            parentId: editDeptParentId || null,
          }),
        }),
      () => {
        setEditDeptId(null);
        fetchDepartments();
      },
    );
  }

  async function toggleDepartmentArchive(id: string, archived: boolean) {
    await handleApi(
      () =>
        fetch(`/api/departments/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ archived }),
        }),
      fetchDepartments,
    );
  }

  async function fetchDepartments() {
    const res = await fetch('/api/departments?includeArchived=true');
    if (res.ok) setDepartments(await res.json());
  }

  // -----------------------------------------------------------------------
  // Sections
  // -----------------------------------------------------------------------
  async function createSection() {
    if (!newSectionName.trim()) return;
    setCreatingSection(true);
    await handleApi(
      () =>
        fetch('/api/hr/sections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newSectionName.trim() }),
        }),
      () => {
        setNewSectionName('');
        fetchSections();
      },
    );
    setCreatingSection(false);
  }

  async function saveSection(id: string) {
    await handleApi(
      () =>
        fetch(`/api/hr/sections/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: editSectionName.trim(),
            displayOrder: editSectionOrder,
          }),
        }),
      () => {
        setEditSectionId(null);
        fetchSections();
      },
    );
  }

  async function toggleSectionArchive(id: string, archived: boolean) {
    await handleApi(
      () =>
        fetch(`/api/hr/sections/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ archived }),
        }),
      fetchSections,
    );
  }

  async function fetchSections() {
    const res = await fetch('/api/hr/sections?includeArchived=true');
    if (res.ok) setSections(await res.json());
  }

  const activeDeptCount = departments.filter((d) => !d.archivedAt).length;
  const activeSectionCount = sections.filter((s) => !s.archivedAt).length;
  const activeDivisionCount = initialDivisions.filter((d) => !d.archivedAt).length;
  const activeOccupationCount = initialOccupations.filter((o) => !o.archivedAt).length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

      {/* Hero */}
      <div className="rounded-2xl border bg-gradient-to-br from-sky-600 via-sky-500 to-blue-600 p-6 md:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute -top-4 -right-4 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
        <div className="absolute -bottom-8 -left-8 w-48 h-48 bg-white/5 rounded-full blur-3xl" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <Settings2 className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold">HR Setup</h1>
          </div>
          <p className="text-sky-100 text-sm">
            Manage reference data, payroll settings, and integration syncs for the HR module.
          </p>
        </div>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border bg-gradient-to-b from-sky-50 to-white border-sky-200 p-4 shadow-sm">
          <p className="text-xs text-sky-600 font-medium uppercase tracking-wide">Departments</p>
          <p className="text-2xl font-bold text-sky-700 mt-1">{activeDeptCount}</p>
          <p className="text-xs text-sky-500 mt-0.5">active</p>
        </div>
        <div className="rounded-xl border bg-gradient-to-b from-violet-50 to-white border-violet-200 p-4 shadow-sm">
          <p className="text-xs text-violet-600 font-medium uppercase tracking-wide">Sections</p>
          <p className="text-2xl font-bold text-violet-700 mt-1">{activeSectionCount}</p>
          <p className="text-xs text-violet-500 mt-0.5">active</p>
        </div>
        <div className="rounded-xl border bg-gradient-to-b from-emerald-50 to-white border-emerald-200 p-4 shadow-sm">
          <p className="text-xs text-emerald-600 font-medium uppercase tracking-wide">Position Titles</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{activeOccupationCount}</p>
          <p className="text-xs text-emerald-500 mt-0.5">active</p>
        </div>
        <div className="rounded-xl border bg-gradient-to-b from-amber-50 to-white border-amber-200 p-4 shadow-sm">
          <p className="text-xs text-amber-600 font-medium uppercase tracking-wide">Leave Types</p>
          <p className="text-2xl font-bold text-amber-700 mt-1">{initialLeaveTypes.filter((lt) => !lt.archivedAt).length}</p>
          <p className="text-xs text-amber-500 mt-0.5">active</p>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <Tabs defaultValue="departments" className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="departments" className="gap-2">
            <Building2 className="h-4 w-4" />
            Departments
            <Badge variant="secondary" className="ml-1">{activeDeptCount}</Badge>
          </TabsTrigger>
          <TabsTrigger value="sections" className="gap-2">
            <Layers className="h-4 w-4" />
            Sections
            <Badge variant="secondary" className="ml-1">{activeSectionCount}</Badge>
          </TabsTrigger>
          <TabsTrigger value="divisions" className="gap-2">
            <Network className="h-4 w-4" />
            Divisions
            <Badge variant="secondary" className="ml-1">{activeDivisionCount}</Badge>
          </TabsTrigger>
          <TabsTrigger value="occupations" className="gap-2">
            <Briefcase className="h-4 w-4" />
            Position Titles
            <Badge variant="secondary" className="ml-1">{activeOccupationCount}</Badge>
          </TabsTrigger>
          <TabsTrigger value="leaveTypes" className="gap-2">
            <CalendarClock className="h-4 w-4" />
            Leave Types
            <Badge variant="secondary" className="ml-1">{initialLeaveTypes.filter((lt) => !lt.archivedAt).length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="payrollSettings" className="gap-2">
            <Banknote className="h-4 w-4" />
            Payroll
          </TabsTrigger>
          <TabsTrigger value="attendanceSync" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Attendance Sync
          </TabsTrigger>
          <TabsTrigger value="dolibarrSync" className="gap-2">
            <Link2 className="h-4 w-4" />
            Dolibarr Sync
          </TabsTrigger>
          <TabsTrigger value="identityReconciliation" className="gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Identity Reconciliation
          </TabsTrigger>
          <TabsTrigger value="letterSerials" className="gap-2">
            <Hash className="h-4 w-4" />
            Letter Serials
          </TabsTrigger>
          <TabsTrigger value="letterTemplates" className="gap-2">
            <FileText className="h-4 w-4" />
            Letter Templates
          </TabsTrigger>
        </TabsList>

        {/* ------------------------------------------------------------- */}
        {/* Departments                                                   */}
        {/* ------------------------------------------------------------- */}
        <TabsContent value="departments" className="space-y-4">
          {canCreateDepartment && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Add a department</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                <div>
                  <Label htmlFor="new-dept-name">Name</Label>
                  <Input
                    id="new-dept-name"
                    value={newDeptName}
                    onChange={(e) => setNewDeptName(e.target.value)}
                    placeholder="e.g. Engineering"
                  />
                </div>
                <div>
                  <Label htmlFor="new-dept-desc">Description (optional)</Label>
                  <Input
                    id="new-dept-desc"
                    value={newDeptDesc}
                    onChange={(e) => setNewDeptDesc(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="new-dept-parent">Parent department (optional)</Label>
                  <select
                    id="new-dept-parent"
                    value={newDeptParentId}
                    onChange={(e) => setNewDeptParentId(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  >
                    <option value="">— None (top-level) —</option>
                    {departments.filter((d) => !d.archivedAt).map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-3 flex justify-end">
                  <Button onClick={createDepartment} disabled={creatingDept || !newDeptName.trim()}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="p-3 font-medium">Name</th>
                    <th className="p-3 font-medium">Description</th>
                    <th className="p-3 font-medium">Parent</th>
                    <th className="p-3 font-medium w-24">Status</th>
                    <th className="p-3 font-medium w-52 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {departments.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-6 text-center text-muted-foreground">
                        No departments yet.
                      </td>
                    </tr>
                  )}
                  {departments.map((d) => {
                    const isEditing = editDeptId === d.id;
                    const isArchived = !!d.archivedAt;
                    return (
                      <tr key={d.id} className="border-b last:border-b-0">
                        <td className="p-3 font-medium">
                          {isEditing ? (
                            <Input
                              value={editDeptName}
                              onChange={(e) => setEditDeptName(e.target.value)}
                            />
                          ) : (
                            <span className={isArchived ? 'text-muted-foreground line-through' : ''}>
                              {d.name}
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {isEditing ? (
                            <Input
                              value={editDeptDesc}
                              onChange={(e) => setEditDeptDesc(e.target.value)}
                            />
                          ) : (
                            d.description || '—'
                          )}
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {isEditing ? (
                            <select
                              value={editDeptParentId}
                              onChange={(e) => setEditDeptParentId(e.target.value)}
                              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                            >
                              <option value="">— None —</option>
                              {departments
                                .filter((p) => !p.archivedAt && p.id !== d.id)
                                .map((p) => (
                                  <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                          ) : (
                            departments.find((p) => p.id === d.parentId)?.name || '—'
                          )}
                        </td>
                        <td className="p-3">
                          {isArchived ? (
                            <Badge variant="outline" className="bg-gray-100">
                              Archived
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-green-50 text-green-800 border-green-200">
                              Active
                            </Badge>
                          )}
                        </td>
                        <td className="p-3 text-right space-x-2">
                          {isEditing ? (
                            <>
                              <Button size="sm" onClick={() => saveDepartment(d.id)}>
                                <Save className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setEditDeptId(null)}>
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              {canManageDepartments && !isArchived && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setEditDeptId(d.id);
                                    setEditDeptName(d.name);
                                    setEditDeptDesc(d.description ?? '');
                                    setEditDeptParentId(d.parentId ?? '');
                                  }}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              )}
                              {canDeleteDepartment && !isArchived && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => toggleDepartmentArchive(d.id, true)}
                                >
                                  <Archive className="h-4 w-4" />
                                </Button>
                              )}
                              {canManageDepartments && isArchived && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => toggleDepartmentArchive(d.id, false)}
                                >
                                  <RotateCcw className="h-4 w-4" />
                                </Button>
                              )}
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ------------------------------------------------------------- */}
        {/* Sections                                                      */}
        {/* ------------------------------------------------------------- */}
        <TabsContent value="sections" className="space-y-4">
          {canManageSections && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Add a section</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col sm:flex-row gap-3 items-end">
                <div className="flex-1 w-full">
                  <Label htmlFor="new-section-name">Name</Label>
                  <Input
                    id="new-section-name"
                    value={newSectionName}
                    onChange={(e) => setNewSectionName(e.target.value)}
                    placeholder="e.g. Painting"
                  />
                </div>
                <Button onClick={createSection} disabled={creatingSection || !newSectionName.trim()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add
                </Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="p-3 font-medium">Name</th>
                    <th className="p-3 font-medium w-28">Order</th>
                    <th className="p-3 font-medium w-24">Status</th>
                    <th className="p-3 font-medium w-52 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sections.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-6 text-center text-muted-foreground">
                        No sections yet.
                      </td>
                    </tr>
                  )}
                  {sections.map((s) => {
                    const isEditing = editSectionId === s.id;
                    const isArchived = !!s.archivedAt;
                    return (
                      <tr key={s.id} className="border-b last:border-b-0">
                        <td className="p-3 font-medium">
                          {isEditing ? (
                            <Input
                              value={editSectionName}
                              onChange={(e) => setEditSectionName(e.target.value)}
                            />
                          ) : (
                            <span className={isArchived ? 'text-muted-foreground line-through' : ''}>
                              {s.name}
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {isEditing ? (
                            <Input
                              type="number"
                              value={editSectionOrder}
                              onChange={(e) => setEditSectionOrder(Number(e.target.value))}
                            />
                          ) : (
                            s.displayOrder
                          )}
                        </td>
                        <td className="p-3">
                          {isArchived ? (
                            <Badge variant="outline" className="bg-gray-100">
                              Archived
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-green-50 text-green-800 border-green-200">
                              Active
                            </Badge>
                          )}
                        </td>
                        <td className="p-3 text-right space-x-2">
                          {isEditing ? (
                            <>
                              <Button size="sm" onClick={() => saveSection(s.id)}>
                                <Save className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setEditSectionId(null)}>
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            canManageSections && (
                              <>
                                {!isArchived && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      setEditSectionId(s.id);
                                      setEditSectionName(s.name);
                                      setEditSectionOrder(s.displayOrder);
                                    }}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                )}
                                {!isArchived ? (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => toggleSectionArchive(s.id, true)}
                                  >
                                    <Archive className="h-4 w-4" />
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => toggleSectionArchive(s.id, false)}
                                  >
                                    <RotateCcw className="h-4 w-4" />
                                  </Button>
                                )}
                              </>
                            )
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <p className="text-xs text-muted-foreground">
            Renaming a section automatically updates every employee record that
            referenced the old name, so existing data stays consistent.
          </p>
        </TabsContent>

        {/* ------------------------------------------------------------- */}
        {/* Divisions                                                     */}
        {/* ------------------------------------------------------------- */}
        <TabsContent value="divisions" className="space-y-4">
          <ManagedListTab
            label="division"
            pluralLabel="divisions"
            placeholder="e.g. Production"
            endpoint="/api/hr/divisions"
            initialItems={initialDivisions}
            canManage={canManageSections}
            onError={setError}
          />
        </TabsContent>

        {/* ------------------------------------------------------------- */}
        {/* Position Titles (stored in the legacy `occupation` column)    */}
        {/* ------------------------------------------------------------- */}
        <TabsContent value="occupations" className="space-y-4">
          <ManagedListTab
            label="position title"
            pluralLabel="position titles"
            placeholder="e.g. Welder, Fitter, Foreman"
            endpoint="/api/hr/occupations"
            initialItems={initialOccupations}
            canManage={canManageSections}
            onError={setError}
          />
        </TabsContent>

        {/* ------------------------------------------------------------- */}
        {/* Leave Types                                                   */}
        {/* ------------------------------------------------------------- */}
        <TabsContent value="leaveTypes" className="space-y-4">
          <LeaveTypesTab
            initialItems={initialLeaveTypes}
            canManage={canManageLeaveTypes}
            onError={setError}
          />
        </TabsContent>

        {/* ------------------------------------------------------------- */}
        {/* Payroll Settings                                              */}
        {/* ------------------------------------------------------------- */}
        <TabsContent value="payrollSettings" className="space-y-4">
          <PayrollSettingsTab canManage={canManagePayrollSettings} onError={setError} />
        </TabsContent>

        {/* ------------------------------------------------------------- */}
        {/* Attendance Sync                                               */}
        {/* ------------------------------------------------------------- */}
        <TabsContent value="attendanceSync" className="space-y-4">
          <AttendanceSyncTab logs={attendanceLogs} canSync={canAttendanceSync} canProbe={canAttendanceProbe} />
        </TabsContent>

        {/* ------------------------------------------------------------- */}
        {/* Dolibarr Employee Sync                                        */}
        {/* ------------------------------------------------------------- */}
        <TabsContent value="dolibarrSync" className="space-y-4">
          <DolibarrSyncTab logs={employeeSyncLogs} canSync={canEmployeeSync} reconciliationComplete={reconciliationComplete} />
        </TabsContent>

        {/* ------------------------------------------------------------- */}
        {/* Identity Reconciliation                                       */}
        {/* ------------------------------------------------------------- */}
        <TabsContent value="identityReconciliation" className="space-y-4">
          <IdentityReconciliationTab users={identityUsers} isComplete={reconciliationComplete} canManage={canIdentityReconcile} />
        </TabsContent>

        {/* ------------------------------------------------------------- */}
        {/* Letter Serials                                                 */}
        {/* ------------------------------------------------------------- */}
        <TabsContent value="letterSerials" className="space-y-4">
          <LetterSerialsSetupTab />
        </TabsContent>

        {/* ------------------------------------------------------------- */}
        {/* Letter Templates                                               */}
        {/* ------------------------------------------------------------- */}
        <TabsContent value="letterTemplates" className="space-y-4">
          <LetterTemplatesSetupTab />
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
}

type ManagedListTabProps = {
  label: string;
  pluralLabel: string;
  placeholder: string;
  endpoint: string;
  initialItems: ManagedListItem[];
  canManage: boolean;
  onError: (msg: string | null) => void;
};

function ManagedListTab({
  label,
  pluralLabel,
  placeholder,
  endpoint,
  initialItems,
  canManage,
  onError,
}: ManagedListTabProps) {
  const router = useRouter();
  const [items, setItems] = useState<ManagedListItem[]>(initialItems);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editOrder, setEditOrder] = useState(0);

  async function handleApi(fn: () => Promise<Response>, onOk: () => void) {
    onError(null);
    try {
      const res = await fn();
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
      onOk();
      router.refresh();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Request failed');
    }
  }

  async function refetch() {
    const res = await fetch(`${endpoint}?includeArchived=true`);
    if (res.ok) setItems(await res.json());
  }

  async function createItem() {
    if (!newName.trim()) return;
    setCreating(true);
    await handleApi(
      () =>
        fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newName.trim() }),
        }),
      () => {
        setNewName('');
        refetch();
      },
    );
    setCreating(false);
  }

  async function saveItem(id: string) {
    await handleApi(
      () =>
        fetch(`${endpoint}/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: editName.trim(), displayOrder: editOrder }),
        }),
      () => {
        setEditId(null);
        refetch();
      },
    );
  }

  async function toggleArchive(id: string, archived: boolean) {
    await handleApi(
      () =>
        fetch(`${endpoint}/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ archived }),
        }),
      refetch,
    );
  }

  return (
    <>
      {canManage && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Add a {label}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1 w-full">
              <Label htmlFor={`new-${label}-name`}>Name</Label>
              <Input
                id={`new-${label}-name`}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={placeholder}
              />
            </div>
            <Button onClick={createItem} disabled={creating || !newName.trim()}>
              <Plus className="mr-2 h-4 w-4" />
              Add
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="p-3 font-medium">Name</th>
                <th className="p-3 font-medium w-28">Order</th>
                <th className="p-3 font-medium w-24">Status</th>
                <th className="p-3 font-medium w-52 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-muted-foreground">
                    No {pluralLabel} yet.
                  </td>
                </tr>
              )}
              {items.map((it) => {
                const isEditing = editId === it.id;
                const isArchived = !!it.archivedAt;
                return (
                  <tr key={it.id} className="border-b last:border-b-0">
                    <td className="p-3 font-medium">
                      {isEditing ? (
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                        />
                      ) : (
                        <span className={isArchived ? 'text-muted-foreground line-through' : ''}>
                          {it.name}
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {isEditing ? (
                        <Input
                          type="number"
                          value={editOrder}
                          onChange={(e) => setEditOrder(Number(e.target.value))}
                        />
                      ) : (
                        it.displayOrder
                      )}
                    </td>
                    <td className="p-3">
                      {isArchived ? (
                        <Badge variant="outline" className="bg-gray-100">
                          Archived
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-green-50 text-green-800 border-green-200">
                          Active
                        </Badge>
                      )}
                    </td>
                    <td className="p-3 text-right space-x-2">
                      {isEditing ? (
                        <>
                          <Button size="sm" onClick={() => saveItem(it.id)}>
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditId(null)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        canManage && (
                          <>
                            {!isArchived && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditId(it.id);
                                  setEditName(it.name);
                                  setEditOrder(it.displayOrder);
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            )}
                            {!isArchived ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => toggleArchive(it.id, true)}
                              >
                                <Archive className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => toggleArchive(it.id, false)}
                              >
                                <RotateCcw className="h-4 w-4" />
                              </Button>
                            )}
                          </>
                        )
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Renaming a {label} automatically updates every employee record that
        referenced the old name, so existing data stays consistent.
      </p>
    </>
  );
}

// ============================================================================
// Leave Types Tab
// ============================================================================

type LeaveTypesTabProps = {
  initialItems: LeaveTypeItem[];
  canManage: boolean;
  onError: (msg: string | null) => void;
};

function LeaveTypesTab({ initialItems, canManage, onError }: LeaveTypesTabProps) {
  const router = useRouter();
  const [items, setItems] = useState<LeaveTypeItem[]>(initialItems);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    code: '',
    nameEn: '',
    nameAr: '',
    payType: 'FULLY_PAID' as 'FULLY_PAID' | 'HALF_PAID' | 'UNPAID',
    monthlyAccrualDays: 1.75,
    annualAccrualDays: 21,
    maxCarryOverDays: 30,
    requiresMedicalCertificate: false,
    allowNegativeBalance: true,
    countPublicHolidays: false,
  });
  const [saving, setSaving] = useState(false);

  async function createType() {
    setSaving(true);
    onError(null);
    try {
      const res = await fetch('/api/hr/leave-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed');
      const created = (await res.json()) as LeaveTypeItem;
      setItems([...items, created]);
      setForm({
        code: '',
        nameEn: '',
        nameAr: '',
        payType: 'FULLY_PAID',
        monthlyAccrualDays: 1.75,
        annualAccrualDays: 21,
        maxCarryOverDays: 30,
        requiresMedicalCertificate: false,
        allowNegativeBalance: true,
        countPublicHolidays: false,
      });
      setShowForm(false);
      router.refresh();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Failed to create leave type');
    } finally {
      setSaving(false);
    }
  }

  async function archive(id: string, archived: boolean) {
    onError(null);
    try {
      const res = await fetch(`/api/hr/leave-types/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed');
      const updated = (await res.json()) as LeaveTypeItem;
      setItems(items.map((it) => (it.id === id ? updated : it)));
      router.refresh();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Failed to update leave type');
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Leave Types</CardTitle>
          {canManage && !showForm && (
            <Button size="sm" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add leave type
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm && (
          <div className="grid grid-cols-2 gap-3 p-4 border rounded-md bg-muted/30">
            <div>
              <Label>Code (e.g. ANNUAL)</Label>
              <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
            </div>
            <div>
              <Label>Name (English)</Label>
              <Input value={form.nameEn} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} />
            </div>
            <div>
              <Label>Name (Arabic)</Label>
              <Input dir="rtl" value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} />
            </div>
            <div>
              <Label>Pay type</Label>
              <select
                className="w-full border rounded-md h-10 px-3"
                value={form.payType}
                onChange={(e) => setForm({ ...form, payType: e.target.value as 'FULLY_PAID' | 'HALF_PAID' | 'UNPAID' })}
              >
                <option value="FULLY_PAID">Fully Paid</option>
                <option value="HALF_PAID">Half Paid</option>
                <option value="UNPAID">Unpaid</option>
              </select>
            </div>
            <div>
              <Label>Monthly accrual (days)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.monthlyAccrualDays}
                onChange={(e) => setForm({ ...form, monthlyAccrualDays: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label>Annual cap (days)</Label>
              <Input
                type="number"
                value={form.annualAccrualDays}
                onChange={(e) => setForm({ ...form, annualAccrualDays: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label>Max carry-over (days)</Label>
              <Input
                type="number"
                value={form.maxCarryOverDays}
                onChange={(e) => setForm({ ...form, maxCarryOverDays: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="col-span-2 space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.requiresMedicalCertificate}
                  onChange={(e) => setForm({ ...form, requiresMedicalCertificate: e.target.checked })}
                />
                Requires medical certificate
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.allowNegativeBalance}
                  onChange={(e) => setForm({ ...form, allowNegativeBalance: e.target.checked })}
                />
                Allow advance (negative balance) with warning
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.countPublicHolidays}
                  onChange={(e) => setForm({ ...form, countPublicHolidays: e.target.checked })}
                />
                Count public holidays as leave days
              </label>
            </div>
            <div className="col-span-2 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={createType} disabled={saving || !form.code || !form.nameEn}>
                <Save className="h-4 w-4 mr-1" />
                Save
              </Button>
            </div>
          </div>
        )}

        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground border-b">
            <tr>
              <th className="py-2">Code</th>
              <th>Name</th>
              <th>Pay</th>
              <th className="text-right">Monthly</th>
              <th className="text-right">Annual</th>
              <th className="text-right">Carry-over</th>
              <th>Status</th>
              {canManage && <th className="w-16"></th>}
            </tr>
          </thead>
          <tbody>
            {items.map((lt) => (
              <tr key={lt.id} className={lt.archivedAt ? 'opacity-50' : ''}>
                <td className="py-2 font-mono text-xs">{lt.code}</td>
                <td>
                  {lt.nameEn}
                  {lt.nameAr && <span className="text-muted-foreground ml-2">({lt.nameAr})</span>}
                </td>
                <td>
                  <Badge variant={lt.payType === 'UNPAID' ? 'destructive' : 'secondary'}>
                    {lt.payType.replace('_', ' ')}
                  </Badge>
                </td>
                <td className="text-right">{lt.monthlyAccrualDays}</td>
                <td className="text-right">{lt.annualAccrualDays}</td>
                <td className="text-right">{lt.maxCarryOverDays}</td>
                <td>{lt.archivedAt ? 'Archived' : 'Active'}</td>
                {canManage && (
                  <td>
                    {lt.archivedAt ? (
                      <Button size="sm" variant="ghost" onClick={() => archive(lt.id, false)}>
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => archive(lt.id, true)}>
                        <Archive className="h-4 w-4" />
                      </Button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Payroll Settings Tab
// ============================================================================

type PayrollSettingsState = {
  payroll: {
    dailyRateBasis: 'THIRTY' | 'WORKING_DAYS_IN_MONTH' | 'WEEKLY_AVERAGE';
    gosiEmployeeRate: number;
    gosiEmployerRate: number;
    overtimeMultiplier: number;
    absenceWithPermissionMultiplier: number;
    absenceWithoutPermissionMultiplier: number;
    wpsBankCode: string;
  };
  leaves: {
    approvalChain: 'MANAGER_HR_CEO' | 'MANAGER_HR' | 'HR_ONLY';
    autoApproveUnderDays: number;
  };
};

function PayrollSettingsTab({ canManage, onError }: { canManage: boolean; onError: (msg: string | null) => void }) {
  const [settings, setSettings] = useState<PayrollSettingsState | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/hr/settings')
      .then((r) => r.json())
      .then((d) => setSettings(d as PayrollSettingsState))
      .catch(() => onError('Failed to load settings'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!settings) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">Loading…</CardContent>
      </Card>
    );
  }

  async function save() {
    if (!settings) return;
    setSaving(true);
    onError(null);
    try {
      const res = await fetch('/api/hr/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed');
      const updated = (await res.json()) as PayrollSettingsState;
      setSettings(updated);
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payroll & Leave Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h4 className="font-semibold mb-3">Payroll calculation</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Daily rate basis</Label>
              <select
                className="w-full border rounded-md h-10 px-3"
                disabled={!canManage}
                value={settings.payroll.dailyRateBasis}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    payroll: { ...settings.payroll, dailyRateBasis: e.target.value as PayrollSettingsState['payroll']['dailyRateBasis'] },
                  })
                }
              >
                <option value="THIRTY">Fixed 30 days (monthly ÷ 30)</option>
                <option value="WORKING_DAYS_IN_MONTH">Working days in month</option>
                <option value="WEEKLY_AVERAGE">Weekly average (÷ 26)</option>
              </select>
            </div>
            <div>
              <Label>GOSI employee rate (0.10 = 10%)</Label>
              <Input
                type="number"
                step="0.001"
                disabled={!canManage}
                value={settings.payroll.gosiEmployeeRate}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    payroll: { ...settings.payroll, gosiEmployeeRate: parseFloat(e.target.value) || 0 },
                  })
                }
              />
            </div>
            <div>
              <Label>GOSI employer rate (0.12 = 12%)</Label>
              <Input
                type="number"
                step="0.001"
                disabled={!canManage}
                value={settings.payroll.gosiEmployerRate}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    payroll: { ...settings.payroll, gosiEmployerRate: parseFloat(e.target.value) || 0 },
                  })
                }
              />
            </div>
            <div>
              <Label>Overtime multiplier</Label>
              <Input
                type="number"
                step="0.1"
                disabled={!canManage}
                value={settings.payroll.overtimeMultiplier}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    payroll: { ...settings.payroll, overtimeMultiplier: parseFloat(e.target.value) || 0 },
                  })
                }
              />
            </div>
            <div>
              <Label>WPS bank code</Label>
              <Input
                disabled={!canManage}
                value={settings.payroll.wpsBankCode}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    payroll: { ...settings.payroll, wpsBankCode: e.target.value },
                  })
                }
              />
            </div>
          </div>
        </div>

        <div className="border-t pt-4">
          <h4 className="font-semibold mb-3">Absence deduction rates</h4>
          <p className="text-xs text-muted-foreground mb-3">
            Number of daily-rate days deducted per absent day. e.g. 1.0 = 1 day deducted; 2.0 = 2 days deducted.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Absence with permission multiplier</Label>
              <Input
                type="number"
                step="0.5"
                min="0"
                max="5"
                disabled={!canManage}
                value={settings.payroll.absenceWithPermissionMultiplier ?? 1}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    payroll: { ...settings.payroll, absenceWithPermissionMultiplier: parseFloat(e.target.value) || 0 },
                  })
                }
              />
            </div>
            <div>
              <Label>Absence without permission multiplier</Label>
              <Input
                type="number"
                step="0.5"
                min="0"
                max="5"
                disabled={!canManage}
                value={settings.payroll.absenceWithoutPermissionMultiplier ?? 2}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    payroll: { ...settings.payroll, absenceWithoutPermissionMultiplier: parseFloat(e.target.value) || 0 },
                  })
                }
              />
            </div>
          </div>
        </div>

        <div className="border-t pt-4">
          <h4 className="font-semibold mb-3">Leave approvals</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Approval chain</Label>
              <select
                className="w-full border rounded-md h-10 px-3"
                disabled={!canManage}
                value={settings.leaves.approvalChain}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    leaves: { ...settings.leaves, approvalChain: e.target.value as PayrollSettingsState['leaves']['approvalChain'] },
                  })
                }
              >
                <option value="MANAGER_HR_CEO">Line Manager → HR → CEO</option>
                <option value="MANAGER_HR">Line Manager → HR</option>
                <option value="HR_ONLY">HR Only</option>
              </select>
            </div>
            <div>
              <Label>Auto-approve under (days)</Label>
              <Input
                type="number"
                disabled={!canManage}
                value={settings.leaves.autoApproveUnderDays}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    leaves: { ...settings.leaves, autoApproveUnderDays: parseFloat(e.target.value) || 0 },
                  })
                }
              />
            </div>
          </div>
        </div>

        {canManage && (
          <div className="flex justify-end">
            <Button onClick={save} disabled={saving}>
              <Save className="h-4 w-4 mr-1" />
              Save settings
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Attendance Sync Tab
// ============================================================================

const SYNC_STATUS_COLOURS: Record<string, string> = {
  SUCCESS: 'bg-green-100 text-green-800',
  PARTIAL: 'bg-yellow-100 text-yellow-800',
  FAILED: 'bg-red-100 text-red-800',
  RUNNING: 'bg-blue-100 text-blue-800',
};

function asOrphanList(value: unknown): { identifier: string; displayName: string; headerColumnIndex: number }[] {
  if (!Array.isArray(value)) return [];
  return value as { identifier: string; displayName: string; headerColumnIndex: number }[];
}

function AttendanceSyncTab({ logs, canSync, canProbe }: { logs: AttendanceSyncLog[]; canSync: boolean; canProbe: boolean }) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [probing, setProbing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [probeOutput, setProbeOutput] = useState<string | null>(null);

  const onSync = async () => {
    setSyncing(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/hr/attendance/sync', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sync failed');
      setResult(`${data.status}: ${data.rowsRead} read, ${data.rowsCreated} created, ${data.rowsUpdated} updated, ${data.rowsUnchanged} unchanged`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const onProbe = async () => {
    setProbing(true);
    setError(null);
    setProbeOutput(null);
    try {
      const res = await fetch('/api/hr/attendance/sync/probe');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Probe failed');
      setProbeOutput(JSON.stringify(data, null, 2));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Probe failed');
    } finally {
      setProbing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-muted-foreground">
          One-way mirror from the Hexa Google Sheet (Overtime tab) into OTS. The sheet stays the source of truth — edits made there land here on the next sync.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6 flex flex-wrap items-center gap-3">
          {canSync && (
            <Button onClick={onSync} disabled={syncing}>
              {syncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              {syncing ? 'Syncing…' : 'Sync now'}
            </Button>
          )}
          {canProbe && (
            <Button variant="outline" onClick={onProbe} disabled={probing}>
              {probing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bug className="mr-2 h-4 w-4" />}
              {probing ? 'Probing…' : 'Probe sheet layout'}
            </Button>
          )}
          {result && <span className="text-sm text-green-700">{result}</span>}
          {error && (
            <span className="text-sm text-red-700 flex items-center gap-1">
              <AlertTriangle className="h-4 w-4" /> {error}
            </span>
          )}
        </CardContent>
      </Card>

      {probeOutput && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Probe output</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-muted rounded p-3 overflow-auto max-h-[500px] whitespace-pre-wrap">{probeOutput}</pre>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent syncs</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sync runs yet.</p>
          ) : (
            <div className="space-y-3">
              {logs.map((l) => {
                const empOrphans = asOrphanList(l.employeeOrphans);
                const slotOrphans = asOrphanList(l.slotOrphans);
                return (
                  <div key={l.id} className="border rounded p-3 text-sm">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${SYNC_STATUS_COLOURS[l.status] ?? ''}`}>{l.status}</span>
                        <span className="text-muted-foreground">{new Date(l.startedAt).toLocaleString()}</span>
                        {l.triggeredBy && <span className="text-muted-foreground">· by {l.triggeredBy.name}</span>}
                      </div>
                      <span className="text-muted-foreground">{l.durationMs != null ? `${(l.durationMs / 1000).toFixed(1)}s` : '—'}</span>
                    </div>
                    <div className="mt-2 grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                      <div>Read: <strong>{l.rowsRead}</strong></div>
                      <div>Created: <strong className="text-green-700">{l.rowsCreated}</strong></div>
                      <div>Updated: <strong className="text-blue-700">{l.rowsUpdated}</strong></div>
                      <div>Unchanged: <strong>{l.rowsUnchanged}</strong></div>
                      <div>Orphans: <strong className="text-orange-700">{empOrphans.length + slotOrphans.length}</strong></div>
                    </div>
                    {(empOrphans.length > 0 || slotOrphans.length > 0) && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs text-orange-700">Show unresolved identifiers</summary>
                        <div className="mt-2 text-xs space-y-1">
                          {empOrphans.length > 0 && <div><strong>Employees:</strong> {empOrphans.map((o) => o.displayName).join(', ')}</div>}
                          {slotOrphans.length > 0 && <div><strong>Manpower slots:</strong> {slotOrphans.map((o) => o.displayName).join(', ')}</div>}
                        </div>
                      </details>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// Dolibarr Employee Sync Tab
// ============================================================================

function DolibarrSyncTab({ logs, canSync, reconciliationComplete }: { logs: EmployeeSyncLog[]; canSync: boolean; reconciliationComplete: boolean }) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onSync = async () => {
    setSyncing(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/hr/employees/sync', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || `Sync failed (HTTP ${res.status})`);
      setResult(`Sync ${data.status}: ${data.rowsRead} read · ${data.rowsCreated} created · ${data.rowsUpdated} updated · ${data.rowsSkipped} skipped · ${data.fieldsPreserved} fields preserved · ${data.linksEstablished} user links established`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">One-way read-only mirror from Dolibarr. Manual edits are preserved.</p>
        {reconciliationComplete && canSync && (
          <Button onClick={onSync} disabled={syncing}>
            {syncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Sync from Dolibarr
          </Button>
        )}
      </div>

      {!reconciliationComplete && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="p-4 flex gap-3 items-start">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-900">Identity reconciliation required</p>
              <p className="text-sm text-amber-800 mt-1">Before the first sync can run, every OTS user must be linked to their Dolibarr counterpart. Complete the one-time reconciliation in the Identity Reconciliation tab first.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {result && <div className="rounded border border-green-300 bg-green-50 p-3 text-sm text-green-900">{result}</div>}
      {error && <div className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800">{error}</div>}

      <Card>
        <CardHeader><CardTitle className="text-base">Recent sync runs</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="p-2 font-medium">When</th>
                  <th className="p-2 font-medium">Status</th>
                  <th className="p-2 font-medium">Read</th>
                  <th className="p-2 font-medium">Created</th>
                  <th className="p-2 font-medium">Updated</th>
                  <th className="p-2 font-medium">Skipped</th>
                  <th className="p-2 font-medium">Preserved</th>
                  <th className="p-2 font-medium">Links</th>
                  <th className="p-2 font-medium">By</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 && (
                  <tr><td colSpan={9} className="p-6 text-center text-muted-foreground">No sync runs yet.</td></tr>
                )}
                {logs.map((l) => (
                  <tr key={l.id} className="border-b">
                    <td className="p-2">{new Date(l.startedAt).toLocaleString()}</td>
                    <td className="p-2">
                      <span className={`px-2 py-0.5 rounded text-xs ${SYNC_STATUS_COLOURS[l.status] ?? ''}`}>{l.status}</span>
                    </td>
                    <td className="p-2">{l.rowsRead}</td>
                    <td className="p-2">{l.rowsCreated}</td>
                    <td className="p-2">{l.rowsUpdated}</td>
                    <td className="p-2">{l.rowsSkipped}</td>
                    <td className="p-2">{l.fieldsPreserved}</td>
                    <td className="p-2">{l.linksEstablished}</td>
                    <td className="p-2 text-xs text-muted-foreground">{l.triggeredBy?.name ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// Identity Reconciliation Tab
// ============================================================================

function IdentityReconciliationTab({ users: initialUsers, isComplete, canManage }: { users: IdentityUser[]; isComplete: boolean; canManage: boolean }) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [dolibarrUsers, setDolibarrUsers] = useState<{ id: number; firstname: string | null; lastname: string | null; login: string | null; email: string | null; job: string | null; fullName: string }[] | null>(null);
  const [loadingDolibarr, setLoadingDolibarr] = useState(true);
  const [savingRow, setSavingRow] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch('/api/admin/identity-reconciliation/dolibarr-users')
      .then(async (res) => {
        if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || `HTTP ${res.status}`); }
        return res.json();
      })
      .then((data) => setDolibarrUsers(data))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to fetch Dolibarr users'))
      .finally(() => setLoadingDolibarr(false));
  }, []);

  const linked = users.filter((u) => u.dolibarrUserId != null).length;
  const remaining = users.length - linked;

  const setLink = async (userId: string, dolibarrUserId: number | null) => {
    if (isComplete || !canManage) return;
    setSavingRow(userId);
    setRowErrors((e) => ({ ...e, [userId]: '' }));
    try {
      const res = await fetch(`/api/admin/identity-reconciliation/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dolibarrUserId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, dolibarrUserId: data.dolibarrUserId, reconciledAt: data.reconciledAt } : u));
    } catch (err) {
      setRowErrors((e) => ({ ...e, [userId]: err instanceof Error ? err.message : 'Save failed' }));
    } finally {
      setSavingRow(null);
    }
  };

  const complete = async () => {
    if (!confirm('Mark identity reconciliation as complete? This unlocks the Dolibarr employee sync.')) return;
    setCompleting(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/identity-reconciliation/complete', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Completion failed');
    } finally {
      setCompleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-muted-foreground">Link each OTS user to their Dolibarr counterpart before running the first employee sync. This is a one-time setup — once completed, it becomes read-only.</p>
      </div>

      <Card>
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <div className="text-sm text-muted-foreground">Progress</div>
            <div className="text-lg font-medium">
              {linked} of {users.length} users linked
              {remaining > 0 && ` — ${remaining} remaining`}
            </div>
          </div>
          {isComplete ? (
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">Completed — read-only</span>
            </div>
          ) : (
            canManage && (
              <Button onClick={complete} disabled={remaining > 0 || completing}>
                {completing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Complete reconciliation
              </Button>
            )
          )}
        </CardContent>
      </Card>

      {error && (
        <div className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800 flex gap-2">
          <AlertTriangle className="h-4 w-4 mt-0.5" /> {error}
        </div>
      )}

      <Card>
        <CardContent className="p-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="p-2 font-medium">OTS User</th>
                  <th className="p-2 font-medium">Email</th>
                  <th className="p-2 font-medium">Role</th>
                  <th className="p-2 font-medium">Dolibarr link</th>
                  <th className="p-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b align-top">
                    <td className="p-2 font-medium">{u.name}</td>
                    <td className="p-2 text-muted-foreground">{u.email}</td>
                    <td className="p-2">{u.role?.name ?? '—'}</td>
                    <td className="p-2 min-w-[260px]">
                      <InlineDolibarrPicker
                        users={dolibarrUsers}
                        loading={loadingDolibarr}
                        selectedId={u.dolibarrUserId}
                        disabled={isComplete || savingRow === u.id || !canManage}
                        onChange={(id) => setLink(u.id, id)}
                      />
                      {rowErrors[u.id] && <div className="text-xs text-red-600 mt-1">{rowErrors[u.id]}</div>}
                    </td>
                    <td className="p-2 text-xs">
                      {savingRow === u.id && <Loader2 className="h-4 w-4 animate-spin" />}
                      {u.dolibarrUserId != null && !savingRow && <span className="text-green-600">Linked</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function InlineDolibarrPicker({
  users,
  loading,
  selectedId,
  disabled,
  onChange,
}: {
  users: { id: number; firstname: string | null; lastname: string | null; login: string | null; email: string | null; job: string | null; fullName: string }[] | null;
  loading: boolean;
  selectedId: number | null;
  disabled: boolean;
  onChange: (id: number | null) => void;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  if (loading) {
    return <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> Loading…</div>;
  }
  if (!users) {
    return <div className="text-xs text-red-600">Could not load Dolibarr users</div>;
  }

  const selected = users.find((u) => u.id === selectedId);
  const filtered = users.filter((u) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return u.fullName.toLowerCase().includes(q) || (u.login ?? '').toLowerCase().includes(q) || (u.email ?? '').toLowerCase().includes(q) || String(u.id).includes(q);
  });

  return (
    <div className="relative">
      <Input
        value={open ? query : selected ? `${selected.fullName} (#${selected.id})` : query}
        placeholder="Search Dolibarr user…"
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        disabled={disabled}
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-10 mt-1 w-full max-h-64 overflow-auto rounded border bg-background shadow">
          {selected && (
            <button type="button" className="w-full px-3 py-1.5 text-left text-xs text-red-600 hover:bg-muted"
              onMouseDown={() => { onChange(null); setQuery(''); setOpen(false); }}>
              Clear link
            </button>
          )}
          {filtered.slice(0, 30).map((u) => (
            <button key={u.id} type="button" className="w-full px-3 py-1.5 text-left text-sm hover:bg-muted"
              onMouseDown={() => { onChange(u.id); setQuery(''); setOpen(false); }}>
              <div className="font-medium">{u.fullName} <span className="text-xs text-muted-foreground">#{u.id}</span></div>
              <div className="text-xs text-muted-foreground">{u.login ?? '—'} · {u.email ?? '—'}{u.job ? ` · ${u.job}` : ''}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
