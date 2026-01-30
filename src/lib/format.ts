// Centralized formatting utilities that respect system settings
// These functions can be used throughout the application

let cachedSettings: {
  currency: string;
  dateFormat: string;
  timezone: string;
} | null = null;

let settingsPromise: Promise<any> | null = null;

// Fetch settings from API (with caching)
async function getSettings() {
  if (cachedSettings) return cachedSettings;
  
  if (settingsPromise) return settingsPromise;
  
  settingsPromise = fetch('/api/settings')
    .then(res => res.ok ? res.json() : null)
    .then(data => {
      if (data) {
        cachedSettings = {
          currency: data.currency || 'SAR',
          dateFormat: data.dateFormat || 'DD-MM-YYYY',
          timezone: data.timezone || 'Asia/Riyadh',
        };
      }
      return cachedSettings;
    })
    .catch(() => null)
    .finally(() => {
      settingsPromise = null;
    });
  
  return settingsPromise;
}

// Clear cache (call when settings are updated)
export function clearSettingsCache() {
  cachedSettings = null;
}

// SAR symbol (Saudi Riyal)
const SAR_SYMBOL = '﷼';

// Format currency based on system settings
export function formatCurrency(amount: number | null | undefined, options?: { showSymbol?: boolean }): string {
  if (amount === null || amount === undefined) return '-';
  
  const showSymbol = options?.showSymbol !== false;
  const formatted = new Intl.NumberFormat('en-SA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  
  return showSymbol ? `${formatted} ${SAR_SYMBOL}` : formatted;
}

// Format date based on system settings (DD-MM-YYYY format)
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '-';
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';
  
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  
  // DD-MM-YYYY format
  return `${day}-${month}-${year}`;
}

// Format date with time
export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '-';
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';
  
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  
  return `${day}-${month}-${year} ${hours}:${minutes}`;
}

// Format date for input fields (YYYY-MM-DD format required by HTML date inputs)
export function formatDateForInput(date: string | Date | null | undefined): string {
  if (!date) return '';
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  
  return `${year}-${month}-${day}`;
}

// Format relative date (e.g., "2 days ago", "in 3 days")
export function formatRelativeDate(date: string | Date | null | undefined): string {
  if (!date) return '-';
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';
  
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays > 0) return `in ${diffDays} days`;
  return `${Math.abs(diffDays)} days ago`;
}

// Validate that end date is not before start date
export function validateDateRange(startDate: string | Date, endDate: string | Date): { valid: boolean; message?: string } {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { valid: false, message: 'Invalid date format' };
  }
  
  if (end < start) {
    return { valid: false, message: 'End date cannot be before start date' };
  }
  
  return { valid: true };
}
