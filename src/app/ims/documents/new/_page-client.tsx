'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, FileText, Save, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type Category = { id: string; code: string; name: string; level: number };
type Department = { id: string; name: string };
type User = { id: string; name: string };

const CONFIDENTIALITY_OPTIONS = [
  { value: 'PUBLIC', label: 'Public' },
  { value: 'INTERNAL', label: 'Internal' },
  { value: 'CONFIDENTIAL', label: 'Confidential' },
  { value: 'RESTRICTED', label: 'Restricted' },
];

const STANDARD_OPTIONS = [
  { value: 'ISO_9001', label: 'ISO 9001:2015' },
  { value: 'ISO_14001', label: 'ISO 14001:2015' },
  { value: 'ISO_45001', label: 'ISO 45001:2018' },
];

const SITE_OPTIONS = [
  { value: 'HEAD_OFFICE', label: 'Head Office' },
  { value: 'FACTORY', label: 'Factory' },
  { value: 'SITE', label: 'Site' },
  { value: 'ALL', label: 'All Sites' },
];

export function NewDocumentClient() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const [form, setForm] = useState({
    title: '',
    titleAr: '',
    categoryId: '',
    departmentId: '',
    ownerId: '',
    reviewerId: '',
    applicableStandards: [] as string[],
    scope: '',
    purpose: '',
    site: '',
    confidentiality: 'INTERNAL',
    reviewFrequencyDays: '365',
    fileUrl: '',
  });

  useEffect(() => {
    Promise.all([
      fetch('/api/ims/categories').then(r => r.ok ? r.json() : []),
      fetch('/api/departments').then(r => r.ok ? r.json() : []),
      fetch('/api/users').then(r => r.ok ? r.json() : []),
    ]).then(([cats, depts, usrs]) => {
      setCategories(cats);
      setDepartments(depts);
      setUsers(usrs);
    });
  }, []);

  const toggleStandard = (s: string) => {
    setForm(f => ({
      ...f,
      applicableStandards: f.applicableStandards.includes(s)
        ? f.applicableStandards.filter(x => x !== s)
        : [...f.applicableStandards, s],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.categoryId) {
      setError('Title and Category are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/ims/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          titleAr: form.titleAr || null,
          categoryId: form.categoryId,
          departmentId: form.departmentId || null,
          ownerId: form.ownerId || null,
          reviewerId: form.reviewerId || null,
          applicableStandards: form.applicableStandards.length ? form.applicableStandards : null,
          scope: form.scope || null,
          purpose: form.purpose || null,
          site: form.site || null,
          confidentiality: form.confidentiality,
          reviewFrequencyDays: parseInt(form.reviewFrequencyDays),
          fileUrl: form.fileUrl || null,
        }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? 'Failed to create document');
      }
      const doc = await res.json();
      router.push(`/ims/documents/${doc.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create document');
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/ims/documents">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="size-4 mr-1" />
            Back to Registry
          </Button>
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-950">
          <FileText className="size-6 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">New Document</h1>
          <p className="text-sm text-muted-foreground">Document number will be auto-generated from category and year.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm dark:bg-red-950 dark:border-red-800 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Basic Info */}
        <Card>
          <CardHeader><CardTitle className="text-base">Basic Information</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="title">Title (English) *</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Quality Management Manual"
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="titleAr">Title (Arabic)</Label>
                <Input
                  id="titleAr"
                  dir="rtl"
                  value={form.titleAr}
                  onChange={e => setForm(f => ({ ...f, titleAr: e.target.value }))}
                  placeholder="العنوان بالعربية"
                />
              </div>
              <div>
                <Label htmlFor="categoryId">Category *</Label>
                <Select value={form.categoryId} onValueChange={v => setForm(f => ({ ...f, categoryId: v }))}>
                  <SelectTrigger id="categoryId">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        <span className="font-mono text-xs text-muted-foreground mr-2">{c.code}</span>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="confidentiality">Confidentiality</Label>
                <Select value={form.confidentiality} onValueChange={v => setForm(f => ({ ...f, confidentiality: v }))}>
                  <SelectTrigger id="confidentiality"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CONFIDENTIALITY_OPTIONS.map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ownership */}
        <Card>
          <CardHeader><CardTitle className="text-base">Ownership & Department</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <Label htmlFor="departmentId">Department</Label>
                <Select value={form.departmentId} onValueChange={v => setForm(f => ({ ...f, departmentId: v }))}>
                  <SelectTrigger id="departmentId"><SelectValue placeholder="Select department" /></SelectTrigger>
                  <SelectContent>
                    {departments.map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="ownerId">Owner</Label>
                <Select value={form.ownerId} onValueChange={v => setForm(f => ({ ...f, ownerId: v }))}>
                  <SelectTrigger id="ownerId"><SelectValue placeholder="Select owner" /></SelectTrigger>
                  <SelectContent>
                    {users.map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="reviewerId">Reviewer</Label>
                <Select value={form.reviewerId} onValueChange={v => setForm(f => ({ ...f, reviewerId: v }))}>
                  <SelectTrigger id="reviewerId"><SelectValue placeholder="Select reviewer" /></SelectTrigger>
                  <SelectContent>
                    {users.map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="site">Site</Label>
              <Select value={form.site} onValueChange={v => setForm(f => ({ ...f, site: v }))}>
                <SelectTrigger id="site"><SelectValue placeholder="Select site" /></SelectTrigger>
                <SelectContent>
                  {SITE_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Content */}
        <Card>
          <CardHeader><CardTitle className="text-base">Scope & Purpose</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="scope">Scope</Label>
              <Textarea
                id="scope"
                rows={2}
                value={form.scope}
                onChange={e => setForm(f => ({ ...f, scope: e.target.value }))}
                placeholder="What this document applies to…"
              />
            </div>
            <div>
              <Label htmlFor="purpose">Purpose</Label>
              <Textarea
                id="purpose"
                rows={2}
                value={form.purpose}
                onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))}
                placeholder="Why this document exists…"
              />
            </div>
          </CardContent>
        </Card>

        {/* Standards & Review */}
        <Card>
          <CardHeader><CardTitle className="text-base">Standards & Review Cycle</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Applicable ISO Standards</Label>
              <div className="flex gap-4 mt-2">
                {STANDARD_OPTIONS.map(s => (
                  <label key={s.value} className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.applicableStandards.includes(s.value)}
                      onChange={() => toggleStandard(s.value)}
                      className="rounded"
                    />
                    {s.label}
                  </label>
                ))}
              </div>
            </div>
            <div className="w-48">
              <Label htmlFor="reviewFrequencyDays">Review Frequency (days)</Label>
              <Input
                id="reviewFrequencyDays"
                type="number"
                min="30"
                max="1825"
                value={form.reviewFrequencyDays}
                onChange={e => setForm(f => ({ ...f, reviewFrequencyDays: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground mt-1">Typical: 365 days (annual)</p>
            </div>
            <div>
              <Label htmlFor="fileUrl">Document File URL</Label>
              <Input
                id="fileUrl"
                value={form.fileUrl}
                onChange={e => setForm(f => ({ ...f, fileUrl: e.target.value }))}
                placeholder="https://… or leave blank"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Link href="/ims/documents">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" disabled={saving || !form.title || !form.categoryId}>
            {saving ? (
              <><Loader2 className="size-4 mr-2 animate-spin" />Creating…</>
            ) : (
              <><Save className="size-4 mr-2" />Create Document</>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
