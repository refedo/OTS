export interface LcrEntryWithRelations {
  id: string;
  sheetRowId: string;
  resolutionStatus: 'pending' | 'resolved';
  isDeleted: boolean;
  syncedAt: Date;
  sn: string | null;
  projectNumber: string | null;
  projectId: string | null;
  projectName?: string | null;
  itemLabel: string | null;
  qty: number | null;
  amount: number | null;
  status: string | null;
  buildingNameRaw: string | null;
  buildingId: string | null;
  buildingName?: string | null;
  mrfNumber: string | null;
  requestDate: Date | null;
  neededFromDate: Date | null;
  neededToDate: Date | null;
  buyingDate: Date | null;
  receivingDate: Date | null;
  poNumber: string | null;
  dnNumber: string | null;
  awardedToRaw: string | null;
  supplierId: number | null;
  supplierName?: string | null;
  weight: number | null;
  totalWeight: number | null;
  thickness: string | null;
  targetPrice: number | null;
  totalLcr1: number | null;
  ratio1to2Lcr1: number | null;
  lcr1Amount: number | null;
  lcr1PricePerTon: number | null;
  totalLcr2: number | null;
  lcr2: string | null;
  lcr2Amount: number | null;
  lcr2PricePerTon: number | null;
  lcr3: string | null;
  lcr3Amount: number | null;
  lcr3PricePerTon: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface LcrSyncResult {
  status: 'success' | 'partial' | 'error';
  inserted: number;
  updated: number;
  unchanged: number;
  deleted: number;
  pendingAliases: number;
  durationMs: number;
  error?: string;
}

export interface LcrAliasWithPending {
  id: string;
  aliasText: string;
  entityType: 'supplier' | 'building';
  entityId: string;
  notes: string | null;
  createdAt: Date;
}

export interface PendingAlias {
  aliasText: string;
  entityType: 'supplier' | 'building';
  affectedRowCount: number;
}
