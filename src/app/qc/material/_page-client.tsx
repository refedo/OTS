'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Package,
  Search,
  Plus,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Upload,
  Eye,
  Save,
  ExternalLink,
  Paperclip,
  FileBadge,
  Printer,
  AlertTriangle,
  CheckCheck,
  Send,
  ShieldCheck,
  ShieldX,
  ClipboardCheck,
  Trash2,
  MoreHorizontal,
  Star,
} from 'lucide-react';
import ShipmentEvaluationDialog, { type ExistingEvaluation } from '@/components/qc/ShipmentEvaluationDialog';
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

type ExistingMir = {
  id: string;
  receiptNumber: string;
  status: string;
  workflowStatus: string | null;
};

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
  existingMir?: ExistingMir | null;
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

type Project = {
  id: string;
  projectNumber: string;
  name: string;
  status: string;
};

type MaterialReceipt = {
  id: string;
  receiptNumber: string;
  dolibarrPoId: string;
  dolibarrPoRef: string;
  supplierName?: string;
  dolibarrSocId?: number | null;
  projectId?: string;
  receiptDate: string;
  status: string;
  workflowStatus: string;
  evaluation?: { id: string; rating: string; weightedScore: number } | null;
  submittedAt?: string;
  submittedById?: string;
  submittedBy?: { id: string; name: string } | null;
  reviewedAt?: string;
  reviewedById?: string;
  reviewedBy?: { id: string; name: string } | null;
  approvedAt?: string;
  approvedById?: string;
  approvedBy?: { id: string; name: string } | null;
  approvalNotes?: string;
  reviewNotes?: string;
  remarks?: string;
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

function fmtDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
}

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

  // Projects for dropdown
  const [projects, setProjects] = useState<Project[]>([]);

  // Receipt creation
  const [showCreateReceipt, setShowCreateReceipt] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedProject, setSelectedProject] = useState('__none__');

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

  // PDF generation
  const [generatingPdf, setGeneratingPdf] = useState(false);

  // Current user role (for admin/CEO delete access)
  const [currentUserRole, setCurrentUserRole] = useState('');

  // Delete MIR
  const [deletingReceiptId, setDeletingReceiptId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Workflow actions
  const [workflowDialog, setWorkflowDialog] = useState<{
    action: 'submit' | 'review' | 'approve' | 'reject';
    receipt: MaterialReceipt;
  } | null>(null);
  const [workflowNotes, setWorkflowNotes] = useState('');
  const [processingWorkflow, setProcessingWorkflow] = useState(false);

  // Shipment evaluation
  const [evaluationDialogMir, setEvaluationDialogMir] = useState<MaterialReceipt | null>(null);
  const [evaluationDialogExisting, setEvaluationDialogExisting] = useState<ExistingEvaluation | null>(null);
  const [evaluationPromptReceipt, setEvaluationPromptReceipt] = useState<MaterialReceipt | null>(null);

  useEffect(() => {
    fetchReceipts();
    fetchProjects();
    fetch('/api/auth/session')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data?.role) setCurrentUserRole(data.role); })
      .catch(() => {});
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

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects?status=Active');
      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects || data || []);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const searchPurchaseOrders = async () => {
    if (!poSearchQuery.trim()) return;

    try {
      setPoSearching(true);
      const response = await fetch(`/api/qc/material-receipts/lookup-po?search=${encodeURIComponent(poSearchQuery)}`);
      if (response.ok) {
        const data = await response.json();
        setPoSearchResults(data.orders || []);
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
          dolibarrSocId: selectedPO.socid ?? null,
          projectId: (selectedProject && selectedProject !== '__none__') ? selectedProject : null,
          items,
        }),
      });

      if (response.ok) {
        const newReceipt = await response.json();
        setShowCreateReceipt(false);
        setSelectedPO(null);
        setSelectedProject('__none__');
        fetchReceipts();
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

  // When inspection result changes to Accepted, auto-fill passing conditions
  const handleInspectionResultChange = useCallback((value: string) => {
    if (value === 'Accepted') {
      setItemFormData(prev => ({
        ...prev,
        inspectionResult: value,
        surfaceCondition: prev.surfaceCondition || 'Good',
        dimensionStatus: prev.dimensionStatus || 'Within Tolerance',
        thicknessStatus: prev.thicknessStatus || 'OK',
        specsCompliance: prev.specsCompliance || 'Compliant',
      }));
    } else {
      setItemFormData(prev => ({ ...prev, inspectionResult: value }));
    }
  }, []);

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

  const handlePrintPDF = async (receipt: MaterialReceipt) => {
    setGeneratingPdf(true);
    try {
      // Fetch full receipt details (with all item fields)
      const res = await fetch(`/api/qc/material-receipts?id=${receipt.id}`);
      if (!res.ok) throw new Error('Failed to fetch receipt');
      const fullReceipt = await res.json();

      const { generateMIRPDF } = await import('@/lib/mir-pdf-generator');
      await generateMIRPDF({
        receiptNumber: fullReceipt.receiptNumber,
        dolibarrPoRef: fullReceipt.dolibarrPoRef,
        supplierName: fullReceipt.supplierName,
        receiptDate: fullReceipt.receiptDate,
        status: fullReceipt.status,
        workflowStatus: fullReceipt.workflowStatus ?? 'Draft',
        projectNumber: fullReceipt.project?.projectNumber,
        projectName: fullReceipt.project?.name,
        inspectorName: fullReceipt.inspector.name,
        inspectorId: fullReceipt.inspector.id,
        submittedAt: fullReceipt.submittedAt,
        submittedByName: fullReceipt.submittedBy?.name,
        submittedById: fullReceipt.submittedById,
        reviewedAt: fullReceipt.reviewedAt,
        reviewedByName: fullReceipt.reviewedBy?.name,
        reviewedById: fullReceipt.reviewedById,
        approvedAt: fullReceipt.approvedAt,
        approvedByName: fullReceipt.approvedBy?.name,
        approvedById: fullReceipt.approvedById,
        approvalNotes: fullReceipt.approvalNotes,
        remarks: fullReceipt.remarks,
        items: fullReceipt.items,
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleWorkflowAction = async () => {
    if (!workflowDialog) return;
    setProcessingWorkflow(true);
    try {
      const res = await fetch('/api/qc/material-receipts/workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiptId: workflowDialog.receipt.id,
          action: workflowDialog.action,
          notes: workflowNotes || undefined,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        const wasSubmit = workflowDialog.action === 'submit';
        const submittedReceipt = workflowDialog.receipt;
        setWorkflowDialog(null);
        setWorkflowNotes('');
        if (selectedReceipt?.id === submittedReceipt.id) {
          setSelectedReceipt(updated);
        }
        fetchReceipts();
        // Prompt to rate the shipment after inspector submits (only if no evaluation yet)
        if (wasSubmit && !submittedReceipt.evaluation && submittedReceipt.dolibarrSocId) {
          setEvaluationPromptReceipt(submittedReceipt);
        }
      }
    } catch {
      // silently handled
    } finally {
      setProcessingWorkflow(false);
    }
  };

  const handleDeleteReceipt = async (receiptId: string) => {
    setDeletingReceiptId(receiptId);
    try {
      const res = await fetch(`/api/qc/material-receipts?id=${receiptId}`, { method: 'DELETE' });
      if (res.ok) {
        setConfirmDeleteId(null);
        if (selectedReceipt?.id === receiptId) setSelectedReceipt(null);
        fetchReceipts();
      }
    } catch {
      // silently handled
    } finally {
      setDeletingReceiptId(null);
    }
  };

  const getMtcFileViewUrl = (filePath: string) => {
    return filePath.replace(/^\/uploads\//, '/api/file/');
  };

  const filteredReceipts = receipts.filter((receipt) => {
    const matchesSearch =
      receipt.receiptNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      receipt.dolibarrPoRef.toLowerCase().includes(searchQuery.toLowerCase()) ||
      receipt.supplierName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      receipt.project?.projectNumber?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || receipt.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: receipts.length,
    draft: receipts.filter(r => !r.workflowStatus || r.workflowStatus === 'Draft').length,
    inspected: receipts.filter(r => r.workflowStatus === 'Inspected' || r.workflowStatus === 'Reviewed').length,
    approved: receipts.filter(r => r.workflowStatus === 'Approved').length,
    rejected: receipts.filter(r => r.workflowStatus === 'Rejected').length,
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Received and Accepted':
        return <Badge className="bg-green-500/10 text-green-600 whitespace-nowrap"><CheckCheck className="h-3 w-3 mr-1" /> Received & Accepted</Badge>;
      case 'Partially Accepted':
        return <Badge className="bg-amber-500/10 text-amber-600 whitespace-nowrap"><AlertTriangle className="h-3 w-3 mr-1" /> Partially Accepted</Badge>;
      case 'Partially Received':
        return <Badge className="bg-yellow-500/10 text-yellow-600 whitespace-nowrap"><Clock className="h-3 w-3 mr-1" /> Partially Received</Badge>;
      case 'Rejected':
        return <Badge className="bg-red-500/10 text-red-700 whitespace-nowrap"><XCircle className="h-3 w-3 mr-1" /> Rejected</Badge>;
      case 'In Progress':
        return <Badge className="bg-blue-500/10 text-blue-600 whitespace-nowrap"><Clock className="h-3 w-3 mr-1" /> In Progress</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getRowClass = (status: string) => {
    if (status === 'Rejected') return 'border-b bg-red-50/40 dark:bg-red-950/10 hover:bg-red-50/60';
    if (status === 'Received and Accepted') return 'border-b bg-green-50/20 dark:bg-green-950/10 hover:bg-muted/30';
    return 'border-b hover:bg-muted/50';
  };

  const getWorkflowBadge = (wfStatus: string) => {
    switch (wfStatus) {
      case 'Approved':
        return <Badge className="bg-green-500/15 text-green-700 border border-green-300 whitespace-nowrap font-semibold"><ShieldCheck className="h-3 w-3 mr-1" /> Approved</Badge>;
      case 'Rejected':
        return <Badge className="bg-red-500/15 text-red-700 border border-red-300 whitespace-nowrap font-semibold"><ShieldX className="h-3 w-3 mr-1" /> Rejected</Badge>;
      case 'Inspected':
        return <Badge className="bg-amber-500/15 text-amber-700 border border-amber-300 whitespace-nowrap"><ClipboardCheck className="h-3 w-3 mr-1" /> Inspected</Badge>;
      case 'Reviewed':
        return <Badge className="bg-blue-500/15 text-blue-700 border border-blue-300 whitespace-nowrap"><ClipboardCheck className="h-3 w-3 mr-1" /> Reviewed</Badge>;
      default:
        return <Badge className="bg-gray-500/10 text-gray-600 whitespace-nowrap"><Clock className="h-3 w-3 mr-1" /> Draft</Badge>;
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

  // MTC indicator for main table: green circle with check if mtcAvailable + mtcFilePath, else outline
  const getMtcTableIndicator = (item: ReceiptItem) => {
    if (item.mtcAvailable && item.mtcFilePath) {
      return (
        <span title={`MTC uploaded${item.mtcNumber ? ' — ' + item.mtcNumber : ''}`} className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-500 text-white">
          <CheckCircle className="h-3.5 w-3.5" />
        </span>
      );
    }
    if (item.mtcAvailable) {
      return (
        <span title={`MTC available${item.mtcNumber ? ' — ' + item.mtcNumber : ''} (not uploaded)`} className="inline-flex items-center justify-center w-5 h-5 rounded-full border-2 border-green-400 text-green-500">
          <CheckCircle className="h-3 w-3" />
        </span>
      );
    }
    return <span className="inline-flex items-center justify-center w-5 h-5 rounded-full border border-muted-foreground/30 text-muted-foreground/40 text-xs">—</span>;
  };

  // Check if receipt has any items with MTC uploaded
  const receiptHasMtcUploaded = (receipt: MaterialReceipt) =>
    receipt.items.some(i => i.mtcAvailable && i.mtcFilePath);

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
          <p className="text-muted-foreground/60 text-xs font-mono mt-0.5">Form: HEXA-FRM-016 · Procedure: Hexa-ISP-011 · ISO §8.4</p>
        </div>
        <Button onClick={() => setShowPOLookup(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Receipt from PO
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Total Receipts</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-gray-500">{stats.draft}</div>
            <p className="text-xs text-muted-foreground">Draft / In Progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-amber-600">{stats.inspected}</div>
            <p className="text-xs text-muted-foreground">Awaiting Approval</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
            <p className="text-xs text-muted-foreground">Fully Approved</p>
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
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Partially Received">Partially Received</SelectItem>
                <SelectItem value="Partially Accepted">Partially Accepted</SelectItem>
                <SelectItem value="Received and Accepted">Received and Accepted</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
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
                  <th className="text-left p-3 font-medium">Workflow</th>
                  <th className="text-center p-3 font-medium">Items</th>
                  <th className="text-center p-3 font-medium" title="MTC Received & Uploaded">MTC</th>
                  <th className="text-center p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredReceipts.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center p-8 text-muted-foreground">
                      No material receipts found
                    </td>
                  </tr>
                ) : (
                  filteredReceipts.map((receipt) => (
                    <tr
                      key={receipt.id}
                      className={`${getRowClass(receipt.status)} cursor-pointer`}
                      onClick={() => setSelectedReceipt(receipt)}
                    >
                      <td className="p-3 font-mono text-sm font-semibold">{receipt.receiptNumber}</td>
                      <td className="p-3 text-sm font-mono">{receipt.dolibarrPoRef}</td>
                      <td className="p-3 text-sm">{receipt.supplierName || '—'}</td>
                      <td className="p-3 text-sm font-mono">{receipt.project?.projectNumber || '—'}</td>
                      <td className="p-3 text-sm">{fmtDate(receipt.receiptDate)}</td>
                      <td className="p-3">{getStatusBadge(receipt.status)}</td>
                      <td className="p-3">{getWorkflowBadge(receipt.workflowStatus ?? 'Draft')}</td>
                      <td className="p-3 text-center">
                        <Badge variant="secondary">{receipt.items.length}</Badge>
                      </td>
                      <td className="p-3 text-center">
                        {receiptHasMtcUploaded(receipt) ? (
                          <span title="MTC documents uploaded" className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-500 text-white">
                            <CheckCircle className="h-4 w-4" />
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full border border-muted-foreground/30 text-muted-foreground/40 text-xs">—</span>
                        )}
                      </td>
                      <td className="p-3 text-center" onClick={e => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setSelectedReceipt(receipt)}>
                              <Eye className="h-4 w-4 mr-2" /> View
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setSelectedReceipt(receipt)}>
                              <ClipboardCheck className="h-4 w-4 mr-2" /> Edit / Inspect
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handlePrintPDF(receipt)} disabled={generatingPdf}>
                              <Printer className="h-4 w-4 mr-2" /> Export PDF
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {receipt.evaluation ? (
                              <DropdownMenuItem
                                onClick={async () => {
                                  const res = await fetch(`/api/qc/material-receipts/evaluate?mirId=${receipt.id}`);
                                  const data: ExistingEvaluation = await res.json();
                                  setEvaluationDialogExisting(data);
                                  setEvaluationDialogMir(receipt);
                                }}
                              >
                                <Star className="h-4 w-4 mr-2 fill-amber-400 text-amber-400" /> View Evaluation
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                disabled={!receipt.dolibarrSocId}
                                onClick={() => { setEvaluationDialogExisting(null); setEvaluationDialogMir(receipt); }}
                                title={!receipt.dolibarrSocId ? 'This MIR predates shipment evaluations' : undefined}
                              >
                                <Star className="h-4 w-4 mr-2" /> Evaluate Shipment
                              </DropdownMenuItem>
                            )}
                            {['Admin', 'CEO'].includes(currentUserRole) && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-red-600 focus:text-red-600"
                                  onClick={() => setConfirmDeleteId(receipt.id)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
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

            {poSearchQuery.trim() && !poSearching && poSearchResults.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p>No purchase orders found matching &quot;{poSearchQuery}&quot;</p>
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
                      <th className="text-center py-2 px-3 font-medium">Receipt Status</th>
                      <th className="text-center py-2 px-3 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {poSearchResults.map((po) => {
                      const mir = po.existingMir;
                      const isFinalized = mir && ['Inspected', 'Reviewed', 'Approved', 'Rejected'].includes(mir.workflowStatus ?? '');
                      const isInProgress = mir && !isFinalized;
                      return (
                        <tr key={po.id} className="border-b hover:bg-muted/50">
                          <td className="py-2 px-3 font-mono font-semibold">{po.ref}</td>
                          <td className="py-2 px-3">{po.supplier_name || '—'}</td>
                          <td className="py-2 px-3 font-mono text-xs">{po.project_ref || '—'}</td>
                          <td className="py-2 px-3 text-right">{Number(po.total_ttc).toLocaleString()}</td>
                          <td className="py-2 px-3 text-center">
                            <Badge variant="secondary">{po.lines?.length || 0}</Badge>
                          </td>
                          <td className="py-2 px-3 text-center space-y-1">
                            {isFinalized && (
                              <Badge className="bg-green-500/10 text-green-700 whitespace-nowrap text-xs">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                {mir!.workflowStatus}
                              </Badge>
                            )}
                            {isInProgress && (
                              <Badge className="bg-amber-500/10 text-amber-700 whitespace-nowrap text-xs">
                                <Clock className="h-3 w-3 mr-1" />
                                In Progress — {mir!.receiptNumber}
                              </Badge>
                            )}
                          </td>
                          <td className="py-2 px-3 text-center">
                            {isFinalized ? (
                              <Button size="sm" variant="outline" disabled className="text-xs opacity-50">
                                Already Received
                              </Button>
                            ) : isInProgress ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs border-amber-400 text-amber-700 hover:bg-amber-50"
                                onClick={() => {
                                  setShowPOLookup(false);
                                  const existing = receipts.find(r => r.id === mir!.id);
                                  if (existing) setSelectedReceipt(existing);
                                }}
                              >
                                Resume
                              </Button>
                            ) : (
                              <Button size="sm" onClick={() => handleSelectPO(po)}>
                                Select
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
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
                  <p className="text-xs text-muted-foreground">PO Project Ref</p>
                  <p className="font-medium font-mono">{selectedPO.project_ref || '—'}</p>
                </div>
              </div>

              {/* Project dropdown */}
              <div className="space-y-2">
                <Label htmlFor="projectSelect">Assign to Project</Label>
                <Select value={selectedProject} onValueChange={setSelectedProject}>
                  <SelectTrigger id="projectSelect">
                    <SelectValue placeholder="Select project (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— No Project —</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.projectNumber} — {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-lg">Material Receipt: {selectedReceipt.receiptNumber}</DialogTitle>
                  <DialogDescription>
                    PO: {selectedReceipt.dolibarrPoRef} | Supplier: {selectedReceipt.supplierName}
                    {selectedReceipt.project && ` | Project: ${selectedReceipt.project.projectNumber}`}
                  </DialogDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePrintPDF(selectedReceipt)}
                  disabled={generatingPdf}
                  className="gap-2 shrink-0"
                >
                  {generatingPdf ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Printer className="h-4 w-4" />
                  )}
                  Export PDF
                </Button>
              </div>
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
                  <p className="font-medium">{fmtDate(selectedReceipt.receiptDate)}</p>
                </div>
              </div>

              {/* Workflow Status Panel */}
              <div className={`rounded-lg border p-4 ${
                selectedReceipt.workflowStatus === 'Approved' ? 'border-green-200 bg-green-50/40 dark:bg-green-950/10' :
                selectedReceipt.workflowStatus === 'Rejected' ? 'border-red-200 bg-red-50/40 dark:bg-red-950/10' :
                (selectedReceipt.workflowStatus === 'Inspected' || selectedReceipt.workflowStatus === 'Reviewed') ? 'border-amber-200 bg-amber-50/40 dark:bg-amber-950/10' :
                'border-muted bg-muted/30'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">Workflow</span>
                    {getWorkflowBadge(selectedReceipt.workflowStatus ?? 'Draft')}
                  </div>
                  {/* Workflow action buttons */}
                  <div className="flex gap-2">
                    {(!selectedReceipt.workflowStatus || selectedReceipt.workflowStatus === 'Draft') && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 border-amber-400 text-amber-700 hover:bg-amber-50"
                        onClick={() => setWorkflowDialog({ action: 'submit', receipt: selectedReceipt })}
                      >
                        <Send className="h-3.5 w-3.5" />
                        Finalize & Submit
                      </Button>
                    )}
                    {selectedReceipt.workflowStatus === 'Inspected' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 border-blue-400 text-blue-700 hover:bg-blue-50"
                        onClick={() => setWorkflowDialog({ action: 'review', receipt: selectedReceipt })}
                      >
                        <ClipboardCheck className="h-3.5 w-3.5" />
                        Mark Reviewed
                      </Button>
                    )}
                    {(selectedReceipt.workflowStatus === 'Inspected' || selectedReceipt.workflowStatus === 'Reviewed') && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 border-green-400 text-green-700 hover:bg-green-50"
                          onClick={() => setWorkflowDialog({ action: 'approve', receipt: selectedReceipt })}
                        >
                          <ShieldCheck className="h-3.5 w-3.5" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 border-red-400 text-red-700 hover:bg-red-50"
                          onClick={() => setWorkflowDialog({ action: 'reject', receipt: selectedReceipt })}
                        >
                          <ShieldX className="h-3.5 w-3.5" />
                          Reject
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* Workflow history signatures */}
                <div className="grid grid-cols-3 gap-4 text-xs">
                  <div className="space-y-0.5">
                    <p className="font-semibold text-muted-foreground uppercase tracking-wide text-[10px]">Inspector / Receiver</p>
                    <p className="font-medium">{selectedReceipt.inspector.name}</p>
                    <p className="text-muted-foreground font-mono">ID: {selectedReceipt.inspector.id.replace(/-/g,'').slice(0,8).toUpperCase()}</p>
                    {selectedReceipt.submittedAt && (
                      <p className="text-muted-foreground">{fmtDate(selectedReceipt.submittedAt)}</p>
                    )}
                  </div>
                  <div className="space-y-0.5">
                    <p className="font-semibold text-muted-foreground uppercase tracking-wide text-[10px]">QC Reviewer</p>
                    {selectedReceipt.reviewedBy ? (
                      <>
                        <p className="font-medium">{selectedReceipt.reviewedBy.name}</p>
                        <p className="text-muted-foreground font-mono">ID: {selectedReceipt.reviewedBy.id.replace(/-/g,'').slice(0,8).toUpperCase()}</p>
                        {selectedReceipt.reviewedAt && (
                          <p className="text-muted-foreground">{fmtDate(selectedReceipt.reviewedAt)}</p>
                        )}
                      </>
                    ) : (
                      <p className="text-muted-foreground italic">Pending</p>
                    )}
                  </div>
                  <div className="space-y-0.5">
                    <p className="font-semibold text-muted-foreground uppercase tracking-wide text-[10px]">Approved By</p>
                    {selectedReceipt.approvedBy ? (
                      <>
                        <p className="font-medium">{selectedReceipt.approvedBy.name}</p>
                        <p className="text-muted-foreground font-mono">ID: {selectedReceipt.approvedBy.id.replace(/-/g,'').slice(0,8).toUpperCase()}</p>
                        {selectedReceipt.approvedAt && (
                          <p className="text-muted-foreground">{fmtDate(selectedReceipt.approvedAt)}</p>
                        )}
                        {selectedReceipt.approvalNotes && (
                          <p className="text-muted-foreground italic">&quot;{selectedReceipt.approvalNotes}&quot;</p>
                        )}
                      </>
                    ) : (
                      <p className="text-muted-foreground italic">Pending</p>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Items ({selectedReceipt.items.length})</h3>
                <div className="border rounded-lg overflow-x-auto">
                  <table className="w-full text-sm min-w-[800px]">
                    <thead>
                      <tr className="bg-muted/50 border-b">
                        <th className="text-left py-2.5 px-3 font-semibold">Item</th>
                        <th className="text-right py-2.5 px-3 font-semibold whitespace-nowrap">Ordered</th>
                        <th className="text-right py-2.5 px-3 font-semibold whitespace-nowrap">Received</th>
                        <th className="text-right py-2.5 px-3 font-semibold whitespace-nowrap">Accepted</th>
                        <th className="text-right py-2.5 px-3 font-semibold whitespace-nowrap">Rejected</th>
                        <th className="text-center py-2.5 px-3 font-semibold">Surface</th>
                        <th className="text-center py-2.5 px-3 font-semibold">Dims</th>
                        <th className="text-center py-2.5 px-3 font-semibold">Specs</th>
                        <th className="text-center py-2.5 px-3 font-semibold">MTC</th>
                        <th className="text-center py-2.5 px-3 font-semibold">Result</th>
                        <th className="text-center py-2.5 px-3 font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedReceipt.items.map((item) => (
                        <tr
                          key={item.id}
                          className={
                            item.inspectionResult === 'Rejected'
                              ? 'border-b bg-red-50/40 dark:bg-red-950/10 hover:bg-red-50/60'
                              : item.inspectionResult === 'Accepted'
                              ? 'border-b bg-green-50/20 dark:bg-green-950/10 hover:bg-green-50/30'
                              : 'border-b hover:bg-muted/30'
                          }
                        >
                          <td className="py-2.5 px-3">
                            <div className="font-medium">{item.itemName}</div>
                            {item.specification && (
                              <div className="text-xs text-muted-foreground mt-0.5">{item.specification}</div>
                            )}
                            {item.inspectionResult === 'Rejected' && item.rejectionReason && (
                              <div className="text-xs text-red-600 mt-0.5 flex items-center gap-1">
                                <XCircle className="h-3 w-3 shrink-0" />
                                {item.rejectionReason}
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono">{item.orderedQty} {item.unit}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-medium">{item.receivedQty} {item.unit}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-green-600">{item.acceptedQty} {item.unit}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-red-600">{item.rejectedQty} {item.unit}</td>
                          <td className="py-2.5 px-3 text-center">
                            {item.surfaceCondition ? (
                              <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${
                                item.surfaceCondition === 'Good' ? 'bg-green-500 text-white' :
                                item.surfaceCondition === 'Unacceptable' ? 'bg-red-500 text-white' :
                                'bg-amber-400 text-white'
                              }`}>
                                {item.surfaceCondition === 'Good' ? <CheckCircle className="h-3.5 w-3.5" /> :
                                 item.surfaceCondition === 'Unacceptable' ? <XCircle className="h-3.5 w-3.5" /> :
                                 <AlertTriangle className="h-3.5 w-3.5" />}
                              </span>
                            ) : <span className="text-muted-foreground/40">—</span>}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {item.dimensionStatus ? (
                              <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${
                                item.dimensionStatus === 'Within Tolerance' ? 'bg-green-500 text-white' :
                                item.dimensionStatus === 'Out of Tolerance' ? 'bg-red-500 text-white' :
                                'bg-amber-400 text-white'
                              }`}>
                                {item.dimensionStatus === 'Within Tolerance' ? <CheckCircle className="h-3.5 w-3.5" /> :
                                 item.dimensionStatus === 'Out of Tolerance' ? <XCircle className="h-3.5 w-3.5" /> :
                                 <AlertTriangle className="h-3.5 w-3.5" />}
                              </span>
                            ) : <span className="text-muted-foreground/40">—</span>}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {item.specsCompliance ? (
                              <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${
                                item.specsCompliance === 'Compliant' ? 'bg-green-500 text-white' :
                                item.specsCompliance === 'Non-Compliant' ? 'bg-red-500 text-white' :
                                'bg-amber-400 text-white'
                              }`}>
                                {item.specsCompliance === 'Compliant' ? <CheckCircle className="h-3.5 w-3.5" /> :
                                 item.specsCompliance === 'Non-Compliant' ? <XCircle className="h-3.5 w-3.5" /> :
                                 <AlertTriangle className="h-3.5 w-3.5" />}
                              </span>
                            ) : <span className="text-muted-foreground/40">—</span>}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              onClick={() => handleOpenMtcEdit(item)}
                              title={item.mtcAvailable ? (item.mtcNumber || 'Edit MTC') : 'Add MTC'}
                              className="focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                            >
                              {getMtcTableIndicator(item)}
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

              {/* Rejection summary */}
              {selectedReceipt.items.some(i => i.inspectionResult === 'Rejected') && (
                <div className="border border-red-200 dark:border-red-900 rounded-lg p-4 bg-red-50/40 dark:bg-red-950/10">
                  <h4 className="font-semibold text-red-700 dark:text-red-400 mb-3 flex items-center gap-2">
                    <XCircle className="h-4 w-4" />
                    Rejected Items Detail
                  </h4>
                  <div className="space-y-3">
                    {selectedReceipt.items.filter(i => i.inspectionResult === 'Rejected').map((item) => (
                      <div key={item.id} className="text-sm border-b border-red-100 dark:border-red-900/50 pb-3 last:border-0 last:pb-0">
                        <div className="font-medium">{item.itemName}</div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-1 text-xs text-muted-foreground">
                          {item.surfaceCondition && item.surfaceCondition !== 'Good' && (
                            <span>Surface: <span className="text-red-600 font-medium">{item.surfaceCondition}</span></span>
                          )}
                          {item.dimensionStatus && item.dimensionStatus !== 'Within Tolerance' && (
                            <span>Dims: <span className="text-red-600 font-medium">{item.dimensionStatus}</span></span>
                          )}
                          {item.thicknessStatus && item.thicknessStatus !== 'OK' && (
                            <span>Thickness: <span className="text-red-600 font-medium">{item.thicknessStatus}{item.thicknessMeasured ? ` (${item.thicknessMeasured})` : ''}</span></span>
                          )}
                          {item.specsCompliance && item.specsCompliance !== 'Compliant' && (
                            <span>Specs: <span className="text-red-600 font-medium">{item.specsCompliance}</span></span>
                          )}
                          {!item.mtcAvailable && (
                            <span className="text-red-600 font-medium">No MTC</span>
                          )}
                        </div>
                        {item.rejectionReason && (
                          <div className="mt-1 text-xs text-red-700 dark:text-red-400 italic">
                            Reason: {item.rejectionReason}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
                  <div className="space-y-1.5">
                    <Label htmlFor="mtcNumberEdit">MTC Number</Label>
                    <Input
                      id="mtcNumberEdit"
                      placeholder="e.g. MTC-2024-00123"
                      value={mtcFormData.mtcNumber}
                      onChange={(e) => setMtcFormData(prev => ({ ...prev, mtcNumber: e.target.value }))}
                    />
                  </div>

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
                    value={itemFormData.receivedQty as string}
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
                    value={itemFormData.acceptedQty as string}
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
                    value={itemFormData.rejectedQty as string}
                    onChange={(e) => setItemFormData({ ...itemFormData, rejectedQty: e.target.value })}
                  />
                </div>
              </div>
              {itemFormData.receivedQty && (Number(itemFormData.acceptedQty) + Number(itemFormData.rejectedQty)) > Number(itemFormData.receivedQty) && (
                <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/20 px-3 py-1.5 rounded-md -mt-2">
                  Accepted + Rejected ({Number(itemFormData.acceptedQty) + Number(itemFormData.rejectedQty)}) exceeds Received ({itemFormData.receivedQty as string})
                </p>
              )}

              {/* Inspection Result — moved up for smart auto-fill */}
              <div className="space-y-2">
                <Label htmlFor="inspectionResult" className="text-sm font-semibold">Inspection Result *</Label>
                <Select
                  value={itemFormData.inspectionResult as string}
                  onValueChange={handleInspectionResultChange}
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
                {itemFormData.inspectionResult === 'Accepted' && (
                  <p className="text-xs text-green-600 bg-green-50 dark:bg-green-950/20 px-3 py-1.5 rounded-md">
                    All conditions auto-set to passing values. You may override below.
                  </p>
                )}
              </div>

              {itemFormData.inspectionResult === 'Rejected' && (
                <div className="space-y-2">
                  <Label htmlFor="rejectionReason" className="font-semibold">Rejection Reason *</Label>
                  <Textarea
                    id="rejectionReason"
                    placeholder="Explain why this item was rejected..."
                    rows={3}
                    value={itemFormData.rejectionReason as string}
                    onChange={(e) => setItemFormData({ ...itemFormData, rejectionReason: e.target.value })}
                  />
                </div>
              )}

              {/* Surface Condition */}
              <div className="space-y-2">
                <Label htmlFor="surfaceCondition">Surface Condition</Label>
                <Select
                  value={itemFormData.surfaceCondition as string}
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
                  value={itemFormData.surfaceNotes as string}
                  onChange={(e) => setItemFormData({ ...itemFormData, surfaceNotes: e.target.value })}
                />
              </div>

              {/* Dimensional Check */}
              <div className="space-y-2">
                <Label htmlFor="dimensionStatus">Dimensional Check</Label>
                <Select
                  value={itemFormData.dimensionStatus as string}
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
                  value={itemFormData.dimensionNotes as string}
                  onChange={(e) => setItemFormData({ ...itemFormData, dimensionNotes: e.target.value })}
                />
              </div>

              {/* Thickness Check */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="thicknessStatus">Thickness Status</Label>
                  <Select
                    value={itemFormData.thicknessStatus as string}
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
                    value={itemFormData.thicknessMeasured as string}
                    onChange={(e) => setItemFormData({ ...itemFormData, thicknessMeasured: e.target.value })}
                  />
                </div>
              </div>
              <Textarea
                placeholder="Thickness check notes..."
                rows={2}
                value={itemFormData.thicknessNotes as string}
                onChange={(e) => setItemFormData({ ...itemFormData, thicknessNotes: e.target.value })}
              />

              {/* Specs Compliance */}
              <div className="space-y-2">
                <Label htmlFor="specsCompliance">Specs Compliance</Label>
                <Select
                  value={itemFormData.specsCompliance as string}
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
                  value={itemFormData.specsNotes as string}
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
                    value={itemFormData.mtcNumber as string}
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
                    value={itemFormData.heatNumber as string}
                    onChange={(e) => setItemFormData({ ...itemFormData, heatNumber: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="batchNumber">Batch Number</Label>
                  <Input
                    id="batchNumber"
                    placeholder="Batch number"
                    value={itemFormData.batchNumber as string}
                    onChange={(e) => setItemFormData({ ...itemFormData, batchNumber: e.target.value })}
                  />
                </div>
              </div>

              {/* General Remarks */}
              <div className="space-y-2">
                <Label htmlFor="remarks">General Remarks</Label>
                <Textarea
                  id="remarks"
                  placeholder="Additional notes..."
                  rows={3}
                  value={itemFormData.remarks as string}
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

      {/* Delete Confirmation Dialog */}
      {confirmDeleteId && (
        <Dialog open={!!confirmDeleteId} onOpenChange={() => setConfirmDeleteId(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <Trash2 className="h-5 w-5" /> Delete MIR
              </DialogTitle>
              <DialogDescription>
                This will permanently delete the Material Inspection Receipt and all associated items and attachments. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmDeleteId(null)} disabled={!!deletingReceiptId}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleDeleteReceipt(confirmDeleteId)}
                disabled={!!deletingReceiptId}
              >
                {deletingReceiptId ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Deleting...</>
                ) : (
                  <><Trash2 className="mr-2 h-4 w-4" />Delete MIR</>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Workflow Action Dialog */}
      {workflowDialog && (
        <Dialog open={!!workflowDialog} onOpenChange={() => { setWorkflowDialog(null); setWorkflowNotes(''); }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {workflowDialog.action === 'submit' && <><Send className="h-5 w-5 text-amber-600" /> Finalize &amp; Submit MIR</>}
                {workflowDialog.action === 'review' && <><ClipboardCheck className="h-5 w-5 text-blue-600" /> Confirm QC Review</>}
                {workflowDialog.action === 'approve' && <><ShieldCheck className="h-5 w-5 text-green-600" /> Approve MIR</>}
                {workflowDialog.action === 'reject' && <><ShieldX className="h-5 w-5 text-red-600" /> Reject MIR</>}
              </DialogTitle>
              <DialogDescription>
                {workflowDialog.receipt.receiptNumber} — {workflowDialog.receipt.dolibarrPoRef}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {workflowDialog.action === 'submit' && (
                <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800 dark:bg-amber-950/20 dark:text-amber-300">
                  This will finalize the MIR and send it for approval. All items must be inspected. This action cannot be undone.
                </div>
              )}
              {(workflowDialog.action === 'approve' || workflowDialog.action === 'reject' || workflowDialog.action === 'review') && (
                <div className="space-y-1.5">
                  <Label htmlFor="wfNotes">
                    {workflowDialog.action === 'reject' ? 'Rejection Reason *' : 'Notes (optional)'}
                  </Label>
                  <Textarea
                    id="wfNotes"
                    placeholder={workflowDialog.action === 'reject' ? 'Explain why this MIR is being rejected...' : 'Add any notes or comments...'}
                    rows={3}
                    value={workflowNotes}
                    onChange={(e) => setWorkflowNotes(e.target.value)}
                  />
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => { setWorkflowDialog(null); setWorkflowNotes(''); }} disabled={processingWorkflow}>
                Cancel
              </Button>
              <Button
                onClick={handleWorkflowAction}
                disabled={processingWorkflow || (workflowDialog.action === 'reject' && !workflowNotes.trim())}
                className={
                  workflowDialog.action === 'approve' ? 'bg-green-600 hover:bg-green-700' :
                  workflowDialog.action === 'reject' ? 'bg-red-600 hover:bg-red-700' :
                  workflowDialog.action === 'submit' ? 'bg-amber-600 hover:bg-amber-700' :
                  ''
                }
              >
                {processingWorkflow ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</>
                ) : (
                  <>
                    {workflowDialog.action === 'submit' && <><Send className="mr-2 h-4 w-4" />Submit for Approval</>}
                    {workflowDialog.action === 'review' && <><ClipboardCheck className="mr-2 h-4 w-4" />Confirm Review</>}
                    {workflowDialog.action === 'approve' && <><ShieldCheck className="mr-2 h-4 w-4" />Approve MIR</>}
                    {workflowDialog.action === 'reject' && <><ShieldX className="mr-2 h-4 w-4" />Reject MIR</>}
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Evaluation prompt — appears after inspector submits */}
      <Dialog open={!!evaluationPromptReceipt} onOpenChange={() => setEvaluationPromptReceipt(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-500" /> Rate This Shipment?
            </DialogTitle>
            <DialogDescription>
              {evaluationPromptReceipt?.receiptNumber} has been submitted. Would you like to evaluate the quality of this supplier shipment?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEvaluationPromptReceipt(null)}>
              Skip
            </Button>
            <Button onClick={() => {
              setEvaluationDialogExisting(null);
              setEvaluationDialogMir(evaluationPromptReceipt);
              setEvaluationPromptReceipt(null);
            }}>
              Evaluate Shipment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Shipment Evaluation Dialog */}
      {evaluationDialogMir && (
        <ShipmentEvaluationDialog
          open={!!evaluationDialogMir}
          onOpenChange={open => { if (!open) { setEvaluationDialogMir(null); setEvaluationDialogExisting(null); } }}
          mirId={evaluationDialogMir.id}
          mirNumber={evaluationDialogMir.receiptNumber}
          supplierName={evaluationDialogMir.supplierName}
          existingEvaluation={evaluationDialogExisting}
          onSuccess={() => { setEvaluationDialogMir(null); setEvaluationDialogExisting(null); fetchReceipts(); }}
        />
      )}
    </div>
  );
}
