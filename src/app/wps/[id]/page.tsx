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
import { Edit, FileText, CheckCircle, Clock } from 'lucide-react';

export default async function WPSDetailsPage({ params }: { params: { id: string } }) {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;

  if (!session) {
    redirect('/login');
  }

  const wps = await prisma.wPS.findUnique({
    where: { id: params.id },
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
              <h1 className="text-3xl font-bold tracking-tight">{wps.wpsNumber}</h1>
              <span className="text-lg text-muted-foreground">Rev. {wps.revision}</span>
              <div className={`flex items-center gap-1 px-3 py-1 rounded-md border text-sm font-medium ${getStatusColor(wps.status)}`}>
                {getStatusIcon(wps.status)}
                {wps.status}
              </div>
            </div>
            <p className="text-muted-foreground">
              Welding Procedure Specification - AWS D1.1 / D17.1
            </p>
          </div>
          <div className="flex gap-2">
            {wps.status === 'Draft' && (
              <Link href={`/wps/${wps.id}/edit`}>
                <Button>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              </Link>
            )}
            <Button variant="outline">
              <FileText className="mr-2 h-4 w-4" />
              Export PDF
            </Button>
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
                <p className="text-sm text-muted-foreground">Project Number</p>
                <p className="font-medium">{wps.project.projectNumber}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Project Name</p>
                <p className="font-medium">{wps.project.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Client</p>
                <p className="font-medium">{wps.project.client.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Type</p>
                <p className="font-medium">{wps.type === 'STANDARD' ? 'HEXA Standard' : 'Client Custom'}</p>
              </div>
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
                <p className="font-medium">{wps.weldingProcess}</p>
              </div>
              {wps.supportingPQR && (
                <div>
                  <p className="text-sm text-muted-foreground">Supporting PQR</p>
                  <p className="font-medium">{wps.supportingPQR}</p>
                </div>
              )}
              {wps.dateIssued && (
                <div>
                  <p className="text-sm text-muted-foreground">Date Issued</p>
                  <p className="font-medium">{new Date(wps.dateIssued).toLocaleDateString()}</p>
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
              {wps.baseMaterial && (
                <div className="md:col-span-2">
                  <p className="text-sm text-muted-foreground">Base Material</p>
                  <p className="font-medium">{wps.baseMaterial}</p>
                </div>
              )}
              {wps.thicknessGroove && (
                <div>
                  <p className="text-sm text-muted-foreground">Thickness - Groove</p>
                  <p className="font-medium">{wps.thicknessGroove} in</p>
                </div>
              )}
              {wps.thicknessFillet && (
                <div>
                  <p className="text-sm text-muted-foreground">Thickness - Fillet</p>
                  <p className="font-medium">{wps.thicknessFillet} in</p>
                </div>
              )}
              {wps.diameter && (
                <div>
                  <p className="text-sm text-muted-foreground">Diameter</p>
                  <p className="font-medium">{wps.diameter} in</p>
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
              {wps.fillerMetalSpec && (
                <div>
                  <p className="text-sm text-muted-foreground">Filler Metal Specification</p>
                  <p className="font-medium">{wps.fillerMetalSpec}</p>
                </div>
              )}
              {wps.fillerClass && (
                <div>
                  <p className="text-sm text-muted-foreground">Filler Metal Classification</p>
                  <p className="font-medium">{wps.fillerClass}</p>
                </div>
              )}
              {wps.shieldingGas && (
                <div>
                  <p className="text-sm text-muted-foreground">Shielding Gas</p>
                  <p className="font-medium">{wps.shieldingGas}</p>
                </div>
              )}
              {wps.flowRate && (
                <div>
                  <p className="text-sm text-muted-foreground">Flow Rate</p>
                  <p className="font-medium">{wps.flowRate} CFH</p>
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
              {wps.currentType && (
                <div>
                  <p className="text-sm text-muted-foreground">Current Type</p>
                  <p className="font-medium">{wps.currentType}</p>
                </div>
              )}
              {wps.preheatTempMin && (
                <div>
                  <p className="text-sm text-muted-foreground">Preheat Temperature Min</p>
                  <p className="font-medium">{wps.preheatTempMin}°F</p>
                </div>
              )}
              {wps.interpassTempMin && (
                <div>
                  <p className="text-sm text-muted-foreground">Interpass Temperature Min</p>
                  <p className="font-medium">{wps.interpassTempMin}°F</p>
                </div>
              )}
              {wps.interpassTempMax && (
                <div>
                  <p className="text-sm text-muted-foreground">Interpass Temperature Max</p>
                  <p className="font-medium">{wps.interpassTempMax}°F</p>
                </div>
              )}
              {wps.postWeldTemp && (
                <div>
                  <p className="text-sm text-muted-foreground">Post-Weld Temperature</p>
                  <p className="font-medium">{wps.postWeldTemp}°F</p>
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
              {wps.position && (
                <div>
                  <p className="text-sm text-muted-foreground">Position</p>
                  <p className="font-medium">{wps.position}</p>
                </div>
              )}
              {wps.jointType && (
                <div>
                  <p className="text-sm text-muted-foreground">Joint Type</p>
                  <p className="font-medium">{wps.jointType}</p>
                </div>
              )}
              {wps.grooveAngle && (
                <div>
                  <p className="text-sm text-muted-foreground">Groove Angle</p>
                  <p className="font-medium">{wps.grooveAngle}°</p>
                </div>
              )}
              {wps.rootOpening && (
                <div>
                  <p className="text-sm text-muted-foreground">Root Opening</p>
                  <p className="font-medium">{wps.rootOpening} in</p>
                </div>
              )}
              {wps.backingType && (
                <div>
                  <p className="text-sm text-muted-foreground">Backing Type</p>
                  <p className="font-medium">{wps.backingType}</p>
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
              {wps.passes.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No welding passes defined</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Layer</TableHead>
                        <TableHead>Process</TableHead>
                        <TableHead>Electrode Class</TableHead>
                        <TableHead>Diameter (in)</TableHead>
                        <TableHead>Polarity</TableHead>
                        <TableHead>Amperage</TableHead>
                        <TableHead>Voltage</TableHead>
                        <TableHead>Travel Speed (in/min)</TableHead>
                        <TableHead>Heat Input (kJ/in)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {wps.passes.map((pass) => (
                        <TableRow key={pass.id}>
                          <TableCell className="font-medium">{pass.layerNo}</TableCell>
                          <TableCell>{pass.process}</TableCell>
                          <TableCell>{pass.electrodeClass || '-'}</TableCell>
                          <TableCell>{pass.diameter || '-'}</TableCell>
                          <TableCell>{pass.polarity || '-'}</TableCell>
                          <TableCell>{pass.amperage || '-'}</TableCell>
                          <TableCell>{pass.voltage || '-'}</TableCell>
                          <TableCell>{pass.travelSpeed || '-'}</TableCell>
                          <TableCell>{pass.heatInput || '-'}</TableCell>
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
                <p className="font-medium">{wps.preparedBy.name}</p>
                {wps.preparedBy.position && (
                  <p className="text-xs text-muted-foreground">{wps.preparedBy.position}</p>
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Approved By</p>
                <p className="font-medium">{wps.approvedBy?.name || 'Pending Approval'}</p>
                {wps.approvedBy?.position && (
                  <p className="text-xs text-muted-foreground">{wps.approvedBy.position}</p>
                )}
              </div>
              {wps.clientApprovedBy && (
                <div>
                  <p className="text-sm text-muted-foreground">Client Approved By</p>
                  <p className="font-medium">{wps.clientApprovedBy}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Remarks */}
          {wps.remarks && (
            <Card>
              <CardHeader>
                <CardTitle>Remarks</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{wps.remarks}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </main>
  );
}
