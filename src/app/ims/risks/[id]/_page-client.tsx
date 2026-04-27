'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Plus, AlertTriangle, CheckCircle, TrendingDown, TrendingUp, Minus, ShieldAlert } from 'lucide-react';

type Assessment = { id: string; likelihood: number; severity: number; riskLevel: number; riskRating: string; assessmentType: string; existingControls: string | null; recommendations: string | null; assessedBy: { name: string } | null; createdAt: string; };
type Treatment = { id: string; treatmentType: string; description: string | null; status: string; effectiveness: string | null; targetDate: string | null; completedDate: string | null; responsible: { id: string; name: string } | null; notes: string | null; };
type Hazard = { id: string; hazardType: string; hazardDescription: string | null; location: string | null; affectedPersonnel: string | null; controlHierarchy: string; controlMeasures: string | null; };
type Risk = {
  id: string; riskNumber: string; title: string; titleAr: string | null; type: string; category: string; status: string;
  description: string | null; source: string | null; applicableStandards: string[] | null;
  currentLikelihood: number; currentSeverity: number; currentRiskLevel: number; currentRiskRating: string;
  reviewFrequencyDays: number; nextReviewDate: string | null; lastReviewDate: string | null;
  owner: { id: string; name: string } | null; department: { id: string; name: string } | null;
  assessments: Assessment[]; treatments: Treatment[]; hazards: Hazard[];
};

function ratingBadge(r: string, large = false) {
  const map: Record<string, string> = { LOW: 'bg-green-100 text-green-700 border-green-300', MEDIUM: 'bg-yellow-100 text-yellow-700 border-yellow-300', HIGH: 'bg-orange-100 text-orange-700 border-orange-300', CRITICAL: 'bg-red-100 text-red-700 border-red-300' };
  return <span className={`inline-flex items-center border font-bold rounded-full ${large ? 'px-4 py-1 text-sm' : 'px-2.5 py-0.5 text-xs'} ${map[r] ?? 'bg-gray-100 text-gray-700 border-gray-200'}`}>{r}</span>;
}

function statusBadge(s: string) {
  const map: Record<string, string> = { PLANNED: 'bg-gray-100 text-gray-600', IN_PROGRESS: 'bg-blue-100 text-blue-700', COMPLETED: 'bg-green-100 text-green-700', OVERDUE: 'bg-red-100 text-red-700', CANCELLED: 'bg-slate-100 text-slate-500' };
  return <span className={`text-xs px-2 py-0.5 rounded font-medium ${map[s] ?? 'bg-gray-100 text-gray-600'}`}>{s.replace('_',' ')}</span>;
}

function controlBadge(c: string) {
  const map: Record<string, string> = { ELIMINATION: 'bg-green-100 text-green-700', SUBSTITUTION: 'bg-teal-100 text-teal-700', ENGINEERING: 'bg-blue-100 text-blue-700', ADMINISTRATIVE: 'bg-orange-100 text-orange-700', PPE: 'bg-red-100 text-red-700' };
  return <span className={`text-xs px-2 py-0.5 rounded font-medium ${map[c] ?? 'bg-gray-100 text-gray-600'}`}>{c}</span>;
}

const TREATMENT_TYPES_RISK = ['AVOID','MITIGATE','TRANSFER','ACCEPT'];
const TREATMENT_TYPES_OPP = ['EXPLOIT','SHARE','ENHANCE','ACCEPT'];
const HAZARD_TYPES = ['PHYSICAL','CHEMICAL','BIOLOGICAL','ERGONOMIC','PSYCHOSOCIAL','MECHANICAL','ELECTRICAL','ENVIRONMENTAL'];
const CONTROL_HIERARCHIES = ['ELIMINATION','SUBSTITUTION','ENGINEERING','ADMINISTRATIVE','PPE'];

export default function ImsRiskDetailClient({ riskId }: { riskId: string }) {
  const router = useRouter();
  const [risk, setRisk] = useState<Risk | null>(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);

  const [assDialog, setAssDialog] = useState(false);
  const [assForm, setAssForm] = useState({ likelihood: '1', severity: '1', assessmentType: 'PERIODIC', existingControls: '', recommendations: '' });
  const [assSaving, setAssSaving] = useState(false);

  const [treatDialog, setTreatDialog] = useState(false);
  const [treatForm, setTreatForm] = useState({ treatmentType: '', description: '', responsibleId: '', targetDate: '', status: 'PLANNED' });
  const [treatSaving, setTreatSaving] = useState(false);

  const [hazardDialog, setHazardDialog] = useState(false);
  const [hazardForm, setHazardForm] = useState({ hazardType: 'PHYSICAL', hazardDescription: '', location: '', affectedPersonnel: '', controlHierarchy: 'ENGINEERING', controlMeasures: '' });
  const [hazardSaving, setHazardSaving] = useState(false);

  const fetchRisk = useCallback(async () => {
    const res = await fetch(`/api/ims/risks/${riskId}`);
    if (res.ok) setRisk(await res.json());
    setLoading(false);
  }, [riskId]);

  useEffect(() => { fetchRisk(); }, [fetchRisk]);

  const openTreatDialog = async () => {
    const res = await fetch('/api/users'); if (res.ok) setUsers(await res.json());
    setTreatDialog(true);
  };

  const saveAssessment = async () => {
    setAssSaving(true);
    await fetch(`/api/ims/risks/${riskId}/assessments`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ likelihood: parseInt(assForm.likelihood), severity: parseInt(assForm.severity), assessmentType: assForm.assessmentType, existingControls: assForm.existingControls || null, recommendations: assForm.recommendations || null }),
    });
    setAssDialog(false); fetchRisk(); setAssSaving(false);
  };

  const saveTreatment = async () => {
    setTreatSaving(true);
    await fetch(`/api/ims/risks/${riskId}/treatments`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...treatForm, responsibleId: treatForm.responsibleId || null, targetDate: treatForm.targetDate || null }),
    });
    setTreatDialog(false); fetchRisk(); setTreatSaving(false);
  };

  const saveHazard = async () => {
    setHazardSaving(true);
    await fetch(`/api/ims/risks/${riskId}/hazards`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...hazardForm }),
    });
    setHazardDialog(false); fetchRisk(); setHazardSaving(false);
  };

  const previewRating = (l: number, s: number) => { const lv = l*s; if (lv<=4) return 'LOW'; if (lv<=9) return 'MEDIUM'; if (lv<=15) return 'HIGH'; return 'CRITICAL'; };

  if (loading) return <div className="p-6 space-y-4">{[...Array(3)].map((_,i)=><div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />)}</div>;
  if (!risk) return <div className="p-6 text-center text-muted-foreground"><AlertTriangle className="mx-auto size-10 mb-2 opacity-40" /><p>Risk not found.</p></div>;

  const sorted = [...risk.assessments].sort((a,b)=>new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime());
  const has45001 = risk.applicableStandards?.includes('ISO_45001');
  const treatTypes = risk.type === 'OPPORTUNITY' ? TREATMENT_TYPES_OPP : TREATMENT_TYPES_RISK;
  const ratingBarWidth = Math.round((risk.currentRiskLevel / 25) * 100);
  const ratingColor = { LOW: 'bg-green-500', MEDIUM: 'bg-yellow-500', HIGH: 'bg-orange-500', CRITICAL: 'bg-red-500' }[risk.currentRiskRating] ?? 'bg-gray-400';

  return (
    <div className="p-6 space-y-6">
      <Button variant="ghost" size="sm" onClick={()=>router.push('/ims/risks')}><ArrowLeft className="size-4 mr-1" />Risk Register</Button>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="font-mono text-sm font-bold text-muted-foreground">{risk.riskNumber}</span>
            <span className={`text-xs border rounded-full px-2.5 py-0.5 font-medium ${risk.type==='RISK'?'border-red-400 text-red-600':'border-green-400 text-green-600'}`}>{risk.type}</span>
            {ratingBadge(risk.currentRiskRating, true)}
          </div>
          <h1 className="text-2xl font-bold">{risk.title}</h1>
          {risk.titleAr && <p className="text-sm text-muted-foreground mt-0.5" dir="rtl">{risk.titleAr}</p>}
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="assessments">Assessments ({risk.assessments.length})</TabsTrigger>
          <TabsTrigger value="treatments">Treatments ({risk.treatments.length})</TabsTrigger>
          {has45001 && <TabsTrigger value="hazards">Hazards ({risk.hazards.length})</TabsTrigger>}
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Metadata</CardTitle></CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                  {[['Category', risk.category.replace('_',' ')],['Status', risk.status.replace('_',' ')],['Owner', risk.owner?.name??'—'],['Department', risk.department?.name??'—'],['Source', risk.source??'—'],['Review Every', `${risk.reviewFrequencyDays} days`],['Last Review', risk.lastReviewDate?new Date(risk.lastReviewDate).toLocaleDateString():'—'],['Next Review', risk.nextReviewDate?new Date(risk.nextReviewDate).toLocaleDateString():'—']].map(([k,v])=>(
                    <><dt className="text-muted-foreground font-medium">{k}</dt><dd>{v}</dd></>
                  ))}
                </dl>
                {risk.applicableStandards && (
                  <div className="mt-4 pt-4 border-t flex gap-2 flex-wrap">
                    {risk.applicableStandards.map(s=>(
                      <span key={s} className={`text-xs font-bold px-2 py-0.5 rounded-full ${s==='ISO_9001'?'bg-green-100 text-green-700':s==='ISO_14001'?'bg-blue-100 text-blue-700':'bg-purple-100 text-purple-700'}`}>ISO {s.replace('ISO_','')}</span>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            <div className="space-y-4">
              <Card>
                <CardHeader><CardTitle className="text-base">Current Risk Score</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-center mb-4">
                    <p className="text-4xl font-black text-foreground">{risk.currentRiskLevel}<span className="text-lg font-normal text-muted-foreground">/25</span></p>
                    <p className="text-sm text-muted-foreground mt-1">{risk.currentLikelihood} likelihood × {risk.currentSeverity} severity</p>
                    <div className="mt-3">{ratingBadge(risk.currentRiskRating, true)}</div>
                  </div>
                  <div className="w-full bg-muted rounded-full h-3">
                    <div className={`h-3 rounded-full transition-all ${ratingColor}`} style={{ width: `${ratingBarWidth}%` }} />
                  </div>
                  <p className="text-xs text-muted-foreground text-center mt-1">{ratingBarWidth}% of maximum risk level</p>
                </CardContent>
              </Card>
              {risk.description && (
                <Card><CardHeader><CardTitle className="text-base">Description</CardTitle></CardHeader>
                  <CardContent><p className="text-sm text-muted-foreground whitespace-pre-wrap">{risk.description}</p></CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Assessments */}
        <TabsContent value="assessments" className="mt-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">Assessment History</h3>
            <Button size="sm" onClick={()=>setAssDialog(true)}><Plus className="size-4 mr-1" />Add Assessment</Button>
          </div>
          {sorted.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground"><ShieldAlert className="mx-auto size-10 mb-2 opacity-40" /><p>No assessments yet.</p></div>
          ) : (
            <div className="space-y-3">
              {sorted.map((a, idx) => {
                const prev = sorted[idx+1];
                const trend = prev ? (a.riskLevel > prev.riskLevel ? 'up' : a.riskLevel < prev.riskLevel ? 'down' : 'same') : null;
                const typeColor: Record<string,string> = { INITIAL:'bg-purple-100 text-purple-700', PERIODIC:'bg-blue-100 text-blue-700', TRIGGERED:'bg-orange-100 text-orange-700', POST_TREATMENT:'bg-green-100 text-green-700' };
                return (
                  <Card key={a.id}>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded font-medium ${typeColor[a.assessmentType]??'bg-gray-100 text-gray-600'}`}>{a.assessmentType.replace('_',' ')}</span>
                          {ratingBadge(a.riskRating)}
                          {trend === 'up' && <span className="flex items-center gap-0.5 text-xs text-red-600 font-medium"><TrendingUp className="size-3" />Increased</span>}
                          {trend === 'down' && <span className="flex items-center gap-0.5 text-xs text-green-600 font-medium"><TrendingDown className="size-3" />Decreased</span>}
                          {trend === 'same' && <span className="flex items-center gap-0.5 text-xs text-muted-foreground"><Minus className="size-3" />Unchanged</span>}
                        </div>
                        <span className="text-xs text-muted-foreground">{a.assessedBy?.name} · {new Date(a.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-sm font-mono text-muted-foreground mt-1">{a.likelihood} × {a.severity} = {a.riskLevel}</p>
                      {a.existingControls && <p className="text-sm mt-2"><span className="font-medium">Controls:</span> {a.existingControls}</p>}
                      {a.recommendations && <p className="text-sm mt-1"><span className="font-medium">Recommendations:</span> {a.recommendations}</p>}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Treatments */}
        <TabsContent value="treatments" className="mt-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">Treatment Actions</h3>
            <Button size="sm" onClick={openTreatDialog}><Plus className="size-4 mr-1" />Add Treatment</Button>
          </div>
          {risk.treatments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground"><CheckCircle className="mx-auto size-10 mb-2 opacity-40" /><p>No treatments yet.</p></div>
          ) : (
            <div className="space-y-3">
              {risk.treatments.map(t => {
                const overdueT = t.targetDate && new Date(t.targetDate) < new Date() && !['COMPLETED','CANCELLED'].includes(t.status);
                return (
                  <Card key={t.id}>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded">{t.treatmentType}</span>
                            {statusBadge(t.status)}
                            {t.effectiveness && <span className={`text-xs px-2 py-0.5 rounded font-medium ${t.effectiveness==='EFFECTIVE'?'bg-green-100 text-green-700':t.effectiveness==='PARTIALLY_EFFECTIVE'?'bg-yellow-100 text-yellow-700':'bg-red-100 text-red-700'}`}>{t.effectiveness.replace('_',' ')}</span>}
                          </div>
                          {t.description && <p className="text-sm mt-2 text-muted-foreground">{t.description}</p>}
                          <div className="flex gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                            {t.responsible && <span>Responsible: {t.responsible.name}</span>}
                            {t.targetDate && <span className={overdueT ? 'text-red-600 font-semibold' : ''}>Target: {new Date(t.targetDate).toLocaleDateString()}{overdueT && ' (OVERDUE)'}</span>}
                            {t.completedDate && <span>Completed: {new Date(t.completedDate).toLocaleDateString()}</span>}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Hazards */}
        {has45001 && (
          <TabsContent value="hazards" className="mt-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">Hazard Identification (ISO 45001)</h3>
              <Button size="sm" onClick={()=>setHazardDialog(true)}><Plus className="size-4 mr-1" />Add Hazard</Button>
            </div>
            {risk.hazards.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground"><AlertTriangle className="mx-auto size-10 mb-2 opacity-40" /><p>No hazards identified.</p></div>
            ) : (
              <div className="space-y-3">
                {risk.hazards.map(h => (
                  <Card key={h.id}>
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-3 flex-wrap">
                        <span className="text-xs font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded">{h.hazardType}</span>
                        {controlBadge(h.controlHierarchy)}
                      </div>
                      {h.hazardDescription && <p className="text-sm mt-2">{h.hazardDescription}</p>}
                      <div className="flex gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                        {h.location && <span>Location: {h.location}</span>}
                        {h.affectedPersonnel && <span>Affected: {h.affectedPersonnel}</span>}
                      </div>
                      {h.controlMeasures && <p className="text-sm mt-2 text-muted-foreground"><span className="font-medium">Controls:</span> {h.controlMeasures}</p>}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>

      {/* Assessment Dialog */}
      <Dialog open={assDialog} onOpenChange={setAssDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Assessment</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Likelihood (1-5)</Label>
                <Select value={assForm.likelihood} onValueChange={v=>setAssForm(f=>({...f,likelihood:v}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{[1,2,3,4,5].map(n=><SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Severity (1-5)</Label>
                <Select value={assForm.severity} onValueChange={v=>setAssForm(f=>({...f,severity:v}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{[1,2,3,4,5].map(n=><SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
              <span className="text-sm text-muted-foreground">Rating:</span>
              {ratingBadge(previewRating(parseInt(assForm.likelihood),parseInt(assForm.severity)))}
              <span className="text-sm font-mono text-muted-foreground">{parseInt(assForm.likelihood)*parseInt(assForm.severity)}/25</span>
            </div>
            <div><Label>Assessment Type</Label>
              <Select value={assForm.assessmentType} onValueChange={v=>setAssForm(f=>({...f,assessmentType:v}))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{['INITIAL','PERIODIC','TRIGGERED','POST_TREATMENT'].map(t=><SelectItem key={t} value={t}>{t.replace('_',' ')}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Existing Controls</Label><Textarea rows={2} value={assForm.existingControls} onChange={e=>setAssForm(f=>({...f,existingControls:e.target.value}))} /></div>
            <div><Label>Recommendations</Label><Textarea rows={2} value={assForm.recommendations} onChange={e=>setAssForm(f=>({...f,recommendations:e.target.value}))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setAssDialog(false)}>Cancel</Button>
            <Button onClick={saveAssessment} disabled={assSaving}>{assSaving?'Saving…':'Add Assessment'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Treatment Dialog */}
      <Dialog open={treatDialog} onOpenChange={setTreatDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Treatment</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Treatment Type</Label>
              <Select value={treatForm.treatmentType} onValueChange={v=>setTreatForm(f=>({...f,treatmentType:v}))}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>{treatTypes.map(t=><SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Description</Label><Textarea rows={2} value={treatForm.description} onChange={e=>setTreatForm(f=>({...f,description:e.target.value}))} /></div>
            <div><Label>Responsible</Label>
              <Select value={treatForm.responsibleId} onValueChange={v=>setTreatForm(f=>({...f,responsibleId:v}))}>
                <SelectTrigger><SelectValue placeholder="Select person" /></SelectTrigger>
                <SelectContent>{users.map(u=><SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Target Date</Label><Input type="date" value={treatForm.targetDate} onChange={e=>setTreatForm(f=>({...f,targetDate:e.target.value}))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setTreatDialog(false)}>Cancel</Button>
            <Button onClick={saveTreatment} disabled={treatSaving||!treatForm.treatmentType}>{treatSaving?'Saving…':'Add Treatment'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hazard Dialog */}
      <Dialog open={hazardDialog} onOpenChange={setHazardDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Hazard (ISO 45001)</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Hazard Type</Label>
                <Select value={hazardForm.hazardType} onValueChange={v=>setHazardForm(f=>({...f,hazardType:v}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{HAZARD_TYPES.map(t=><SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Control Hierarchy</Label>
                <Select value={hazardForm.controlHierarchy} onValueChange={v=>setHazardForm(f=>({...f,controlHierarchy:v}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CONTROL_HIERARCHIES.map(c=><SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Description</Label><Textarea rows={2} value={hazardForm.hazardDescription} onChange={e=>setHazardForm(f=>({...f,hazardDescription:e.target.value}))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Location</Label><Input value={hazardForm.location} onChange={e=>setHazardForm(f=>({...f,location:e.target.value}))} /></div>
              <div><Label>Affected Personnel</Label><Input value={hazardForm.affectedPersonnel} onChange={e=>setHazardForm(f=>({...f,affectedPersonnel:e.target.value}))} /></div>
            </div>
            <div><Label>Control Measures</Label><Textarea rows={2} value={hazardForm.controlMeasures} onChange={e=>setHazardForm(f=>({...f,controlMeasures:e.target.value}))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setHazardDialog(false)}>Cancel</Button>
            <Button onClick={saveHazard} disabled={hazardSaving}>{hazardSaving?'Saving…':'Add Hazard'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
