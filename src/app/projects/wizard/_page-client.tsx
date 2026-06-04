'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SuccessDialog } from '@/components/ui/success-dialog';
import { CustomerCombobox } from '@/components/ui/customer-combobox';
import { ArrowLeft, ArrowRight, Check, Wand2, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { STRUCTURE_TYPES, SAUDI_CITIES, EMPTY_CHECKLIST, type ProjectChecklistAnswers, type ChecklistAnswer } from '@/lib/project-constants';

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

type WizardCoatingSystem = {
  id: string;
  name: string;
  appliesToAll: boolean;
  buildingIds: string[];
  coats: CoatingCoat[];
  isGalvanized: boolean;
  galvanizationMicrons: string;
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
  // true when resuming an existing non-draft project (edit mode)
  const [isActiveEdit, setIsActiveEdit] = useState(false);

  // Step 1: Project Details
  const [projectNumber, setProjectNumber] = useState('');
  const [projectName, setProjectName] = useState('');
  const [clientName, setClientName] = useState('');
  const [structureType, setStructureType] = useState('');
  const [projectLocation, setProjectLocation] = useState('');
  const [projectManagerId, setProjectManagerId] = useState('');
  const [salesEngineerId, setSalesEngineerId] = useState('');
  const [operationsManagerId, setOperationsManagerId] = useState('');
  const [status, setStatus] = useState('Draft');
  const [contractualTonnage, setContractualTonnage] = useState('');
  const [contractDate, setContractDate] = useState('');
  const [downPaymentDate, setDownPaymentDate] = useState('');
  const [contractValue, setContractValue] = useState('');
  const [scopeOfWork, setScopeOfWork] = useState<ScopeItem[]>(
    SCOPE_OPTIONS.map(opt => ({ ...opt, checked: false }))
  );
  const [managers, setManagers] = useState<Array<{ id: string; name: string; position?: string | null }>>([]);

  // Step 2: Buildings
  const [buildings, setBuildings] = useState<Building[]>([]);

  // Step 3: Scope Definitions per building
  const [scopeDefinitions, setScopeDefinitions] = useState<ScopeDefinition[]>([]);

  // Step 3: Scope Schedules (legacy - kept for compatibility)
  const [scopeSchedules, setScopeSchedules] = useState<ScopeSchedule[]>([]);

  // Step 5: Stage Durations
  const [stageDurations, setStageDurations] = useState<StageDuration[]>([
    { stage: 'engineering', label: 'Engineering', durationWeeksMin: 0, durationWeeksMax: 0 },
    { stage: 'operations', label: 'Operations', durationWeeksMin: 0, durationWeeksMax: 0 },
    { stage: 'site', label: 'Site', durationWeeksMin: 0, durationWeeksMax: 0 },
  ]);

  // Step 6: Coating Systems (multiple)
  const [coatingSystems, setCoatingSystems] = useState<WizardCoatingSystem[]>([]);

  // Step 7: Payment Terms
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerm[]>([]);

  // Step 8: Project Checklist
  const [checklistData, setChecklistData] = useState<ProjectChecklistAnswers>({ ...EMPTY_CHECKLIST });

  // Step 9: Technical Specs
  const [cranesIncluded, setCranesIncluded] = useState(false);
  const [surveyorIncluded, setSurveyorIncluded] = useState(false);
  const [thirdPartyRequired, setThirdPartyRequired] = useState(false);
  const [thirdPartyResponsibility, setThirdPartyResponsibility] = useState<'our' | 'customer'>('our');

  // (Upload step removed — assembly parts can be uploaded from the project details page)

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
        if (project.status && project.status !== 'Draft') {
          setIsActiveEdit(true);
        }
        if (project.projectNumber && !project.projectNumber.startsWith('DRAFT-')) {
          setProjectNumber(project.projectNumber);
        }
        if (project.name && project.name !== 'Untitled Draft') setProjectName(project.name);
        if (project.client?.name && project.client.name !== 'TBD') setClientName(project.client.name);
        if (project.projectManagerId) setProjectManagerId(project.projectManagerId);
        if (project.salesEngineerId) setSalesEngineerId(project.salesEngineerId);
        if (project.operationsManagerId) setOperationsManagerId(project.operationsManagerId);
        if (project.contractualTonnage) setContractualTonnage(String(project.contractualTonnage));
        if (project.contractDate) setContractDate(project.contractDate.split('T')[0]);
        if (project.downPaymentDate) setDownPaymentDate(project.downPaymentDate.split('T')[0]);
        if (project.contractValue) setContractValue(String(project.contractValue));
        if (project.structureType) setStructureType(project.structureType);
        if (project.projectLocation) setProjectLocation(project.projectLocation);

        // Restore wizard state from remarks (draft saves)
        let sowRestoredFromRemarks = false;
        if (project.remarks) {
          try {
            const parsed = JSON.parse(project.remarks);
            if (parsed?.__wizardDraft && parsed.data) {
              const d = parsed.data;
              if (d.scopeOfWork) { setScopeOfWork(d.scopeOfWork); sowRestoredFromRemarks = true; }
              if (d.stageDurations) setStageDurations(d.stageDurations);
              if (d.paymentTerms) setPaymentTerms(d.paymentTerms);
              if (d.coatingSystems) setCoatingSystems(d.coatingSystems);
              if (d.checklistData) setChecklistData(d.checklistData);
              if (d.structureType) setStructureType(d.structureType);
              if (d.projectLocation) setProjectLocation(d.projectLocation);
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

        // Restore SoW checkboxes from project's scopeOfWork text when not available in draft.
        // The text field stores the selected scope labels line-by-line.
        if (!sowRestoredFromRemarks && project.scopeOfWork) {
          const text = project.scopeOfWork as string;
          setScopeOfWork(
            SCOPE_OPTIONS.map(opt => ({
              ...opt,
              checked: text.includes(opt.label),
            }))
          );
        }

        // Restore technical specs from project fields when not in draft
        if (!project.remarks || !JSON.parse(project.remarks || 'null')?.__wizardDraft) {
          if (project.cranesIncluded !== undefined) setCranesIncluded(!!project.cranesIncluded);
          if (project.surveyorOurScope !== undefined) setSurveyorIncluded(!!project.surveyorOurScope);
          if (project.thirdPartyRequired !== undefined) setThirdPartyRequired(!!project.thirdPartyRequired);
          if (project.thirdPartyResponsibility) setThirdPartyResponsibility(project.thirdPartyResponsibility as 'our' | 'customer');
          if (project.engineeringWeeksMin || project.engineeringWeeksMax || project.operationsWeeksMin || project.operationsWeeksMax || project.siteWeeksMin || project.siteWeeksMax) {
            setStageDurations([
              { stage: 'engineering', label: 'Engineering', durationWeeksMin: project.engineeringWeeksMin ?? 0, durationWeeksMax: project.engineeringWeeksMax ?? 0 },
              { stage: 'operations', label: 'Operations', durationWeeksMin: project.operationsWeeksMin ?? 0, durationWeeksMax: project.operationsWeeksMax ?? 0 },
              { stage: 'site', label: 'Site', durationWeeksMin: project.siteWeeksMin ?? 0, durationWeeksMax: project.siteWeeksMax ?? 0 },
            ]);
          }
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
      const response = await fetch('/api/users?forAssignment=true');
      if (response.ok) {
        const data = await response.json();
        setManagers(data);
      }
    } catch {
      // silently ignore fetch errors on mount
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
        return buildings.every(b => hasScopeType(b.id, 'steel'));
      case 4:
        return true;
      case 5: {
        const visibleStages = stageDurations.filter(stage => {
          const stageScopes = STAGE_SCOPES[stage.stage] || [];
          return scopeOfWork.some(s => s.checked && stageScopes.includes(s.id));
        });
        return visibleStages.length === 0 || visibleStages.some(s => s.durationWeeksMin > 0 || s.durationWeeksMax > 0);
      }
      case 6:
        return coatingSystems.length > 0 && coatingSystems.every(
          cs => cs.coats.length > 0 && cs.coats.every(c => c.coatName)
        );
      case 7: {
        if (paymentTerms.length === 0) return true;
        const total = getTotalPaymentPercentage();
        return paymentTerms.every(t => t.percentage && t.description) && Math.abs(total - 100) < 0.01;
      }
      case 8:
        return true; // Checklist — optional
      case 9:
        return true; // Technical specs — optional
      case 10:
        return true; // Review — always valid
      default:
        return false;
    }
  };

  const nextStep = () => {
    if (currentStep === 2) {
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

  // ── Coating System helpers (Step 6) ───────────────────────────────
  const addCoatingSystem = () => {
    const newSystem: WizardCoatingSystem = {
      id: `cs-${Date.now()}`,
      name: '',
      appliesToAll: true,
      buildingIds: [],
      coats: [{ id: `coat-${Date.now()}`, coatName: '', microns: '', ralNumber: '' }],
      isGalvanized: false,
      galvanizationMicrons: '',
    };
    setCoatingSystems(prev => [...prev, newSystem]);
  };

  const removeCoatingSystem = (csId: string) => {
    setCoatingSystems(prev => prev.filter(cs => cs.id !== csId));
  };

  const updateCoatingSystem = (csId: string, field: keyof WizardCoatingSystem, value: unknown) => {
    setCoatingSystems(prev =>
      prev.map(cs => cs.id === csId ? { ...cs, [field]: value } : cs)
    );
  };

  const addCoatToSystem = (csId: string) => {
    setCoatingSystems(prev =>
      prev.map(cs =>
        cs.id === csId
          ? { ...cs, coats: [...cs.coats, { id: `coat-${Date.now()}`, coatName: '', microns: '', ralNumber: '' }] }
          : cs
      )
    );
  };

  const removeCoatFromSystem = (csId: string, coatId: string) => {
    setCoatingSystems(prev =>
      prev.map(cs =>
        cs.id === csId ? { ...cs, coats: cs.coats.filter(c => c.id !== coatId) } : cs
      )
    );
  };

  const updateCoatInSystem = (csId: string, coatId: string, field: keyof CoatingCoat, value: string) => {
    setCoatingSystems(prev =>
      prev.map(cs =>
        cs.id === csId
          ? { ...cs, coats: cs.coats.map(c => c.id === coatId ? { ...c, [field]: value } : c) }
          : cs
      )
    );
  };

  const getBuildingsForSystem = (csId: string): string[] => {
    const usedInOthers = new Set(
      coatingSystems.filter(cs => cs.id !== csId && !cs.appliesToAll).flatMap(cs => cs.buildingIds)
    );
    return buildings.map(b => b.id).filter(id => !usedInOthers.has(id));
  };

  // ── Checklist helpers (Step 8) ────────────────────────────────────
  const updateChecklist = (field: keyof ProjectChecklistAnswers, value: ChecklistAnswer | string) => {
    setChecklistData(prev => ({ ...prev, [field]: value }));
  };

  const hasErectionScope = scopeOfWork.find(s => s.id === 'erection')?.checked ?? false;

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
        coatingSystems: coatingSystems,
        checklistData: checklistData,
        structureType: structureType,
        projectLocation: projectLocation,
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
        salesEngineerId: salesEngineerId || null,
        operationsManagerId: operationsManagerId || null,
        status: 'Draft',
        contractualTonnage: contractualTonnage ? parseFloat(contractualTonnage) : null,
        contractDate: contractDate || null,
        downPaymentDate: downPaymentDate || null,
        contractValue: contractValue ? parseFloat(contractValue) : null,
        structureType: structureType || null,
        projectLocation: projectLocation || null,
        scopeOfWork: generateScopeText(),
        remarks: JSON.stringify({ __wizardDraft: true, step: currentStep, data: wizardState }),
      };

      const draftUrl = draftProjectId ? `/api/projects/${draftProjectId}` : '/api/projects';
      const draftMethod = draftProjectId ? 'PATCH' : 'POST';

      const response = await fetch(draftUrl, {
        method: draftMethod,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save draft');
      }

      const project = await response.json();

      // Save buildings if any (only on new draft creation — skip for existing projects)
      if (!draftProjectId) {
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
      }

      // Update remarks on existing project so we can resume with correct step
      if (!draftProjectId) {
        setDraftProjectId(project.id);
      }

      setSuccessMessage(isActiveEdit
        ? `Project updated successfully!\n\nChanges have been saved.`
        : `Project saved as draft!\n\nYou can continue editing it later from the Projects list.`);
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
      // Map payment terms to project's fixed payment fields
      const paymentFieldsMap: Record<string, unknown> = {};
      
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

      // Map first coating system's coats to legacy paint coat fields for backward compat
      const coatingFieldsMap: Record<string, unknown> = {};
      const firstSystem = coatingSystems[0];
      if (firstSystem) {
        firstSystem.coats.forEach((coat, index) => {
          const coatNum = index + 1;
          if (coatNum <= 4) {
            const coatName = coat.ralNumber ? `${coat.coatName} (${coat.ralNumber})` : coat.coatName;
            coatingFieldsMap[`paintCoat${coatNum}`] = coatName;
            coatingFieldsMap[`paintCoat${coatNum}Microns`] = coat.microns ? parseInt(coat.microns) : null;
          }
          if (index === 0 && coat.ralNumber) coatingFieldsMap.topCoatRalNumber = coat.ralNumber;
        });
      }

      // Map stage durations to project fields
      const engineeringStage = stageDurations.find(s => s.stage === 'engineering');
      const operationsStage = stageDurations.find(s => s.stage === 'operations');
      const siteStage = stageDurations.find(s => s.stage === 'site');

      // When editing an active (non-draft) project: PATCH it.
      // When resuming a draft: delete the draft then create a fresh active project.
      if (isActiveEdit && draftProjectId) {
        const projectData = {
          projectNumber,
          name: projectName,
          clientName,
          projectManagerId,
          salesEngineerId: salesEngineerId || null,
          operationsManagerId: operationsManagerId || null,
          status: 'Active',
          contractualTonnage: contractualTonnage ? parseFloat(contractualTonnage) : 0,
          contractDate: contractDate || null,
          downPaymentDate: downPaymentDate || null,
          contractValue: contractValue ? parseFloat(contractValue) : null,
          scopeOfWork: generateScopeText(),
          structureType: structureType || null,
          projectLocation: projectLocation || null,
          galvanized: coatingSystems.some(cs => cs.isGalvanized),
          cranesIncluded,
          surveyorOurScope: surveyorIncluded,
          thirdPartyRequired,
          thirdPartyResponsibility: thirdPartyRequired ? thirdPartyResponsibility : null,
          engineeringWeeksMin: stageDurations.find(s => s.stage === 'engineering')?.durationWeeksMin || null,
          engineeringWeeksMax: stageDurations.find(s => s.stage === 'engineering')?.durationWeeksMax || null,
          operationsWeeksMin: stageDurations.find(s => s.stage === 'operations')?.durationWeeksMin || null,
          operationsWeeksMax: stageDurations.find(s => s.stage === 'operations')?.durationWeeksMax || null,
          siteWeeksMin: stageDurations.find(s => s.stage === 'site')?.durationWeeksMin || null,
          siteWeeksMax: stageDurations.find(s => s.stage === 'site')?.durationWeeksMax || null,
          ...paymentFieldsMap,
          ...coatingFieldsMap,
        };

        const patchRes = await fetch(`/api/projects/${draftProjectId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(projectData),
        });

        if (!patchRes.ok) {
          const errorData = await patchRes.json();
          throw new Error(errorData.details || errorData.error || 'Failed to update project');
        }

        const project = await patchRes.json();

        // Update coating systems
        if (coatingSystems.length > 0) {
          const csPayload = coatingSystems.map((cs, idx) => ({
            name: cs.name || null,
            appliesToAll: cs.appliesToAll,
            buildingIds: cs.appliesToAll ? [] : cs.buildingIds,
            coats: cs.coats.map(c => ({ coatName: c.coatName, microns: c.microns, ralNumber: c.ralNumber })),
            isGalvanized: cs.isGalvanized,
            galvanizationMicrons: cs.galvanizationMicrons ? parseInt(cs.galvanizationMicrons) : null,
            sortOrder: idx,
          }));
          await fetch(`/api/projects/${project.id}/coating-systems`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(csPayload),
          });
        }

        // Update checklist
        const checklistPayload = {
          contractReceived: checklistData.contractReceived,
          answers: checklistData,
          notifications: Object.fromEntries(
            Object.entries(checklistData).filter(([k]) => k.endsWith('Notify')).map(([k, v]) => [k, v])
          ),
        };
        await fetch(`/api/projects/${project.id}/checklist`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(checklistPayload),
        });

        setSuccessMessage(`Project updated successfully!\n\n✓ All changes saved`);
        setShowSuccessDialog(true);
        return;
      }

      // If resuming a draft, delete the old draft first
      if (draftProjectId) {
        try {
          await fetch(`/api/projects/${draftProjectId}`, { method: 'DELETE' });
        } catch {
          // non-critical — proceed anyway
        }
      }

      // Create project
      const projectData = {
        projectNumber,
        name: projectName,
        clientName,
        projectManagerId,
        salesEngineerId: salesEngineerId || null,
        operationsManagerId: operationsManagerId || null,
        status: 'Active',
        contractualTonnage: contractualTonnage ? parseFloat(contractualTonnage) : 0,
        contractDate: contractDate || null,
        downPaymentDate: downPaymentDate || null,
        contractValue: contractValue ? parseFloat(contractValue) : null,
        scopeOfWork: generateScopeText(),
        structureType: structureType || null,
        projectLocation: projectLocation || null,
        galvanized: coatingSystems.some(cs => cs.isGalvanized),
        // Technical specs from Step 9
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
        ...paymentFieldsMap,
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

      // Create coating systems
      if (coatingSystems.length > 0) {
        const csPayload = coatingSystems.map((cs, idx) => ({
          name: cs.name || null,
          appliesToAll: cs.appliesToAll,
          buildingIds: cs.appliesToAll
            ? []
            : cs.buildingIds.map(tempId => createdBuildings[tempId] || tempId).filter(Boolean),
          coats: cs.coats.map(c => ({ coatName: c.coatName, microns: c.microns, ralNumber: c.ralNumber })),
          isGalvanized: cs.isGalvanized,
          galvanizationMicrons: cs.galvanizationMicrons ? parseInt(cs.galvanizationMicrons) : null,
          sortOrder: idx,
        }));
        await fetch(`/api/projects/${project.id}/coating-systems`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(csPayload),
        });
      }

      // Save checklist
      const checklistPayload = {
        contractReceived: checklistData.contractReceived,
        answers: checklistData,
        notifications: Object.fromEntries(
          Object.entries(checklistData).filter(([k]) => k.endsWith('Notify')).map(([k, v]) => [k, v])
        ),
      };
      await fetch(`/api/projects/${project.id}/checklist`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(checklistPayload),
      });

      const buildingCount = buildings.length;
      const coatingSystemCount = coatingSystems.length;

      setSuccessMessage(`Project created successfully!\n\n✓ ${buildingCount} building(s) added\n✓ ${totalScopesCreated} scope(s) defined\n✓ ${totalActivitiesCreated} activities configured\n✓ ${coatingSystemCount} coating system(s) defined`);
      setShowSuccessDialog(true);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setSuccessMessage(`Failed to create project:\n\n${errorMessage}`);
      setShowSuccessDialog(true);
    } finally {
      setLoading(false);
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
    'Checklist',
    'Tech Specs',
    'Review',
  ];

  const TOTAL_STEPS = 10;

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8 flex-wrap gap-y-2">
      {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((step, idx) => (
        <div key={step} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-opacity ${
                resumeProjectId ? 'cursor-pointer hover:opacity-80' : ''
              } ${
                currentStep === step
                  ? 'bg-primary text-white'
                  : currentStep > step
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}
              onClick={() => resumeProjectId && setCurrentStep(step)}
              title={resumeProjectId ? `Jump to ${STEP_LABELS[step - 1]}` : undefined}
            >
              {currentStep > step ? <Check className="h-4 w-4" /> : step}
            </div>
            <span className="text-[10px] text-muted-foreground mt-1 hidden sm:block w-16 text-center leading-tight">
              {STEP_LABELS[step - 1]}
            </span>
          </div>
          {idx < TOTAL_STEPS - 1 && (
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
            {isActiveEdit ? 'Edit Project' : 'Project Setup Wizard'}
          </h1>
          <p className="text-muted-foreground mt-1">
            Step {currentStep} of {TOTAL_STEPS}
            {isActiveEdit && resumeProjectId && (
              <span className="ml-2 text-xs text-blue-600 font-medium">
                — Edit Mode (click any step circle to jump)
              </span>
            )}
          </p>
        </div>
        <Link href={resumeProjectId ? `/projects/${resumeProjectId}` : '/projects'}>
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Cancel
          </Button>
        </Link>
      </div>

      {renderStepIndicator()}

      {/* Top navigation (mirrors bottom) */}
      <div className="flex justify-between mb-2">
        <Button variant="outline" onClick={prevStep} disabled={currentStep === 1} size="sm">
          <ArrowLeft className="mr-1 h-3 w-3" /> Previous
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSaveAsDraft} disabled={loading || (!projectNumber && !draftProjectId)} size="sm" title={isActiveEdit ? 'Save changes' : 'Save progress as draft'}>
            {isActiveEdit ? 'Save Changes' : 'Save as Draft'}
          </Button>
          {currentStep < TOTAL_STEPS ? (
            <Button onClick={nextStep} size="sm">
              Next <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={loading} size="sm">
              {loading ? (isActiveEdit ? 'Updating...' : 'Creating...') : (isActiveEdit ? 'Update Project' : 'Create Project')} <Check className="ml-1 h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

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

            <div className="grid grid-cols-2 gap-4">
              <CustomerCombobox
                label="Customer Name"
                required
                defaultValue={clientName}
                onSelect={setClientName}
                placeholder="Search customers..."
              />
              <div className="space-y-2">
                <Label htmlFor="structureType">Structure Type</Label>
                <select
                  id="structureType"
                  value={structureType}
                  onChange={(e) => setStructureType(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border bg-background"
                >
                  <option value="">Select structure type</option>
                  {STRUCTURE_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="projectLocation">Project Location</Label>
                <select
                  id="projectLocation"
                  value={projectLocation}
                  onChange={(e) => setProjectLocation(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border bg-background"
                >
                  <option value="">Select city</option>
                  {SAUDI_CITIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="projectManager">Project Manager *</Label>
                <select
                  id="projectManager"
                  value={projectManagerId}
                  onChange={(e) => setProjectManagerId(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border bg-background"
                >
                  <option value="">Select a manager</option>
                  {managers.map((manager) => (
                    <option key={manager.id} value={manager.id}>
                      {manager.name}{manager.position ? ` (${manager.position})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="salesEngineer">Sales Engineer</Label>
                <select
                  id="salesEngineer"
                  value={salesEngineerId}
                  onChange={(e) => setSalesEngineerId(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border bg-background"
                >
                  <option value="">Select a sales engineer</option>
                  {managers.map((manager) => (
                    <option key={manager.id} value={manager.id}>
                      {manager.name}{manager.position ? ` (${manager.position})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="operationsManager">Operations Manager</Label>
                <select
                  id="operationsManager"
                  value={operationsManagerId}
                  onChange={(e) => setOperationsManagerId(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border bg-background"
                >
                  <option value="">Select an operations manager</option>
                  {managers.map((manager) => (
                    <option key={manager.id} value={manager.id}>
                      {manager.name}{manager.position ? ` (${manager.position})` : ''}
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
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Coating Systems</h2>
            <Button onClick={addCoatingSystem} size="sm">
              <Plus className="mr-2 h-4 w-4" /> Add Coating System
            </Button>
          </div>
          {coatingSystems.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No coating systems added. Click &quot;Add Coating System&quot; to start.
              </CardContent>
            </Card>
          )}
          {coatingSystems.map((cs, csIdx) => {
            const availableBuildings = getBuildingsForSystem(cs.id);
            return (
              <Card key={cs.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-base">
                    <Input
                      className="max-w-xs text-sm font-medium"
                      value={cs.name}
                      onChange={(e) => updateCoatingSystem(cs.id, 'name', e.target.value)}
                      placeholder={`Coating System ${csIdx + 1}`}
                    />
                    <Button variant="ghost" size="sm" onClick={() => removeCoatingSystem(cs.id)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Applicable buildings toggle */}
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <input
                      type="checkbox"
                      id={`appliesToAll-${cs.id}`}
                      checked={cs.appliesToAll}
                      onChange={(e) => updateCoatingSystem(cs.id, 'appliesToAll', e.target.checked)}
                      className="w-4 h-4"
                    />
                    <label htmlFor={`appliesToAll-${cs.id}`} className="text-sm font-medium cursor-pointer">
                      Applicable to all buildings
                    </label>
                  </div>
                  {!cs.appliesToAll && (
                    <div className="space-y-2">
                      <Label className="text-sm">Select Buildings</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {availableBuildings.map((bId) => {
                          const b = buildings.find(b => b.id === bId);
                          if (!b) return null;
                          return (
                            <div key={bId} className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                id={`cs-${cs.id}-b-${bId}`}
                                checked={cs.buildingIds.includes(bId)}
                                onChange={(e) => {
                                  const updated = e.target.checked
                                    ? [...cs.buildingIds, bId]
                                    : cs.buildingIds.filter(id => id !== bId);
                                  updateCoatingSystem(cs.id, 'buildingIds', updated);
                                }}
                                className="w-4 h-4"
                              />
                              <label htmlFor={`cs-${cs.id}-b-${bId}`} className="text-sm cursor-pointer">
                                {b.designation} — {b.name}
                              </label>
                            </div>
                          );
                        })}
                        {availableBuildings.length === 0 && (
                          <p className="text-sm text-muted-foreground col-span-2">All buildings are assigned to other systems</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Galvanization */}
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id={`galvanized-${cs.id}`}
                      checked={cs.isGalvanized}
                      onChange={(e) => updateCoatingSystem(cs.id, 'isGalvanized', e.target.checked)}
                      className="w-4 h-4"
                    />
                    <label htmlFor={`galvanized-${cs.id}`} className="text-sm font-medium cursor-pointer">Galvanized</label>
                    {cs.isGalvanized && (
                      <Input
                        type="number"
                        value={cs.galvanizationMicrons}
                        onChange={(e) => updateCoatingSystem(cs.id, 'galvanizationMicrons', e.target.value)}
                        placeholder="Microns"
                        className="max-w-28 text-sm"
                      />
                    )}
                  </div>

                  {/* Coats */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Paint Coats</Label>
                      <Button size="sm" variant="outline" onClick={() => addCoatToSystem(cs.id)}>
                        <Plus className="mr-1 h-3 w-3" /> Add Coat
                      </Button>
                    </div>
                    {cs.coats.map((coat, idx) => (
                      <div key={coat.id} className="border rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-muted-foreground">Coat {idx + 1}</span>
                          <Button variant="ghost" size="sm" onClick={() => removeCoatFromSystem(cs.id, coat.id)}>
                            <Trash2 className="h-3 w-3 text-red-500" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Coat Name *</Label>
                            <Input
                              value={coat.coatName}
                              onChange={(e) => updateCoatInSystem(cs.id, coat.id, 'coatName', e.target.value)}
                              placeholder="e.g., Hot-Dip Galvanization"
                              className="text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Microns</Label>
                            <Input
                              type="number"
                              value={coat.microns}
                              onChange={(e) => updateCoatInSystem(cs.id, coat.id, 'microns', e.target.value)}
                              placeholder="e.g., 85"
                              className="text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">RAL Number</Label>
                            <Input
                              value={coat.ralNumber}
                              onChange={(e) => updateCoatInSystem(cs.id, coat.id, 'ralNumber', e.target.value)}
                              placeholder="e.g., RAL 7035"
                              className="text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    {cs.coats.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-2">No coats added yet</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
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

      {/* Step 8: Project Checklist */}
      {currentStep === 8 && (
        <div className="space-y-4">
          <div className="text-center mb-4">
            <h2 className="text-xl font-bold">Project Checklist</h2>
            <p className="text-sm text-muted-foreground">Complete all applicable items before project execution</p>
          </div>

          {/* Section 1: Kickoff */}
          <Card className="border-blue-200">
            <CardHeader className="bg-blue-50 rounded-t-lg pb-3">
              <CardTitle className="text-blue-800 text-base">1. Kickoff</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              {/* Contract received */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Did you get a Signed &amp; Stamped Contract?</Label>
                <div className="flex gap-4">
                  {(['yes', 'no', 'na'] as ChecklistAnswer[]).map(opt => (
                    <label key={opt} className="flex items-center gap-1.5 cursor-pointer text-sm">
                      <input type="radio" name="contractReceived" value={opt ?? ''} checked={checklistData.contractReceived === opt}
                        onChange={() => updateChecklist('contractReceived', opt)} className="w-4 h-4" />
                      {opt === 'yes' ? 'Yes' : opt === 'no' ? 'No' : 'N/A'}
                    </label>
                  ))}
                </div>
                {checklistData.contractReceived === 'yes' && (
                  <Input value={checklistData.contractReceivedNotify} onChange={(e) => updateChecklist('contractReceivedNotify', e.target.value)}
                    placeholder="Notify: who should be informed?" className="text-sm mt-1" />
                )}
                {checklistData.contractReceived === 'no' && (
                  <p className="text-xs text-red-600 font-medium">⚠ Project will be marked as requiring attention until contract is received</p>
                )}
              </div>
              {/* Arch drawings per building */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Did you receive approved architectural drawings?</Label>
                <p className="text-xs text-muted-foreground">Track per building:</p>
                {buildings.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">Add buildings in Step 2 first</p>
                ) : (
                  <div className="space-y-2 ml-2">
                    {buildings.map(b => {
                      const key = `archDraw_${b.id}` as keyof ProjectChecklistAnswers;
                      return (
                        <div key={b.id} className="flex items-center gap-4">
                          <span className="text-sm font-medium w-32 shrink-0">{b.designation} — {b.name}</span>
                          {(['yes', 'no', 'na'] as ChecklistAnswer[]).map(opt => (
                            <label key={opt} className="flex items-center gap-1 cursor-pointer text-sm">
                              <input type="radio" name={`archDraw-${b.id}`} value={opt ?? ''} checked={(checklistData as Record<string, unknown>)[key] === opt}
                                onChange={() => updateChecklist(key, opt)} className="w-3.5 h-3.5" />
                              {opt === 'yes' ? 'Yes' : opt === 'no' ? 'No' : 'N/A'}
                            </label>
                          ))}
                          {(checklistData as Record<string, unknown>)[key] === 'no' && (
                            <span className="text-xs text-red-600">⚠ Required</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Section 2: Financial */}
          <Card className="border-green-200">
            <CardHeader className="bg-green-50 rounded-t-lg pb-3">
              <CardTitle className="text-green-800 text-base">2. Financial Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              {[
                { field: 'advancePaymentReceived' as const, notifyField: 'advancePaymentNotify' as const, label: 'Has the advance payment been received?' },
                { field: 'pendingFinancialApprovals' as const, notifyField: 'pendingFinancialApprovalsNotify' as const, label: 'Are there any pending financial approvals?' },
              ].map(({ field, notifyField, label }) => (
                <div key={field} className="space-y-2">
                  <Label className="text-sm font-medium">{label}</Label>
                  <div className="flex gap-4">
                    {(['yes', 'no', 'na'] as ChecklistAnswer[]).map(opt => (
                      <label key={opt} className="flex items-center gap-1.5 cursor-pointer text-sm">
                        <input type="radio" name={field} value={opt ?? ''} checked={checklistData[field] === opt}
                          onChange={() => updateChecklist(field, opt)} className="w-4 h-4" />
                        {opt === 'yes' ? 'Yes' : opt === 'no' ? 'No' : 'N/A'}
                      </label>
                    ))}
                  </div>
                  {checklistData[field] === 'yes' && (
                    <Input value={checklistData[notifyField]} onChange={(e) => updateChecklist(notifyField, e.target.value)}
                      placeholder="Notify: who should be informed?" className="text-sm mt-1" />
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Section 3: ERP */}
          <Card className="border-purple-200">
            <CardHeader className="bg-purple-50 rounded-t-lg pb-3">
              <CardTitle className="text-purple-800 text-base">3. ERP</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Did you create SO?</Label>
                <div className="flex gap-4">
                  {(['yes', 'no', 'na'] as ChecklistAnswer[]).map(opt => (
                    <label key={opt} className="flex items-center gap-1.5 cursor-pointer text-sm">
                      <input type="radio" name="soCreated" value={opt ?? ''} checked={checklistData.soCreated === opt}
                        onChange={() => updateChecklist('soCreated', opt)} className="w-4 h-4" />
                      {opt === 'yes' ? 'Yes' : opt === 'no' ? 'No' : 'N/A'}
                    </label>
                  ))}
                </div>
                {checklistData.soCreated === 'yes' && (
                  <Input value={checklistData.soCreatedNotify} onChange={(e) => updateChecklist('soCreatedNotify', e.target.value)}
                    placeholder="Notify: who should be informed?" className="text-sm mt-1" />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Section 4: Scope */}
          <Card className="border-orange-200">
            <CardHeader className="bg-orange-50 rounded-t-lg pb-3">
              <CardTitle className="text-orange-800 text-base">4. Scope</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              {[
                { field: 'exclusionsOrLimitations' as const, notifyField: 'exclusionsNotify' as const, label: 'Are there any exclusions or limitations to the project scope?' },
                { field: 'materialSubmittalRequired' as const, notifyField: 'materialSubmittalNotify' as const, label: 'Do we need to provide material submittal?' },
              ].map(({ field, notifyField, label }) => (
                <div key={field} className="space-y-2">
                  <Label className="text-sm font-medium">{label}</Label>
                  <div className="flex gap-4">
                    {(['yes', 'no', 'na'] as ChecklistAnswer[]).map(opt => (
                      <label key={opt} className="flex items-center gap-1.5 cursor-pointer text-sm">
                        <input type="radio" name={field} value={opt ?? ''} checked={checklistData[field] === opt}
                          onChange={() => updateChecklist(field, opt)} className="w-4 h-4" />
                        {opt === 'yes' ? 'Yes' : opt === 'no' ? 'No' : 'N/A'}
                      </label>
                    ))}
                  </div>
                  {checklistData[field] === 'yes' && (
                    <Input value={checklistData[notifyField]} onChange={(e) => updateChecklist(notifyField, e.target.value)}
                      placeholder="Notify: who should be informed?" className="text-sm mt-1" />
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Section 5: Client Details */}
          <Card className="border-teal-200">
            <CardHeader className="bg-teal-50 rounded-t-lg pb-3">
              <CardTitle className="text-teal-800 text-base">5. Client Details and Communication</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Consultant Name</Label>
                <Input value={checklistData.consultantName} onChange={(e) => updateChecklist('consultantName', e.target.value)} placeholder="Consultant name" className="text-sm" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Client&apos;s PM Contact Details (phone, email, WhatsApp)</Label>
                <Textarea value={checklistData.clientPMContact} onChange={(e) => updateChecklist('clientPMContact', e.target.value)} placeholder="Phone: +966..., Email: ..., WhatsApp: ..." className="text-sm" rows={2} />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Are there any specific client requirements or preferences?</Label>
                <div className="flex gap-4">
                  {(['yes', 'no', 'na'] as ChecklistAnswer[]).map(opt => (
                    <label key={opt} className="flex items-center gap-1.5 cursor-pointer text-sm">
                      <input type="radio" name="specificClientRequirements" value={opt ?? ''} checked={checklistData.specificClientRequirements === opt}
                        onChange={() => updateChecklist('specificClientRequirements', opt)} className="w-4 h-4" />
                      {opt === 'yes' ? 'Yes' : opt === 'no' ? 'No' : 'N/A'}
                    </label>
                  ))}
                </div>
                {checklistData.specificClientRequirements === 'yes' && (
                  <Input value={checklistData.clientRequirementsNotify} onChange={(e) => updateChecklist('clientRequirementsNotify', e.target.value)}
                    placeholder="Notify: who should be informed?" className="text-sm mt-1" />
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Communication Protocols (email only, matrix, etc.)</Label>
                <Input value={checklistData.communicationProtocols} onChange={(e) => updateChecklist('communicationProtocols', e.target.value)} placeholder="e.g., Email only, formal communication matrix" className="text-sm" />
              </div>
            </CardContent>
          </Card>

          {/* Section 6: Timeline */}
          <Card className="border-amber-200">
            <CardHeader className="bg-amber-50 rounded-t-lg pb-3">
              <CardTitle className="text-amber-800 text-base">6. Timeline and Deadlines</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">What are the project&apos;s critical deadlines?</Label>
                <Textarea value={checklistData.criticalDeadlines} onChange={(e) => updateChecklist('criticalDeadlines', e.target.value)} placeholder="List critical dates and milestones" className="text-sm" rows={2} />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Is there a preliminary project schedule?</Label>
                <div className="flex gap-4">
                  {(['yes', 'no', 'na'] as ChecklistAnswer[]).map(opt => (
                    <label key={opt} className="flex items-center gap-1.5 cursor-pointer text-sm">
                      <input type="radio" name="preliminaryScheduleAvailable" value={opt ?? ''} checked={checklistData.preliminaryScheduleAvailable === opt}
                        onChange={() => updateChecklist('preliminaryScheduleAvailable', opt)} className="w-4 h-4" />
                      {opt === 'yes' ? 'Yes' : opt === 'no' ? 'No' : 'N/A'}
                    </label>
                  ))}
                </div>
                {checklistData.preliminaryScheduleAvailable === 'yes' && (
                  <Input value={checklistData.scheduleNotify} onChange={(e) => updateChecklist('scheduleNotify', e.target.value)}
                    placeholder="Notify: who should be informed?" className="text-sm mt-1" />
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Project Priority</Label>
                <Input value={checklistData.projectPriority} onChange={(e) => updateChecklist('projectPriority', e.target.value)} placeholder="e.g., High, Medium, Low" className="text-sm" />
              </div>
            </CardContent>
          </Card>

          {/* Section 7: Design & Technical */}
          <Card className="border-indigo-200">
            <CardHeader className="bg-indigo-50 rounded-t-lg pb-3">
              <CardTitle className="text-indigo-800 text-base">7. Design and Technical Requirements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              {[
                { field: 'ifcAvailable' as const, notifyField: 'ifcNotify' as const, label: 'IFC available?' },
                { field: 'contractRequirementsForDesign' as const, notifyField: 'contractRequirementsNotify' as const, label: 'Did you include any requirements in the contract that the design or procurement team should be aware of before starting?' },
                { field: 'pendingApprovalsFromSales' as const, notifyField: 'salesApprovalsNotify' as const, label: 'Any pending approvals or clarifications from the sales team?' },
              ].map(({ field, notifyField, label }) => (
                <div key={field} className="space-y-2">
                  <Label className="text-sm font-medium">{label}</Label>
                  <div className="flex gap-4">
                    {(['yes', 'no', 'na'] as ChecklistAnswer[]).map(opt => (
                      <label key={opt} className="flex items-center gap-1.5 cursor-pointer text-sm">
                        <input type="radio" name={field} value={opt ?? ''} checked={checklistData[field] === opt}
                          onChange={() => updateChecklist(field, opt)} className="w-4 h-4" />
                        {opt === 'yes' ? 'Yes' : opt === 'no' ? 'No' : 'N/A'}
                      </label>
                    ))}
                  </div>
                  {checklistData[field] === 'yes' && (
                    <Input value={checklistData[notifyField]} onChange={(e) => updateChecklist(notifyField, e.target.value)}
                      placeholder="Notify: who should be informed?" className="text-sm mt-1" />
                  )}
                </div>
              ))}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Design Status</Label>
                <Input value={checklistData.designStatus} onChange={(e) => updateChecklist('designStatus', e.target.value)} placeholder="e.g., Verification, new design, design ready" className="text-sm" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Have you provided/handed any preliminary documents to the client?</Label>
                <div className="flex gap-4">
                  {(['yes', 'no', 'na'] as ChecklistAnswer[]).map(opt => (
                    <label key={opt} className="flex items-center gap-1.5 cursor-pointer text-sm">
                      <input type="radio" name="preliminaryDocsProvided" value={opt ?? ''} checked={checklistData.preliminaryDocsProvided === opt}
                        onChange={() => updateChecklist('preliminaryDocsProvided', opt)} className="w-4 h-4" />
                      {opt === 'yes' ? 'Yes' : opt === 'no' ? 'No' : 'N/A'}
                    </label>
                  ))}
                </div>
                {checklistData.preliminaryDocsProvided === 'yes' && (
                  <div className="space-y-1 mt-1">
                    <Input value={checklistData.preliminaryDocsDetails} onChange={(e) => updateChecklist('preliminaryDocsDetails', e.target.value)}
                      placeholder="List files provided" className="text-sm" />
                    <Input value={checklistData.preliminaryDocsNotify} onChange={(e) => updateChecklist('preliminaryDocsNotify', e.target.value)}
                      placeholder="Notify: who should be informed?" className="text-sm" />
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Any additional documents requested by the client?</Label>
                <Input value={checklistData.additionalDocsRequested} onChange={(e) => updateChecklist('additionalDocsRequested', e.target.value)} placeholder="List requested documents" className="text-sm" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Unresolved client discussions or negotiations</Label>
                <Textarea value={checklistData.unresolvedClientDiscussions} onChange={(e) => updateChecklist('unresolvedClientDiscussions', e.target.value)} placeholder="Describe any open items" className="text-sm" rows={2} />
              </div>
              {structureType === 'PEB' && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">PEB Welding Type</Label>
                  <select value={checklistData.pebWeldingType} onChange={(e) => updateChecklist('pebWeldingType', e.target.value)}
                    className="w-full h-10 px-3 rounded-md border bg-background text-sm">
                    <option value="">Select welding type</option>
                    <option value="single">Single Side Welding</option>
                    <option value="double">Double Side Welding</option>
                  </select>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section 8: Site Responsibilities (conditional on erection scope) */}
          {hasErectionScope && (
            <Card className="border-red-200">
              <CardHeader className="bg-red-50 rounded-t-lg pb-3">
                <CardTitle className="text-red-800 text-base">8. Site Responsibilities</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Type of test at site (pull out test, etc.)?</Label>
                  <Input value={checklistData.siteTestTypes} onChange={(e) => updateChecklist('siteTestTypes', e.target.value)} placeholder="e.g., Pull out test, torque test" className="text-sm" />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Step 9: Technical Specs */}
      {currentStep === 9 && (
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

      {/* Step 10: Review */}
      {currentStep === 10 && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Review Project Details</CardTitle>
              <p className="text-sm text-muted-foreground">
                Review everything before {isActiveEdit ? 'updating' : 'creating'} the project.
                Click any step circle above to go back and make changes.
              </p>
            </CardHeader>
          </Card>

          {/* Project Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-blue-700">1. Project Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div><span className="text-muted-foreground">Number:</span> <span className="font-medium">{projectNumber || '—'}</span></div>
              <div><span className="text-muted-foreground">Name:</span> <span className="font-medium">{projectName || '—'}</span></div>
              <div><span className="text-muted-foreground">Client:</span> <span className="font-medium">{clientName || '—'}</span></div>
              <div><span className="text-muted-foreground">Structure Type:</span> <span className="font-medium">{structureType || '—'}</span></div>
              <div><span className="text-muted-foreground">Location:</span> <span className="font-medium">{projectLocation || '—'}</span></div>
              <div><span className="text-muted-foreground">Contract Value:</span> <span className="font-medium">{contractValue ? `${contractValue} SAR` : '—'}</span></div>
              <div><span className="text-muted-foreground">Contract Date:</span> <span className="font-medium">{contractDate || '—'}</span></div>
              <div><span className="text-muted-foreground">Tonnage:</span> <span className="font-medium">{contractualTonnage ? `${contractualTonnage} t` : '—'}</span></div>
            </CardContent>
          </Card>

          {/* Buildings */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-blue-700">2. Buildings ({buildings.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {buildings.length === 0 ? (
                <p className="text-sm text-muted-foreground">No buildings added.</p>
              ) : (
                <div className="space-y-1">
                  {buildings.map((b) => (
                    <div key={b.id} className="flex items-center gap-3 text-sm py-1 border-b last:border-0">
                      <span className="font-mono text-xs bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded text-blue-700">{b.designation}</span>
                      <span className="font-medium">{b.name}</span>
                      {b.weight && <span className="text-muted-foreground ml-auto">{b.weight} t</span>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Scope Definition */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-blue-700">3 & 4. Scope & Activities</CardTitle>
            </CardHeader>
            <CardContent>
              {scopeDefinitions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No scope definitions added.</p>
              ) : (
                <div className="space-y-3">
                  {buildings.map((b) => {
                    const bScopes = scopeDefinitions.filter(s => s.buildingId === b.id);
                    if (bScopes.length === 0) return null;
                    return (
                      <div key={b.id}>
                        <p className="text-xs font-semibold text-muted-foreground mb-1">{b.designation} — {b.name}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {bScopes.map((s, i) => {
                            const opt = SCOPE_TYPE_OPTIONS.find(o => o.type === s.scopeType);
                            return (
                              <span key={i} className={`text-xs px-2 py-0.5 rounded-full border font-medium ${opt?.color || 'bg-gray-100 text-gray-700 border-gray-300'}`}>
                                {opt?.label || s.scopeType}{s.quantity ? ` — ${s.quantity} ${s.unit || ''}` : ''}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Duration */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-blue-700">5. Stage Durations</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-4 text-sm">
              {stageDurations.map((s) => (
                <div key={s.stage} className="text-center p-3 bg-muted/40 rounded-lg">
                  <p className="font-medium">{s.label}</p>
                  <p className="text-muted-foreground text-xs mt-1">
                    {s.durationWeeksMin}–{s.durationWeeksMax} weeks
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Coating */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-blue-700">6. Coating Systems ({coatingSystems.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {coatingSystems.length === 0 ? (
                <p className="text-sm text-muted-foreground">No coating systems defined.</p>
              ) : (
                coatingSystems.map((cs) => (
                  <div key={cs.id} className="text-sm border rounded p-2">
                    <p className="font-medium">{cs.name || 'Unnamed system'} {cs.isGalvanized && <span className="text-xs text-amber-600">(Galvanized)</span>}</p>
                    <p className="text-xs text-muted-foreground">{cs.coats.length} coat(s): {cs.coats.map(c => c.coatName || '?').join(', ')}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Payment */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-blue-700">7. Payment Terms ({paymentTerms.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {paymentTerms.length === 0 ? (
                <p className="text-sm text-muted-foreground">No payment terms defined.</p>
              ) : (
                <div className="space-y-1 text-sm">
                  {paymentTerms.map((t, i) => (
                    <div key={t.id} className="flex items-center gap-3 py-1 border-b last:border-0">
                      <span className="w-6 text-xs text-muted-foreground">{i + 1}.</span>
                      <span className="font-medium w-12">{t.percentage}%</span>
                      <span className="text-muted-foreground">{t.description}</span>
                    </div>
                  ))}
                  <p className="text-xs text-right text-muted-foreground pt-1">
                    Total: {getTotalPaymentPercentage()}%
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tech Specs */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-blue-700">9. Technical Specifications</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center p-3 bg-muted/40 rounded-lg">
                <p className="text-xs text-muted-foreground">Cranes</p>
                <p className="font-medium mt-1">{cranesIncluded ? 'Yes' : 'No'}</p>
              </div>
              <div className="text-center p-3 bg-muted/40 rounded-lg">
                <p className="text-xs text-muted-foreground">Surveyor</p>
                <p className="font-medium mt-1">{surveyorIncluded ? 'Yes' : 'No'}</p>
              </div>
              <div className="text-center p-3 bg-muted/40 rounded-lg">
                <p className="text-xs text-muted-foreground">3rd Party Test</p>
                <p className="font-medium mt-1">{thirdPartyRequired ? `Yes (${thirdPartyResponsibility === 'our' ? 'Our scope' : 'Client scope'})` : 'No'}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Navigation Buttons (bottom) */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={prevStep} disabled={currentStep === 1}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Previous
        </Button>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleSaveAsDraft}
            disabled={loading || (!projectNumber && !draftProjectId)}
            title={isActiveEdit ? 'Save changes' : 'Save current progress as draft'}
          >
            {isActiveEdit ? 'Save Changes' : 'Save as Draft'}
          </Button>
          {currentStep < TOTAL_STEPS ? (
            <Button onClick={nextStep}>
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? (isActiveEdit ? 'Updating...' : 'Creating...') : (isActiveEdit ? 'Update Project' : 'Create Project')}
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
            if (isActiveEdit && draftProjectId) {
              router.push(`/projects/${draftProjectId}`);
            } else {
              router.push('/projects');
            }
          }
        }}
      />
    </div>
  );
}
