'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Package,
  Search,
  Plus,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  FileText,
  Upload,
  Eye,
  Save,
  ExternalLink,
  Paperclip,
  FileBadge,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type PurchaseOrder = {
  id: number;
  ref: string;
  ref_supplier?: string;
  socid: number;
  supplier_name?: string;
  statut: string;
  total_ttc: number;
  date_commande?: number;
  fk_projet?: number;
  project_ref?: string;
  lines: PurchaseOrderLine[];
};

type PurchaseOrderLine = {
  rowid?: number;
  fk_product?: number;
  product_ref?: string;
  product_label?: string;
  description?: string;
  qty: number;
  subprice: number;
  total_ttc: number;
};

type MaterialReceipt = {
  id: string;
  receiptNumber: string;
  dolibarrPoId: string;
  dolibarrPoRef: string;
  supplierName?: string;
  projectId?: string;
  receiptDate: string;
  status: string;
  items: ReceiptItem[];
  project?: {
    id: string;
    projectNumber: string;
    name: string;
  };
  inspector: {
    id: string;
    name: string;
  };
};

type ReceiptItem = {
  id: string;
  itemName: string;
  itemDescription?: string;
  specification?: string;
  orderedQty: number;
  receivedQty: number;
  acceptedQty: number;
  rejectedQty: number;
  unit: string;
  qualityStatus: string;
  surfaceCondition?: string;
  surfaceNotes?: string;
  dimensionStatus?: string;
  dimensionNotes?: string;
  thicknessStatus?: string;
  thicknessMeasured?: string;
  thicknessNotes?: string;
  specsCompliance?: string;
  specsNotes?: string;
  mtcAvailable: boolean;
  mtcNumber?: string;
  mtcFilePath?: string;
  heatNumber?: string;
  batchNumber?: string;
  inspectionResult: string;
  rejectionReason?: string;
  remarks?: string;
};

export default function MaterialInspectionReceiptPage() {
  const [receipts, setReceipts] = useState<MaterialReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // PO Lookup
  const [showPOLookup, setShowPOLookup] = useState(false);
  const [poSearchQuery, setPoSearchQuery] = useState('');
  const [poSearchResults, setPoSearchResults] = useState<PurchaseOrder[]>([]);
  const [poSearching, setPoSearching] = useState(false);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  
  // Receipt creation
  const [showCreateReceipt, setShowCreateReceipt] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedProject, setSelectedProject] = useState('');
  
  // Receipt detail/inspection
  const [selectedReceipt, setSelectedReceipt] = useState<MaterialReceipt | null>(null);
  const [inspectingItem, setInspectingItem] = useState<ReceiptItem | null>(null);
  const [itemFormData, setItemFormData] = useState<Record<string, unknown>>({});
  const [savingItem, setSavingItem] = useState(false);

  // MTC edit dialog
  const [mtcEditItem, setMtcEditItem] = useState<ReceiptItem | null>(null);
  const [mtcFormData, setMtcFormData] = useState({ mtcAvailable: false, mtcNumber: '', mtcFilePath: '' });
  const [savingMtc, setSavingMtc] = useState(false);
  const [uploadingMtc, setUploadingMtc] = useState(false);

  useEffect(() => {
    fetchReceipts();
  }, []);

  // Auto-search POs as user types with debounce
  useEffect(() => {
    if (!showPOLookup) {
      setPoSearchResults([]);
      setPoSearchQuery('');
      return;
    }

    if (!poSearchQuery.trim()) {
      setPoSearchResults([]);
      return;
    }

    const timer = setTimeout(() => {
      searchPurchaseOrders();
    }, 500);

    return () => clearTimeout(timer);
  }, [poSearchQuery, showPOLookup]);

  const fetchReceipts = async () => {
    try {
      const response = await fetch('/api/qc/material-receipts');
      if (response.ok) {
        const data = await response.json();
        setReceipts(data);
      }
    } catch (error) {
      console.error('Error fetching receipts:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchPurchaseOrders = async () => {
    if (!poSearchQuery.trim()) return;
    
    try {
      setPoSearching(true);
      const response = await fetch(`/api/qc/material-receipts/lookup-po?search=${encodeURIComponent(poSearchQuery)}`);
      if (response.ok) {
        const data = await response.json();
        console.log('[PO Search] Response:', data);
        console.log('[PO Search] Orders count:', data.orders?.length || 0);
        setPoSearchResults(data.orders || []);
      } else {
        console.error('[PO Search] Response not OK:', response.status);
      }
    } catch (error) {
      console.error('Error searching POs:', error);
    } finally {
      setPoSearching(false);
    }
  };

  const handleSelectPO = (po: PurchaseOrder) => {
    setSelectedPO(po);
    setShowPOLookup(false);
    setShowCreateReceipt(true);
  };

  const handleCreateReceipt = async () => {
    if (!selectedPO) return;
    
    try {
      setCreating(true);
      
      // Map PO lines to receipt items
      const items = selectedPO.lines.map((line) => ({
        dolibarrLineId: line.rowid?.toString(),
        dolibarrProductId: line.fk_product?.toString(),
        itemName: line.product_label || line.description || 'Unknown Item',
        itemDescription: line.description,
        specification: '',
        orderedQty: Number(line.qty),
        unit: 'pcs',
      }));

      const response = await fetch('/api/qc/material-receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dolibarrPoId: selectedPO.id.toString(),
          dolibarrPoRef: selectedPO.ref,
          supplierName: selectedPO.supplier_name,
          projectId: selectedProject || null,
          items,
        }),
      });

      if (response.ok) {
        const newReceipt = await response.json();
        setShowCreateReceipt(false);
        setSelectedPO(null);
        setSelectedProject('');
        fetchReceipts();
        // Open the new receipt for inspection
        setSelectedReceipt(newReceipt);
      }
    } catch (error) {
      console.error('Error creating receipt:', error);
    } finally {
      setCreating(false);
    }
  };

  const handleInspectItem = (item: ReceiptItem) => {
    setInspectingItem(item);
    setItemFormData({
      receivedQty: item.receivedQty || '',
      acceptedQty: item.acceptedQty || '',
      rejectedQty: item.rejectedQty || '',
      surfaceCondition: item.surfaceCondition || '',
      surfaceNotes: item.surfaceNotes || '',
      dimensionStatus: item.dimensionStatus || '',
      dimensionNotes: item.dimensionNotes || '',
      thicknessStatus: item.thicknessStatus || '',
      thicknessMeasured: item.thicknessMeasured || '',
      thicknessNotes: item.thicknessNotes || '',
      specsCompliance: item.specsCompliance || '',
      specsNotes: item.specsNotes || '',
      mtcAvailable: item.mtcAvailable || false,
      mtcNumber: item.mtcNumber || '',
      heatNumber: item.heatNumber || '',
      batchNumber: item.batchNumber || '',
      inspectionResult: item.inspectionResult || 'Pending',
      rejectionReason: item.rejectionReason || '',
      remarks: item.remarks || '',
    });
  };

  const handleSaveItemInspection = async () => {
    if (!inspectingItem) return;
    
    try {
      setSavingItem(true);
      const response = await fetch('/api/qc/material-receipts/items', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: inspectingItem.id,
          ...itemFormData,
        }),
      });

      if (response.ok) {
        setInspectingItem(null);
        // Refresh the receipt
        if (selectedReceipt) {
          const refreshResponse = await fetch(`/api/qc/material-receipts?id=${selectedReceipt.id}`);
          if (refreshResponse.ok) {
            const updatedReceipt = await refreshResponse.json();
            setSelectedReceipt(updatedReceipt);
          }
        }
        fetchReceipts();
      }
    } catch (error) {
      console.error('Error saving item inspection:', error);
    } finally {
      setSavingItem(false);
    }
  };

  const handleOpenMtcEdit = (item: ReceiptItem) => {
    setMtcEditItem(item);
    setMtcFormData({
      mtcAvailable: item.mtcAvailable || false,
      mtcNumber: item.mtcNumber || '',
      mtcFilePath: item.mtcFilePath || '',
    });
  };

  const handleMtcFileUpload = async (file: File) => {
    setUploadingMtc(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'mtc-certificates');
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (res.ok) {
        const data = await res.json();
        setMtcFormData(prev => ({ ...prev, mtcFilePath: data.filePath as string }));
      }
    } catch (error) {
      console.error('Error uploading MTC file:', error);
    } finally {
      setUploadingMtc(false);
    }
  };

  const handleSaveMtc = async () => {
    if (!mtcEditItem) return;
    setSavingMtc(true);
    try {
      const res = await fetch('/api/qc/material-receipts/items', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: mtcEditItem.id,
          mtcAvailable: mtcFormData.mtcAvailable,
          mtcNumber: mtcFormData.mtcNumber,
          mtcFilePath: mtcFormData.mtcFilePath,
        }),
      });
      if (res.ok) {
        setMtcEditItem(null);
        if (selectedReceipt) {
          const refreshRes = await fetch(`/api/qc/material-receipts?id=${selectedReceipt.id}`);
          if (refreshRes.ok) {
            setSelectedReceipt(await refreshRes.json());
          }
        }
        fetchReceipts();
      }
    } catch (error) {
      console.error('Error saving MTC:', error);
    } finally {
      setSavingMtc(false);
    }
  };

  const getMtcFileViewUrl = (filePath: string) => {
    // Convert /uploads/mtc-certificates/file.pdf → /api/file/mtc-certificates/file.pdf
    return filePath.replace(/^\/uploads\//, '/api/file/');
  };

  const filteredReceipts = receipts.filter((receipt) => {
    const matchesSearch =
      receipt.receiptNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      receipt.dolibarrPoRef.toLowerCase().includes(searchQuery.toLowerCase()) ||
      receipt.supplierName?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || receipt.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: receipts.length,
    inProgress: receipts.filter(r => r.status === 'In Progress').length,
    completed: receipts.filter(r => r.status === 'Completed').length,
    partiallyReceived: receipts.filter(r => r.status === 'Partially Received').length,
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Completed':
        return <Badge className="bg-green-500/10 text-green-600"><CheckCircle className="h-3 w-3 mr-1" /> Completed</Badge>;
      case 'In Progress':
        return <Badge className="bg-blue-500/10 text-blue-600"><Clock className="h-3 w-3 mr-1" /> In Progress</Badge>;
      case 'Partially Received':
        return <Badge className="bg-yellow-500/10 text-yellow-600"><Clock className="h-3 w-3 mr-1" /> Partial</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getInspectionResultBadge = (result: string) => {
    switch (result) {
      case 'Accepted':
        return <Badge className="bg-green-500/10 text-green-600"><CheckCircle className="h-3 w-3 mr-1" /> Accepted</Badge>;
      case 'Rejected':
        return <Badge className="bg-red-500/10 text-red-600"><XCircle className="h-3 w-3 mr-1" /> Rejected</Badge>;
      case 'Pending':
        return <Badge className="bg-gray-500/10 text-gray-600"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>;
      default:
        return <Badge variant="outline">{result}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Package className="h-8 w-8" />
            Material Inspection Receipts
          </h1>
          <p className="text-muted-foreground mt-1">
            Receive and inspect materials from purchase orders
          </p>
          <p className="text-muted-foreground/60 text-xs font-mono mt-0.5">Form: HEXA-FRM-020 · Procedure: Hexa-ISP-013 · ISO §8.4</p>
        </div>
        <Button onClick={() => setShowPOLookup(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Receipt from PO
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Total Receipts</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
            <p className="text-xs text-muted-foreground">In Progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-600">{stats.partiallyReceived}</div>
            <p className="text-xs text-muted-foreground">Partially Received</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search receipts..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Partially Received">Partially Received</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Receipts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Material Receipts ({filteredReceipts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium">Receipt #</th>
                  <th className="text-left p-3 font-medium">PO Ref</th>
                  <th className="text-left p-3 font-medium">Supplier</th>
                  <th className="text-left p-3 font-medium">Project</th>
                  <th className="text-left p-3 font-medium">Date</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-center p-3 font-medium">Items</th>
                  <th className="text-center p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredReceipts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center p-8 text-muted-foreground">
                      No material receipts found
                    </td>
                  </tr>
                ) : (
                  filteredReceipts.map((receipt) => (
                    <tr key={receipt.id} className="border-b hover:bg-muted/50">
                      <td className="p-3 font-mono text-sm font-semibold">{receipt.receiptNumber}</td>
                      <td className="p-3 text-sm font-mono">{receipt.dolibarrPoRef}</td>
                      <td className="p-3 text-sm">{receipt.supplierName || '—'}</td>
                      <td className="p-3 text-sm font-mono">{receipt.project?.projectNumber || '—'}</td>
                      <td className="p-3 text-sm">{new Date(receipt.receiptDate).toLocaleDateString()}</td>
                      <td className="p-3">{getStatusBadge(receipt.status)}</td>
                      <td className="p-3 text-center">
                        <Badge variant="secondary">{receipt.items.length}</Badge>
                      </td>
                      <td className="p-3 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedReceipt(receipt)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Inspect
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* PO Lookup Dialog */}
      <Dialog open={showPOLookup} onOpenChange={setShowPOLookup}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Lookup Purchase Order</DialogTitle>
            <DialogDescription>
              Search for a purchase order from Dolibarr to create a material receipt
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Type PO number to search (e.g., HU-PO-2602-1581)..."
                className="pl-10"
                value={poSearchQuery}
                onChange={(e) => setPoSearchQuery(e.target.value)}
                autoFocus
              />
              {poSearching && (
                <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>

            {/* Search Results */}
            {poSearchQuery.trim() && !poSearching && poSearchResults.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p>No purchase orders found matching "{poSearchQuery}"</p>
                <p className="text-sm mt-1">Try a different search term</p>
              </div>
            )}

            {poSearchResults.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                  Found {poSearchResults.length} purchase order(s)
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 border-b">
                      <th className="text-left py-2 px-3 font-medium">PO Ref</th>
                      <th className="text-left py-2 px-3 font-medium">Supplier</th>
                      <th className="text-left py-2 px-3 font-medium">Project</th>
                      <th className="text-right py-2 px-3 font-medium">Total</th>
                      <th className="text-center py-2 px-3 font-medium">Items</th>
                      <th className="text-center py-2 px-3 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {poSearchResults.map((po) => (
                      <tr key={po.id} className="border-b hover:bg-muted/50">
                        <td className="py-2 px-3 font-mono font-semibold">{po.ref}</td>
                        <td className="py-2 px-3">{po.supplier_name || '—'}</td>
                        <td className="py-2 px-3 font-mono text-xs">{po.project_ref || '—'}</td>
                        <td className="py-2 px-3 text-right">{Number(po.total_ttc).toLocaleString()}</td>
                        <td className="py-2 px-3 text-center">
                          <Badge variant="secondary">{po.lines?.length || 0}</Badge>
                        </td>
                        <td className="py-2 px-3 text-center">
                          <Button size="sm" onClick={() => handleSelectPO(po)}>
                            Select
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Receipt Dialog */}
      <Dialog open={showCreateReceipt} onOpenChange={setShowCreateReceipt}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Material Receipt</DialogTitle>
            <DialogDescription>
              Creating receipt for PO: {selectedPO?.ref}
            </DialogDescription>
          </DialogHeader>

          {selectedPO && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground">Supplier</p>
                  <p className="font-medium">{selectedPO.supplier_name || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Project</p>
                  <p className="font-medium font-mono">{selectedPO.project_ref || '—'}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Items to Receive ({selectedPO.lines?.length || 0})</Label>
                <div className="border rounded-lg overflow-hidden max-h-[300px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-muted/50">
                      <tr className="border-b">
                        <th className="text-left py-2 px-3 font-medium">Item</th>
                        <th className="text-right py-2 px-3 font-medium">Qty</th>
                        <th className="text-right py-2 px-3 font-medium">Unit Price</th>
                        <th className="text-right py-2 px-3 font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedPO.lines?.map((line, idx) => (
                        <tr key={idx} className="border-b">
                          <td className="py-2 px-3">{line.product_label || line.description || '—'}</td>
                          <td className="py-2 px-3 text-right">{line.qty}</td>
                          <td className="py-2 px-3 text-right">{Number(line.subprice).toLocaleString()}</td>
                          <td className="py-2 px-3 text-right font-medium">{Number(line.total_ttc).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateReceipt(false)} disabled={creating}>
              Cancel
            </Button>
            <Button onClick={handleCreateReceipt} disabled={creating}>
              {creating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Receipt'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt Detail/Inspection Dialog */}
      {selectedReceipt && (
        <Dialog open={!!selectedReceipt} onOpenChange={() => setSelectedReceipt(null)}>
          <DialogContent className="w-full sm:max-w-[95vw] md:max-w-5xl max-h-[92vh] flex flex-col p-0">
            <DialogHeader className="px-6 pt-5 pb-3 border-b shrink-0">
              <DialogTitle className="text-lg">Material Receipt: {selectedReceipt.receiptNumber}</DialogTitle>
              <DialogDescription>
                PO: {selectedReceipt.dolibarrPoRef} | Supplier: {selectedReceipt.supplierName}
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg text-sm">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Status</p>
                  {getStatusBadge(selectedReceipt.status)}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Inspector</p>
                  <p className="font-medium">{selectedReceipt.inspector.name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Receipt Date</p>
                  <p className="font-medium">{new Date(selectedReceipt.receiptDate).toLocaleDateString()}</p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Items ({selectedReceipt.items.length})</h3>
                <div className="border rounded-lg overflow-x-auto">
                  <table className="w-full text-sm min-w-[700px]">
                    <thead>
                      <tr className="bg-muted/50 border-b">
                        <th className="text-left py-2.5 px-3 font-semibold">Item</th>
                        <th className="text-right py-2.5 px-3 font-semibold whitespace-nowrap">Ordered</th>
                        <th className="text-right py-2.5 px-3 font-semibold whitespace-nowrap">Received</th>
                        <th className="text-right py-2.5 px-3 font-semibold whitespace-nowrap">Accepted</th>
                        <th className="text-right py-2.5 px-3 font-semibold whitespace-nowrap">Rejected</th>
                        <th className="text-center py-2.5 px-3 font-semibold">MTC</th>
                        <th className="text-center py-2.5 px-3 font-semibold">Result</th>
                        <th className="text-center py-2.5 px-3 font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedReceipt.items.map((item) => (
                        <tr key={item.id} className="border-b hover:bg-muted/30">
                          <td className="py-2.5 px-3">
                            <div className="font-medium">{item.itemName}</div>
                            {item.specification && (
                              <div className="text-xs text-muted-foreground mt-0.5">{item.specification}</div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono">{item.orderedQty} {item.unit}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-medium">{item.receivedQty} {item.unit}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-green-600">{item.acceptedQty} {item.unit}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-red-600">{item.rejectedQty} {item.unit}</td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              onClick={() => handleOpenMtcEdit(item)}
                              title={item.mtcAvailable ? (item.mtcNumber || 'Edit MTC') : 'Add MTC'}
                              className="focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                            >
                              {item.mtcAvailable ? (
                                <Badge className="bg-green-500/10 text-green-600 text-xs cursor-pointer hover:bg-green-500/20 gap-1">
                                  {item.mtcFilePath && <Paperclip className="h-3 w-3" />}
                                  {item.mtcNumber || 'Yes'}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs cursor-pointer hover:bg-muted">No</Badge>
                              )}
                            </button>
                          </td>
                          <td className="py-2.5 px-3 text-center">{getInspectionResultBadge(item.inspectionResult)}</td>
                          <td className="py-2.5 px-3 text-center">
                            <Button size="sm" variant="outline" onClick={() => handleInspectItem(item)}>
                              Inspect
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* MTC Edit/View Dialog */}
      {mtcEditItem && (
        <Dialog open={!!mtcEditItem} onOpenChange={() => setMtcEditItem(null)}>
          <DialogContent className="w-full sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileBadge className="h-5 w-5" />
                Material Test Certificate
              </DialogTitle>
              <DialogDescription className="line-clamp-2">{mtcEditItem.itemName}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* MTC Available toggle */}
              <div className="space-y-1.5">
                <Label>MTC Available</Label>
                <Select
                  value={mtcFormData.mtcAvailable ? 'yes' : 'no'}
                  onValueChange={(v) => setMtcFormData(prev => ({ ...prev, mtcAvailable: v === 'yes' }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {mtcFormData.mtcAvailable && (
                <>
                  {/* MTC Number */}
                  <div className="space-y-1.5">
                    <Label htmlFor="mtcNumberEdit">MTC Number</Label>
                    <Input
                      id="mtcNumberEdit"
                      placeholder="e.g. MTC-2024-00123"
                      value={mtcFormData.mtcNumber}
                      onChange={(e) => setMtcFormData(prev => ({ ...prev, mtcNumber: e.target.value }))}
                    />
                  </div>

                  {/* Certificate file */}
                  <div className="space-y-1.5">
                    <Label>Certificate File</Label>
                    {mtcFormData.mtcFilePath ? (
                      <div className="flex items-center gap-2 p-2.5 border rounded-md bg-muted/50">
                        <Paperclip className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-sm truncate flex-1 font-mono">
                          {mtcFormData.mtcFilePath.split('/').pop()}
                        </span>
                        <a
                          href={getMtcFileViewUrl(mtcFormData.mtcFilePath)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0"
                        >
                          <Button type="button" size="sm" variant="ghost" className="h-7 px-2 gap-1 text-xs">
                            <ExternalLink className="h-3.5 w-3.5" />
                            Open
                          </Button>
                        </a>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                          onClick={() => setMtcFormData(prev => ({ ...prev, mtcFilePath: '' }))}
                        >
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <label className="flex items-center gap-2 p-3 border-2 border-dashed rounded-md cursor-pointer hover:bg-muted/50 transition-colors">
                        {uploadingMtc ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">Uploading…</span>
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">Upload certificate (PDF, image)</span>
                          </>
                        )}
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png,.webp"
                          className="hidden"
                          disabled={uploadingMtc}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleMtcFileUpload(file);
                          }}
                        />
                      </label>
                    )}
                  </div>
                </>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setMtcEditItem(null)} disabled={savingMtc}>
                Cancel
              </Button>
              <Button onClick={handleSaveMtc} disabled={savingMtc || uploadingMtc}>
                {savingMtc ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</>
                ) : (
                  <><Save className="mr-2 h-4 w-4" />Save</>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Item Inspection Dialog */}
      {inspectingItem && (
        <Dialog open={!!inspectingItem} onOpenChange={() => setInspectingItem(null)}>
          <DialogContent className="w-full sm:max-w-[95vw] md:max-w-2xl max-h-[92vh] flex flex-col p-0">
            <DialogHeader className="px-6 pt-5 pb-3 border-b shrink-0">
              <DialogTitle className="text-base leading-snug">{inspectingItem.itemName}</DialogTitle>
              <DialogDescription className="flex items-center gap-3 mt-1">
                <span>Inspect Item</span>
                <span className="inline-flex items-center gap-1 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 text-xs font-semibold px-2 py-0.5 rounded-full">
                  PO Qty: {inspectingItem.orderedQty} {inspectingItem.unit}
                </span>
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {/* Quantities */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="receivedQty" className="text-sm font-semibold">
                    Received Qty *
                    <span className="text-xs font-normal text-muted-foreground ml-1">(max {inspectingItem.orderedQty})</span>
                  </Label>
                  <Input
                    id="receivedQty"
                    type="number"
                    step="0.01"
                    min={0}
                    max={inspectingItem.orderedQty}
                    value={itemFormData.receivedQty}
                    className={Number(itemFormData.receivedQty) > inspectingItem.orderedQty ? 'border-red-500 focus-visible:ring-red-500' : ''}
                    onChange={(e) => setItemFormData({ ...itemFormData, receivedQty: e.target.value })}
                  />
                  {Number(itemFormData.receivedQty) > inspectingItem.orderedQty && (
                    <p className="text-xs text-red-600 font-medium">Exceeds PO qty ({inspectingItem.orderedQty} {inspectingItem.unit})</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="acceptedQty" className="text-sm">Accepted Qty</Label>
                  <Input
                    id="acceptedQty"
                    type="number"
                    step="0.01"
                    min={0}
                    max={itemFormData.receivedQty || inspectingItem.orderedQty}
                    value={itemFormData.acceptedQty}
                    onChange={(e) => setItemFormData({ ...itemFormData, acceptedQty: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rejectedQty" className="text-sm">Rejected Qty</Label>
                  <Input
                    id="rejectedQty"
                    type="number"
                    step="0.01"
                    min={0}
                    max={itemFormData.receivedQty || inspectingItem.orderedQty}
                    value={itemFormData.rejectedQty}
                    onChange={(e) => setItemFormData({ ...itemFormData, rejectedQty: e.target.value })}
                  />
                </div>
              </div>
              {/* Qty sanity hint */}
              {itemFormData.receivedQty && (Number(itemFormData.acceptedQty) + Number(itemFormData.rejectedQty)) > Number(itemFormData.receivedQty) && (
                <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/20 px-3 py-1.5 rounded-md -mt-2">
                  Accepted + Rejected ({Number(itemFormData.acceptedQty) + Number(itemFormData.rejectedQty)}) exceeds Received ({itemFormData.receivedQty})
                </p>
              )}

              {/* Surface Condition */}
              <div className="space-y-2">
                <Label htmlFor="surfaceCondition">Surface Condition</Label>
                <Select
                  value={itemFormData.surfaceCondition}
                  onValueChange={(value) => setItemFormData({ ...itemFormData, surfaceCondition: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select condition" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Good">Good</SelectItem>
                    <SelectItem value="Minor Defects">Minor Defects</SelectItem>
                    <SelectItem value="Major Defects">Major Defects</SelectItem>
                    <SelectItem value="Unacceptable">Unacceptable</SelectItem>
                  </SelectContent>
                </Select>
                <Textarea
                  placeholder="Surface condition notes..."
                  rows={2}
                  value={itemFormData.surfaceNotes}
                  onChange={(e) => setItemFormData({ ...itemFormData, surfaceNotes: e.target.value })}
                />
              </div>

              {/* Dimensional Check */}
              <div className="space-y-2">
                <Label htmlFor="dimensionStatus">Dimensional Check</Label>
                <Select
                  value={itemFormData.dimensionStatus}
                  onValueChange={(value) => setItemFormData({ ...itemFormData, dimensionStatus: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Within Tolerance">Within Tolerance</SelectItem>
                    <SelectItem value="Minor Deviation">Minor Deviation</SelectItem>
                    <SelectItem value="Out of Tolerance">Out of Tolerance</SelectItem>
                  </SelectContent>
                </Select>
                <Textarea
                  placeholder="Dimensional check notes..."
                  rows={2}
                  value={itemFormData.dimensionNotes}
                  onChange={(e) => setItemFormData({ ...itemFormData, dimensionNotes: e.target.value })}
                />
              </div>

              {/* Thickness Check */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="thicknessStatus">Thickness Status</Label>
                  <Select
                    value={itemFormData.thicknessStatus}
                    onValueChange={(value) => setItemFormData({ ...itemFormData, thicknessStatus: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OK">OK</SelectItem>
                      <SelectItem value="Below Spec">Below Spec</SelectItem>
                      <SelectItem value="Above Spec">Above Spec</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="thicknessMeasured">Measured Thickness</Label>
                  <Input
                    id="thicknessMeasured"
                    placeholder="e.g., 12.5mm"
                    value={itemFormData.thicknessMeasured}
                    onChange={(e) => setItemFormData({ ...itemFormData, thicknessMeasured: e.target.value })}
                  />
                </div>
              </div>
              <Textarea
                placeholder="Thickness check notes..."
                rows={2}
                value={itemFormData.thicknessNotes}
                onChange={(e) => setItemFormData({ ...itemFormData, thicknessNotes: e.target.value })}
              />

              {/* Specs Compliance */}
              <div className="space-y-2">
                <Label htmlFor="specsCompliance">Specs Compliance</Label>
                <Select
                  value={itemFormData.specsCompliance}
                  onValueChange={(value) => setItemFormData({ ...itemFormData, specsCompliance: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select compliance" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Compliant">Compliant</SelectItem>
                    <SelectItem value="Partially Compliant">Partially Compliant</SelectItem>
                    <SelectItem value="Non-Compliant">Non-Compliant</SelectItem>
                  </SelectContent>
                </Select>
                <Textarea
                  placeholder="Specs compliance notes..."
                  rows={2}
                  value={itemFormData.specsNotes}
                  onChange={(e) => setItemFormData({ ...itemFormData, specsNotes: e.target.value })}
                />
              </div>

              {/* MTC */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="mtcAvailable">MTC Available</Label>
                  <Select
                    value={itemFormData.mtcAvailable ? 'yes' : 'no'}
                    onValueChange={(value) => setItemFormData({ ...itemFormData, mtcAvailable: value === 'yes' })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mtcNumber">MTC Number</Label>
                  <Input
                    id="mtcNumber"
                    placeholder="MTC certificate number"
                    value={itemFormData.mtcNumber}
                    onChange={(e) => setItemFormData({ ...itemFormData, mtcNumber: e.target.value })}
                  />
                </div>
              </div>

              {/* Heat/Batch */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="heatNumber">Heat Number</Label>
                  <Input
                    id="heatNumber"
                    placeholder="Heat number"
                    value={itemFormData.heatNumber}
                    onChange={(e) => setItemFormData({ ...itemFormData, heatNumber: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="batchNumber">Batch Number</Label>
                  <Input
                    id="batchNumber"
                    placeholder="Batch number"
                    value={itemFormData.batchNumber}
                    onChange={(e) => setItemFormData({ ...itemFormData, batchNumber: e.target.value })}
                  />
                </div>
              </div>

              {/* Inspection Result */}
              <div className="space-y-2">
                <Label htmlFor="inspectionResult">Inspection Result *</Label>
                <Select
                  value={itemFormData.inspectionResult}
                  onValueChange={(value) => setItemFormData({ ...itemFormData, inspectionResult: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Accepted">Accepted</SelectItem>
                    <SelectItem value="Rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {itemFormData.inspectionResult === 'Rejected' && (
                <div className="space-y-2">
                  <Label htmlFor="rejectionReason">Rejection Reason</Label>
                  <Textarea
                    id="rejectionReason"
                    placeholder="Explain why this item was rejected..."
                    rows={3}
                    value={itemFormData.rejectionReason}
                    onChange={(e) => setItemFormData({ ...itemFormData, rejectionReason: e.target.value })}
                  />
                </div>
              )}

              {/* General Remarks */}
              <div className="space-y-2">
                <Label htmlFor="remarks">General Remarks</Label>
                <Textarea
                  id="remarks"
                  placeholder="Additional notes..."
                  rows={3}
                  value={itemFormData.remarks}
                  onChange={(e) => setItemFormData({ ...itemFormData, remarks: e.target.value })}
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t shrink-0 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setInspectingItem(null)} disabled={savingItem}>
                Cancel
              </Button>
              <Button onClick={handleSaveItemInspection} disabled={savingItem}>
                {savingItem ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Inspection
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
