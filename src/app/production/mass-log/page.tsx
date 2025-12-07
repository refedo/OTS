'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Activity, Loader2, CheckCircle, Search, Package, ArrowLeft } from 'lucide-react';

type AssemblyPart = {
  id: string;
  partDesignation: string;
  assemblyMark: string;
  partMark: string;
  name: string;
  quantity: number;
  status: string;
  project: { name: string; projectNumber: string; galvanized: boolean };
  building: { name: string; designation: string } | null;
  productionLogs?: { processType: string; processedQty: number }[];
  _count: { productionLogs: number };
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

export default function MassLogProductionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [parts, setParts] = useState<AssemblyPart[]>([]);
  const [selectedPartIds, setSelectedPartIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [processType, setProcessType] = useState('Preparation');
  const [partQuantities, setPartQuantities] = useState<{ [key: string]: number }>({});
  const [partBalances, setPartBalances] = useState<{ [key: string]: { processed: number; remaining: number } }>({});
  const [partReportNumbers, setPartReportNumbers] = useState<{ [key: string]: string }>({});

  const [commonData, setCommonData] = useState({
    dateProcessed: new Date().toISOString().split('T')[0],
    processingTeam: '',
    processingLocation: '',
    remarks: '',
  });

  const isDispatchProcess = processType.startsWith('Dispatched');
  const isDispatchToCustomer = processType === 'Dispatched to Customer';

  // Filter process types based on selected parts' projects galvanization settings
  const availableProcessTypes = useMemo(() => {
    if (selectedPartIds.size === 0) return PROCESS_TYPES;
    
    // Check if any selected part belongs to a non-galvanized project
    const hasNonGalvanizedProject = Array.from(selectedPartIds).some(partId => {
      const part = parts.find(p => p.id === partId);
      return part && !part.project.galvanized;
    });
    
    // If any part is from a non-galvanized project, filter out galvanization processes
    if (hasNonGalvanizedProject) {
      return PROCESS_TYPES.filter(
        type => type !== 'Galvanization' && type !== 'Dispatched to Galvanization'
      );
    }
    
    return PROCESS_TYPES;
  }, [selectedPartIds, parts]);

  useEffect(() => {
    fetchParts();
  }, []);

  useEffect(() => {
    // Calculate balances for all parts when process type or parts change
    if (parts.length > 0) {
      calculateBalancesForAllParts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [processType, parts]);

  useEffect(() => {
    // Generate report numbers for dispatch processes (except to customer)
    if (isDispatchProcess && !isDispatchToCustomer && selectedPartIds.size > 0) {
      generateReportNumbersForSelectedParts();
    } else if (isDispatchToCustomer) {
      // Clear report numbers for dispatch to customer (manual entry)
      setPartReportNumbers({});
    } else {
      // Clear report numbers for non-dispatch processes
      setPartReportNumbers({});
    }
  }, [processType, selectedPartIds]);

  const fetchParts = async () => {
    try {
      const response = await fetch('/api/production/assembly-parts?includeLogs=true');
      if (response.ok) {
        const data = await response.json();
        setParts(data);
      }
    } catch (error) {
      console.error('Error fetching parts:', error);
    }
  };

  const calculateBalancesForAllParts = () => {
    const balances: { [key: string]: { processed: number; remaining: number } } = {};
    
    for (const part of parts) {
      const processed = (part.productionLogs || [])
        .filter((log: any) => log.processType === processType)
        .reduce((sum: number, log: any) => sum + log.processedQty, 0);
      
      balances[part.id] = {
        processed,
        remaining: part.quantity - processed,
      };
    }
    
    setPartBalances(balances);
  };

  const generateReportNumbersForSelectedParts = async () => {
    const reportNumbers: { [key: string]: string } = {};
    const dispatchCode = DISPATCH_TYPE_CODES[processType];
    
    if (!dispatchCode) return;

    for (const partId of Array.from(selectedPartIds)) {
      try {
        const response = await fetch('/api/production/generate-report-number', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            assemblyPartId: partId,
            dispatchType: dispatchCode,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          reportNumbers[partId] = data.reportNumber;
        }
      } catch (error) {
        console.error(`Error generating report number for part ${partId}:`, error);
      }
    }
    
    setPartReportNumbers(reportNumbers);
  };

  const filteredParts = useMemo(() => {
    // Filter out parts where remaining quantity for current process is 0
    let availableParts = parts.filter(part => {
      const balance = partBalances[part.id];
      // If we have balance info, check if there's remaining quantity
      if (balance) {
        return balance.remaining > 0;
      }
      // If no balance info yet, include the part (it will be filtered after balance is fetched)
      return true;
    });
    
    if (!searchQuery) return availableParts;
    
    // Check if search query contains commas (multiple search terms)
    if (searchQuery.includes(',')) {
      const searchTerms = searchQuery.split(',').map(term => term.trim().toLowerCase()).filter(term => term.length > 0);
      
      // Part matches if it EXACTLY matches ANY of the search terms (case-insensitive)
      return availableParts.filter(part => 
        searchTerms.some(term => 
          part.partDesignation.toLowerCase() === term ||
          part.assemblyMark.toLowerCase() === term ||
          part.partMark.toLowerCase() === term ||
          part.name.toLowerCase() === term
        )
      );
    } else {
      // Single search term - use partial matching
      const query = searchQuery.toLowerCase();
      return availableParts.filter(part =>
        part.partDesignation.toLowerCase().includes(query) ||
        part.name.toLowerCase().includes(query)
      );
    }
  }, [parts, searchQuery, partBalances]);

  const toggleSelectPart = (partId: string) => {
    const newSelected = new Set(selectedPartIds);
    if (newSelected.has(partId)) {
      newSelected.delete(partId);
      const newQuantities = { ...partQuantities };
      delete newQuantities[partId];
      setPartQuantities(newQuantities);
      const newReportNumbers = { ...partReportNumbers };
      delete newReportNumbers[partId];
      setPartReportNumbers(newReportNumbers);
    } else {
      newSelected.add(partId);
      const part = parts.find(p => p.id === partId);
      if (part) {
        setPartQuantities({ ...partQuantities, [partId]: part.quantity });
      }
    }
    setSelectedPartIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedPartIds.size === filteredParts.length) {
      setSelectedPartIds(new Set());
      setPartQuantities({});
      setPartReportNumbers({});
    } else {
      const allIds = new Set(filteredParts.map(p => p.id));
      setSelectedPartIds(allIds);
      const quantities: { [key: string]: number } = {};
      filteredParts.forEach(part => {
        quantities[part.id] = part.quantity;
      });
      setPartQuantities(quantities);
    }
  };

  const updatePartQuantity = (partId: string, quantity: number) => {
    setPartQuantities({ ...partQuantities, [partId]: quantity });
  };

  const updatePartReportNumber = (partId: string, reportNumber: string) => {
    setPartReportNumbers({ ...partReportNumbers, [partId]: reportNumber });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);

    try {
      const logs = Array.from(selectedPartIds).map(partId => ({
        assemblyPartId: partId,
        processType,
        dateProcessed: commonData.dateProcessed,
        processedQty: partQuantities[partId] || 0,
        processingTeam: commonData.processingTeam || null,
        processingLocation: commonData.processingLocation || null,
        remarks: commonData.remarks || null,
        reportNumber: partReportNumbers[partId] || null,
      }));

      const response = await fetch('/api/production/mass-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logs }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        alert(result.error || 'Failed to log production');
        return;
      }

      setSuccess(true);
      
      // Show detailed results
      if (result.failedCount > 0) {
        const errorMessage = `Successfully logged ${result.successCount} parts.\n\nFailed: ${result.failedCount}\n\nErrors:\n${result.errors.join('\n')}`;
        alert(errorMessage);
      } else {
        alert(`Successfully logged ${result.successCount} parts!`);
      }

      // Reset form instead of redirecting
      setSelectedPartIds(new Set());
      setPartQuantities({});
      setPartReportNumbers({});
      fetchParts(); // Refresh the parts list
    } catch (error) {
      console.error('Error logging production:', error);
      alert('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const selectedParts = parts.filter(p => selectedPartIds.has(p.id));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
          <Link href="/production/log">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <Activity className="h-8 w-8" />
              Mass Production Logging
            </h1>
            <p className="text-muted-foreground mt-1">
              Log production for multiple parts at once
            </p>
          </div>
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
            {/* Process Selection */}
            <Card>
              <CardHeader>
                <CardTitle>1. Select Process Type</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="processType">Process Type *</Label>
                  <select
                    id="processType"
                    value={processType}
                    onChange={(e) => {
                      setProcessType(e.target.value);
                      setSelectedPartIds(new Set());
                      setPartQuantities({});
                      setPartReportNumbers({});
                    }}
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
                </div>
              </CardContent>
            </Card>

            {/* Parts Selection */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>2. Select Parts ({selectedPartIds.size} selected)</CardTitle>
                  {filteredParts.length > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={toggleSelectAll}
                    >
                      {selectedPartIds.size === filteredParts.length ? 'Deselect All' : 'Select All'}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by part designation or name... (use commas for multiple parts)"
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className="border rounded-lg max-h-96 overflow-y-auto">
                  {filteredParts.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No parts found</p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {filteredParts.map((part) => (
                        <div
                          key={part.id}
                          className={`p-4 hover:bg-muted/50 transition-colors ${
                            selectedPartIds.has(part.id) ? 'bg-primary/5' : ''
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              checked={selectedPartIds.has(part.id)}
                              onChange={() => toggleSelectPart(part.id)}
                              className="h-5 w-5 rounded border-gray-300 mt-1"
                            />
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-2">
                                <div>
                                  <p className="font-medium">{part.partDesignation}</p>
                                  <p className="text-sm text-muted-foreground">{part.name}</p>
                                </div>
                                <div className="text-right text-sm">
                                  <p className="text-muted-foreground">Total: {part.quantity} units</p>
                                  {partBalances[part.id] && (
                                    <>
                                      <p className="text-muted-foreground">
                                        Processed: {partBalances[part.id].processed} units
                                      </p>
                                      <p className="font-medium text-primary">
                                        Remaining: {partBalances[part.id].remaining} units
                                      </p>
                                    </>
                                  )}
                                </div>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {part.project.name} • {part.building?.name || 'No Building'}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quantities for Selected Parts */}
            {selectedParts.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>3. Set Quantities</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {selectedParts.map((part) => (
                      <div key={part.id} className="flex items-center gap-4 p-3 border rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{part.partDesignation}</p>
                          <p className="text-xs text-muted-foreground">{part.name}</p>
                        </div>
                        {isDispatchProcess && (
                          <div className="w-48">
                            <Label className="text-xs">Report Number</Label>
                            <Input
                              type="text"
                              value={partReportNumbers[part.id] || ''}
                              onChange={(e) => updatePartReportNumber(part.id, e.target.value)}
                              placeholder={isDispatchToCustomer ? 'Enter report #' : 'Auto-generated'}
                              disabled={!isDispatchToCustomer}
                              required
                              className={!isDispatchToCustomer ? 'bg-muted text-sm' : 'text-sm'}
                            />
                          </div>
                        )}
                        <div className="w-32">
                          <Label className="text-xs">Quantity</Label>
                          <Input
                            type="number"
                            min="1"
                            max={partBalances[part.id]?.remaining || part.quantity}
                            value={partQuantities[part.id] || ''}
                            onChange={(e) => updatePartQuantity(part.id, parseInt(e.target.value) || 0)}
                            placeholder="Qty"
                            required
                          />
                          {partBalances[part.id] && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Max: {partBalances[part.id].remaining}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Common Details */}
            <Card>
              <CardHeader>
                <CardTitle>4. Common Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dateProcessed">Date Processed *</Label>
                    <Input
                      id="dateProcessed"
                      type="date"
                      value={commonData.dateProcessed}
                      onChange={(e) =>
                        setCommonData({ ...commonData, dateProcessed: e.target.value })
                      }
                      required
                      disabled={loading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="processingTeam">Processing Team</Label>
                    <Input
                      id="processingTeam"
                      value={commonData.processingTeam}
                      onChange={(e) =>
                        setCommonData({ ...commonData, processingTeam: e.target.value })
                      }
                      placeholder="e.g., Team A, Shift 1"
                      disabled={loading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="processingLocation">Processing Location</Label>
                    <Input
                      id="processingLocation"
                      value={commonData.processingLocation}
                      onChange={(e) =>
                        setCommonData({ ...commonData, processingLocation: e.target.value })
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
                    value={commonData.remarks}
                    onChange={(e) =>
                      setCommonData({ ...commonData, remarks: e.target.value })
                    }
                    placeholder="Additional notes or comments..."
                    rows={3}
                    disabled={loading}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Submit */}
            <div className="flex gap-4">
              <Button
                type="submit"
                disabled={loading || selectedPartIds.size === 0}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Logging Production...
                  </>
                ) : (
                  <>
                    <Activity className="mr-2 h-4 w-4" />
                    Log Production for {selectedPartIds.size} Part{selectedPartIds.size !== 1 ? 's' : ''}
                  </>
                )}
              </Button>
              <Link href="/production/assembly-parts">
                <Button type="button" variant="outline" disabled={loading}>
                  Cancel
                </Button>
              </Link>
            </div>
          </div>
        </form>
    </div>
  );
}
