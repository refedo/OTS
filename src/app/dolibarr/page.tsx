'use client';

import { useState, useEffect, useCallback } from 'react';
import { ResponsiveLayout } from '@/components/ResponsiveLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Package,
  Users,
  Search,
  Loader2,
  Database,
  Clock,
  Wifi,
  WifiOff,
  ArrowUpDown,
  FileText,
  Zap,
  Settings,
  Star,
} from 'lucide-react';
import { SteelSpecsEditor } from '@/components/dolibarr/SteelSpecsEditor';
import { BulkSpecsAssignment } from '@/components/dolibarr/BulkSpecsAssignment';

// ============================================
// TYPES
// ============================================

interface SyncStatus {
  syncEnabled: boolean;
  syncIntervalMinutes: number;
  lastProductsSync: string | null;
  lastThirdpartiesSync: string | null;
  lastContactsSync: string | null;
  lastFullSync: string | null;
  recordCounts: {
    products: { total: number; active: number; withSpecs: number };
    thirdparties: { total: number; active: number };
    contacts: { total: number; active: number };
  };
  recentLogs: any[];
  connectionStatus: { connected: boolean; version?: string; error?: string };
}

interface Product {
  dolibarr_id: number;
  ref: string;
  label: string;
  product_type: number;
  price: number;
  pmp: number;
  stock_reel: number;
  steel_grade: string | null;
  profile_type: string | null;
  spec_id: number | null;
  is_active: number;
  [key: string]: any;
}

interface ThirdParty {
  dolibarr_id: number;
  name: string;
  name_alias: string | null;
  client_type: number;
  supplier_type: number;
  code_client: string | null;
  code_supplier: string | null;
  email: string | null;
  phone: string | null;
  town: string | null;
  country_code: string | null;
  status: number;
  [key: string]: any;
}

interface PurchaseOrderLine {
  rowid?: number;
  fk_product?: number | null;
  product_ref?: string | null;
  product_label?: string | null;
  description?: string | null;
  qty: number;
  subprice: number;
  remise_percent?: number;
  tva_tx: number;
  total_ht: number;
  total_tva: number;
  total_ttc: number;
}

interface PurchaseOrder {
  id: number;
  ref: string;
  ref_supplier?: string | null;
  socid: number;
  supplier_name?: string | null;
  statut: string;
  status: string;
  billed: string;
  total_ht: number;
  total_tva: number;
  total_ttc: number;
  date_creation: number;
  date_validation: number | null;
  date_commande: number | null;
  date_livraison: number | null;
  fk_projet?: number | null;
  project_ref?: string | null;
  lines: PurchaseOrderLine[];
  [key: string]: any;
}

// ============================================
// MAIN PAGE
// ============================================

export default function DolibarrIntegrationPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState<any>(null);

  // Products state
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [productProfileFilter, setProductProfileFilter] = useState('');
  const [productGradeFilter, setProductGradeFilter] = useState('');
  const [productPage, setProductPage] = useState(0);
  const [productTotal, setProductTotal] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Third parties state
  const [thirdparties, setThirdparties] = useState<ThirdParty[]>([]);
  const [tpLoading, setTpLoading] = useState(false);
  const [tpSearch, setTpSearch] = useState('');
  const [tpTypeFilter, setTpTypeFilter] = useState('');
  const [tpPage, setTpPage] = useState(0);
  const [tpTotal, setTpTotal] = useState(0);

  // Purchase orders state
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [poLoading, setPoLoading] = useState(false);
  const [poPage, setPoPage] = useState(0);
  const [poTotal, setPoTotal] = useState(0);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);

  // Reference data
  const [refData, setRefData] = useState<any>(null);

  const PAGE_SIZE = 25;

  // ============================================
  // DATA FETCHING
  // ============================================

  const fetchSyncStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/dolibarr/sync');
      if (res.ok) {
        const data = await res.json();
        setSyncStatus(data);
      }
    } catch (err) {
      console.error('Failed to fetch sync status:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    setProductsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(productPage),
        limit: String(PAGE_SIZE),
      });
      if (productSearch) params.set('search', productSearch);
      if (productProfileFilter) params.set('profile_type', productProfileFilter);
      if (productGradeFilter) params.set('steel_grade', productGradeFilter);

      const res = await fetch(`/api/dolibarr/products?${params}`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
        setProductTotal(data.pagination?.total || 0);
      }
    } catch (err) {
      console.error('Failed to fetch products:', err);
    } finally {
      setProductsLoading(false);
    }
  }, [productPage, productSearch, productProfileFilter, productGradeFilter]);

  const fetchThirdParties = useCallback(async () => {
    setTpLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(tpPage),
        limit: String(PAGE_SIZE),
      });
      if (tpSearch) params.set('search', tpSearch);
      if (tpTypeFilter) params.set('type', tpTypeFilter);

      const res = await fetch(`/api/dolibarr/thirdparties?${params}`);
      if (res.ok) {
        const data = await res.json();
        setThirdparties(data.thirdparties || []);
        setTpTotal(data.pagination?.total || 0);
      }
    } catch (err) {
      console.error('Failed to fetch third parties:', err);
    } finally {
      setTpLoading(false);
    }
  }, [tpPage, tpSearch, tpTypeFilter]);

  const fetchPurchaseOrders = useCallback(async () => {
    setPoLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(poPage),
        limit: String(PAGE_SIZE),
      });

      const res = await fetch(`/api/dolibarr/purchase-orders?${params}`);
      if (res.ok) {
        const data = await res.json();
        setPurchaseOrders(data.orders || []);
        setPoTotal(data.pagination?.total || 0);
      }
    } catch (err) {
      console.error('Failed to fetch purchase orders:', err);
    } finally {
      setPoLoading(false);
    }
  }, [poPage]);

  const fetchReferenceData = useCallback(async () => {
    try {
      const res = await fetch('/api/dolibarr/reference-data');
      if (res.ok) {
        setRefData(await res.json());
      }
    } catch (err) {
      console.error('Failed to fetch reference data:', err);
    }
  }, []);

  useEffect(() => { fetchSyncStatus(); fetchReferenceData(); }, [fetchSyncStatus, fetchReferenceData]);
  useEffect(() => { if (activeTab === 'products') fetchProducts(); }, [activeTab, fetchProducts]);
  useEffect(() => { if (activeTab === 'thirdparties') fetchThirdParties(); }, [activeTab, fetchThirdParties]);
  useEffect(() => { if (activeTab === 'purchase-orders') fetchPurchaseOrders(); }, [activeTab, fetchPurchaseOrders]);

  // ============================================
  // ACTIONS
  // ============================================

  const handleSync = async (entityType?: string) => {
    setSyncing(true);
    try {
      const res = await fetch('/api/dolibarr/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: entityType ? JSON.stringify({ entityType }) : '{}',
      });
      if (res.ok) {
        await fetchSyncStatus();
        if (activeTab === 'products') await fetchProducts();
        if (activeTab === 'thirdparties') await fetchThirdParties();
      }
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      setSyncing(false);
    }
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setConnectionResult(null);
    try {
      const res = await fetch('/api/dolibarr/test');
      const data = await res.json();
      setConnectionResult(data);
    } catch (err: any) {
      setConnectionResult({ success: false, error: err.message });
    } finally {
      setTestingConnection(false);
    }
  };

  // ============================================
  // HELPERS
  // ============================================

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    const d = new Date(dateStr);
    return d.toLocaleString();
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const getPOStatusBadge = (statut: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      '0': { label: 'Draft', className: 'bg-gray-500/10 text-gray-600' },
      '1': { label: 'Validated', className: 'bg-blue-500/10 text-blue-600' },
      '2': { label: 'Approved', className: 'bg-green-500/10 text-green-600' },
      '3': { label: 'Ordered', className: 'bg-purple-500/10 text-purple-600' },
      '4': { label: 'Received Partially', className: 'bg-yellow-500/10 text-yellow-600' },
      '5': { label: 'Received', className: 'bg-green-500/10 text-green-600' },
      '6': { label: 'Canceled', className: 'bg-red-500/10 text-red-600' },
      '7': { label: 'Refused', className: 'bg-red-500/10 text-red-600' },
    };
    const status = statusMap[statut] || { label: 'Unknown', className: 'bg-gray-500/10 text-gray-600' };
    return <Badge className={`${status.className} text-xs`}>{status.label}</Badge>;
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    <ResponsiveLayout>
      <div className="space-y-6 p-2 md:p-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
              <Database className="h-7 w-7 text-primary" />
              Dolibarr Integration
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 animate-pulse" />
            </h1>
            <p className="text-muted-foreground mt-1">
              Sync products, clients & suppliers from Dolibarr ERP. Manage steel-specific attributes.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestConnection}
              disabled={testingConnection}
            >
              {testingConnection ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Wifi className="h-4 w-4 mr-1" />}
              Test Connection
            </Button>
            <Button
              size="sm"
              onClick={() => handleSync()}
              disabled={syncing}
            >
              {syncing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />}
              Sync Now
            </Button>
          </div>
        </div>

        {/* Connection Test Result */}
        {connectionResult && (
          <Card className={connectionResult.success ? 'border-green-500/50 bg-green-500/5' : 'border-red-500/50 bg-red-500/5'}>
            <CardContent className="py-3 flex items-center gap-3">
              {connectionResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              <div className="flex-1">
                <p className="font-medium">
                  {connectionResult.success ? 'Connection Successful' : 'Connection Failed'}
                </p>
                {connectionResult.version && (
                  <p className="text-sm text-muted-foreground">Dolibarr v{connectionResult.version}</p>
                )}
                {connectionResult.error && (
                  <p className="text-sm text-red-500">{connectionResult.error}</p>
                )}
                {connectionResult.permissions && (
                  <div className="flex gap-3 mt-1">
                    {Object.entries(connectionResult.permissions).map(([key, val]) => (
                      <Badge key={key} variant={val ? 'default' : 'destructive'} className="text-xs">
                        {key} {val ? '✓' : '✗'}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <Button variant="ghost" size="sm" onClick={() => setConnectionResult(null)}>✕</Button>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview" className="flex items-center gap-1">
              <Settings className="h-4 w-4" /> Overview
            </TabsTrigger>
            <TabsTrigger value="products" className="flex items-center gap-1">
              <Package className="h-4 w-4" /> Products
            </TabsTrigger>
            <TabsTrigger value="thirdparties" className="flex items-center gap-1">
              <Users className="h-4 w-4" /> Third Parties
            </TabsTrigger>
            <TabsTrigger value="purchase-orders" className="flex items-center gap-1">
              <FileText className="h-4 w-4" /> Purchase Orders
            </TabsTrigger>
            <TabsTrigger value="bulk" className="flex items-center gap-1">
              <Zap className="h-4 w-4" /> Bulk Specs
            </TabsTrigger>
          </TabsList>

          {/* ============================================ */}
          {/* OVERVIEW TAB */}
          {/* ============================================ */}
          <TabsContent value="overview" className="space-y-4 mt-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : syncStatus ? (
              <>
                {/* Status Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Connection Status */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        {syncStatus.connectionStatus.connected ? (
                          <Wifi className="h-4 w-4 text-green-500" />
                        ) : (
                          <WifiOff className="h-4 w-4 text-red-500" />
                        )}
                        Connection Status
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2">
                        <div className={`h-3 w-3 rounded-full ${syncStatus.connectionStatus.connected ? 'bg-green-500' : 'bg-red-500'}`} />
                        <span className="font-semibold">
                          {syncStatus.connectionStatus.connected ? 'Connected' : 'Disconnected'}
                        </span>
                      </div>
                      {syncStatus.connectionStatus.version && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Dolibarr v{syncStatus.connectionStatus.version}
                        </p>
                      )}
                      {syncStatus.connectionStatus.error && (
                        <p className="text-xs text-red-500 mt-1">{syncStatus.connectionStatus.error}</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Sync Status */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Last Sync
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Products:</span>
                        <span>{formatDate(syncStatus.lastProductsSync)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Third Parties:</span>
                        <span>{formatDate(syncStatus.lastThirdpartiesSync)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Contacts:</span>
                        <span>{formatDate(syncStatus.lastContactsSync)}</span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Record Counts */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Database className="h-4 w-4" />
                        Record Counts
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Products:</span>
                        <span>{syncStatus.recordCounts.products.active} / {syncStatus.recordCounts.products.total}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">With Steel Specs:</span>
                        <Badge variant="secondary" className="text-xs">{syncStatus.recordCounts.products.withSpecs}</Badge>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Third Parties:</span>
                        <span>{syncStatus.recordCounts.thirdparties.active} / {syncStatus.recordCounts.thirdparties.total}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Contacts:</span>
                        <span>{syncStatus.recordCounts.contacts.active} / {syncStatus.recordCounts.contacts.total}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Quick Sync Buttons */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Quick Sync</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleSync('products')} disabled={syncing}>
                      <Package className="h-4 w-4 mr-1" /> Sync Products
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleSync('thirdparties')} disabled={syncing}>
                      <Users className="h-4 w-4 mr-1" /> Sync Third Parties
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleSync('contacts')} disabled={syncing}>
                      <FileText className="h-4 w-4 mr-1" /> Sync Contacts
                    </Button>
                    <Button size="sm" onClick={() => handleSync()} disabled={syncing}>
                      {syncing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />}
                      Full Sync
                    </Button>
                  </CardContent>
                </Card>

                {/* Sync History */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <ArrowUpDown className="h-4 w-4" />
                      Sync History (Last 10)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {syncStatus.recentLogs.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4 text-center">No sync history yet. Run your first sync!</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-2 px-2 font-medium">Entity</th>
                              <th className="text-left py-2 px-2 font-medium">Status</th>
                              <th className="text-right py-2 px-2 font-medium">Created</th>
                              <th className="text-right py-2 px-2 font-medium">Updated</th>
                              <th className="text-right py-2 px-2 font-medium">Unchanged</th>
                              <th className="text-right py-2 px-2 font-medium">Duration</th>
                              <th className="text-left py-2 px-2 font-medium">Time</th>
                            </tr>
                          </thead>
                          <tbody>
                            {syncStatus.recentLogs.map((log: any, i: number) => (
                              <tr key={i} className="border-b last:border-0 hover:bg-muted/50">
                                <td className="py-2 px-2">
                                  <Badge variant="outline" className="text-xs">{log.entity_type}</Badge>
                                </td>
                                <td className="py-2 px-2">
                                  {log.status === 'success' ? (
                                    <Badge className="bg-green-500/10 text-green-600 text-xs">Success</Badge>
                                  ) : log.status === 'error' ? (
                                    <Badge variant="destructive" className="text-xs">Error</Badge>
                                  ) : (
                                    <Badge className="bg-yellow-500/10 text-yellow-600 text-xs">Partial</Badge>
                                  )}
                                </td>
                                <td className="py-2 px-2 text-right text-green-600">{log.records_created}</td>
                                <td className="py-2 px-2 text-right text-blue-600">{log.records_updated}</td>
                                <td className="py-2 px-2 text-right text-muted-foreground">{log.records_unchanged}</td>
                                <td className="py-2 px-2 text-right">{formatDuration(log.duration_ms)}</td>
                                <td className="py-2 px-2 text-muted-foreground text-xs">{formatDate(log.created_at)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <AlertTriangle className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                  <p className="text-muted-foreground">
                    Unable to load sync status. Make sure the Dolibarr integration tables have been created.
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Run the migration: <code className="bg-muted px-1 rounded">prisma/migrations/add_dolibarr_integration.sql</code>
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ============================================ */}
          {/* PRODUCTS TAB */}
          {/* ============================================ */}
          <TabsContent value="products" className="space-y-4 mt-4">
            {/* Filters */}
            <Card>
              <CardContent className="py-3">
                <div className="flex flex-col md:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by ref, label, or description..."
                      value={productSearch}
                      onChange={(e) => { setProductSearch(e.target.value); setProductPage(0); }}
                      className="pl-9"
                    />
                  </div>
                  <Select value={productProfileFilter} onValueChange={(v) => { setProductProfileFilter(v === 'all' ? '' : v); setProductPage(0); }}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Profile Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Profiles</SelectItem>
                      {(refData?.profileTypes || []).map((pt: string) => (
                        <SelectItem key={pt} value={pt}>{pt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={productGradeFilter} onValueChange={(v) => { setProductGradeFilter(v === 'all' ? '' : v); setProductPage(0); }}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Steel Grade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Grades</SelectItem>
                      {(refData?.grades || []).map((g: any) => (
                        <SelectItem key={g.grade_code} value={g.grade_code}>{g.grade_code}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Products Table */}
            <Card>
              <CardContent className="p-0">
                {productsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : products.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No products found. Run a sync first.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left py-3 px-3 font-medium">Ref</th>
                          <th className="text-left py-3 px-3 font-medium">Label</th>
                          <th className="text-center py-3 px-3 font-medium">Type</th>
                          <th className="text-right py-3 px-3 font-medium">Price</th>
                          <th className="text-right py-3 px-3 font-medium">Avg Cost</th>
                          <th className="text-right py-3 px-3 font-medium">Stock</th>
                          <th className="text-center py-3 px-3 font-medium">Grade</th>
                          <th className="text-center py-3 px-3 font-medium">Profile</th>
                          <th className="text-center py-3 px-3 font-medium">Specs</th>
                        </tr>
                      </thead>
                      <tbody>
                        {products.map((p) => (
                          <tr
                            key={p.dolibarr_id}
                            className="border-b last:border-0 hover:bg-muted/50 cursor-pointer transition-colors"
                            onClick={() => setSelectedProduct(p)}
                          >
                            <td className="py-2 px-3 font-mono text-xs">{p.ref}</td>
                            <td className="py-2 px-3 max-w-[200px] truncate">{p.label}</td>
                            <td className="py-2 px-3 text-center">
                              <Badge variant="outline" className="text-xs">
                                {p.product_type === 0 ? 'Product' : 'Service'}
                              </Badge>
                            </td>
                            <td className="py-2 px-3 text-right">{Number(p.price || 0).toFixed(2)}</td>
                            <td className="py-2 px-3 text-right text-muted-foreground">
                              {p.pmp ? Number(p.pmp).toFixed(2) : '—'}
                            </td>
                            <td className="py-2 px-3 text-right">
                              {p.stock_reel !== null ? Number(p.stock_reel).toFixed(0) : '—'}
                            </td>
                            <td className="py-2 px-3 text-center">
                              {p.steel_grade ? (
                                <Badge variant="secondary" className="text-xs">{p.steel_grade}</Badge>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-center">
                              {p.profile_type ? (
                                <Badge variant="outline" className="text-xs">{p.profile_type}</Badge>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-center">
                              {p.spec_id ? (
                                <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
                              ) : (
                                <XCircle className="h-4 w-4 text-muted-foreground/30 mx-auto" />
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Pagination */}
                {productTotal > PAGE_SIZE && (
                  <div className="flex items-center justify-between px-4 py-3 border-t">
                    <p className="text-sm text-muted-foreground">
                      Showing {productPage * PAGE_SIZE + 1}–{Math.min((productPage + 1) * PAGE_SIZE, productTotal)} of {productTotal}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={productPage === 0}
                        onClick={() => setProductPage(p => p - 1)}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={(productPage + 1) * PAGE_SIZE >= productTotal}
                        onClick={() => setProductPage(p => p + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Steel Specs Editor Modal */}
            {selectedProduct && (
              <SteelSpecsEditor
                product={selectedProduct}
                refData={refData}
                onClose={() => setSelectedProduct(null)}
                onSaved={() => { setSelectedProduct(null); fetchProducts(); }}
              />
            )}
          </TabsContent>

          {/* ============================================ */}
          {/* THIRD PARTIES TAB */}
          {/* ============================================ */}
          <TabsContent value="thirdparties" className="space-y-4 mt-4">
            {/* Filters */}
            <Card>
              <CardContent className="py-3">
                <div className="flex flex-col md:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, code, or email..."
                      value={tpSearch}
                      onChange={(e) => { setTpSearch(e.target.value); setTpPage(0); }}
                      className="pl-9"
                    />
                  </div>
                  <Select value={tpTypeFilter} onValueChange={(v) => { setTpTypeFilter(v === 'all' ? '' : v); setTpPage(0); }}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="customer">Customers</SelectItem>
                      <SelectItem value="supplier">Suppliers</SelectItem>
                      <SelectItem value="both">Both</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Third Parties Table */}
            <Card>
              <CardContent className="p-0">
                {tpLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : thirdparties.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No third parties found. Run a sync first.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left py-3 px-3 font-medium">Name</th>
                          <th className="text-center py-3 px-3 font-medium">Type</th>
                          <th className="text-left py-3 px-3 font-medium">Code</th>
                          <th className="text-left py-3 px-3 font-medium">Email</th>
                          <th className="text-left py-3 px-3 font-medium">Phone</th>
                          <th className="text-left py-3 px-3 font-medium">City</th>
                          <th className="text-center py-3 px-3 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {thirdparties.map((tp) => (
                          <tr key={tp.dolibarr_id} className="border-b last:border-0 hover:bg-muted/50">
                            <td className="py-2 px-3 font-medium">{tp.name}</td>
                            <td className="py-2 px-3 text-center">
                              <div className="flex gap-1 justify-center">
                                {(tp.client_type === 1 || tp.client_type === 3) && (
                                  <Badge className="bg-blue-500/10 text-blue-600 text-xs">Customer</Badge>
                                )}
                                {tp.supplier_type === 1 && (
                                  <Badge className="bg-orange-500/10 text-orange-600 text-xs">Supplier</Badge>
                                )}
                                {tp.client_type === 2 && (
                                  <Badge className="bg-purple-500/10 text-purple-600 text-xs">Prospect</Badge>
                                )}
                              </div>
                            </td>
                            <td className="py-2 px-3 font-mono text-xs">
                              {tp.code_client || tp.code_supplier || '—'}
                            </td>
                            <td className="py-2 px-3 text-xs">{tp.email || '—'}</td>
                            <td className="py-2 px-3 text-xs">{tp.phone || '—'}</td>
                            <td className="py-2 px-3 text-xs">{tp.town || '—'}</td>
                            <td className="py-2 px-3 text-center">
                              {tp.status === 1 ? (
                                <Badge className="bg-green-500/10 text-green-600 text-xs">Active</Badge>
                              ) : (
                                <Badge variant="secondary" className="text-xs">Inactive</Badge>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Pagination */}
                {tpTotal > PAGE_SIZE && (
                  <div className="flex items-center justify-between px-4 py-3 border-t">
                    <p className="text-sm text-muted-foreground">
                      Showing {tpPage * PAGE_SIZE + 1}–{Math.min((tpPage + 1) * PAGE_SIZE, tpTotal)} of {tpTotal}
                    </p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" disabled={tpPage === 0} onClick={() => setTpPage(p => p - 1)}>
                        Previous
                      </Button>
                      <Button variant="outline" size="sm" disabled={(tpPage + 1) * PAGE_SIZE >= tpTotal} onClick={() => setTpPage(p => p + 1)}>
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ============================================ */}
          {/* PURCHASE ORDERS TAB */}
          {/* ============================================ */}
          <TabsContent value="purchase-orders" className="space-y-4 mt-4">
            <Card>
              <CardContent className="p-0">
                {poLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : purchaseOrders.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No purchase orders found in Dolibarr.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left py-3 px-3 font-medium">Ref</th>
                          <th className="text-left py-3 px-3 font-medium">Supplier</th>
                          <th className="text-left py-3 px-3 font-medium">Project</th>
                          <th className="text-center py-3 px-3 font-medium">Status</th>
                          <th className="text-center py-3 px-3 font-medium">Billed</th>
                          <th className="text-right py-3 px-3 font-medium">Total HT</th>
                          <th className="text-right py-3 px-3 font-medium">VAT</th>
                          <th className="text-right py-3 px-3 font-medium">Total TTC</th>
                          <th className="text-left py-3 px-3 font-medium">Order Date</th>
                          <th className="text-center py-3 px-3 font-medium">Items</th>
                        </tr>
                      </thead>
                      <tbody>
                        {purchaseOrders.map((po) => (
                          <tr
                            key={po.id}
                            className="border-b last:border-0 hover:bg-muted/50 cursor-pointer transition-colors"
                            onClick={() => setSelectedPO(po)}
                          >
                            <td className="py-2 px-3 font-mono text-xs font-semibold">{po.ref}</td>
                            <td className="py-2 px-3 text-xs">{po.supplier_name || '—'}</td>
                            <td className="py-2 px-3 text-xs font-mono">{po.project_ref || '—'}</td>
                            <td className="py-2 px-3 text-center">{getPOStatusBadge(po.statut)}</td>
                            <td className="py-2 px-3 text-center">
                              {po.billed === '1' ? (
                                <Badge className="bg-green-500/10 text-green-600 text-xs">Yes</Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs">No</Badge>
                              )}
                            </td>
                            <td className="py-2 px-3 text-right font-medium">
                              {Number(po.total_ht || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-2 px-3 text-right text-muted-foreground">
                              {Number(po.total_tva || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-2 px-3 text-right font-semibold">
                              {Number(po.total_ttc || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-2 px-3 text-xs">
                              {po.date_commande ? new Date(Number(po.date_commande) * 1000).toLocaleDateString() : '—'}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <Badge variant="secondary" className="text-xs">{po.lines?.length || 0}</Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Pagination */}
                {poTotal > PAGE_SIZE && (
                  <div className="flex items-center justify-between px-4 py-3 border-t">
                    <p className="text-sm text-muted-foreground">
                      Showing {poPage * PAGE_SIZE + 1}–{Math.min((poPage + 1) * PAGE_SIZE, poTotal)} of {poTotal}
                    </p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" disabled={poPage === 0} onClick={() => setPoPage(p => p - 1)}>
                        Previous
                      </Button>
                      <Button variant="outline" size="sm" disabled={(poPage + 1) * PAGE_SIZE >= poTotal} onClick={() => setPoPage(p => p + 1)}>
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Purchase Order Details Modal */}
            {selectedPO && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedPO(null)}>
                <div className="bg-background rounded-lg shadow-lg max-w-5xl w-full max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
                  <div className="border-b p-4 flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Purchase Order: {selectedPO.ref}
                      </h2>
                      <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
                        {selectedPO.supplier_name && (
                          <span>Supplier: <span className="font-medium text-foreground">{selectedPO.supplier_name}</span></span>
                        )}
                        {selectedPO.project_ref && (
                          <span>Project: <span className="font-medium font-mono text-foreground">{selectedPO.project_ref}</span></span>
                        )}
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedPO(null)}>✕</Button>
                  </div>

                  <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
                    {/* Order Summary */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div>
                        <p className="text-xs text-muted-foreground">Status</p>
                        <div className="mt-1">{getPOStatusBadge(selectedPO.statut)}</div>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Billed</p>
                        <p className="font-medium mt-1">{selectedPO.billed === '1' ? 'Yes' : 'No'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Order Date</p>
                        <p className="font-medium mt-1">
                          {selectedPO.date_commande ? new Date(Number(selectedPO.date_commande) * 1000).toLocaleDateString() : '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Delivery Date</p>
                        <p className="font-medium mt-1">
                          {selectedPO.date_livraison ? new Date(Number(selectedPO.date_livraison) * 1000).toLocaleDateString() : '—'}
                        </p>
                      </div>
                    </div>

                    {/* Order Lines */}
                    <div className="mb-6">
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        Order Items ({selectedPO.lines?.length || 0})
                      </h3>
                      <div className="border rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-muted/50 border-b">
                              <th className="text-left py-2 px-3 font-medium">Product</th>
                              <th className="text-left py-2 px-3 font-medium">Description</th>
                              <th className="text-right py-2 px-3 font-medium">Qty</th>
                              <th className="text-right py-2 px-3 font-medium">Unit Price</th>
                              <th className="text-right py-2 px-3 font-medium">Discount</th>
                              <th className="text-right py-2 px-3 font-medium">VAT %</th>
                              <th className="text-right py-2 px-3 font-medium">Total HT</th>
                              <th className="text-right py-2 px-3 font-medium">Total TTC</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(selectedPO.lines || []).map((line, idx) => (
                              <tr key={idx} className="border-b last:border-0">
                                <td className="py-2 px-3">
                                  {line.product_ref ? (
                                    <div>
                                      <div className="font-mono text-xs font-semibold">{line.product_ref}</div>
                                      <div className="text-xs text-muted-foreground truncate max-w-[150px]">
                                        {line.product_label}
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground text-xs">—</span>
                                  )}
                                </td>
                                <td className="py-2 px-3 text-xs max-w-[200px] truncate">
                                  {line.description || line.product_desc || '—'}
                                </td>
                                <td className="py-2 px-3 text-right font-medium">{Number(line.qty || 0).toFixed(2)}</td>
                                <td className="py-2 px-3 text-right">
                                  {Number(line.subprice || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td className="py-2 px-3 text-right text-muted-foreground">
                                  {line.remise_percent ? `${Number(line.remise_percent).toFixed(1)}%` : '—'}
                                </td>
                                <td className="py-2 px-3 text-right">{Number(line.tva_tx || 0).toFixed(1)}%</td>
                                <td className="py-2 px-3 text-right font-medium">
                                  {Number(line.total_ht || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td className="py-2 px-3 text-right font-semibold">
                                  {Number(line.total_ttc || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="bg-muted/30 font-semibold">
                              <td colSpan={6} className="py-3 px-3 text-right">Total:</td>
                              <td className="py-3 px-3 text-right">
                                {Number(selectedPO.total_ht || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="py-3 px-3 text-right">
                                {Number(selectedPO.total_ttc || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>

                    {/* Notes */}
                    {(selectedPO.note_public || selectedPO.note_private) && (
                      <div>
                        <h3 className="font-semibold mb-3">Notes</h3>
                        {selectedPO.note_public && (
                          <div className="mb-3">
                            <p className="text-xs text-muted-foreground mb-1">Public Note:</p>
                            <div className="bg-muted/30 p-3 rounded text-sm">{selectedPO.note_public}</div>
                          </div>
                        )}
                        {selectedPO.note_private && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Private Note:</p>
                            <div className="bg-muted/30 p-3 rounded text-sm">{selectedPO.note_private}</div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* ============================================ */}
          {/* BULK SPECS TAB */}
          {/* ============================================ */}
          <TabsContent value="bulk" className="mt-4">
            <BulkSpecsAssignment refData={refData} onApplied={() => { if (activeTab === 'products') fetchProducts(); }} />
          </TabsContent>
        </Tabs>
      </div>
    </ResponsiveLayout>
  );
}
