'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Plus, Archive, RotateCcw, Pencil, Save, X, Building2, Layers, Network, Briefcase, CalendarClock, Banknote } from 'lucide-react';

type Department = {
  id: string;
  name: string;
  description: string | null;
  archivedAt: string | null;
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
}: Props) {
  const router = useRouter();
  const [departments, setDepartments] = useState<Department[]>(initialDepartments);
  const [sections, setSections] = useState<HrSection[]>(initialSections);
  const [error, setError] = useState<string | null>(null);

  // Department state
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptDesc, setNewDeptDesc] = useState('');
  const [editDeptId, setEditDeptId] = useState<string | null>(null);
  const [editDeptName, setEditDeptName] = useState('');
  const [editDeptDesc, setEditDeptDesc] = useState('');
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
          }),
        }),
      () => {
        setNewDeptName('');
        setNewDeptDesc('');
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
    <div className="p-6 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">HR Setup</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage the dropdown lists used across HR — departments, sections,
          divisions, and occupations. Archived entries stay in the database so
          historical employee records stay intact, but they no longer appear in
          pickers.
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <Tabs defaultValue="departments" className="w-full">
        <TabsList>
          <TabsTrigger value="departments" className="gap-2">
            <Building2 className="h-4 w-4" />
            Departments
            <Badge variant="secondary" className="ml-1">
              {activeDeptCount}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="sections" className="gap-2">
            <Layers className="h-4 w-4" />
            Sections
            <Badge variant="secondary" className="ml-1">
              {activeSectionCount}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="divisions" className="gap-2">
            <Network className="h-4 w-4" />
            Divisions
            <Badge variant="secondary" className="ml-1">
              {activeDivisionCount}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="occupations" className="gap-2">
            <Briefcase className="h-4 w-4" />
            Occupations
            <Badge variant="secondary" className="ml-1">
              {activeOccupationCount}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="leaveTypes" className="gap-2">
            <CalendarClock className="h-4 w-4" />
            Leave Types
            <Badge variant="secondary" className="ml-1">
              {initialLeaveTypes.filter((lt) => !lt.archivedAt).length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="payrollSettings" className="gap-2">
            <Banknote className="h-4 w-4" />
            Payroll
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
              <CardContent className="flex flex-col sm:flex-row gap-3 items-end">
                <div className="flex-1 w-full">
                  <Label htmlFor="new-dept-name">Name</Label>
                  <Input
                    id="new-dept-name"
                    value={newDeptName}
                    onChange={(e) => setNewDeptName(e.target.value)}
                    placeholder="e.g. Engineering"
                  />
                </div>
                <div className="flex-1 w-full">
                  <Label htmlFor="new-dept-desc">Description (optional)</Label>
                  <Input
                    id="new-dept-desc"
                    value={newDeptDesc}
                    onChange={(e) => setNewDeptDesc(e.target.value)}
                  />
                </div>
                <Button onClick={createDepartment} disabled={creatingDept || !newDeptName.trim()}>
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
                    <th className="p-3 font-medium">Description</th>
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
        {/* Occupations                                                   */}
        {/* ------------------------------------------------------------- */}
        <TabsContent value="occupations" className="space-y-4">
          <ManagedListTab
            label="occupation"
            pluralLabel="occupations"
            placeholder="e.g. Welder, Fitter"
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
      </Tabs>
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
