'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
} from 'lucide-react';
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

function getRalColor(ralNumber: string): string {
  // Remove any non-numeric characters and get the RAL number
  const cleanRal = ralNumber.replace(/[^0-9]/g, '');
  return ralColors[cleanRal] || '#CCCCCC'; // Default to gray if not found
}

type ProjectDetailsProps = {
  project: any;
};

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

export function ProjectDetails({ project }: ProjectDetailsProps) {
  const router = useRouter();
  const { showAlert, AlertDialog } = useAlert();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [navigation, setNavigation] = useState<{ previousId: string | null; nextId: string | null }>({ previousId: null, nextId: null });
  const [isLoadingNav, setIsLoadingNav] = useState(true);

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

  const formatCurrency = (amount: number | null) => {
    if (!amount) return null;
    const formatted = new Intl.NumberFormat('en-SA', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
    return `${formatted} ﷼`;
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
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto p-6 lg:p-8 space-y-8 max-lg:pt-20">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Link href="/projects">
                <Button variant="ghost" size="icon" title="Back to list">
                  <ArrowLeft className="size-5" />
                </Button>
              </Link>
              <div className="h-6 w-px bg-border mx-1" />
              <Link href={navigation.previousId ? `/projects/${navigation.previousId}` : '#'}>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  disabled={!navigation.previousId || isLoadingNav}
                  title="Previous project"
                >
                  <ChevronLeft className="size-5" />
                </Button>
              </Link>
              <Link href={navigation.nextId ? `/projects/${navigation.nextId}` : '#'}>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  disabled={!navigation.nextId || isLoadingNav}
                  title="Next project"
                >
                  <ChevronRightIcon className="size-5" />
                </Button>
              </Link>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="font-mono">
                  {project.projectNumber}
                </Badge>
                <Badge
                  variant="outline"
                  className={cn('border', statusColors[project.status as keyof typeof statusColors])}
                >
                  {project.status}
                </Badge>
              </div>
              <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
              <p className="text-muted-foreground mt-1">
                {project.client.name} • {project.projectManager.name}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Link href={`/projects/${project.id}/timeline`}>
              <Button variant="outline">
                <Clock className="size-4" />
                Timeline
              </Button>
            </Link>
            <Link href={`/projects/${project.id}/edit`}>
              <Button>
                <Edit className="size-4" />
                Edit Project
              </Button>
            </Link>
            <Button 
              variant="destructive"
              onClick={() => setShowDeleteDialog(true)}
              disabled={isDeleting}
            >
              <Trash2 className="size-4" />
              Delete
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Building2 className="size-4" />
                <span className="text-sm">Buildings</span>
              </div>
              <p className="text-2xl font-bold">{project._count.buildings}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <FileText className="size-4" />
                <span className="text-sm">Tasks</span>
              </div>
              <p className="text-2xl font-bold">{project._count.tasks}</p>
            </CardContent>
          </Card>

          {project.contractValue && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <DollarSign className="size-4" />
                  <span className="text-sm">Contract Value</span>
                </div>
                <p className="text-2xl font-bold">{formatCurrency(project.contractValue)}</p>
              </CardContent>
            </Card>
          )}

          {(project.contractualTonnage || project.engineeringTonnage) && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Settings className="size-4" />
                  <span className="text-sm">Tonnage</span>
                </div>
                <div className="space-y-1">
                  {project.contractualTonnage && (
                    <p className="text-lg font-semibold">{project.contractualTonnage} tons (Contractual)</p>
                  )}
                  {project.engineeringTonnage && (
                    <p className="text-sm text-muted-foreground">{project.engineeringTonnage} tons (Engineering)</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {project.plannedStartDate && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Calendar className="size-4" />
                  <span className="text-sm">Start Date</span>
                </div>
                <p className="text-lg font-semibold">{formatDate(project.plannedStartDate)}</p>
              </CardContent>
            </Card>
          )}
        </div>

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
          <CollapsibleSection title="Dates & Durations" icon={Calendar}>
            <dl className="space-y-0">
              <InfoRow label="Contract Date" value={formatDate(project.contractDate)} />
              <InfoRow label="Down Payment Date" value={formatDate(project.downPaymentDate)} />
              <InfoRow label="Planned Start Date" value={formatDate(project.plannedStartDate)} />
              <InfoRow label="Planned End Date" value={formatDate(project.plannedEndDate)} />
              <InfoRow label="Actual Start Date" value={formatDate(project.actualStartDate)} />
              <InfoRow label="Actual End Date" value={formatDate(project.actualEndDate)} />
              <InfoRow label="Engineering Duration" value={project.engineeringDuration ? `${project.engineeringDuration} days` : null} />
              <InfoRow label="Fabrication & Delivery Duration" value={project.fabricationDeliveryDuration ? `${project.fabricationDeliveryDuration} days` : null} />
              <InfoRow label="Erection Duration" value={project.erectionDuration ? `${project.erectionDuration} days` : null} />
            </dl>
          </CollapsibleSection>

          {/* Financial & Payment Terms */}
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
              
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3 text-red-700 bg-red-50 px-3 py-2 rounded">Payment Schedule</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">Schedule</th>
                        <th className="px-3 py-2 text-left font-medium">Percentage</th>
                        <th className="px-3 py-2 text-left font-medium">Amount</th>
                        <th className="px-3 py-2 text-left font-medium">Terms</th>
                        <th className="px-3 py-2 text-left font-medium">Payment Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {/* Down Payment Row */}
                      {(project.downPaymentPercentage || project.downPayment || project.downPaymentMilestone) && (
                        <tr>
                          <td className="px-3 py-2 font-medium">Down Payment</td>
                          <td className="px-3 py-2">
                            {project.downPaymentPercentage ? `${project.downPaymentPercentage}%` : '-'}
                          </td>
                          <td className="px-3 py-2">
                            {formatCurrency(project.downPayment) || '-'}
                          </td>
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
                        if (!percentage && !payment && !milestone) return null;
                        
                        return (
                          <tr key={num}>
                            <td className="px-3 py-2 font-medium">Payment {num}</td>
                            <td className="px-3 py-2">{percentage ? `${percentage}%` : '-'}</td>
                            <td className="px-3 py-2">{formatCurrency(payment) || '-'}</td>
                            <td className="px-3 py-2">{milestone || '-'}</td>
                            <td className="px-3 py-2">-</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
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

          {/* Technical Specifications */}
          <CollapsibleSection title="Technical Specifications" icon={Settings} defaultOpen>
            <dl className="space-y-0">
              <InfoRow label="Erection Subcontractor" value={project.erectionSubcontractor} />
              <InfoRow label="Contractual Tonnage" value={project.contractualTonnage} />
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
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-700">Top Coat RAL:</span>
                        <span className="px-3 py-1 bg-white rounded-md border-2 border-slate-300 font-mono text-lg font-bold text-slate-900">
                          {project.topCoatRalNumber}
                        </span>
                      </div>
                      <div 
                        className="w-12 h-12 rounded-md border-2 border-slate-300 shadow-sm"
                        style={{ backgroundColor: getRalColor(project.topCoatRalNumber) }}
                        title={`RAL ${project.topCoatRalNumber}`}
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
