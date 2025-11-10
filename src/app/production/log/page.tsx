'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Activity, Loader2, CheckCircle, Search } from 'lucide-react';

type AssemblyPart = {
  id: string;
  partDesignation: string;
  assemblyMark: string;
  partMark: string;
  name: string;
  quantity: number;
  status: string;
  project: { name: string; galvanized: boolean };
  building: { name: string } | null;
  _count: { productionLogs: number };
};

type ProductionLog = {
  processedQty: number;
};

const PROCESS_TYPES = [
  'Preparation',
  'Fit-up',
  'Welding',
  'Visualization',
  'Sandblasting',
  'Painting',
  'Galvanization',
  'Dispatched to Sandblasting',
  'Dispatched to Galvanization',
  'Dispatched to Painting',
  'Dispatched to Site',
  'Dispatched to Customer',
  'Erection',
];

const DISPATCH_TYPE_CODES: { [key: string]: string } = {
  'Dispatched to Sandblasting': 'DSB',
  'Dispatched to Galvanization': 'DGL',
  'Dispatched to Painting': 'DPT',
  'Dispatched to Site': 'DST',
  'Dispatched to Customer': 'DCU',
};

export default function LogProductionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedPartId = searchParams.get('partId');

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [parts, setParts] = useState<AssemblyPart[]>([]);
  const [selectedPart, setSelectedPart] = useState<AssemblyPart | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [totalProcessedQty, setTotalProcessedQty] = useState(0);
  const [reportNumber, setReportNumber] = useState('');
  const [isManualReportNumber, setIsManualReportNumber] = useState(false);

  // Filter process types based on selected part's project galvanization setting
  const availableProcessTypes = useMemo(() => {
    if (!selectedPart) return PROCESS_TYPES;
    
    // If project is not galvanized, filter out galvanization-related processes
    if (!selectedPart.project.galvanized) {
      return PROCESS_TYPES.filter(
        type => type !== 'Galvanization' && type !== 'Dispatched to Galvanization'
      );
    }
    
    return PROCESS_TYPES;
  }, [selectedPart]);

  const [formData, setFormData] = useState({
    processType: 'Preparation',
    assemblyPartId: preselectedPartId || '',
    dateProcessed: new Date().toISOString().split('T')[0],
    processedQty: 1,
    processingTeam: '',
    processingLocation: '',
    remarks: '',
    reportNumber: '',
  });

  useEffect(() => {
    fetchParts();
  }, []);

  useEffect(() => {
    if (formData.assemblyPartId) {
      const part = parts.find((p) => p.id === formData.assemblyPartId);
      setSelectedPart(part || null);
      if (part) {
        setSearchQuery(part.partDesignation);
        fetchTotalProcessedQty(part.id, formData.processType);
      }
    } else {
      setSelectedPart(null);
      setTotalProcessedQty(0);
    }
  }, [formData.assemblyPartId, formData.processType, parts]);

  // Generate report number when process type or part changes
  useEffect(() => {
    const isDispatchProcess = formData.processType.startsWith('Dispatched');
    const isDispatchToCustomer = formData.processType === 'Dispatched to Customer';
    
    if (isDispatchProcess && selectedPart && !isDispatchToCustomer) {
      generateReportNumber();
      setIsManualReportNumber(false);
    } else if (isDispatchToCustomer) {
      setReportNumber('');
      setFormData(prev => ({ ...prev, reportNumber: '' }));
      setIsManualReportNumber(true);
    } else {
      setReportNumber('');
      setFormData(prev => ({ ...prev, reportNumber: '' }));
      setIsManualReportNumber(false);
    }
  }, [formData.processType, selectedPart]);

  const generateReportNumber = async () => {
    if (!selectedPart) return;

    try {
      const dispatchCode = DISPATCH_TYPE_CODES[formData.processType];
      if (!dispatchCode) return;

      const response = await fetch('/api/production/generate-report-number', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assemblyPartId: selectedPart.id,
          dispatchType: dispatchCode,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setReportNumber(data.reportNumber);
        setFormData(prev => ({ ...prev, reportNumber: data.reportNumber }));
      }
    } catch (error) {
      console.error('Error generating report number:', error);
    }
  };

  const filteredParts = useMemo(() => {
    if (!searchQuery) return parts;
    return parts.filter(part =>
      part.partDesignation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      part.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [parts, searchQuery]);

  const fetchTotalProcessedQty = async (partId: string, processType: string) => {
    try {
      const response = await fetch(`/api/production/assembly-parts/${partId}`);
      if (response.ok) {
        const data = await response.json();
        // Calculate total processed for THIS specific process type
        const total = data.productionLogs
          .filter((log: any) => log.processType === processType)
          .reduce((sum: number, log: ProductionLog) => sum + log.processedQty, 0);
        setTotalProcessedQty(total);
      }
    } catch (error) {
      console.error('Error fetching production logs:', error);
    }
  };

  const fetchParts = async () => {
    try {
      const response = await fetch('/api/production/assembly-parts');
      if (response.ok) {
        const data = await response.json();
        // Show all parts - they can be logged for different processes
        setParts(data);
      }
    } catch (error) {
      console.error('Error fetching parts:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);

    try {
      const response = await fetch('/api/production/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          processedQty: parseInt(formData.processedQty.toString()),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Failed to log production');
        return;
      }

      setSuccess(true);
      
      // Reset form
      setFormData({
        assemblyPartId: '',
        processType: 'Preparation',
        dateProcessed: new Date().toISOString().split('T')[0],
        processedQty: 1,
        processingTeam: '',
        processingLocation: '',
        remarks: '',
        reportNumber: '',
      });

      setTimeout(() => {
        router.push('/production/assembly-parts');
      }, 2000);
    } catch (error) {
      console.error('Error logging production:', error);
      alert('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Activity className="h-8 w-8" />
            Log Production Activity
          </h1>
          <p className="text-muted-foreground mt-1">
            Record production process for assembly parts
          </p>
        </div>

        {success && (
          <Card className="mb-6 border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-6 w-6 text-green-600" />
                <div>
                  <p className="font-semibold text-green-900">Production logged successfully!</p>
                  <p className="text-sm text-green-700">Redirecting to assembly parts list...</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* Process Selection - FIRST */}
            <Card>
              <CardHeader>
                <CardTitle>1. Select Process Type</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="processTypeFirst">Process Type *</Label>
                  <select
                    id="processTypeFirst"
                    value={formData.processType}
                    onChange={(e) =>
                      setFormData({ ...formData, processType: e.target.value, reportNumber: '', assemblyPartId: '' })
                    }
                    required
                    disabled={loading}
                    className="w-full h-10 px-3 rounded-md border bg-background"
                  >
                    {availableProcessTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">
                    Select the process type first to see available parts and their balance for this process
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Part Selection - SECOND */}
            <Card>
              <CardHeader>
                <CardTitle>2. Select Assembly Part</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 relative">
                  <Label htmlFor="assemblyPartId">Assembly Part *</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="assemblyPartId"
                      placeholder="Search by part designation or name..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setShowDropdown(true);
                      }}
                      onFocus={() => setShowDropdown(true)}
                      disabled={loading}
                      className="pl-10"
                    />
                  </div>
                  
                  {showDropdown && filteredParts.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {filteredParts.map((part) => (
                        <div
                          key={part.id}
                          onClick={() => {
                            setFormData({ ...formData, assemblyPartId: part.id });
                            setSearchQuery(part.partDesignation);
                            setShowDropdown(false);
                          }}
                          className="p-3 hover:bg-muted cursor-pointer border-b last:border-b-0"
                        >
                          <div className="font-medium">{part.partDesignation}</div>
                          <div className="text-sm text-muted-foreground">
                            {part.name} • {part.quantity} units • {part._count.productionLogs} logs
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {selectedPart && (
                  <div className="bg-muted p-4 rounded-lg space-y-2">
                    <p className="text-sm">
                      <span className="font-medium">Project:</span> {selectedPart.project.name}
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">Building:</span>{' '}
                      {selectedPart.building?.name || 'N/A'}
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">Total Quantity:</span> {selectedPart.quantity} units
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">Processed for {formData.processType}:</span>{' '}
                      {totalProcessedQty} units
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">Remaining for {formData.processType}:</span>{' '}
                      <span className="text-primary font-semibold">
                        {selectedPart.quantity - totalProcessedQty} units
                      </span>
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Process Details */}
            <Card>
              <CardHeader>
                <CardTitle>Process Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="processType">Process Type *</Label>
                    <select
                      id="processType"
                      value={formData.processType}
                      onChange={(e) =>
                        setFormData({ ...formData, processType: e.target.value, reportNumber: '' })
                      }
                      required
                      disabled={loading}
                      className="w-full h-10 px-3 rounded-md border bg-background"
                    >
                      {PROCESS_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>

                  {formData.processType.startsWith('Dispatched') && (
                    <div className="space-y-2">
                      <Label htmlFor="reportNumber">
                        Report Number *
                        {!isManualReportNumber && (
                          <span className="text-xs text-muted-foreground ml-2">(Auto-generated)</span>
                        )}
                      </Label>
                      <Input
                        id="reportNumber"
                        value={formData.reportNumber}
                        onChange={(e) =>
                          setFormData({ ...formData, reportNumber: e.target.value })
                        }
                        required
                        disabled={loading || !isManualReportNumber}
                        placeholder={isManualReportNumber ? 'Enter report number' : 'Auto-generated'}
                        className={!isManualReportNumber ? 'bg-muted' : ''}
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="dateProcessed">Date Processed *</Label>
                    <Input
                      id="dateProcessed"
                      type="date"
                      value={formData.dateProcessed}
                      onChange={(e) =>
                        setFormData({ ...formData, dateProcessed: e.target.value })
                      }
                      required
                      disabled={loading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="processedQty">Processed Quantity *</Label>
                    <Input
                      id="processedQty"
                      type="number"
                      min="1"
                      max={selectedPart?.quantity || 999999}
                      value={formData.processedQty}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          processedQty: parseInt(e.target.value) || 1,
                        })
                      }
                      required
                      disabled={loading}
                    />
                    {selectedPart && (
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Max: {selectedPart.quantity} units</span>
                        <span className="font-medium">
                          Previously Logged: {totalProcessedQty} units
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="processingTeam">Processing Team</Label>
                    <Input
                      id="processingTeam"
                      value={formData.processingTeam}
                      onChange={(e) =>
                        setFormData({ ...formData, processingTeam: e.target.value })
                      }
                      placeholder="e.g., Team A, Shift 1"
                      disabled={loading}
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="processingLocation">Processing Location</Label>
                    <Input
                      id="processingLocation"
                      value={formData.processingLocation}
                      onChange={(e) =>
                        setFormData({ ...formData, processingLocation: e.target.value })
                      }
                      placeholder="e.g., Workshop A, Bay 3"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="remarks">Remarks</Label>
                  <Textarea
                    id="remarks"
                    value={formData.remarks}
                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                    placeholder="Any additional notes or observations..."
                    rows={4}
                    disabled={loading}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading || !formData.assemblyPartId}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Activity className="mr-2 h-4 w-4" />
                Log Production
              </Button>
            </div>
          </div>
        </form>
    </div>
  );
}
