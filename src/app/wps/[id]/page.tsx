import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Edit, CheckCircle, Clock } from 'lucide-react';
import { WPSExportButton } from '@/components/wps-export-button';

export default async function WPSDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;

  if (!session) {
    redirect('/login');
  }

  const wps = await prisma.wPS.findUnique({
    where: { id },
    include: {
      project: {
        select: {
          id: true,
          projectNumber: true,
          name: true,
          client: {
            select: { name: true },
          },
        },
      },
      preparedBy: {
        select: { id: true, name: true, email: true, position: true },
      },
      approvedBy: {
        select: { id: true, name: true, email: true, position: true },
      },
      passes: {
        orderBy: { layerNo: 'asc' },
      },
    },
  });

  if (!wps) {
    notFound();
  }

  // Convert Prisma Decimal to number for client components
  const wpsData = {
    ...wps,
    materialThickness: wps.materialThickness ? Number(wps.materialThickness) : null,
    thicknessGroove: wps.thicknessGroove ? Number(wps.thicknessGroove) : null,
    thicknessFillet: wps.thicknessFillet ? Number(wps.thicknessFillet) : null,
    diameter: wps.diameter ? Number(wps.diameter) : null,
    flowRate: wps.flowRate ? Number(wps.flowRate) : null,
    grooveAngle: wps.grooveAngle ? Number(wps.grooveAngle) : null,
    rootOpening: wps.rootOpening ? Number(wps.rootOpening) : null,
    passes: wps.passes?.map(pass => ({
      ...pass,
      diameter: Number(pass.diameter),
      travelSpeed: Number(pass.travelSpeed),
      heatInput: Number(pass.heatInput),
    })) || [],
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Approved':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'Draft':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Draft':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 lg:ml-64">
      <div className="container mx-auto p-6 lg:p-8 max-w-7xl max-lg:pt-20">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold tracking-tight">{wpsData.wpsNumber}</h1>
              <span className="text-lg text-muted-foreground">Rev. {wpsData.revision}</span>
              <div className={`flex items-center gap-1 px-3 py-1 rounded-md border text-sm font-medium ${getStatusColor(wpsData.status)}`}>
                {getStatusIcon(wpsData.status)}
                {wpsData.status}
              </div>
            </div>
            <p className="text-muted-foreground">
              Welding Procedure Specification - AWS D1.1 / D17.1
            </p>
          </div>
          <div className="flex gap-2">
            {wpsData.status === 'Draft' && (
              <Link href={`/wps/${wpsData.id}/edit`}>
                <Button>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              </Link>
            )}
            <WPSExportButton wps={wpsData} />
          </div>
        </div>

        <div className="space-y-6">
          {/* Project Information */}
          <Card>
            <CardHeader>
              <CardTitle>Project Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Project</p>
                <p className="font-medium">{wpsData.project.projectNumber} - {wpsData.project.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Client</p>
                <p className="font-medium">{wpsData.project.client.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Process</p>
                <p className="font-medium">{wpsData.weldingProcess}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Supporting PQR</p>
                <p className="font-medium">{wpsData.supportingPQR || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Prepared By</p>
                <p className="font-medium">{wpsData.preparedBy.name}</p>
              </div>
              {wpsData.approvedBy && (
                <div>
                  <p className="text-sm text-muted-foreground">Approved By</p>
                  <p className="font-medium">{wpsData.approvedBy.name}</p>
                </div>
              )}
              {wpsData.dateIssued && (
                <div>
                  <p className="text-sm text-muted-foreground">Date Issued</p>
                  <p className="font-medium">{new Date(wpsData.dateIssued).toLocaleDateString()}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* General Information */}
          <Card>
            <CardHeader>
              <CardTitle>General Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Welding Process</p>
                <p className="font-medium">{wpsData.weldingProcess}</p>
              </div>
              {wpsData.supportingPQR && (
                <div>
                  <p className="text-sm text-muted-foreground">Supporting PQR</p>
                  <p className="font-medium">{wpsData.supportingPQR}</p>
                </div>
              )}
              {wpsData.dateIssued && (
                <div>
                  <p className="text-sm text-muted-foreground">Date Issued</p>
                  <p className="font-medium">{new Date(wpsData.dateIssued).toLocaleDateString()}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Joint Diagram */}
          {wpsData.jointDiagram && (
            <Card>
              <CardHeader>
                <CardTitle>Joint Diagram</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-center">
                  <a 
                    href={wpsData.jointDiagram} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="cursor-pointer hover:opacity-80 transition-opacity"
                  >
                    <img 
                      src={wpsData.jointDiagram} 
                      alt="Joint Diagram" 
                      className="max-w-md h-auto rounded-lg border shadow-sm hover:shadow-md transition-shadow"
                      title="Click to enlarge"
                    />
                  </a>
                </div>
                <p className="text-xs text-center text-muted-foreground mt-2">
                  Click image to view full size
                </p>
              </CardContent>
            </Card>
          )}

          {/* Backing & Type */}
          <Card>
            <CardHeader>
              <CardTitle>Backing & Type</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {wpsData.backingUsed && (
                <div>
                  <p className="text-sm text-muted-foreground">Backing</p>
                  <p className="font-medium">{wpsData.backingUsed}</p>
                </div>
              )}
              {wpsData.backingType2 && (
                <div>
                  <p className="text-sm text-muted-foreground">Type</p>
                  <p className="font-medium">{wpsData.backingType2}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Base Metal */}
          <Card>
            <CardHeader>
              <CardTitle>Base Metal</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {wpsData.materialSpec && (
                <div className="md:col-span-2">
                  <p className="text-sm text-muted-foreground">Material Spec:</p>
                  <p className="font-medium">{wpsData.materialSpec}</p>
                </div>
              )}
              {wpsData.materialGroup && (
                <div>
                  <p className="text-sm text-muted-foreground">Material Group:</p>
                  <p className="font-medium">{wpsData.materialGroup}</p>
                </div>
              )}
              {wpsData.thicknessRange && (
                <div>
                  <p className="text-sm text-muted-foreground">Thick. Range (mm):</p>
                  <p className="font-medium">{wpsData.thicknessRange}</p>
                </div>
              )}
              {wpsData.baseMetalGroove && (
                <div>
                  <p className="text-sm text-muted-foreground">Base Metal: Groove:</p>
                  <p className="font-medium">{wpsData.baseMetalGroove}</p>
                </div>
              )}
              {wpsData.baseMetalFillet && (
                <div>
                  <p className="text-sm text-muted-foreground">Fillet:</p>
                  <p className="font-medium">{wpsData.baseMetalFillet}</p>
                </div>
              )}
              {wpsData.materialThickness && (
                <div>
                  <p className="text-sm text-muted-foreground">Material Thick (mm)</p>
                  <p className="font-medium">{Number(wpsData.materialThickness)} mm</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Filler Metal */}
          <Card>
            <CardHeader>
              <CardTitle>Filler Metal & Shielding</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {wpsData.fillerMetalSpec && (
                <div>
                  <p className="text-sm text-muted-foreground">Filler Metal Specification</p>
                  <p className="font-medium">{wpsData.fillerMetalSpec}</p>
                </div>
              )}
              {wpsData.fillerClass && (
                <div>
                  <p className="text-sm text-muted-foreground">Filler Metal Classification</p>
                  <p className="font-medium">{wpsData.fillerClass}</p>
                </div>
              )}
              {wpsData.shieldingGas && (
                <div>
                  <p className="text-sm text-muted-foreground">Shielding Gas</p>
                  <p className="font-medium">{wpsData.shieldingGas}</p>
                </div>
              )}
              {wpsData.flowRate && (
                <div>
                  <p className="text-sm text-muted-foreground">Flow Rate</p>
                  <p className="font-medium">{Number(wpsData.flowRate)} L/min</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Electrical Characteristics */}
          <Card>
            <CardHeader>
              <CardTitle>Electrical Characteristics & Temperature</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {wpsData.currentType && (
                <div>
                  <p className="text-sm text-muted-foreground">Current Type</p>
                  <p className="font-medium">{wpsData.currentType}</p>
                </div>
              )}
              {wpsData.preheatTempMin && (
                <div>
                  <p className="text-sm text-muted-foreground">Preheat Temperature Min</p>
                  <p className="font-medium">{wpsData.preheatTempMin}°C</p>
                </div>
              )}
              {wpsData.interpassTempMin && (
                <div>
                  <p className="text-sm text-muted-foreground">Interpass Temperature Min</p>
                  <p className="font-medium">{wpsData.interpassTempMin}°C</p>
                </div>
              )}
              {wpsData.interpassTempMax && (
                <div>
                  <p className="text-sm text-muted-foreground">Interpass Temperature Max</p>
                  <p className="font-medium">{wpsData.interpassTempMax}°C</p>
                </div>
              )}
              {wpsData.postWeldTemp && (
                <div>
                  <p className="text-sm text-muted-foreground">Post-Weld Temperature</p>
                  <p className="font-medium">{wpsData.postWeldTemp}°C</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Technique */}
          <Card>
            <CardHeader>
              <CardTitle>Welding Technique</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {wpsData.position && (
                <div>
                  <p className="text-sm text-muted-foreground">Position</p>
                  <p className="font-medium">{wpsData.position}</p>
                </div>
              )}
              {wpsData.jointType && (
                <div>
                  <p className="text-sm text-muted-foreground">Joint Type</p>
                  <p className="font-medium">{wpsData.jointType}</p>
                </div>
              )}
              {wpsData.grooveAngle && (
                <div>
                  <p className="text-sm text-muted-foreground">Groove Angle</p>
                  <p className="font-medium">{wpsData.grooveAngle}°</p>
                </div>
              )}
              {wpsData.rootOpening && (
                <div>
                  <p className="text-sm text-muted-foreground">Root Opening</p>
                  <p className="font-medium">{Number(wpsData.rootOpening)} mm</p>
                </div>
              )}
              {wpsData.backingType && (
                <div>
                  <p className="text-sm text-muted-foreground">Backing Type</p>
                  <p className="font-medium">{wpsData.backingType}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Welding Passes */}
          <Card>
            <CardHeader>
              <CardTitle>Welding Pass Details</CardTitle>
            </CardHeader>
            <CardContent>
              {wpsData.passes.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No welding passes defined</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Layer</TableHead>
                        <TableHead>Process</TableHead>
                        <TableHead>Electrode Class</TableHead>
                        <TableHead>Diameter (mm)</TableHead>
                        <TableHead>Polarity</TableHead>
                        <TableHead>Amperage</TableHead>
                        <TableHead>Voltage</TableHead>
                        <TableHead>Travel Speed (mm/min)</TableHead>
                        <TableHead>Heat Input (kJ/mm)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {wpsData.passes.map((pass) => (
                        <TableRow key={pass.id}>
                          <TableCell className="font-medium">{pass.layerNo}</TableCell>
                          <TableCell>{pass.process}</TableCell>
                          <TableCell>{pass.electrodeClass || '-'}</TableCell>
                          <TableCell>{pass.diameter ? Number(pass.diameter) : '-'}</TableCell>
                          <TableCell>{pass.polarity || '-'}</TableCell>
                          <TableCell>{pass.amperage || '-'}</TableCell>
                          <TableCell>{pass.voltage || '-'}</TableCell>
                          <TableCell>{pass.travelSpeed ? Number(pass.travelSpeed) : '-'}</TableCell>
                          <TableCell>{pass.heatInput ? Number(pass.heatInput) : '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Approval Information */}
          <Card>
            <CardHeader>
              <CardTitle>Approval Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Prepared By</p>
                <p className="font-medium">{wpsData.preparedBy.name}</p>
                {wpsData.preparedBy.position && (
                  <p className="text-xs text-muted-foreground">{wpsData.preparedBy.position}</p>
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Approved By</p>
                <p className="font-medium">{wpsData.approvedBy?.name || 'Pending Approval'}</p>
                {wpsData.approvedBy?.position && (
                  <p className="text-xs text-muted-foreground">{wpsData.approvedBy.position}</p>
                )}
              </div>
              {wpsData.clientApprovedBy && (
                <div>
                  <p className="text-sm text-muted-foreground">Client Approved By</p>
                  <p className="font-medium">{wpsData.clientApprovedBy}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Remarks */}
          {wpsData.remarks && (
            <Card>
              <CardHeader>
                <CardTitle>Remarks</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{wpsData.remarks}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </main>
  );
}
