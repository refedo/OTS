'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FileText, Plus, CheckCircle, Clock, Loader2, Filter } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type ManualEntry = {
  id: string;
  value: number;
  notes: string | null;
  approved: boolean;
  periodStart: string;
  periodEnd: string;
  createdAt: string;
  approvedAt: string | null;
  kpiDefinition: {
    code: string;
    name: string;
    unit: string | null;
  };
  user: {
    name: string;
    email: string;
  };
  approver: {
    name: string;
  } | null;
  createdBy: {
    name: string;
  };
};

export default function ManualEntriesPage() {
  const [entries, setEntries] = useState<ManualEntry[]>([]);
  const [kpiDefinitions, setKpiDefinitions] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    kpiId: '',
    userId: '',
    periodStart: new Date().toISOString().split('T')[0],
    periodEnd: new Date().toISOString().split('T')[0],
    value: '',
    notes: '',
  });

  useEffect(() => {
    fetchEntries();
    fetchKPIDefinitions();
    fetchUsers();
  }, [filter]);

  const fetchEntries = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter === 'pending') {
        params.append('approved', 'false');
      } else if (filter === 'approved') {
        params.append('approved', 'true');
      }

      const response = await fetch(`/api/kpi/manual-entries?${params}`);
      if (response.ok) {
        setEntries(await response.json());
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchKPIDefinitions = async () => {
    try {
      const response = await fetch('/api/kpi/definitions?calculationType=manual');
      if (response.ok) {
        setKpiDefinitions(await response.json());
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        setUsers(await response.json());
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleCreate = async () => {
    try {
      setCreating(true);
      const response = await fetch('/api/kpi/manual-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          value: parseFloat(formData.value),
        }),
      });
      
      if (response.ok) {
        setShowCreateDialog(false);
        fetchEntries();
        setFormData({
          kpiId: '',
          userId: '',
          periodStart: new Date().toISOString().split('T')[0],
          periodEnd: new Date().toISOString().split('T')[0],
          value: '',
          notes: '',
        });
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create manual entry');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to create manual entry');
    } finally {
      setCreating(false);
    }
  };

  const handleApprove = async (entryId: string) => {
    try {
      const response = await fetch(`/api/kpi/manual-entries/${entryId}/approve`, {
        method: 'PATCH',
      });
      
      if (response.ok) {
        fetchEntries();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to approve entry');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to approve entry');
    }
  };

  const stats = {
    total: entries.length,
    pending: entries.filter(e => !e.approved).length,
    approved: entries.filter(e => e.approved).length,
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileText className="h-8 w-8" />
            Manual KPI Entries
          </h1>
          <p className="text-muted-foreground mt-1">
            Create and approve manual KPI entries
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Manual Entry
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Total Entries</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-orange-600">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">Pending Approval</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
            <p className="text-xs text-muted-foreground">Approved</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Filter className="h-5 w-5 text-muted-foreground" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="h-10 px-3 rounded-md border bg-background"
            >
              <option value="all">All Entries</option>
              <option value="pending">Pending Approval</option>
              <option value="approved">Approved</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Entries List */}
      <div className="space-y-3">
        {entries.map((entry) => (
          <Card key={entry.id}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold">{entry.kpiDefinition.name}</span>
                    <span className="text-sm text-muted-foreground">
                      ({entry.kpiDefinition.code})
                    </span>
                    {entry.approved ? (
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Approved
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Pending
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Employee</p>
                      <p className="text-sm font-medium">{entry.user.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Value</p>
                      <p className="text-sm font-medium">
                        {entry.value} {entry.kpiDefinition.unit}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Period</p>
                      <p className="text-sm font-medium">
                        {new Date(entry.periodStart).toLocaleDateString()} -{' '}
                        {new Date(entry.periodEnd).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Created By</p>
                      <p className="text-sm font-medium">{entry.createdBy.name}</p>
                    </div>
                  </div>

                  {entry.notes && (
                    <p className="text-sm text-muted-foreground mb-2">
                      <strong>Notes:</strong> {entry.notes}
                    </p>
                  )}

                  <div className="text-xs text-muted-foreground">
                    Created: {new Date(entry.createdAt).toLocaleString()}
                    {entry.approved && entry.approver && (
                      <span className="ml-4">
                        Approved by {entry.approver.name} on{' '}
                        {new Date(entry.approvedAt!).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>

                {!entry.approved && (
                  <Button
                    size="sm"
                    onClick={() => handleApprove(entry.id)}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {entries.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground mb-4">
              No manual entries found
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create First Manual Entry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>New Manual KPI Entry</DialogTitle>
            <DialogDescription>
              Create a manual KPI entry for an employee
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>KPI Definition *</Label>
              <select
                value={formData.kpiId}
                onChange={(e) => setFormData({ ...formData, kpiId: e.target.value })}
                className="w-full h-10 px-3 rounded-md border"
              >
                <option value="">Select KPI</option>
                {kpiDefinitions.map((kpi) => (
                  <option key={kpi.id} value={kpi.id}>
                    {kpi.name} ({kpi.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label>Employee *</Label>
              <select
                value={formData.userId}
                onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                className="w-full h-10 px-3 rounded-md border"
              >
                <option value="">Select Employee</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Period Start *</Label>
                <Input
                  type="date"
                  value={formData.periodStart}
                  onChange={(e) => setFormData({ ...formData, periodStart: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Period End *</Label>
                <Input
                  type="date"
                  value={formData.periodEnd}
                  onChange={(e) => setFormData({ ...formData, periodEnd: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Value *</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                placeholder="Enter KPI value"
              />
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes or context..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)} disabled={creating}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Entry'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
