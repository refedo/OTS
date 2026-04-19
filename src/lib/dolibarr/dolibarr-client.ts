/**
 * Dolibarr REST API Client
 * 
 * Type-safe HTTP client for Dolibarr v22.0.1 REST API.
 * - Authentication via DOLAPIKEY header
 * - Automatic retry with exponential backoff
 * - Configurable timeout
 * - Pagination support
 * 
 * IMPORTANT: Dolibarr returns dates as Unix timestamps (seconds),
 * and all numeric values as strings.
 */

// ============================================
// TYPES
// ============================================

export interface DolibarrClientConfig {
  apiUrl: string;
  apiKey: string;
  timeout: number;
  maxRetries: number;
}

export interface DolibarrPaginationParams {
  limit?: number;
  page?: number;
  sortfield?: string;
  sortorder?: 'ASC' | 'DESC';
  sqlfilters?: string;
}

export interface DolibarrProduct {
  id: number | string;
  ref: string;
  label: string;
  description: string;
  type: string; // "0" or "1"
  status: string;
  status_buy: string;
  price: string;
  price_ttc: string;
  price_base_type: string;
  tva_tx: string;
  pmp: string;
  weight: string | null;
  weight_units: string | null;
  length: string | null;
  length_units: string | null;
  width: string | null;
  width_units: string | null;
  height: string | null;
  height_units: string | null;
  barcode: string | null;
  barcode_type: string | null;
  stock_reel: string | null;
  seuil_stock_alerte: string | null;
  desiredstock: string | null;
  note_public: string | null;
  note_private: string | null;
  date_creation: number | string; // Unix timestamp in seconds
  date_modification: number | string; // Unix timestamp in seconds
  accountancy_code_sell: string | null;
  accountancy_code_buy: string | null;
  array_options: Record<string, any> | null;
  [key: string]: any;
}

export interface DolibarrThirdParty {
  id: number | string;
  name: string;
  name_alias: string | null;
  client: string; // "0", "1", "2", "3"
  fournisseur: string; // "0" or "1"
  code_client: string | null;
  code_fournisseur: string | null;
  email: string | null;
  phone: string | null;
  fax: string | null;
  url: string | null;
  address: string | null;
  zip: string | null;
  town: string | null;
  state_code: string | null;
  country_code: string | null;
  tva_intra: string | null;
  capital: string | null;
  status: string;
  note_public: string | null;
  note_private: string | null;
  date_creation: number | string;
  date_modification: number | string;
  [key: string]: any;
}

export interface DolibarrContact {
  id: number | string;
  socid: number | string; // thirdparty id
  firstname: string | null;
  lastname: string | null;
  civility_id: string | null;
  poste: string | null;
  email: string | null;
  phone_pro: string | null;
  phone_mobile: string | null;
  date_creation: number | string;
  date_modification: number | string;
  [key: string]: any;
}

export interface DolibarrInvoice {
  id: number | string;
  ref: string;
  ref_client: string | null;
  type: string; // "0"=standard, "1"=replacement, "2"=credit note, "3"=deposit, "5"=situation
  statut: string; // "0"=draft, "1"=validated, "2"=paid, "3"=abandoned
  status: string;
  paye: string; // "0" or "1"
  total_ht: string;
  total_tva: string;
  total_ttc: string;
  date_creation: number | string;
  date_validation: number | string | null;
  date: number | string | null; // invoice date
  date_echeance: number | string | null; // due date
  socid: string | number;
  lines: DolibarrInvoiceLine[];
  [key: string]: any;
}

export interface DolibarrInvoiceLine {
  rowid?: number | string;
  product_ref: string | null;
  product_label: string | null;
  label: string | null;
  qty: string;
  subprice: string;
  tva_tx: string;
  total_ht: string;
  total_tva: string;
  total_ttc: string;
  fk_product: string | number | null;
  fk_accounting_account: string | number | null;
  [key: string]: any;
}

export interface DolibarrSupplierInvoice {
  id: number | string;
  ref: string;
  ref_supplier: string | null;
  type: string;
  statut: string;
  status: string;
  paye: string;
  paid: string;
  total_ht: string;
  total_tva: string;
  total_ttc: string;
  date_creation: number | string;
  date_validation: number | string | null;
  date: number | string | null;
  date_echeance: number | string | null;
  socid: string | number;
  lines: DolibarrInvoiceLine[];
  [key: string]: any;
}

export interface DolibarrPayment {
  amount: string;
  type: string; // VIR, CHQ, CB, LIQ
  date: string; // "2020-02-23 12:00:00"
  ref: string;
  fk_bank_line: string | number | null;
  fk_bank_account?: string | number | null;
  [key: string]: any;
}

// Phase 4 — params for creating a vendor invoice outbound to Dolibarr
export interface DolibarrCreateSupplierInvoiceLine {
  label: string;
  qty: number;
  unitPrice: number; // HT per unit
}

export interface DolibarrCreateSupplierInvoiceParams {
  thirdPartyId: string | number; // Dolibarr socid of the supplier
  refSupplier: string;           // our reference (OTS invoice ref)
  date: Date;
  lines: DolibarrCreateSupplierInvoiceLine[];
  note?: string;
}

export interface DolibarrSalary {
  id: number | string;
  ref: string;
  label: string;
  datesp: number | string; // start period (Unix timestamp)
  dateep: number | string; // end period (Unix timestamp)
  amount: string;
  fk_user: string | number;
  paye: string; // "0" or "1"
  salary: string;
  [key: string]: any;
}

export interface DolibarrProject {
  id: number | string;
  ref: string;
  title: string;
  description: string | null;
  fk_soc: string | number | null;
  fk_opp_status: string | number | null;
  opp_amount: string | null;
  budget_amount: string | null;
  date_start: number | string | null; // Unix timestamp
  date_end: number | string | null;
  date_close: number | string | null;
  fk_statut: string; // "0"=draft, "1"=validated, "2"=closed
  public: string;
  note_public: string | null;
  note_private: string | null;
  array_options: Record<string, any> | null;
  [key: string]: any;
}

export interface DolibarrBankAccount {
  id: number | string;
  ref: string;
  label: string;
  bank: string | null;
  account_number: string | null;
  iban: string | null;
  bic: string | null;
  currency_code: string;
  balance: number | string;
  accountancy_journal: string | null;
  clos: string; // "0"=open, "1"=closed
  [key: string]: any;
}

export interface DolibarrAccountingAccount {
  id: number | string;
  rowid: number | string;
  account_number: string;
  label: string;
  labelshort: string | null;
  account_parent: string | null;
  pcg_type: string | null; // asset, liability, equity, income, expense
  pcg_subtype: string | null;
  active: string | number;
  [key: string]: any;
}

export interface DolibarrPurchaseOrderLine {
  rowid?: number | string;
  fk_commande?: number | string; // purchase order id
  fk_product?: number | string | null;
  product_ref?: string | null;
  product_label?: string | null;
  product_desc?: string | null;
  description?: string | null;
  label?: string | null;
  qty: string | number;
  subprice: string | number; // unit price
  remise_percent?: string | number; // discount percentage
  tva_tx: string | number; // VAT rate
  total_ht: string | number; // total excl. tax
  total_tva: string | number; // total VAT
  total_ttc: string | number; // total incl. tax
  date_start?: number | string | null;
  date_end?: number | string | null;
  info_bits?: string | number;
  special_code?: string | number;
  rang?: string | number;
  [key: string]: any;
}

export interface DolibarrPurchaseOrder {
  id: number | string;
  ref: string;
  ref_supplier?: string | null; // supplier reference
  socid: number | string; // supplier thirdparty id
  supplier_name?: string | null; // supplier name (fetched separately)
  statut: string; // "0"=draft, "1"=validated, "2"=approved, "3"=ordered, "4"=received partially, "5"=received completely, "6"=canceled, "7"=refused
  status: string;
  billed: string; // "0"=not billed, "1"=billed
  total_ht: string | number;
  total_tva: string | number;
  total_ttc: string | number;
  date_creation: number | string;
  date_validation: number | string | null;
  date_commande: number | string | null; // order date
  date_livraison: number | string | null; // delivery date
  fk_projet?: number | string | null; // project id
  project_ref?: string | null; // project reference (fetched separately)
  note_public?: string | null;
  note_private?: string | null;
  lines: DolibarrPurchaseOrderLine[];
  [key: string]: any;
}

/**
 * Dolibarr llx_user record (subset of fields relevant to the OTS HR module).
 * Mirrored one-way into OTS `Employee` via `syncDolibarrEmployees`.
 * Field mapping documented in OTS-MSS-HR-PAYROLL-v1 §1.4.
 */
export interface DolibarrUser {
  id: number | string;           // llx_user.rowid — used as Employee.employmentId
  firstname: string | null;
  lastname: string | null;
  login?: string | null;
  email?: string | null;
  job?: string | null;           // maps to Employee.occupation (UI label "Position Title")
  statut?: string | number;      // "1"=active, "0"=disabled/terminated
  employee?: number | string;    // "1"=employee, "0"=admin/system user
  salary?: string | number | null;       // basic salary
  salaryextra?: string | number | null;  // extra allowances (sometimes present)
  national_registration_number?: string | null; // Iqama / National ID
  birth?: number | string | null;        // Unix timestamp
  datec?: number | string | null;        // creation
  dateemployment?: number | string | null;    // joining
  dateemploymentend?: number | string | null; // leaving
  // Dolibarr "array_options" holds extrafields keyed by "options_<fieldname>".
  // Hexa Steel uses these for Arabic name, IBAN, bank name, Iqama, etc.
  array_options?: Record<string, unknown> | null;
  [key: string]: unknown;
}

/**
 * Dolibarr llx_holiday record (leave request).
 * Mirrored one-way into OTS `LeaveRequest` via `syncDolibarrLeaves`.
 *
 * Dolibarr holiday statuses (llx_holiday.statut):
 *   1 = Draft
 *   2 = Pending approval
 *   3 = Approved
 *   4 = Refused
 *   5 = Cancelled
 *
 * OTS mirrors statut=3 as APPROVED and ignores every other state
 * (per Walid 18.6.0 — "make it land as approved").
 */
export interface DolibarrHoliday {
  id: number | string;           // llx_holiday.rowid
  fk_user?: number | string;     // llx_user.rowid of the employee taking leave
  fk_type?: number | string;     // llx_c_holiday_types.rowid
  date_debut?: number | string;  // Unix timestamp
  date_fin?: number | string;    // Unix timestamp
  statut?: number | string;      // status code (see above)
  description?: string | null;
  date_create?: number | string;
  date_approval?: number | string | null;
  fk_validator?: number | string | null;
  [key: string]: unknown;
}

/**
 * Dolibarr llx_c_holiday_types record (leave type catalogue).
 * Used to map fk_type on a holiday back to an OTS LeaveType.code.
 */
export interface DolibarrHolidayType {
  id?: number | string;
  rowid?: number | string;
  code?: string | null;
  label?: string | null;
  affect?: number | string;
  [key: string]: unknown;
}

export interface DolibarrConnectionInfo {
  success: boolean;
  version?: string;
  error?: string;
  permissions?: {
    products: boolean;
    thirdparties: boolean;
    contacts: boolean;
  };
}

// ============================================
// CLIENT
// ============================================

export class DolibarrClient {
  private config: DolibarrClientConfig;

  constructor(config: DolibarrClientConfig) {
    this.config = config;
  }

  /**
   * Make an authenticated POST request to the Dolibarr API
   */
  private async post<T>(endpoint: string, body: unknown): Promise<T> {
    const url = new URL(`${this.config.apiUrl}/${endpoint}`);
    url.searchParams.set('_ts', Date.now().toString());

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        const response = await fetch(url.toString(), {
          method: 'POST',
          headers: {
            'DOLAPIKEY': this.config.apiKey,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error');
          if (response.status === 401) {
            throw new Error(
              `Dolibarr API key is invalid or expired (401 Unauthorized). ` +
              `Fix: In Dolibarr go to Users & Groups → [API key user] → regenerate or extend the API key validity dates. ` +
              `Raw: ${errorText}`,
            );
          }
          if (response.status >= 400 && response.status < 500 && response.status !== 429) {
            throw new Error(`Dolibarr API error ${response.status}: ${errorText}`);
          }
          throw new Error(`Dolibarr API error ${response.status}: ${errorText}`);
        }

        const rawText = await response.text();
        if (!rawText || rawText.trim() === '') {
          return null as unknown as T;
        }
        try {
          return JSON.parse(rawText) as T;
        } catch {
          const preview = rawText.trim().slice(0, 200);
          throw new Error(
            `Dolibarr returned a non-JSON POST response for "${endpoint}" (HTTP ${response.status}): ${preview}`,
          );
        }
      } catch (error: unknown) {
        lastError = error instanceof Error ? error : new Error(String(error));
        const msg = lastError.message;
        if (msg?.includes('API error 4') && !msg?.includes('429')) throw lastError;
        if (attempt < this.config.maxRetries) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }

    throw lastError || new Error('POST request failed after all retries');
  }

  /**
   * Make an authenticated request to the Dolibarr API with retry logic
   */
  private async request<T>(
    endpoint: string,
    params?: Record<string, string | number | undefined>
  ): Promise<T> {
    const url = new URL(`${this.config.apiUrl}/${endpoint}`);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      });
    }

    // 18.7.4 — Defeat edge-proxy caches (LiteSpeed / Cloudflare / nginx
    // reverse proxies) that can cache a stale Dolibarr REST response and
    // serve it indefinitely without ever hitting PHP. We hit this on
    // erp.hexametals.com: /api/index.php/holidays returned HTTP 200 with
    // body "API not found (failed to include API file)" and response
    // header `x-proxy-cache: HIT`, even though the module was healthy —
    // the edge had cached an old broken response. Appending a unique
    // timestamp param forces a cache miss on every request, and the
    // Cache-Control/Pragma request headers ask any intermediate proxy to
    // bypass its cache. Dolibarr's Restler endpoint ignores unknown
    // query params so the _ts is harmless upstream.
    url.searchParams.set('_ts', Date.now().toString());

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        const response = await fetch(url.toString(), {
          method: 'GET',
          headers: {
            'DOLAPIKEY': this.config.apiKey,
            'Accept': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error');

          if (response.status === 401) {
            throw new Error(
              `Dolibarr API key is invalid or expired (401 Unauthorized). ` +
              `Fix: In Dolibarr go to Users & Groups → [API key user] → regenerate or extend the API key validity dates. ` +
              `Raw: ${errorText}`,
            );
          }

          // Don't retry on 4xx errors (except 429)
          if (response.status >= 400 && response.status < 500 && response.status !== 429) {
            throw new Error(`Dolibarr API error ${response.status}: ${errorText}`);
          }

          throw new Error(`Dolibarr API error ${response.status}: ${errorText}`);
        }

        // Read the body as text first so we can produce a helpful error
        // if Dolibarr returns a non-JSON payload (e.g. plain "API not
        // found" when a module isn't installed, which some versions serve
        // with a 200 status).
        const rawText = await response.text();
        if (!rawText || rawText.trim() === '') {
          return [] as unknown as T;
        }
        try {
          return JSON.parse(rawText) as T;
        } catch {
          const preview = rawText.trim().slice(0, 200);
          const proxyCache = response.headers.get('x-proxy-cache');
          const poweredBy = response.headers.get('x-powered-by');
          const cacheHint =
            proxyCache === 'HIT' || (poweredBy && !poweredBy.toLowerCase().includes('restler'))
              ? ' [proxy cache HIT — edge proxy is serving a stale cached response without hitting PHP; purge the host cache (LiteSpeed / Cloudflare) and add a bypass rule for /api/index.php/*]'
              : '';
          throw new Error(
            `Dolibarr returned a non-JSON response for "${endpoint}" (HTTP ${response.status}): ${preview}${cacheHint}`,
          );
        }
      } catch (error: any) {
        lastError = error;
        
        // Don't retry on non-retryable errors
        if (error.message?.includes('API error 4') && !error.message?.includes('429')) {
          throw error;
        }

        if (attempt < this.config.maxRetries) {
          // Exponential backoff: 1s, 2s, 4s
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('Request failed after all retries');
  }

  /**
   * Test connection to Dolibarr API and verify permissions
   */
  async testConnection(): Promise<DolibarrConnectionInfo> {
    try {
      // Test basic connectivity by fetching status/version
      const statusData = await this.request<any>('status');
      
      // Test product access
      let productsOk = false;
      try {
        await this.request<any>('products', { limit: 1 });
        productsOk = true;
      } catch { /* no access */ }

      // Test thirdparties access
      let thirdpartiesOk = false;
      try {
        await this.request<any>('thirdparties', { limit: 1 });
        thirdpartiesOk = true;
      } catch { /* no access */ }

      // Test contacts access
      let contactsOk = false;
      try {
        await this.request<any>('contacts', { limit: 1 });
        contactsOk = true;
      } catch { /* no access */ }

      return {
        success: true,
        version: statusData?.success?.dolibarr_version || statusData?.dolibarr_version || 'Unknown',
        permissions: {
          products: productsOk,
          thirdparties: thirdpartiesOk,
          contacts: contactsOk,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Connection failed',
      };
    }
  }

  /**
   * Fetch products with pagination
   */
  async getProducts(params?: DolibarrPaginationParams): Promise<DolibarrProduct[]> {
    const result = await this.request<DolibarrProduct[]>('products', {
      limit: params?.limit ?? 100,
      page: params?.page ?? 0,
      sortfield: params?.sortfield ?? 't.rowid',
      sortorder: params?.sortorder ?? 'ASC',
      sqlfilters: params?.sqlfilters,
    });
    return Array.isArray(result) ? result : [];
  }

  /**
   * Auto-paginate to fetch ALL products
   */
  async getAllProducts(batchSize: number = 100): Promise<DolibarrProduct[]> {
    const allProducts: DolibarrProduct[] = [];
    let page = 0;
    let hasMore = true;

    while (hasMore) {
      const batch = await this.getProducts({ limit: batchSize, page });
      allProducts.push(...batch);
      
      if (batch.length < batchSize) {
        hasMore = false;
      } else {
        page++;
      }
    }

    return allProducts;
  }

  /**
   * Fetch third parties with pagination
   */
  async getThirdParties(params?: DolibarrPaginationParams): Promise<DolibarrThirdParty[]> {
    const result = await this.request<DolibarrThirdParty[]>('thirdparties', {
      limit: params?.limit ?? 100,
      page: params?.page ?? 0,
      sortfield: params?.sortfield ?? 't.rowid',
      sortorder: params?.sortorder ?? 'ASC',
      sqlfilters: params?.sqlfilters,
    });
    return Array.isArray(result) ? result : [];
  }

  /**
   * Auto-paginate to fetch ALL third parties
   */
  async getAllThirdParties(batchSize: number = 100): Promise<DolibarrThirdParty[]> {
    const allParties: DolibarrThirdParty[] = [];
    let page = 0;
    let hasMore = true;

    while (hasMore) {
      const batch = await this.getThirdParties({ limit: batchSize, page });
      allParties.push(...batch);
      
      if (batch.length < batchSize) {
        hasMore = false;
      } else {
        page++;
      }
    }

    return allParties;
  }

  /**
   * Fetch a single third party by ID
   */
  async getThirdPartyById(thirdPartyId: number | string): Promise<DolibarrThirdParty | null> {
    try {
      const result = await this.request<DolibarrThirdParty>(`thirdparties/${thirdPartyId}`);
      return result;
    } catch (error: any) {
      if (error.message?.includes('404')) return null;
      throw error;
    }
  }

  /**
   * Fetch contacts with pagination
   */
  async getContacts(params?: DolibarrPaginationParams): Promise<DolibarrContact[]> {
    const result = await this.request<DolibarrContact[]>('contacts', {
      limit: params?.limit ?? 100,
      page: params?.page ?? 0,
      sortfield: params?.sortfield ?? 't.rowid',
      sortorder: params?.sortorder ?? 'ASC',
      sqlfilters: params?.sqlfilters,
    });
    return Array.isArray(result) ? result : [];
  }

  /**
   * Auto-paginate to fetch ALL contacts
   */
  async getAllContacts(batchSize: number = 100): Promise<DolibarrContact[]> {
    const allContacts: DolibarrContact[] = [];
    let page = 0;
    let hasMore = true;

    while (hasMore) {
      const batch = await this.getContacts({ limit: batchSize, page });
      allContacts.push(...batch);
      
      if (batch.length < batchSize) {
        hasMore = false;
      } else {
        page++;
      }
    }

    return allContacts;
  }

  // ============================================
  // FINANCIAL API METHODS
  // ============================================

  /**
   * Fetch customer invoices with pagination (all statuses)
   */
  async getInvoices(params?: DolibarrPaginationParams): Promise<DolibarrInvoice[]> {
    const result = await this.request<DolibarrInvoice[]>('invoices', {
      limit: params?.limit ?? 100,
      page: params?.page ?? 0,
      sortfield: params?.sortfield ?? 't.rowid',
      sortorder: params?.sortorder ?? 'ASC',
    });
    return Array.isArray(result) ? result : [];
  }

  /**
   * Auto-paginate to fetch ALL customer invoices (non-draft)
   */
  async getAllInvoices(batchSize: number = 500): Promise<DolibarrInvoice[]> {
    const all: DolibarrInvoice[] = [];
    let page = 0;
    let hasMore = true;

    while (hasMore) {
      console.log(`[Dolibarr] Fetching customer invoices page ${page} (batch ${batchSize})...`);
      const batch = await this.getInvoices({ limit: batchSize, page });
      all.push(...batch);
      console.log(`[Dolibarr] Got ${batch.length} customer invoices (total: ${all.length})`);
      hasMore = batch.length >= batchSize;
      page++;
    }

    return all;
  }

  /**
   * Fetch payments for a specific customer invoice
   */
  async getInvoicePayments(invoiceId: number): Promise<DolibarrPayment[]> {
    try {
      const result = await this.request<DolibarrPayment[]>(`invoices/${invoiceId}/payments`);
      return Array.isArray(result) ? result : [];
    } catch (error: any) {
      // 404 means no payments — not an error
      if (error.message?.includes('404')) return [];
      throw error;
    }
  }

  /**
   * Fetch supplier invoices with pagination (all statuses)
   */
  async getSupplierInvoices(params?: DolibarrPaginationParams): Promise<DolibarrSupplierInvoice[]> {
    const result = await this.request<DolibarrSupplierInvoice[]>('supplierinvoices', {
      limit: params?.limit ?? 100,
      page: params?.page ?? 0,
      sortfield: params?.sortfield ?? 't.rowid',
      sortorder: params?.sortorder ?? 'ASC',
    });
    return Array.isArray(result) ? result : [];
  }

  /**
   * Auto-paginate to fetch ALL supplier invoices (non-draft)
   */
  async getAllSupplierInvoices(batchSize: number = 500): Promise<DolibarrSupplierInvoice[]> {
    const all: DolibarrSupplierInvoice[] = [];
    let page = 0;
    let hasMore = true;

    while (hasMore) {
      console.log(`[Dolibarr] Fetching supplier invoices page ${page} (batch ${batchSize})...`);
      const batch = await this.getSupplierInvoices({ limit: batchSize, page });
      all.push(...batch);
      console.log(`[Dolibarr] Got ${batch.length} supplier invoices (total: ${all.length})`);
      hasMore = batch.length >= batchSize;
      page++;
    }

    return all;
  }

  /**
   * Fetch payments for a specific supplier invoice
   */
  async getSupplierInvoicePayments(invoiceId: number): Promise<DolibarrPayment[]> {
    try {
      const result = await this.request<DolibarrPayment[]>(`supplierinvoices/${invoiceId}/payments`);
      return Array.isArray(result) ? result : [];
    } catch (error: any) {
      if (error.message?.includes('404')) return [];
      throw error;
    }
  }

  /**
   * Fetch salaries with pagination
   */
  async getSalaries(params?: DolibarrPaginationParams): Promise<DolibarrSalary[]> {
    try {
      const result = await this.request<DolibarrSalary[]>('salaries', {
        limit: params?.limit ?? 100,
        page: params?.page ?? 0,
        sortfield: params?.sortfield ?? 't.rowid',
        sortorder: params?.sortorder ?? 'DESC',
        sqlfilters: params?.sqlfilters,
      });
      return Array.isArray(result) ? result : [];
    } catch (error: any) {
      if (error.message?.includes('404')) return [];
      throw error;
    }
  }

  /**
   * Auto-paginate to fetch ALL salaries
   */
  async getAllSalaries(batchSize: number = 100): Promise<DolibarrSalary[]> {
    const all: DolibarrSalary[] = [];
    let page = 0;
    let hasMore = true;

    while (hasMore) {
      const batch = await this.getSalaries({ limit: batchSize, page });
      all.push(...batch);
      hasMore = batch.length >= batchSize;
      page++;
    }

    return all;
  }

  /**
   * Fetch projects with pagination
   */
  async getProjects(params?: DolibarrPaginationParams): Promise<DolibarrProject[]> {
    const result = await this.request<DolibarrProject[]>('projects', {
      limit: params?.limit ?? 100,
      page: params?.page ?? 0,
      sortfield: params?.sortfield ?? 't.rowid',
      sortorder: params?.sortorder ?? 'ASC',
      sqlfilters: params?.sqlfilters,
    });
    return Array.isArray(result) ? result : [];
  }

  /**
   * Auto-paginate to fetch ALL projects
   */
  async getAllProjects(batchSize: number = 100): Promise<DolibarrProject[]> {
    const all: DolibarrProject[] = [];
    let page = 0;
    let hasMore = true;

    while (hasMore) {
      console.log(`[Dolibarr] Fetching projects page ${page} (batch ${batchSize})...`);
      const batch = await this.getProjects({ limit: batchSize, page });
      all.push(...batch);
      console.log(`[Dolibarr] Got ${batch.length} projects (total: ${all.length})`);
      hasMore = batch.length >= batchSize;
      page++;
    }

    return all;
  }

  /**
   * Fetch a single project by ID
   */
  async getProjectById(projectId: number | string): Promise<DolibarrProject | null> {
    try {
      const result = await this.request<DolibarrProject>(`projects/${projectId}`);
      return result;
    } catch (error: any) {
      if (error.message?.includes('404')) return null;
      throw error;
    }
  }

  /**
   * Fetch all bank accounts
   */
  async getBankAccounts(): Promise<DolibarrBankAccount[]> {
    const result = await this.request<DolibarrBankAccount[]>('bankaccounts', {
      limit: 100,
      sortfield: 't.rowid',
      sortorder: 'ASC',
    });
    return Array.isArray(result) ? result : [];
  }

  /**
   * Fetch all accounting accounts from Dolibarr chart of accounts
   */
  async getAccountingAccounts(): Promise<DolibarrAccountingAccount[]> {
    // Try multiple endpoint variations as Dolibarr API can vary by version
    const endpoints = [
      'accountancy/chartofaccounts',
      'accounting/chartofaccounts', 
      'accountancy/accounts',
    ];
    
    for (const endpoint of endpoints) {
      try {
        const result = await this.request<DolibarrAccountingAccount[]>(endpoint, {
          limit: 5000,
          sortfield: 't.account_number',
          sortorder: 'ASC',
        });
        if (Array.isArray(result) && result.length > 0) {
          return result;
        }
      } catch {
        // Try next endpoint
      }
    }
    
    // Return empty array if all endpoints fail
    return [];
  }

  /**
   * Fetch purchase orders with pagination
   */
  async getPurchaseOrders(params?: DolibarrPaginationParams): Promise<DolibarrPurchaseOrder[]> {
    const result = await this.request<DolibarrPurchaseOrder[]>('supplierorders', {
      limit: params?.limit ?? 100,
      page: params?.page ?? 0,
      sortfield: params?.sortfield ?? 't.rowid',
      sortorder: params?.sortorder ?? 'DESC',
      sqlfilters: params?.sqlfilters,
    });
    return Array.isArray(result) ? result : [];
  }

  /**
   * Fetch a single purchase order by ID with full details including lines
   */
  async getPurchaseOrderById(orderId: number | string): Promise<DolibarrPurchaseOrder | null> {
    try {
      const result = await this.request<DolibarrPurchaseOrder>(`supplierorders/${orderId}`);
      return result;
    } catch (error: any) {
      if (error.message?.includes('404')) return null;
      throw error;
    }
  }

  /**
   * Auto-paginate to fetch ALL purchase orders
   */
  async getAllPurchaseOrders(batchSize: number = 500): Promise<DolibarrPurchaseOrder[]> {
    const all: DolibarrPurchaseOrder[] = [];
    let page = 0;
    let hasMore = true;

    while (hasMore) {
      console.log(`[Dolibarr] Fetching purchase orders page ${page} (batch ${batchSize})...`);
      const batch = await this.getPurchaseOrders({ limit: batchSize, page });
      all.push(...batch);
      console.log(`[Dolibarr] Got ${batch.length} purchase orders (total: ${all.length})`);
      hasMore = batch.length >= batchSize;
      page++;
    }

    return all;
  }

  // ============================================
  // USER API METHODS (HR module — read-only mirror)
  // ============================================

  /**
   * Fetch llx_user records with pagination.
   */
  async getUsers(params?: DolibarrPaginationParams): Promise<DolibarrUser[]> {
    const result = await this.request<DolibarrUser[]>('users', {
      limit: params?.limit ?? 100,
      page: params?.page ?? 0,
      sortfield: params?.sortfield ?? 't.rowid',
      sortorder: params?.sortorder ?? 'ASC',
      sqlfilters: params?.sqlfilters,
    });
    return Array.isArray(result) ? result : [];
  }

  /**
   * Fetch a single llx_user record by rowid.
   */
  async getUserById(userId: number | string): Promise<DolibarrUser | null> {
    try {
      const result = await this.request<DolibarrUser>(`users/${userId}`);
      return result;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes('404')) return null;
      throw error;
    }
  }

  /**
   * Auto-paginate to fetch Dolibarr employee users only (t.employee=1).
   * System/admin accounts (employee=0) are excluded so the HR sync does not
   * create Employee rows for Dolibarr API users, managers without contracts, etc.
   */
  async getAllUsers(batchSize: number = 100): Promise<DolibarrUser[]> {
    const all: DolibarrUser[] = [];
    let page = 0;
    let hasMore = true;

    while (hasMore) {
      const batch = await this.getUsers({
        limit: batchSize,
        page,
        sqlfilters: '(t.employee:=:1)',
      });
      all.push(...batch);
      hasMore = batch.length >= batchSize;
      page++;
    }

    return all;
  }

  // ============================================
  // HOLIDAY API METHODS (HR Phase 3 — Dolibarr leave mirror)
  // ============================================

  /**
   * Fetch llx_holiday records with pagination.
   *
   * The Dolibarr REST endpoint is `/api/index.php/holidays` when the
   * module is enabled. On older / unmodified installs the module is
   * named differently (or not exposed over REST) and the API returns
   * either a 404 or — worse — a 200 with a plain-text "API not found"
   * body that fails JSON parsing. This method swallows *missing module*
   * errors and throws a clean `DolibarrHolidaysNotAvailableError` so
   * the sync service can surface a specific message to the UI.
   */
  async getHolidays(params?: DolibarrPaginationParams): Promise<DolibarrHoliday[]> {
    try {
      const result = await this.request<DolibarrHoliday[] | { message?: string }>('holidays', {
        limit: params?.limit ?? 100,
        page: params?.page ?? 0,
        sortfield: params?.sortfield ?? 't.rowid',
        sortorder: params?.sortorder ?? 'ASC',
        sqlfilters: params?.sqlfilters,
      });
      // Dolibarr returns { message: "No records found" } on empty pages instead of []
      if (Array.isArray(result)) return result;
      return [];
    } catch (error: unknown) {
      if (isHolidaysModuleMissingError(error)) {
        throw new DolibarrHolidaysNotAvailableError(
          error instanceof Error ? error.message : String(error),
        );
      }
      throw error;
    }
  }

  /**
   * Auto-paginate to fetch ALL llx_holiday records.
   */
  async getAllHolidays(batchSize: number = 100): Promise<DolibarrHoliday[]> {
    const all: DolibarrHoliday[] = [];
    let page = 0;
    let hasMore = true;

    while (hasMore) {
      const batch = await this.getHolidays({ limit: batchSize, page });
      all.push(...batch);
      hasMore = batch.length >= batchSize;
      page++;
      // Safety valve — Dolibarr history is bounded, don't loop forever.
      if (page > 500) break;
    }

    return all;
  }

  /**
   * Fetch the holiday type catalogue (llx_c_holiday_types).
   * Used to build the fk_type → OTS LeaveType.code mapping at runtime.
   * Endpoint is absent in many Dolibarr builds — we fall back to an
   * empty list so the caller uses the default mapping.
   */
  async getHolidayTypes(): Promise<DolibarrHolidayType[]> {
    try {
      const result = await this.request<DolibarrHolidayType[]>('holidays/types');
      return Array.isArray(result) ? result : [];
    } catch (error: unknown) {
      if (isHolidaysModuleMissingError(error)) return [];
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes('404')) return [];
      throw error;
    }
  }

  /**
   * Create a supplier (vendor) invoice in Dolibarr.
   * Returns the new Dolibarr invoice ID as a string.
   *
   * @param params.thirdPartyId  Dolibarr fournisseur socid
   * @param params.refSupplier   Our OTS invoice reference (e.g. "MPOWER-2026-04-ABC")
   * @param params.date          Invoice date (JS Date — converted to Unix timestamp)
   * @param params.lines         Line items
   * @param params.note          Optional free-text note on the invoice
   */
  async createSupplierInvoice(params: DolibarrCreateSupplierInvoiceParams): Promise<string> {
    const unixDate = Math.floor(params.date.getTime() / 1000);
    const body = {
      socid: params.thirdPartyId,
      ref_supplier: params.refSupplier,
      type: 0, // standard invoice
      date: unixDate,
      note_public: params.note ?? '',
      lines: params.lines.map(l => ({
        label: l.label,
        qty: l.qty.toString(),
        subprice: l.unitPrice.toFixed(4),
        tva_tx: '0', // VAT handled externally
        product_type: 1, // service
        fk_product: null,
      })),
    };
    // Dolibarr POST /supplierinvoices returns the new invoice ID as a JSON number
    const result = await this.post<number | string>('supplierinvoices', body);
    return String(result);
  }
}

/**
 * Thrown when Dolibarr's `/holidays` REST endpoint returns a non-JSON
 * body containing "API not found (failed to include API file)".
 *
 * ## What this actually is (confirmed on erp.hexametals.com, April 2026)
 *
 * Walid ran the exact same curl twice against the live Dolibarr instance:
 *
 *   GET /api/index.php/users?limit=1
 *     HTTP/2 200
 *     content-type: application/json; charset=utf-8
 *     x-powered-by: Luracast Restler v3.1.0
 *     x-proxy-cache: MISS
 *     [{...valid user JSON...}]
 *
 *   GET /api/index.php/holidays?limit=1
 *     HTTP/2 200
 *     content-type: text/html; charset=UTF-8
 *     x-proxy-cache: HIT                        ← SMOKING GUN
 *     (no x-powered-by: Restler header at all)
 *     API not found (failed to include API file)
 *
 * The failing response is served **from an edge proxy cache**, never
 * reaches PHP, and therefore never reaches Dolibarr. At some point in
 * the past (probably during a transient misconfiguration) Dolibarr
 * returned the line-402 fallback from its own `api/index.php`; the
 * nginx/LiteSpeed layer in front of cPanel cached that HTTP 200 + HTML
 * body; and every `/holidays` request since has been served from that
 * stale cache. Evidence:
 *   - `x-proxy-cache: HIT` on failing response, `MISS` on working one
 *   - `x-powered-by: Restler` header absent from failing response
 *     (Restler never ran)
 *   - Dolibarr's `php_errorlog` has no recent entries (PHP never ran)
 *   - `documents/dolibarr.log` has no recent holiday entries (same)
 *   - Different `host-header` hashes between the two URLs (routed
 *     through different cache shards)
 *
 * ## The fix is on the cache layer, not on Dolibarr
 *
 *   1. **Purge the host-level cache.** cPanel → LiteSpeed Web Cache
 *      Manager → Purge All. If behind Cloudflare, Cloudflare → Caching
 *      → Configuration → Purge Everything, and add a Page Rule for
 *      `<your-domain>/erp/api/*` → Cache Level: Bypass. APIs must never
 *      be cached at the edge.
 *
 *   2. **OTS client-side cache-busting** (shipped in 18.7.4): every
 *      DolibarrClient.request() call appends a `_ts=<ms>` query param
 *      and sends `Cache-Control: no-cache, no-store, must-revalidate`
 *      + `Pragma: no-cache` headers so any intermediate proxy is told
 *      to bypass its cache. Dolibarr's Restler endpoint ignores unknown
 *      query params, so this is harmless upstream.
 *
 * If after doing #1 and upgrading to 18.7.4 the call still fails, then
 * the issue really is on the Dolibarr side (Leave Requests module
 * disabled, missing class file, PHP parse error). Check those in order.
 */
export class DolibarrHolidaysNotAvailableError extends Error {
  constructor(detail: string) {
    super(
      `Dolibarr /holidays returned a non-JSON body. On erp.hexametals.com (April 2026) ` +
        `this was confirmed to be a stale edge-proxy cache hit: a direct curl of ` +
        `/api/index.php/holidays returned HTTP 200 + body "API not found (failed to include API ` +
        `file)" with response header "x-proxy-cache: HIT" and NO "x-powered-by: Restler" header — ` +
        `meaning the response came from a cache layer (LiteSpeed / nginx / Cloudflare) without ` +
        `ever hitting Dolibarr. OTS 18.7.4 defeats this on the client side by appending _ts=<ms> ` +
        `to every Dolibarr request + sending Cache-Control/Pragma no-cache headers. If you still ` +
        `see this error, fix the cache layer: ` +
        `(1) purge the host cache — cPanel → LiteSpeed Web Cache Manager → Purge All; if behind ` +
        `Cloudflare, Cloudflare → Caching → Purge Everything, and add a Page Rule for ` +
        `<domain>/erp/api/* → Cache Level: Bypass. APIs must never be cached at the edge. ` +
        `(2) only if #1 doesn't fix it, the issue is genuinely server-side: verify the Leave ` +
        `Requests module is ON at Dolibarr instance level (top-right ⚙ → Modules / Applications), ` +
        `verify <dolibarr-root>/holiday/class/api_holidays.class.php exists and is readable by the ` +
        `PHP process owner, and check <dolibarr-root>/documents/dolibarr.log for a "Failed to make ` +
        `include_once" line naming the broken file. (${detail})`,
    );
    this.name = 'DolibarrHolidaysNotAvailableError';
  }
}

function isHolidaysModuleMissingError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  if (!msg) return false;
  return (
    msg.includes('non-JSON response') ||
    msg.toLowerCase().includes('api not found') ||
    msg.includes('404')
  );
}

// ============================================
// FACTORY
// ============================================

/**
 * Create a DolibarrClient from environment variables
 */
export function createDolibarrClient(): DolibarrClient {
  const apiUrl = process.env.DOLIBARR_API_URL;
  const apiKey = process.env.DOLIBARR_API_KEY;

  if (!apiUrl || !apiKey) {
    throw new Error(
      'Dolibarr API configuration missing. Set DOLIBARR_API_URL and DOLIBARR_API_KEY environment variables.'
    );
  }

  return new DolibarrClient({
    apiUrl,
    apiKey,
    timeout: parseInt(process.env.DOLIBARR_API_TIMEOUT || '120000', 10),
    maxRetries: parseInt(process.env.DOLIBARR_API_RETRIES || '3', 10),
  });
}
