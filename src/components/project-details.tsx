'use client';

import { useState } from 'react';
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
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const statusColors = {
  Draft: 'bg-gray-100 text-gray-800 border-gray-300',
  Active: 'bg-blue-100 text-blue-800 border-blue-300',
  Completed: 'bg-green-100 text-green-800 border-green-300',
  'On Hold': 'bg-yellow-100 text-yellow-800 border-yellow-300',
  Cancelled: 'bg-red-100 text-red-800 border-red-300',
};

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
  const formatDate = (date: string | null) => {
    if (!date) return null;
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${day}/${month}/${year}`;
  };

  const formatCurrency = (amount: number | null) => {
    if (!amount) return null;
    return `$${amount.toLocaleString()}`;
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto p-6 lg:p-8 space-y-8 max-lg:pt-20">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/projects">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="size-5" />
              </Button>
            </Link>
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

          {/* Financial */}
          <CollapsibleSection title="Financial Information" icon={DollarSign}>
            <dl className="space-y-0">
              <InfoRow label="Contract Value" value={formatCurrency(project.contractValue)} />
              <InfoRow label="Incoterm" value={project.incoterm} />
              <InfoRow label="Down Payment" value={formatCurrency(project.downPayment)} />
              <InfoRow label="Down Payment Ack" value={project.downPaymentAck} />
              {[2, 3, 4, 5, 6].map((num) => {
                const payment = (project as any)[`payment${num}`];
                const ack = (project as any)[`payment${num}Ack`];
                if (!payment) return null;
                return (
                  <div key={num}>
                    <InfoRow label={`Payment ${num}`} value={formatCurrency(payment)} />
                    <InfoRow label={`Payment ${num} Ack`} value={ack} />
                  </div>
                );
              })}
              <InfoRow label="Preliminary Retention" value={formatCurrency(project.preliminaryRetention)} />
              <InfoRow label="H.O Retention" value={formatCurrency(project.hoRetention)} />
            </dl>
          </CollapsibleSection>

          {/* Technical Specifications */}
          <CollapsibleSection title="Technical Specifications" icon={Settings}>
            <dl className="space-y-0">
              <InfoRow label="Erection Subcontractor" value={project.erectionSubcontractor} />
              <InfoRow label="Contractual Tonnage" value={project.contractualTonnage} />
              <InfoRow label="Engineering Tonnage" value={project.engineeringTonnage} />
              <InfoRow label="Cranes Included" value={project.cranesIncluded} />
              <InfoRow label="Surveyor Our Scope" value={project.surveyorOurScope} />
              <InfoRow label="Galvanized" value={project.galvanized} />
              {project.galvanized && (
                <>
                  <InfoRow label="Galvanization Microns" value={project.galvanizationMicrons} />
                  <InfoRow label="Area (m²)" value={project.area} />
                  <InfoRow label="m²/Ton" value={project.m2PerTon} />
                </>
              )}
              <InfoRow label="Welding Process" value={project.weldingProcess} />
              <InfoRow label="Welding Wire AWS Class" value={project.weldingWireAwsClass} />
              <InfoRow label="PQR Number" value={project.pqrNumber} />
              <InfoRow label="WPS Number" value={project.wpsNumber} />
              <InfoRow label="Standard Code" value={project.standardCode} />
              <InfoRow label="3rd Party Required" value={project.thirdPartyRequired} />
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
    </main>
  );
}
