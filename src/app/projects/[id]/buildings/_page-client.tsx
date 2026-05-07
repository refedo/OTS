'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Building2,
  ArrowLeft,
  MapPin,
  Weight,
  Layers,
  Paintbrush,
  Ruler,
  ChevronDown,
  ChevronRight,
  Package,
  Bolt,
  PanelTop,
  PanelLeft,
} from 'lucide-react';
import Link from 'next/link';

// RAL color hex mappings
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
  const clean = ral.replace(/[^0-9]/g, '');
  return ralColors[clean] || '#CCCCCC';
}

function getRalName(ral: string): string {
  const clean = ral.replace(/[^0-9]/g, '');
  return ralColorNames[clean] || 'Unknown Color';
}

function RalChip({ ral }: { ral: string }) {
  const hex = getRalHex(ral);
  const name = getRalName(ral);
  const isDark = parseInt(ral.replace(/[^0-9]/g, '')) < 5000 ||
    ['9004', '9005', '9011', '9017', '8022', '8019', '8017', '8016', '8015', '8014', '8012',
     '8011', '7021', '7016', '5004', '5003', '5002', '5001', '5000', '4007', '4004', '3007',
     '3005', '3004', '3003'].includes(ral.replace(/[^0-9]/g, ''));

  return (
    <div className="flex items-center gap-2">
      <div
        className="w-6 h-6 rounded-full border border-black/10 shadow-sm flex-shrink-0"
        style={{ backgroundColor: hex }}
        title={`RAL ${ral} - ${name}`}
      />
      <span className="font-medium text-sm">RAL {ral}</span>
      <span className="text-muted-foreground text-sm">· {name}</span>
    </div>
  );
}

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
  contractualTonnage: number | null;
  galvanized: boolean;
  paintCoat1: string | null;
  paintCoat1Microns: number | null;
  paintCoat2: string | null;
  paintCoat2Microns: number | null;
  paintCoat3: string | null;
  paintCoat3Microns: number | null;
  paintCoat4: string | null;
  paintCoat4Microns: number | null;
  topCoatRalNumber: string | null;
};

function fmt(n: number, decimals = 2): string {
  return n.toLocaleString('en-SA-u-ca-gregory', { maximumFractionDigits: decimals });
}

function CoatingSystem({ project }: { project: ProjectData }) {
  const coats = [
    { label: 'Coat 1', name: project.paintCoat1, microns: project.paintCoat1Microns },
    { label: 'Coat 2', name: project.paintCoat2, microns: project.paintCoat2Microns },
    { label: 'Coat 3', name: project.paintCoat3, microns: project.paintCoat3Microns },
    { label: 'Coat 4', name: project.paintCoat4, microns: project.paintCoat4Microns },
  ].filter((c) => c.name);

  const count = project.galvanized ? coats.length + 1 : coats.length;

  if (count === 0) return <span className="text-muted-foreground text-sm">Not specified</span>;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="outline" className="text-xs font-semibold">
          {count} {count === 1 ? 'coat' : 'coats'}
        </Badge>
        {project.galvanized && (
          <Badge className="text-xs bg-zinc-200 text-zinc-800 border-zinc-300">Galvanized</Badge>
        )}
        {project.topCoatRalNumber && (
          <RalChip ral={project.topCoatRalNumber} />
        )}
      </div>
      {coats.length > 0 && (
        <div className="flex gap-2 flex-wrap mt-1">
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
  const label = scope.customLabel || scope.scopeLabel;
  const isSheeting = scope.scopeType === 'roof_sheeting' || scope.scopeType === 'wall_sheeting';
  const isDeck = scope.scopeType === 'deck_panel';
  const isSteel = scope.scopeType === 'steel';

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
        {/* RAL Color for steel or sheeting */}
        {scope.ralColor && (
          <div className="col-span-2">
            <span className="text-muted-foreground text-xs uppercase tracking-wide">Color</span>
            <div className="mt-1">
              <RalChip ral={scope.ralColor} />
            </div>
          </div>
        )}

        {/* Sandwich panel specs */}
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

        {/* Deck panel specs */}
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

function BuildingCard({ building, project }: { building: BuildingData; project: ProjectData }) {
  const [expanded, setExpanded] = useState(true);

  const roofScopes = building.scopeOfWorks.filter((s) => s.scopeType === 'roof_sheeting');
  const wallScopes = building.scopeOfWorks.filter((s) => s.scopeType === 'wall_sheeting');
  const deckScopes = building.scopeOfWorks.filter((s) => s.scopeType === 'deck_panel');
  const steelScopes = building.scopeOfWorks.filter((s) => s.scopeType === 'steel');
  const otherScopes = building.scopeOfWorks.filter(
    (s) => !['steel', 'roof_sheeting', 'wall_sheeting', 'deck_panel'].includes(s.scopeType)
  );

  const coatCount = [
    project.galvanized,
    project.paintCoat1,
    project.paintCoat2,
    project.paintCoat3,
    project.paintCoat4,
  ].filter(Boolean).length;

  return (
    <Card className="overflow-hidden shadow-sm border">
      {/* Card Header */}
      <CardHeader
        className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 cursor-pointer select-none pb-3"
        onClick={() => setExpanded((e) => !e)}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-base font-semibold">
                  {building.designation || building.name || 'Unnamed Building'}
                </CardTitle>
                {building.designation && building.name && building.name !== building.designation && (
                  <span className="text-sm text-muted-foreground">· {building.name}</span>
                )}
              </div>
              {building.location && (
                <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  {building.location}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {building.scopeOfWorks.map((s) => (
              <ScopeBadge key={s.id} scopeType={s.scopeType} />
            ))}
            <Button variant="ghost" size="icon" className="h-7 w-7 ml-1">
              {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-2.5 border">
            <div className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
              <Weight className="w-3 h-3" /> Assembly Tonnage
            </div>
            <div className="font-semibold text-sm">
              {fmt(building.assemblyTonnage, 3)} t
            </div>
            {building.weight !== null && (
              <div className="text-xs text-muted-foreground">Manual: {fmt(building.weight, 3)} t</div>
            )}
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg p-2.5 border">
            <div className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
              <Ruler className="w-3 h-3" /> Total Area
            </div>
            <div className="font-semibold text-sm">{fmt(building.totalArea)} m²</div>
            <div className="text-xs text-muted-foreground">Purlin: {fmt(building.purlinArea)} m²</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg p-2.5 border">
            <div className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
              <Paintbrush className="w-3 h-3" /> Paintable Area
            </div>
            <div className="font-semibold text-sm">{fmt(building.paintableArea)} m²</div>
            <div className="text-xs text-muted-foreground">Total − Purlin</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg p-2.5 border">
            <div className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
              <Layers className="w-3 h-3" /> Coating
            </div>
            <div className="font-semibold text-sm">
              {coatCount > 0 ? `${coatCount} coat${coatCount !== 1 ? 's' : ''}` : '—'}
            </div>
            {project.topCoatRalNumber && (
              <div className="text-xs text-muted-foreground">RAL {project.topCoatRalNumber}</div>
            )}
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-5 space-y-6">
          {/* Coating System */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
              <Paintbrush className="w-3.5 h-3.5" /> Coating System
            </h4>
            <CoatingSystem project={project} />
          </div>

          {/* Steel */}
          {steelScopes.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5" /> Steel Structure
              </h4>
              <div className="space-y-2">
                {steelScopes.map((s) => <ScopeSection key={s.id} scope={s} />)}
              </div>
            </div>
          )}

          {/* Roof Sheeting */}
          {roofScopes.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                <PanelTop className="w-3.5 h-3.5" /> Roof Sheeting
              </h4>
              <div className="space-y-2">
                {roofScopes.map((s) => <ScopeSection key={s.id} scope={s} />)}
              </div>
            </div>
          )}

          {/* Wall Sheeting */}
          {wallScopes.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                <PanelLeft className="w-3.5 h-3.5" /> Wall Sheeting
              </h4>
              <div className="space-y-2">
                {wallScopes.map((s) => <ScopeSection key={s.id} scope={s} />)}
              </div>
            </div>
          )}

          {/* Deck Panel */}
          {deckScopes.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                <Bolt className="w-3.5 h-3.5" /> Deck Panel
              </h4>
              <div className="space-y-2">
                {deckScopes.map((s) => <ScopeSection key={s.id} scope={s} />)}
              </div>
            </div>
          )}

          {/* Other scopes */}
          {otherScopes.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5" /> Other Scopes
              </h4>
              <div className="space-y-2">
                {otherScopes.map((s) => <ScopeSection key={s.id} scope={s} />)}
              </div>
            </div>
          )}

          {building.scopeOfWorks.length === 0 && (
            <p className="text-sm text-muted-foreground italic">No scope of work defined for this building.</p>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export function BuildingDetailsClient({
  project,
  buildings,
}: {
  project: ProjectData;
  buildings: BuildingData[];
}) {
  const totalTonnage = buildings.reduce((s, b) => s + b.assemblyTonnage, 0);
  const totalArea = buildings.reduce((s, b) => s + b.totalArea, 0);
  const totalPaintable = buildings.reduce((s, b) => s + b.paintableArea, 0);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      {/* Back + Title */}
      <div className="flex items-center gap-3">
        <Link href={`/projects/${project.id}`}>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold leading-tight">Building Details</h1>
          <p className="text-sm text-muted-foreground">{project.projectNumber} · {project.name}</p>
        </div>
      </div>

      {/* Project-level KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Buildings</div>
          <div className="text-2xl font-bold">{buildings.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Total Tonnage</div>
          <div className="text-2xl font-bold">{fmt(totalTonnage, 2)} t</div>
          {project.contractualTonnage && (
            <div className="text-xs text-muted-foreground mt-0.5">
              Contract: {fmt(project.contractualTonnage, 2)} t
            </div>
          )}
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Total Area</div>
          <div className="text-2xl font-bold">{fmt(totalArea)} m²</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Paintable Area</div>
          <div className="text-2xl font-bold">{fmt(totalPaintable)} m²</div>
        </Card>
      </div>

      {/* Building cards */}
      {buildings.length === 0 ? (
        <Card className="p-8 text-center">
          <Building2 className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No buildings found for this project.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {buildings.map((b) => (
            <BuildingCard key={b.id} building={b} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}
