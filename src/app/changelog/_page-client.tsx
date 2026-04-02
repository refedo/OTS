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

// Version order: Most recent first
const hardcodedVersions: ChangelogVersion[] = [
  {
    version: '17.4.3',
    date: 'April 3, 2026',
    type: 'patch',
    status: 'current',
    mainTitle: '⚡ Event Bus & UI Polish',
    highlights: [
      'OTSEventEmitter — typed Node.js EventEmitter singleton decouples core services from integration side-effects; listeners registered once at startup via instrumentation.ts',
      'Event Bus card on /settings/integrations — shows live listener counts per event (audit:created, work-order:created, work-order:updated, document:uploaded) with Refresh button',
      'Changelog highlights fix — long highlight strings no longer overflow card borders; replaced single-line badges with a wrapped bullet list',
    ],
    changes: {
      added: [
        {
          title: 'OTSEventEmitter (src/lib/events/ots-emitter.ts)',
          items: [
            'Strongly-typed emit/on/off over OTSEventMap: audit:created, work-order:created, work-order:updated, document:uploaded',
            'setMaxListeners(20) prevents Node.js memory-leak warnings',
            'Zero configuration — no env vars required for the bus itself',
          ],
        },
        {
          title: 'Integration listeners (src/lib/events/integration-listeners.ts)',
          items: [
            'open-audit listener on audit:created — filters OPEN_AUDIT_ENTITIES, fire-and-forget',
            'Libre MES listener on work-order:created — pushOrders(), fire-and-forget',
            'Each listener only registered when its *_ENABLED=true env var is set',
            'Registered once at server startup via instrumentation.ts',
          ],
        },
        'Event Bus card on /settings/integrations#event-bus — violet/Zap, Always Active badge, live listener count per event, Refresh Listeners button',
        'GET /api/integrations/event-bus — returns listenerCount per event from running otsEmitter',
        'Event Bus sidebar link under Integrations section (Zap icon)',
      ],
      changed: [
        'audit.service.ts — replaced inline dynamic-import open-audit hook with otsEmitter.emit(\'audit:created\', ...)',
        'work-orders/route.ts — replaced inline dynamic-import Libre MES hook with otsEmitter.emit(\'work-order:created\', ...)',
      ],
      fixed: [
        'Changelog highlights overflow — highlights rendered as single-line <Badge> overflowed the card border on narrow screens; replaced with wrapped <ul> bullet list',
      ],
    },
  },
  {
    version: '17.4.2',
    date: 'April 2, 2026',
    type: 'patch',
    status: 'previous',
    mainTitle: '🔌 Service Integrations: open-audit, Nextcloud & Libre MES',
    highlights: [
      'open-audit mirror — ISO compliance audit events forwarded automatically to an external open-audit endpoint; configurable via OPEN_AUDIT_* env vars with retry logic and a dedicated event log',
      'Nextcloud document storage — ISO 9001 Clause 7.5 compliant file management via WebDAV; document uploads route to Nextcloud when NEXTCLOUD_ENABLED=true with full share-link support',
      'Libre MES bidirectional sync — work orders pushed to Libre MES PostgreSQL on creation; OEE metrics (availability, performance, quality) pulled from InfluxDB v2 on demand',
      'Integration Settings page — /settings/integrations shows enabled/configured status for all three services with live "Test Connection" health checks',
      'Sidebar Integrations section — quick navigation to Integration Settings, Libre MES Dashboard, Nextcloud Files, and open-audit Log',
      'Build-time env safety — NEXT_PHASE detection prevents env validation errors during next build on CI/CD pipelines without runtime vars',
    ],
    changes: {
      added: [
        {
          title: 'open-audit Integration',
          items: [
            'OpenAuditMirrorLog Prisma model — tracks forwarded compliance events (status: pending/delivered/failed, up to 3 retries)',
            'OpenAuditService — forward(), retryFailed(), getLogs(), checkHealth() singleton',
            'Auto-forward hook in audit.service.ts — fires for WPS, ITP, NCRReport, RFIRequest, Document, QCInspection, Project, WorkOrder entities',
            'GET /api/integrations/open-audit/events — paginated event log with status/entity filters',
            'POST /api/integrations/open-audit/events — retry failed events (Admin/Manager)',
            'GET /api/integrations/open-audit/health — live health check with latency',
            'Env vars: OPEN_AUDIT_ENABLED, OPEN_AUDIT_URL, OPEN_AUDIT_API_KEY',
          ],
        },
        {
          title: 'Nextcloud Integration',
          items: [
            'NextcloudFile Prisma model — references uploaded files by remote WebDAV path with optional share link',
            'WebDAV client — mkdirp, put, get, delete, propfind with path traversal protection',
            'NextcloudService — upload(), download(), delete(), listForEntity(), share(), checkHealth() singleton',
            'Document upload route now routes to Nextcloud when NEXTCLOUD_ENABLED=true (storageBackend: nextcloud | local)',
            'GET /api/integrations/nextcloud/files — list files by entityType + entityId',
            'GET|DELETE /api/integrations/nextcloud/files/[...path] — proxy download and delete',
            'POST /api/integrations/nextcloud/share — create OCS share link',
            'GET /api/integrations/nextcloud/health — WebDAV PROPFIND health check',
            'Env vars: NEXTCLOUD_ENABLED, NEXTCLOUD_URL, NEXTCLOUD_USER, NEXTCLOUD_PASSWORD, NEXTCLOUD_BASE_PATH',
          ],
        },
        {
          title: 'Libre MES Integration',
          items: [
            'LibreMesOrderSync Prisma model — per-WorkOrder sync state (unique on workOrderId)',
            'LibreMesMetricSnapshot Prisma model — OEE metrics: availability, performance, quality, oee',
            'LibreMesSyncLog Prisma model — audit log for every sync operation',
            'InfluxDB v2 client — query (Flux), write (line protocol), ping',
            'node-postgres pool wrapper — generic query<T>, upsertOrder, ping',
            'LibreMesService — pushOrders(), pullMetrics(), fullSync(), getSyncStatus(), checkHealth()',
            'Auto-push hook on WorkOrder creation when LIBRE_MES_ENABLED=true',
            'POST /api/integrations/libre-mes/push-orders — manual push with Zod validation',
            'POST /api/integrations/libre-mes/pull-metrics — pull OEE metrics (from/to/workOrderIds)',
            'GET|POST /api/integrations/libre-mes/sync — status + full sync (Admin/Manager)',
            'GET /api/integrations/libre-mes/health — independent InfluxDB + PostgreSQL health checks',
            'Env vars: LIBRE_MES_ENABLED, LIBRE_MES_PG_*, LIBRE_MES_INFLUX_*',
          ],
        },
        {
          title: 'Integration Settings UI (/settings/integrations)',
          items: [
            'Three status cards: open-audit (Shield/blue), Nextcloud (Cloud/sky), Libre MES (Factory/orange)',
            'Active/Inactive badge per service with configured env var checklist',
            'Test Connection button per card — calls health endpoint, shows latency ms or error message',
            'Copy-to-clipboard for env var names',
            'Footer instructions for .env + pm2 restart ots workflow',
          ],
        },
        'Sidebar Integrations section with links to /settings/integrations (hash-anchored per service)',
        'GET /api/settings/integrations — returns enabled/configured booleans without exposing secret values',
        'navigation-permissions.ts entry for /settings/integrations (permissions: settings.view)',
      ],
      fixed: [
        'Build-time env validation crash — NEXT_PHASE === phase-production-build now skips validateEnv() so CI builds succeed without runtime env vars',
        'Sidebar Integrations section invisible — missing navigation-permissions.ts entry caused hasAccessToRoute() to filter out the entire section',
      ],
      changed: [],
    },
  },
  {
    version: '17.4.1',
    date: 'April 1, 2026',
    type: 'patch',
    status: 'previous',
    mainTitle: '📊 Financial UX & Deploy Optimizations',
    highlights: [
      'Aging Report redesigned — AR/AP toggle buttons, 6 bucket summary cards (Current/1-30/31-60/61-90/90+/Total), color-coded columns and per-bucket expand rows',
      'Statement of Account — Overdue Balance (past-due only) and Total Outstanding (all unpaid) shown as separate stat cards; Credit Limit card with over-limit / headroom indicator',
      'Balance Sheet — year selector dropdown (5 years back) alongside custom date for faster period navigation',
      'Financial Settings — stale account code detection: amber warning badges + summary banner when stored codes are missing from COA',
      'Backlog attachments — images and PDFs open inline in the browser; Eye icon for viewable files, no forced download',
      'Deploy optimizations — conditional npm ci / prisma generate (md5sum check), pm2 reload for zero-downtime, build cache keyed on package-lock.json only',
    ],
    changes: {
      added: [
        {
          title: 'Aging Report redesign',
          items: [
            'AR/AP toggle buttons matching SOA green/red style',
            '6 bucket summary stat cards: Current (green), 1-30 (yellow), 31-60 (orange), 61-90 (red), 90+ (dark red), Total',
            'Color-coded table columns and invoice-level expand rows with overdue days shown in red/green',
            'Mobile-responsive: mid-range bucket columns (31–90 days) hidden on small screens',
          ],
        },
        'Statement of Account — Credit Limit card (5th card, amber) showing outstanding_limit from Dolibarr; over-limit in red, headroom in green',
        'Balance Sheet — year selector dropdown (5 years) that sets as_of_date to Dec 31 of the selected year',
        'Financial Settings — per-field stale code detection with amber ⚠ badge and summary warning banner guiding user to update codes and re-run sync',
        'DB migration add_is_locked_journal_entries.sql — adds is_locked column to fin_journal_entries for legacy production databases; fixes Manual Journal Entries saving',
      ],
      fixed: [
        'Manual Journal Entries not saving on production — is_locked column was absent from fin_journal_entries tables created before the column was added to the schema',
        'SOA Outstanding showing same value as Overdue Balance — lines now carry dateDue; Overdue Balance (past-due only) and Total Outstanding (all unpaid) are now separate cards',
        'Backlog attachments forced download — images and PDFs now served with Content-Disposition: inline and open in a new browser tab via Eye icon link',
      ],
      changed: [
        'Deploy build cache — cache key now hashes only package-lock.json, enabling webpack module cache reuse across code commits (~30-40% faster incremental builds)',
        'Deploy npm ci — conditional on package.json hash; prisma generate conditional on schema.prisma hash; saves ~1-2 min per deploy when dependencies unchanged',
        'Deploy restart — pm2 reload replaces pm2 stop + pm2 restart for zero-downtime rolling worker replacement',
      ],
    },
  },
  {
    version: '17.4.0',
    date: 'April 1, 2026',
    type: 'minor',
    status: 'previous',
    mainTitle: '📒 Financial Accuracy & Manual Journal Entries',
    highlights: [
      'Manual Journal Entries — new /financial/manual-journal-entries page for creating locked double-entry journal entries with live balance validation, journal code guide (OD/AN/RAN/BQ/VTE/ACH/SAL), and COA combobox search',
      'Financial dashboard fix — Revenue and Gross Profit now use journal entry metadata (source_type/journal_code) instead of COA account_type; resilient to COA configuration changes',
      'Balance sheet accuracy — bank account codes auto-added to COA during sync; balance sheet P&L lines use source_type queries',
      'Statement of Account UX — mobile combobox search, Current Outstanding stat card, AR/AP green/red color distinction',
      "PWA install prompt — \"Don't show again\" now correctly persists to localStorage",
    ],
    changes: {
      added: [
        {
          title: 'Manual Journal Entries (/financial/manual-journal-entries)',
          items: [
            'Multi-line double-entry form with live balance indicator (green = balanced, amber = unbalanced with Δ shown)',
            'Journal code selector with OD / AN / RAN / BQ / VTE / ACH / SAL definitions and use descriptions',
            'Collapsible Journal Guide explaining double-entry rules, normal balances per account type, and common transaction patterns',
            'COA combobox with search, account type badges, and autoFocus on open',
            'Entries saved as is_locked=1 (survive sync cycles); piece_num series starts at 9,000,001',
            'DELETE support — remove all lines for a journal entry by piece_num',
            'Sidebar link under Financial section with BookOpen icon; permission: financial.manage or financial.view',
            'POST /api/financial/manual-journal-entries — validates balance (debits = credits ±0.01), assigns piece_num',
            'DELETE /api/financial/manual-journal-entries/[id] — deletes all lines for a given piece_num',
          ],
        },
      ],
      fixed: [
        'Financial dashboard Revenue = 0 / Gross Profit = 0 — revenue, expense, and salary calculations now use source_type + journal_code + label prefix filtering; resilient to COA configuration changes',
        'Balance sheet unbalanced (~12.3M SAR) — bank account codes from fin_bank_accounts now auto-inserted into fin_chart_of_accounts (INSERT IGNORE) during every sync cycle',
        'Balance sheet P&L lines — revenue, expense, and salary totals now use the same source_type queries as the dashboard',
        "PWA install prompt \"Don't show again\" not persisting — ManualInstallGuide now correctly writes to localStorage via onDismissPermanently prop",
        'Statement of Account mobile search — replaced shadcn Select with custom ThirdpartyCombobox matching the Aging Report pattern',
      ],
      changed: [
        'Statement of Account — added Current Outstanding stat card (sum of remainToPay across all report lines) in a 4-column responsive grid',
        'Statement of Account — AR type shown with green styling, AP type with red styling for visual distinction',
        'Removed deprecated financial pages: /financial/account-mapping, /financial/product-categories, /financial/supplier-classification',
      ],
    },
  },
  {
    version: '17.3.2',
    date: 'March 31, 2026',
    type: 'patch',
    status: 'previous',
    mainTitle: '🛠️ Settings & Developer Experience',
    highlights: [
      'Conventional Commits Cheat Sheet — new /settings/commits page with a full dark-theme reference covering semver rules, all 12 commit prefixes, OTS module scope identifiers, and real commit examples with bump badges',
      'Settings Commits tab — dedicated tab in System Settings using the GitCommitHorizontal icon routes to the cheat sheet, following the same pattern as the Version tab',
      'CI fix — resolved npm error code EJSONPARSE that was blocking the Deploy to Digital Ocean workflow (npm ci step)',
    ],
    changes: {
      added: [
        {
          title: 'Conventional Commits Cheat Sheet (/settings/commits)',
          items: [
            'MAJOR / MINOR / PATCH semver cards with colored top borders and trigger pill examples (schema migration, new module page, bug fix, etc.)',
            '12 commit prefix cards with color-coded badges: feat (green), fix (red), refactor (blue), schema (purple), ui (orange), perf (teal), chore (dim), docs (dim), breaking (red), api (teal), auth (blue), seed (orange)',
            '16 OTS module scope identifier chips: 01 projects → 02 planning → … → 15 ai → system',
            'Real-world example blocks: Planning module (minor), Procurement module (minor), Breaking/Schema (major), Chores/System (no bump) — each with a version bump badge',
            'Breaking change syntax callout: ! shorthand after type/scope, and BREAKING CHANGE: footer usage explained with a real schema example',
          ],
        },
        'Settings "Commits" tab — new tab in /settings with GitCommitHorizontal icon; routes to /settings/commits following the same pattern as the Version tab',
      ],
      fixed: [
        'CI npm error code EJSONPARSE — malformed package.json on the deployment branch was blocking npm ci in the Deploy to Digital Ocean workflow; package.json corrected and validated',
      ],
      changed: [],
    },
  },
  {
    version: '17.3.1',
    date: 'March 31, 2026',
    type: 'patch',
    status: 'previous',
    mainTitle: '📋 Payment Schedule Enhancements',
    highlights: [
      'Sortable columns — all table headers in the Payment Schedule Report now sort rows ascending/descending',
      'Partial payment receipts — record multiple partial receipts per payment term with running balance, progress bar, and percentage',
      'Task linkage — pin any payment term to a project task; a green checkmark appears when the task is completed & approved (payment claimable)',
      'Monthly Forecast Card — select any month to see total forecasted collections and an expandable breakdown of contributing payment terms',
      "Cash Flow Forecast drill-down — monthly rows in the 13-week forecast are now expandable, showing the payment schedule entries behind each month's figures",
    ],
    changes: {
      added: [
        'Sortable table headers in Payment Schedule Report (project number, client, slot, amount, received, balance, due date, status, action)',
        {
          title: 'Partial Payment Receipts',
          items: [
            'New ProjectPaymentReceipt Prisma model — stores individual receipts (scheduleId, amount, receivedDate, invoiceRef, notes)',
            'Edit drawer receipt history list with per-receipt delete; adding a receipt auto-aggregates receivedAmount on the parent schedule',
            'Status auto-advances to partially_received when any receipt is recorded',
            'Table column shows received amount, balance remaining, and visual progress bar with percentage',
            'POST / DELETE /api/financial/payment-schedule-report/[id]/receipts endpoints',
          ],
        },
        {
          title: 'Task Linkage',
          items: [
            'Select any task from the current project in the edit drawer — saved as linkedTaskId on ProjectPaymentSchedule',
            'Slot cell shows a green checkmark when the linked task is completed & approved (payment claimable)',
            'Grey link icon shown when the task is still in progress',
          ],
        },
        {
          title: 'Monthly Forecast Card (Payment Schedule page)',
          items: [
            'Month selector covering past 2 months + next 12 months',
            'Displays total forecasted collections (balance remaining) for the selected month',
            'Expandable breakdown table listing each contributing payment term with amount, received, balance, due date, and status',
          ],
        },
        {
          title: 'Cash Flow Forecast — Monthly Drill-Down (/financial/reports/cash-flow-forecast)',
          items: [
            '13-week weeks grouped into calendar months with aggregated collections, payments, and net flow',
            'Each month row is expandable; fetches matching payment schedule entries via dateFrom/dateTo filter',
            'Drill-down results cached per month — re-expanding does not re-fetch',
          ],
        },
      ],
      fixed: [],
      changed: [],
    },
  },
  {
    version: '17.3.0',
    date: 'March 31, 2026',
    type: 'minor',
    status: 'previous',
    mainTitle: '👑 Executive Command Center',
    highlights: [
      'Executive Command Center (/executive) — single-screen real-time operational intelligence dashboard for CEO/CFO with 60-second auto-refresh and dark war-room aesthetic',
      'Five Command Metrics: Active Projects, Production Velocity, Collection Rate, Procurement Exposure, Open Risk Flags — each color-coded RAG with 30-day trend badge and drill-down link',
      'Project Health Matrix — one row per active project across 5 dimensions with server-side computed RAG; click any row for a slide-over full project breakdown',
      'Decisions Required — up to 20 prioritised action items covering approvals, payment triggers, urgent procurement, critical NCRs, and schedule overruns',
    ],
    changes: {
      added: [
        {
          title: 'Executive Command Center (/executive)',
          items: [
            'Full-width dark-theme (slate-950) dashboard with 60-second auto-refresh and visible SVG countdown ring',
            'Five Command Metrics: Active Projects (buildings + contracted tonnes), Production Velocity (monthly tonnes vs target, green ≥90% / amber 70-89% / red <70%), Collection Rate (% + SAR pending, green ≥85%), Procurement Exposure (overdue LCR count + estimated SAR value), Open Risk Flags (critical + warnings count)',
            'Project Health Matrix — compact table: Engineering%, Production%, LCR overdue badge, Collections%, Risk count, server-side RAG (Red/Amber/Green). RAG: red if deadline <30d + prod <70%, OR procurement >3, OR collections <50%',
            'Slide-over project detail panel (shadcn Sheet) with quick-links to production, procurement, and full project page',
            'Cash Flow Snapshot — recharts bar chart: this-month cash in vs cash out + next-30-day projected collections (ProjectPaymentSchedule) and payables (LcrEntry) with net position indicator',
            'Production Pulse — recharts line chart: 30-day production trend by ISO week (tonnes from ProductionLog) + top-3 projects this week ranked by tonnage',
            'Decisions Required — up to 20 prioritised action items: tasks awaiting approval (>3d overdue), payment triggers (Stop Shipping / Collection Call), LCR without PO needed in <14 days, critical NCRs open >7 days, projects with passed schedule end date and <80% production',
            'Per-section graceful error handling — each card shows "Data unavailable — last synced X" independently without crashing the dashboard',
            'Every dashboard load logs a SystemEvent (category: EXECUTIVE_ACCESS, severity: INFO)',
            'Mobile responsive: 2-col metric grid on mobile, project matrix horizontally scrollable',
          ],
        },
        'GET /api/executive/summary — five command metrics + EXECUTIVE_ACCESS audit log per request',
        'GET /api/executive/project-health — full project health matrix with server-side RAG computation',
        'GET /api/executive/decisions-required — prioritised action list, max 20 items, sorted by urgency then days overdue',
        'GET /api/executive/cashflow-snapshot — this-month actuals + next-30-day projections + 30-day weekly production trend + top-3 projects',
        'executive.view permission added to NAVIGATION_PERMISSIONS',
        '"Executive Command Center" added to sidebar top-level single navigation (Crown icon, position #2 after Dashboard)',
      ],
      fixed: [],
      changed: [],
    },
  },
  {

    version: '17.2.0',
    date: 'March 30, 2026',
    type: 'minor',
    status: 'previous',
    mainTitle: '💰 Payment Schedule Report',
    highlights: [
      'Payment Schedule Report — consolidated view of all payment terms and retention amounts across every project in one financial report at /financial/reports/payment-schedule',
      'Link each payment term to a synced Dolibarr invoice with amount and paid status — real-time invoice lookup',
      'Assign due dates, event triggers (milestone, delivery, drawing approval) and actions (issue invoice, collection call, stop/proceed shipping) per payment slot',
      'Monthly cash flow timeline groups pending collections by month for financial forecasting and planning',
    ],
    changes: {
      added: [
        {
          title: 'Payment Schedule Report (/financial/reports/payment-schedule)',
          items: [
            'Aggregates all 6 payment slots (Down Payment + Payments 2–6) and Preliminary and HO retention amounts from every project into one consolidated table',
            'Summary cards: Total Scheduled, Collected, Pending, Overdue — all in SAR',
            'Filter bar: project name/number search, status, due date range, action required, and trigger type',
            'Invoice linking: searchable dropdown of synced Dolibarr invoices — shows ref, total amount, and paid status',
            'Trigger types: Date, Milestone, Delivery, Drawing Approval, Manual',
            'Action required: Issue Invoice, Collection Call, Stop Shipping, Proceed Shipping, On Hold, No Action — each with a free-text action notes field',
            'Status tracking: Pending → Triggered → Invoiced → Collected; auto-surfaces as Overdue when due date is past and not yet collected',
            'Cash flow timeline: collapsible monthly grouping of pending/triggered rows for projected cash inflow forecasting',
            'Edit drawer per row — accountants can enrich any payment term without leaving the report',
            'Access-controlled via financial.view (read) and financial.manage (write) permissions',
          ],
        },
        'ProjectPaymentSchedule Prisma model — non-destructive enrichment overlay on existing project payment fields, keyed by (projectId, paymentSlot) unique constraint',
        'GET/POST /api/financial/payment-schedule-report — aggregate all projects and upsert enrichment data',
        'PUT/DELETE /api/financial/payment-schedule-report/[id] — update or remove individual enrichment records',
        'Navigation entry added to Financial Reports sidebar section',
      ],
      fixed: [],
      changed: [],
    },
  },
  {
    version: '17.1.1',
    date: 'March 30, 2026',
    type: 'patch',
    status: 'previous',
    mainTitle: '🔧 Bug Fixes & Improvements',
    highlights: [
      'Sidebar Order settings — Admin/CEO users can drag-and-drop reorder sidebar navigation sections globally at /settings/sidebar',
      'Project Status Tracker moved to top-level pinned navigation alongside Dashboard, Early Warning, and AI Assistant',
      'Task "Cancelled" status no longer returns an invalid input error',
      'Production Trend defaults to monthly view; Top Processes now shows average weight per active day instead of cumulative total',
    ],
    changes: {
      added: [
        {
          title: 'Sidebar Order Settings (/settings/sidebar)',
          items: [
            'Admin and CEO users can drag-and-drop reorder all sidebar navigation sections',
            'Uses @dnd-kit/core and @dnd-kit/sortable for accessible, keyboard-friendly drag-and-drop',
            'Order is stored server-side and applies globally to all user accounts',
            'Non-admin users see an access-denied message',
            'Sidebar Order link added to the Settings navigation group',
          ],
        },
        'Project Status Tracker link moved from the Projects section to top-level sidebar (pinned alongside Dashboard, Early Warning, AI Assistant)',
        'Revision and Consultant Code columns in the Tasks table are now sortable (click header to toggle ↑↓)',
      ],
      fixed: [
        'Setting a task status to "Cancelled" was returning a 400 Invalid Input error — Cancelled is now included in the status enum for both task create and update API schemas',
        'CEO and Admin dashboard was only showing their own assigned projects and objectives — now shows ALL projects and objectives regardless of account assignment',
        'Production Trend Top Processes section now shows average weight per active day (days with production > 0) instead of cumulative total for the selected period',
      ],
      changed: [
        'Production Trend widget default period changed from Week to Month',
      ],
    },
  },
  {
    version: '17.1.0',
    date: 'March 30, 2026',
    type: 'minor',
    status: 'previous',
    mainTitle: '✨ UI Enhancement & Smart Filtering',
    highlights: [
      'Recent Links & Bookmarks panel in the top bar — History icon auto-tracks the last 15 visited pages and lets you pin favourite pages for one-click access',
      'Production widget renamed to "Production Trend" with Day / Week / Month period selector and dynamic summary labels',
      'LCR Reports simplified: only Status Breakdown by Tonnage remains, with new Project and Building filter dropdowns (building list dependent on project)',
      'Tasks: Main Activity and Sub-Activity columns are now sortable; new Activity & Sub-Activity filter dropdowns added to the filter bar',
    ],
    changes: {
      added: [
        {
          title: 'Recent Links & Bookmarks Panel (TopBar)',
          items: [
            'History clock icon added to the top bar between Search and Notifications',
            'Recent tab: automatically tracks the last 15 page visits in localStorage — no setup required',
            'Bookmarks tab: pin any page with one click; bookmark from the panel header or hover over a recent entry',
            'Amber dot indicator on the icon when bookmarks exist',
            'Remove individual entries or clear bookmarks at any time; data is persisted locally per browser',
          ],
        },
        {
          title: 'Production Trend — Day / Week / Month Views',
          items: [
            'Widget renamed from "Weekly Production" to "Production Trend"',
            'Compact three-button period selector (Day / Week / Month) embedded in the card header',
            'Production API (/api/dashboard/production/weekly) extended with ?period= parameter',
            'Day = 24 daily buckets, Week = 7 days, Month = 30 days',
            'Summary labels update dynamically: "Total Today", "Total This Week", "Total This Month"',
          ],
        },
        {
          title: 'Tasks — Sorting for All Columns',
          items: [
            'Main Activity and Sub-Activity column headers are now sortable — click to toggle ↑↓',
            'Sort cases added: mainActivity (alphabetical) and subActivity (alphabetical)',
          ],
        },
        {
          title: 'Tasks — Activity & Sub-Activity Filters',
          items: [
            'Activity filter dropdown (8 main activities: Architecture, Design, Detailing, Procurement, Production, Coating, Delivery & Logistics, Erection)',
            'Sub-Activity filter dropdown — dynamically populated based on selected Activity; disabled until activity is chosen',
            'Changing Activity resets Sub-Activity automatically',
            'Both filters included in "Reset All" button and active-filter visibility condition',
          ],
        },
      ],
      fixed: [],
      changed: [
        'LCR Reports page: all report cards removed except "Status Breakdown by Tonnage"',
        'LCR Status Breakdown card now has Project and Building filter dropdowns in the card header — building list dynamically filtered by selected project',
        '/api/supply-chain/lcr/reports/status-breakdown: now accepts optional buildingId parameter (takes precedence over projectId when provided)',
      ],
    },
  },
  {
    version: '17.0.0',
    date: 'March 30, 2026',
    type: 'major',
    status: 'previous',
    mainTitle: '🏗️ Project Scope & Status Tracker + UX Improvements',
    highlights: [
      'Project Setup Wizard now supports Scope of Work per building (Steel, Sheeting, Deck Panel, Metal Work, Other) with BoQ specifications and configurable contractual activities',
      'Project Status Tracker Dashboard: real-time visual tracker with dark/light theme, activity progress from Tasks, LCR & Production modules, 60s auto-refresh',
      'Weekly Issues: click any card to preview full details; drag-and-drop cards between Kanban columns on desktop and mobile to update status instantly',
      'Task detail timeline circles aligned on a single horizontal baseline — labels row / circles row / dates row',
      'Project tracker now shows ALL tasks (open, in-progress, completed, released, approved) with score-based progress — no more blank columns',
    ],
    changes: {
      added: [
        {
          title: 'Scope of Work System',
          items: [
            'ScopeOfWork & BuildingActivity Prisma models — multiple scopes per building with configurable activities',
            'Wizard Step 3 (Scope of Work) and Step 4 (Activities) in the 9-step project setup wizard',
            'CRUD APIs: /api/scope-of-work and /api/building-activities',
            'BuildingScopesView component on project detail page',
            'Scope of Work selector on Production Upload and Assembly Parts pages',
          ],
        },
        {
          title: 'Project Status Tracker Dashboard (/project-tracker)',
          items: [
            'Dark/light theme toggle, real-time progress tracking with 60s auto-refresh',
            'Progress computed from Tasks, LCR procurement weight, and Production Logs',
            'Score-based task progress: open (≥10%), overdue/blocked, completed (≥65%), released (≥75%), approved (100%)',
            'Summary stats cards, filter tabs (All / In Progress / Blocked / Completed), full-text search',
            'Drill-down popover per cell showing individual task details, procurement weights, and production processes',
          ],
        },
        {
          title: 'Weekly Issues UX',
          items: [
            'Click any Kanban card or table row → read-only preview dialog with full issue details',
            'Desktop drag-and-drop: drag cards between status columns; status updates immediately via PATCH',
            'Mobile drag-and-drop: touch events with ghost element following the finger; column highlights on hover',
          ],
        },
        {
          title: 'Task Detail Improvements',
          items: [
            'StageApprovalCircles restructured into 3 rows (labels / circles / dates) — all circles on same horizontal line',
            'RBAC: project_tracker.view and project_tracker.export permissions added (Admin, Manager, Engineer, DC)',
          ],
        },
      ],
      fixed: [
        'Project tracker: removed erroneous deletedAt:null filter on Task query (Task model has no soft-delete) — was zeroing all task-based columns',
        'Project tracker: open/pending/in-progress tasks now appear in tracker (were invisible under old strict completion-only rules)',
        'Timeline circles: misaligned when labels or dates had different heights — fixed with 3-row layout',
      ],
      changed: [
        'Project wizard restructured from 7 to 9 steps with dedicated Scope of Work and Activities steps',
        'Navigation: "Project Status Tracker" link added to sidebar under Project Operations',
      ],
    },
  },
  {
    version: '16.6.3',
    date: 'March 27, 2026',
    type: 'patch',
    status: 'previous',
    mainTitle: '📡 System Events Framework',
    highlights: [
      'Enterprise audit trail: financial, backup, RBAC, PBAC, project, task, QC, and production actions all logged to system_events',
      'System Events dashboard (/events) with auto-refresh, date presets, user filter, CSV export, and live event log',
      'System Health tab with 7-day event volume chart, top event types, and cron job registry',
      'Auto-repair: system_events table self-heals on first use — fixes CamelCase/snake_case mismatch on Linux',
    ],
    changes: {
      added: [
        {
          title: 'System Events Dashboard',
          items: [
            '/events page: live event log, auto-refresh (30s), date presets (Today/7d/30d), user filter, severity & category dropdowns',
            'CSV export (GET /api/system-events/export) — Admin/Manager only, up to 10,000 rows, 17 columns',
            'System Health tab: 7-day event volume BarChart, top 8 event types, cron job registry with event-cleanup',
            'EntityTimeline embedded in Project and Task detail pages',
          ],
        },
        {
          title: 'Financial Event Coverage (12 routes)',
          items: [
            'FIN_CONFIG_CHANGED on financial config PUT',
            'FIN_ACCOUNT_MAPPING_CHANGED on account mapping create/update and bulk product COA mapping',
            'FIN_CHART_ACCOUNT_CREATED, FIN_CHART_ACCOUNT_UPDATED, FIN_CHART_ACCOUNT_DELETED on chart-of-accounts',
            'FIN_CHART_ACCOUNTS_CLEARED (WARNING severity) on clear-all',
            'FIN_CHART_SYNCED on Dolibarr sync',
            'FIN_PRODUCT_CATEGORY_CREATED, FIN_PRODUCT_MAPPING_CHANGED (create/update/delete), FIN_SUPPLIER_CLASSIFIED',
          ],
        },
        {
          title: 'Backup & RBAC/PBAC Event Coverage',
          items: [
            'SYS_BACKUP_CREATED, SYS_BACKUP_FAILED on backup create',
            'SYS_BACKUP_DELETED on backup delete',
            'SYS_RESTORE_COMPLETED, SYS_RESTORE_FAILED (CRITICAL severity) on restore',
            'ROLE_DUPLICATED on role duplicate',
            'PBAC_RESTRICTION_CHANGED on module restrictions update',
            'PERMISSION_CLONED on user clone-permissions',
          ],
        },
        {
          title: 'Retention & Performance',
          items: [
            'GET /api/cron/event-cleanup: archives events >90 days to system_event_summaries, deletes >365 days',
            'system_event_summaries table for daily aggregates (Prisma model + SQL migration)',
            'Composite indexes: (event_category, created_at) and (severity, created_at)',
          ],
        },
      ],
      fixed: [
        'system_events auto-repair on first use: renames SystemEvent→system_events, adds all missing columns — fixes silent write failures on Linux (case-sensitive MySQL table names)',
        'Backup routes: session!.userId → session!.sub (userId was undefined, causing anonymous event logging)',
        'RBAC/PBAC routes: console.error replaced with structured logger.error',
      ],
      changed: [],
    },
  },
  {
    version: '16.6.2',
    date: 'March 27, 2026',
    type: 'patch',
    status: 'previous',
    mainTitle: '⚙️ Cron Jobs Management UI',
    highlights: [
      'New /settings/cron-jobs page lists all 5 registered background tasks with schedule, status, and env var details',
      'Admin-triggered "Run Now" button executes any HTTP-accessible cron job server-side via CRON_SECRET',
      'Two new PBAC permissions: settings.view_cron (Manager+) and settings.manage_cron (Admin)',
      'Central cron-registry.ts defines all job definitions used by both the API and the UI',
    ],
    changes: {
      added: [
        {
          title: 'Cron Jobs Settings Page',
          items: [
            '/settings/cron-jobs shows LCR Sync, Dolibarr Sync, Financial Sync, Deadline Reminders, Early Warning Engine',
            'Category badge (Sync / Notifications / Analysis), schedule expression and human-readable description',
            'Enabled/Disabled badge driven by environment variables read at page load',
            'Environment variable names and current values displayed per job',
            '"Run Now" button triggers the HTTP endpoint server-side and shows HTTP status + elapsed ms',
            'Summary stats: Total / Enabled / Disabled / No Endpoint',
          ],
        },
        {
          title: 'New API Routes',
          items: [
            'GET /api/system/cron-jobs — returns enriched job list (requires settings.view_cron)',
            'POST /api/system/cron-jobs/trigger — fires any HTTP cron endpoint via CRON_SECRET (requires settings.manage_cron)',
          ],
        },
        {
          title: 'New Permissions',
          items: [
            'settings.view_cron — grants view access; assigned to Admin and Manager',
            'settings.manage_cron — grants Run Now trigger; Admin only',
            '/settings/cron-jobs added to navigation-permissions.ts and sidebar (hidden without settings.view_cron)',
          ],
        },
        {
          title: 'Cron Registry',
          items: [
            'src/lib/cron-registry.ts: central CronJobDef[] with isCronEnabled() reading env vars',
          ],
        },
      ],
      fixed: [],
      changed: [],
    },
  },
  {
    version: '16.6.1',
    date: 'March 27, 2026',
    type: 'patch',
    status: 'previous',
    mainTitle: '🔧 LCR Alias Display Fix',
    highlights: [
      'Supplier Mappings table now shows supplier name and code instead of raw numeric Dolibarr ID',
      'Building Mappings table now shows project number, designation and building name instead of raw UUID',
    ],
    changes: {
      added: [],
      fixed: [
        'LCR Aliases: "Maps To" column in Supplier Mappings table showed raw Dolibarr IDs — now resolved to supplier name (code)',
        'LCR Aliases: "Maps To" column in Building Mappings table showed raw UUIDs — now resolved to project number + designation + name',
      ],
      changed: [
        'Column header "Maps To (Entity ID)" renamed to "Maps To" in both supplier and building alias tables',
      ],
    },
  },
  {
    version: '16.6.0',
    date: 'March 27, 2026',
    type: 'minor',
    status: 'previous',
    mainTitle: '✅ Task UX & Access Control Enhancements',
    highlights: [
      'Completion dialogue prompts the assignee to describe how they finished the task; note is stored and sent to the requester and creator',
      '3-dots menu on task details for "Ask for Clarification" and "Request Time Extension" — each sends a push notification to the task creator',
      'Unauthorized page with one-click access request: sends a push notification to all admin users instead of a silent redirect',
      'Bulk "Notify All" button in Notification Center Delayed Tasks tab — pushes overdue reminders to all assignees in one click',
    ],
    changes: {
      added: [
        {
          title: 'Task Completion Dialogue',
          items: [
            '"Mark as Completed" now opens a dialog asking how the task was completed',
            'Completion note is stored in the remark field and included in the approval-request notification',
            'Both the requester and the task creator are notified (deduplicated)',
          ],
        },
        {
          title: 'Task 3-Dots Menu',
          items: [
            'MoreVertical dropdown on task detail page',
            '"Ask for Clarification" — opens a dialog and sends push notification to creator/requester',
            '"Request Time Extension" — opens a dialog and sends push notification to creator/requester',
            'New POST /api/tasks/[id]/request endpoint handling clarification and time_extension types',
          ],
        },
        {
          title: 'Unauthorized Page',
          items: [
            'New /unauthorized page with the blocked path displayed',
            'Optional message textarea for the user to explain why they need access',
            '"Send Access Request" button POSTs to /api/system/request-access',
            'New POST /api/system/request-access sends push notifications to all admin users',
          ],
        },
        {
          title: 'Bulk Notify All — Delayed Tasks',
          items: [
            '"Notify All" button in Notification Center Delayed Tasks tab header',
            'Sends DEADLINE_WARNING notifications to every assignee with an overdue task',
            'New POST /api/notifications/notify-all-delayed endpoint',
          ],
        },
      ],
      fixed: [],
      changed: [
        'All RBAC-guarded page redirects now point to /unauthorized?from=<path> instead of silently redirecting to /dashboard or the parent list',
        'Task completion notification now notifies both requester and creator (previously only the requester)',
      ],
    },
  },
  {
    version: '16.5.0',
    date: 'March 27, 2026',
    type: 'minor',
    status: 'previous',
    mainTitle: '🔒 PBAC Enforcement & Cost Classification Pagination',
    highlights: [
      'Permission checks now enforced on all role and user management pages — Operator and other restricted roles can no longer access /users or /roles',
      'Cost Classification Mapping: page-size selector (50 / 100 / 200 / 500 / All) added to Products and Suppliers tabs',
      'Selecting "All" loads every row in a single request with no pagination controls',
      'API limit cap raised from 200 to 500; limit=0 returns all records',
    ],
    changes: {
      added: [
        {
          title: 'Pagination Page-Size Selector',
          items: [
            'Dropdown in Products tab toolbar: 50, 100, 200, 500, All',
            'Dropdown in Suppliers tab toolbar: 50, 100, 200, 500, All',
            'Selecting "All" fetches all rows (limit=0) and hides prev/next controls',
            'API endpoints accept limit up to 500; limit=0 returns full dataset',
          ],
        },
      ],
      fixed: [
        'PBAC: /roles, /roles/create, /roles/[id]/permissions now enforce roles.view / roles.create / roles.manage_permissions — previously all checks were commented out',
        'PBAC: /users, /users/create, /users/[id]/edit now enforce users.view / users.create / users.edit — previously no access control beyond session',
        'Operator and other restricted roles are redirected to /dashboard when accessing user or role management pages without the required permissions',
      ],
      changed: [],
    },
  },
  {
    version: '16.4.1',
    date: 'March 26, 2026',
    type: 'patch',
    status: 'previous',
    mainTitle: '🔧 Financial Report Fixes & COA Account Breakdown',
    highlights: [
      'New "Cost Structure by Account Number" table in Project Analysis — see spend by individual COA account code (raw material, paint, sub-contracting, etc.)',
      'Aggregate Cost Breakdown now filters correctly when searching for a specific project',
      'Category drill-downs (Cost of Sales, Fixed Assets, Operating Expenses) now return invoice line results',
      'Drill-down respects project search filter — shows only relevant lines',
      'Bulk assign in product-coa-mapping now works correctly in the dialog',
    ],
    changes: {
      added: [
        {
          title: 'Cost Structure by Account Number',
          items: [
            'New collapsible table in Project Analysis showing spend per COA account code',
            'Columns: account code, name, Arabic name, category, invoice count, line count, % of total, amount',
            'Data sourced from fin_product_coa_mapping → fin_chart_of_accounts (same logic as cost categories)',
            'Shows all project-linked invoices for the selected date range',
          ],
        },
      ],
      fixed: [
        'Aggregate Cost Breakdown recomputes from filtered projects when search is active — no longer shows all-project data when searching',
        'Cost of Sales / Fixed Assets / Operating Expenses drill-down now returns invoice lines (was querying wrong table)',
        'Invoice detail drill-down passes filtered project IDs so only the searched project\'s lines appear',
        'Bulk assign CoaCombobox in product-coa-mapping: stop pointer-event propagation on dropdown so Radix Dialog does not swallow account selection clicks',
      ],
      changed: [],
    },
  },
  {
    version: '16.4.0',
    date: 'March 26, 2026',
    type: 'minor',
    status: 'previous',
    mainTitle: '🔄 Backup Restore System & Financial Module Enhancements',
    highlights: [
      'Restore the database from any backup directly in the UI — full or partial restore by module, no server access needed',
      'Impact preview shows Current / Backup / ±Change row counts per module before confirming',
      '14 backup modules covering all 96+ tables, including the new Financial & Accounts module',
      'Chart of Accounts: CSV/XLSX import, mass delete, rollback, and force-replace Dolibarr sync',
      'SOA "Remain to Pay" column, VAT report excludes abandoned invoices, salaries Excel export, cost structure drill-down',
    ],
    changes: {
      added: [
        {
          title: 'Backup Restore System',
          items: [
            'Restore database from any backup at /settings/backups — no SSH required',
            'Partial restore by module: select any of 14 modules instead of restoring everything',
            'Impact preview: parses backup SQL (supports .sql.gz) and compares with live row counts from information_schema',
            'Restore dialog: module checklist with Select All, colour-coded diff table (±), amber warning banner',
            'SQL streaming filter uses -- Table structure anchors as state machine; SET FOREIGN_KEY_CHECKS=0 for safe partial restores',
            'New backups.restore permission in Backup Management category, granted to Admin by default',
            'src/lib/backup-modules.ts — central module→tables config shared between API and UI',
          ],
        },
        {
          title: 'Financial & Accounts Backup Module',
          items: [
            'All 16 fin_* tables now restorable as a dedicated "Financial & Accounts" module',
            'Includes fin_chart_of_accounts, fin_journal_entries, fin_customer/supplier_invoices, fin_payments, fin_salaries, fin_supplier_classification, fin_product_coa_mapping, fin_config',
          ],
        },
        {
          title: 'Chart of Accounts Management',
          items: [
            'CSV upload: import accounts from a CSV file with live validation and error reporting',
            'XLSX upload: Excel spreadsheet import with column detection and preview',
            'Mass delete: select and permanently remove multiple accounts at once',
            'COA rollback: restore a previous state of the chart of accounts from a snapshot',
            'Force replace: overwrite existing accounts during Dolibarr sync instead of skipping conflicts',
          ],
        },
        {
          title: 'Dolibarr Sync & COA Improvements',
          items: [
            'Synced By column in COA sync history table',
            'System events logged for each financial sync run',
            'COA accounts now appear in product/supplier mapping dropdowns (is_active=1 set on creation)',
          ],
        },
        {
          title: 'Financial Reporting',
          items: [
            'SOA: sortable columns and new "Remain to Pay" column',
            'VAT report: abandoned invoices excluded from all totals',
            'Salaries: Excel export button',
            'Cost structure: drill-down view showing line-item detail behind each category',
            'Expenses Analysis: sortable headers across all supplier columns',
          ],
        },
        'Supplier Classification: bulk selection and "Save All" for batch classification commits',
      ],
      fixed: [
        'BigInt serialization error in fin_* COA mapping APIs — returned as string instead of crashing',
        'created_by column type mismatch on fin_* tables — INT column holding UUID removed and retyped to VARCHAR',
        'Dolibarr sync: product search returning stale/incorrect results',
        'Supplier classification dropdown truncation on narrow viewports',
        'RBAC audit log: excessive per-check logging reduced to warnings-only',
        'package-lock.json missing uuid@11.1.0 — caused npm ci failure in CI pipeline',
      ],
      changed: [],
    },
  },
  {
    version: '16.3.0',
    date: 'March 26, 2026',
    type: 'minor',
    status: 'previous',
    mainTitle: '🏆 Points & Rewards Incentive System',
    highlights: [
      'Gamification system that awards points for completing tasks with bonuses for on-time completion and high-priority tasks',
      'Dashboard widget showing total points, rank, current streak, badges, and leaderboard',
      'Streak tracking with bonuses at 3-day, 7-day, and 30-day milestones',
      'PWA install prompt now has "Don\'t show again" button',
      'Delayed tasks popup now shows once daily instead of every page load',
    ],
    changes: {
      added: [
        {
          title: 'Points & Rewards System',
          items: [
            'user_points table — stores total points, lifetime points, current streak, longest streak per user',
            'point_transactions table — detailed log of all point changes (earn, spend, bonus, adjustment)',
            'point_rules table — configurable rules for point earning with multipliers',
            'user_badges table — tracks badges/achievements earned by users',
            'Points service with automatic awarding on task completion',
          ],
        },
        {
          title: 'Point Rules',
          items: [
            'Base: 10 points per task completion',
            'On-time bonus: +5 points for completing before/on due date',
            'Early bird bonus: +10 points for completing 2+ days early',
            'High priority multiplier: 1.5x for high-priority tasks',
            'Streak bonuses: +15 (3-day), +50 (7-day), +200 (30-day)',
          ],
        },
        {
          title: 'Dashboard Widget',
          items: [
            'Overview tab: Total points, rank, current streak, this week/month earnings, badges',
            'Leaderboard tab: Top 5 users with rank indicators (gold/silver/bronze)',
            'History tab: Recent point transactions with timestamps',
          ],
        },
        {
          title: 'API Routes',
          items: [
            'GET /api/points — current user\'s points stats, badges, and transactions',
            'POST /api/points — manual point adjustment (Admin/CEO only)',
            'GET /api/points/leaderboard — company-wide or department leaderboard',
            'GET/POST/PUT /api/points/rules — manage point rules',
          ],
        },
      ],
      changed: [
        'Task completion now automatically awards points based on priority, due date, and timing',
        'PWA install prompt has "Don\'t show again" button that persists permanently',
        'Delayed tasks popup shows once daily instead of once per session',
      ],
      fixed: [
        'Chart of accounts sync from Dolibarr now tries multiple API endpoints for compatibility',
      ],
    },
  },
  {
    version: '16.2.0',
    date: 'March 24, 2026',
    type: 'minor',
    status: 'previous',
    mainTitle: '🏷️ Cost Classification Mapping — Product Categories & Supplier Classification',
    highlights: [
      'New Product Categories system: define named categories that carry a cost classification and an optional Chart-of-Accounts account code',
      'Product Category Mapping: map each Dolibarr product reference to a category so every invoice line is classified accurately',
      'Supplier Classification: assign a default cost category to each supplier as a fallback when no account or product mapping exists',
      '4-level classification hierarchy in all financial reports: Account Mapping → Product Category → Supplier Classification → Other/Unclassified',
      'Monthly trend query now uses the structured mapping tables instead of keyword pattern matching',
    ],
    changes: {
      added: [
        {
          title: 'Product Categories (fin_product_categories)',
          items: [
            'New table storing named categories with cost_classification and optional coa_account_code',
            'Bilingual support: English name + optional Arabic name',
            'GET /api/financial/product-categories — list all with mapped product count and COA name',
            'POST /api/financial/product-categories — create category',
            'PUT /api/financial/product-categories/[id] — update name, classification, COA code, active flag',
            'DELETE /api/financial/product-categories/[id] — delete (blocked if product mappings exist)',
            'New page /financial/product-categories — tabbed UI: manage categories + assign product refs',
          ],
        },
        {
          title: 'Product Category Mapping (fin_product_category_mapping)',
          items: [
            'New table mapping Dolibarr product_ref to a fin_product_categories row',
            'GET /api/financial/product-category-mapping — existing mappings + unmapped product refs sorted by spend',
            'POST /api/financial/product-category-mapping — create mapping',
            'PUT /api/financial/product-category-mapping/[id] — change category',
            'DELETE /api/financial/product-category-mapping/[id] — remove mapping',
            'Unmapped products tab shows all invoice product refs without a mapping',
          ],
        },
        {
          title: 'Supplier Classification (fin_supplier_classification)',
          items: [
            'New table assigning a default cost category (and optional COA code) to a Dolibarr supplier',
            'GET /api/financial/supplier-classification — classified + unclassified suppliers sorted by spend',
            'POST /api/financial/supplier-classification — classify a supplier',
            'PUT /api/financial/supplier-classification/[id] — update category or COA code',
            'DELETE /api/financial/supplier-classification/[id] — remove classification',
            'New page /financial/supplier-classification — inline priority explanation, one-click classify, edit/delete table',
          ],
        },
        'DB migration: prisma/migrations/add_cost_classification_mapping.sql creates all 3 tables with indexes, FK constraints, and audit columns',
      ],
      changed: [
        {
          title: '4-Level Classification Hierarchy in Financial Reports',
          items: [
            'Cost Structure report: COALESCE now checks account mapping → product category → supplier classification → Other/Unclassified',
            'Monthly trend query replaced keyword LIKE pattern-matching with the same 4-level COALESCE using the new tables',
            'Expenses Analysis report: supplier expenses breakdown uses the 4-level hierarchy',
            'All affected queries LEFT JOIN fin_product_category_mapping, fin_product_categories, fin_supplier_classification',
          ],
        },
        'Sidebar: Added "Product Categories" and "Supplier Classification" entries under Financial',
      ],
      fixed: [],
    },
  },
  {
    version: '16.1.2',
    date: 'March 23, 2026',
    type: 'patch',
    status: 'previous',
    mainTitle: '🐛 PTS Source Fix & Production Logs Project Filter',
    highlights: [
      'PTS-synced logs that showed source "OTS" are now corrected to "PTS" via the Fix Process Labels migration button',
      'PTS sync update path now always stamps source = "PTS" so re-synced logs are labelled correctly going forward',
      'Production Logs project dropdown now lists all projects with logs, not just those the logged-in user manages',
    ],
    changes: {
      added: [],
      fixed: [
        {
          title: 'PTS logs showing source as "OTS"',
          items: [
            'Logs synced from PTS before the source field was introduced defaulted to "OTS"',
            'Fix Process Labels migration (POST /api/production/fix-process-types) now also sets source = "PTS" on any log with an externalRef starting with "PTS-"',
          ],
        },
        {
          title: 'PTS sync update path missing source',
          items: [
            'When an already-synced log was updated by a subsequent PTS sync run, the source field was not written, leaving it as "OTS"',
            'Update path now always includes source: "PTS"',
          ],
        },
        {
          title: 'Production Logs project dropdown showing only assigned projects',
          items: [
            'Dropdown called /api/projects which applies the projects.view_all permission gate',
            'Users without that permission only saw projects they manage, missing others like project 281',
            'New endpoint /api/production/logs/projects returns all projects with at least one production log, bypassing the management filter',
          ],
        },
      ],
      changed: [],
    },
  },
  {
    version: '16.1.1',
    date: 'March 23, 2026',
    type: 'patch',
    status: 'previous',
    mainTitle: '🐛 Production Status Pagination & Process Fix',
    highlights: [
      'Pagination added to the Production Status sheet — choose 25 / 50 / 100 rows per page or show all, with first / prev / next / last controls',
      '"Dispatched to Sandblasting", "Dispatched to Galvanization", and "Dispatched to Customer" columns now correctly reflect logged quantities',
      'Fixed wrong column keys in the status table (Dispatch to… → Dispatched to…)',
      'PTS sync service now maps all dispatch process variants to the correct canonical values instead of storing invalid "Dispatch"',
    ],
    changes: {
      added: [
        {
          title: 'Production Status — Pagination',
          items: [
            'Rows-per-page selector with options 25 / 50 / 100 / All',
            'First / Previous / Next / Last navigation buttons with "Page X of Y" indicator',
            'Page automatically resets to 1 when search query or sort column changes',
          ],
        },
      ],
      fixed: [
        {
          title: 'Dispatch processes not shown in Production Status',
          items: [
            'Status API processTypes array was missing all "Dispatched to …" variants',
            'Added Dispatched to Sandblasting, Galvanization, Customer, Painting, and Site to the tracked process list',
            'Columns now correctly show percentages and processed quantities for these processes',
          ],
        },
        {
          title: 'Wrong process column keys in status client',
          items: [
            'PROCESS_COLUMNS used "Dispatch to Sandblasting / Galvanization / Customer" (missing the d)',
            'Corrected to "Dispatched to …" to match values stored in the database',
          ],
        },
        {
          title: 'PTS sync storing invalid process type',
          items: [
            'The sync service mapped the word "dispatch" to "Dispatch" which is not a valid process type',
            'Replaced with explicit entries for all dispatch variants (e.g. "dispatched to customer" → "Dispatched to Customer")',
            'Future PTS syncs will store correct process types and appear properly in the status sheet',
          ],
        },
      ],
      changed: [],
    },
  },
  {
    version: '16.1.0',
    date: 'March 22, 2026',
    type: 'minor',
    status: 'previous',
    mainTitle: '🔧 Supply Chain UX Improvements & Dolibarr Integrations',
    highlights: [
      'New Purchase Orders page at /supply-chain/purchase-orders shows Dolibarr POs with status, supplier, project, and totals',
      'Supply Chain sidebar now links to Purchase Orders, AP Aging Report (pre-selected), and Statement of Account',
      'LCR filter bar redesigned into a single row — project and status dropdowns no longer overlap',
      'Alias management now fetches ALL Dolibarr suppliers via auto-pagination (was capped at 200)',
      'Aging Report reads ?type=payable URL param to pre-select Accounts Payable automatically',
    ],
    changes: {
      added: [
        {
          title: 'Purchase Orders Page',
          items: [
            'New page /supply-chain/purchase-orders — lists Dolibarr purchase orders in OTS',
            'Status badges (Draft / Validated / Approved / Ordered / Partially Received / Received / Canceled / Refused) with colour coding',
            'Supplier name, supplier ref, project ref, order date, delivery date, billing status, HT and TTC totals per row',
            'Client-side status filter + full-text search (ref, supplier, project); configurable page size with prev/next pagination',
            'Open in Dolibarr button linking to the Dolibarr supplier orders module',
          ],
        },
        {
          title: 'Supply Chain Sidebar',
          items: [
            'Purchase Orders → /supply-chain/purchase-orders',
            'AP Aging Report → /financial/reports/aging?type=payable (deep-links to Accounts Payable)',
            'Statement of Account → /financial/reports/soa',
            'Navigation permission registered for /supply-chain/purchase-orders (supply_chain.view)',
          ],
        },
        'Aging Report: reads ?type=payable query param on load and auto-initialises type to Accounts Payable',
      ],
      fixed: [
        {
          title: 'LCR Page Layout',
          items: [
            'Merged page title and all filter controls into a single flex-wrap row — eliminates project/status overlap',
            'Project dropdown widened from w-56 to w-64; Status from w-44 to w-52 with "All Statuses" placeholder',
            'Sync Now / Reports buttons and row/sync stats moved to far right of the same header row',
          ],
        },
        {
          title: 'Alias Management — complete supplier list',
          items: [
            'Alias page was capped at 200 Dolibarr suppliers due to API hard limit',
            'Now reads pagination.total and fetches remaining pages in parallel so all suppliers appear in the combobox',
          ],
        },
      ],
      changed: [],
    },
  },
  {
    version: '16.0.0',
    date: 'March 22, 2026',
    type: 'major',
    status: 'previous',
    mainTitle: '🚀 Supply Chain Management Module — Complete LCR System',
    highlights: [
      'Full-featured Supply Chain module with Google Sheets integration for automated procurement tracking',
      'LCR (Least Cost Routing) data table with filters, sync status bar, and detail drawer showing LCR1/2/3 comparisons',
      'Alias management system auto-resolves project/building/supplier names from informal sheet text',
      '4 analytics reports: Status breakdown, Spend vs Target, Supplier Performance, and Overdue Items',
      '12 API endpoints including sync, CRUD, alias management, and reports with comprehensive filtering',
    ],
    changes: {
      added: [
        {
          title: 'Database & Models',
          items: [
            '3 new Prisma models: LcrEntry (30+ fields), LcrAliasMap (informal name mapping), LcrSyncLog (sync history)',
            'Foreign key relations: Project.lcrEntries, Building.lcrEntries, User.lcrAliasMaps',
            'SQL migrations: add_supply_chain_lcr.sql (tables + indexes) and add_supply_chain_permissions.sql (RBAC)',
          ],
        },
        {
          title: 'Sync Engine',
          items: [
            'Google Sheets sync service with MD5 hash change detection and intelligent upserts',
            'Alias resolution system auto-resolves project IDs, product IDs, building IDs, and supplier IDs',
            'Automated scheduler using node-cron, configurable interval (default 30 min)',
            'Soft-delete handling for rows removed from sheet',
            'Date parsing supports YYYY-MM-DD and DD/MM/YYYY formats',
          ],
        },
        {
          title: 'API Routes (12 endpoints)',
          items: [
            'GET /api/supply-chain/lcr — Paginated entries with 6 filter options',
            'GET /api/supply-chain/lcr/[id] — Single entry detail with relations',
            'POST /api/supply-chain/lcr/sync — Manual sync trigger (admin only)',
            'GET/POST/DELETE /api/supply-chain/lcr/aliases — Alias management with auto back-fill',
            'GET /api/supply-chain/lcr/sync-logs — Last 20 sync runs with metrics',
            '4 report endpoints: status, spend-vs-target, supplier-performance, overdue',
            'POST /api/cron/lcr-sync — External cron endpoint with Bearer token auth',
          ],
        },
        {
          title: 'User Interface (3 pages)',
          items: [
            'LCR Main Page: Data table with 10 columns, 5 filters, sync status bar, detail drawer with LCR comparison',
            'Reports Page: 4 report cards with recharts visualizations (stacked bar chart + tables)',
            'Alias Management Page: Pending alias resolver + existing mappings table (admin only)',
            'Overdue highlighting with red text and days overdue badges',
            'Resolution status icons (green checkmark = resolved, amber warning = pending)',
          ],
        },
        {
          title: 'Navigation & Permissions',
          items: [
            'Sidebar section "Supply Chain" with Package icon and 3 menu items',
            'RBAC permissions: supply_chain.view, supply_chain.sync, supply_chain.alias',
            'Navigation permissions added to route-level access control',
          ],
        },
        {
          title: 'Environment Variables',
          items: [
            'GOOGLE_SHEETS_KEY_JSON — Service account JSON for Google Sheets API',
            'GOOGLE_SHEET_LCR_ID — Google Sheet ID',
            'GOOGLE_SHEET_LCR_RANGE — Sheet tab and column range (default: Sheet1!A:AJ)',
            'LCR_SYNC_INTERVAL_MINUTES — Sync interval (default: 30)',
            'ENABLE_LCR_SCHEDULER — Enable/disable automatic sync',
          ],
        },
      ],
      fixed: [],
      changed: [],
    },
  },
  {
    version: '15.27.5',
    date: 'March 22, 2026',
    type: 'patch',
    status: 'previous',
    mainTitle: 'Backlog Task Management & Activity Trail',
    highlights: [
      'Linked tasks are now fully manageable — change status (Pending → In Progress → Completed), reopen, and delete tasks directly from the backlog detail page',
      'Live progress percentage updates in real time as tasks are completed or reopened',
      'Activity Trail now merges status milestones with task events (created, completed, reopened, deleted) in chronological order',
    ],
    changes: {
      added: [
        'Task status toggle — clickable circle button and dropdown on each linked task row to switch between Pending, In Progress, and Completed; completed tasks show strikethrough title and a green row tint',
        'Task delete button — trash icon with confirmation dialog to permanently remove a task from the backlog item',
        'PATCH /api/backlog/[id]/tasks/[taskId] — in-context task update endpoint (status, title, description, priority); handles completedAt/completedById tracking',
        'DELETE /api/backlog/[id]/tasks/[taskId] — task removal endpoint scoped to its parent backlog item',
        'Live progress percentage in the Progress sidebar card, updating instantly as tasks change status',
        'Task audit events on backlog items — creating, completing, reopening, or deleting a task writes an AuditLog entry (entityType: ProductBacklogItem) with structured metadata.event field',
        'Dynamic Activity Trail — status milestones and task audit events merged chronologically; task entries show a ClipboardList icon with color-coded dots (sky=created, emerald=completed, orange=reopened, red=deleted)',
        'GET /api/backlog/[id] now returns activityLogs alongside the item so the activity trail is always current',
      ],
      fixed: [],
      changed: [],
    },
  },
  {
    version: '15.27.4',
    date: 'March 22, 2026',
    type: 'patch',
    status: 'previous',
    mainTitle: 'Global Search Bar',
    highlights: [
      'New persistent search icon in the top-right bar — search the entire system from any page with a single click or Ctrl+K',
      'Searches Tasks, Projects, Initiatives, Weekly Issues, Backlog Items, NCRs, RFIs, and Assembly Marks simultaneously',
      'Categorized results with color-coded icons, status badges, and full keyboard navigation (↑↓ / Enter / Esc)',
    ],
    changes: {
      added: [
        'Global Search icon button fixed to the top-right navigation bar (next to notification bell and logout) — visible on every authenticated page',
        'Ctrl+K keyboard shortcut opens the search dialog from anywhere in the system',
        'GET /api/search?q= endpoint runs 8 parallel Prisma queries across Tasks, Projects, Initiatives, Weekly Issues, Backlog Items, NCRs, RFIs, and Assembly Marks; returns up to 5 results per category',
        'Results grouped by entity type with color-coded icons (blue=Tasks, emerald=Projects, amber=Initiatives, orange=Weekly Issues, purple=Backlog, red=NCRs, sky=RFIs, teal=Assembly Marks)',
        'Status badges per result with semantic colors — green for active/open, grey for completed/closed, red for overdue/critical',
        'Keyboard navigation: ↑↓ arrows to move between results, Enter to open, Esc to close dialog',
        '300 ms debounce on input and 2-character minimum to avoid unnecessary API requests',
      ],
      fixed: [],
      changed: [],
    },
  },
  {
    version: '15.27.3',
    date: 'March 22, 2026',
    type: 'patch',
    status: 'previous',
    mainTitle: 'PTS Sync History Improvements & Project Dashboard Task Fixes',
    highlights: [
      'PTS Sync History dialog is now fully responsive — no more left/right scrolling on mobile; expands to full screen height',
      'New per-building consent checkboxes before syncing: choose exactly which new buildings OTS should create',
      'Fixed task display and classification issues in the project dashboard view',
    ],
    changes: {
      added: [
        'New buildings consent prompt in PTS Sync execute — amber section listing every unmatched building for selected projects, each with its own checkbox',
        'Select All / None quick-action buttons for accepting or rejecting all pending new-building creations at once',
        '"Map Instead" shortcut button opens the building mapping dialog directly from the consent section',
        'Live count line below the building checkboxes: "X of Y new buildings will be created", updates in real time',
      ],
      fixed: [
        'PTS Sync History dialog horizontal scrolling — removed min-w-[900px] table constraint; table now fits the screen without left/right navigation',
        'PTS Sync History dialog height — dialog now uses max-h-[92vh] with vertical-only scroll, showing more rows without clipping',
        'Compact date format in history table — shorter locale format (M/D/YY, h:mm AM/PM) saves column space',
        'Long project lists in history — truncated at 4 entries with "+N more" indicator',
        'Duration and User columns hidden on small screens (hidden sm:table-cell)',
        'Tasks in project dashboard — tasks now display correctly with accurate activity grouping after main-activity schema corrections',
      ],
      changed: [],
    },
  },
  {
    version: '15.27.2',
    date: 'March 21, 2026',
    type: 'patch',
    status: 'previous',
    mainTitle: 'Architecture Activity',
    highlights: [
      'New Architecture main activity added to the task classification system',
      'Approved Architectural Drawings sub-activity for tracking drawing approval status',
    ],
    changes: {
      added: [
        'Architecture — new main activity positioned first in the workflow',
        'Approved Architectural Drawings — sub-activity under Architecture',
      ],
      fixed: [],
      changed: [],
    },
  },
  {
    version: '15.27.1',
    date: 'March 21, 2026',
    type: 'patch',
    status: 'previous',
    mainTitle: 'Dashboard Widgets: Product Backlog & Weekly Issues',
    highlights: [
      'New Product Backlog dashboard widget — shows active/blocked/pending counts, priority breakdown, and recent active items with direct links',
      'New Weekly Issues dashboard widget — shows open/in-progress counts, overdue alert, priority breakdown, and recent open issues',
      'Two new summary API routes power the widgets with aggregated status and priority counts',
    ],
    changes: {
      added: [
        'Product Backlog widget (BACKLOG type) — status tiles for Active / Blocked / Pending, priority grid (Critical / High / Medium / Low), list of up to 5 recent non-completed items with code and status badge; auto-refreshes every 2 minutes',
        'Weekly Issues widget (WEEKLY_ISSUES type) — Open / In Progress status tiles, overdue alert banner, priority grid, list of up to 5 recent open issues with issue number and department; auto-refreshes every 2 minutes',
        'GET /api/dashboard/backlog/summary — groups ProductBacklogItem by status and priority; returns active, blocked, pending totals and 5 recent non-completed items',
        'GET /api/dashboard/weekly-issues/summary — groups WeeklyIssue by status and priority; returns overdue count and 5 recent open issues',
        'Both BACKLOG and WEEKLY_ISSUES registered in the WidgetContainer component dictionary and WIDGET_DEFINITIONS list',
      ],
      fixed: [],
      changed: [],
    },
  },
  {
    version: '15.27.0',
    date: 'March 20, 2026',
    type: 'minor',
    status: 'previous',
    mainTitle: 'Backup Management UI',
    highlights: [
      'New Backup Management page under Settings — list, create, download, and delete DB backup files directly from the UI',
      'Reads /root/backups/YYYYMMDD/ directory structure matching the actual server layout',
      'Full RBAC/PBAC integration: new backups.* permissions and backup_management module restriction',
    ],
    changes: {
      added: [
        'Backup Management page at /settings/backups with stats cards (total backups, total size, disk free space)',
        'Create Backup button — triggers mysqldump server-side into /root/backups/YYYYMMDD/; auto-prunes to keep the last 7 date directories',
        'Download button per backup — picks largest .sql inside the date directory and streams it to the browser',
        'Delete button per backup — removes the entire YYYYMMDD directory with AlertDialog confirmation',
        'Backup directory info bar showing server path and Max 7 backups retained badge',
        'GET /api/backups — scans YYYYMMDD subdirs and flat .sql files; returns list + disk info',
        'POST /api/backups — creates /root/backups/YYYYMMDD/db_backup_HHMMSS.sql via mysqldump',
        'DELETE /api/backups/[dirname] — removes the date directory (or flat file); path-traversal protected',
        'GET /api/backups/[dirname]/download — serves the largest .sql from the date dir',
        'backups permission category: backups.view, backups.create, backups.delete, backups.download (Admin-only by default)',
        'backup_management PBAC module (administrative category) for per-role/user restriction',
        '/settings/backups route registered in navigation-permissions',
        'Backup Management entry added to Settings section in the sidebar',
      ],
      fixed: [],
      changed: [],
    },
  },
  {
    version: '15.26.0',
    date: 'March 20, 2026',
    type: 'minor',
    status: 'previous',
    mainTitle: 'Task Attachments & Backlog Notifications',
    highlights: [
      'Upload images and documents to tasks in both full and quick-add modes (up to 10 files, 10 MB each)',
      'Raster image attachments are automatically compressed with Sharp (WebP / PNG palettised) before storage',
      'Backlog item creators now receive an in-app and mobile push notification whenever the status of their item changes',
    ],
    changes: {
      added: [
        'TaskAttachment model — new task_attachments DB table with cascade-delete and index',
        'GET/POST /api/tasks/[id]/attachments — list and upload attachments for a task',
        'DELETE /api/tasks/[id]/attachments/[attachmentId] — delete an attachment (uploader or admin only; removes file from disk)',
        'Attachment uploader in task create/edit form with drag-and-drop support and inline preview',
        'Paperclip button with file count badge in quick-add table row for attaching files during fast task creation',
        'Attachment count indicator on task grid cards',
        'Attachments card in task detail view with download links and delete buttons',
        'Image compression using Sharp — JPEG/PNG/WebP → WebP at 82% quality; PNG uses palette mode at compression level 9',
        'Backlog status change push notification — item creator receives mobile + in-app alert with the new status and who changed it',
      ],
      fixed: [
        'Tasks not appearing when task_attachments table is not yet created — queries now degrade gracefully',
      ],
      changed: [],
    },
  },
  {
    version: '15.25.0',
    date: 'March 17, 2026',
    type: 'minor',
    status: 'previous',
    mainTitle: 'Task Activity Classification',
    highlights: [
      'Tasks can now be classified by Main Activity and Sub-Activity (Design, Detailing, Procurement, Production, Coating, Delivery & Logistics, Erection)',
      'Finish-to-start dependency warnings when a predecessor sub-activity is not yet completed',
      'Project Management View now groups tasks by Main Activity → Sub-Activity hierarchy',
    ],
    changes: {
      added: [
        '7 main activities with their sub-activities defined for steel fabrication workflows',
        'Finish-to-start dependency map between sub-activities with inline amber warning banner in task form',
        'mainActivity and subActivity fields on Task model with DB migration',
        'Cascading Main Activity → Sub-Activity dropdowns in task creation and edit forms',
        'Activity card in task detail sidebar showing main and sub activity labels',
        'Main Activity and Sub-Activity columns in table view with inline edit support',
      ],
      fixed: [],
      changed: [
        'Project Management View hierarchy changed from Project > Building > Department to Project > Building > Main Activity > Sub-Activity',
      ],
    },
  },
  {
    version: '15.23.0',
    date: 'March 15, 2026',
    type: 'minor',
    status: 'previous',
    mainTitle: 'Simple Tasks View',
    highlights: [
      'New Simple Tasks View toggle on the Tasks page, placed next to the Project Management View button',
      'Shows only the essential columns: Task Name, Assigned To, Status, Project, Building, Input Date, Due Date',
      'Quick Add and Inline Edit fully supported in this view',
    ],
    changes: {
      added: [
        'Simple Tasks View — 4th view toggle button (LayoutList icon) on /tasks, next to the Project Management View toggle',
        'Columns: Task Name, Assigned To, Status, Project, Building, Input Date, Due Date',
        'Quick Add row — inline task creation form at the top of the simple view table',
        'Inline Edit — click ⋮ → Edit to edit a row in-place; Save / Cancel confirm or discard',
        '3-dot action menu per row — View, Edit, Delete actions',
        'Overdue highlighting — past-due non-completed rows shown in red; completed rows in green',
        'Sortable columns — click any header to sort ascending/descending',
      ],
      fixed: [],
      changed: [],
    },
  },
  {
    version: '15.22.2',
    date: 'March 15, 2026',
    type: 'patch',
    status: 'previous',
    mainTitle: 'Mobile Push Notifications for Delayed & Upcoming Tasks',
    highlights: [
      'New Push button on delayed tasks lets supervisors instantly nudge assignees via in-app + Web Push',
      'New daily cron endpoint scans tasks due in ~2 days and sends DEADLINE_WARNING push notifications automatically',
      'Build fix: CRON_SECRET now read lazily to prevent CI build failures',
    ],
    changes: {
      added: [
        'Push Nudge Button — each row in the Delayed Tasks list has a Push button that sends an immediate in-app + Web Push notification to the assignee asking them to update task status',
        'Deadline Reminder Cron — POST /api/cron/deadline-reminders scans tasks due within ~2 days and sends DEADLINE_WARNING push notifications; protected by CRON_SECRET bearer token, schedule daily at 08:00',
        'notify-task API — POST /api/notifications/notify-task creates a DEADLINE_WARNING notification for a given task\'s assignee, fanned out via PushService',
      ],
      fixed: [
        'CRON_SECRET read lazily inside handler instead of at module-import time, preventing Next.js build failures when environment variables are absent in CI',
      ],
      changed: [],
    },
  },
  {
    version: '15.22.1',
    date: 'March 15, 2026',
    type: 'patch',
    status: 'previous',
    mainTitle: 'Task Workflow Fixes & PBAC Toggle Consistency',
    highlights: [
      'Task status set to In Progress (not Pending) when duplicating or revising after rejection',
      'Completing a task now routes to the Approvals tab with inline Approve/Reject buttons',
      'Task notifications now link directly to the task detail page',
      'Logout now reliably clears the session cookie',
      "What's New dialog no longer reappears after it's been dismissed",
      'PBAC tasks.view_all permission now drives the My Tasks / All Tasks admin toggle',
    ],
    changes: {
      added: [
        'Reject button on task detail page — Approve and Reject buttons now appear side-by-side when a task is Completed and not yet actioned',
        'Approval/rejection activity trail — approved, approval_revoked, and rejected events recorded with human-readable labels',
      ],
      fixed: [
        'Task status after rejection — duplicating or revising a rejected task now sets status to In Progress instead of Pending',
        'Completion notification routed to Approvals — completing a task sends APPROVAL_REQUIRED to requester so it surfaces in the Approvals tab with Approve/Reject buttons',
        'Notification deep links — task notifications navigate to /tasks/[id] instead of the list page that discarded the id parameter',
        'Logout cookie not clearing — logout awaits the API fetch before redirecting so Set-Cookie headers are applied by the browser',
        "What's New dialog reappearing — server now returns alreadySeen:true when the user has already dismissed the dialog; mark-version-seen merges into existing permissions instead of overwriting",
        'Approval notifications on task detail page — approving or rejecting from the detail page now notifies the assignee',
        'Completion circle turns grey after approval — circle uses status===Completed || !!completedAt so older tasks without completedAt still show green',
        'Reset All hidden on mobile — moved out of the overflowing filter row into the search bar row',
        'PBAC toggle uses wrong permission — My Tasks / All Tasks toggle now checks tasks.view_all PBAC permission instead of isAdmin boolean',
        'Admin isAdmin bypassed PBAC revokes — isAdmin users now have customPermissions.revokes and restrictedModules applied correctly',
      ],
      changed: [],
    },
  },
  {
    version: '15.22.0',
    date: 'March 15, 2026',
    type: 'minor',
    status: 'previous',
    mainTitle: 'Global Notification Bar & Dashboard Layout Improvements',
    highlights: [
      'Notification bell and logout button now visible on every system page via a fixed global TopBar',
      'Notification dropdown is now fully actionable — complete tasks, approve or reject requests inline',
      'Clicking a notification marks it as read and removes it from the list automatically',
      'New "Clear All" button archives all notifications at once',
      'Dashboard widgets now use full screen width for better space utilization',
    ],
    changes: {
      added: [
        'Global TopBar — persistent notification bell and logout button fixed to the top-right corner on every authenticated page',
        'Actionable notifications — Complete button on task notifications; Approve / Reject buttons on approval notifications',
        'Clear All (bulk archive) — trash icon in notification panel header archives all notifications at once',
        'New API: POST /api/notifications/bulk-archive — archives all unread notifications for the user',
        'Unread count badge shown in the notification panel header',
      ],
      fixed: [],
      changed: [
        'Clicking any notification marks it as read and removes it from the dropdown list immediately',
        'Dashboard page no longer has a dedicated logout button (replaced by global TopBar)',
        'Dashboard container changed from max-width constrained to full-width layout for better widget space utilization',
        'Widget grid updated to md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 for optimal use of large screens',
        'Notification panel has smaller, denser layout with unread dot indicators and improved dark mode colors',
      ],
    },
  },
  {
    version: '15.21.0',
    date: 'March 15, 2026',
    type: 'minor',
    status: 'previous',
    mainTitle: 'Task Management UX & Delayed Tasks Improvements',
    highlights: [
      'Delayed tasks in widget and login dialog are now clickable — navigate directly to task details',
      'New "Requested by Me" sidebar item under Tasks for filtering tasks by requester role',
      'Requester filter dropdown added to the Tasks page alongside Assigned To',
      'Delayed tasks tab on Notifications page defaults to personal tasks with admin toggle',
    ],
    changes: {
      added: [
        'Clickable Delayed Tasks — tasks in dashboard widget and login notification dialog link directly to the task detail page',
        'Requested by Me — new sidebar menu item under Tasks showing tasks where the user is the requester',
        'Requester Filter — dropdown on the Tasks page to filter by requester, next to the Assigned To filter',
        'Delayed Tasks Scope Toggle — Notifications page delayed tasks tab has My Tasks / All Tasks toggle for admins',
      ],
      fixed: [],
      changed: [
        'Delayed tasks on notifications page now default to personal tasks instead of all system tasks',
        'Admin users see a toggle to switch between personal and system-wide delayed task views',
        'Task filter reset includes the new requester filter',
      ],
    },
  },
  {
    version: '15.20.2',
    date: 'March 14, 2026',
    type: 'patch',
    status: 'previous',
    mainTitle: 'Unique Browser Tab Titles',
    highlights: [
      'Every page now shows a unique title — e.g. "Hexa Steel® OTS ™ - Tasks", "Hexa Steel® OTS ™ - Settings"',
      'Users can now identify and navigate between open tabs by page name',
      'All 147 pages covered: Tasks, Projects, Financial, Production, QC, Settings, and more',
    ],
    changes: {
      added: [],
      fixed: [],
      changed: [
        'Page Titles — All pages now display unique titles in browser tabs using the format "Hexa Steel® OTS ™ - <Page Name>"',
        'Root Layout — Updated metadata to use Next.js title template for consistent branding across all pages',
        'PWA Title — Updated Apple Web App title to "Hexa Steel® OTS ™"',
      ],
    },
  },
  {
    version: '15.20.1',
    date: 'March 14, 2026',
    type: 'patch',
    status: 'previous',
    mainTitle: 'SWOT Analysis Bug Fixes',
    highlights: [
      'Fixed API 500 error - Prisma client generation issue resolved',
      'Fixed input field clearing bug - all fields now clear after adding items',
      'Fixed data persistence - SWOT data now saves and persists correctly',
      'API standards compliance - proper imports and authentication',
    ],
    changes: {
      added: [],
      fixed: [
        'API 500 Error — Fixed Prisma client generation issue where swotAnalysis model wasn\'t recognized',
        'Database Query Method — Changed from findUnique() to findFirst() for year-based queries',
        'Input Field Clearing — Fixed bug where Weaknesses field wasn\'t clearing after clicking + button',
        'Data Persistence — SWOT data now saves correctly and persists after page refresh',
        'API Standards — Updated to use proper imports (@/lib/db, logger, withApiContext)',
      ],
      changed: [
        'SWOT API route now uses findFirst() instead of findUnique() for all year-based queries',
        'Replaced console.error with logger.error throughout SWOT API',
        'All SWOT API handlers wrapped with withApiContext for proper authentication',
      ],
    },
  },
  {
    version: '15.20.0',
    date: 'March 12, 2026',
    type: 'minor',
    status: 'previous',
    mainTitle: 'Mobile App & Push Notifications (PWA)',
    highlights: [
      'Progressive Web App — installable on mobile devices via browser',
      'Web Push Notifications — real-time alerts even when the app is closed',
      'Per-type notification preferences — toggle push and in-app per notification type',
      'Service Worker with auto-update and smart install prompt',
    ],
    changes: {
      added: [
        'PWA Support — installable Progressive Web App with service worker, manifest, and app icons',
        'Web Push Notifications — VAPID-based push delivery to mobile and desktop browsers via web-push library',
        'Push Subscription Management — subscribe/unsubscribe devices via /api/push-subscription endpoint',
        'Notification Preferences UI — per-type toggles for push and in-app notifications in Settings page',
        'Service Worker Provider — auto-registration, update detection, and smart install prompt banner',
        'VAPID Key Generation Script — scripts/generate-vapid-keys.mjs for easy key setup',
        'PushSubscription & UserNotificationPreference database models with migration',
      ],
      fixed: [],
      changed: [
        'Notification service now sends push notifications alongside in-app notifications',
        'Middleware updated to allow PWA static assets and public push endpoints',
        'Root layout uses separate viewport export (Next.js 15 best practice)',
      ],
    },
  },
  {
    version: '15.19.1',
    date: 'March 11, 2026',
    type: 'patch',
    status: 'previous',
    mainTitle: 'Delayed Tasks Widget & Login Notification',
    highlights: [
      'New dashboard widget showing delayed tasks with severity breakdown',
      'Login notification dialog alerts users about overdue tasks',
      'Admin toggle to switch between personal and all delayed tasks',
      'Clickable severity cards to filter tasks by Critical, Warning, or Minor',
    ],
    changes: {
      added: [
        'Delayed Tasks Dashboard Widget — severity breakdown (Critical 7+ days, Warning 3-7 days, Minor 1-3 days) with most overdue tasks list',
        'Login Notification Dialog — prompts users once per session about their delayed tasks requiring attention',
        'Admin toggle (My Tasks / All Tasks) — admin users can switch between personal tasks and system-wide delayed tasks',
        'Clickable severity cards — Critical, Warning, Minor cards navigate to notifications page with severity pre-filter',
        'Severity filter on Notifications page — ?severity=critical|warning|minor query param with filter pill buttons and clickable stat cards',
      ],
      fixed: [
        'Delayed tasks scoped to user\'s own tasks (assigned to, created by, or requested by) instead of showing all system tasks',
      ],
      changed: [
        'Delayed tasks API supports ?personal=true param to always filter to user\'s own tasks regardless of admin permissions',
        'Notifications page stat cards are now clickable with active filter ring indicator',
      ],
    },
  },
  {
    version: '15.19.0',
    date: 'March 10, 2026',
    type: 'minor',
    status: 'previous',
    mainTitle: '🔐 PBAC Migration — Permission-Based Access Control',
    highlights: [
      'Complete migration from role-based to permission-based access control',
      'Custom user permissions with grants/revokes override system',
      'Clone permissions API to copy permissions between users',
      'Legacy rbac.ts deleted — all access uses permission-checker.ts',
    ],
    changes: {
      added: [
        'Permission Resolution Service — hybrid model: Role Permissions + User Grants - User Revokes - Module Restrictions',
        'Custom Permissions with Grants/Revokes — user edit form supports granting extra permissions and revoking role permissions per user',
        'Clone Permissions API — POST /api/users/[id]/clone-permissions copies custom permissions between users',
        'PBAC Verification Script — npx tsx scripts/verify-pbac-migration.ts scans codebase for remaining role-based patterns',
      ],
      fixed: [
        '18+ API routes migrated from hardcoded role checks to checkPermission() calls',
        '12+ page components migrated from role checks to getCurrentUserPermissions()',
        '9 client components migrated from userRole prop to userPermissions: string[] prop',
      ],
      changed: [
        'Deleted src/lib/rbac.ts — legacy role-based access control module removed entirely',
        'customPermissions JSON field now uses { grants: string[], revokes: string[] } format (backward compatible)',
        'User PATCH API accepts both legacy array and new grants/revokes object format via Zod union schema',
        'resolvePermissionsFromData() pure function works both server-side and client-side',
      ],
    },
  },
  {
    version: '15.18.7',
    date: 'March 9, 2026',
    type: 'patch',
    status: 'previous',
    mainTitle: '📊 System Events V2 - Enhanced Activity Tracking',
    highlights: [
      'User filter dropdown to view activities by specific users',
      'Enhanced category colorization with distinct color schemes',
      'Improved table layout with separate Date and Time columns',
      'Visual icons for different event types (created, updated, deleted, etc.)',
    ],
    changes: {
      added: [
        'User Filter — Dropdown filter to view events by specific users',
        'Enhanced Colorization — Category badges with distinct colors (purple/blue/cyan/orange/green/indigo)',
        'User Column — Each event displays the user who performed the action',
        'Event Type Icons — Visual icons for created (green), updated (blue), deleted (red), uploaded (purple), synced (cyan)',
      ],
      fixed: [],
      changed: [
        'System events page now fetches user list for filter dropdown',
        'API endpoint supports userId filter parameter',
        'Improved table layout with Dolibarr-style design',
      ],
    },
  },
  {
    version: '15.18.6',
    date: 'March 8, 2026',
    type: 'patch',
    status: 'previous',
    mainTitle: '⚡ CI/CD & Deployment Improvements',
    highlights: [
      'Standalone output mode — self-contained builds, no npm install on server',
      'Build caching for faster subsequent deploys',
      'Optimized deploy package — ships only what\'s needed',
      'Eliminated redundant server-side steps (git pull, npm ci, prisma generate)',
    ],
    changes: {
      added: [
        'Next.js Standalone Output — output: standalone for self-contained production builds',
        'Next.js Build Caching — actions/cache for .next/cache scoped to src/ files',
        'Optimized Deploy Package — ships standalone build + static assets + prisma only',
      ],
      fixed: [
        'PM2 Process Name — Corrected from ots-app to hexa-steel-ots to match server configuration',
        'Build-time Prisma Fix — Added dummy DATABASE_URL during CI build so Prisma Client can initialize',
        'Lazy Service Initialization — OpenAI and Puppeteer clients lazily initialized, preventing build failures',
        'Cache Key — Scoped hash to src/ files to avoid including node_modules',
        'Duplicate Prisma Generate — Removed redundant step already handled by build script',
      ],
      changed: [
        'PM2 now runs server.js directly instead of next start',
        'Deploy no longer runs git pull, npm ci, or prisma generate on server',
        'Deploy package reduced from full .next + dependencies to standalone bundle',
      ],
    },
  },
  {
    version: '15.18.5',
    date: 'March 5, 2026',
    type: 'major',
    status: 'previous',
    mainTitle: '🔐 RBAC Overhaul - Permissions Now Work Correctly',
    highlights: [
      'CRITICAL: Fixed RBAC system - permissions now respected for all roles',
      'CEO and other roles can now use their assigned permissions',
      'Replaced 18 hardcoded Admin-only checks with proper permission checks',
      'Users with isAdmin flag or appropriate permissions can perform actions',
    ],
    changes: {
      added: [
        'Proper RBAC permission checks in all critical API routes',
        'Clear error messages indicating which permission is missing',
      ],
      fixed: [
        'CRITICAL: CEO could not delete projects despite having projects.delete permission',
        'CRITICAL: Users with permissions were blocked by hardcoded Admin-only checks',
        'projects/[id] DELETE: now uses projects.delete permission',
        'users CRUD: now uses users.create/edit/delete permissions',
        'departments POST: now uses departments.create permission',
        'roles CRUD: now uses roles.create/edit/delete permissions',
        'clients DELETE: now uses clients.delete permission',
        'settings PATCH: now uses settings.manage permission',
        'planning routes: now use planning.create/edit/delete permissions',
        'operations routes: now use operations.create/edit/delete permissions',
        'ITP DELETE: now uses qc.delete permission',
        'Project import/export: now use projects.create/view permissions',
      ],
      changed: [
        'RBAC system now properly respects permissions assigned to roles',
        'isAdmin flag grants all permissions as intended',
        'Permission checks use centralized checkPermission() function',
      ],
    },
  },
  {
    version: '15.18.4',
    date: 'March 5, 2026',
    type: 'patch',
    status: 'previous',
    mainTitle: '🛠️ Infrastructure Updates & Version Management',
    highlights: [
      'Centralized version management system',
      'Automated version synchronization across all files',
      'Fixed build version display showing correct v15.18.4',
      'Added Strategic Objectives link to sidebar menu',
    ],
    changes: {
      added: [
        'Centralized Version Management — Single source of truth in src/lib/version.ts',
        'Automated Version Updates — scripts/update-version.js syncs version across all files',
        'Strategic Objectives Menu Link — Added to Business Planning section in sidebar',
      ],
      fixed: [
        'Build Version Display — Now correctly shows v15.18.4 instead of outdated v15.18.1',
        'All components now import version from centralized location',
        'Package.json version automatically synchronized',
      ],
      changed: [
        'Easier version updates going forward — just edit one file and run the script',
      ],
    },
  },
  {
    version: '15.18.3',
    date: 'March 5, 2026',
    type: 'minor',
    status: 'previous',
    mainTitle: 'Project Wizard Enhancements & Personalized Notifications',
    highlights: [
      'Stage Durations Persist from Wizard',
      'Resume Draft Projects functionality',
      'Department Head Notifications',
      'Personalized Delayed Tasks and Schedule Alerts',
    ],
    changes: {
      added: [
        'Stage Durations Persist from Wizard — Engineering/Operations/Site week durations now saved to project and displayed in project details card',
        'Resume Draft Projects — PlayCircle icon appears next to Draft projects in projects list; clicking resumes the wizard from the saved step',
        'Department Head Notifications — Department managers are notified when tasks in their department are created, completed, or reassigned',
        'Personalized Delayed Tasks — Users only see delayed tasks they are involved in (assignee, creator, requester, or same department)',
        'Personalized Schedule Alerts — Users only see underperforming schedules for projects they manage or are assigned to',
      ],
      fixed: [
        'Wizard Status Fix — Projects completed through the wizard are now set to Active status; only Save as Draft creates Draft projects',
        'Stage Duration API Fields — Added engineeringWeeksMin/Max, operationsWeeksMin/Max, siteWeeksMin/Max to both create and update API schemas',
        'thirdPartyResponsibility Field — Added to API schemas so wizard 3rd party responsibility data persists',
        'params.id Lint Fix — Fixed Promise access error in projects [id] API route',
      ],
      changed: [
        'Draft projects now store full wizard state (step, buildings, scopes, coatings, payments) in remarks field as JSON for resume capability',
        'Notification endpoints cache per-user instead of globally',
        'Admin/CEO users still see all delayed tasks and schedule alerts; other roles see only personalized data',
      ],
    },
  },
  {
    version: '15.18.2',
    date: 'March 5, 2026',
    type: 'minor',
    status: 'previous',
    mainTitle: '🎯 Initiatives Display & RBAC Enhancements',
    highlights: [
      'Multi-select Objectives for Initiatives',
      'Enhanced RBAC with browse_users Permission',
      'Objective Names in Initiative Cards',
    ],
    changes: {
      added: [
        'Multi-select Objectives for Initiatives — link one initiative to multiple objectives',
        'Replaced single-select dropdown with checkbox-based multi-select interface',
        'Support for many-to-many relationships via junction table',
        'Backward compatibility maintained with direct objectiveId field',
        'Visual feedback showing selected objectives count',
        'Enhanced RBAC with browse_users Permission — granular user access control',
        'New projects.browse_users permission for browsing user lists',
        'Allows Project Coordinators and Document Controllers to see user dropdowns',
        'No need for full user management access to assign project managers',
        'Users API updated to check this permission for assignment purposes',
        'Objective Names in Initiative Cards — improved visibility',
        'Initiative cards now display linked objective names',
        'Shows next to budget, owner, and timeline information',
        'Supports displaying multiple objectives when linked',
        'Uses Target icon for visual consistency',
      ],
      fixed: [
        'Initiatives Progress on Objectives Page — fixed 0% display issue',
        'Initiatives now show correct progress percentages on objectives page',
        'Progress calculated from status when progress field is 0 or null',
        'Completed initiatives now properly show 100% progress',
        'Matches behavior on initiatives page for consistency',
        'Initiatives Not Showing Under Objectives — merged relationship handling',
        'Fixed initiatives completely vanishing from objectives page',
        'API now fetches from both direct and junction table relationships',
        'Properly deduplicates initiatives by ID',
        'Accurate initiative count displayed for each objective',
        'Dynamic Version Display in Sidebar — real-time version updates',
        'Sidebar version now dynamically fetches from system version API',
        'No more hardcoded version strings',
        'Automatically reflects latest system version',
        'Uses useVersion hook for reactive updates',
      ],
      changed: [
        'Objectives API Enhanced — handles complex initiative relationships',
        'Supports both direct and many-to-many initiative relationships',
        'Merges and deduplicates initiatives from multiple sources',
        'Calculates effective progress for each initiative',
        'Maintains backward compatibility with existing data',
        'Users API Permission Checks — more granular access control',
        'Added projects.browse_users permission check',
        'Allows user list access for assignment purposes',
        'Respects both role permissions and custom permissions',
        'Maintains security while enabling necessary functionality',
      ],
    },
  },
  {
    version: '15.18.1',
    date: 'March 5, 2026',
    type: 'patch',
    status: 'previous',
    mainTitle: '🎯 Strategic Planning & Initiatives Enhancements',
    highlights: [
      'Strategic Objectives module with 5-7 year planning',
      'Enhanced initiatives with progress tracking & delayed alerts',
      'Fixed task update permissions for admins',
      'Improved initiatives dashboard with colorization',
    ],
    changes: {
      added: [
        'Strategic Objectives Module — 5-7 year mid-term planning with full CRUD operations',
        'Link yearly company objectives to strategic objectives',
        'Track progress, priority, and status for long-term goals',
        'Initiatives Progress Tracking — automatic progress calculation from status',
        'Delayed Initiative Alerts — visual indicators for overdue initiatives with red borders',
      ],
      fixed: [
        'Task Update Permissions — admins now bypass permission checks via direct database lookup',
        'Task requesters can now edit their tasks',
        'Fixed stale session permission errors',
        'Average progress calculation now uses effective progress',
      ],
      changed: [
        'Enhanced Initiatives Dashboard — colorized status cards with matching backgrounds',
        'Smaller, more compact card layout for better space utilization',
        'Progress bars now show red for delayed initiatives',
      ],
    },
  },
  {
    version: '15.18.0',
    date: 'March 1, 2026',
    type: 'minor',
    status: 'previous',
    mainTitle: '📊 Financial Reports Enhancements',
    highlights: [
      'New Expenses by Account report with monthly breakdown',
      'Improved Project Analysis chart visualization',
      'Fixed contract amount to use Lead Amount from Dolibarr',
      'Fixed Excel export and account mapping errors',
    ],
    changes: {
      added: [
        'Expenses by Account Report — monthly breakdown of expenses grouped by accounting account',
        'Shows all 12 months (Jan-Dec) with amounts per account',
        'Displays account code and account name from Dolibarr',
        'Monthly totals and grand total columns',
        'Excel/CSV export functionality',
      ],
      fixed: [
        'Excel Export — Journal entries and OTS Journal entries exports now work correctly',
        'Changed file extension from .xlsx to .csv to match actual content',
        'Account Mapping Errors — removed dependency on non-existent dolibarr_accounting_account table',
        'Fixed "Unknown column sil.description" error in drill-down modal',
      ],
      changed: [
        'Project Analysis Report — improved monthly revenue vs cost chart with horizontal bars',
        'Shows actual values directly on bars for better readability',
        'Contract Amount Fix — now reads Lead Amount (opp_amount) instead of Budget',
        'Balance calculation updated to use contract amount',
      ],
    },
  },
  {
    version: '15.17.0',
    date: 'February 28, 2026',
    type: 'minor',
    status: 'previous',
    mainTitle: '📊 OTS Journal Entries Report & Bug Fixes',
    highlights: [
      'New OTS Journal Entries report with proper double-entry accounting from supplier invoices',
      'Fixed journal entries export and group-by-account features',
      'Expense categorization uses fin_dolibarr_account_mapping for accurate cost classification',
      'Excel export with full journal entry details',
    ],
    changes: {
      added: [
        'OTS Journal Entries Report — double-entry journal entries from supplier invoices with proper expense categorization',
        'Creates proper DR/CR entries: Expense accounts (by category), VAT Input, and Accounts Payable',
        'Group by category view with drill-down to individual entries',
        'Excel export with full journal entry details',
        'Category summary with visual distribution bars',
        'Shows balanced/unbalanced status for each entry',
        'Account Mapping Management Page — GUI for mapping Dolibarr accounting codes to OTS cost categories',
        'Find unmapped accounting codes with automatic category suggestions',
        'Edit existing mappings with dropdown category selection',
        'One-click mapping creation from unmapped codes list',
      ],
      fixed: [
        'Journal Entries Export — resolved "Unknown column je.description" error that broke Excel export and group-by-account features',
        'Root cause: SQL queries referenced je.description but fin_journal_entries table uses label column',
      ],
      changed: [
        'OTS Journal Entries uses fin_dolibarr_account_mapping for accurate expense categorization instead of flat Dolibarr journal entries',
      ],
    },
  },
  {
    version: '15.16.1',
    date: 'February 27, 2026',
    type: 'patch',
    status: 'previous',
    mainTitle: '🔍 Material Inspection Receipt (MIR) System - Critical Fixes',
    highlights: [
      'Fixed database migration and Prisma schema mapping issues',
      'Simplified PO lookup with client-side filtering for better reliability',
      'Added comprehensive error handling and empty state UI',
      'Resolved authentication issues in PO lookup API',
    ],
    changes: {
      added: [],
      fixed: [
        'Database migration foreign key references — corrected from projects to project and users to user',
        'Prisma schema mapping — added @@map directives to all MIR models for snake_case database tables',
        'PO lookup reliability — removed complex SQL filters, now fetches recent POs and filters client-side',
        'Error handling — added comprehensive logging and empty state UI for PO search results',
        'Authentication — fixed intermittent 401 errors in PO lookup API',
      ],
      changed: [
        'QC Material Inspection module completely revamped to integrate with Dolibarr purchase orders',
        'Purchase order API enriched with supplier names and project references',
        'Material receiving workflow now supports item-level quality inspection and partial receiving',
      ],
    },
  },
  {
    version: '15.16.0',
    date: 'February 27, 2026',
    type: 'minor',
    status: 'previous',
    mainTitle: '🔐 Task Visibility Control',
    highlights: [
      'New tasks.view_others permission for granular task visibility control',
      'Users can now control who sees tasks assigned to other users',
      'Enhanced permission logic for better task access management',
      'Automatically added to Manager and Document Controller roles',
    ],
    changes: {
      added: [
        'View Other Users Tasks Permission — new tasks.view_others permission added to role management',
        'Allows granular control over whether users can see tasks assigned to other users',
        'Users with this permission can view non-private tasks across the system',
        'Users without this permission only see their own assigned or created tasks',
        'Automatically added to Manager and Document Controller default roles',
      ],
      fixed: [],
      changed: [
        'Updated GET /api/tasks to respect new permission level',
        'Updated GET /api/tasks/[id] to enforce permission-based access control',
        'Enhanced filtering logic for better task visibility control',
      ],
    },
  },
  {
    version: '15.15.0',
    date: 'February 27, 2026',
    type: 'minor',
    status: 'previous',
    mainTitle: '🔍 Material Inspection Receipt (MIR) System & Purchase Order Integration',
    highlights: [
      'Complete revamp of QC Material Inspection module with Dolibarr PO integration',
      'Per-item quality inspection: surface, dimensional, thickness, specs compliance, MTC tracking',
      'Partial receiving support with quantity tracking (ordered, received, accepted, rejected)',
      'Purchase orders now show supplier name and project reference',
    ],
    changes: {
      added: [
        'Material Inspection Receipt (MIR) system — complete revamp of QC Material Inspection module',
        'Purchase order lookup — search and select Dolibarr POs to create material receipts',
        'Automatic item population — receipt items auto-populated from PO line items',
        'Partial receiving support — track ordered, received, accepted, and rejected quantities per item',
        'Per-item quality inspection — surface condition, dimensional, thickness, specs compliance checks',
        'MTC tracking — Material Test Certificate availability, number, and file path per item',
        'Heat/batch number tracking — record heat numbers and batch numbers for traceability',
        'Quality rejection tracking — reject items with detailed rejection reasons',
        'Receipt status management — In Progress, Partially Received, Completed statuses',
        'Database tables: material_inspection_receipts, material_inspection_receipt_items, material_inspection_receipt_attachments',
        'API routes: GET/POST/PATCH /api/qc/material-receipts, PATCH /api/qc/material-receipts/items',
        'PO lookup API: GET /api/qc/material-receipts/lookup-po with search functionality',
        'Enhanced Dolibarr client: getThirdPartyById() and getProjectById() methods',
        'Purchase orders now display supplier name and project reference in list and detail views',
      ],
      fixed: [],
      changed: [
        'QC Material Inspection module completely revamped to integrate with Dolibarr purchase orders',
        'Purchase order API enriched with supplier names and project references',
        'Material receiving workflow now supports item-level quality inspection and partial receiving',
      ],
    },
  },
  {
    version: '15.14.0',
    date: 'February 26, 2026',
    type: 'minor',
    status: 'previous',
    mainTitle: '📊 Financial & Production Module Enhancements',
    highlights: [
      'Project analysis: search by name/number, contract value columns, aggregate cost drill-down',
      'Journal entries: Excel export and hierarchical account view',
      'Financial reports: Excel export for Trial Balance and Income Statement',
      'Assembly parts: length column added and fixed critical refresh loop bug',
    ],
    changes: {
      added: [
        'Project analysis search — filter projects by name, number, or client',
        'Contract value and balance columns in project analysis table',
        'Aggregate cost drill-down — click any cost category to see invoice line details',
        'Journal entries Excel export — export to CSV with one click',
        'Journal entries hierarchy view — group by account with collapsible drill-down',
        'Trial Balance Excel export — export report to CSV',
        'Income Statement Excel export — export P&L to CSV',
        'Assembly parts length column — added Length (mm) to parts list',
      ],
      fixed: [
        'CRITICAL: Assembly parts page refresh loop — totalArea.toFixed error from Prisma Decimal objects',
        'Status-by-name report refresh loop — API response format changed to paginated',
        'RBAC: CEO account forbidden on upload — now uses permission-based checks',
        'RBAC: CEO cannot mark tasks complete — replaced hardcoded role checks with permissions',
        'Cost drill-down API 400 errors — now supports aggregate queries without projectId',
        'Journal by account view 400 error — fixed SQL query construction',
      ],
      changed: [
        'Replaced hardcoded role checks with permission-based system for scalability',
        'Toast notifications replace standard alert() calls in upload and assembly-parts pages',
        'Project analysis table renamed "Revenue" to "Invoiced" for clarity',
      ],
    },
  },
  {
    version: '15.13.0',
    date: 'February 25, 2026',
    type: 'minor',
    status: 'previous',
    mainTitle: '📊 Financial Report Accuracy & Cost Drill-Down',
    highlights: [
      'Backfilled 6,079 supplier invoices with correct project linkage from Dolibarr raw data',
      'Cost categories now accurate: Raw Materials 72.3% (was 0.1%), Other dropped from 99% to 5%',
      'Clickable cost categories with line-level drill-down in project analysis',
      'New Dolibarr accounting account mapping table for proper cost classification',
    ],
    changes: {
      added: [
        'fin_dolibarr_account_mapping table — maps Dolibarr accounting rowids to OTS cost categories',
        'Cost detail drill-down API — /api/financial/reports/project-analysis/cost-details',
        'Account mapping management API — /api/financial/account-mapping (GET/PUT)',
        'Clickable cost category bars in project analysis with line-level detail view',
      ],
      fixed: [
        'CRITICAL: 6,079 supplier invoices had fk_projet=NULL despite Dolibarr API returning valid project IDs',
        'PJ2411-0257 now correctly shows 451 supplier invoices (SAR 3.7M) instead of 0',
        'Cost categories were 99% Other Costs — now properly classified via Dolibarr account mapping',
        'Sync code was storing dolibarr_raw as NULL — now stores full JSON for data recovery',
        'Building dropdown in task edit mode showed only designation instead of full name',
      ],
      changed: [
        'All cost category queries now use fin_dolibarr_account_mapping instead of broken CoA join',
        'Supplier/customer invoice sync now stores dolibarr_raw JSON for future backfill capability',
        'Project cost structure and expenses analysis reports use new mapping table',
      ],
    },
  },
  {
    version: '15.12.0',
    date: 'February 24, 2026',
    type: 'minor',
    status: 'previous',
    mainTitle: '🔒 Financial API Security & Cost Fix',
    highlights: [
      'All 27 financial API routes now enforce server-side permission checks',
      'Fixed Cartesian join bug causing duplicate project rows with identical costs',
      'Per-project supplier invoice costs now correctly calculated',
      'Unauthorized users get 403 Access Denied instead of seeing financial data',
    ],
    changes: {
      added: [
        'requireFinancialPermission() — shared server-side guard for all financial APIs',
        'HTTP 403 response for users without financial.view permission',
      ],
      fixed: [
        'CRITICAL: Cartesian product in client name subquery — projects with multiple customers duplicated rows',
        'All projects showing identical costs (SAR 311K) — was caused by duplicated rows, not real data',
        'Financial reports accessible via direct URL without permission — now returns 403',
        'Console TypeError: fetchRiskCount failed to fetch — silenced non-critical error',
      ],
      changed: [
        'All 27 financial API routes use requireFinancialPermission() instead of basic session check',
        'Client name subquery uses ROW_NUMBER() to return exactly 1 client per project',
        'Write operations (sync, config PUT, chart-of-accounts POST/PUT/DELETE) require financial.manage',
      ],
    },
  },
  {
    version: '15.11.0',
    date: 'February 24, 2026',
    type: 'minor',
    status: 'previous',
    mainTitle: '📊 Project Analysis & RBAC Fix',
    highlights: [
      'Financial pages now properly hidden without financial.view permission',
      'Client names resolved from customer invoices when fk_soc is missing',
      'Project status inferred from invoices (Open if has revenue)',
      'Clickable cost breakdown per project in summary table',
    ],
    changes: {
      added: [
        'Clickable cost column — inline cost breakdown per project',
        'Unlinked supplier costs warning with stats',
        'Client name fallback from customer invoices',
        'Enhanced monthly chart with Y-axis gridlines and totals',
      ],
      fixed: [
        'RBAC: removed settings.view from financial navigation permissions',
        'Project status all showing Draft — now inferred from revenue/close date',
        'Client column empty — added fallback JOIN on customer invoices',
        'Project sync: reads socid/statut as fallbacks from Dolibarr API',
        'Removed unused Percent icon import (HMR error)',
      ],
      changed: [
        'Compact table layout — smaller padding, text-xs, truncated columns',
        'Revenue/Cost/Collected shown in compact format (K SAR / M SAR)',
        'Monthly chart enhanced with gridlines, value labels, and legend totals',
      ],
    },
  },
  {
    version: '15.10.0',
    date: 'February 24, 2026',
    type: 'minor',
    status: 'previous',
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
                <ul className="mt-4 space-y-1">
                  {version.highlights.map((highlight, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="mt-0.5 shrink-0 text-primary">•</span>
                      <span>{highlight}</span>
                    </li>
                  ))}
                </ul>
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
