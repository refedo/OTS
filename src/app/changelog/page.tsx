'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, Wrench } from 'lucide-react';

type ChangeItem = { title: string; items: string[] };

type ChangelogVersion = {
  version: string;
  date: string;
  type: 'major' | 'minor' | 'patch';
  status: 'current' | 'previous';
  mainTitle: string;
  highlights: string[];
  changes: {
    added: Array<string | ChangeItem>;
    fixed: Array<string | ChangeItem>;
    changed: Array<string | ChangeItem>;
  };
};

// Version order: Major versions first, then their minor versions
const hardcodedVersions: ChangelogVersion[] = [
  {
    version: '15.10.0',
    date: 'February 24, 2026',
    type: 'minor',
    status: 'current',
    mainTitle: '🔐 RBAC Overhaul & User Management',
    highlights: [
      'Financial module now properly hidden when disabled in role permissions',
      'New isAdmin flag — admin privileges without requiring Admin role',
      'Mobile number field for WhatsApp notifications',
      'Module restrictions enforced on both server and client side',
    ],
    changes: {
      added: [
        'isAdmin flag on User — grants all permissions regardless of role',
        'Mobile number field (international format) for WhatsApp notifications',
        'financial_module and dolibarr_module entries in MODULE_RESTRICTIONS',
        'Better error handling for Project Analysis report',
      ],
      fixed: [
        'RBAC: /api/auth/me now applies restrictedModules filtering (was missing)',
        'Financial sidebar visible despite module being disabled in role',
        'permission-checker.ts refactored to use shared resolveUserPermissions()',
        'Missing navigation permissions for newer financial report pages',
      ],
      changed: [
        'User create/edit forms now include mobile number and admin toggle',
        'API user routes accept isAdmin and mobileNumber fields',
        'Navigation permissions updated for all financial report routes',
      ],
    },
  },
  {
    version: '15.9.0',
    date: 'February 24, 2026',
    type: 'minor',
    status: 'previous',
    mainTitle: '📊 Financial Dashboard Improvements',
    highlights: [
      'All dashboard KPIs are now clickable — links to source reports',
      'New Asset Report and Salaries Report pages',
      'Smart number formatting (K SAR for small amounts)',
      'Salaries now showing correctly and included in expenses',
    ],
    changes: {
      added: [
        'Asset Report — all asset accounts grouped by category with balances',
        'Salaries Report — salary records grouped by month with paid/unpaid status',
        'Projects count on dashboard with sync button',
        'All dashboard KPI cards link to their source reports',
      ],
      fixed: [
        'Salaries showing SAR 0 — falls back to fin_salaries table',
        'Salaries now included in Total Expenses calculation',
        'Invoice sync hash includes fk_project for project link backfill',
      ],
      changed: [
        'Smart formatting: amounts < 1M show as K SAR instead of 0.xxM',
        'Removed duplicate Net Profit Margin — merged into Net Profit card',
        'Removed duplicate Cost of Sales — kept Total Expenses only',
        'Dashboard Row 2 reorganized: Gross Profit, ROA, ROE, Salaries, Projects',
      ],
    },
  },
  {
    version: '15.8.0',
    date: 'February 23, 2026',
    type: 'minor',
    status: 'previous',
    mainTitle: '🐛 Bug Fixes & Statement of Account Export',
    highlights: [
      'Statement of Account PDF export with official form layout',
      'Statement of Account Excel export',
      'Fixed assembly parts page crash',
      'Fixed project analysis report empty data',
    ],
    changes: {
      added: [
        'Statement of Account — PDF export with Hexa Steel branded header, summary, transaction table, and footer',
        'Statement of Account — Excel export with structured worksheet and proper formatting',
      ],
      fixed: [
        'Assembly Parts page crash — totalArea.toFixed null safety when no records match',
        'Project Analysis report empty — requires full sync to populate dolibarr_projects table',
      ],
      changed: [],
    },
  },
  {
    version: '15.7.0',
    date: 'February 23, 2026',
    type: 'minor',
    status: 'previous',
    mainTitle: '📊 Project Analysis Report',
    highlights: [
      'Comprehensive project-level financial analysis',
      'Per-project P&L with cost breakdowns',
      'Monthly revenue vs cost trends',
      'Collection rate tracking',
    ],
    changes: {
      added: [
        'Project Analysis Report — syncs project data from Dolibarr into mirror table',
        'Links customer & supplier invoices to projects via fk_projet',
        'Per-project financial metrics: revenue, collected, outstanding, costs, profit/loss, margin %',
        'Cost breakdown by category: raw materials, subcontractors, transportation, labor, equipment',
        'Monthly revenue vs cost trend with bar chart visualization',
        'Collection rate tracking per project with progress bars',
        'Detail drill-down with full invoice list, payment history, cost breakdown',
      ],
      fixed: [],
      changed: [],
    },
  },
  {
    version: '15.6.0',
    date: 'February 23, 2026',
    type: 'minor',
    status: 'previous',
    mainTitle: '📊 Cost Structure & Expenses Analysis',
    highlights: [
      'Project Cost Structure Report',
      'Expenses Analysis Report',
      'Visual cost breakdowns with charts',
      'Period-over-period comparisons',
    ],
    changes: {
      added: [
        'Project Cost Structure Analysis — breakdown by category with bar chart distribution',
        'Smart category detection from product labels (Arabic & English) and accounting codes',
        'Monthly cost trend with stacked bar visualization',
        'Cost by supplier ranking with percentage breakdown',
        'Expenses Analysis Report — detailed expense breakdown by CoA category',
        'Period-over-period comparison with change %',
        'Monthly expense trend with stacked bar visualization',
        'Top 50 expense items ranked by amount',
      ],
      fixed: [],
      changed: [],
    },
  },
  {
    version: '15.5.0',
    date: 'February 23, 2026',
    type: 'minor',
    status: 'previous',
    mainTitle: '✨ Tasks Module Enhancement',
    highlights: [
      'Task Requester field',
      'Task Release Date field',
      'Tasks Dashboard with team performance',
      'Personalized task notifications',
    ],
    changes: {
      added: [
        'Task Requester field — choose/change who requested the task',
        'Requester shown in table view, detail view, and full form',
        'Task Release Date field — target release/delivery date separate from due date',
        'Tasks Dashboard — team performance overview with summary cards',
        'Per-member stats: assigned tasks, completed, pending, success rate, schedule slips',
        'Success rate = % of completed tasks finished on or before due date',
        'Personalized task notifications on assignment, completion, and reassignment',
      ],
      fixed: [],
      changed: [],
    },
  },
  {
    version: '15.4.0',
    date: 'February 22, 2026',
    type: 'minor',
    status: 'previous',
    mainTitle: '📊 Chart of Accounts & Financial Reports Polish',
    highlights: [
      'Full CoA with English + Arabic Labels',
      'Collapsible Hierarchical CoA Tree',
      'VAT Summary Redesign',
      'SOA Third Party Name Dropdown',
      'Aging Report Key Prop Fix',
      'Salary Query Broadened',
    ],
    changes: {
      added: [
        {
          title: 'Chart of Accounts — Full Dolibarr Data',
          items: [
            '227 accounts seeded with English and Arabic names from Dolibarr',
            'Parent-child hierarchy with correct parent_code relationships',
            'Collapsible tree levels with Collapse All / Expand All buttons',
            'Separate English and Arabic name columns in table',
          ],
        },
        {
          title: 'SOA Third Party Name Dropdown',
          items: [
            'Statement of Account now shows a dropdown of customers/suppliers by name',
            'Dropdown loaded from new /api/financial/reports/soa/thirdparties endpoint',
            'Shows invoice count per third party for easy identification',
          ],
        },
        {
          title: 'VAT Summary Redesign',
          items: [
            'Net VAT Payable/Refundable shown as prominent main figure',
            'Output and Input VAT shown as compact sub-figures beneath',
          ],
        },
      ],
      fixed: [
        'Salaries query broadened to match Dolibarr CoA codes 4102, 4103, 42001, 4115, 4118 + Arabic names',
        'Aging Report — fixed React "key" prop warning in tbody rendering',
        'SOA — replaced raw Dolibarr ID input with named third party dropdown',
      ],
      changed: [],
    },
  },
  {
    version: '15.3.0',
    date: 'June 2025',
    type: 'minor',
    status: 'previous',
    mainTitle: '🔧 Financial & Tasks Enhancements',
    highlights: [
      'Dolibarr Salaries Integration',
      'Dashboard Numbers in Millions (M)',
      'VAT Report Drill-down to Invoices',
      'Tasks Reject Symbol + New Columns',
      'CoA Parent/Child Hierarchy',
      'Back Buttons on All Reports',
      'Cash Out Fix for 2025/2026',
      'Journal Entries Page Fix',
      'GMT+3 Sync Time Display',
    ],
    changes: {
      added: [
        {
          title: 'Dolibarr Salaries Integration',
          items: [
            'Salaries & Wages now fetched directly from Dolibarr salaries API',
            'Automatic fallback to journal entries if API unavailable',
            'Period-filtered salary totals on dashboard',
          ],
        },
        {
          title: 'Dashboard Numbers in Millions',
          items: [
            'All KPI cards now show amounts in SAR M format',
            'Exact SAR amount displayed beneath in smaller text',
            'Applied to Revenue, Expenses, Net Profit, AR, AP, VAT, Salaries, Gross Profit, Cost of Sales',
          ],
        },
        {
          title: 'VAT Report Enhancements',
          items: [
            'Output/Input VAT sections are now collapsible with totals shown in header',
            'Click any VAT rate row to drill down into individual invoice lines',
            'Invoice detail shows Ref, Client/Supplier, Date, Product, HT, VAT, TTC',
          ],
        },
        {
          title: 'Tasks: Reject Symbol in Project Management View',
          items: [
            'Reject button (XCircle) now visible for completed tasks in project management view',
            'Rejected tasks show ShieldX icon with "Rejected" label',
            'Approval/Reject actions properly separated',
          ],
        },
        {
          title: 'Tasks: Requester & Release Date Columns',
          items: [
            'New "Requester" column shows task creator name',
            'New "Release Date" column shows date submitted for approval',
          ],
        },
        {
          title: 'Chart of Accounts Hierarchy',
          items: [
            'Accounts displayed in parent/child tree structure with indentation',
            'Parent accounts shown bold with ▸ indicator',
            'Child accounts show ↳ parent code reference',
            'Edit form now uses dropdown for parent account selection',
          ],
        },
        'Back button added to all financial report pages (Trial Balance, Income Statement, Balance Sheet, Aging, VAT, Journal Entries)',
      ],
      fixed: [
        'Cash Out showing 0 for 2025 & 2026 — added journal entry and paid invoice fallbacks',
        'Journal Entries page not loading — fixed LIMIT/OFFSET parameter binding issue',
        'Last sync time now displays in GMT+3 (Asia/Riyadh) timezone',
      ],
      changed: [],
    },
  },
  {
    version: '15.2.0',
    date: 'February 23, 2026',
    type: 'minor',
    status: 'previous',
    mainTitle: '📊 Financial Module Enhancements',
    highlights: [
      'Multi-year Dashboard Filtering',
      'ROA/ROE & Profit Margins',
      'Statement of Account (SOA)',
      'Cash Flow Forecast (13-week)',
      'Project Profitability Report',
      'WIP Report',
      'Monthly Cash In/Out',
      'Projects Financial Dashboard',
      'Payment Terms in Aging Report',
      'CoA Hierarchy View',
    ],
    changes: {
      added: [
        {
          title: 'Enhanced Financial Dashboard',
          items: [
            'Multi-year range filter (from/to year selectors)',
            'Gross Profit & Gross Margin % card',
            'Net Profit Margin % card',
            'ROA (Return on Assets) % card',
            'ROE (Return on Equity) % card',
            'Cost of Sales card with % of revenue',
            'Salaries & Wages card with % of expenses',
          ],
        },
        {
          title: 'Statement of Account (SOA) Report',
          items: [
            'Per-client or per-supplier account statement',
            'Running balance with invoices and payments',
            'Date range filtering',
            'Summary totals: invoiced, paid, outstanding',
          ],
        },
        {
          title: 'Monthly Cash In / Cash Out Report',
          items: [
            'Monthly breakdown of customer collections vs supplier payments',
            'Year selector for historical comparison',
            'Summary cards: total cash in, cash out, net flow',
          ],
        },
        {
          title: 'Cash Flow Forecast (13-week rolling)',
          items: [
            'Projects cash position 13 weeks ahead',
            'Based on unpaid invoice due dates',
            'Opening balance from current bank totals',
            'Deficit warnings when projected balance goes negative',
          ],
        },
        {
          title: 'Project Profitability Report',
          items: [
            'Revenue by client with invoice counts',
            'Collection rates per client',
            'Supplier costs breakdown',
            'Gross margin calculation',
          ],
        },
        {
          title: 'WIP (Work-In-Progress) Report',
          items: [
            'Outstanding receivables with days since invoice',
            'Outstanding payables with aging indicators',
            'Net WIP calculation (AR WIP − AP WIP)',
          ],
        },
        {
          title: 'Projects Financial Dashboard',
          items: [
            'Total projects count with invoicing summary',
            'Collection rate and gross margin KPIs',
            'Per-client detail table with all financial metrics',
          ],
        },
        {
          title: 'Chart of Accounts Hierarchy',
          items: [
            'API endpoint for hierarchical CoA view',
            'Grouped by account type and category',
            'Level totals (subtotals per category, totals per type)',
          ],
        },
      ],
      fixed: [
        'Fixed AP/AR Dashboard showing zero values (now uses per-invoice remaining calculation)',
        'Fixed changelog page crash with mixed string/object entries in added section',
      ],
      changed: [
        'Payment terms now shown next to each aging account (Net 30, Net 60, etc.)',
        'Dashboard API now supports fromYear/toYear query parameters',
        'Added 6 new report links to sidebar navigation under Financial Reports',
      ],
    },
  },
  {
    version: '15.1.0',
    date: 'February 22, 2026',
    type: 'minor',
    status: 'previous',
    mainTitle: '⚡ Financial Module Performance & Partial Sync',
    highlights: [
      'Batch journal entry generation (24K+ entries in ~9s)',
      'Partial sync for individual entity types',
      'Individual sync buttons on dashboard',
      'Fixed missing expense entries for 2024 supplier invoices',
    ],
    changes: {
      added: [
        {
          title: 'Partial Sync Support',
          items: [
            'Sync individual entity types: Bank Accounts, Customer Invoices, Supplier Invoices',
            'Regenerate journal entries independently without full re-sync',
            'API endpoint: POST /api/financial/sync?entities=supplier_invoices,journal_entries',
            'Individual sync buttons on financial dashboard for each entity type',
          ],
        },
      ],
      fixed: [
        {
          title: 'Journal Entry Generation',
          items: [
            'Replaced individual INSERT statements with batch INSERTs (500 per batch)',
            'Pre-loads all invoice lines in single queries instead of per-invoice lookups',
            'Fixed 2024 supplier invoices having 0 journal entries (2,243 expense entries now generated)',
            'Total journal entries increased from ~6,891 to ~24,772',
            'Generation time reduced from timeout/failure to ~9 seconds',
          ],
        },
        'Fixed BigInt serialization error in sync status API',
        'Fixed React key prop warning in Aging Report page',
        'Fixed Select.Item empty value error in Journal Entries page',
        'Fixed changelog page crash when rendering object entries',
      ],
      changed: [
        'Increased sync API timeout from 5 to 10 minutes',
        'Added GROUP BY to customer invoice query to prevent duplicate rows from JOIN',
      ],
    },
  },
  {
    version: '15.0.0',
    date: 'February 22, 2026',
    type: 'major',
    status: 'previous',
    mainTitle: '📊 Financial Reporting Module',
    highlights: [
      'Trial Balance, Income Statement & Balance Sheet',
      'VAT Report (ZATCA-ready) with Input/Output breakdown',
      'AR/AP Aging Report with age buckets',
      'Auto-generated double-entry journal entries from Dolibarr',
      'Chart of Accounts management with Arabic support',
    ],
    changes: {
      added: [
        {
          title: 'Financial Reporting Engine',
          items: [
            'Trial Balance with opening, period, and closing balances',
            'Income Statement (P&L) with gross profit, operating profit, and net profit',
            'Balance Sheet with assets, liabilities, equity, and balance verification',
            'VAT Report with 5% and 15% rate breakdown (ZATCA compliance)',
            'AR/AP Aging Report with Current, 1-30, 31-60, 61-90, 90+ day buckets',
          ],
        },
        {
          title: 'Financial Data Sync from Dolibarr',
          items: [
            'Customer invoice sync with line-level detail and VAT rates',
            'Supplier invoice sync with payment tracking',
            'Payment sync per invoice (customer and supplier)',
            'Bank account sync with balances from Dolibarr',
            'MD5 hash-based change detection for efficient syncing',
          ],
        },
        {
          title: 'Auto-Generated Journal Entries',
          items: [
            'Double-entry bookkeeping from synced invoices and payments',
            'Customer invoice → Debit AR, Credit Revenue + VAT Output',
            'Supplier invoice → Debit Expense + VAT Input, Credit AP',
            'Payments → Debit/Credit Bank and AR/AP accounts',
            'Credit note support with reversed entries',
            'Configurable default account mappings',
          ],
        },
        {
          title: 'Chart of Accounts',
          items: [
            'Full CRUD for chart of accounts with Arabic name support',
            'Account types: Asset, Liability, Equity, Revenue, Expense',
            'Category grouping for structured reports',
            'Pre-populated Saudi standard chart of accounts',
          ],
        },
        {
          title: 'Financial Settings',
          items: [
            'Default account mapping configuration (AR, AP, Revenue, Expense, VAT)',
            'Bank account to accounting code mapping',
            'Automated 2-hour sync via cron endpoint',
          ],
        },
      ],
      fixed: [],
      changed: [
        'Added Financial Reports section to sidebar navigation',
        'Updated navigation permissions for financial module routes',
        'Extended Dolibarr API client with invoice, payment, and bank account methods',
      ],
    },
  },
  {
    version: '14.0.0',
    date: 'February 22, 2026',
    type: 'major',
    status: 'previous',
    mainTitle: '🔗 Dolibarr ERP Integration Module',
    highlights: [
      'Dolibarr v22.0.1 REST API Integration',
      'Product & Third Party Sync with Change Detection',
      'Steel Product Specifications System',
      'Bulk Specs Assignment Tool',
      'Integration Dashboard with Sync History',
    ],
    changes: {
      added: [
        {
          title: 'Dolibarr ERP Integration',
          items: [
            'Full REST API client for Dolibarr v22.0.1 with retry logic and exponential backoff',
            'Mirror tables for products, third parties, and contacts synced from Dolibarr',
            'MD5 hash-based change detection — only updates records that actually changed',
            'Soft-delete for records removed from Dolibarr (preserves history)',
            'Automatic Unix timestamp conversion and string-to-number parsing for Dolibarr API',
            'PMP (Weighted Average Cost) field mapped for production costing',
          ],
        },
        {
          title: 'Steel Product Specifications',
          items: [
            'OTS-native steel specs table with grade, profile, dimensions, weight, and material properties',
            'Pre-populated steel grade reference data (S235JR through HARDOX500)',
            'Pre-populated profile reference data (IPE, HEA, HEB, UPN with standard dimensions)',
            'Auto-fill dimensions when selecting a standard profile size',
            'Surface finish, coating, and operational attributes (lead time, min order qty)',
            'Fabrication and welding notes per product',
          ],
        },
        {
          title: 'Bulk Specs Assignment',
          items: [
            'Pattern matching interface to assign specs to multiple products at once',
            'Preview matched products before applying changes',
            'Match by product ref or label with contains pattern',
            'COALESCE-based updates preserve existing specs when bulk-assigning',
          ],
        },
        {
          title: 'Integration Dashboard',
          items: [
            'Connection status card with Dolibarr version and API permissions check',
            'Sync status with last sync times and record counts',
            'Quick sync buttons for individual entity types or full sync',
            'Sync history table showing last 10 runs with duration and counts',
            'Products tab with search, profile type, and steel grade filters',
            'Third parties tab with customer/supplier type filter',
            'Steel specs editor modal with auto-populate from reference data',
          ],
        },
        {
          title: 'API & Infrastructure',
          items: [
            'Protected cron endpoint for automated 30-minute sync cycles',
            'Reference data API for steel grades and profiles (dropdown population)',
            'Comprehensive sync logging with duration, counts, and error tracking',
            'Integration config table for sync settings management',
          ],
        },
        {
          title: 'Login Form Enhancement',
          items: [
            'Added password visibility toggle (eye icon) to login form',
            'Users can now preview their password while typing',
          ],
        },
      ],
      fixed: [
        {
          title: 'Appearance System Removal',
          items: [
            'Removed broken Appearance/Theme system that was overriding CSS variables with incompatible HSL values',
            'Root cause: ThemeProvider used HSL format while globals.css uses oklch',
            'Cleaned up 400+ lines of glass morphism CSS that caused visual glitches',
            'System restored to clean default muted theme defined in globals.css',
          ],
        },
      ],
      changed: [
        {
          title: 'Navigation & Infrastructure',
          items: [
            'Added Dolibarr ERP section to sidebar navigation',
            'Updated navigation permissions for Dolibarr integration routes',
            'Added environment variables for Dolibarr API configuration',
            'Removed Appearance tab from Settings page and sidebar (was causing UI corruption)',
            'Replaced appearance page with redirect to main settings',
            'Simplified ThemeProvider to passthrough that clears saved theme data',
          ],
        },
      ],
    },
  },
  {
    version: '13.6.0',
    date: 'February 22, 2026',
    type: 'minor',
    status: 'previous',
    mainTitle: '🔗 Dolibarr ERP Integration Module',
    highlights: [
      'Dolibarr v22.0.1 REST API Integration',
      'Product & Third Party Sync with Change Detection',
      'Steel Product Specifications System',
      'Bulk Specs Assignment Tool',
      'Integration Dashboard with Sync History',
    ],
    changes: {
      added: [
        {
          title: 'Dolibarr ERP Integration',
          items: [
            'Full REST API client for Dolibarr v22.0.1 with retry logic and exponential backoff',
            'Mirror tables for products, third parties, and contacts synced from Dolibarr',
            'MD5 hash-based change detection — only updates records that actually changed',
            'Soft-delete for records removed from Dolibarr (preserves history)',
            'Automatic Unix timestamp conversion and string-to-number parsing for Dolibarr API',
            'PMP (Weighted Average Cost) field mapped for production costing',
          ],
        },
        {
          title: 'Steel Product Specifications',
          items: [
            'OTS-native steel specs table with grade, profile, dimensions, weight, and material properties',
            'Pre-populated steel grade reference data (S235JR through HARDOX500)',
            'Pre-populated profile reference data (IPE, HEA, HEB, UPN with standard dimensions)',
            'Auto-fill dimensions when selecting a standard profile size',
            'Surface finish, coating, and operational attributes (lead time, min order qty)',
            'Fabrication and welding notes per product',
          ],
        },
        {
          title: 'Bulk Specs Assignment',
          items: [
            'Pattern matching interface to assign specs to multiple products at once',
            'Preview matched products before applying changes',
            'Match by product ref or label with contains pattern',
            'COALESCE-based updates preserve existing specs when bulk-assigning',
          ],
        },
        {
          title: 'Integration Dashboard',
          items: [
            'Connection status card with Dolibarr version and API permissions check',
            'Sync status with last sync times and record counts',
            'Quick sync buttons for individual entity types or full sync',
            'Sync history table showing last 10 runs with duration and counts',
            'Products tab with search, profile type, and steel grade filters',
            'Third parties tab with customer/supplier type filter',
            'Steel specs editor modal with auto-populate from reference data',
          ],
        },
        {
          title: 'API & Infrastructure',
          items: [
            'Protected cron endpoint for automated 30-minute sync cycles',
            'Reference data API for steel grades and profiles (dropdown population)',
            'Comprehensive sync logging with duration, counts, and error tracking',
            'Integration config table for sync settings management',
          ],
        },
      ],
      fixed: [
        'Removed broken Appearance/Theme system that was overriding CSS variables with incompatible HSL values (root cause: ThemeProvider used HSL format while globals.css uses oklch)',
        'Cleaned up 400+ lines of glass morphism CSS that caused visual glitches across all pages',
        'System restored to clean default muted theme defined in globals.css',
      ],
      changed: [
        'Added Dolibarr ERP section to sidebar navigation',
        'Updated navigation permissions for Dolibarr integration routes',
        'Added environment variables for Dolibarr API configuration',
        'Added password visibility toggle (eye icon) to login form',
        'Removed Appearance tab from Settings page and sidebar (was causing UI corruption)',
      ],
    },
  },
  {
    version: '13.5.4',
    date: 'February 20, 2026',
    type: 'patch',
    status: 'previous',
    mainTitle: '🎨 PTS Sync & Appearance Enhancements',
    highlights: [
      'Building Weight Field in Wizard',
      'PTS Building Mapping Dialog',
      'Color Palette Settings',
      'Project Management View Colorization',
      'PTS Sync History Expanded View',
    ],
    changes: {
      added: [
        {
          title: 'Building Management',
          items: [
            'Building weight field in project wizard and buildings table',
            'Building weight displayed on project details page',
          ],
        },
        {
          title: 'PTS Sync Enhancements',
          items: [
            'Building mapping dialog to match PTS buildings with OTS buildings',
            'Auto-extract building designation from part designation if column is empty',
            'Expanded sync history dialog showing all columns',
            'Fixed building designation column mapping (column S)',
          ],
        },
        {
          title: 'Appearance Settings',
          items: [
            'Color palette picker in settings with 6 preset themes',
            'Appearance tab added to main settings page',
            'Project management view colorization by level (project/building/department)',
          ],
        },
      ],
      fixed: [
        'Fixed scope schedule creation - dates now optional',
        'Fixed PTS sync building designation column (S instead of R)',
        'Fixed PTS sync history dialog width',
      ],
      changed: [
        'Project management view rows now color-coded by hierarchy level',
        'Buildings card in PTS sync now clickable to open mapping dialog',
      ],
    },
  },
  {
    version: '13.5.3',
    date: 'February 19, 2026',
    type: 'patch',
    status: 'previous',
    mainTitle: '📋 Task Management & Wizard Enhancements',
    highlights: [
      'Task Rejection with Duplicate Option',
      'Revision & Remark Columns in All Views',
      'Inline Editing in Project Management View',
      'Stage Duration in Weeks (Wizard)',
      'PTS Sync by Date Option',
    ],
    changes: {
      added: [
        {
          title: 'Task Management Enhancements',
          items: [
            'Task rejection workflow with duplicate option for revision tracking',
            'Revision and remark columns in all task views (table, quick add, project management)',
            'Inline editing in project management view without full edit mode',
            'Task description shown below task name in project management view',
            'Date validation: due date cannot be before input date',
          ],
        },
        {
          title: 'Project Wizard Improvements',
          items: [
            'Stage duration now uses weeks (min-max) instead of start-end dates',
            'Stage durations displayed in project details under Dates & Durations',
          ],
        },
        {
          title: 'PTS Sync Enhancements',
          items: [
            'Option to sync production log data by date or by project',
            'Fixed building column mapping (column U instead of T)',
          ],
        },
      ],
      fixed: [
        'Fixed hydration error in login form version display',
        'Fixed PTS sync building column mapping',
        'Project edit page now shows project number and name in header',
      ],
      changed: [
        'Revision field added to full task view and edit mode',
        'Modern alert messages for approval/rejection actions',
      ],
    },
  },
  {
    version: '13.5.2',
    date: 'February 15, 2026',
    type: 'patch',
    status: 'previous',
    mainTitle: '📋 Tasks UI Polish & PTS Preview',
    highlights: [
      'Expand All / Collapse All in Project Management View',
      'Inline Approval Filter Buttons',
      'New Features Tip Banner',
      'PTS Sync Data Preview Before Import',
      'Building Dropdown Shows Full Name',
    ],
    changes: {
      added: [
        {
          title: 'Tasks UI Enhancements',
          items: [
            'Expand All / Collapse All buttons in project management view with default expanded state',
            'Dismissible tip banner highlighting new features (Ctrl+Click, sorting, project view, approval, duplication)',
            'Inline Approved / Not Approved filter buttons next to status filters',
          ],
        },
        {
          title: 'PTS Sync Data Preview',
          items: [
            'Preview first 20 rows of PTS data before importing on the execute page',
            'Shows mapped column data in a scrollable table for verification',
          ],
        },
      ],
      fixed: [
        'Removed duplicate approval filter dropdown from additional filters section',
      ],
      changed: [
        'Project management view rewritten with Table components matching main tasks table',
        'Project management view uses system-consistent muted palette instead of colored backgrounds',
        'Added Assigned To and Priority columns to project management view',
        'Building dropdown in quick add now shows full name with designation (e.g. "Zone 8 Toilet (Z8T)")',
        'Input Date, Due Date, and Completion columns now have min-width to prevent date wrapping',
      ],
    },
  },
  {
    version: '13.5.1',
    date: 'February 15, 2026',
    type: 'minor',
    status: 'previous',
    mainTitle: '📋 Tasks Module Major Enhancement',
    highlights: [
      'Sortable Table Headers',
      'Task Duplication',
      'Multi-Select Filters (Ctrl+Click)',
      'Approval Status Column',
      'Project Management View (Tree)',
    ],
    changes: {
      added: [
        {
          title: 'Tasks Module Features',
          items: [
            'All task table columns are now clickable to sort ascending/descending with visual sort indicators',
            'Duplicate any task via the dropdown menu (creates a copy with "Pending" status)',
            'Hold Ctrl/Cmd and click status or priority buttons to select multiple filters simultaneously',
            'New "Approval" column with shield icon toggle for client approval tracking',
            'Approval timestamp and approver name displayed',
            'New hierarchical tree view: Project → Building → Activity (Department) → Task',
            'Collapsible sections with inline task completion and approval toggles',
          ],
        },
      ],
      fixed: [
        'Filter state now properly uses arrays for multi-select instead of single strings',
      ],
      changed: [
        'Building dropdown now filters based on selected project and resets on change',
        'Tasks table now expands to full width when sidebar is collapsed',
        'Horizontal scroll enabled for wide tables on narrow screens',
      ],
    },
  },
  {
    version: '13.5.0',
    date: 'February 9, 2026',
    type: 'major',
    status: 'previous',
    mainTitle: '🛡️ Security & Performance Major Release',
    highlights: [
      'Complete Server Security Overhaul',
      'Malware Removal & 7-Layer Protection',
      'Memory Optimization (4GB freed)',
      'PTS Sync Features & Bug Fixes',
    ],
    changes: {
      added: [
        {
          title: '🛡️ Complete Server Security Overhaul',
          items: [
            'Removed malware/cryptominer infection (EuXZqNPw process)',
            'Implemented 7-layer security protection system',
            'Added Fail2Ban with automatic IP blocking',
            'Configured Cloudflare DDoS protection',
            'Hardened SSH configuration and disabled root login',
            'Installed ClamAV antivirus with 3.6M signatures',
            'Added comprehensive firewall rules',
          ],
        },
        {
          title: '🚀 Performance & Stability Improvements',
          items: [
            'Freed 4GB RAM from malware consumption',
            'Reduced CPU usage from 96% to 0-3%',
            'Achieved 51% available memory headroom',
            'Zero crashes since security cleanup',
            'PM2 auto-restart configured every 6 hours',
            'Automated daily backups (688K DB + 26M app)',
            'Scheduled weekly virus scans',
          ],
        },
        {
          title: '🔧 PTS Sync Features',
          items: [
            'Fixed sync history not saving (added PTSSyncBatch creation)',
            'Added timeout handling for Google Sheets API (25s timeout)',
            'Implemented auto-map button for column mapping',
            'Added save/load mapping functionality with localStorage',
          ],
        },
      ],
      fixed: [
        'Session Management: Fixed logout session persistence issue',
        'Added multiple cookie domain variations for proper clearing',
        'Client-side storage clearing on login page mount',
        'Cache-busting for version API calls',
        'Fixed UpdateNotificationDialog null check error',
        'Added proper error handling for undefined mappings',
      ],
      changed: [],
    },
  },
  {
    version: '13.4.7',
    date: 'February 7, 2026',
    type: 'minor',
    status: 'previous',
    mainTitle: '🚀 Quick Edit Mode & Bug Fixes',
    highlights: [
      'Quick Edit Mode for Tasks',
      'Hydration Error Resolution',
      'Date Field Preservation',
      'Terminal Noise Reduction',
    ],
    changes: {
      added: [
        {
          title: 'Quick Edit Mode for Tasks',
          items: [
            'Edit tasks directly in the table row without navigating to separate page',
            'All fields become editable inputs/dropdowns when clicking edit button',
            'Supports editing: title, assignee, department, project, building, priority, status, input date, due date, and private flag',
            'Visual feedback with blue background during edit mode',
            'Save and Cancel buttons replace action buttons during editing',
            'Maintains existing date values when entering edit mode',
          ],
        },
      ],
      fixed: [
        'Hydration Error Resolution: Fixed server/client mismatch in login form version display',
        'Version now fetched dynamically on client side to prevent hydration errors',
        'Date Field Preservation: Fixed issue where Input Date and Due Date fields were resetting to empty when entering edit mode',
        'Dates now properly converted from ISO format to YYYY-MM-DD for HTML date inputs',
        'Terminal Noise Reduction: Disabled Prisma query logging to reduce terminal clutter',
        'Only error messages are now logged to terminal',
      ],
      changed: [],
    },
  },
  {
    version: '13.4.6',
    date: 'February 3, 2026',
    type: 'minor',
    status: 'previous',
    mainTitle: '🚀 Performance Improvements & System Stability',
    highlights: [
      'Database Connection Pooling',
      'Memory Leak Detection',
      'System Monitoring API',
      'Cron Job Optimization',
      '51% Memory Usage Reduction',
      '96% Fewer Cron Executions',
    ],
    changes: {
      added: [
        {
          title: 'Database Connection Pooling Middleware',
          items: [
            'Implemented singleton Prisma client with connection reuse',
            'Automatic connection cleanup and graceful shutdown handling',
            'Connection pool monitoring with health checks',
            'Prevents connection timeout errors and improves query performance',
            'Memory saved: 50-100MB, Query speed: 20-50ms faster',
          ],
        },
        {
          title: 'Memory Leak Detection System',
          items: [
            'Lightweight monitoring tracks heap usage every 5 minutes',
            'Detects abnormal growth patterns (>50MB/hour)',
            'Alerts at 85% heap usage with detailed metrics',
            'Auto-starts in production with minimal overhead (~10-15MB)',
          ],
        },
        {
          title: 'System Monitoring API',
          items: [
            'New endpoint: /api/system/monitor (Admin/CEO access only)',
            'Real-time memory metrics and database connection stats',
            'System health dashboard with growth rate analysis',
            'Provides actionable insights for system maintenance',
          ],
        },
      ],
      fixed: [
        'System Stability Issues: Resolved "PM2 process not found" errors',
        'Fixed database connection pool exhaustion',
        'Eliminated event loop latency spikes (9207ms → <100ms)',
        'Prevented system crashes due to memory pressure',
        'Fixed missed cron job executions',
        'Resolved blocking IO warnings in scheduled tasks',
      ],
      changed: [
        'Early Warning Engine: Reduced cron job frequency from hourly to daily at 2:00 AM',
        '96% reduction in executions (24/day → 1/day)',
        'PM2 Configuration: Increased memory limit from 2GB to 4GB',
        'Reduced instances from 2 to 1 (single instance mode)',
        'Memory usage: -51% (840MB → 415MB)',
        'Increased database connection pool limit from 5 to 20 connections',
        'Extended connection timeout from 10s to 20s',
      ],
    },
  },
  {
    version: '13.4.5',
    date: 'February 1, 2026',
    type: 'patch',
    status: 'previous',
    mainTitle: '🐛 Bug Fixes & UI/UX Improvements',
    highlights: [
      'Payment Percentage Import Fix',
      'Task Form Data Loss Fix',
      'Enhanced RAL Color Display',
      'Painting System Total Microns',
      'Project Edit Contract Value Fix',
    ],
    changes: {
      added: [
        {
          title: 'Enhanced RAL Color Display',
          items: [
            'Added RAL color names mapping for 200+ colors (e.g., \'7015\' → \'Slate Grey\')',
            'Display color name below RAL number in italic text',
            'Color preview box shows actual RAL color (12x12 rounded square)',
            'Tooltip shows both RAL number and color name',
            'Improved visual hierarchy with flex-col layout',
          ],
        },
        {
          title: 'Painting System Total Microns',
          items: [
            'Automatic calculation of total microns from all coating layers',
            'Blue-highlighted row showing sum of all coat microns',
            'Format: "Total Microns: 218 μm"',
            'Only displays when coats are defined and total > 0',
          ],
        },
      ],
      fixed: [
        'Payment Percentage Import Issue: Fixed async state issue causing field mappings to be undefined during import',
        'Resolved Excel column name trimming problem (spaces in column headers)',
        'Added automatic payment amount calculation from percentages during import',
        'Task Form Data Loss: Fixed optional fields (building, department) resetting to default when editing tasks',
        'Added buildingId and departmentId to Task type definition',
        'Project Edit Contract Value: Fixed contract value disappearing when editing projects',
        'Changed conversion logic to handle 0 values correctly',
      ],
      changed: [
        'Technical Specifications Section: Set to expand by default for better visibility',
        'Removed duplicate "Contractual Tonnage" field (already in dashboard)',
        'Removed duplicate "3rd Party Required" field below welding specs',
        'Project Dashboard Navigation: Made Tasks card clickable to navigate to tasks page',
        'Links to /tasks?project={projectId} with automatic filtering',
        'Added hover effect and cursor pointer for better UX',
      ],
    },
  },
  {
    version: '13.4.4',
    date: 'February 1, 2026',
    type: 'patch',
    status: 'previous',
    mainTitle: '🎨 UI/UX Improvements',
    highlights: [
      'Sticky Table Headers',
      'Distinct Header Styling',
      'Improved Data Readability',
      'New Workflow Phase: Detailing',
      'Production Daily Report (PDR)',
      'New Project Wizard Page',
    ],
    changes: {
      added: [
        {
          title: 'Table Header Styling',
          items: [
            'Sticky table headers across all tables in the system',
            'Distinct background color (slate-100/slate-800) for headers to differentiate from records',
            'Headers remain visible when scrolling through long tables',
            'Improved visual hierarchy and data readability',
          ],
        },
        {
          title: 'Production Daily Report (PDR) Table',
          items: [
            'Added comprehensive daily production breakdown at bottom of production dashboard',
            'Shows when project is selected with data by process type',
            'Includes all processes: Cutting, Fit-up, Welding, Visualization, Sandblasting, Galvanization, Painting, Dispatch columns',
            'Color-coded headers for easy process identification',
          ],
        },
      ],
      fixed: [],
      changed: [
        'Applied consistent header styling system-wide',
        'Enhanced contrast between headers and data rows',
        'Better user experience for data-heavy pages',
        'Project Workflow Phase Update: Design → Detailing (Shop Drawings) → Procurement → Production → Coating → Dispatch & Delivery → Erection → Handover',
        'Renamed "Shop Drawing" to "Detailing (Shop Drawings)" and "Fabrication" to "Production" for clarity',
        'Updated work unit dependencies and risk register workflows to include new Detailing phase',
        'Added new project wizard page for cranes, surveyors, and 3rd party testing configuration',
      ],
    },
  },
  {
    version: '13.4.3',
    date: 'January 31, 2026',
    type: 'minor',
    status: 'previous',
    mainTitle: '🎨 UI/UX Improvements & System Enhancements',
    highlights: [
      'Success Dialog Component',
      'Date Validation in Wizard',
      'Cranes Question Update',
      'SAR Currency Format',
      'DD-MM-YYYY Date Format',
    ],
    changes: {
      added: [
        {
          title: 'Success Dialog Component',
          items: [
            'Created reusable SuccessDialog component with modern design',
            'Green checkmark icon and Cancel/OK buttons',
            'Replaces browser alerts throughout the system',
            'Updated project wizard to use success dialog',
          ],
        },
        {
          title: 'Centralized Formatting Utilities',
          items: [
            'Created src/lib/format.ts for consistent formatting',
            'Prepared for system settings integration',
          ],
        },
      ],
      fixed: [],
      changed: [
        'Date Validation: Prevent end date before start date in wizard scope schedules',
        'Cranes Question: Only shows when Erection scope is selected, changed wording to "Cranes for Installation?"',
        'Currency Format: Changed from USD ($) to Saudi Riyal (﷼) - Format: "1,234.56 ﷼"',
        'Date Format: Changed from DD/MM/YYYY to DD-MM-YYYY across all key components',
      ],
    },
  },
  {
    version: '13.4.2',
    date: 'January 28, 2026',
    type: 'patch',
    status: 'previous',
    mainTitle: '🚀 Navigation & System Stability Enhancements',
    highlights: [
      'Project Navigation Controls',
      'PM2 Stability Improvements',
      'Enhanced Error Recovery',
    ],
    changes: {
      added: [
        {
          title: 'Project Navigation Controls',
          items: [
            'Added back/forward navigation arrows to project detail pages',
            'Navigate seamlessly between projects without returning to list',
            'Back to list button for quick return to projects overview',
            'Visual separator between navigation controls',
            'Disabled state for arrows when at first/last project',
            'Navigation based on project creation order',
          ],
        },
      ],
      fixed: [
        'Increased memory limit from 1G to 2G to prevent crashes',
        'Added exponential backoff for restart delays',
        'Increased listen timeout from 10s to 30s',
        'Increased kill timeout from 5s to 10s',
        'Enhanced graceful shutdown handling',
        'Improved auto-restart configuration (15 max restarts, 30s min uptime)',
        'Added NODE_OPTIONS for better memory management',
        'Fixed 502 Bad Gateway errors caused by PM2 crashes',
      ],
      changed: [
        'Updated PM2 configuration for better production stability',
        'Enhanced error recovery mechanisms',
      ],
    },
  },
  {
    version: '13.4.1',
    date: 'January 17, 2026',
    type: 'patch',
    status: 'previous',
    mainTitle: '🔧 Planning Enhancements & Bug Fixes',
    highlights: [
      'Division Column in Planning',
      'Renamed Shop Drawing to Detailing',
      'Building Edit Error Fixed',
      'Building Filter Added',
    ],
    changes: {
      added: [
        {
          title: 'Division Column in Planning',
          items: [
            'Added Division column before Scope in planning page',
            'Auto-assigns division based on scope type (Engineering, Operations, Site)',
            'Color-coded badges: Engineering (purple), Operations (green), Site (orange)',
            'Division helper function for consistent assignment logic',
          ],
        },
        {
          title: 'Building Filter',
          items: [
            'Added building filter next to project filter in planning page',
            'Shows all buildings when no project selected',
            'Shows project-specific buildings when project is selected',
            'Fixed duplicate building keys issue',
          ],
        },
      ],
      fixed: [
        'Fixed building edit error: Cannot read properties of null (reading toUpperCase)',
        'Fixed duplicate building keys in filter dropdown',
        'What\'s New dialog now shows only once per version update',
      ],
      changed: [
        'Renamed "Shop Drawing" to "Detailing" throughout the system',
        'Updated all UI labels, API responses, and database records',
        'Updated document types, scope options, and timeline displays',
        'Updated operation timeline service to use "Detailing"',
      ],
    },
  },
  {
    version: '13.4.0',
    date: 'January 8, 2026',
    type: 'minor',
    status: 'previous',
    mainTitle: '🎯 CEO Role & System Update Notifications',
    highlights: [
      'CEO Superadmin Role',
      'Update Notification System',
      'Production Error Fixes',
      'Planning Page Layout Improvements',
    ],
    changes: {
      added: [
        {
          title: 'CEO Superadmin Role',
          items: [
            'New CEO role with all system privileges (higher than Admin)',
            'CEO automatically has access to all features and modules',
            'Updated 30+ files to include CEO in permission checks',
            'CEO can create, edit, delete, and approve all content',
            'Added to role hierarchy: CEO > Admin > Manager > Engineer > Operator',
          ],
        },
        {
          title: 'System Update Notifications',
          items: [
            'Beautiful popup dialog shows what\'s new after system updates',
            'Displays new features, bug fixes, and improvements',
            'Shows once per user when logging in after an update',
            'Organized by categories with color-coded sections',
            'Link to full changelog for detailed information',
          ],
        },
      ],
      fixed: [
        'Fixed production error: DocumentSubmission query using wrong model',
        'Scope schedules now correctly query DocumentSubmission instead of Document',
        'Fixed buildingId field error in document progress calculation',
        'Planning page layout now uses full width when sidebar is collapsed',
        'Removed excessive whitespace on planning page',
      ],
      changed: [
        'Updated RBAC system to recognize CEO as superadmin',
        'All permission checks now include CEO role',
        'Planning page layout standardized with ResponsiveLayout',
        'Improved system-wide permission consistency',
      ],
    },
  },
  {
    version: '13.3.3',
    date: 'January 7, 2026',
    type: 'patch',
    status: 'previous',
    mainTitle: '🔧 System Improvements & UI Enhancements',
    highlights: [
      'Production Activities Progress Table',
      'About OTS™ Page',
      'Session Management Fixes',
      'Simplified Import Fields',
    ],
    changes: {
      added: [
        {
          title: 'Production Activities Progress Table',
          items: [
            'Replaced Recent Production Logs with comprehensive daily progress table',
            'Shows weight and quantity by process type (Preparation, Fit-up, Welding, Visualization, Sandblasting, Galvanization, Painting)',
            'Daily average row for quick insights',
            'Color-coded rows for better readability',
          ],
        },
        {
          title: 'About OTS™ Page',
          items: [
            'New system overview page at Settings > About OTS™',
            'Lists all 15+ integrated modules with descriptions',
            'Technical stack information',
            'System statistics and capabilities',
          ],
        },
        {
          title: 'Simplified Import Fields',
          items: [
            'Streamlined production log import to essential fields only',
            'Part Designation, Process Type, Date Processed, Processed Qty, Processing Team, Processing Location',
          ],
        },
      ],
      fixed: [
        'Fixed signout not properly ending session',
        'Added visibility change detection to re-validate session on back button',
        'Added pageshow event handler for bfcache restoration',
        'Users now properly redirected to login after logout',
        'Fixed "useSidebar must be used within SidebarProvider" errors',
        'Fixed React key prop warnings in Production Activities Progress table',
      ],
      changed: [
        'Updated system version to 13.3.3',
        'Import modal now shows only 6 essential fields instead of 12',
        'Updated all 33 layout files to use ResponsiveLayout component',
        'Consistent sidebar behavior across all pages',
      ],
    },
  },
  {
    version: '13.3.2',
    date: 'January 7, 2026',
    type: 'patch',
    status: 'previous',
    mainTitle: '🏭 Production Module Enhancements & Responsive UI',
    highlights: [
      'Multi-Project Import Support',
      'Production Plan Report Improvements',
      'Page Size Selector',
      'Download Template Button',
      'Monthly Target on Production Dashboard',
    ],
    changes: {
      added: [
        {
          title: 'Multi-Project Import Support',
          items: [
            'Import production logs without selecting a project first',
            'Parts are automatically matched by designation across all projects',
            'Single CSV/Excel file can contain entries for multiple projects',
          ],
        },
        {
          title: 'Production Plan Report Improvements',
          items: [
            'Report now correctly filters buildings by fabrication schedule within selected month',
            'Only shows projects with fabrication activities overlapping the selected period',
          ],
        },
        {
          title: 'Page Size Selector',
          items: [
            'Added page size dropdown (50, 100, 200, 500, 1000) for Production Logs page',
            'Added page size dropdown for Assembly Parts page',
            'Persistent pagination preferences',
          ],
        },
        {
          title: 'Download Template Button',
          items: [
            'Added template download button for production log imports',
            'Template includes sample data and all required columns',
          ],
        },
        {
          title: 'Monthly Target on Production Dashboard',
          items: [
            'New Monthly Target card showing current month\'s production quota',
            'Aggregates raw data from buildings with fabrication schedules in current month',
            'Displays target tonnage based on project planning',
          ],
        },
      ],
      fixed: [
        'Fixed production plan report filtering by month',
        'Fixed production logs not showing in dashboard',
        'Fixed assembly parts page pagination',
        'Fixed production log import validation',
      ],
      changed: [
        'Improved production dashboard layout',
        'Enhanced production log import performance',
        'Updated production plan report to use new filtering logic',
      ],
    },
  },
  {
    version: '13.3.1',
    date: 'January 7, 2026',
    type: 'patch',
    status: 'previous',
    mainTitle: '🔧 Fixing Changelog Versioning System',
    highlights: [
      'Accurate Timeline Based on Development History',
      'Proper Module Separation',
      'Corrected Version Numbers',
    ],
    changes: {
      added: [
        {
          title: 'Changelog Improvements',
          items: [
            'Created accurate changelog based on actual development timeline',
            'Separated modules by their actual development phases',
            'Each major module gets its own major version number',
            'Included all incremental updates and patches',
          ],
        },
      ],
      fixed: [
        'Fixed changelog version numbering inconsistencies',
        'Corrected module development dates based on actual code artifacts',
        'Aligned version numbers with module importance and development phases',
      ],
      changed: [
        'Restructured changelog to reflect true development history',
        'Updated version numbering scheme to be more meaningful',
      ],
    },
  },
  {
    version: '13.3.0',
    date: 'January 7, 2026',
    type: 'minor',
    status: 'previous',
    mainTitle: '🔧 Logout Session Handling Fix',
    highlights: [
      'Fixed Production Logout Session Termination',
      'Enhanced Cookie Deletion with Domain Settings',
      'Client-Side Logout with Full Page Redirect',
    ],
    changes: {
      added: [
        {
          title: 'Session Management Improvements',
          items: [
            'Enhanced cookie deletion with domain-specific settings for hexasteel.sa',
            'Implemented client-side logout with full page redirect to prevent cached sessions',
            'Updated both UserMenu and Sidebar logout buttons to use fetch API with forced redirect',
            'Ensured logout redirects to ots.hexasteel.sa/login in production environment',
          ],
        },
      ],
      fixed: [
        'Fixed logout session handling to properly end sessions in production',
        'Replaced form-based logout with fetch API for better session control',
        'Added window.location.href redirect to bypass Next.js router cache',
        'Prevented redirect back to dashboard after logout',
      ],
      changed: [
        'Updated logout mechanism to use fetch API instead of form submission',
        'Added domain-specific cookie deletion for production environment',
      ],
    },
  },
  {
    version: '13.2.1',
    date: 'January 7, 2026',
    type: 'patch',
    status: 'previous',
    mainTitle: '🔧 Version Consistency & Logout Fixes',
    highlights: [
      'Synchronized All Version Displays',
      'Fixed Production Logout Redirect',
      'Package.json Version Updated',
    ],
    changes: {
      added: [
        {
          title: 'Version Consistency System',
          items: [
            'Created comprehensive version synchronization across all components',
            'Updated package.json to match UI version displays',
            'Fixed login page OTS version display',
            'Updated settings/version page with correct version numbers',
          ],
        },
      ],
      fixed: [
        'Fixed logout redirect to use ots.hexasteel.sa/login in production',
        'Synchronized package.json version',
        'Fixed login page version display',
        'Fixed settings/version page',
        'Ensured all version displays are consistent',
      ],
      changed: [
        'Updated changelog to reflect version consistency improvements',
        'Standardized version update process for future releases',
      ],
    },
  },
  {
    version: '13.2.0',
    date: 'January 6, 2026',
    type: 'minor',
    status: 'previous',
    mainTitle: '🎯 QC Dashboard & Process Management Updates',
    highlights: [
      'Process-Dependent Inspection Types',
      'Enhanced Process Types (Fit-up, Welding, Visualization)',
      'QC Dashboard Layout Optimization',
      'RFI/NCR Creation Pages',
    ],
    changes: {
      added: [
        {
          title: 'RFI Process & Inspection Management',
          items: [
            'Updated process types to include Fit-up, Welding, Visualization, Painting, Assembly, Inspection',
            'Inspection types now dynamically update based on selected process type',
            'Process-specific inspection types (e.g., NDT for Welding, Coating for Visualization)',
            'Automatic inspection type reset when process changes',
          ],
        },
        {
          title: 'Create RFI/NCR Pages',
          items: [
            'New dedicated page for creating RFIs at /qc/rfi/new',
            'Multi-select production logs for batch RFI creation',
            'New dedicated page for creating NCRs at /qc/ncr/new',
            'Severity level selection: Critical, High, Medium, Low',
          ],
        },
        {
          title: 'Work Order & Task Management',
          items: [
            'Work Order Production Progress tracking',
            'CEO role now sees ALL tasks across all projects and users',
            'New TaskAuditLog model for tracking all task changes',
            'Task completion tracking with visual progress indicators',
          ],
        },
        {
          title: 'Tasks Counter Enhancement',
          items: [
            'Redesigned tasks counter to match project summary widget style',
            'Added real-time status breakdown with colored indicators',
            'Shows counts for Pending, In Progress, Waiting for Approval, and Completed tasks',
            'Visual separation with gradient background and border',
            'Total tasks count with filtered context display',
          ],
        },
        {
          title: 'Colorized Filter Buttons',
          items: [
            'Status filters: Pending (yellow), In Progress (blue), Waiting for Approval (purple), Completed (green)',
            'Priority filters: High (red), Medium (orange), Low (gray)',
            'Hover states with matching color themes',
            'Improved visual feedback for active filters',
          ],
        },
        {
          title: 'Private Task Feature',
          items: [
            'Auto-mark tasks as private when user assigns to themselves',
            'Manual private task checkbox in full task form',
            'Private tasks only visible to creator and assignee',
            'Lock icon indicator for private tasks in table and grid views',
            'API-level permission enforcement for private task access',
          ],
        },
      ],
      fixed: [
        'Fixed QC dashboard error: "Cannot read properties of undefined (reading assemblyPart)"',
        'Updated QC dashboard to handle productionLogs array structure',
        'Fixed NCR recent items to access production logs through rfiRequest relationship',
        'Fixed QC dashboard layout orientation to match system-wide layout pattern',
        'Optimized QC dashboard width utilization with proper layout structure',
      ],
      changed: [
        'Updated QC dashboard layout to use lg:pl-64 pattern for better width utilization',
        'Standardized QC page structure to match production page layout',
        'Improved error handling for missing production log data',
      ],
    },
  },
  {
    version: '13.1.0',
    date: 'December 28, 2025',
    type: 'minor',
    status: 'previous',
    mainTitle: '📋 Enterprise Audit Trail System',
    highlights: [
      'Automatic Audit Logging',
      'Field-level Change Tracking',
      'Dolibarr-Style Event Management',
      'Bulk Operation Logging',
    ],
    changes: {
      added: [
        {
          title: 'Enterprise Audit Trail System',
          items: [
            'Automatic audit logging for all CRUD operations on critical entities',
            'Field-level change tracking with before/after values',
            'User context and request tracing for all operations',
            'Audit logging integrated into Projects, Tasks, Buildings, Assembly Parts, Production Logs',
            'Login/Logout event tracking',
            'System event logging for bulk operations',
            'API utility helpers: logActivity(), logAuditEvent(), logSystemEvent()',
          ],
        },
        {
          title: 'Dolibarr-Style Event Management',
          items: [
            'Redesigned /events page with professional table layout',
            'Proper date and time display in separate columns (MM/DD/YYYY, HH:MM:SS AM/PM)',
            'Event reference numbers with icons',
            'Owner/user tracking for each event',
            'Category badges (production, auth, record, QC, etc.)',
            'Entity type and project association display',
            'Enhanced filtering by category and event type',
            'Improved pagination with total counts',
          ],
        },
        {
          title: 'Bulk Operation Logging',
          items: [
            'Bulk assembly part import logging',
            'Mass production logging event tracking',
            'Individual production log create/delete logging',
            'Success/failure count tracking for bulk operations',
            'Process type aggregation for mass operations',
          ],
        },
        {
          title: 'Governance Center Documentation',
          items: [
            'Comprehensive Governance Center Guide (docs/GOVERNANCE_CENTER_GUIDE.md)',
            'Quick Reference Guide (docs/GOVERNANCE_QUICK_GUIDE.md)',
            'Audit trail usage documentation',
            'Data recovery procedures',
            'Version history explanation',
            'Best practices for governance',
            'Troubleshooting guide',
            'Permission matrix documentation',
          ],
        },
      ],
      fixed: [],
      changed: [],
    },
  },
  {
    version: '13.0.0',
    date: 'December 23, 2025',
    type: 'major',
    status: 'previous',
    mainTitle: '📚 Knowledge Center Module',
    highlights: [
      'Knowledge Management System',
      'Best Practices Repository',
      'Lessons Learned Database',
      'Project Knowledge Sharing',
    ],
    changes: {
      added: [
        {
          title: 'Knowledge Center',
          items: [
            'Centralized knowledge management system',
            'Best practices documentation and sharing',
            'Lessons learned from completed projects',
            'Technical documentation repository',
            'Search and filter capabilities',
            'Knowledge categorization and tagging',
          ],
        },
        {
          title: 'Knowledge Application',
          items: [
            'Link knowledge entries to specific projects',
            'Track knowledge application and effectiveness',
            'Knowledge reuse metrics and analytics',
          ],
        },
      ],
      fixed: [],
      changed: [],
    },
  },
  {
    version: '12.1.0',
    date: 'December 21, 2025',
    type: 'minor',
    status: 'previous',
    mainTitle: '✅ Tasks Interface Enhancements',
    highlights: [
      'Building Selection in Tasks',
      'Project-Building Dependency',
      'Default Status Changes',
      'Automatic Department Lookup',
    ],
    changes: {
      added: [
        {
          title: 'Tasks Interface Enhancements',
          items: [
            'Building selection in task creation (inline and full form)',
            'Building column added to tasks table',
            'Project-building dependency: buildings filter by selected project',
            'Default task status changed to "In Progress"',
            'Default status filter set to "In Progress"',
            'Automatic department lookup when selecting user',
            'Department auto-populates based on assigned user',
            'Building dropdown disabled until project selected',
            'Building selection resets when project changes',
          ],
        },
      ],
      fixed: [],
      changed: [],
    },
  },
  {
    version: '12.0.0',
    date: 'December 21, 2025',
    type: 'major',
    status: 'previous',
    mainTitle: '📋 Product Backlog Module',
    highlights: [
      'Product Backlog Management',
      'Feature Request Tracking',
      'Priority Management',
      'CEO Control Center',
    ],
    changes: {
      added: [
        {
          title: 'Product Backlog',
          items: [
            'Comprehensive backlog management system',
            'Feature request tracking and prioritization',
            'User story management',
            'Sprint planning capabilities',
            'Backlog grooming and refinement tools',
          ],
        },
        {
          title: 'CEO Control Center',
          items: [
            'Executive dashboard for high-level overview',
            'Strategic decision support tools',
            'Cross-project visibility and analytics',
            'Key metrics and KPI tracking',
          ],
        },
      ],
      fixed: [],
      changed: [],
    },
  },
  {
    version: '11.0.0',
    date: 'December 18, 2025',
    type: 'major',
    status: 'previous',
    mainTitle: '🛡️ System Events & Governance Framework',
    highlights: [
      'System Events Management',
      'Governance Rules Engine',
      'Audit Logging System',
      'Policy Enforcement',
      'Compliance Monitoring',
    ],
    changes: {
      added: [
        {
          title: 'Governance Framework',
          items: [
            'System events management and tracking',
            'Configurable governance rules engine',
            'Automated policy enforcement mechanisms',
            'Real-time compliance monitoring',
            'Audit logging for all system activities',
          ],
        },
        {
          title: 'Policy Management',
          items: [
            'Centralized policy configuration interface',
            'Role-based policy enforcement',
            'Automated compliance checks and validations',
            'Policy violation detection and alerting',
            'Comprehensive audit trail for governance',
          ],
        },
      ],
      fixed: [],
      changed: [],
    },
  },
  {
    version: '10.1.0',
    date: 'December 18, 2025',
    type: 'minor',
    status: 'previous',
    mainTitle: '🔄 PTS Sync Enhancements',
    highlights: [
      'Skipped Items Tracking',
      'Field Mapping Wizard',
      'Production Logs Sync Improvements',
      'Streamlined PTS Sync',
    ],
    changes: {
      added: [
        {
          title: 'PTS Sync Enhancements',
          items: [
            'Show skipped/corrupted items that were not synced',
            'Display reason for each skipped item (missing data, invalid format)',
            'Rollback option per project - delete all PTS-synced data',
            'Completion percentage per synced project',
            'Project stats showing synced parts/logs vs total',
            'Confirmation dialog before rollback with warning',
          ],
        },
        {
          title: 'PTS Sync Field Mapping Wizard',
          items: [
            'New 3-step wizard flow: Map Raw Data → Map Logs → Execute Sync',
            'Visual column mapping UI showing Google Sheets headers with sample data',
            'Map OTS database fields to any Google Sheets column',
            'Required field validation before proceeding',
            'Default mappings pre-configured for standard PTS format',
            'Mappings saved locally for reuse',
          ],
        },
        {
          title: 'Production Logs Sync Improvements',
          items: [
            'Only fetches required fields from Google Sheets: Part#, Process, Processed Qty, Process Date, Process Location, Processed By, Report No.',
            'Project, building, weight, and part name are now read from existing assembly parts (not Google Sheets)',
            'Only syncs logs that have matching assembly parts in OTS',
            'Shows list of skipped items (logs without matching assembly parts) after sync',
            'Shows list of successfully synced items with details (Part#, Process, Project, Building, Action)',
            'Reduced field mapping UI to only show relevant fields',
          ],
        },
        {
          title: 'Streamlined PTS Sync',
          items: [
            'Simplified PTS Sync page with sidebar navigation',
            'Two-phase sync: Assembly Parts first, then Production Logs',
            'Selective sync: Choose which projects and buildings to sync',
            'Select All / Select None buttons for quick selection',
            'Stop Sync button to abort long-running syncs',
            'Live progress indicators showing created/updated/errors counts',
            'Pre-sync validation showing matched vs unmatched projects/buildings',
          ],
        },
        {
          title: 'Assembly Parts & Logs Pagination',
          items: [
            'Pagination for Assembly Parts page (100 items per page)',
            'Pagination for Production Logs page (100 items per page)',
            'Server-side search across all pages (not just current page)',
            'Faster page loads for large datasets (20K+ records)',
          ],
        },
        {
          title: 'PTS/OTS Source Indicators',
          items: [
            'Assembly Parts page shows source badge (PTS Imported / OTS Added)',
            'Production Logs page shows source badge for PTS imported logs',
            'Visual distinction between externally synced and manually added data',
          ],
        },
      ],
      fixed: [
        'Fixed SidebarProvider import error on PTS Sync page',
        'PTS Sync page now uses layout-based sidebar (consistent with other pages)',
        'Fixed PTS-imported items showing as OTS source instead of PTS',
        'Fixed missing weight and area fields during PTS sync',
        'Updated 4581 existing assembly parts to correct PTS source',
      ],
      changed: [
        'Items without building designation are now skipped during sync',
        'Sync results now include detailed project-level statistics',
        'PTS sync now properly sets source=PTS and includes all weight/area fields',
        'PTS Sync page now has separate buttons for Assembly Parts and Production Logs',
        'Added "Import Logs from PTS" button on Production Log page for quick access',
      ],
    },
  },
  {
    version: '10.0.0',
    date: 'December 18, 2025',
    type: 'major',
    status: 'previous',
    mainTitle: '🔄 PTS Sync Module',
    highlights: [
      'PTS Data Synchronization',
      'Automated Data Import',
      'Real-time Sync Status',
      'Data Validation',
    ],
    changes: {
      added: [
        {
          title: 'PTS Sync Integration',
          items: [
            'PTS data synchronization system',
            'Automated data import from external systems',
            'Real-time sync status monitoring',
            'Data validation and cleansing',
            'Sync error reporting and recovery',
          ],
        },
      ],
      fixed: [],
      changed: [],
    },
  },
  {
    version: '9.1.0',
    date: 'December 17, 2025',
    type: 'minor',
    status: 'previous',
    mainTitle: '📅 Project Planning Enhancements',
    highlights: [
      'Multi-select Bulk Deletion',
      'Inline Schedule Editing',
      'Early Warning System Improvements',
    ],
    changes: {
      added: [
        {
          title: 'Project Planning Enhancements',
          items: [
            'Multi-select capability for bulk schedule deletion',
            'Inline editing of existing schedules (start/end dates)',
            'Select all/deselect all functionality',
            'Visual feedback for selected rows',
            'Edit mode with save/cancel actions',
          ],
        },
      ],
      fixed: [
        'Early Warning System now uses actual production log data for progress',
        'Fabrication progress calculated from assembly part weights',
        'Operations Control sidebar emoji characters removed',
        'WorkUnit sync status mapping improved',
      ],
      changed: [
        'Leading indicators service uses production logs for accurate progress',
        'Schedule editing now supports inline date changes',
      ],
    },
  },
  {
    version: '9.0.0',
    date: 'December 17, 2025',
    type: 'major',
    status: 'previous',
    mainTitle: '⚡ Early Warning System & Risk Intelligence',
    highlights: [
      'Predictive Risk Detection',
      'Dependency Management',
      'Capacity Planning',
      'Risk Dashboard',
    ],
    changes: {
      added: [
        {
          title: 'Early Warning System',
          items: [
            'Predictive risk detection algorithms',
            'Advanced dependency management system',
            'Real-time capacity planning tools',
            'Comprehensive risk dashboard',
            'Automated risk mitigation strategies',
          ],
        },
        {
          title: 'Risk Intelligence',
          items: [
            'AI-powered risk analysis and prediction',
            'Dynamic risk scoring and prioritization',
            'Historical risk pattern recognition',
            'Proactive risk alerting system',
            'Risk mitigation recommendation engine',
          ],
        },
      ],
      fixed: [],
      changed: [],
    },
  },
  {
    version: '8.1.0',
    date: 'December 17, 2025',
    type: 'minor',
    status: 'previous',
    mainTitle: '🎯 Operations Intelligence Dashboard',
    highlights: [
      'Dependency Blueprint System',
      'Load Estimation Rules',
      'Capacity Auto-Consumption',
      'Operations Intelligence Dashboard',
    ],
    changes: {
      added: [
        {
          title: 'Dependency Blueprint System',
          items: [
            'Template-based automatic dependency creation',
            'Blueprint matching by project structure type (PEB, Heavy Steel, etc.)',
            'Default blueprint fallback for unmatched projects',
            'Pre-seeded blueprints: Standard Steel Fabrication, PEB Project, Heavy Steel Structure',
            'Workflow: DESIGN → PROCUREMENT → PRODUCTION → QC → DOCUMENTATION',
            'Support for FS (Finish-to-Start), SS (Start-to-Start), FF (Finish-to-Finish) dependencies',
            'Configurable lag days per dependency step',
          ],
        },
        {
          title: 'Load Estimation Rules',
          items: [
            'Smart quantity estimation based on work type and context',
            'Design tasks: Keyword-based drawing count (shop drawing=10, detail=8, connection=6)',
            'Production: Weight from WorkOrder automatically populated',
            'QC: 1 inspection per RFI',
            'Documentation: 1 document per submission',
            'All WorkUnits now have quantity for capacity calculation',
          ],
        },
        {
          title: 'Capacity Auto-Consumption',
          items: [
            'ResourceCapacityService automatically pulls load from WorkUnits',
            'Early Warning Engine detects overloads based on actual work data',
            'No manual capacity entry required per WorkUnit',
            'Real-time capacity utilization tracking',
          ],
        },
        {
          title: 'Operations Intelligence Dashboard',
          items: [
            'Unified view of WorkUnits, Dependencies, and Capacity',
            'System-wide view with project and building filters',
            'Three layout modes: Table, Network Graph, Split View',
            'Interactive dependency network visualization',
            'Real-time capacity utilization per resource type',
            'Create WorkUnit button with live impact preview',
            'Shows blocking dependencies and capacity impact before creation',
            'Click any WorkUnit to see its dependencies and capacity impact',
          ],
        },
      ],
      fixed: [],
      changed: [
        'WorkUnitSyncService now uses blueprint-based dependency creation',
        'Legacy dependency logic retained as fallback when no blueprint exists',
        'Task sync now includes title for load estimation context',
      ],
    },
  },
  {
    version: '7.4.0',
    date: 'December 14, 2025',
    type: 'minor',
    status: 'previous',
    mainTitle: '📊 Planning Activities Widget',
    highlights: [
      'New Planning Activities Widget',
      'Real-time Progress Calculation',
      'Building-level Details',
    ],
    changes: {
      added: [
        {
          title: 'Planning Activities Widget',
          items: [
            'New Planning Activities widget in Project Dashboard',
            'Shows all scope schedules (Design, Shop Drawing, Fabrication, Galvanization, Painting)',
            'Real-time progress calculation based on actual production data',
            'Overall project progress with status breakdown (Completed, On Track, At Risk, Critical)',
            'Expandable building-level details for each activity type',
            'Visual progress bars and status indicators',
          ],
        },
      ],
      fixed: [],
      changed: [],
    },
  },
  {
    version: '8.0.0',
    date: 'December 15, 2025',
    type: 'major',
    status: 'previous',
    mainTitle: '🎯 Operations Control System',
    highlights: [
      'Operations Control Center',
      'Work Unit Tracking',
      'Resource Allocation',
      'At-Risk Identification',
    ],
    changes: {
      added: [
        {
          title: 'Operations Control Center',
          items: [
            'Centralized operations monitoring',
            'Real-time work unit tracking',
            'At-risk work units identification',
            'Resource allocation optimization',
            'Operations dashboard and analytics',
          ],
        },
      ],
      fixed: [],
      changed: [],
    },
  },
  {
    version: '7.3.0',
    date: 'December 14, 2025',
    type: 'minor',
    status: 'previous',
    mainTitle: '📈 Dashboard Improvements',
    highlights: [
      'New Work Orders Widget',
      'Widget Remove Functionality',
      'Improved Mobile Layout',
    ],
    changes: {
      added: [
        {
          title: 'Dashboard Enhancements',
          items: [
            'New Work Orders widget showing pending, in-progress, completed, and overdue counts',
            'Widget remove functionality - hover over widget to see remove button',
            'Improved mobile-responsive grid layout for dashboard widgets',
            'Collapsed sidebar now shows all module icons (not just 3)',
          ],
        },
      ],
      fixed: [],
      changed: [],
    },
  },
  {
    version: '7.2.0',
    date: 'December 14, 2025',
    type: 'minor',
    status: 'previous',
    mainTitle: '🎨 Login Page Branding',
    highlights: [
      'Dolibarr-style Login Page',
      'Configurable Login Logo',
      'Motivational Footer',
    ],
    changes: {
      added: [
        {
          title: 'Login Page Improvements',
          items: [
            'Dolibarr-style login page with white card on dark (#2c3e50) background',
            'Logo displayed inside white card for better visibility',
            'Configurable login logo via Settings → Company → Login Page Logo',
            'Fallback to "HEXA STEEL® - THRIVE DIFFERENT" text if no logo uploaded',
            'Motivational footer with slogan: Hexa Steel® — "Forward Thinking"',
            'Version header showing current system version',
          ],
        },
      ],
      fixed: [],
      changed: [],
    },
  },
  {
    version: '7.1.0',
    date: 'December 14, 2025',
    type: 'minor',
    status: 'previous',
    mainTitle: '🤖 AI Summary Enhancements',
    highlights: [
      'Colorized AI Summary Display',
      'Automatic Urgent Item Detection',
      'Improved Readability',
    ],
    changes: {
      added: [
        {
          title: 'AI Summary Improvements',
          items: [
            'Colorized and structured AI summary display',
            'Automatic detection of urgent items (red highlighting)',
            'Warning items highlighted in orange',
            'Info items displayed in blue',
            'Section headers with visual separation',
            'Improved readability with icons and borders',
          ],
        },
      ],
      fixed: [],
      changed: [],
    },
  },
  {
    version: '7.0.0',
    date: 'December 14, 2025',
    type: 'major',
    status: 'previous',
    mainTitle: '📋 Work Orders Module',
    highlights: [
      'Work Orders Management',
      'User Preferences Menu',
      'Notification Center Restructure',
    ],
    changes: {
      added: [
        {
          title: 'Work Orders Module',
          items: [
            'New Work Orders page under Production module',
            'Create, view, and manage production work orders',
            'Work order status tracking and assignment',
            'Integration with production planning workflow',
          ],
        },
        {
          title: 'User Preferences Menu',
          items: [
            'New user dropdown menu accessible from sidebar',
            'Quick access to profile settings',
            'Change password functionality with secure validation',
            'Direct links to notifications and settings',
            'One-click sign out option',
          ],
        },
        {
          title: 'Notification Center Restructure',
          items: [
            'Notifications now a collapsible menu in sidebar',
            'Quick access sub-items: Delayed Tasks, Approvals, Deadlines',
            'URL-based tab navigation for direct linking',
            'Total badge count displayed on Notifications section header',
            'Per-item sidebar badges for: All Notifications (unread), Delayed Tasks, Deadlines',
          ],
        },
      ],
      fixed: [],
      changed: [],
    },
  },
  {
    version: '6.0.0',
    date: 'December 8, 2025',
    type: 'major',
    status: 'previous',
    mainTitle: '🔔 Notification Center',
    highlights: [
      'Real-time Notifications',
      'AI-powered Summaries',
      'Automatic Deadline Warnings',
      'Task Assignment Alerts',
    ],
    changes: {
      added: [
        {
          title: 'Notification System',
          items: [
            'Real-time notification system for tasks, approvals, and deadlines',
            'Notification bell with unread count badge',
            'Dropdown notification panel with 5 tabs',
            'Full-page notification center at /notifications',
            'AI-powered notification summaries using OpenAI GPT-4',
            'Automatic deadline scanner (runs daily at 8:00 AM)',
            '6 notification types: Task Assigned, Approval Required, Deadline Warning, Approved, Rejected, System',
          ],
        },
        {
          title: 'Database Changes',
          items: [
            'New notifications table with indexes',
            'New NotificationType enum',
            'Foreign key relationship to users table',
          ],
        },
      ],
      fixed: [],
      changed: [],
    },
  },
  {
    version: '5.0.0',
    date: 'November 25, 2025',
    type: 'major',
    status: 'previous',
    mainTitle: '📊 Business Planning Module',
    highlights: [
      'OKR System',
      'Balanced Scorecard KPIs',
      'Annual Plans & Initiatives',
      'SWOT Analysis',
    ],
    changes: {
      added: [
        {
          title: 'Business Planning Module',
          items: [
            'OKR (Objectives and Key Results) system',
            'Balanced Scorecard KPIs tracking',
            'Annual plans and initiatives management',
            'SWOT analysis framework',
            'Strategic goal alignment tools',
            'Performance metrics and dashboards',
          ],
        },
      ],
      fixed: [],
      changed: [],
    },
  },
  {
    version: '4.0.0',
    date: 'October 25, 2025',
    type: 'major',
    status: 'previous',
    mainTitle: '🤖 AI Assistant',
    highlights: [
      'Context-aware AI Assistant',
      'OpenAI Integration',
      'Conversation History',
    ],
    changes: {
      added: [
        {
          title: 'AI Assistant',
          items: [
            'Context-aware AI assistant for operations',
            'OpenAI GPT-4 integration',
            'Natural language processing for task management',
            'Conversation history and context retention',
            'Smart recommendations based on historical data',
          ],
        },
      ],
      fixed: [],
      changed: [],
    },
  },
  {
    version: '3.1.0',
    date: 'October 21, 2025',
    type: 'minor',
    status: 'previous',
    mainTitle: '📐 Engineering Module',
    highlights: [
      'ITP Management',
      'WPS Management',
      'Document Management',
      'Approval Workflows',
    ],
    changes: {
      added: [
        {
          title: 'Engineering Module',
          items: [
            'ITP (Inspection and Test Plan) management',
            'WPS (Welding Procedure Specification) management',
            'Document management system',
            'Approval workflows',
            'Engineering document timeline',
            'Revision control',
          ],
        },
      ],
      fixed: [],
      changed: [],
    },
  },
  {
    version: '3.0.0',
    date: 'October 18, 2025',
    type: 'major',
    status: 'previous',
    mainTitle: '✅ Quality Control Module',
    highlights: [
      'RFI System',
      'NCR Management',
      'Material, Welding, Dimensional, NDT Inspections',
    ],
    changes: {
      added: [
        {
          title: 'Quality Control Module',
          items: [
            'RFI (Request for Inspection) system',
            'NCR (Non-Conformance Report) management',
            'Material inspection tracking',
            'Welding inspection management',
            'Dimensional inspection records',
            'NDT (Non-Destructive Testing) inspection',
            'QC status tracking and reporting',
          ],
        },
      ],
      fixed: [],
      changed: [],
    },
  },
  {
    version: '2.0.0',
    date: 'October 13, 2025',
    type: 'major',
    status: 'previous',
    mainTitle: '🏭 Production Module',
    highlights: [
      'Assembly Part Tracking',
      'Production Log System',
      'Mass Production Logging',
      'Processing Teams and Locations',
    ],
    changes: {
      added: [
        {
          title: 'Production Module',
          items: [
            'Assembly part tracking and management',
            'Production log system',
            'Mass production logging',
            'Processing teams and locations',
            'Production status tracking',
            'Work order management',
          ],
        },
      ],
      fixed: [],
      changed: [],
    },
  },
  {
    version: '1.0.0',
    date: 'October 9, 2025',
    type: 'major',
    status: 'previous',
    mainTitle: '🚀 Initial Release - Core System',
    highlights: [
      'Initial Release',
      'Core System Foundation',
      'Project Management',
      'User Management with RBAC',
      'Task Management System',
    ],
    changes: {
      added: [
        {
          title: 'Core System',
          items: [
            'Project management with multi-building support',
            'Client management and relationship tracking',
            'User management with Role-Based Access Control (RBAC)',
            'Department management and organizational structure',
            'Task management system with assignment and tracking',
          ],
        },
        {
          title: 'Foundation Features',
          items: [
            'Comprehensive dashboard with real-time analytics',
            'Secure authentication and session management',
            'Responsive design for all device types',
            'Audit logging and activity tracking',
            'Permission system with role-based access',
          ],
        },
        {
          title: 'Project Features',
          items: [
            'Multi-building project support',
            'Project timeline and milestones',
            'Payment milestone tracking',
            'Project status management',
            'Client assignment and tracking',
          ],
        },
      ],
      fixed: [],
      changed: [],
    },
  },
];

export default function ChangelogPage() {
  // Display versions as they are in the array (newest at top, oldest at bottom)
  const versions = hardcodedVersions;

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Changelog</h1>
        <p className="text-muted-foreground">
          Track all updates and improvements to the Hexa Steel Operation Tracking System
        </p>
      </div>

      <div className="space-y-8">
        {versions.map((version) => (
          <Card key={version.version} className={version.status === 'current' ? 'border-blue-500' : ''}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <CardTitle className="text-xl">
                      {version.mainTitle || `Version ${version.version}`}
                    </CardTitle>
                    {version.status === 'current' && (
                      <Badge variant="default" className="bg-blue-500">
                        Current
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{version.date}</span>
                    <Badge variant={version.type === 'major' ? 'destructive' : version.type === 'minor' ? 'default' : 'secondary'}>
                      {version.type.toUpperCase()}
                    </Badge>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-muted-foreground">
                    v{version.version}
                  </div>
                </div>
              </div>
              {version.highlights && (
                <div className="mt-4">
                  <div className="flex flex-wrap gap-2">
                    {version.highlights.map((highlight, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {highlight}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {version.changes.added.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-green-700 mb-3 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Added
                    </h4>
                    <div className="space-y-4">
                      {version.changes.added.map((addition, idx) => (
                        typeof addition === 'string' ? (
                          <ul key={idx} className="list-disc list-inside text-sm text-muted-foreground ml-4">
                            <li>{addition}</li>
                          </ul>
                        ) : addition && typeof addition === 'object' && 'title' in addition ? (
                          <div key={idx}>
                            <h5 className="font-medium text-sm mb-2">{addition.title}</h5>
                            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                              {addition.items.map((item: string, itemIdx: number) => (
                                <li key={itemIdx}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null
                      ))}
                    </div>
                  </div>
                )}

                {version.changes.changed.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-blue-700 mb-3 flex items-center gap-2">
                      <Wrench className="h-4 w-4" />
                      Changed
                    </h4>
                    <div className="space-y-2">
                      {version.changes.changed.map((change, idx) => (
                        typeof change === 'string' ? (
                          <ul key={idx} className="list-disc list-inside text-sm text-muted-foreground ml-4">
                            <li>{change}</li>
                          </ul>
                        ) : change && typeof change === 'object' && 'title' in change ? (
                          <div key={idx}>
                            <h5 className="font-medium text-sm mb-1">{change.title}</h5>
                            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                              {change.items.map((item: string, itemIdx: number) => (
                                <li key={itemIdx}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null
                      ))}
                    </div>
                  </div>
                )}

                {version.changes.fixed.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-orange-700 mb-3 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      Fixed
                    </h4>
                    <div className="space-y-2">
                      {version.changes.fixed.map((fix, idx) => (
                        typeof fix === 'string' ? (
                          <ul key={idx} className="list-disc list-inside text-sm text-muted-foreground ml-4">
                            <li>{fix}</li>
                          </ul>
                        ) : fix && typeof fix === 'object' && 'title' in fix ? (
                          <div key={idx}>
                            <h5 className="font-medium text-sm mb-1">{fix.title}</h5>
                            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                              {fix.items.map((item: string, itemIdx: number) => (
                                <li key={itemIdx}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
