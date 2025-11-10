'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Radio, Search, Plus, CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function NDTInspectionPage() {
  const [inspections, setInspections] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [buildings, setBuildings] = useState<any[]>([]);
  const [productionLogs, setProductionLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [projectFilter, setProjectFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [resultFilter, setResultFilter] = useState('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);

  const [formData, setFormData] = useState({
    projectId: '', buildingId: '', productionLogId: '', ndtMethod: 'UT',
    testProcedure: '', acceptanceCriteria: '', equipmentId: '', equipmentCalibration: '',
    operatorName: '', operatorCertification: '',
    inspectionDate: new Date().toISOString().split('T')[0],
    testResult: 'Pending', defectType: '', defectLocation: '', defectSize: '',
    defectDescription: '', result: 'Pending', remarks: '',
  });

  useEffect(() => {
    fetchInspections();
    fetchProjects();
  }, []);

  useEffect(() => {
    if (formData.projectId) {
      fetchBuildings(formData.projectId);
      fetchProductionLogs(formData.projectId);
    }
  }, [formData.projectId]);

  const fetchInspections = async () => {
    try {
      const response = await fetch('/api/qc/ndt');
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

  const fetchBuildings = async (projectId: string) => {
    try {
      const response = await fetch(`/api/buildings?projectId=${projectId}`);
      if (response.ok) setBuildings(await response.json());
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const fetchProductionLogs = async (projectId: string) => {
    try {
      const response = await fetch(`/api/production/logs?projectId=${projectId}`);
      if (response.ok) {
        const data = await response.json();
        const weldingLogs = data.filter((log: any) => 
          log.processType.toLowerCase().includes('weld') || 
          log.processType.toLowerCase().includes('fit')
        );
        setProductionLogs(weldingLogs);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleCreateInspection = async () => {
    try {
      setCreating(true);
      const response = await fetch('/api/qc/ndt', {
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
      i.ndtMethod?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesProject = projectFilter === 'all' || i.projectId === projectFilter;
    const matchesMethod = methodFilter === 'all' || i.ndtMethod === methodFilter;
    const matchesResult = resultFilter === 'all' || i.result === resultFilter;
    return matchesSearch && matchesProject && matchesMethod && matchesResult;
  });

  const stats = {
    total: inspections.length,
    accepted: inspections.filter(i => i.result === 'Accepted').length,
    rejected: inspections.filter(i => i.result === 'Rejected').length,
    pending: inspections.filter(i => i.result === 'Pending').length,
    pass: inspections.filter(i => i.testResult === 'Pass').length,
    fail: inspections.filter(i => i.testResult === 'Fail').length,
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
          <h1 className="text-3xl font-bold flex items-center gap-2"><Radio className="h-8 w-8" />NDT Inspection</h1>
          <p className="text-muted-foreground mt-1">Non-Destructive Testing quality control records</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}><Plus className="mr-2 h-4 w-4" />New Inspection</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold">{stats.total}</div><p className="text-xs text-muted-foreground">Total</p></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold text-green-600">{stats.accepted}</div><p className="text-xs text-muted-foreground">Accepted</p></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold text-red-600">{stats.rejected}</div><p className="text-xs text-muted-foreground">Rejected</p></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold text-blue-600">{stats.pending}</div><p className="text-xs text-muted-foreground">Pending</p></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold text-green-600">{stats.pass}</div><p className="text-xs text-muted-foreground">Test Pass</p></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold text-red-600">{stats.fail}</div><p className="text-xs text-muted-foreground">Test Fail</p></CardContent></Card>
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
            <select value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)} className="h-10 px-3 rounded-md border bg-background">
              <option value="all">All Methods</option>
              <option value="UT">UT</option>
              <option value="MT">MT</option>
              <option value="PT">PT</option>
              <option value="RT">RT</option>
              <option value="VT">VT</option>
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
                  <th className="text-left p-3 font-medium">NDT Method</th>
                  <th className="text-left p-3 font-medium">Operator</th>
                  <th className="text-left p-3 font-medium">Test Result</th>
                  <th className="text-left p-3 font-medium">Defect</th>
                  <th className="text-left p-3 font-medium">Date</th>
                  <th className="text-left p-3 font-medium">Result</th>
                </tr>
              </thead>
              <tbody>
                {filteredInspections.length === 0 ? (
                  <tr><td colSpan={9} className="text-center p-8 text-muted-foreground">No NDT inspections found</td></tr>
                ) : (
                  filteredInspections.map((i) => (
                    <tr key={i.id} className="border-b hover:bg-muted/50">
                      <td className="p-3 font-mono text-sm">{i.inspectionNumber}</td>
                      <td className="p-3 text-sm">{i.project?.projectNumber}</td>
                      <td className="p-3 text-sm">{i.productionLog?.assemblyPart?.partDesignation}</td>
                      <td className="p-3 text-sm font-semibold">{i.ndtMethod}</td>
                      <td className="p-3 text-sm">{i.operatorName || '-'}</td>
                      <td className="p-3 text-sm">
                        {i.testResult === 'Pass' ? <span className="text-green-600">✓ Pass</span> : 
                         i.testResult === 'Fail' ? <span className="text-red-600">✗ Fail</span> : 
                         <span className="text-blue-600">Pending</span>}
                      </td>
                      <td className="p-3 text-sm">{i.defectType || '-'}</td>
                      <td className="p-3 text-sm">{new Date(i.inspectionDate).toLocaleDateString()}</td>
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
            <DialogTitle>New NDT Inspection</DialogTitle>
            <DialogDescription>Record non-destructive testing inspection</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Project *</Label>
                <select value={formData.projectId} onChange={(e) => setFormData({ ...formData, projectId: e.target.value, buildingId: '', productionLogId: '' })} className="w-full h-10 px-3 rounded-md border">
                  <option value="">Select Project</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.projectNumber} - {p.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Building</Label>
                <select value={formData.buildingId} onChange={(e) => setFormData({ ...formData, buildingId: e.target.value })} className="w-full h-10 px-3 rounded-md border" disabled={!formData.projectId}>
                  <option value="">Select Building</option>
                  {buildings.map((b) => <option key={b.id} value={b.id}>{b.designation} - {b.name}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Production Log *</Label>
              <select value={formData.productionLogId} onChange={(e) => setFormData({ ...formData, productionLogId: e.target.value })} className="w-full h-10 px-3 rounded-md border" disabled={!formData.projectId}>
                <option value="">Select Production Log</option>
                {productionLogs.map((log) => <option key={log.id} value={log.id}>{log.assemblyPart.partDesignation} - {log.assemblyPart.name} ({log.processType})</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>NDT Method *</Label>
                <select value={formData.ndtMethod} onChange={(e) => setFormData({ ...formData, ndtMethod: e.target.value })} className="w-full h-10 px-3 rounded-md border">
                  <option value="UT">UT - Ultrasonic Testing</option>
                  <option value="MT">MT - Magnetic Particle</option>
                  <option value="PT">PT - Dye Penetrant</option>
                  <option value="RT">RT - Radiographic</option>
                  <option value="VT">VT - Visual Testing</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Test Procedure</Label>
                <Input value={formData.testProcedure} onChange={(e) => setFormData({ ...formData, testProcedure: e.target.value })} placeholder="e.g., ASME Sec V" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Equipment ID</Label>
                <Input value={formData.equipmentId} onChange={(e) => setFormData({ ...formData, equipmentId: e.target.value })} placeholder="Equipment ID" />
              </div>
              <div className="space-y-2">
                <Label>Equipment Calibration</Label>
                <Input value={formData.equipmentCalibration} onChange={(e) => setFormData({ ...formData, equipmentCalibration: e.target.value })} placeholder="Calibration cert #" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Operator Name</Label>
                <Input value={formData.operatorName} onChange={(e) => setFormData({ ...formData, operatorName: e.target.value })} placeholder="Operator name" />
              </div>
              <div className="space-y-2">
                <Label>Operator Certification</Label>
                <Input value={formData.operatorCertification} onChange={(e) => setFormData({ ...formData, operatorCertification: e.target.value })} placeholder="Cert #" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Test Result</Label>
                <select value={formData.testResult} onChange={(e) => setFormData({ ...formData, testResult: e.target.value })} className="w-full h-10 px-3 rounded-md border">
                  <option value="Pending">Pending</option>
                  <option value="Pass">Pass</option>
                  <option value="Fail">Fail</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Defect Type</Label>
                <Input value={formData.defectType} onChange={(e) => setFormData({ ...formData, defectType: e.target.value })} placeholder="e.g., Crack, Porosity" />
              </div>
              <div className="space-y-2">
                <Label>Defect Size</Label>
                <Input value={formData.defectSize} onChange={(e) => setFormData({ ...formData, defectSize: e.target.value })} placeholder="e.g., 2mm" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Defect Description</Label>
              <Textarea rows={3} value={formData.defectDescription} onChange={(e) => setFormData({ ...formData, defectDescription: e.target.value })} placeholder="Describe defects found..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Inspection Date</Label>
                <Input type="date" value={formData.inspectionDate} onChange={(e) => setFormData({ ...formData, inspectionDate: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Final Result</Label>
                <select value={formData.result} onChange={(e) => setFormData({ ...formData, result: e.target.value })} className="w-full h-10 px-3 rounded-md border">
                  <option value="Pending">Pending</option>
                  <option value="Accepted">Accepted</option>
                  <option value="Rejected">Rejected</option>
                </select>
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
