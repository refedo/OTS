'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SuccessDialog } from '@/components/ui/success-dialog';
import { ArrowLeft, ArrowRight, Check, Wand2, Plus, Trash2, Upload, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

type Building = {
  id: string;
  name: string;
  designation: string;
  weight?: number;
  location?: string;
};

type MetalWorkItem = {
  id: string;
  name: string;
  unit: string;
  quantity: number;
};

type ScopeDefinition = {
  buildingId: string;
  scopeType: 'steel' | 'roof_sheeting' | 'wall_sheeting' | 'deck_panel' | 'metal_work' | 'other';
  customLabel?: string;
  quantity?: number;
  unit?: 'ton' | 'm2' | 'Lm' | 'LS';
  // Sandwich panel
  ralColor?: string;
  panelThickness?: number;
  ribHeight?: number;
  upperSheetThick?: number;
  lowerSheetThick?: number;
  panelProfile?: 'flat' | 'ribbed';
  // Deck panel
  deckProfile?: string;
  hasShearStuds?: boolean;
  shearStudQty?: number;
  shearStudSpecs?: string;
  // Metal works
  metalWorkItems?: MetalWorkItem[];
  // Activities (set in step 4)
  activities?: { activityType: string; activityLabel: string; isApplicable: boolean; sortOrder: number }[];
};

type ScopeItem = {
  id: string;
  label: string;
  checked: boolean;
};

type ScopeSchedule = {
  scopeId: string;
  scopeLabel: string;
  buildingId: string;
  startDate: string;
  endDate: string;
};

type StageDuration = {
  stage: 'engineering' | 'operations' | 'site';
  label: string;
  durationWeeksMin: number;
  durationWeeksMax: number;
};

type CoatingCoat = {
  id: string;
  coatName: string;
  microns: string;
  ralNumber: string;
};

type PaymentTerm = {
  id: string;
  percentage: string;
  description: string;
};

// Default activities per scope type
const SCOPE_ACTIVITY_DEFAULTS: Record<string, { activityType: string; activityLabel: string; isApplicable: boolean; sortOrder: number }[]> = {
  steel: [
    { activityType: 'design', activityLabel: 'Design', isApplicable: true, sortOrder: 1 },
    { activityType: 'detailing', activityLabel: 'Detailing', isApplicable: true, sortOrder: 2 },
    { activityType: 'procurement', activityLabel: 'Procurement', isApplicable: true, sortOrder: 3 },
    { activityType: 'production', activityLabel: 'Production', isApplicable: true, sortOrder: 4 },
    { activityType: 'coating', activityLabel: 'Coating', isApplicable: true, sortOrder: 5 },
    { activityType: 'delivery', activityLabel: 'Delivery', isApplicable: true, sortOrder: 6 },
    { activityType: 'erection', activityLabel: 'Erection', isApplicable: true, sortOrder: 7 },
  ],
  roof_sheeting: [
    { activityType: 'design', activityLabel: 'Design', isApplicable: false, sortOrder: 1 },
    { activityType: 'detailing', activityLabel: 'Detailing', isApplicable: true, sortOrder: 2 },
    { activityType: 'procurement', activityLabel: 'Procurement', isApplicable: true, sortOrder: 3 },
    { activityType: 'production', activityLabel: 'Production', isApplicable: false, sortOrder: 4 },
    { activityType: 'coating', activityLabel: 'Coating', isApplicable: false, sortOrder: 5 },
    { activityType: 'delivery', activityLabel: 'Delivery', isApplicable: true, sortOrder: 6 },
    { activityType: 'erection', activityLabel: 'Erection', isApplicable: true, sortOrder: 7 },
  ],
  wall_sheeting: [
    { activityType: 'design', activityLabel: 'Design', isApplicable: false, sortOrder: 1 },
    { activityType: 'detailing', activityLabel: 'Detailing', isApplicable: true, sortOrder: 2 },
    { activityType: 'procurement', activityLabel: 'Procurement', isApplicable: true, sortOrder: 3 },
    { activityType: 'production', activityLabel: 'Production', isApplicable: false, sortOrder: 4 },
    { activityType: 'coating', activityLabel: 'Coating', isApplicable: false, sortOrder: 5 },
    { activityType: 'delivery', activityLabel: 'Delivery', isApplicable: true, sortOrder: 6 },
    { activityType: 'erection', activityLabel: 'Erection', isApplicable: true, sortOrder: 7 },
  ],
  deck_panel: [
    { activityType: 'design', activityLabel: 'Design', isApplicable: false, sortOrder: 1 },
    { activityType: 'detailing', activityLabel: 'Detailing', isApplicable: true, sortOrder: 2 },
    { activityType: 'procurement', activityLabel: 'Procurement', isApplicable: true, sortOrder: 3 },
    { activityType: 'production', activityLabel: 'Production', isApplicable: false, sortOrder: 4 },
    { activityType: 'coating', activityLabel: 'Coating', isApplicable: false, sortOrder: 5 },
    { activityType: 'delivery', activityLabel: 'Delivery', isApplicable: true, sortOrder: 6 },
    { activityType: 'erection', activityLabel: 'Erection', isApplicable: true, sortOrder: 7 },
  ],
  metal_work: [
    { activityType: 'design', activityLabel: 'Design', isApplicable: false, sortOrder: 1 },
    { activityType: 'detailing', activityLabel: 'Detailing', isApplicable: true, sortOrder: 2 },
    { activityType: 'procurement', activityLabel: 'Procurement', isApplicable: true, sortOrder: 3 },
    { activityType: 'production', activityLabel: 'Production', isApplicable: true, sortOrder: 4 },
    { activityType: 'coating', activityLabel: 'Coating', isApplicable: true, sortOrder: 5 },
    { activityType: 'delivery', activityLabel: 'Delivery', isApplicable: true, sortOrder: 6 },
    { activityType: 'erection', activityLabel: 'Erection', isApplicable: true, sortOrder: 7 },
  ],
  other: [
    { activityType: 'design', activityLabel: 'Design', isApplicable: false, sortOrder: 1 },
    { activityType: 'detailing', activityLabel: 'Detailing', isApplicable: false, sortOrder: 2 },
    { activityType: 'procurement', activityLabel: 'Procurement', isApplicable: true, sortOrder: 3 },
    { activityType: 'production', activityLabel: 'Production', isApplicable: false, sortOrder: 4 },
    { activityType: 'coating', activityLabel: 'Coating', isApplicable: false, sortOrder: 5 },
    { activityType: 'delivery', activityLabel: 'Delivery', isApplicable: true, sortOrder: 6 },
    { activityType: 'erection', activityLabel: 'Erection', isApplicable: false, sortOrder: 7 },
  ],
};

const SCOPE_TYPE_OPTIONS: { type: ScopeDefinition['scopeType']; label: string; color: string }[] = [
  { type: 'steel', label: 'Steel', color: 'bg-blue-100 border-blue-300 text-blue-800' },
  { type: 'roof_sheeting', label: 'Roof Sheeting', color: 'bg-orange-100 border-orange-300 text-orange-800' },
  { type: 'wall_sheeting', label: 'Wall Sheeting', color: 'bg-amber-100 border-amber-300 text-amber-800' },
  { type: 'deck_panel', label: 'Deck Panel', color: 'bg-purple-100 border-purple-300 text-purple-800' },
  { type: 'metal_work', label: 'Metal Works', color: 'bg-gray-100 border-gray-300 text-gray-800' },
  { type: 'other', label: 'Other', color: 'bg-green-100 border-green-300 text-green-800' },
];

const SCOPE_OPTIONS = [
  { id: 'design', label: 'Design', stage: 'engineering' },
  { id: 'shopDrawing', label: 'Detailing', stage: 'engineering' },
  { id: 'procurement', label: 'Procurement/Supply', stage: 'operations' },
  { id: 'fabrication', label: 'Fabrication', stage: 'operations' },
  { id: 'galvanization', label: 'Galvanization', stage: 'operations' },
  { id: 'painting', label: 'Painting', stage: 'operations' },
  { id: 'roofSheeting', label: 'Roof Sheeting', stage: 'operations' },
  { id: 'wallSheeting', label: 'Wall Sheeting', stage: 'operations' },
  { id: 'delivery', label: 'Delivery & Logistics', stage: 'site' },
  { id: 'erection', label: 'Erection', stage: 'site' },
];

// Map scopes to stages for visibility
const STAGE_SCOPES: Record<string, string[]> = {
  engineering: ['design', 'shopDrawing'],
  operations: ['procurement', 'fabrication', 'galvanization', 'painting', 'roofSheeting', 'wallSheeting'],
  site: ['delivery', 'erection'],
};


export default function ProjectSetupWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resumeProjectId = searchParams.get('resume');
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [resumingDraft, setResumingDraft] = useState(false);
  const [draftProjectId, setDraftProjectId] = useState<string | null>(null);

  // Step 1: Project Details
  const [projectNumber, setProjectNumber] = useState('');
  const [projectName, setProjectName] = useState('');
  const [clientName, setClientName] = useState('');
  const [projectManagerId, setProjectManagerId] = useState('');
  const [status, setStatus] = useState('Draft');
  const [contractualTonnage, setContractualTonnage] = useState('');
  const [contractDate, setContractDate] = useState('');
  const [downPaymentDate, setDownPaymentDate] = useState('');
  const [contractValue, setContractValue] = useState('');
  const [scopeOfWork, setScopeOfWork] = useState<ScopeItem[]>(
    SCOPE_OPTIONS.map(opt => ({ ...opt, checked: false }))
  );
  const [managers, setManagers] = useState<Array<{ id: string; name: string }>>([]);

  // Step 2: Buildings
  const [buildings, setBuildings] = useState<Building[]>([]);

  // Step 3: Scope Definitions per building
  const [scopeDefinitions, setScopeDefinitions] = useState<ScopeDefinition[]>([]);

  // Step 3: Scope Schedules (legacy - kept for compatibility)
  const [scopeSchedules, setScopeSchedules] = useState<ScopeSchedule[]>([]);
  
  // Step 3: Stage Durations (new)
  const [stageDurations, setStageDurations] = useState<StageDuration[]>([
    { stage: 'engineering', label: 'Engineering', durationWeeksMin: 0, durationWeeksMax: 0 },
    { stage: 'operations', label: 'Operations', durationWeeksMin: 0, durationWeeksMax: 0 },
    { stage: 'site', label: 'Site', durationWeeksMin: 0, durationWeeksMax: 0 },
  ]);
  
  // Step 4: Coating System
  const [coatingCoats, setCoatingCoats] = useState<CoatingCoat[]>([]);
  const [isGalvanized, setIsGalvanized] = useState(false);

  // Step 5: Payment Terms
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerm[]>([]);

  // Step 6: Technical Specs
  const [cranesIncluded, setCranesIncluded] = useState(false);
  const [surveyorIncluded, setSurveyorIncluded] = useState(false);
  const [thirdPartyRequired, setThirdPartyRequired] = useState(false);
  const [thirdPartyResponsibility, setThirdPartyResponsibility] = useState<'our' | 'customer'>('our');

  // Step 7: Upload Parts (handled separately)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  // Success dialog state
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Fetch managers on mount
  useEffect(() => {
    fetchManagers();
  }, []);

  // Resume draft project if ?resume=projectId is in the URL
  useEffect(() => {
    if (!resumeProjectId) return;
    const loadDraft = async () => {
      setResumingDraft(true);
      try {
        const res = await fetch(`/api/projects/${resumeProjectId}`);
        if (!res.ok) return;
        const project = await res.json();
        
        // Restore basic fields
        setDraftProjectId(project.id);
        if (project.projectNumber && !project.projectNumber.startsWith('DRAFT-')) {
          setProjectNumber(project.projectNumber);
        }
        if (project.name && project.name !== 'Untitled Draft') setProjectName(project.name);
        if (project.client?.name && project.client.name !== 'TBD') setClientName(project.client.name);
        if (project.projectManagerId) setProjectManagerId(project.projectManagerId);
        if (project.contractualTonnage) setContractualTonnage(String(project.contractualTonnage));
        if (project.contractDate) setContractDate(project.contractDate.split('T')[0]);
        if (project.downPaymentDate) setDownPaymentDate(project.downPaymentDate.split('T')[0]);
        if (project.contractValue) setContractValue(String(project.contractValue));

        // Restore wizard state from remarks
        if (project.remarks) {
          try {
            const parsed = JSON.parse(project.remarks);
            if (parsed?.__wizardDraft && parsed.data) {
              const d = parsed.data;
              if (d.scopeOfWork) setScopeOfWork(d.scopeOfWork);
              if (d.stageDurations) setStageDurations(d.stageDurations);
              if (d.paymentTerms) setPaymentTerms(d.paymentTerms);
              if (d.coatingCoats) setCoatingCoats(d.coatingCoats);
              if (d.isGalvanized !== undefined) setIsGalvanized(d.isGalvanized);
              if (d.cranesIncluded !== undefined) setCranesIncluded(d.cranesIncluded);
              if (d.surveyorIncluded !== undefined) setSurveyorIncluded(d.surveyorIncluded);
              if (d.thirdPartyRequired !== undefined) setThirdPartyRequired(d.thirdPartyRequired);
              if (d.thirdPartyResponsibility) setThirdPartyResponsibility(d.thirdPartyResponsibility);
              if (d.buildings?.length > 0) setBuildings(d.buildings);
              // Go to the step where user left off
              if (parsed.step) setCurrentStep(parsed.step);
            }
          } catch {}
        }

        // Also load buildings from API if wizard data didn't have them
        const buildingsRes = await fetch(`/api/projects/${resumeProjectId}/buildings`);
        if (buildingsRes.ok) {
          const buildingsData = await buildingsRes.json();
          if (buildingsData.length > 0 && buildings.length === 0) {
            setBuildings(buildingsData.map((b: any) => ({
              id: b.id,
              name: b.name,
              designation: b.designation,
              weight: b.weight || undefined,
            })));
          }
        }
      } catch (error) {
        console.error('Error loading draft:', error);
      } finally {
        setResumingDraft(false);
      }
    };
    loadDraft();
  }, [resumeProjectId]);

  const fetchManagers = async () => {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        const projectManagers = data.filter((user: any) => 
          ['CEO', 'Admin', 'Manager'].includes(user.role?.name)
        );
        setManagers(projectManagers);
      }
    } catch (error) {
      console.error('Error fetching managers:', error);
    }
  };

  const addBuilding = () => {
    const newBuilding: Building = {
      id: `temp-${Date.now()}`,
      name: '',
      designation: '',
    };
    setBuildings([...buildings, newBuilding]);
    
    // Add scope schedules for this building
    const selectedScopes = scopeOfWork.filter(s => s.checked);
    const newSchedules = selectedScopes.map(scope => ({
      scopeId: scope.id,
      scopeLabel: scope.label,
      buildingId: newBuilding.id,
      startDate: '',
      endDate: '',
    }));
    setScopeSchedules([...scopeSchedules, ...newSchedules]);
  };

  const removeBuilding = (id: string) => {
    setBuildings(buildings.filter(b => b.id !== id));
    // Remove all scope schedules for this building
    setScopeSchedules(scopeSchedules.filter(s => s.buildingId !== id));
  };

  const updateBuilding = (id: string, field: keyof Building, value: string | number) => {
    setBuildings(buildings.map(b => 
      b.id === id ? { ...b, [field]: value } : b
    ));
  };

  // ── Scope Definition helpers (Step 3) ──────────────────────────
  const getScopesForBuilding = (buildingId: string) =>
    scopeDefinitions.filter((s) => s.buildingId === buildingId);

  const hasScopeType = (buildingId: string, scopeType: ScopeDefinition['scopeType']) =>
    scopeDefinitions.some((s) => s.buildingId === buildingId && s.scopeType === scopeType);

  const addScopeToBuilding = (buildingId: string, scopeType: ScopeDefinition['scopeType']) => {
    if (hasScopeType(buildingId, scopeType)) return;
    const defaults = SCOPE_ACTIVITY_DEFAULTS[scopeType] || SCOPE_ACTIVITY_DEFAULTS['other'];
    const newScope: ScopeDefinition = {
      buildingId,
      scopeType,
      unit: scopeType === 'steel' ? 'ton' : 'm2',
      activities: defaults.map((a) => ({ ...a })),
    };
    setScopeDefinitions((prev) => [...prev, newScope]);
  };

  const removeScopeFromBuilding = (buildingId: string, scopeType: ScopeDefinition['scopeType']) => {
    if (scopeType === 'steel') return; // Steel cannot be removed
    setScopeDefinitions((prev) =>
      prev.filter((s) => !(s.buildingId === buildingId && s.scopeType === scopeType))
    );
  };

  const updateScopeField = (
    buildingId: string,
    scopeType: ScopeDefinition['scopeType'],
    field: keyof ScopeDefinition,
    value: ScopeDefinition[keyof ScopeDefinition]
  ) => {
    setScopeDefinitions((prev) =>
      prev.map((s) =>
        s.buildingId === buildingId && s.scopeType === scopeType ? { ...s, [field]: value } : s
      )
    );
  };

  const toggleScopeActivity = (
    buildingId: string,
    scopeType: ScopeDefinition['scopeType'],
    activityType: string
  ) => {
    setScopeDefinitions((prev) =>
      prev.map((s) => {
        if (s.buildingId !== buildingId || s.scopeType !== scopeType) return s;
        return {
          ...s,
          activities: (s.activities || []).map((a) =>
            a.activityType === activityType ? { ...a, isApplicable: !a.isApplicable } : a
          ),
        };
      })
    );
  };

  const addMetalWorkItem = (buildingId: string) => {
    const newItem: MetalWorkItem = { id: `mwi-${Date.now()}`, name: '', unit: 'LS', quantity: 1 };
    setScopeDefinitions((prev) =>
      prev.map((s) => {
        if (s.buildingId !== buildingId || s.scopeType !== 'metal_work') return s;
        return { ...s, metalWorkItems: [...(s.metalWorkItems || []), newItem] };
      })
    );
  };

  const removeMetalWorkItem = (buildingId: string, itemId: string) => {
    setScopeDefinitions((prev) =>
      prev.map((s) => {
        if (s.buildingId !== buildingId || s.scopeType !== 'metal_work') return s;
        return { ...s, metalWorkItems: (s.metalWorkItems || []).filter((i) => i.id !== itemId) };
      })
    );
  };

  const updateMetalWorkItem = (buildingId: string, itemId: string, field: keyof MetalWorkItem, value: string | number) => {
    setScopeDefinitions((prev) =>
      prev.map((s) => {
        if (s.buildingId !== buildingId || s.scopeType !== 'metal_work') return s;
        return {
          ...s,
          metalWorkItems: (s.metalWorkItems || []).map((i) =>
            i.id === itemId ? { ...i, [field]: value } : i
          ),
        };
      })
    );
  };

  // Ensure every building has at least a Steel scope definition
  const ensureSteelScopes = () => {
    for (const building of buildings) {
      if (!hasScopeType(building.id, 'steel')) {
        addScopeToBuilding(building.id, 'steel');
      }
    }
  };

  // ── Legacy scope toggles (Step 1 scope checkboxes) ─────────
  const toggleAllScopes = (selectAll: boolean) => {
    setScopeOfWork(scopeOfWork.map(s => ({ ...s, checked: selectAll })));
    
    if (selectAll) {
      // Add schedules for all scopes for all buildings
      const newSchedules: ScopeSchedule[] = [];
      for (const building of buildings) {
        for (const scope of scopeOfWork) {
          if (!scopeSchedules.some(s => s.buildingId === building.id && s.scopeId === scope.id)) {
            newSchedules.push({
              scopeId: scope.id,
              scopeLabel: scope.label,
              buildingId: building.id,
              startDate: '',
              endDate: '',
            });
          }
        }
      }
      setScopeSchedules([...scopeSchedules, ...newSchedules]);
    } else {
      // Remove all scope schedules
      setScopeSchedules([]);
    }
  };

  const toggleScope = (id: string) => {
    const item = scopeOfWork.find(s => s.id === id);
    if (!item) return;

    setScopeOfWork(scopeOfWork.map(s =>
      s.id === id ? { ...s, checked: !s.checked } : s
    ));

    // Add or remove from scope schedules for all buildings
    if (!item.checked) {
      // Adding scope - create schedule for each building
      const newSchedules = buildings.map(building => ({
        scopeId: id,
        scopeLabel: item.label,
        buildingId: building.id,
        startDate: '',
        endDate: '',
      }));
      setScopeSchedules([...scopeSchedules, ...newSchedules]);
    } else {
      // Removing scope - remove all schedules for this scope
      setScopeSchedules(scopeSchedules.filter(s => s.scopeId !== id));
    }
  };

  const updateScopeSchedule = (buildingId: string, scopeId: string, field: 'startDate' | 'endDate', value: string) => {
    // Find the current schedule to validate dates
    const currentSchedule = scopeSchedules.find(s => s.buildingId === buildingId && s.scopeId === scopeId);
    
    if (currentSchedule) {
      const newStartDate = field === 'startDate' ? value : currentSchedule.startDate;
      const newEndDate = field === 'endDate' ? value : currentSchedule.endDate;
      
      // Validate: end date cannot be before start date
      if (newStartDate && newEndDate) {
        const start = new Date(newStartDate);
        const end = new Date(newEndDate);
        if (end < start) {
          setSuccessMessage('End date cannot be before start date');
          setShowSuccessDialog(true);
          return;
        }
      }
    }
    
    setScopeSchedules(scopeSchedules.map(s =>
      s.buildingId === buildingId && s.scopeId === scopeId ? { ...s, [field]: value } : s
    ));
  };

  const calculateDuration = (startDate: string, endDate: string): number => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) return 0; // Invalid range
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const updateStageDuration = (stage: 'engineering' | 'operations' | 'site', field: 'durationWeeksMin' | 'durationWeeksMax', value: number) => {
    setStageDurations(stageDurations.map(s => {
      if (s.stage !== stage) return s;
      return { ...s, [field]: value };
    }));
  };

  // Coating functions
  const addCoatingCoat = () => {
    const newCoat: CoatingCoat = {
      id: `coat-${Date.now()}`,
      coatName: '',
      microns: '',
      ralNumber: '',
    };
    setCoatingCoats([...coatingCoats, newCoat]);
  };

  const removeCoatingCoat = (id: string) => {
    setCoatingCoats(coatingCoats.filter(c => c.id !== id));
  };

  const updateCoatingCoat = (id: string, field: keyof CoatingCoat, value: string) => {
    setCoatingCoats(coatingCoats.map(c =>
      c.id === id ? { ...c, [field]: value } : c
    ));
    
    // Check if any coat contains galvanization
    const hasGalvanization = coatingCoats.some(c => 
      c.coatName.toLowerCase().includes('galvaniz')
    );
    setIsGalvanized(hasGalvanization);
  };

  // Payment Terms functions
  const addPaymentTerm = () => {
    const newTerm: PaymentTerm = {
      id: `term-${Date.now()}`,
      percentage: '',
      description: '',
    };
    setPaymentTerms([...paymentTerms, newTerm]);
  };

  const removePaymentTerm = (id: string) => {
    setPaymentTerms(paymentTerms.filter(t => t.id !== id));
  };

  const updatePaymentTerm = (id: string, field: keyof PaymentTerm, value: string) => {
    setPaymentTerms(paymentTerms.map(t =>
      t.id === id ? { ...t, [field]: value } : t
    ));
  };

  const getTotalPaymentPercentage = () => {
    return paymentTerms.reduce((sum, term) => sum + (parseFloat(term.percentage) || 0), 0);
  };

  const generateScopeText = () => {
    const selected = scopeOfWork.filter(item => item.checked).map(item => item.label);
    if (selected.length === 0) return '';
    return `This project includes the following scope of work:\n\n${selected.map((item, idx) => `${idx + 1}. ${item}`).join('\n')}`;
  };

  const validateStep = () => {
    switch (currentStep) {
      case 1:
        return projectNumber && projectName && clientName && projectManagerId;
      case 2:
        return buildings.length > 0 && buildings.every(b => b.name && b.designation);
      case 3:
        // Each building must have at least the steel scope
        return buildings.every(b => hasScopeType(b.id, 'steel'));
      case 4:
        return true; // Activities step — optional, defaults are pre-filled
      case 5:
        // At least one visible stage should have duration filled
        const visibleStages = stageDurations.filter(stage => {
          const stageScopes = STAGE_SCOPES[stage.stage] || [];
          return scopeOfWork.some(s => s.checked && stageScopes.includes(s.id));
        });
        return visibleStages.length === 0 || visibleStages.some(s => s.durationWeeksMin > 0 || s.durationWeeksMax > 0);
      case 6:
        return coatingCoats.length > 0 && coatingCoats.every(c => c.coatName);
      case 7:
        // Payment terms validation: total should be 100% if any terms are added
        if (paymentTerms.length === 0) return true; // Optional
        const total = getTotalPaymentPercentage();
        return paymentTerms.every(t => t.percentage && t.description) && Math.abs(total - 100) < 0.01;
      case 8:
        return true; // Technical specs - optional step
      case 9:
        return true; // Upload parts - optional step
      default:
        return false;
    }
  };

  const nextStep = () => {
    if (currentStep === 2) {
      // Ensure all buildings have a Steel scope before going to scope definition
      ensureSteelScopes();
    }
    if (validateStep()) {
      setCurrentStep(currentStep + 1);
    } else {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
    }
  };

  const prevStep = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleSaveAsDraft = async () => {
    setLoading(true);
    try {
      // Save minimal project data as draft
      const wizardState = {
        wizardStep: currentStep,
        buildings: buildings,
        scopeOfWork: scopeOfWork,
        stageDurations: stageDurations,
        paymentTerms: paymentTerms,
        coatingCoats: coatingCoats,
        isGalvanized: isGalvanized,
        cranesIncluded: cranesIncluded,
        surveyorIncluded: surveyorIncluded,
        thirdPartyRequired: thirdPartyRequired,
        thirdPartyResponsibility: thirdPartyResponsibility,
      };
      const projectData = {
        projectNumber: projectNumber || `DRAFT-${Date.now()}`,
        name: projectName || 'Untitled Draft',
        clientName: clientName || 'TBD',
        projectManagerId: projectManagerId || null,
        status: 'Draft',
        contractualTonnage: contractualTonnage ? parseFloat(contractualTonnage) : null,
        contractDate: contractDate || null,
        downPaymentDate: downPaymentDate || null,
        contractValue: contractValue ? parseFloat(contractValue) : null,
        scopeOfWork: generateScopeText(),
        remarks: JSON.stringify({ __wizardDraft: true, step: currentStep, data: wizardState }),
      };

      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save draft');
      }

      const project = await response.json();

      // Save buildings if any
      for (const building of buildings) {
        if (building.name && building.designation) {
          await fetch('/api/buildings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectId: project.id,
              name: building.name,
              designation: building.designation,
            }),
          });
        }
      }

      setSuccessMessage(`Project saved as draft!\n\nYou can continue editing it later from the Projects list.`);
      setShowSuccessDialog(true);
    } catch (error) {
      console.error('Error saving draft:', error);
      setSuccessMessage(`Failed to save draft:\n\n${error instanceof Error ? error.message : 'Unknown error'}`);
      setShowSuccessDialog(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Generate coating system description
      const coatingSystemText = coatingCoats.map((coat, idx) => 
        `Coat ${idx + 1}: ${coat.coatName}${coat.microns ? ` (${coat.microns} microns)` : ''}${coat.ralNumber ? ` - ${coat.ralNumber}` : ''}`
      ).join('\n');

      // Map payment terms to project's fixed payment fields
      // Store percentage separately from amount, description in milestone field
      const paymentFieldsMap: Record<string, any> = {};
      
      paymentTerms.forEach((term, index) => {
        const percentage = parseFloat(term.percentage) || 0;
        const contractVal = parseFloat(contractValue) || 0;
        const amount = contractVal > 0 ? (percentage / 100) * contractVal : null;
        
        if (index === 0) {
          // First payment term -> downPayment fields
          paymentFieldsMap.downPaymentPercentage = percentage;
          paymentFieldsMap.downPayment = amount;
          paymentFieldsMap.downPaymentMilestone = term.description;
        } else if (index <= 5) {
          // Subsequent terms -> payment2, payment3, etc.
          const paymentNum = index + 1;
          paymentFieldsMap[`payment${paymentNum}Percentage`] = percentage;
          paymentFieldsMap[`payment${paymentNum}`] = amount;
          paymentFieldsMap[`payment${paymentNum}Milestone`] = term.description;
        }
      });

      // Map coating coats to project's fixed paint coat fields
      const coatingFieldsMap: Record<string, any> = {};
      
      coatingCoats.forEach((coat, index) => {
        const coatNum = index + 1;
        if (coatNum <= 4) {
          // Include RAL number in coat name if provided
          const coatName = coat.ralNumber 
            ? `${coat.coatName} (${coat.ralNumber})`
            : coat.coatName;
          coatingFieldsMap[`paintCoat${coatNum}`] = coatName;
          coatingFieldsMap[`paintCoat${coatNum}Microns`] = coat.microns ? parseInt(coat.microns) : null;
        }
        // Store first RAL number as topCoatRalNumber
        if (index === 0 && coat.ralNumber) {
          coatingFieldsMap.topCoatRalNumber = coat.ralNumber;
        }
      });

      // Map stage durations to project fields
      const engineeringStage = stageDurations.find(s => s.stage === 'engineering');
      const operationsStage = stageDurations.find(s => s.stage === 'operations');
      const siteStage = stageDurations.find(s => s.stage === 'site');

      // If resuming a draft, delete the old draft first
      if (draftProjectId) {
        try {
          await fetch(`/api/projects/${draftProjectId}`, { method: 'DELETE' });
        } catch (e) {
          console.warn('Could not delete draft project:', e);
        }
      }

      // Create project
      const projectData = {
        projectNumber,
        name: projectName,
        clientName,
        projectManagerId,
        status: 'Active',
        contractualTonnage: contractualTonnage ? parseFloat(contractualTonnage) : 0,
        contractDate: contractDate || null,
        downPaymentDate: downPaymentDate || null,
        contractValue: contractValue ? parseFloat(contractValue) : null,
        scopeOfWork: generateScopeText(),
        galvanized: isGalvanized,
        coatingSystem: coatingSystemText,
        // Technical specs from Step 6
        cranesIncluded,
        surveyorOurScope: surveyorIncluded,
        thirdPartyRequired,
        thirdPartyResponsibility: thirdPartyRequired ? thirdPartyResponsibility : null,
        // Stage durations in weeks
        engineeringWeeksMin: engineeringStage?.durationWeeksMin || null,
        engineeringWeeksMax: engineeringStage?.durationWeeksMax || null,
        operationsWeeksMin: operationsStage?.durationWeeksMin || null,
        operationsWeeksMax: operationsStage?.durationWeeksMax || null,
        siteWeeksMin: siteStage?.durationWeeksMin || null,
        siteWeeksMax: siteStage?.durationWeeksMax || null,
        // Include payment terms mapped to fixed fields
        ...paymentFieldsMap,
        // Include coating coats mapped to fixed fields
        ...coatingFieldsMap,
      };

      const projectResponse = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectData),
      });

      if (!projectResponse.ok) {
        const errorData = await projectResponse.json();
        console.error('Project creation error:', errorData);
        throw new Error(errorData.details || errorData.error || 'Failed to create project');
      }

      const project = await projectResponse.json();

      // Create buildings and their scope schedules
      const createdBuildings: { [tempId: string]: string } = {}; // Map temp IDs to real IDs
      
      for (const building of buildings) {
        const buildingData = {
          projectId: project.id,
          name: building.name,
          designation: building.designation,
          weight: building.weight || null,
          location: building.location || null,
        };

        const buildingResponse = await fetch('/api/buildings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(buildingData),
        });

        if (!buildingResponse.ok) {
          const error = await buildingResponse.json();
          console.error('Failed to create building:', building.name, error);
          throw new Error(`Failed to create building: ${building.name}`);
        }

        const createdBuilding = await buildingResponse.json();
        createdBuildings[building.id] = createdBuilding.id;
      }

      // ── Create scope-of-work records and activities ──────────────
      // For each building: patch the auto-created Steel scope, then POST non-steel scopes.
      // Then create BuildingActivity records for each scope.
      let totalScopesCreated = 0;
      let totalActivitiesCreated = 0;

      for (const building of buildings) {
        const realBuildingId = createdBuildings[building.id];
        if (!realBuildingId) continue;

        const buildingScopes = scopeDefinitions.filter((s) => s.buildingId === building.id);

        // Fetch the auto-created Steel scope for this building
        let steelScopeId: string | null = null;
        try {
          const scopeRes = await fetch(`/api/scope-of-work?buildingId=${realBuildingId}`);
          if (scopeRes.ok) {
            const existingScopes = await scopeRes.json();
            const autoSteel = existingScopes.find((s: { scopeType: string; id: string }) => s.scopeType === 'steel');
            if (autoSteel) steelScopeId = autoSteel.id;
          }
        } catch {}

        // Track created scope IDs per scopeType for activity creation
        const scopeIdMap: Record<string, string> = {};

        for (const scopeDef of buildingScopes) {
          const scopeLabel = SCOPE_TYPE_OPTIONS.find((o) => o.type === scopeDef.scopeType)?.label ||
            scopeDef.customLabel || scopeDef.scopeType;

          const scopePayload = {
            scopeLabel,
            customLabel: scopeDef.customLabel || null,
            quantity: scopeDef.quantity ?? null,
            unit: scopeDef.unit || null,
            ralColor: scopeDef.ralColor || null,
            panelThickness: scopeDef.panelThickness || null,
            ribHeight: scopeDef.ribHeight || null,
            upperSheetThick: scopeDef.upperSheetThick || null,
            lowerSheetThick: scopeDef.lowerSheetThick || null,
            panelProfile: scopeDef.panelProfile || null,
            deckProfile: scopeDef.deckProfile || null,
            hasShearStuds: scopeDef.hasShearStuds ?? false,
            shearStudQty: scopeDef.shearStudQty || null,
            shearStudSpecs: scopeDef.shearStudSpecs || null,
            metalWorkItems: scopeDef.metalWorkItems?.map((i) => ({ name: i.name, unit: i.unit, quantity: i.quantity })) || null,
          };

          if (scopeDef.scopeType === 'steel' && steelScopeId) {
            // PATCH the auto-created Steel scope with our quantity data
            await fetch(`/api/scope-of-work/${steelScopeId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(scopePayload),
            });
            scopeIdMap['steel'] = steelScopeId;
            totalScopesCreated++;
          } else if (scopeDef.scopeType !== 'steel') {
            // POST new non-steel scope
            const createRes = await fetch('/api/scope-of-work', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                projectId: project.id,
                buildingId: realBuildingId,
                scopeType: scopeDef.scopeType,
                ...scopePayload,
              }),
            });
            if (createRes.ok) {
              const createdScope = await createRes.json();
              scopeIdMap[scopeDef.scopeType] = createdScope.id;
              totalScopesCreated++;
            }
          }
        }

        // Create BuildingActivity records
        const allActivities: {
          buildingId: string;
          scopeOfWorkId: string;
          activityType: string;
          activityLabel: string;
          isApplicable: boolean;
          sortOrder: number;
        }[] = [];

        for (const scopeDef of buildingScopes) {
          const scopeOfWorkId = scopeIdMap[scopeDef.scopeType];
          if (!scopeOfWorkId) continue;

          const activities = scopeDef.activities || SCOPE_ACTIVITY_DEFAULTS[scopeDef.scopeType] || [];
          for (const activity of activities) {
            allActivities.push({
              buildingId: realBuildingId,
              scopeOfWorkId,
              activityType: activity.activityType,
              activityLabel: activity.activityLabel,
              isApplicable: activity.isApplicable,
              sortOrder: activity.sortOrder,
            });
          }
        }

        if (allActivities.length > 0) {
          const actRes = await fetch('/api/building-activities', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId: project.id, activities: allActivities }),
          });
          if (actRes.ok) {
            const created = await actRes.json();
            totalActivitiesCreated += Array.isArray(created) ? created.length : 0;
          }
        }
      }

      // Handle file upload if present
      if (uploadedFile) {
        const formData = new FormData();
        formData.append('file', uploadedFile);
        formData.append('projectId', project.id);

        await fetch('/api/projects/upload', {
          method: 'POST',
          body: formData,
        });
      }

      const buildingCount = buildings.length;
      const coatingCount = coatingCoats.length;

      setSuccessMessage(`Project created successfully!\n\n✓ ${buildingCount} building(s) added\n✓ ${totalScopesCreated} scope(s) defined\n✓ ${totalActivitiesCreated} activities configured\n✓ ${coatingCount} coating coat(s) specified`);
      setShowSuccessDialog(true);
    } catch (error) {
      console.error('Error creating project:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setSuccessMessage(`Failed to create project:\n\n${errorMessage}`);
      setShowSuccessDialog(true);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadedFile(e.target.files[0]);
    }
  };

  const STEP_LABELS = [
    'Project Info',
    'Buildings',
    'Scope Definition',
    'Activities',
    'Duration',
    'Coating',
    'Payment',
    'Tech Specs',
    'Upload',
  ];

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8 flex-wrap gap-y-2">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((step, idx) => (
        <div key={step} className="flex items-center">
          <div className="flex flex-col items-center">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
              currentStep === step
                ? 'bg-primary text-white'
                : currentStep > step
                ? 'bg-green-500 text-white'
                : 'bg-gray-200 text-gray-600'
            }`}>
              {currentStep > step ? <Check className="h-4 w-4" /> : step}
            </div>
            <span className="text-[10px] text-muted-foreground mt-1 hidden sm:block w-16 text-center leading-tight">
              {STEP_LABELS[step - 1]}
            </span>
          </div>
          {idx < 8 && (
            <div className={`w-6 h-1 mx-1 mb-5 ${
              currentStep > step ? 'bg-green-500' : 'bg-gray-200'
            }`} />
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Wand2 className="h-8 w-8" />
            Project Setup Wizard
          </h1>
          <p className="text-muted-foreground mt-1">
            Step {currentStep} of 9
          </p>
        </div>
        <Link href="/projects">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Cancel
          </Button>
        </Link>
      </div>

      {renderStepIndicator()}

      {/* Step 1: Project Details */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Project Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="projectNumber">Project Number *</Label>
                <Input
                  id="projectNumber"
                  value={projectNumber}
                  onChange={(e) => setProjectNumber(e.target.value)}
                  placeholder="e.g., PRJ-2025-001"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="projectName">Project Name *</Label>
                <Input
                  id="projectName"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g., Industrial Complex"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="clientName">Client Name *</Label>
                <Input
                  id="clientName"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="e.g., ABC Corporation"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="projectManager">Project Manager *</Label>
                <select
                  id="projectManager"
                  value={projectManagerId}
                  onChange={(e) => setProjectManagerId(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border bg-background"
                >
                  <option value="">Select Manager</option>
                  {managers.map((manager) => (
                    <option key={manager.id} value={manager.id}>
                      {manager.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
                <select
                  id="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border bg-background"
                >
                  <option value="Draft">Draft</option>
                  <option value="Active">Active</option>
                  <option value="On Hold">On Hold</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contractDate">Contract Date</Label>
                <Input
                  id="contractDate"
                  type="date"
                  value={contractDate}
                  onChange={(e) => setContractDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="downPaymentDate">Down Payment Date</Label>
                <Input
                  id="downPaymentDate"
                  type="date"
                  value={downPaymentDate}
                  onChange={(e) => setDownPaymentDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contractValue">Contract Value (﷼)</Label>
                <Input
                  id="contractValue"
                  type="number"
                  value={contractValue}
                  onChange={(e) => setContractValue(e.target.value)}
                  placeholder="e.g., 1000000"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contractualTonnage">Contractual Tonnage (tons)</Label>
              <Input
                id="contractualTonnage"
                type="number"
                value={contractualTonnage}
                onChange={(e) => setContractualTonnage(e.target.value)}
                placeholder="e.g., 500"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Scope of Work *</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => toggleAllScopes(true)}
                    disabled={scopeOfWork.every(s => s.checked)}
                  >
                    Select All
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => toggleAllScopes(false)}
                    disabled={scopeOfWork.every(s => !s.checked)}
                  >
                    Deselect All
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-2">
                {scopeOfWork.map((item) => (
                  <div key={item.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={item.id}
                      checked={item.checked}
                      onChange={() => toggleScope(item.id)}
                      className="rounded"
                    />
                    <label htmlFor={item.id} className="text-sm cursor-pointer">
                      {item.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Buildings */}
      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Buildings</span>
              <Button onClick={addBuilding} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Building
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {buildings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No buildings added yet. Click "Add Building" to start.</p>
              </div>
            ) : (
              buildings.map((building, idx) => (
                <div key={building.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">Building {idx + 1}</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeBuilding(building.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label>Building Name *</Label>
                      <Input
                        value={building.name}
                        onChange={(e) => updateBuilding(building.id, 'name', e.target.value)}
                        placeholder="e.g., Main Building"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Designation *</Label>
                      <Input
                        value={building.designation}
                        onChange={(e) => updateBuilding(building.id, 'designation', e.target.value.toUpperCase())}
                        placeholder="e.g., BLD-A"
                        maxLength={10}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Weight (tons)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={building.weight || ''}
                        onChange={(e) => updateBuilding(building.id, 'weight', parseFloat(e.target.value) || 0)}
                        placeholder="e.g., 150.5"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Location / Description</Label>
                    <Input
                      value={building.location || ''}
                      onChange={(e) => updateBuilding(building.id, 'location', e.target.value)}
                      placeholder="e.g., North side of plot, Grid A1-C4"
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 3: Scope Definition per Building */}
      {currentStep === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Scope Definition</CardTitle>
            <p className="text-sm text-muted-foreground">
              Define the scope of work and quantities for each building. Steel is always included.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {buildings.map((building, bIdx) => {
              const buildingScopes = getScopesForBuilding(building.id);
              return (
                <div key={building.id} className="border-2 rounded-xl p-5 space-y-4">
                  <h3 className="font-bold text-base flex items-center gap-2">
                    <span className="bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">{bIdx + 1}</span>
                    {building.designation} — {building.name}
                    {building.location && <span className="text-xs text-muted-foreground font-normal ml-1">({building.location})</span>}
                  </h3>

                  {/* Scope type selectors */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Scope Types</Label>
                    <div className="flex flex-wrap gap-2">
                      {SCOPE_TYPE_OPTIONS.map(({ type, label, color }) => {
                        const active = hasScopeType(building.id, type);
                        const isSteel = type === 'steel';
                        return (
                          <button
                            key={type}
                            type="button"
                            onClick={() => active && !isSteel ? removeScopeFromBuilding(building.id, type) : !active ? addScopeToBuilding(building.id, type) : undefined}
                            className={`px-3 py-1 rounded-full border text-xs font-medium transition-all ${
                              active
                                ? color + ' ring-2 ring-offset-1 ring-current'
                                : 'bg-gray-50 border-gray-200 text-gray-400 hover:border-gray-400'
                            } ${isSteel ? 'cursor-default' : 'cursor-pointer'}`}
                          >
                            {active ? '✓ ' : '+ '}{label}
                            {isSteel && <span className="ml-1 text-[10px] opacity-60">required</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Scope detail forms */}
                  {buildingScopes.map((scope) => (
                    <div key={scope.scopeType} className="bg-muted/30 rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-sm capitalize">
                          {SCOPE_TYPE_OPTIONS.find(o => o.type === scope.scopeType)?.label || scope.scopeType}
                        </h4>
                        {scope.scopeType !== 'steel' && (
                          <button
                            type="button"
                            onClick={() => removeScopeFromBuilding(building.id, scope.scopeType)}
                            className="text-red-400 hover:text-red-600 text-xs"
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      {/* Steel */}
                      {scope.scopeType === 'steel' && (
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Quantity (tons)</Label>
                            <Input
                              type="number" step="0.01" min="0"
                              value={scope.quantity || ''}
                              onChange={(e) => updateScopeField(building.id, 'steel', 'quantity', parseFloat(e.target.value) || undefined)}
                              placeholder="e.g., 150.5"
                            />
                          </div>
                        </div>
                      )}

                      {/* Roof / Wall Sheeting */}
                      {(scope.scopeType === 'roof_sheeting' || scope.scopeType === 'wall_sheeting') && (
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Quantity (m²)</Label>
                            <Input type="number" step="0.01" min="0" value={scope.quantity || ''}
                              onChange={(e) => updateScopeField(building.id, scope.scopeType, 'quantity', parseFloat(e.target.value) || undefined)}
                              placeholder="e.g., 805" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">RAL Color</Label>
                            <Input value={scope.ralColor || ''} placeholder="e.g., RAL 9005"
                              onChange={(e) => updateScopeField(building.id, scope.scopeType, 'ralColor', e.target.value)} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Profile</Label>
                            <select
                              value={scope.panelProfile || ''}
                              onChange={(e) => updateScopeField(building.id, scope.scopeType, 'panelProfile', e.target.value as 'flat' | 'ribbed')}
                              className="w-full h-9 px-3 rounded-md border bg-background text-sm"
                            >
                              <option value="">Select profile</option>
                              <option value="ribbed">Ribbed</option>
                              <option value="flat">Flat</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Panel Thickness (mm)</Label>
                            <Input type="number" min="0" value={scope.panelThickness || ''}
                              onChange={(e) => updateScopeField(building.id, scope.scopeType, 'panelThickness', parseInt(e.target.value) || undefined)}
                              placeholder="e.g., 75" />
                          </div>
                          {scope.panelProfile === 'ribbed' && (
                            <div className="space-y-1">
                              <Label className="text-xs">Rib Height (mm)</Label>
                              <Input type="number" min="0" value={scope.ribHeight || ''}
                                onChange={(e) => updateScopeField(building.id, scope.scopeType, 'ribHeight', parseInt(e.target.value) || undefined)}
                                placeholder="e.g., 30" />
                            </div>
                          )}
                          <div className="space-y-1">
                            <Label className="text-xs">Upper Sheet Thickness (mm)</Label>
                            <Input type="number" step="0.1" min="0" value={scope.upperSheetThick || ''}
                              onChange={(e) => updateScopeField(building.id, scope.scopeType, 'upperSheetThick', parseFloat(e.target.value) || undefined)}
                              placeholder="e.g., 0.5" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Lower Sheet Thickness (mm)</Label>
                            <Input type="number" step="0.1" min="0" value={scope.lowerSheetThick || ''}
                              onChange={(e) => updateScopeField(building.id, scope.scopeType, 'lowerSheetThick', parseFloat(e.target.value) || undefined)}
                              placeholder="e.g., 0.3" />
                          </div>
                        </div>
                      )}

                      {/* Deck Panel */}
                      {scope.scopeType === 'deck_panel' && (
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Quantity (m²)</Label>
                            <Input type="number" step="0.01" min="0" value={scope.quantity || ''}
                              onChange={(e) => updateScopeField(building.id, 'deck_panel', 'quantity', parseFloat(e.target.value) || undefined)}
                              placeholder="e.g., 400" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Profile / Thickness</Label>
                            <Input value={scope.deckProfile || ''} placeholder="e.g., TR60 1.2mm"
                              onChange={(e) => updateScopeField(building.id, 'deck_panel', 'deckProfile', e.target.value)} />
                          </div>
                          <div className="col-span-2 flex items-center gap-3">
                            <input type="checkbox" id={`shear-${building.id}`}
                              checked={scope.hasShearStuds || false}
                              onChange={(e) => updateScopeField(building.id, 'deck_panel', 'hasShearStuds', e.target.checked)}
                              className="w-4 h-4 rounded" />
                            <label htmlFor={`shear-${building.id}`} className="text-sm cursor-pointer">Includes Shear Studs</label>
                          </div>
                          {scope.hasShearStuds && (
                            <>
                              <div className="space-y-1">
                                <Label className="text-xs">Shear Stud Quantity</Label>
                                <Input type="number" min="0" value={scope.shearStudQty || ''}
                                  onChange={(e) => updateScopeField(building.id, 'deck_panel', 'shearStudQty', parseInt(e.target.value) || undefined)}
                                  placeholder="e.g., 1200" />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Shear Stud Specs</Label>
                                <Input value={scope.shearStudSpecs || ''} placeholder="e.g., 19mm dia × 100mm"
                                  onChange={(e) => updateScopeField(building.id, 'deck_panel', 'shearStudSpecs', e.target.value)} />
                              </div>
                            </>
                          )}
                        </div>
                      )}

                      {/* Metal Works */}
                      {scope.scopeType === 'metal_work' && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs">Items</Label>
                            <Button type="button" size="sm" variant="outline" onClick={() => addMetalWorkItem(building.id)}>
                              <Plus className="h-3 w-3 mr-1" /> Add Item
                            </Button>
                          </div>
                          {(scope.metalWorkItems || []).length === 0 && (
                            <p className="text-xs text-muted-foreground">No items yet. Click "Add Item" to start.</p>
                          )}
                          {(scope.metalWorkItems || []).map((item) => (
                            <div key={item.id} className="grid grid-cols-[1fr_100px_100px_32px] gap-2 items-end">
                              <div className="space-y-1">
                                <Label className="text-xs">Item Name</Label>
                                <Input value={item.name} placeholder="e.g., Handrail" className="h-8"
                                  onChange={(e) => updateMetalWorkItem(building.id, item.id, 'name', e.target.value)} />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Unit</Label>
                                <select value={item.unit}
                                  onChange={(e) => updateMetalWorkItem(building.id, item.id, 'unit', e.target.value)}
                                  className="w-full h-8 px-2 rounded-md border bg-background text-sm">
                                  <option value="ton">ton</option>
                                  <option value="m2">m²</option>
                                  <option value="Lm">Lm</option>
                                  <option value="LS">LS</option>
                                </select>
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Qty</Label>
                                <Input type="number" min="0" step="0.01" value={item.quantity} className="h-8"
                                  onChange={(e) => updateMetalWorkItem(building.id, item.id, 'quantity', parseFloat(e.target.value) || 0)} />
                              </div>
                              <button type="button" onClick={() => removeMetalWorkItem(building.id, item.id)}
                                className="h-8 w-8 flex items-center justify-center text-red-400 hover:text-red-600">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Other */}
                      {scope.scopeType === 'other' && (
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Custom Label *</Label>
                            <Input value={scope.customLabel || ''} placeholder="e.g., Cladding"
                              onChange={(e) => updateScopeField(building.id, 'other', 'customLabel', e.target.value)} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Unit of Measurement</Label>
                            <select value={scope.unit || 'LS'}
                              onChange={(e) => updateScopeField(building.id, 'other', 'unit', e.target.value as 'ton' | 'm2' | 'Lm' | 'LS')}
                              className="w-full h-9 px-3 rounded-md border bg-background text-sm">
                              <option value="ton">ton</option>
                              <option value="m2">m²</option>
                              <option value="Lm">Lm</option>
                              <option value="LS">LS</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Quantity</Label>
                            <Input type="number" step="0.01" min="0" value={scope.quantity || ''}
                              onChange={(e) => updateScopeField(building.id, 'other', 'quantity', parseFloat(e.target.value) || undefined)}
                              placeholder="e.g., 1" />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Step 4: Activities per Scope */}
      {currentStep === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>Activities per Scope</CardTitle>
            <p className="text-sm text-muted-foreground">
              Review and toggle which activities apply to each scope. Defaults are pre-filled based on scope type.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {buildings.map((building, bIdx) => {
              const buildingScopes = getScopesForBuilding(building.id);
              return (
                <div key={building.id} className="border-2 rounded-xl p-5 space-y-4">
                  <h3 className="font-bold text-base flex items-center gap-2">
                    <span className="bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">{bIdx + 1}</span>
                    {building.designation} — {building.name}
                  </h3>
                  {buildingScopes.map((scope) => {
                    const activities = scope.activities || SCOPE_ACTIVITY_DEFAULTS[scope.scopeType] || [];
                    return (
                      <div key={scope.scopeType} className="bg-muted/30 rounded-lg p-4">
                        <h4 className="font-semibold text-sm mb-3">
                          {SCOPE_TYPE_OPTIONS.find(o => o.type === scope.scopeType)?.label || scope.scopeType}
                          {scope.customLabel && ` — ${scope.customLabel}`}
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {activities.map((activity) => (
                            <label
                              key={activity.activityType}
                              className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all text-xs ${
                                activity.isApplicable
                                  ? 'border-primary/30 bg-primary/5 text-primary font-medium'
                                  : 'border-gray-200 bg-gray-50 text-gray-400'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={activity.isApplicable}
                                onChange={() => toggleScopeActivity(building.id, scope.scopeType, activity.activityType)}
                                className="w-3.5 h-3.5 rounded"
                              />
                              {activity.activityLabel}
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Step 5: Duration by Stage */}
      {currentStep === 5 && (
        <Card>
          <CardHeader>
            <CardTitle>Duration by Stage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-sm text-muted-foreground">
              Define the planned duration in weeks for each project stage based on your selected scope of work.
            </p>
            {stageDurations
              .filter((stage) => {
                // Only show stages that have at least one scope selected
                const stageScopes = STAGE_SCOPES[stage.stage] || [];
                return scopeOfWork.some(s => s.checked && stageScopes.includes(s.id));
              })
              .map((stage) => (
              <div key={stage.stage} className="border-2 rounded-lg p-4 space-y-4">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    stage.stage === 'engineering' ? 'bg-blue-500' :
                    stage.stage === 'operations' ? 'bg-orange-500' :
                    'bg-green-500'
                  }`} />
                  <h3 className="font-bold text-lg">{stage.label}</h3>
                  {(stage.durationWeeksMin > 0 || stage.durationWeeksMax > 0) && (
                    <span className="ml-auto text-sm font-medium text-muted-foreground">
                      {stage.durationWeeksMin === stage.durationWeeksMax 
                        ? `${stage.durationWeeksMin} weeks`
                        : `${stage.durationWeeksMin}-${stage.durationWeeksMax} weeks`}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Minimum Duration (weeks)</Label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="e.g., 4"
                      value={stage.durationWeeksMin || ''}
                      onChange={(e) => updateStageDuration(stage.stage, 'durationWeeksMin', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Maximum Duration (weeks)</Label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="e.g., 6"
                      value={stage.durationWeeksMax || ''}
                      onChange={(e) => updateStageDuration(stage.stage, 'durationWeeksMax', parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {stage.stage === 'engineering' && 'Design, detailing, and engineering activities'}
                  {stage.stage === 'operations' && 'Fabrication, coating, and quality control'}
                  {stage.stage === 'site' && 'Delivery, erection, and site activities'}
                </p>
              </div>
            ))}
            
            {/* Total Duration Summary */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">Total Project Duration (estimated)</span>
                <span className="text-lg font-bold">
                  {(() => {
                    const filledStages = stageDurations.filter(s => s.durationWeeksMin > 0 || s.durationWeeksMax > 0);
                    if (filledStages.length === 0) return '-';
                    const totalMin = filledStages.reduce((sum, s) => sum + s.durationWeeksMin, 0);
                    const totalMax = filledStages.reduce((sum, s) => sum + s.durationWeeksMax, 0);
                    if (totalMin === totalMax) return `${totalMin} weeks`;
                    return `${totalMin}-${totalMax} weeks`;
                  })()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 6: Coating System */}
      {currentStep === 6 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Coating System</span>
              <Button onClick={addCoatingCoat} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Coat
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {coatingCoats.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No coating coats added yet. Click "Add Coat" to start.</p>
              </div>
            ) : (
              coatingCoats.map((coat, idx) => (
                <div key={coat.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">Coat {idx + 1}</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCoatingCoat(coat.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label>Coat Name *</Label>
                      <Input
                        value={coat.coatName}
                        onChange={(e) => updateCoatingCoat(coat.id, 'coatName', e.target.value)}
                        placeholder="e.g., Hot-Dip Galvanization"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Microns</Label>
                      <Input
                        type="number"
                        value={coat.microns}
                        onChange={(e) => updateCoatingCoat(coat.id, 'microns', e.target.value)}
                        placeholder="e.g., 85"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>RAL Number</Label>
                      <Input
                        value={coat.ralNumber}
                        onChange={(e) => updateCoatingCoat(coat.id, 'ralNumber', e.target.value)}
                        placeholder="e.g., RAL 7035"
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 7: Payment Terms */}
      {currentStep === 7 && (
        <Card>
          <CardHeader>
            <CardTitle>Payment Terms</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              {paymentTerms.map((term, index) => (
                <div key={term.id} className="flex gap-4 items-start p-4 border rounded-lg">
                  <div className="flex-1 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Payment Percentage (%)</Label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={term.percentage}
                          onChange={(e) => updatePaymentTerm(term.id, 'percentage', e.target.value)}
                          placeholder="e.g., 30"
                        />
                      </div>
                      <div>
                        <Label>Term Description</Label>
                        <Input
                          value={term.description}
                          onChange={(e) => updatePaymentTerm(term.id, 'description', e.target.value)}
                          placeholder="e.g., Down Payment, Upon Delivery"
                        />
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removePaymentTerm(term.id)}
                    className="mt-6"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <Button onClick={addPaymentTerm} variant="outline" className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Add Payment Term
            </Button>

            {paymentTerms.length > 0 && (
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total Payment Percentage:</span>
                  <span className={`text-lg font-bold ${
                    Math.abs(getTotalPaymentPercentage() - 100) < 0.01 
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }`}>
                    {getTotalPaymentPercentage().toFixed(2)}%
                  </span>
                </div>
                {Math.abs(getTotalPaymentPercentage() - 100) >= 0.01 && (
                  <p className="text-sm text-red-600 mt-2">
                    Total must equal 100%
                  </p>
                )}
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Define payment terms and percentages for this project. Total must equal 100%.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Step 8: Technical Specs */}
      {currentStep === 8 && (
        <Card>
          <CardHeader>
            <CardTitle>Technical Specifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Cranes Included - Only show if Erection is in scope */}
            {scopeOfWork.find(s => s.id === 'erection')?.checked && (
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <Label className="text-base font-medium">Cranes for Installation?</Label>
                  <p className="text-sm text-muted-foreground">Will mobile cranes or overhead cranes be required for site installation?</p>
                </div>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="cranesIncluded"
                      checked={cranesIncluded}
                      onChange={() => setCranesIncluded(true)}
                      className="w-4 h-4"
                    />
                    <span>Yes</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="cranesIncluded"
                      checked={!cranesIncluded}
                      onChange={() => setCranesIncluded(false)}
                      className="w-4 h-4"
                    />
                    <span>No</span>
                  </label>
                </div>
              </div>
            )}

            {/* Surveyor Included */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <Label className="text-base font-medium">Surveyor Included?</Label>
                <p className="text-sm text-muted-foreground">Is surveying part of our scope?</p>
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="surveyorIncluded"
                    checked={surveyorIncluded}
                    onChange={() => setSurveyorIncluded(true)}
                    className="w-4 h-4"
                  />
                  <span>Yes</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="surveyorIncluded"
                    checked={!surveyorIncluded}
                    onChange={() => setSurveyorIncluded(false)}
                    className="w-4 h-4"
                  />
                  <span>No</span>
                </label>
              </div>
            </div>

            {/* 3rd Party Test Required */}
            <div className="p-4 border rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">3rd Party Test Required?</Label>
                  <p className="text-sm text-muted-foreground">Does this project require third-party testing?</p>
                </div>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="thirdPartyRequired"
                      checked={thirdPartyRequired}
                      onChange={() => setThirdPartyRequired(true)}
                      className="w-4 h-4"
                    />
                    <span>Yes</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="thirdPartyRequired"
                      checked={!thirdPartyRequired}
                      onChange={() => setThirdPartyRequired(false)}
                      className="w-4 h-4"
                    />
                    <span>No</span>
                  </label>
                </div>
              </div>

              {/* Responsibility selection - only show if 3rd party is required */}
              {thirdPartyRequired && (
                <div className="ml-4 p-4 bg-muted/50 rounded-lg">
                  <Label className="text-sm font-medium mb-3 block">Who is responsible for 3rd party testing?</Label>
                  <div className="flex gap-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="thirdPartyResponsibility"
                        checked={thirdPartyResponsibility === 'our'}
                        onChange={() => setThirdPartyResponsibility('our')}
                        className="w-4 h-4"
                      />
                      <span>Our Responsibility</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="thirdPartyResponsibility"
                        checked={thirdPartyResponsibility === 'customer'}
                        onChange={() => setThirdPartyResponsibility('customer')}
                        className="w-4 h-4"
                      />
                      <span>Customer Responsibility</span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              These specifications will be displayed in the project details under Technical & Specs section.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Step 9: Upload Parts */}
      {currentStep === 9 && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Assembly Parts (Optional)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-4">
                Upload Excel file with assembly parts data
              </p>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload">
                <Button type="button" variant="outline" asChild>
                  <span>Choose File</span>
                </Button>
              </label>
              {uploadedFile && (
                <p className="mt-4 text-sm font-medium text-green-600">
                  Selected: {uploadedFile.name}
                </p>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              You can skip this step and upload parts later from the project details page.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={prevStep}
          disabled={currentStep === 1}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Previous
        </Button>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleSaveAsDraft}
            disabled={loading || !projectNumber}
            title="Save current progress as draft"
          >
            Save as Draft
          </Button>
          {currentStep < 9 ? (
            <Button onClick={nextStep}>
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? 'Creating...' : 'Create Project'}
              <Check className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Success Dialog */}
      <SuccessDialog
        open={showSuccessDialog}
        onClose={() => setShowSuccessDialog(false)}
        title={successMessage.includes('Failed') || successMessage.includes('cannot') ? 'Error' : 'Success'}
        message={successMessage}
        type={successMessage.includes('Failed') || successMessage.includes('cannot') ? 'error' : 'success'}
        onConfirm={() => {
          if (!successMessage.includes('Failed') && !successMessage.includes('cannot')) {
            router.push('/projects');
          }
        }}
      />
    </div>
  );
}
