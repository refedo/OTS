'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Package, Activity, Trash2, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

type AssemblyPart = {
  id: string;
  partDesignation: string;
  assemblyMark: string;
  subAssemblyMark: string | null;
  partMark: string;
  quantity: number;
  name: string;
  profile: string | null;
  grade: string | null;
  lengthMm: number | null;
  netAreaPerUnit: number | null;
  netAreaTotal: number | null;
  singlePartWeight: number | null;
  netWeightTotal: number | null;
  status: string;
  currentProcess: string | null;
  createdAt: string;
  updatedAt: string;
  project: { id: string; name: string; projectNumber: string };
  building: { id: string; name: string; designation: string } | null;
  productionLogs: ProductionLog[];
};

type ProductionLog = {
  id: string;
  processType: string;
  dateProcessed: string;
  processedQty: number;
  remainingQty: number;
  processingTeam: string | null;
  processingLocation: string | null;
  remarks: string | null;
  createdAt: string;
};

export default function AssemblyPartDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const [part, setPart] = useState<AssemblyPart | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchPartDetails();
    }
  }, [params.id]);

  const fetchPartDetails = async () => {
    try {
      const response = await fetch(`/api/production/assembly-parts/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setPart(data);
      } else {
        alert('Failed to load part details');
      }
    } catch (error) {
      console.error('Error fetching part details:', error);
      alert('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const response = await fetch(`/api/production/assembly-parts/${params.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        router.push('/production/assembly-parts');
      } else {
        alert('Failed to delete part');
      }
    } catch (error) {
      console.error('Error deleting part:', error);
      alert('An error occurred');
    } finally {
      setDeleting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'In Progress':
        return <Clock className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'In Progress':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 lg:ml-64">
        <div className="container mx-auto p-6 lg:p-8 max-w-7xl max-lg:pt-20">
          <p className="text-center text-muted-foreground">Loading...</p>
        </div>
      </main>
    );
  }

  if (!part) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 lg:ml-64">
        <div className="container mx-auto p-6 lg:p-8 max-w-7xl max-lg:pt-20">
          <p className="text-center text-muted-foreground">Part not found</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 lg:ml-64">
      <div className="container mx-auto p-6 lg:p-8 max-w-7xl max-lg:pt-20">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/production/assembly-parts">
              <Button variant="outline" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                <Package className="h-8 w-8" />
                {part.partDesignation}
              </h1>
              <p className="text-muted-foreground mt-1">{part.name}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {part.status !== 'Completed' && (
              <Link href={`/production/log?partId=${part.id}`}>
                <Button>
                  <Activity className="mr-2 h-4 w-4" />
                  Log Production
                </Button>
              </Link>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={deleting}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Assembly Part</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this part? This action cannot be undone and
                    will also delete all associated production logs.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Part Designation</p>
                    <p className="font-medium">{part.partDesignation}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border text-xs font-medium ${getStatusColor(part.status)}`}>
                      {getStatusIcon(part.status)}
                      {part.status}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Assembly Mark</p>
                    <p className="font-medium">{part.assemblyMark}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Part Mark</p>
                    <p className="font-medium">{part.partMark}</p>
                  </div>
                  {part.subAssemblyMark && (
                    <div>
                      <p className="text-sm text-muted-foreground">Sub-Assembly Mark</p>
                      <p className="font-medium">{part.subAssemblyMark}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground">Quantity</p>
                    <p className="font-medium">{part.quantity} units</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Project & Building */}
            <Card>
              <CardHeader>
                <CardTitle>Project & Building</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Project</p>
                    <p className="font-medium">{part.project.name}</p>
                    <p className="text-xs text-muted-foreground">#{part.project.projectNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Building</p>
                    <p className="font-medium">{part.building?.name || 'N/A'}</p>
                    {part.building && (
                      <p className="text-xs text-muted-foreground">{part.building.designation}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Technical Specifications */}
            <Card>
              <CardHeader>
                <CardTitle>Technical Specifications</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {part.profile && (
                    <div>
                      <p className="text-sm text-muted-foreground">Profile</p>
                      <p className="font-medium">{part.profile}</p>
                    </div>
                  )}
                  {part.grade && (
                    <div>
                      <p className="text-sm text-muted-foreground">Grade</p>
                      <p className="font-medium">{part.grade}</p>
                    </div>
                  )}
                  {part.lengthMm && (
                    <div>
                      <p className="text-sm text-muted-foreground">Length</p>
                      <p className="font-medium">{part.lengthMm} mm</p>
                    </div>
                  )}
                  {part.singlePartWeight && (
                    <div>
                      <p className="text-sm text-muted-foreground">Single Part Weight</p>
                      <p className="font-medium">{part.singlePartWeight} kg</p>
                    </div>
                  )}
                  {part.netWeightTotal && (
                    <div>
                      <p className="text-sm text-muted-foreground">Total Weight</p>
                      <p className="font-medium">{part.netWeightTotal} kg</p>
                    </div>
                  )}
                  {part.netAreaPerUnit && (
                    <div>
                      <p className="text-sm text-muted-foreground">Area Per Unit</p>
                      <p className="font-medium">{part.netAreaPerUnit} m²</p>
                    </div>
                  )}
                  {part.netAreaTotal && (
                    <div>
                      <p className="text-sm text-muted-foreground">Total Area</p>
                      <p className="font-medium">{part.netAreaTotal} m²</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Production Logs */}
            <Card>
              <CardHeader>
                <CardTitle>Production History</CardTitle>
              </CardHeader>
              <CardContent>
                {part.productionLogs.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No production logs yet
                  </p>
                ) : (
                  <div className="space-y-4">
                    {part.productionLogs.map((log) => (
                      <div key={log.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-medium">{log.processType}</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(log.dateProcessed).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">
                              Processed: {log.processedQty} units
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Remaining: {log.remainingQty} units
                            </p>
                          </div>
                        </div>
                        {(log.processingTeam || log.processingLocation) && (
                          <div className="grid grid-cols-2 gap-4 text-sm mt-2">
                            {log.processingTeam && (
                              <div>
                                <p className="text-muted-foreground">Team</p>
                                <p>{log.processingTeam}</p>
                              </div>
                            )}
                            {log.processingLocation && (
                              <div>
                                <p className="text-muted-foreground">Location</p>
                                <p>{log.processingLocation}</p>
                              </div>
                            )}
                          </div>
                        )}
                        {log.remarks && (
                          <div className="mt-2 text-sm">
                            <p className="text-muted-foreground">Remarks</p>
                            <p>{log.remarks}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status Card */}
            <Card>
              <CardHeader>
                <CardTitle>Current Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Status</p>
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-md border ${getStatusColor(part.status)}`}>
                    {getStatusIcon(part.status)}
                    <span className="font-medium">{part.status}</span>
                  </div>
                </div>
                {part.currentProcess && (
                  <div>
                    <p className="text-sm text-muted-foreground">Current Process</p>
                    <p className="font-medium">{part.currentProcess}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Production Logs</p>
                  <p className="font-medium">{part.productionLogs.length}</p>
                </div>
              </CardContent>
            </Card>

            {/* Metadata */}
            <Card>
              <CardHeader>
                <CardTitle>Metadata</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Created</p>
                  <p>{new Date(part.createdAt).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Last Updated</p>
                  <p>{new Date(part.updatedAt).toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
