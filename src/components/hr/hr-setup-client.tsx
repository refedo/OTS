'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Plus, Archive, RotateCcw, Pencil, Save, X, Building2, Layers, Network, Briefcase } from 'lucide-react';

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

type Props = {
  initialDepartments: Department[];
  initialSections: HrSection[];
  initialDivisions: ManagedListItem[];
  initialOccupations: ManagedListItem[];
  canManageDepartments: boolean;
  canCreateDepartment: boolean;
  canDeleteDepartment: boolean;
  canManageSections: boolean;
};

export function HrSetupClient({
  initialDepartments,
  initialSections,
  initialDivisions,
  initialOccupations,
  canManageDepartments,
  canCreateDepartment,
  canDeleteDepartment,
  canManageSections,
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
