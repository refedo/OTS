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
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error');
          
          // Don't retry on 4xx errors (except 429)
          if (response.status >= 400 && response.status < 500 && response.status !== 429) {
            throw new Error(`Dolibarr API error ${response.status}: ${errorText}`);
          }
          
          throw new Error(`Dolibarr API error ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        return data as T;
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
    timeout: parseInt(process.env.DOLIBARR_API_TIMEOUT || '30000', 10),
    maxRetries: parseInt(process.env.DOLIBARR_API_RETRIES || '3', 10),
  });
}
