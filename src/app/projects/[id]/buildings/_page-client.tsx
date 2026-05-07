'use client';

import { useState, useMemo, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Building2,
  Weight,
  Layers,
  Paintbrush,
  Ruler,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Package,
  Bolt,
  PanelTop,
  PanelLeft,
  MapPin,
  Wrench,
  Shield,
  Globe,
  Truck,
  HardHat,
  Clock,
  FlaskConical,
  FileCode,
  CalendarDays,
  LayoutGrid,
  User,
  Users,
} from 'lucide-react';

// ─── RAL Colours ────────────────────────────────────────────────────────────

const ralColors: Record<string, string> = {
  '1000': '#BEBD7F', '1001': '#C2B078', '1002': '#C6A664', '1003': '#E5BE01',
  '1004': '#CDA434', '1005': '#A98307', '1006': '#E4A010', '1007': '#DC9D00',
  '1011': '#8A6642', '1012': '#C7B446', '1013': '#EAE6CA', '1014': '#E1CC4F',
  '1015': '#E6D690', '1016': '#EDFF21', '1017': '#F5D033', '1018': '#F8F32B',
  '1019': '#9E9764', '1020': '#999950', '1021': '#F3DA0B', '1023': '#FAD201',
  '1024': '#AEA04B', '1027': '#9D9101', '1028': '#F4A900', '1032': '#D6AE01',
  '1033': '#F3A505', '1034': '#EFA94A', '1037': '#F39F18', '2000': '#ED760E',
  '2001': '#C93C20', '2002': '#CB2821', '2003': '#FF7514', '2004': '#F44611',
  '2008': '#F75E25', '2009': '#F54021', '2010': '#D84B20', '2011': '#EC7C26',
  '2012': '#E55137', '3000': '#AF2B1E', '3001': '#A52019', '3002': '#A2231D',
  '3003': '#9B111E', '3004': '#75151E', '3005': '#5E2129', '3007': '#412227',
  '3009': '#642424', '3011': '#781F19', '3012': '#C1876B', '3013': '#A12312',
  '3014': '#D36E70', '3015': '#EA899A', '3016': '#B32821', '3017': '#E63244',
  '3018': '#D53032', '3020': '#CC0605', '3022': '#D95030', '3027': '#C51D34',
  '3031': '#B32428', '4001': '#6D3F5B', '4002': '#922B3E', '4003': '#DE4C8A',
  '4004': '#641C34', '4005': '#6C4675', '4006': '#A03472', '4007': '#4A192C',
  '4008': '#924E7D', '4009': '#A18594', '5000': '#354D73', '5001': '#1F3438',
  '5002': '#20214F', '5003': '#1D1E33', '5004': '#18171C', '5005': '#1E2460',
  '5007': '#3E5F8A', '5008': '#26252D', '5009': '#025669', '5010': '#0E294B',
  '5011': '#231A24', '5012': '#3B83BD', '5013': '#1E213D', '5014': '#606E8C',
  '5015': '#2271B3', '5017': '#063971', '5018': '#3F888F', '5019': '#1B5583',
  '5020': '#1D334A', '5021': '#256D7B', '5022': '#252850', '5023': '#49678D',
  '5024': '#5D9B9B', '6000': '#316650', '6001': '#287233', '6002': '#2D572C',
  '6003': '#424632', '6004': '#1F3A3D', '6005': '#2F4538', '6006': '#3E3B32',
  '6007': '#343B29', '6008': '#39352A', '6009': '#31372B', '6010': '#35682D',
  '6011': '#587246', '6012': '#343E40', '6013': '#6C7156', '6014': '#47402E',
  '6015': '#3B3C36', '6016': '#1E5945', '6017': '#4C9141', '6018': '#57A639',
  '6019': '#BDECB6', '6020': '#2E3A23', '6021': '#89AC76', '6022': '#25221B',
  '6024': '#308446', '6025': '#3D642D', '6026': '#015D52', '6027': '#84C3BE',
  '6028': '#2C5545', '6029': '#20603D', '6032': '#317F43', '6033': '#497E76',
  '6034': '#7FB5B5', '7000': '#78858B', '7001': '#8A9597', '7002': '#7E7B52',
  '7003': '#6C7059', '7004': '#969992', '7005': '#646B63', '7006': '#6D6552',
  '7008': '#6A5F31', '7009': '#4D5645', '7010': '#4C514A', '7011': '#434B4D',
  '7012': '#4E5754', '7013': '#464531', '7015': '#434750', '7016': '#293133',
  '7021': '#23282B', '7022': '#332F2C', '7023': '#686C5E', '7024': '#474A51',
  '7026': '#2F353B', '7030': '#8B8C7A', '7031': '#474B4E', '7032': '#B8B799',
  '7033': '#7D8471', '7034': '#8F8B66', '7035': '#D7D7D7', '7036': '#7F7679',
  '7037': '#7D7F7D', '7038': '#B5B8B1', '7039': '#6C6960', '7040': '#9DA1AA',
  '7042': '#8D948D', '7043': '#4E5452', '7044': '#CAC4B0', '7045': '#909090',
  '7046': '#82898F', '7047': '#D0D0D0', '8000': '#826C34', '8001': '#955F20',
  '8002': '#6C3B2A', '8003': '#734222', '8004': '#8E402A', '8007': '#59351F',
  '8008': '#6F4F28', '8011': '#5B3A29', '8012': '#592321', '8014': '#382C1E',
  '8015': '#633A34', '8016': '#4C2F27', '8017': '#45322E', '8019': '#403A3A',
  '8022': '#212121', '8023': '#A65E2E', '8024': '#79553D', '8025': '#755C48',
  '8028': '#4E3B31', '9001': '#FDF4E3', '9002': '#E7EBDA', '9003': '#F4F4F4',
  '9004': '#282828', '9005': '#0A0A0A', '9006': '#A5A5A5', '9007': '#8F8F8F',
  '9010': '#FFFFFF', '9011': '#1C1C1C', '9016': '#F6F6F6', '9017': '#1E1E1E',
  '9018': '#D7D7D7',
};

const ralColorNames: Record<string, string> = {
  '1000': 'Green Beige', '1001': 'Beige', '1002': 'Sand Yellow', '1003': 'Signal Yellow',
  '1004': 'Golden Yellow', '1005': 'Honey Yellow', '1006': 'Maize Yellow', '1007': 'Daffodil Yellow',
  '1011': 'Brown Beige', '1012': 'Lemon Yellow', '1013': 'Oyster White', '1014': 'Ivory',
  '1015': 'Light Ivory', '1016': 'Sulfur Yellow', '1017': 'Saffron Yellow', '1018': 'Zinc Yellow',
  '1019': 'Grey Beige', '1020': 'Olive Yellow', '1021': 'Colza Yellow', '1023': 'Traffic Yellow',
  '1024': 'Ochre Yellow', '1027': 'Curry', '1028': 'Melon Yellow', '1032': 'Broom Yellow',
  '1033': 'Dahlia Yellow', '1034': 'Pastel Yellow', '1037': 'Sun Yellow', '2000': 'Yellow Orange',
  '2001': 'Red Orange', '2002': 'Vermilion', '2003': 'Pastel Orange', '2004': 'Pure Orange',
  '2008': 'Bright Red Orange', '2009': 'Traffic Orange', '2010': 'Signal Orange', '2011': 'Deep Orange',
  '2012': 'Salmon Orange', '3000': 'Flame Red', '3001': 'Signal Red', '3002': 'Carmine Red',
  '3003': 'Ruby Red', '3004': 'Purple Red', '3005': 'Wine Red', '3007': 'Black Red',
  '3009': 'Oxide Red', '3011': 'Brown Red', '3012': 'Beige Red', '3013': 'Tomato Red',
  '3014': 'Antique Pink', '3015': 'Light Pink', '3016': 'Coral Red', '3017': 'Rose',
  '3018': 'Strawberry Red', '3020': 'Traffic Red', '3022': 'Salmon Pink', '3027': 'Raspberry Red',
  '3031': 'Orient Red', '4001': 'Red Lilac', '4002': 'Red Violet', '4003': 'Heather Violet',
  '4004': 'Claret Violet', '4005': 'Blue Lilac', '4006': 'Traffic Purple', '4007': 'Purple Violet',
  '4008': 'Signal Violet', '4009': 'Pastel Violet', '5000': 'Violet Blue', '5001': 'Green Blue',
  '5002': 'Ultramarine Blue', '5003': 'Sapphire Blue', '5004': 'Black Blue', '5005': 'Signal Blue',
  '5007': 'Brillant Blue', '5008': 'Grey Blue', '5009': 'Azure Blue', '5010': 'Gentian Blue',
  '5011': 'Steel Blue', '5012': 'Light Blue', '5013': 'Cobalt Blue', '5014': 'Pigeon Blue',
  '5015': 'Sky Blue', '5017': 'Traffic Blue', '5018': 'Turquoise Blue', '5019': 'Capri Blue',
  '5020': 'Ocean Blue', '5021': 'Water Blue', '5022': 'Night Blue', '5023': 'Distant Blue',
  '5024': 'Pastel Blue', '6000': 'Patina Green', '6001': 'Emerald Green', '6002': 'Leaf Green',
  '6003': 'Olive Green', '6004': 'Blue Green', '6005': 'Moss Green', '6006': 'Grey Olive',
  '6007': 'Bottle Green', '6008': 'Brown Green', '6009': 'Fir Green', '6010': 'Grass Green',
  '6011': 'Reseda Green', '6012': 'Black Green', '6013': 'Reed Green', '6014': 'Yellow Olive',
  '6015': 'Black Olive', '6016': 'Turquoise Green', '6017': 'May Green', '6018': 'Yellow Green',
  '6019': 'Pastel Green', '6020': 'Chrome Green', '6021': 'Pale Green', '6022': 'Olive Drab',
  '6024': 'Traffic Green', '6025': 'Fern Green', '6026': 'Opal Green', '6027': 'Light Green',
  '6028': 'Pine Green', '6029': 'Mint Green', '6032': 'Signal Green', '6033': 'Mint Turquoise',
  '6034': 'Pastel Turquoise', '7000': 'Squirrel Grey', '7001': 'Silver Grey', '7002': 'Olive Grey',
  '7003': 'Moss Grey', '7004': 'Signal Grey', '7005': 'Mouse Grey', '7006': 'Beige Grey',
  '7008': 'Khaki Grey', '7009': 'Green Grey', '7010': 'Tarpaulin Grey', '7011': 'Iron Grey',
  '7012': 'Basalt Grey', '7013': 'Brown Grey', '7015': 'Slate Grey', '7016': 'Anthracite Grey',
  '7021': 'Black Grey', '7022': 'Umbra Grey', '7023': 'Concrete Grey', '7024': 'Graphite Grey',
  '7026': 'Granite Grey', '7030': 'Stone Grey', '7031': 'Blue Grey', '7032': 'Pebble Grey',
  '7033': 'Cement Grey', '7034': 'Yellow Grey', '7035': 'Light Grey', '7036': 'Platinum Grey',
  '7037': 'Dusty Grey', '7038': 'Agate Grey', '7039': 'Quartz Grey', '7040': 'Window Grey',
  '7042': 'Traffic Grey A', '7043': 'Traffic Grey B', '7044': 'Silk Grey', '7045': 'Telegrey 1',
  '7046': 'Telegrey 2', '7047': 'Telegrey 4', '8000': 'Green Brown', '8001': 'Ochre Brown',
  '8002': 'Signal Brown', '8003': 'Clay Brown', '8004': 'Copper Brown', '8007': 'Fawn Brown',
  '8008': 'Olive Brown', '8011': 'Nut Brown', '8012': 'Red Brown', '8014': 'Sepia Brown',
  '8015': 'Chestnut Brown', '8016': 'Mahogany Brown', '8017': 'Chocolate Brown', '8019': 'Grey Brown',
  '8022': 'Black Brown', '8023': 'Orange Brown', '8024': 'Beige Brown', '8025': 'Pale Brown',
  '8028': 'Terra Brown', '9001': 'Cream', '9002': 'Grey White', '9003': 'Signal White',
  '9004': 'Signal Black', '9005': 'Jet Black', '9006': 'White Aluminium', '9007': 'Grey Aluminium',
  '9010': 'Pure White', '9011': 'Graphite Black', '9016': 'Traffic White', '9017': 'Traffic Black',
  '9018': 'Papyrus White',
};

function getRalHex(ral: string): string {
  return ralColors[ral.replace(/[^0-9]/g, '')] || '#CCCCCC';
}
function getRalName(ral: string): string {
  return ralColorNames[ral.replace(/[^0-9]/g, '')] || 'Unknown Color';
}

function RalChip({ ral }: { ral: string }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-5 h-5 rounded-full border border-black/10 shadow-sm flex-shrink-0"
        style={{ backgroundColor: getRalHex(ral) }}
        title={`RAL ${ral} - ${getRalName(ral)}`}
      />
      <span className="font-medium text-sm">RAL {ral}</span>
      <span className="text-muted-foreground text-sm">· {getRalName(ral)}</span>
    </div>
  );
}

// ─── Types ───────────────────────────────────────────────────────────────────

type ScopeOfWork = {
  id: string;
  scopeType: string;
  scopeLabel: string;
  customLabel: string | null;
  quantity: number | null;
  unit: string | null;
  ralColor: string | null;
  panelThickness: number | null;
  ribHeight: number | null;
  upperSheetThick: number | null;
  lowerSheetThick: number | null;
  panelProfile: string | null;
  deckProfile: string | null;
  hasShearStuds: boolean;
  shearStudQty: number | null;
  shearStudSpecs: string | null;
  metalWorkItems: unknown;
};

type BuildingData = {
  id: string;
  designation: string | null;
  name: string | null;
  weight: number | null;
  location: string | null;
  assemblyTonnage: number;
  totalArea: number;
  purlinArea: number;
  paintableArea: number;
  scopeOfWorks: ScopeOfWork[];
};

type ProjectData = {
  id: string;
  projectNumber: string;
  name: string;
  status: string;
  contractDate: string | null;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  actualStartDate: string | null;
  actualEndDate: string | null;
  contractualTonnage: number | null;
  engineeringTonnage: number | null;
  cranesIncluded: boolean;
  surveyorOurScope: boolean;
  thirdPartyRequired: boolean;
  thirdPartyResponsibility: string | null;
  incoterm: string | null;
  structureType: string | null;
  numberOfStructures: number | null;
  erectionSubcontractor: string | null;
  weldingProcess: string | null;
  wpsNumber: string | null;
  pqrNumber: string | null;
  ndtTest: string | null;
  applicableCodes: string | null;
  galvanized: boolean;
  galvanizationMicrons: number | null;
  coatingSystem: string | null;
  area: number | null;
  m2PerTon: number | null;
  paintCoat1: string | null; paintCoat1Microns: number | null;
  paintCoat2: string | null; paintCoat2Microns: number | null;
  paintCoat3: string | null; paintCoat3Microns: number | null;
  paintCoat4: string | null; paintCoat4Microns: number | null;
  topCoatRalNumber: string | null;
  engineeringWeeksMin: number | null;
  engineeringWeeksMax: number | null;
  operationsWeeksMin: number | null;
  operationsWeeksMax: number | null;
  siteWeeksMin: number | null;
  siteWeeksMax: number | null;
  client: { id: string; name: string } | null;
  projectManager: { id: string; name: string } | null;
  salesEngineer: { id: string; name: string } | null;
};

type NavProject = { id: string; projectNumber: string; name: string; status: string };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number, decimals = 2): string {
  return n.toLocaleString('en-SA-u-ca-gregory', { maximumFractionDigits: decimals });
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-SA-u-ca-gregory', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function weeksLabel(min: number | null, max: number | null): string {
  if (!min && !max) return '—';
  if (min && max && min !== max) return `${min}–${max} weeks`;
  return `${min ?? max} weeks`;
}

const statusColors: Record<string, string> = {
  Active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  Draft: 'bg-slate-100 text-slate-700 border-slate-200',
  Completed: 'bg-blue-100 text-blue-700 border-blue-200',
  'On Hold': 'bg-amber-100 text-amber-700 border-amber-200',
  Cancelled: 'bg-rose-100 text-rose-700 border-rose-200',
};

// ─── Scope helpers ────────────────────────────────────────────────────────────

function ScopeBadge({ scopeType }: { scopeType: string }) {
  const configs: Record<string, { label: string; className: string }> = {
    steel: { label: 'Steel', className: 'bg-blue-100 text-blue-800 border-blue-200' },
    roof_sheeting: { label: 'Roof Sheeting', className: 'bg-amber-100 text-amber-800 border-amber-200' },
    wall_sheeting: { label: 'Wall Sheeting', className: 'bg-orange-100 text-orange-800 border-orange-200' },
    deck_panel: { label: 'Deck Panel', className: 'bg-purple-100 text-purple-800 border-purple-200' },
    metal_work: { label: 'Metal Work', className: 'bg-gray-100 text-gray-800 border-gray-200' },
    other: { label: 'Other', className: 'bg-teal-100 text-teal-800 border-teal-200' },
  };
  const cfg = configs[scopeType] || { label: scopeType, className: 'bg-gray-100 text-gray-700 border-gray-200' };
  return <Badge variant="outline" className={`text-xs ${cfg.className}`}>{cfg.label}</Badge>;
}

function ScopeSection({ scope }: { scope: ScopeOfWork }) {
  const isSheeting = scope.scopeType === 'roof_sheeting' || scope.scopeType === 'wall_sheeting';
  const isDeck = scope.scopeType === 'deck_panel';

  return (
    <div className="border rounded-lg p-4 space-y-3 bg-card">
      <div className="flex items-center gap-2 flex-wrap">
        <ScopeBadge scopeType={scope.scopeType} />
        {scope.customLabel && <span className="text-sm font-medium">{scope.customLabel}</span>}
        {scope.quantity !== null && (
          <span className="text-sm text-muted-foreground ml-auto">
            {fmt(scope.quantity)} {scope.unit || ''}
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
        {scope.ralColor && (
          <div className="col-span-2">
            <span className="text-muted-foreground text-xs uppercase tracking-wide">Color</span>
            <div className="mt-1"><RalChip ral={scope.ralColor} /></div>
          </div>
        )}
        {isSheeting && (
          <>
            {scope.panelThickness !== null && (
              <div>
                <span className="text-muted-foreground text-xs uppercase tracking-wide">Panel Thickness</span>
                <p className="font-medium mt-0.5">{scope.panelThickness} mm</p>
              </div>
            )}
            {scope.ribHeight !== null && (
              <div>
                <span className="text-muted-foreground text-xs uppercase tracking-wide">Rib Height</span>
                <p className="font-medium mt-0.5">{scope.ribHeight} mm</p>
              </div>
            )}
            {scope.upperSheetThick !== null && (
              <div>
                <span className="text-muted-foreground text-xs uppercase tracking-wide">Upper Sheet</span>
                <p className="font-medium mt-0.5">{scope.upperSheetThick} mm</p>
              </div>
            )}
            {scope.lowerSheetThick !== null && (
              <div>
                <span className="text-muted-foreground text-xs uppercase tracking-wide">Lower Sheet</span>
                <p className="font-medium mt-0.5">{scope.lowerSheetThick} mm</p>
              </div>
            )}
            {scope.panelProfile && (
              <div>
                <span className="text-muted-foreground text-xs uppercase tracking-wide">Profile</span>
                <p className="font-medium mt-0.5 capitalize">{scope.panelProfile}</p>
              </div>
            )}
          </>
        )}
        {isDeck && (
          <>
            {scope.deckProfile && (
              <div>
                <span className="text-muted-foreground text-xs uppercase tracking-wide">Deck Profile</span>
                <p className="font-medium mt-0.5">{scope.deckProfile}</p>
              </div>
            )}
            <div>
              <span className="text-muted-foreground text-xs uppercase tracking-wide">Shear Studs</span>
              <p className="font-medium mt-0.5">{scope.hasShearStuds ? 'Yes' : 'No'}</p>
            </div>
            {scope.hasShearStuds && scope.shearStudQty !== null && (
              <div>
                <span className="text-muted-foreground text-xs uppercase tracking-wide">Shear Stud Qty</span>
                <p className="font-medium mt-0.5">{scope.shearStudQty.toLocaleString('en-SA-u-ca-gregory')}</p>
              </div>
            )}
            {scope.hasShearStuds && scope.shearStudSpecs && (
              <div className="col-span-2">
                <span className="text-muted-foreground text-xs uppercase tracking-wide">Shear Stud Specs</span>
                <p className="font-medium mt-0.5">{scope.shearStudSpecs}</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Coating System ───────────────────────────────────────────────────────────

function CoatingSystem({ project }: { project: ProjectData }) {
  const coats = [
    { label: 'Coat 1', name: project.paintCoat1, microns: project.paintCoat1Microns },
    { label: 'Coat 2', name: project.paintCoat2, microns: project.paintCoat2Microns },
    { label: 'Coat 3', name: project.paintCoat3, microns: project.paintCoat3Microns },
    { label: 'Coat 4', name: project.paintCoat4, microns: project.paintCoat4Microns },
  ].filter((c) => c.name);
  const count = project.galvanized ? coats.length + 1 : coats.length;
  if (count === 0 && !project.coatingSystem) return <span className="text-muted-foreground text-sm">Not specified</span>;

  return (
    <div className="space-y-2">
      {project.coatingSystem && (
        <p className="text-sm font-medium">{project.coatingSystem}</p>
      )}
      <div className="flex items-center gap-2 flex-wrap">
        {count > 0 && (
          <Badge variant="outline" className="text-xs font-semibold">
            {count} {count === 1 ? 'coat' : 'coats'}
          </Badge>
        )}
        {project.galvanized && (
          <Badge className="text-xs bg-zinc-200 text-zinc-800 border-zinc-300">
            Galvanized{project.galvanizationMicrons ? ` (${project.galvanizationMicrons} µm)` : ''}
          </Badge>
        )}
        {project.topCoatRalNumber && <RalChip ral={project.topCoatRalNumber} />}
      </div>
      {coats.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {coats.map((c) => (
            <div key={c.label} className="text-xs bg-muted rounded px-2 py-1 flex gap-1 items-center">
              <span className="font-medium">{c.label}:</span>
              <span>{c.name}</span>
              {c.microns && <span className="text-muted-foreground">({c.microns} µm)</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Technical Info ───────────────────────────────────────────────────────────

function TechnicalInfo({ project }: { project: ProjectData }) {
  const items: { icon: ReactNode; label: string; value: ReactNode }[] = [];

  items.push({
    icon: <HardHat className="w-3.5 h-3.5" />,
    label: 'Cranes',
    value: project.cranesIncluded
      ? <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs" variant="outline">Included</Badge>
      : <Badge className="bg-slate-100 text-slate-600 border-slate-200 text-xs" variant="outline">Not included</Badge>,
  });

  items.push({
    icon: <Shield className="w-3.5 h-3.5" />,
    label: 'Third Party Inspection',
    value: project.thirdPartyRequired ? (
      <span className="flex items-center gap-1.5">
        <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs" variant="outline">Required</Badge>
        {project.thirdPartyResponsibility && (
          <span className="text-xs text-muted-foreground capitalize">
            ({project.thirdPartyResponsibility === 'our' ? 'Our scope' : 'Customer scope'})
          </span>
        )}
      </span>
    ) : (
      <Badge className="bg-slate-100 text-slate-600 border-slate-200 text-xs" variant="outline">Not required</Badge>
    ),
  });

  if (project.surveyorOurScope) {
    items.push({
      icon: <Users className="w-3.5 h-3.5" />,
      label: 'Surveyor',
      value: <Badge className="bg-violet-100 text-violet-700 border-violet-200 text-xs" variant="outline">Our scope</Badge>,
    });
  }

  if (project.incoterm) {
    items.push({
      icon: <Globe className="w-3.5 h-3.5" />,
      label: 'Incoterm',
      value: <span className="font-semibold text-sm">{project.incoterm}</span>,
    });
  }

  if (project.erectionSubcontractor) {
    items.push({
      icon: <Truck className="w-3.5 h-3.5" />,
      label: 'Erection Subcontractor',
      value: <span className="text-sm">{project.erectionSubcontractor}</span>,
    });
  }

  if (project.structureType || project.numberOfStructures) {
    items.push({
      icon: <Building2 className="w-3.5 h-3.5" />,
      label: 'Structure',
      value: (
        <span className="text-sm">
          {[project.structureType, project.numberOfStructures ? `${project.numberOfStructures} structures` : null]
            .filter(Boolean).join(' · ')}
        </span>
      ),
    });
  }

  if (project.weldingProcess || project.wpsNumber || project.pqrNumber) {
    items.push({
      icon: <Wrench className="w-3.5 h-3.5" />,
      label: 'Welding',
      value: (
        <span className="text-sm flex flex-wrap gap-1.5 items-center">
          {project.weldingProcess && <Badge variant="outline" className="text-xs">{project.weldingProcess}</Badge>}
          {project.wpsNumber && <span className="text-muted-foreground">WPS: {project.wpsNumber}</span>}
          {project.pqrNumber && <span className="text-muted-foreground">PQR: {project.pqrNumber}</span>}
        </span>
      ),
    });
  }

  if (project.ndtTest) {
    items.push({
      icon: <FlaskConical className="w-3.5 h-3.5" />,
      label: 'NDT',
      value: <span className="text-sm">{project.ndtTest}</span>,
    });
  }

  if (project.applicableCodes) {
    items.push({
      icon: <FileCode className="w-3.5 h-3.5" />,
      label: 'Applicable Codes',
      value: <span className="text-sm">{project.applicableCodes}</span>,
    });
  }

  if (project.area || project.m2PerTon) {
    items.push({
      icon: <Ruler className="w-3.5 h-3.5" />,
      label: 'Area / Ratio',
      value: (
        <span className="text-sm text-muted-foreground">
          {project.area ? `${fmt(project.area)} m²` : ''}
          {project.area && project.m2PerTon ? ' · ' : ''}
          {project.m2PerTon ? `${fmt(project.m2PerTon)} m²/t` : ''}
        </span>
      ),
    });
  }

  if (items.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-2.5">
          <div className="text-muted-foreground mt-0.5 flex-shrink-0">{item.icon}</div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">{item.label}</p>
            <div>{item.value}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Stage Durations ──────────────────────────────────────────────────────────

function StageDurations({ project }: { project: ProjectData }) {
  const stages = [
    {
      label: 'Engineering',
      min: project.engineeringWeeksMin,
      max: project.engineeringWeeksMax,
      color: 'bg-blue-500',
      lightColor: 'bg-blue-50',
      textColor: 'text-blue-700',
    },
    {
      label: 'Operations',
      min: project.operationsWeeksMin,
      max: project.operationsWeeksMax,
      color: 'bg-emerald-500',
      lightColor: 'bg-emerald-50',
      textColor: 'text-emerald-700',
    },
    {
      label: 'Site',
      min: project.siteWeeksMin,
      max: project.siteWeeksMax,
      color: 'bg-amber-500',
      lightColor: 'bg-amber-50',
      textColor: 'text-amber-700',
    },
  ];

  const maxWeeks = Math.max(
    ...stages.map((s) => s.max ?? s.min ?? 0),
    1,
  );

  const hasAny = stages.some((s) => s.min || s.max);
  if (!hasAny) return <p className="text-sm text-muted-foreground italic">No stage durations specified.</p>;

  return (
    <div className="space-y-3">
      {stages.map((stage) => {
        const label = weeksLabel(stage.min, stage.max);
        const barPct = ((stage.max ?? stage.min ?? 0) / maxWeeks) * 100;
        return (
          <div key={stage.label} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{stage.label}</span>
              <span className={`font-semibold ${stage.textColor}`}>{label}</span>
            </div>
            <div className={`h-2 rounded-full ${stage.lightColor} overflow-hidden`}>
              <div
                className={`h-full rounded-full ${stage.color} transition-all`}
                style={{ width: `${barPct}%` }}
              />
            </div>
          </div>
        );
      })}
      {(project.plannedStartDate || project.plannedEndDate) && (
        <div className="flex items-center gap-4 pt-1 text-xs text-muted-foreground border-t mt-2">
          {project.plannedStartDate && (
            <span><span className="font-medium">Start:</span> {fmtDate(project.plannedStartDate)}</span>
          )}
          {project.plannedEndDate && (
            <span><span className="font-medium">End:</span> {fmtDate(project.plannedEndDate)}</span>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Aggregated scope summary ─────────────────────────────────────────────────

type AggScope = {
  scopeType: string;
  scopeLabel: string;
  totalQty: number;
  unit: string | null;
  buildings: string[];
};

function aggregateScopes(buildings: BuildingData[]): AggScope[] {
  const map = new Map<string, AggScope>();
  for (const b of buildings) {
    for (const s of b.scopeOfWorks) {
      const key = `${s.scopeType}|${s.customLabel ?? s.scopeLabel}`;
      if (!map.has(key)) {
        map.set(key, {
          scopeType: s.scopeType,
          scopeLabel: s.customLabel ?? s.scopeLabel,
          totalQty: 0,
          unit: s.unit,
          buildings: [],
        });
      }
      const entry = map.get(key)!;
      entry.totalQty += s.quantity ?? 0;
      const bLabel = b.designation || b.name || '?';
      if (!entry.buildings.includes(bLabel)) entry.buildings.push(bLabel);
    }
  }
  return Array.from(map.values());
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({
  title,
  icon,
  children,
  collapsible = true,
  defaultOpen = true,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card>
      <CardHeader
        className={`pb-3 ${collapsible ? 'cursor-pointer select-none' : ''}`}
        onClick={collapsible ? () => setOpen((o) => !o) : undefined}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {icon}
            {title}
          </div>
          {collapsible && (open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />)}
        </div>
      </CardHeader>
      {open && <CardContent className="pt-0">{children}</CardContent>}
    </Card>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function ProjectCardClient({
  project,
  buildings,
  allProjects,
}: {
  project: ProjectData;
  buildings: BuildingData[];
  allProjects: NavProject[];
}) {
  const router = useRouter();
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);

  // Project navigation
  const projectIdx = allProjects.findIndex((p) => p.id === project.id);
  const prevProject = projectIdx > 0 ? allProjects[projectIdx - 1] : null;
  const nextProject = projectIdx < allProjects.length - 1 ? allProjects[projectIdx + 1] : null;

  function goToProject(id: string) {
    router.push(`/projects/${id}/buildings`);
  }

  // Building navigation — null = All
  const selectedBuilding = buildings.find((b) => b.id === selectedBuildingId) ?? null;
  const buildingIdx = selectedBuildingId ? buildings.findIndex((b) => b.id === selectedBuildingId) : -1;
  const prevBuilding = buildingIdx > 0 ? buildings[buildingIdx - 1] : null;
  const nextBuilding = buildingIdx < buildings.length - 1 ? buildings[buildingIdx + 1] : null;

  function goPrevBuilding() {
    if (buildingIdx === -1) return; // on "All", go to last
    if (buildingIdx === 0) { setSelectedBuildingId(null); return; }
    setSelectedBuildingId(buildings[buildingIdx - 1].id);
  }
  function goNextBuilding() {
    if (buildingIdx === -1 && buildings.length > 0) { setSelectedBuildingId(buildings[0].id); return; }
    if (nextBuilding) setSelectedBuildingId(nextBuilding.id);
  }

  // KPIs — aggregate or per building
  const kpiBuildings = selectedBuilding ? [selectedBuilding] : buildings;
  const totalTonnage = kpiBuildings.reduce((s, b) => s + b.assemblyTonnage, 0);
  const totalArea = kpiBuildings.reduce((s, b) => s + b.totalArea, 0);
  const totalPaintable = kpiBuildings.reduce((s, b) => s + b.paintableArea, 0);

  // Scope content
  const aggScopes = useMemo(() => aggregateScopes(buildings), [buildings]);
  const displayScopes: ScopeOfWork[] = selectedBuilding ? selectedBuilding.scopeOfWorks : [];

  const coatCount = [
    project.galvanized,
    project.paintCoat1,
    project.paintCoat2,
    project.paintCoat3,
    project.paintCoat4,
  ].filter(Boolean).length;

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-5xl mx-auto">

      {/* ── Project Header ── */}
      <Card className="overflow-hidden">
        <CardContent className="p-4 space-y-3">
          {/* Project selector row */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 flex-shrink-0"
              disabled={!prevProject}
              onClick={() => prevProject && goToProject(prevProject.id)}
              title={prevProject ? `${prevProject.projectNumber} – ${prevProject.name}` : undefined}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>

            <div className="flex-1 min-w-0">
              <Select value={project.id} onValueChange={goToProject}>
                <SelectTrigger className="h-9 font-semibold text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {allProjects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <span className="font-mono text-xs text-muted-foreground mr-2">{p.projectNumber}</span>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 flex-shrink-0"
              disabled={!nextProject}
              onClick={() => nextProject && goToProject(nextProject.id)}
              title={nextProject ? `${nextProject.projectNumber} – ${nextProject.name}` : undefined}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Project meta */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
            <Badge
              variant="outline"
              className={statusColors[project.status] ?? 'bg-slate-100 text-slate-700'}
            >
              {project.status}
            </Badge>
            <span className="font-mono text-muted-foreground text-xs">{project.projectNumber}</span>
            {project.client && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <Building2 className="w-3.5 h-3.5" />
                {project.client.name}
              </span>
            )}
            {project.projectManager && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <User className="w-3.5 h-3.5" />
                {project.projectManager.name}
              </span>
            )}
            {project.contractDate && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <CalendarDays className="w-3.5 h-3.5" />
                {fmtDate(project.contractDate)}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Building selector ── */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 flex-shrink-0"
          disabled={selectedBuildingId === null}
          onClick={goPrevBuilding}
          title="Previous building"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        <div className="flex-1 flex items-center gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
          <button
            onClick={() => setSelectedBuildingId(null)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-md text-sm font-medium transition-colors border ${
              selectedBuildingId === null
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background text-muted-foreground border-border hover:bg-accent'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <LayoutGrid className="w-3.5 h-3.5" />
              All
            </span>
          </button>
          {buildings.map((b) => (
            <button
              key={b.id}
              onClick={() => setSelectedBuildingId(b.id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-md text-sm font-medium transition-colors border ${
                selectedBuildingId === b.id
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-muted-foreground border-border hover:bg-accent'
              }`}
              title={b.name ?? undefined}
            >
              {b.designation || b.name || '?'}
            </button>
          ))}
        </div>

        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 flex-shrink-0"
          disabled={selectedBuildingId !== null && !nextBuilding}
          onClick={goNextBuilding}
          title="Next building"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* ── KPI strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1">
            <Building2 className="w-3 h-3" />
            {selectedBuilding ? 'Building' : 'Buildings'}
          </div>
          {selectedBuilding ? (
            <>
              <div className="text-xl font-bold">{selectedBuilding.designation || '—'}</div>
              {selectedBuilding.name && selectedBuilding.name !== selectedBuilding.designation && (
                <div className="text-xs text-muted-foreground mt-0.5">{selectedBuilding.name}</div>
              )}
              {selectedBuilding.location && (
                <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-0.5">
                  <MapPin className="w-2.5 h-2.5" />{selectedBuilding.location}
                </div>
              )}
            </>
          ) : (
            <div className="text-2xl font-bold">{buildings.length}</div>
          )}
        </Card>

        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1">
            <Weight className="w-3 h-3" /> Tonnage
          </div>
          <div className="text-2xl font-bold">{fmt(totalTonnage, 2)} t</div>
          {project.contractualTonnage && !selectedBuilding && (
            <div className="text-xs text-muted-foreground mt-0.5">
              Contract: {fmt(project.contractualTonnage, 2)} t
            </div>
          )}
          {selectedBuilding?.weight !== null && selectedBuilding && (
            <div className="text-xs text-muted-foreground mt-0.5">
              Manual: {fmt(selectedBuilding.weight ?? 0, 2)} t
            </div>
          )}
        </Card>

        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1">
            <Ruler className="w-3 h-3" /> Total Area
          </div>
          <div className="text-2xl font-bold">{fmt(totalArea)} m²</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            Purlin: {fmt(kpiBuildings.reduce((s, b) => s + b.purlinArea, 0))} m²
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1">
            <Paintbrush className="w-3 h-3" /> Paintable Area
          </div>
          <div className="text-2xl font-bold">{fmt(totalPaintable)} m²</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {coatCount > 0 ? `${coatCount} coat${coatCount !== 1 ? 's' : ''}` : 'Coating not set'}
          </div>
        </Card>
      </div>

      {/* ── Technical Information ── */}
      <Section title="Technical Information" icon={<Wrench className="w-3.5 h-3.5" />}>
        <TechnicalInfo project={project} />
      </Section>

      {/* ── Coating System ── */}
      <Section title="Coating System" icon={<Paintbrush className="w-3.5 h-3.5" />}>
        <CoatingSystem project={project} />
      </Section>

      {/* ── Stage Durations ── */}
      <Section title="Stage Durations" icon={<Clock className="w-3.5 h-3.5" />}>
        <StageDurations project={project} />
      </Section>

      {/* ── Scope of Work ── */}
      <Section title={selectedBuilding ? `Scope — ${selectedBuilding.designation || selectedBuilding.name}` : 'Scope of Work — All Buildings'} icon={<Layers className="w-3.5 h-3.5" />}>
        {selectedBuilding ? (
          // Per-building detail view
          <div className="space-y-5">
            {(['steel', 'roof_sheeting', 'wall_sheeting', 'deck_panel', 'metal_work', 'other'] as const).map((type) => {
              const scopes = displayScopes.filter((s) => s.scopeType === type);
              if (scopes.length === 0) return null;
              const icons: Record<string, ReactNode> = {
                steel: <Package className="w-3.5 h-3.5" />,
                roof_sheeting: <PanelTop className="w-3.5 h-3.5" />,
                wall_sheeting: <PanelLeft className="w-3.5 h-3.5" />,
                deck_panel: <Bolt className="w-3.5 h-3.5" />,
                metal_work: <Wrench className="w-3.5 h-3.5" />,
                other: <Package className="w-3.5 h-3.5" />,
              };
              const labels: Record<string, string> = {
                steel: 'Steel Structure',
                roof_sheeting: 'Roof Sheeting',
                wall_sheeting: 'Wall Sheeting',
                deck_panel: 'Deck Panel',
                metal_work: 'Metal Work',
                other: 'Other',
              };
              return (
                <div key={type}>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                    {icons[type]} {labels[type]}
                  </h4>
                  <div className="space-y-2">
                    {scopes.map((s) => <ScopeSection key={s.id} scope={s} />)}
                  </div>
                </div>
              );
            })}
            {displayScopes.length === 0 && (
              <p className="text-sm text-muted-foreground italic">No scope of work defined for this building.</p>
            )}
          </div>
        ) : (
          // Aggregated view across all buildings
          aggScopes.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No scope of work defined.</p>
          ) : (
            <div className="space-y-2">
              {aggScopes.map((agg, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 border rounded-lg p-3 bg-card"
                >
                  <ScopeBadge scopeType={agg.scopeType} />
                  <span className="text-sm font-medium flex-1">{agg.scopeLabel}</span>
                  <span className="text-sm text-muted-foreground">
                    {agg.totalQty > 0 ? `${fmt(agg.totalQty)} ${agg.unit ?? ''}` : '—'}
                  </span>
                  <span className="text-xs text-muted-foreground hidden sm:block">
                    {agg.buildings.join(', ')}
                  </span>
                </div>
              ))}
            </div>
          )
        )}
      </Section>

      {/* ── Per-building breakdown (only in All view) ── */}
      {!selectedBuilding && buildings.length > 0 && (
        <Section title="Buildings Breakdown" icon={<Building2 className="w-3.5 h-3.5" />} defaultOpen={false}>
          <div className="space-y-3">
            {buildings.map((b) => (
              <div
                key={b.id}
                className="flex items-center gap-3 p-3 border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
                onClick={() => setSelectedBuildingId(b.id)}
              >
                <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{b.designation || b.name || 'Unnamed'}</p>
                  {b.designation && b.name && b.name !== b.designation && (
                    <p className="text-xs text-muted-foreground">{b.name}</p>
                  )}
                  {b.location && (
                    <p className="text-xs text-muted-foreground flex items-center gap-0.5">
                      <MapPin className="w-2.5 h-2.5" />{b.location}
                    </p>
                  )}
                </div>
                <div className="text-right flex-shrink-0 text-sm">
                  <p className="font-semibold">{fmt(b.assemblyTonnage, 2)} t</p>
                  <p className="text-xs text-muted-foreground">{fmt(b.totalArea)} m²</p>
                </div>
                <div className="flex gap-1 flex-wrap justify-end max-w-[140px] hidden sm:flex">
                  {b.scopeOfWorks.slice(0, 3).map((s) => (
                    <ScopeBadge key={s.id} scopeType={s.scopeType} />
                  ))}
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
