'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Ruler, Search, Plus, CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function DimensionalInspectionPage() {
  const [inspections, setInspections] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [productionLogs, setProductionLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [projectFilter, setProjectFilter] = useState('all');
  const [resultFilter, setResultFilter] = useState('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);

  const [formData, setFormData] = useState({
    projectId: '', buildingId: '', productionLogId: '', partDesignation: '', drawingReference: '',
    measuredLength: '', requiredLength: '', lengthTolerance: '',
    measuredWidth: '', requiredWidth: '', widthTolerance: '',
    measuredHeight: '', requiredHeight: '', heightTolerance: '',
    measuredThickness: '', requiredThickness: '', thicknessTolerance: '',
    straightness: '', flatness: '', squareness: '',
    inspectionDate: new Date().toISOString().split('T')[0],
    toleranceCheck: 'Pending', result: 'Pending', remarks: '',
  });

  useEffect(() => {
    fetchInspections();
    fetchProjects();
  }, []);

  useEffect(() => {
    if (formData.projectId) {
      fetchProductionLogs(formData.projectId);
    }
  }, [formData.projectId]);

  const fetchInspections = async () => {
    try {
      const response = await fetch('/api/qc/dimensional');
      if (response.ok) setInspections(await response.json());
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects');
      if (response.ok) setProjects(await response.json());
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const fetchProductionLogs = async (projectId: string) => {
    try {
      const response = await fetch(`/api/production/logs?projectId=${projectId}`);
      if (response.ok) {
        const data = await response.json();
        setProductionLogs(data);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleCreateInspection = async () => {
    try {
      setCreating(true);
      const response = await fetch('/api/qc/dimensional', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (response.ok) {
        setShowCreateDialog(false);
        fetchInspections();
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setCreating(false);
    }
  };

  const filteredInspections = inspections.filter((i) => {
    const matchesSearch = i.inspectionNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.partDesignation?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesProject = projectFilter === 'all' || i.projectId === projectFilter;
    const matchesResult = resultFilter === 'all' || i.result === resultFilter;
    return matchesSearch && matchesProject && matchesResult;
  });

  const stats = {
    total: inspections.length,
    accepted: inspections.filter(i => i.result === 'Accepted').length,
    rejected: inspections.filter(i => i.result === 'Rejected').length,
    pending: inspections.filter(i => i.result === 'Pending').length,
  };

  const getResultBadge = (result: string) => {
    const badges: any = {
      'Accepted': <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"><CheckCircle className="h-3 w-3" /> Accepted</span>,
      'Rejected': <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800"><XCircle className="h-3 w-3" /> Rejected</span>,
      'Pending': <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"><Clock className="h-3 w-3" /> Pending</span>,
    };
    return badges[result] || <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{result}</span>;
  };

  if (loading) return <div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><Ruler className="h-8 w-8" />Dimensional QC Inspection</h1>
          <p className="text-muted-foreground mt-1">Dimensional accuracy and tolerance verification</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}><Plus className="mr-2 h-4 w-4" />New Inspection</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold">{stats.total}</div><p className="text-xs text-muted-foreground">Total</p></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold text-green-600">{stats.accepted}</div><p className="text-xs text-muted-foreground">Accepted</p></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold text-red-600">{stats.rejected}</div><p className="text-xs text-muted-foreground">Rejected</p></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold text-blue-600">{stats.pending}</div><p className="text-xs text-muted-foreground">Pending</p></CardContent></Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search..." className="pl-10" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} className="h-10 px-3 rounded-md border bg-background">
              <option value="all">All Projects</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.projectNumber}</option>)}
            </select>
            <select value={resultFilter} onChange={(e) => setResultFilter(e.target.value)} className="h-10 px-3 rounded-md border bg-background">
              <option value="all">All Results</option>
              <option value="Pending">Pending</option>
              <option value="Accepted">Accepted</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Inspection Records ({filteredInspections.length})</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium">Inspection #</th>
                  <th className="text-left p-3 font-medium">Project</th>
                  <th className="text-left p-3 font-medium">Part</th>
                  <th className="text-left p-3 font-medium">Length</th>
                  <th className="text-left p-3 font-medium">Width</th>
                  <th className="text-left p-3 font-medium">Height</th>
                  <th className="text-left p-3 font-medium">Tolerance</th>
                  <th className="text-left p-3 font-medium">Result</th>
                </tr>
              </thead>
              <tbody>
                {filteredInspections.length === 0 ? (
                  <tr><td colSpan={8} className="text-center p-8 text-muted-foreground">No inspections found</td></tr>
                ) : (
                  filteredInspections.map((i) => (
                    <tr key={i.id} className="border-b hover:bg-muted/50">
                      <td className="p-3 font-mono text-sm">{i.inspectionNumber}</td>
                      <td className="p-3 text-sm">{i.project?.projectNumber}</td>
                      <td className="p-3 text-sm">{i.partDesignation}</td>
                      <td className="p-3 text-sm">{i.measuredLength || '-'}</td>
                      <td className="p-3 text-sm">{i.measuredWidth || '-'}</td>
                      <td className="p-3 text-sm">{i.measuredHeight || '-'}</td>
                      <td className="p-3 text-sm">{i.toleranceCheck}</td>
                      <td className="p-3">{getResultBadge(i.result)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Dimensional Inspection</DialogTitle>
            <DialogDescription>Record dimensional measurements</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Project *</Label>
              <select value={formData.projectId} onChange={(e) => setFormData({ ...formData, projectId: e.target.value, productionLogId: '', partDesignation: '' })} className="w-full h-10 px-3 rounded-md border">
                <option value="">Select Project</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.projectNumber} - {p.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Production Log *</Label>
                <select 
                  value={formData.productionLogId} 
                  onChange={(e) => {
                    const selectedLog = productionLogs.find(log => log.id === e.target.value);
                    setFormData({ 
                      ...formData, 
                      productionLogId: e.target.value,
                      partDesignation: selectedLog ? selectedLog.assemblyPart.partDesignation : ''
                    });
                  }} 
                  className="w-full h-10 px-3 rounded-md border"
                  disabled={!formData.projectId}
                >
                  <option value="">Select Production Log</option>
                  {productionLogs.map((log) => <option key={log.id} value={log.id}>{log.assemblyPart.partDesignation} - {log.assemblyPart.name} ({log.processType})</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Part Designation *</Label>
                <Input value={formData.partDesignation} readOnly className="bg-muted" placeholder="Auto-filled from production log" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Length (mm)</Label>
                <Input type="number" step="0.1" value={formData.measuredLength} onChange={(e) => setFormData({ ...formData, measuredLength: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Width (mm)</Label>
                <Input type="number" step="0.1" value={formData.measuredWidth} onChange={(e) => setFormData({ ...formData, measuredWidth: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Height (mm)</Label>
                <Input type="number" step="0.1" value={formData.measuredHeight} onChange={(e) => setFormData({ ...formData, measuredHeight: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tolerance Check</Label>
                <select 
                  value={formData.toleranceCheck} 
                  onChange={(e) => {
                    const newTolerance = e.target.value;
                    setFormData({ 
                      ...formData, 
                      toleranceCheck: newTolerance,
                      result: newTolerance === 'Out of Tolerance' ? 'Rejected' : formData.result
                    });
                  }} 
                  className="w-full h-10 px-3 rounded-md border"
                >
                  <option value="Pending">Pending</option>
                  <option value="Within">Within Tolerance</option>
                  <option value="Out of Tolerance">Out of Tolerance</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Result</Label>
                <select 
                  value={formData.result} 
                  onChange={(e) => setFormData({ ...formData, result: e.target.value })} 
                  className="w-full h-10 px-3 rounded-md border"
                  disabled={formData.toleranceCheck === 'Out of Tolerance'}
                >
                  <option value="Pending">Pending</option>
                  <option value="Accepted">Accepted</option>
                  <option value="Rejected">Rejected</option>
                </select>
                {formData.toleranceCheck === 'Out of Tolerance' && (
                  <p className="text-xs text-red-600 mt-1">Auto-set to Rejected (Out of Tolerance)</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Remarks</Label>
              <Textarea rows={3} value={formData.remarks} onChange={(e) => setFormData({ ...formData, remarks: e.target.value })} placeholder="Additional remarks..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)} disabled={creating}>Cancel</Button>
            <Button onClick={handleCreateInspection} disabled={creating}>
              {creating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</> : 'Create Inspection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
