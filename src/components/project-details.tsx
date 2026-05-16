'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EntityTimeline } from '@/components/events/EntityTimeline';
import {
  ArrowLeft,
  Edit,
  Building2,
  Calendar,
  DollarSign,
  FileText,
  Settings,
  ChevronDown,
  ChevronRight,
  Plus,
  Clock,
  Trash2,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  Pencil,
  X,
  Save,
  CheckCircle2,
  Circle,
  ShieldCheck,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAlert } from '@/hooks/useAlert';
import { cn } from '@/lib/utils';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';

const statusColors = {
  Draft: 'bg-gray-100 text-gray-800 border-gray-300',
  Active: 'bg-blue-100 text-blue-800 border-blue-300',
  Completed: 'bg-green-100 text-green-800 border-green-300',
  'On Hold': 'bg-yellow-100 text-yellow-800 border-yellow-300',
  Cancelled: 'bg-red-100 text-red-800 border-red-300',
};

// Common RAL color mappings
const ralColors: Record<string, string> = {
  '1000': '#BEBD7F', '1001': '#C2B078', '1002': '#C6A664', '1003': '#E5BE01',
  '1004': '#CDA434', '1005': '#A98307', '1006': '#E4A010', '1007': '#DC9D00',
  '1011': '#8A6642', '1012': '#C7B446', '1013': '#EAE6CA', '1014': '#E1CC4F',
  '1015': '#E6D690', '1016': '#EDFF21', '1017': '#F5D033', '1018': '#F8F32B',
  '1019': '#9E9764', '1020': '#999950', '1021': '#F3DA0B', '1023': '#FAD201',
  '1024': '#AEA04B', '1027': '#9D9101', '1028': '#F4A900', '1032': '#D6AE01',
  '1033': '#F3A505', '1034': '#EFA94A', '1035': '#6A5D4D', '1036': '#705335',
  '1037': '#F39F18', '2000': '#ED760E', '2001': '#C93C20', '2002': '#CB2821',
  '2003': '#FF7514', '2004': '#F44611', '2008': '#F75E25', '2009': '#F54021',
  '2010': '#D84B20', '2011': '#EC7C26', '2012': '#E55137', '3000': '#AF2B1E',
  '3001': '#A52019', '3002': '#A2231D', '3003': '#9B111E', '3004': '#75151E',
  '3005': '#5E2129', '3007': '#412227', '3009': '#642424', '3011': '#781F19',
  '3012': '#C1876B', '3013': '#A12312', '3014': '#D36E70', '3015': '#EA899A',
  '3016': '#B32821', '3017': '#E63244', '3018': '#D53032', '3020': '#CC0605',
  '3022': '#D95030', '3027': '#C51D34', '3031': '#B32428', '4001': '#6D3F5B',
  '4002': '#922B3E', '4003': '#DE4C8A', '4004': '#641C34', '4005': '#6C4675',
  '4006': '#A03472', '4007': '#4A192C', '4008': '#924E7D', '4009': '#A18594',
  '5000': '#354D73', '5001': '#1F3438', '5002': '#20214F', '5003': '#1D1E33',
  '5004': '#18171C', '5005': '#1E2460', '5007': '#3E5F8A', '5008': '#26252D',
  '5009': '#025669', '5010': '#0E294B', '5011': '#231A24', '5012': '#3B83BD',
  '5013': '#1E213D', '5014': '#606E8C', '5015': '#2271B3', '5017': '#063971',
  '5018': '#3F888F', '5019': '#1B5583', '5020': '#1D334A', '5021': '#256D7B',
  '5022': '#252850', '5023': '#49678D', '5024': '#5D9B9B', '6000': '#316650',
  '6001': '#287233', '6002': '#2D572C', '6003': '#424632', '6004': '#1F3A3D',
  '6005': '#2F4538', '6006': '#3E3B32', '6007': '#343B29', '6008': '#39352A',
  '6009': '#31372B', '6010': '#35682D', '6011': '#587246', '6012': '#343E40',
  '6013': '#6C7156', '6014': '#47402E', '6015': '#3B3C36', '6016': '#1E5945',
  '6017': '#4C9141', '6018': '#57A639', '6019': '#BDECB6', '6020': '#2E3A23',
  '6021': '#89AC76', '6022': '#25221B', '6024': '#308446', '6025': '#3D642D',
  '6026': '#015D52', '6027': '#84C3BE', '6028': '#2C5545', '6029': '#20603D',
  '6032': '#317F43', '6033': '#497E76', '6034': '#7FB5B5', '7000': '#78858B',
  '7001': '#8A9597', '7002': '#7E7B52', '7003': '#6C7059', '7004': '#969992',
  '7005': '#646B63', '7006': '#6D6552', '7008': '#6A5F31', '7009': '#4D5645',
  '7010': '#4C514A', '7011': '#434B4D', '7012': '#4E5754', '7013': '#464531',
  '7015': '#434750', '7016': '#293133', '7021': '#23282B', '7022': '#332F2C',
  '7023': '#686C5E', '7024': '#474A51', '7026': '#2F353B', '7030': '#8B8C7A',
  '7031': '#474B4E', '7032': '#B8B799', '7033': '#7D8471', '7034': '#8F8B66',
  '7035': '#D7D7D7', '7036': '#7F7679', '7037': '#7D7F7D', '7038': '#B5B8B1',
  '7039': '#6C6960', '7040': '#9DA1AA', '7042': '#8D948D', '7043': '#4E5452',
  '7044': '#CAC4B0', '7045': '#909090', '7046': '#82898F', '7047': '#D0D0D0',
  '8000': '#826C34', '8001': '#955F20', '8002': '#6C3B2A', '8003': '#734222',
  '8004': '#8E402A', '8007': '#59351F', '8008': '#6F4F28', '8011': '#5B3A29',
  '8012': '#592321', '8014': '#382C1E', '8015': '#633A34', '8016': '#4C2F27',
  '8017': '#45322E', '8019': '#403A3A', '8022': '#212121', '8023': '#A65E2E',
  '8024': '#79553D', '8025': '#755C48', '8028': '#4E3B31', '9001': '#FDF4E3',
  '9002': '#E7EBDA', '9003': '#F4F4F4', '9004': '#282828', '9005': '#0A0A0A',
  '9006': '#A5A5A5', '9007': '#8F8F8F', '9010': '#FFFFFF', '9011': '#1C1C1C',
  '9016': '#F6F6F6', '9017': '#1E1E1E', '9018': '#D7D7D7',
};

// RAL color names
const ralColorNames: Record<string, string> = {
  '1000': 'Green Beige', '1001': 'Beige', '1002': 'Sand Yellow', '1003': 'Signal Yellow',
  '1004': 'Golden Yellow', '1005': 'Honey Yellow', '1006': 'Maize Yellow', '1007': 'Daffodil Yellow',
  '1011': 'Brown Beige', '1012': 'Lemon Yellow', '1013': 'Oyster White', '1014': 'Ivory',
  '1015': 'Light Ivory', '1016': 'Sulfur Yellow', '1017': 'Saffron Yellow', '1018': 'Zinc Yellow',
  '1019': 'Grey Beige', '1020': 'Olive Yellow', '1021': 'Colza Yellow', '1023': 'Traffic Yellow',
  '1024': 'Ochre Yellow', '1027': 'Curry', '1028': 'Melon Yellow', '1032': 'Broom Yellow',
  '1033': 'Dahlia Yellow', '1034': 'Pastel Yellow', '1035': 'Pearl Beige', '1036': 'Pearl Gold',
  '1037': 'Sun Yellow', '2000': 'Yellow Orange', '2001': 'Red Orange', '2002': 'Vermilion',
  '2003': 'Pastel Orange', '2004': 'Pure Orange', '2008': 'Bright Red Orange', '2009': 'Traffic Orange',
  '2010': 'Signal Orange', '2011': 'Deep Orange', '2012': 'Salmon Orange', '3000': 'Flame Red',
  '3001': 'Signal Red', '3002': 'Carmine Red', '3003': 'Ruby Red', '3004': 'Purple Red',
  '3005': 'Wine Red', '3007': 'Black Red', '3009': 'Oxide Red', '3011': 'Brown Red',
  '3012': 'Beige Red', '3013': 'Tomato Red', '3014': 'Antique Pink', '3015': 'Light Pink',
  '3016': 'Coral Red', '3017': 'Rose', '3018': 'Strawberry Red', '3020': 'Traffic Red',
  '3022': 'Salmon Pink', '3027': 'Raspberry Red', '3031': 'Orient Red', '4001': 'Red Lilac',
  '4002': 'Red Violet', '4003': 'Heather Violet', '4004': 'Claret Violet', '4005': 'Blue Lilac',
  '4006': 'Traffic Purple', '4007': 'Purple Violet', '4008': 'Signal Violet', '4009': 'Pastel Violet',
  '5000': 'Violet Blue', '5001': 'Green Blue', '5002': 'Ultramarine Blue', '5003': 'Sapphire Blue',
  '5004': 'Black Blue', '5005': 'Signal Blue', '5007': 'Brillant Blue', '5008': 'Grey Blue',
  '5009': 'Azure Blue', '5010': 'Gentian Blue', '5011': 'Steel Blue', '5012': 'Light Blue',
  '5013': 'Cobalt Blue', '5014': 'Pigeon Blue', '5015': 'Sky Blue', '5017': 'Traffic Blue',
  '5018': 'Turquoise Blue', '5019': 'Capri Blue', '5020': 'Ocean Blue', '5021': 'Water Blue',
  '5022': 'Night Blue', '5023': 'Distant Blue', '5024': 'Pastel Blue', '6000': 'Patina Green',
  '6001': 'Emerald Green', '6002': 'Leaf Green', '6003': 'Olive Green', '6004': 'Blue Green',
  '6005': 'Moss Green', '6006': 'Grey Olive', '6007': 'Bottle Green', '6008': 'Brown Green',
  '6009': 'Fir Green', '6010': 'Grass Green', '6011': 'Reseda Green', '6012': 'Black Green',
  '6013': 'Reed Green', '6014': 'Yellow Olive', '6015': 'Black Olive', '6016': 'Turquoise Green',
  '6017': 'May Green', '6018': 'Yellow Green', '6019': 'Pastel Green', '6020': 'Chrome Green',
  '6021': 'Pale Green', '6022': 'Olive Drab', '6024': 'Traffic Green', '6025': 'Fern Green',
  '6026': 'Opal Green', '6027': 'Light Green', '6028': 'Pine Green', '6029': 'Mint Green',
  '6032': 'Signal Green', '6033': 'Mint Turquoise', '6034': 'Pastel Turquoise', '7000': 'Squirrel Grey',
  '7001': 'Silver Grey', '7002': 'Olive Grey', '7003': 'Moss Grey', '7004': 'Signal Grey',
  '7005': 'Mouse Grey', '7006': 'Beige Grey', '7008': 'Khaki Grey', '7009': 'Green Grey',
  '7010': 'Tarpaulin Grey', '7011': 'Iron Grey', '7012': 'Basalt Grey', '7013': 'Brown Grey',
  '7015': 'Slate Grey', '7016': 'Anthracite Grey', '7021': 'Black Grey', '7022': 'Umbra Grey',
  '7023': 'Concrete Grey', '7024': 'Graphite Grey', '7026': 'Granite Grey', '7030': 'Stone Grey',
  '7031': 'Blue Grey', '7032': 'Pebble Grey', '7033': 'Cement Grey', '7034': 'Yellow Grey',
  '7035': 'Light Grey', '7036': 'Platinum Grey', '7037': 'Dusty Grey', '7038': 'Agate Grey',
  '7039': 'Quartz Grey', '7040': 'Window Grey', '7042': 'Traffic Grey A', '7043': 'Traffic Grey B',
  '7044': 'Silk Grey', '7045': 'Telegrey 1', '7046': 'Telegrey 2', '7047': 'Telegrey 4',
  '8000': 'Green Brown', '8001': 'Ochre Brown', '8002': 'Signal Brown', '8003': 'Clay Brown',
  '8004': 'Copper Brown', '8007': 'Fawn Brown', '8008': 'Olive Brown', '8011': 'Nut Brown',
  '8012': 'Red Brown', '8014': 'Sepia Brown', '8015': 'Chestnut Brown', '8016': 'Mahogany Brown',
  '8017': 'Chocolate Brown', '8019': 'Grey Brown', '8022': 'Black Brown', '8023': 'Orange Brown',
  '8024': 'Beige Brown', '8025': 'Pale Brown', '8028': 'Terra Brown', '9001': 'Cream',
  '9002': 'Grey White', '9003': 'Signal White', '9004': 'Signal Black', '9005': 'Jet Black',
  '9006': 'White Aluminium', '9007': 'Grey Aluminium', '9010': 'Pure White', '9011': 'Graphite Black',
  '9016': 'Traffic White', '9017': 'Traffic Black', '9018': 'Papyrus White',
};

function getRalColor(ralNumber: string): string {
  // Remove any non-numeric characters and get the RAL number
  const cleanRal = ralNumber.replace(/[^0-9]/g, '');
  return ralColors[cleanRal] || '#CCCCCC'; // Default to gray if not found
}

function getRalColorName(ralNumber: string): string {
  const cleanRal = ralNumber.replace(/[^0-9]/g, '');
  return ralColorNames[cleanRal] || 'Unknown Color';
}

function CollapsibleSection({ 
  title, 
  icon: Icon, 
  children, 
  defaultOpen = false 
}: { 
  title: string; 
  icon: any; 
  children: React.ReactNode; 
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Card>
      <CardHeader 
        className="cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="size-5 text-primary" />
            <CardTitle className="text-lg">{title}</CardTitle>
          </div>
          {isOpen ? <ChevronDown className="size-5" /> : <ChevronRight className="size-5" />}
        </div>
      </CardHeader>
      {isOpen && <CardContent>{children}</CardContent>}
    </Card>
  );
}

function InfoRow({ label, value }: { label: string; value: any }) {
  if (!value && value !== 0 && value !== false) return null;
  
  return (
    <div className="grid grid-cols-3 gap-4 py-2 border-b last:border-0">
      <dt className="font-medium text-muted-foreground">{label}</dt>
      <dd className="col-span-2">{typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value}</dd>
    </div>
  );
}

// ── Inline scope editor ────────────────────────────────────────────────────
function ScopeEditRow({ scope, onSaved }: { scope: any; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [quantity, setQuantity] = useState(scope.quantity ?? '');
  const [unit, setUnit] = useState(scope.unit ?? (scope.scopeType === 'steel' ? 'ton' : 'm²'));
  const [ralColor, setRalColor] = useState(scope.ralColor ?? '');
  const [specification, setSpecification] = useState(scope.specification ?? '');

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/scope-of-work/${scope.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: quantity ? Number(quantity) : null, unit: unit || null, ralColor: ralColor || null, specification: specification || null }),
      });
      if (res.ok) { setEditing(false); onSaved(); }
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        title="Edit scope"
      >
        <Pencil className="w-3.5 h-3.5" />
      </button>
    );
  }

  return (
    <div className="mt-3 p-3 border rounded-lg bg-muted/30 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Quantity</Label>
          <Input type="number" step="0.01" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="h-8 text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Unit</Label>
          <Input value={unit} onChange={(e) => setUnit(e.target.value)} className="h-8 text-sm" placeholder="ton / m²" />
        </div>
        {(scope.scopeType === 'roof_sheeting' || scope.scopeType === 'wall_sheeting') && (
          <div className="space-y-1">
            <Label className="text-xs">RAL Color</Label>
            <Input value={ralColor} onChange={(e) => setRalColor(e.target.value)} className="h-8 text-sm" placeholder="e.g. 9002" />
          </div>
        )}
        <div className="col-span-2 space-y-1">
          <Label className="text-xs">Specification / Notes</Label>
          <Input value={specification} onChange={(e) => setSpecification(e.target.value)} className="h-8 text-sm" />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={saving} className="h-7 text-xs">
          <X className="w-3 h-3 mr-1" /> Cancel
        </Button>
        <Button size="sm" onClick={save} disabled={saving} className="h-7 text-xs">
          <Save className="w-3 h-3 mr-1" /> {saving ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </div>
  );
}

// ── Project Validation Panel ──────────────────────────────────────────────

type ValidationData = {
  salesValidatedById: string | null;
  salesValidatedAt: string | null;
  salesValidatedBy: { id: string; name: string } | null;
  projectsValidatedById: string | null;
  projectsValidatedAt: string | null;
  projectsValidatedBy: { id: string; name: string } | null;
  operationsValidatedById: string | null;
  operationsValidatedAt: string | null;
  operationsValidatedBy: { id: string; name: string } | null;
} | null;

type ValidationParty = 'sales' | 'projects' | 'operations';

function ValidationCircle({
  label,
  validatedBy,
  validatedAt,
  canValidate,
  onValidate,
  submitting,
}: {
  label: string;
  validatedBy: { id: string; name: string } | null;
  validatedAt: string | null;
  canValidate: boolean;
  onValidate: () => void;
  submitting: boolean;
}) {
  const isValidated = !!validatedBy;

  return (
    <div className="flex flex-col items-center gap-2 min-w-[100px]">
      {isValidated ? (
        <div className="relative">
          <CheckCircle2 className="size-12 text-emerald-500 fill-emerald-50" />
        </div>
      ) : (
        <Circle className="size-12 text-slate-300" />
      )}
      <div className="text-center">
        <p className="text-xs font-semibold text-slate-700">{label}</p>
        {isValidated ? (
          <>
            <p className="text-xs text-emerald-600 font-medium">{validatedBy.name}</p>
            {validatedAt && (
              <p className="text-xs text-slate-400">
                {new Date(validatedAt).toLocaleDateString('en-SA-u-ca-gregory', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
            )}
          </>
        ) : (
          <p className="text-xs text-slate-400">Pending</p>
        )}
      </div>
      {canValidate && !isValidated && (
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50"
          onClick={onValidate}
          disabled={submitting}
        >
          {submitting ? 'Saving…' : 'Verify'}
        </Button>
      )}
    </div>
  );
}

function ProjectValidationPanel({
  projectId,
  salesEngineerId,
  projectManagerId,
  operationsManagerId,
  currentUserId,
  isAdminOrCeo,
  initialValidation,
}: {
  projectId: string;
  salesEngineerId: string | null;
  projectManagerId: string;
  operationsManagerId: string | null;
  currentUserId: string;
  isAdminOrCeo: boolean;
  initialValidation: ValidationData;
}) {
  const [validation, setValidation] = useState<ValidationData>(initialValidation);
  const [submitting, setSubmitting] = useState<ValidationParty | null>(null);

  const canValidateParty = useCallback(
    (party: ValidationParty) => {
      if (isAdminOrCeo) return true;
      if (party === 'sales') return currentUserId === salesEngineerId;
      if (party === 'projects') return currentUserId === projectManagerId;
      if (party === 'operations') return currentUserId === operationsManagerId;
      return false;
    },
    [isAdminOrCeo, currentUserId, salesEngineerId, projectManagerId, operationsManagerId]
  );

  const handleValidate = async (party: ValidationParty) => {
    setSubmitting(party);
    try {
      const res = await fetch(`/api/projects/${projectId}/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ party }),
      });
      if (res.ok) {
        const updated = await res.json();
        setValidation(updated);
      }
    } finally {
      setSubmitting(null);
    }
  };

  const allValidated =
    !!validation?.salesValidatedById &&
    !!validation?.projectsValidatedById &&
    !!validation?.operationsValidatedById;

  return (
    <Card className={cn('border', allValidated ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-200')}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className={cn('size-5', allValidated ? 'text-emerald-500' : 'text-slate-400')} />
          <CardTitle className="text-base">Data Validation & Verification</CardTitle>
          {allValidated && (
            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-xs ml-auto">
              Fully Verified
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Each responsible party must confirm that the project data entered is correct before execution.
        </p>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap justify-around gap-6">
          <ValidationCircle
            label="Sales"
            validatedBy={validation?.salesValidatedBy ?? null}
            validatedAt={validation?.salesValidatedAt ?? null}
            canValidate={canValidateParty('sales')}
            onValidate={() => handleValidate('sales')}
            submitting={submitting === 'sales'}
          />
          <ValidationCircle
            label="Projects"
            validatedBy={validation?.projectsValidatedBy ?? null}
            validatedAt={validation?.projectsValidatedAt ?? null}
            canValidate={canValidateParty('projects')}
            onValidate={() => handleValidate('projects')}
            submitting={submitting === 'projects'}
          />
          <ValidationCircle
            label="Operations"
            validatedBy={validation?.operationsValidatedBy ?? null}
            validatedAt={validation?.operationsValidatedAt ?? null}
            canValidate={canValidateParty('operations')}
            onValidate={() => handleValidate('operations')}
            submitting={submitting === 'operations'}
          />
        </div>
      </CardContent>
    </Card>
  );
}

type ProjectDetailsProps = {
  project: any;
  restrictedModules?: string[];
  currentUserId?: string;
  isAdminOrCeo?: boolean;
};

export function ProjectDetails({ project, restrictedModules = [], currentUserId = '', isAdminOrCeo = false }: ProjectDetailsProps) {
  const router = useRouter();
  const { showAlert, AlertDialog } = useAlert();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [navigation, setNavigation] = useState<{ previousId: string | null; nextId: string | null }>({ previousId: null, nextId: null });
  const [isLoadingNav, setIsLoadingNav] = useState(true);
  
  // Check if financial data should be hidden
  const hideFinancialData = restrictedModules.includes('financial_contracts') || restrictedModules.includes('financial_reports');

  useEffect(() => {
    const fetchNavigation = async () => {
      try {
        const response = await fetch(`/api/projects/${project.id}/navigation`);
        if (response.ok) {
          const data = await response.json();
          setNavigation(data);
        }
      } catch (error) {
        console.error('Failed to fetch navigation:', error);
      } finally {
        setIsLoadingNav(false);
      }
    };
    fetchNavigation();
  }, [project.id]);

  const formatDate = (date: string | null) => {
    if (!date) return null;
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${day}-${month}-${year}`;
  };

  const formatCurrency = (amount: number | null, includeCurrency: boolean = true) => {
    if (!amount) return null;
    const formatted = new Intl.NumberFormat('en-SA', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
    return includeCurrency ? `${formatted} ﷼` : formatted;
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        router.push('/projects');
      } else {
        const error = await response.json();
        showAlert(error.message || 'Failed to delete project', { type: 'error' });
      }
    } catch (error) {
      showAlert('Failed to delete project. Please try again.', { type: 'error' });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <main className="min-h-screen bg-background">
      {/* ── Hero Banner ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 text-white">
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: 'repeating-linear-gradient(45deg,#fff 0,#fff 1px,transparent 0,transparent 50%)', backgroundSize: '20px 20px' }} />
        <div className="absolute -top-10 -right-10 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-48 h-48 bg-white/5 rounded-full blur-3xl" />
        <div className="relative container mx-auto px-6 lg:px-8 pt-6 pb-8 max-lg:pt-20">
          {/* Nav row */}
          <div className="flex items-center gap-2 mb-5">
            <Link href="/projects">
              <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white hover:bg-white/10 gap-1">
                <ArrowLeft className="size-4" /> Projects
              </Button>
            </Link>
            <div className="h-4 w-px bg-white/20 mx-1" />
            <Link href={navigation.previousId ? `/projects/${navigation.previousId}` : '#'}>
              <Button variant="ghost" size="icon" className="text-slate-300 hover:text-white hover:bg-white/10 h-8 w-8" disabled={!navigation.previousId || isLoadingNav} title="Previous project">
                <ChevronLeft className="size-4" />
              </Button>
            </Link>
            <Link href={navigation.nextId ? `/projects/${navigation.nextId}` : '#'}>
              <Button variant="ghost" size="icon" className="text-slate-300 hover:text-white hover:bg-white/10 h-8 w-8" disabled={!navigation.nextId || isLoadingNav} title="Next project">
                <ChevronRightIcon className="size-4" />
              </Button>
            </Link>
          </div>

          {/* Title row */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 hidden sm:flex">
                <Building2 className="size-8 text-blue-300" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="font-mono text-sm bg-white/15 border border-white/20 px-2.5 py-0.5 rounded text-slate-200">
                    {project.projectNumber}
                  </span>
                  <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full border', statusColors[project.status as keyof typeof statusColors])}>
                    {project.status}
                  </span>
                  {project.projectNature && (
                    <span className="text-xs bg-white/10 border border-white/15 px-2 py-0.5 rounded text-slate-300">{project.projectNature}</span>
                  )}
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{project.name}</h1>
                <p className="text-slate-400 mt-1 text-sm">
                  {project.client.name} <span className="text-slate-600 mx-1">·</span> {project.projectManager.name}
                  {project.projectLocation ? <><span className="text-slate-600 mx-1">·</span> {project.projectLocation}</> : null}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href={`/projects/${project.id}/timeline`}>
                <Button variant="outline" size="sm" className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white">
                  <Clock className="size-4 mr-1" /> Timeline
                </Button>
              </Link>
              <Link href={`/projects/${project.id}/scope`}>
                <Button variant="outline" size="sm" className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white">
                  <FileText className="size-4 mr-1" /> Scope
                </Button>
              </Link>
              <Link href={`/projects/${project.id}/edit`}>
                <Button size="sm" className="bg-blue-500 hover:bg-blue-400 text-white border-0">
                  <Edit className="size-4 mr-1" /> Edit
                </Button>
              </Link>
              <Button size="sm" variant="destructive" onClick={() => setShowDeleteDialog(true)} disabled={isDeleting}>
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>

          {/* KPI chips */}
          <div className="mt-6 flex flex-wrap gap-3">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/15 rounded-xl px-4 py-2">
              <Building2 className="size-4 text-blue-300" />
              <span className="text-xs text-slate-400">Buildings</span>
              <span className="text-sm font-bold">{project._count.buildings}</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/15 rounded-xl px-4 py-2">
              <FileText className="size-4 text-slate-400" />
              <span className="text-xs text-slate-400">Tasks</span>
              <span className="text-sm font-bold">{project._count.tasks}</span>
            </div>
            {(project.contractualTonnage || project.engineeringTonnage) && (
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/15 rounded-xl px-4 py-2">
                <Settings className="size-4 text-amber-400" />
                <span className="text-xs text-slate-400">Tonnage</span>
                <span className="text-sm font-bold">
                  {project.contractualTonnage ?? project.engineeringTonnage} t
                </span>
              </div>
            )}
            {project.contractValue && !hideFinancialData && (
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/15 rounded-xl px-4 py-2">
                <DollarSign className="size-4 text-emerald-400" />
                <span className="text-xs text-slate-400">Contract Value</span>
                <span className="text-sm font-bold">{formatCurrency(project.contractValue)}</span>
              </div>
            )}
            {project.plannedStartDate && (
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/15 rounded-xl px-4 py-2">
                <Calendar className="size-4 text-slate-400" />
                <span className="text-xs text-slate-400">Start</span>
                <span className="text-sm font-bold">{formatDate(project.plannedStartDate)}</span>
              </div>
            )}
            {project.plannedEndDate && (
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/15 rounded-xl px-4 py-2">
                <Calendar className="size-4 text-slate-400" />
                <span className="text-xs text-slate-400">End</span>
                <span className="text-sm font-bold">{formatDate(project.plannedEndDate)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto p-6 lg:p-8 space-y-6 max-lg:pt-6">

        {/* Validation Panel */}
        <ProjectValidationPanel
          projectId={project.id}
          salesEngineerId={project.salesEngineerId ?? null}
          projectManagerId={project.projectManagerId}
          operationsManagerId={project.operationsManagerId ?? null}
          currentUserId={currentUserId}
          isAdminOrCeo={isAdminOrCeo}
          initialValidation={project.validation ?? null}
        />

        {/* Collapsible Sections */}
        <div className="space-y-4">
          {/* Basic Information */}
          <CollapsibleSection title="Basic Information" icon={FileText} defaultOpen>
            <dl className="space-y-0">
              <InfoRow label="Project Number" value={project.projectNumber} />
              <InfoRow label="Estimation Number" value={project.estimationNumber} />
              <InfoRow label="Project Name" value={project.name} />
              <InfoRow label="Client" value={project.client.name} />
              <InfoRow label="Project Manager" value={`${project.projectManager.name}${project.projectManager.position ? ` (${project.projectManager.position})` : ''}`} />
              {project.salesEngineer && (
                <InfoRow label="Sales Engineer" value={project.salesEngineer.name} />
              )}
              {project.operationsManager && (
                <InfoRow label="Operations Manager" value={project.operationsManager.name} />
              )}
              <InfoRow label="Project Location" value={project.projectLocation} />
              <InfoRow label="Project Nature" value={project.projectNature} />
              <InfoRow label="Structure Type" value={project.structureType} />
              <InfoRow label="Number of Structures" value={project.numberOfStructures} />
              {project.scopeOfWork && (
                <div className="py-2">
                  <dt className="font-medium text-muted-foreground mb-2">Scope of Work</dt>
                  <dd className="whitespace-pre-wrap">{project.scopeOfWork}</dd>
                </div>
              )}
            </dl>
          </CollapsibleSection>

          {/* Dates & Durations */}
          <CollapsibleSection title="Dates & Durations" icon={Calendar} defaultOpen>
            <dl className="space-y-0">
              <InfoRow label="Contract Date" value={formatDate(project.contractDate)} />
              <InfoRow label="Down Payment Date" value={formatDate(project.downPaymentDate)} />
              <InfoRow label="Planned Start Date" value={formatDate(project.plannedStartDate)} />
              <InfoRow label="Planned End Date" value={formatDate(project.plannedEndDate)} />
              <InfoRow label="Actual Start Date" value={formatDate(project.actualStartDate)} />
              <InfoRow label="Actual End Date" value={formatDate(project.actualEndDate)} />
            </dl>
            
            {/* Stage Durations in Weeks */}
            {(project.engineeringWeeksMin || project.engineeringWeeksMax || 
              project.operationsWeeksMin || project.operationsWeeksMax ||
              project.siteWeeksMin || project.siteWeeksMax) && (
              <div className="mt-4 pt-4 border-t">
                <h4 className="font-semibold mb-3 text-sm text-muted-foreground">Stage Durations (weeks)</h4>
                <div className="grid grid-cols-3 gap-4">
                  {(project.engineeringWeeksMin || project.engineeringWeeksMax) && (
                    <div className="bg-blue-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                        <span className="text-sm font-medium">Engineering</span>
                      </div>
                      <p className="text-lg font-bold text-blue-700">
                        {project.engineeringWeeksMin === project.engineeringWeeksMax 
                          ? `${project.engineeringWeeksMin} weeks`
                          : `${project.engineeringWeeksMin || 0}-${project.engineeringWeeksMax || 0} weeks`}
                      </p>
                    </div>
                  )}
                  {(project.operationsWeeksMin || project.operationsWeeksMax) && (
                    <div className="bg-orange-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 rounded-full bg-orange-500" />
                        <span className="text-sm font-medium">Operations</span>
                      </div>
                      <p className="text-lg font-bold text-orange-700">
                        {project.operationsWeeksMin === project.operationsWeeksMax 
                          ? `${project.operationsWeeksMin} weeks`
                          : `${project.operationsWeeksMin || 0}-${project.operationsWeeksMax || 0} weeks`}
                      </p>
                    </div>
                  )}
                  {(project.siteWeeksMin || project.siteWeeksMax) && (
                    <div className="bg-green-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <span className="text-sm font-medium">Site</span>
                      </div>
                      <p className="text-lg font-bold text-green-700">
                        {project.siteWeeksMin === project.siteWeeksMax 
                          ? `${project.siteWeeksMin} weeks`
                          : `${project.siteWeeksMin || 0}-${project.siteWeeksMax || 0} weeks`}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Legacy Duration Fields */}
            {(project.engineeringDuration || project.fabricationDeliveryDuration || project.erectionDuration) && (
              <dl className="space-y-0 mt-4 pt-4 border-t">
                <InfoRow label="Engineering Duration" value={project.engineeringDuration ? `${project.engineeringDuration} days` : null} />
                <InfoRow label="Fabrication & Delivery Duration" value={project.fabricationDeliveryDuration ? `${project.fabricationDeliveryDuration} days` : null} />
                <InfoRow label="Erection Duration" value={project.erectionDuration ? `${project.erectionDuration} days` : null} />
              </dl>
            )}
          </CollapsibleSection>

          {/* Financial & Payment Terms - Contract value hidden for users with financial restrictions */}
          {!hideFinancialData && (
            <CollapsibleSection title="Finance" icon={DollarSign} defaultOpen>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Contract Value</p>
                    <p className="text-lg font-semibold">{formatCurrency(project.contractValue) || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Incoterm</p>
                    <p className="text-lg font-semibold">{project.incoterm || '-'}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Preliminary Retention</p>
                    <p className="font-semibold">{formatCurrency(project.preliminaryRetention) || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">H.O Retention</p>
                    <p className="font-semibold">{formatCurrency(project.hoRetention) || '-'}</p>
                  </div>
                </div>
              </div>
            </CollapsibleSection>
          )}

          {/* Payment Schedule - Always visible, only Amount column hidden for restricted users */}
          <CollapsibleSection title="Payment Schedule" icon={DollarSign} defaultOpen>
            <div className="space-y-4">
              <h4 className="font-semibold mb-3 text-red-700 bg-red-50 px-3 py-2 rounded">Payment Schedule</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Schedule</th>
                      <th className="px-3 py-2 text-left font-medium">Percentage</th>
                      {!hideFinancialData && (
                        <th className="px-3 py-2 text-left font-medium">Amount (SAR)</th>
                      )}
                      <th className="px-3 py-2 text-left font-medium">Terms</th>
                      <th className="px-3 py-2 text-left font-medium">Payment Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {/* Down Payment Row */}
                    {(project.downPaymentPercentage || project.downPayment || project.downPaymentMilestone) && 
                     Number(project.downPaymentPercentage) > 0 && (
                      <tr>
                        <td className="px-3 py-2 font-medium">Down Payment</td>
                        <td className="px-3 py-2">
                          {project.downPaymentPercentage ? `${project.downPaymentPercentage}%` : '-'}
                        </td>
                        {!hideFinancialData && (
                          <td className="px-3 py-2">
                            {formatCurrency(project.downPayment, false) || '-'}
                          </td>
                        )}
                        <td className="px-3 py-2">
                          {project.downPaymentMilestone || '-'}
                        </td>
                        <td className="px-3 py-2">{formatDate(project.downPaymentDate) || '-'}</td>
                      </tr>
                    )}
                    {/* Payment 2-6 Rows */}
                    {[2, 3, 4, 5, 6].map((num) => {
                      const percentage = (project as any)[`payment${num}Percentage`];
                      const payment = (project as any)[`payment${num}`];
                      const milestone = (project as any)[`payment${num}Milestone`];
                      // Skip if no data or percentage is 0
                      if ((!percentage && !payment && !milestone) || Number(percentage) === 0) return null;
                      
                      return (
                        <tr key={num}>
                          <td className="px-3 py-2 font-medium">Payment {num}</td>
                          <td className="px-3 py-2">{percentage ? `${percentage}%` : '-'}</td>
                          {!hideFinancialData && (
                            <td className="px-3 py-2">{formatCurrency(payment, false) || '-'}</td>
                          )}
                          <td className="px-3 py-2">{milestone || '-'}</td>
                          <td className="px-3 py-2">-</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </CollapsibleSection>

          {/* Buildings & Scope */}
          {project.buildings && project.buildings.length > 0 && (
            <CollapsibleSection title="Buildings & Scope" icon={Building2} defaultOpen>
              <div className="space-y-4">
                {project.buildings.map((building: any) => (
                  <div key={building.id} className="border rounded-xl overflow-hidden">
                    <div className="bg-muted/40 px-4 py-3 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-base">{building.designation}</span>
                        <span className="text-muted-foreground ml-2">— {building.name}</span>
                        {building.location && (
                          <span className="ml-3 text-xs text-muted-foreground bg-background border px-2 py-0.5 rounded-full">
                            📍 {building.location}
                          </span>
                        )}
                      </div>
                      {building.weight && (
                        <span className="text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                          {building.weight} ton
                        </span>
                      )}
                    </div>
                    <div className="divide-y">
                      {(building.scopeOfWorks || []).map((scope: any) => (
                        <div key={scope.id} className="px-4 py-3">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                                  scope.scopeType === 'steel' ? 'bg-blue-50 border-blue-200 text-blue-700' :
                                  scope.scopeType === 'roof_sheeting' ? 'bg-orange-50 border-orange-200 text-orange-700' :
                                  scope.scopeType === 'wall_sheeting' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                                  scope.scopeType === 'deck_panel' ? 'bg-purple-50 border-purple-200 text-purple-700' :
                                  scope.scopeType === 'metal_work' ? 'bg-gray-50 border-gray-200 text-gray-700' :
                                  'bg-green-50 border-green-200 text-green-700'
                                }`}>
                                  {scope.scopeLabel}{scope.customLabel ? ` — ${scope.customLabel}` : ''}
                                </span>
                                {scope.quantity && (
                                  <span className="text-sm font-medium">
                                    {scope.quantity} {scope.unit || (scope.scopeType === 'steel' ? 'ton' : 'm²')}
                                  </span>
                                )}
                                <ScopeEditRow scope={scope} onSaved={() => router.refresh()} />
                              </div>

                              {/* Steel */}
                              {scope.scopeType === 'steel' && scope.quantity && (
                                <div className="text-xs text-muted-foreground">
                                  Contractual steel quantity
                                </div>
                              )}

                              {/* Sandwich panels */}
                              {(scope.scopeType === 'roof_sheeting' || scope.scopeType === 'wall_sheeting') && (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1 text-xs text-muted-foreground">
                                  {scope.ralColor && (
                                    <div className="flex items-center gap-1.5">
                                      <div className="w-3 h-3 rounded-sm border" style={{ backgroundColor: getRalColor(scope.ralColor) }} />
                                      <span>RAL {scope.ralColor}</span>
                                    </div>
                                  )}
                                  {scope.panelProfile && <span>Profile: <strong className="text-foreground">{scope.panelProfile}</strong></span>}
                                  {scope.panelThickness && <span>Panel: <strong className="text-foreground">{scope.panelThickness}mm</strong></span>}
                                  {scope.ribHeight && <span>Rib: <strong className="text-foreground">{scope.ribHeight}mm</strong></span>}
                                  {scope.upperSheetThick && <span>Upper: <strong className="text-foreground">{scope.upperSheetThick}mm</strong></span>}
                                  {scope.lowerSheetThick && <span>Lower: <strong className="text-foreground">{scope.lowerSheetThick}mm</strong></span>}
                                </div>
                              )}

                              {/* Deck panel */}
                              {scope.scopeType === 'deck_panel' && (
                                <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-muted-foreground">
                                  {scope.deckProfile && <span>Profile: <strong className="text-foreground">{scope.deckProfile}</strong></span>}
                                  {scope.hasShearStuds && (
                                    <span>Shear studs: <strong className="text-foreground">{scope.shearStudQty ?? '?'} {scope.shearStudSpecs || ''}</strong></span>
                                  )}
                                </div>
                              )}

                              {/* Metal works */}
                              {scope.scopeType === 'metal_work' && scope.metalWorkItems && scope.metalWorkItems.length > 0 && (
                                <div className="text-xs space-y-0.5">
                                  {scope.metalWorkItems.map((item: any, i: number) => (
                                    <div key={i} className="flex gap-3 text-muted-foreground">
                                      <span className="font-medium text-foreground">{item.name}</span>
                                      <span>{item.quantity} {item.unit}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Activities */}
                            {scope.activities && scope.activities.length > 0 && (
                              <div className="flex flex-wrap gap-1 justify-end">
                                {scope.activities.filter((a: any) => a.isApplicable).map((a: any) => (
                                  <span key={a.activityType}
                                    className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                                    {a.activityLabel}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      {(!building.scopeOfWorks || building.scopeOfWorks.length === 0) && (
                        <div className="px-4 py-3 text-sm text-muted-foreground">No scope defined</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          )}

          {/* Technical Specifications */}
          <CollapsibleSection title="Technical Specifications" icon={Settings} defaultOpen>
            <dl className="space-y-0">
              <InfoRow label="Erection Subcontractor" value={project.erectionSubcontractor} />
              <InfoRow label="Engineering Tonnage" value={project.engineeringTonnage} />
              <InfoRow label="Cranes Included" value={project.cranesIncluded} />
              <InfoRow label="Surveyor Our Scope" value={project.surveyorOurScope} />
              <InfoRow 
                label="3rd Party Test Required" 
                value={project.thirdPartyRequired ? (
                  <span>
                    Yes - <span className={project.thirdPartyResponsibility === 'our' ? 'text-blue-600 font-medium' : 'text-orange-600 font-medium'}>
                      {project.thirdPartyResponsibility === 'our' ? 'Our Responsibility' : 'Customer Responsibility'}
                    </span>
                  </span>
                ) : 'No'} 
              />
              <InfoRow label="Galvanized" value={project.galvanized} />
              {project.galvanized && (
                <>
                  <InfoRow label="Galvanization Finish" value={project.galvanizationFinish || 'no'} />
                  <InfoRow label="Galvanization Microns" value={project.galvanizationMicrons} />
                  <InfoRow label="Area (m²)" value={project.area} />
                  <InfoRow label="m²/Ton" value={project.m2PerTon} />
                </>
              )}
              
              {/* Coating System Section */}
              <div className="border-t mt-4 pt-4">
                <h4 className="font-semibold mb-3 text-yellow-800 bg-yellow-50 px-3 py-2 rounded">Coating</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">Coat</th>
                        <th className="px-3 py-2 text-left font-medium">Paint Name</th>
                        <th className="px-3 py-2 text-left font-medium">Microns</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {(() => {
                        const coats = [1, 2, 3, 4].map((num) => ({
                          paintCoat: (project as any)[`paintCoat${num}`],
                          microns: (project as any)[`paintCoat${num}Microns`],
                          num
                        })).filter(c => c.paintCoat);
                        
                        const totalMicrons = coats.reduce((sum, c) => sum + (Number(c.microns) || 0), 0);
                        
                        return (
                          <>
                            {coats.map((coat) => (
                              <tr key={coat.num}>
                                <td className="px-3 py-2 font-medium">Coat {coat.num}</td>
                                <td className="px-3 py-2">{coat.paintCoat}</td>
                                <td className="px-3 py-2">{coat.microns || '-'}</td>
                              </tr>
                            ))}
                            {coats.length === 0 && (
                              <tr>
                                <td className="px-3 py-2 text-muted-foreground" colSpan={3}>
                                  {project.coatingSystem || 'No coating system defined'}
                                </td>
                              </tr>
                            )}
                            {coats.length > 0 && totalMicrons > 0 && (
                              <tr className="bg-blue-50 font-semibold">
                                <td className="px-3 py-2" colSpan={2}>Total Microns</td>
                                <td className="px-3 py-2 text-blue-700">{totalMicrons} μm</td>
                              </tr>
                            )}
                          </>
                        );
                      })()}
                    </tbody>
                  </table>
                </div>
                {project.topCoatRalNumber && (
                  <div className="mt-4 p-3 bg-gradient-to-r from-slate-50 to-slate-100 rounded-lg border border-slate-200">
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-700">Top Coat RAL:</span>
                          <span className="px-3 py-1 bg-white rounded-md border-2 border-slate-300 font-mono text-lg font-bold text-slate-900">
                            {project.topCoatRalNumber}
                          </span>
                        </div>
                        <span className="text-sm text-slate-600 italic ml-1">
                          {getRalColorName(project.topCoatRalNumber)}
                        </span>
                      </div>
                      <div 
                        className="w-12 h-12 rounded-md border-2 border-slate-300 shadow-sm"
                        style={{ backgroundColor: getRalColor(project.topCoatRalNumber) }}
                        title={`RAL ${project.topCoatRalNumber} - ${getRalColorName(project.topCoatRalNumber)}`}
                      />
                    </div>
                  </div>
                )}
              </div>
              <InfoRow label="Welding Process" value={project.weldingProcess} />
              <InfoRow label="Welding Wire AWS Class" value={project.weldingWireAwsClass} />
              <InfoRow label="PQR Number" value={project.pqrNumber} />
              <InfoRow label="WPS Number" value={project.wpsNumber} />
              <InfoRow label="Standard Code" value={project.standardCode} />
              <InfoRow label="NDT Test" value={project.ndtTest} />
              <InfoRow label="Applicable Codes" value={project.applicableCodes} />
            </dl>
          </CollapsibleSection>

          {/* Remarks */}
          {project.remarks && (
            <CollapsibleSection title="Remarks" icon={FileText}>
              <p className="whitespace-pre-wrap">{project.remarks}</p>
            </CollapsibleSection>
          )}
        </div>
      </div>

      {/* System Events Timeline */}
      <EntityTimeline
        entityType="Project"
        entityId={project.id}
        className="mt-6"
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete this project?"
        description="This project will be permanently deleted from your system and cannot be recovered."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDelete}
        type="danger"
      />
      <AlertDialog />
    </main>
  );
}
