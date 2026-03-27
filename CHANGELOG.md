# Changelog - Hexa Steel OTS

All notable changes to the Hexa Steel Operation Tracking System will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0/).

---

## [16.5.0] - 2026-03-27

### 🔒 PBAC Enforcement & Cost Classification Pagination

**Minor Release:** Enforces permission-based access control on all user and role management pages (previously bypassed), and adds a configurable page-size selector (50 / 100 / 200 / 500 / All) to the Cost Classification Mapping screen.

#### Added

- **Pagination page-size selector** — Cost Classification Mapping (Products and Suppliers tabs) now has a page-size dropdown (50 / 100 / 200 / 500 / All) in each tab's toolbar. Selecting "All" fetches every row in one request with no pagination controls shown.
- **API support for larger page sizes** — `GET /api/financial/product-coa-mapping` and `GET /api/financial/supplier-coa-default` now accept `limit` values up to 500. Passing `limit=0` returns all records (previously capped at 200).

#### Fixed

- **PBAC (Permission-Based Access Control) enforcement on Role pages** — `/roles`, `/roles/create`, and `/roles/[id]/permissions` now enforce `roles.view`, `roles.create`, and `roles.manage_permissions` checks respectively. These checks were previously commented out (marked "temporarily disabled for initial setup") allowing any authenticated user, including Operator, to view and manage roles.
- **PBAC enforcement on User pages** — `/users`, `/users/create`, and `/users/[id]/edit` now enforce `users.view`, `users.create`, and `users.edit` permission checks. These pages had no access control beyond session verification, so any authenticated user could reach them.

#### Changed

- Operators and other restricted roles are now properly redirected to `/dashboard` when they attempt to access user or role management pages without the required permissions.

---

## [16.4.1] - 2026-03-26

### 🔧 Financial Report Fixes & COA Account Breakdown

**Patch Release:** Fixes project analysis report accuracy and adds a granular cost-by-account-number view driven by the chart of accounts.

#### Added

- **Cost Structure by Account Number** — New collapsible table in the Project Analysis report showing total spend broken down by individual COA account code (e.g. Raw Materials 61100, Painting 61200, Sub-contracting 61300). Displays account code, name, Arabic name, category, invoice count, line count, and % of total cost.
- **`aggregateCoaBreakdown`** added to report service — queries `fin_supplier_invoice_lines` joined with `fin_product_coa_mapping` + `fin_chart_of_accounts` to aggregate spend by account code for all project-linked invoices.

#### Fixed

- **Aggregate Cost Breakdown now filters with project search** — The breakdown card recomputes client-side from the filtered project list, so searching for a single project shows only that project's cost categories.
- **Category drill-down (Cost of Sales, Fixed Assets, Operating Expenses) now returns results** — The `cost-details` API was using `fin_dolibarr_account_mapping.ots_cost_category` but the report categorises via `fin_chart_of_accounts.account_category`. Both now use the same 2-tier COA logic (`fin_product_coa_mapping → fin_chart_of_accounts`, fallback to `fin_supplier_coa_default`).
- **Drill-down respects searched project** — When a search filter is active, the invoice detail drill-down now passes the filtered project IDs so only relevant lines are shown.
- **Bulk assign in product-coa-mapping** — CoaCombobox dropdown now stops pointer-event propagation so Radix Dialog does not intercept clicks on dropdown options, enabling account selection in the bulk-assign dialog.

---

## [16.4.0] - 2026-03-26

### 🔄 Backup Restore System & Financial Module Enhancements

**Minor Release:** Adds a full database-restore capability directly from the Backup Management page — no server console access required. Supports full or partial restore scoped to individual application modules with a live impact preview. Also ships a round of Chart of Accounts improvements: CSV/XLSX import, mass delete, Dolibarr sync enhancements, rollback support, and a range of financial reporting fixes.

#### Added

**Backup Restore System** (`src/app/settings/backups`, `src/app/api/backups/[filename]/restore`)
- Restore the database from any backup listed at `/settings/backups` — one click, no SSH required
- **Partial restore by module** — select any combination of 14 modules (Users & Roles, Projects & Buildings, Tasks, Production, Quality Control, Documents, Business Planning, Operations Control, AI & Knowledge Center, Supply Chain, Product Backlog, Notifications, Financial & Accounts, System & Audit Logs) instead of always restoring everything
- **Impact preview** — before confirming, the dialog parses the backup SQL file (streaming, supports `.sql.gz`) and queries `information_schema` to show Current / Backup / ±Change row counts per module
- Restore dialog: module checklist with Select All toggle, colour-coded diff table (green = gain, red = loss), amber warning banner, dynamic confirm button label ("Restore Full Database" vs "Restore N Modules")
- SQL filter state machine uses `-- Table structure for table` dump comments as anchors; `SET FOREIGN_KEY_CHECKS=0` wraps partial restores for safe FK ordering
- New `backups.restore` permission added to `Backup Management` category; included in `backup_management` PBAC module and granted to Admin by default
- `src/lib/backup-modules.ts` — central config mapping all 14 modules to their 96+ DB tables, shared between API and UI

**Financial & Accounts module in backup system**
- All 16 `fin_*` tables (chart of accounts, journal entries, invoices, payments, salaries, supplier/product classification, config) are now restorable as the "Financial & Accounts" module

**Chart of Accounts Management**
- CSV upload: import accounts from a CSV file with live validation and error reporting
- XLSX upload: Excel spreadsheet import with column detection and preview
- Mass delete: select and permanently remove multiple accounts at once
- COA rollback: restore a previous state of the chart of accounts from a snapshot
- Force replace: overwrite existing accounts during Dolibarr sync instead of skipping conflicts

**Dolibarr Sync Improvements**
- Synced By column added to the COA sync history table
- System events logged for each financial sync run
- Fixed: COA accounts not appearing in product/supplier mapping — `is_active=1` now set on account creation; all active accounts shown in mapping dropdowns

**Financial Reporting**
- SOA (Statement of Account) columns now sortable; "Remain to Pay" column added
- VAT report: abandoned invoices excluded from totals
- Salaries: Excel export button
- Cost structure: drill-down view to see line-item detail behind each cost category
- Expenses Analysis: sortable headers across all supplier columns

**Supplier Classification UI**
- Bulk supplier selection for batch classification
- "Save All" button to commit multiple changes in one action
- Dropdown truncation fixed on narrow viewports

#### Fixed

- `fin_chart_of_accounts`: BigInt serialization error in COA mapping APIs resolved (returned as string instead of crashing)
- `created_by` column type mismatch on `fin_*` tables — INT column holding a UUID value removed; column retyped to VARCHAR
- Dolibarr sync: product search returning stale results fixed
- RBAC audit log: excessive logging on every permission check reduced to warnings-only
- `package-lock.json` missing `uuid@11.1.0` entry — caused `npm ci` failure in CI

---

## [16.3.0] - 2026-03-26

### 🏆 Points & Rewards Incentive System

**Minor Release:** Introduces a gamification system that awards points to employees for completing tasks, with bonuses for on-time completion, high-priority tasks, and maintaining streaks. Points are displayed on each user's dashboard with a leaderboard.

#### Added

**Database Schema** (`prisma/migrations/add_points_incentive_system.sql`)
- `user_points` — Stores each user's total points, lifetime points, current streak, and longest streak
- `point_transactions` — Detailed log of all point changes (earn, spend, bonus, adjustment, redemption)
- `point_rules` — Configurable rules for point earning (base points, multipliers, conditions)
- `point_rewards` — Redeemable rewards catalog (badges, certificates, gifts, time off)
- `user_badges` — Tracks badges/achievements earned by users
- `v_points_leaderboard` — View for efficient leaderboard queries

**Points Service** (`src/lib/services/points-service.ts`)
- `awardPointsForTaskCompletion()` — Calculates and awards points when tasks are completed
- Base points: 10 points per task completion
- On-time bonus: +5 points for completing before/on due date
- Early bird bonus: +10 points for completing 2+ days early
- High priority multiplier: 1.5x for high-priority tasks
- Streak bonuses: +15 (3-day), +50 (7-day), +200 (30-day)
- Automatic badge awarding for milestones (first task, 10/50/100/500 tasks, streaks)

**API Routes**
- `GET /api/points` — Get current user's points stats, badges, and recent transactions
- `POST /api/points` — Manual point adjustment (Admin/CEO only)
- `GET /api/points/leaderboard` — Company-wide or department leaderboard
- `GET /api/points/user/[userId]` — View specific user's points (self or managers)
- `GET /api/points/rules` — List all point rules
- `POST /api/points/rules` — Create new rule (Admin only)
- `PUT /api/points/rules` — Update rule (Admin only)

**Dashboard Widget** (`src/components/dashboard/widgets/PointsWidget.tsx`)
- Overview tab: Total points, rank, current streak, this week/month earnings, badges
- Leaderboard tab: Top 5 users with rank indicators (gold/silver/bronze)
- History tab: Recent point transactions with timestamps
- Gradient styling with amber/orange theme for gamification feel

**PWA Install Prompt**
- "Don't show again" button added — persists permanently via localStorage
- Users can now permanently dismiss the install prompt

#### Changed

**Task Completion Flow** (`src/app/api/tasks/[id]/route.ts`)
- Automatically awards points when a task status changes to "Completed"
- Points calculation considers priority, due date, and completion timing
- Streak tracking updates on each task completion

**Delayed Tasks Popup**
- Now shows once daily instead of once per session
- Uses localStorage with date check to prevent repeated popups throughout the day

#### Fixed

**Chart of Accounts Sync from Dolibarr**
- Now tries multiple API endpoints (`accountancy/chartofaccounts`, `accounting/chartofaccounts`, `accountancy/accounts`) for compatibility with different Dolibarr versions
- Improved error message when no accounts are found, with suggestions for Dolibarr configuration

---

## [16.2.0] - 2026-03-24

### 🏷️ Cost Classification Mapping — Product Categories & Supplier Classification

**Minor Release:** Introduces a complete 3-table cost classification system so every supplier invoice line is accurately categorised in all financial reports. The old single-fallback approach (account mapping only, then "Other/Unclassified") is replaced by a 4-level hierarchy.

#### Added

**Product Categories** (`fin_product_categories`)
- New table that stores named categories with a cost classification (e.g. Raw Materials) and an optional Chart-of-Accounts account code
- Bilingual support (English name + optional Arabic name)
- `GET /api/financial/product-categories` — list all categories with mapped product count and COA account name
- `POST /api/financial/product-categories` — create a category
- `PUT /api/financial/product-categories/[id]` — update name, classification, COA code, or active flag
- `DELETE /api/financial/product-categories/[id]` — delete (blocked if product mappings exist)
- New page `/financial/product-categories` — tabbed UI: manage categories + assign product refs to categories

**Product Category Mapping** (`fin_product_category_mapping`)
- New table that maps a Dolibarr `product_ref` to a `fin_product_categories` row
- `GET /api/financial/product-category-mapping` — existing mappings + list of unmapped product refs (sorted by spend)
- `POST /api/financial/product-category-mapping` — create mapping
- `PUT /api/financial/product-category-mapping/[id]` — change category
- `DELETE /api/financial/product-category-mapping/[id]` — remove mapping
- Unmapped products tab shows all invoice product refs without a mapping so nothing is missed

**Supplier Classification** (`fin_supplier_classification`)
- New table that assigns a default cost category (and optional COA code) to a Dolibarr supplier
- Serves as the third-level fallback after account mapping and product category mapping
- `GET /api/financial/supplier-classification` — classified suppliers + unclassified suppliers sorted by total spend
- `POST /api/financial/supplier-classification` — classify a supplier
- `PUT /api/financial/supplier-classification/[id]` — update category or COA code
- `DELETE /api/financial/supplier-classification/[id]` — remove classification
- New page `/financial/supplier-classification` — inline explanation of priority order, unclassified suppliers with one-click assign, classified table with edit/delete

**DB Migration**
- `prisma/migrations/add_cost_classification_mapping.sql` — creates all 3 tables with proper indexes, FK constraints, and audit columns (`created_by`, `updated_by`)

#### Changed

**4-Level Classification Hierarchy in All Financial Reports**
- SQL queries in `getProjectCostStructure()` and `getExpensesAnalysis()` now use:
  ```
  COALESCE(
    account_mapping.ots_cost_category,      -- 1. Dolibarr account code mapping
    product_category.cost_classification,    -- 2. Product ref → category mapping
    supplier_classification.cost_category,   -- 3. Supplier default category
    'Other / Unclassified'                   -- 4. Fallback
  )
  ```
- Monthly trend query replaced: removed the old keyword pattern-matching CASE (`LIKE '%raw%'`, `LIKE '%transport%'`, etc.) with the same 4-level COALESCE using the new tables
- All affected queries now LEFT JOIN `fin_product_category_mapping`, `fin_product_categories`, and `fin_supplier_classification`

**Sidebar Navigation (Financial)**
- Added **Product Categories** → `/financial/product-categories`
- Added **Supplier Classification** → `/financial/supplier-classification`

---

## [16.1.2] - 2026-03-23

### 🐛 PTS Source Fix & Production Logs Project Filter

**Patch Release:** Correct "OTS" source label on previously PTS-synced logs, fix the PTS sync update path, and show all projects with logs in the production logs project filter.

#### Fixed

- **PTS logs showing source as "OTS"** — Logs synced from PTS before the source field was added defaulted to `"OTS"`. The "Fix Process Labels" button in Production Status now also corrects these records by setting `source = "PTS"` on any log whose `externalRef` starts with `"PTS-"`
- **PTS sync update path missing source** — When an already-synced log was re-synced from PTS, the `source` field was not set in the update, so it remained `"OTS"`; now always writes `source: 'PTS'` on update
- **Production Logs project dropdown showing only assigned projects** — The dropdown called `/api/projects` which filters by `projects.view_all` permission; users without that permission only saw their own projects. A new dedicated endpoint `/api/production/logs/projects` returns all projects that have at least one log regardless of project-management permissions

---

## [16.1.1] - 2026-03-23

### 🐛 Production Status Pagination & Process Fix

**Patch Release:** Pagination for the production status sheet, and correct display of dispatch processes synced from PTS or logged in OTS.

#### Added

- **Pagination on Production Status page** — rows-per-page selector (25 / 50 / 100 / All) with first / previous / next / last navigation controls; page resets automatically when filters or sort column change

#### Fixed

- **Dispatch processes not reflected in Production Status** — "Dispatched to Sandblasting", "Dispatched to Galvanization", "Dispatched to Customer", "Dispatched to Painting", and "Dispatched to Site" were missing from the status API's process-type list; the columns now correctly show processed quantities and percentages
- **Wrong process column keys in status client** — column keys used `"Dispatch to …"` (without the "d") which never matched database values; corrected to `"Dispatched to …"` for all dispatch columns
- **PTS sync storing invalid `"Dispatch"` process type** — the sync service mapped the generic word `"dispatch"` to `"Dispatch"` (not a valid enum value); replaced with explicit mappings for all dispatch variants so future syncs store the correct canonical process type

---

## [16.1.0] - 2026-03-22

### 🔧 Supply Chain UX Improvements & Dolibarr Integrations

**Minor Release:** LCR layout overhaul, complete supplier fetch in alias management, new Purchase Orders page, and Accounts Payable shortcuts in the Supply Chain sidebar.

#### Added

**Purchase Orders Page**
- **New page** `/supply-chain/purchase-orders` — full list of Dolibarr purchase orders displayed directly in OTS
- Status badges (Draft / Validated / Approved / Ordered / Partially Received / Received / Canceled / Refused) with colour coding
- Supplier name, supplier reference, project reference, order date, delivery date, billing status, and HT/TTC totals per row
- Client-side status filter and full-text search (ref, supplier, project)
- Configurable page size (25 / 50 / 100) with previous/next pagination
- "Open in Dolibarr" button linking directly to the Dolibarr supplier orders module

**Supply Chain Sidebar Additions**
- **Purchase Orders** link → `/supply-chain/purchase-orders`
- **AP Aging Report** link → `/financial/reports/aging?type=payable` (pre-selects Accounts Payable on load)
- **Statement of Account** link → `/financial/reports/soa`
- Navigation permission registered for `/supply-chain/purchase-orders` (`supply_chain.view`)

**Aging Report — URL-driven type selection**
- Reads `?type=payable` query parameter on load and automatically initialises the report type to Accounts Payable, enabling deep-linking from the Supply Chain sidebar

#### Fixed

**LCR Page Layout (filter bar overlap)**
- Merged page title and all filter controls into a single `flex-wrap` row — eliminates the project/status dropdown collision visible on smaller viewports
- Project dropdown widened from `w-56` → `w-64`; Status dropdown widened from `w-44` → `w-52` with "All Statuses" placeholder
- Sync Now / Reports buttons and row/sync stats moved to the far right of the same row for a cleaner, denser header

**Alias Management — complete supplier list**
- Fixed alias page fetching only the first 200 Dolibarr suppliers (hard cap in the API)
- Now paginates automatically: fetches the first page, reads `pagination.total`, then fires remaining page requests in parallel so all suppliers are available in the combobox regardless of total count

---

## [16.0.0] - 2026-03-22

### 🚀 Supply Chain Management Module — Complete LCR System

**Major Release:** Full-featured Supply Chain module with Google Sheets integration, automated procurement tracking, and comprehensive reporting.

#### Added

**Database & Models**
- **3 new Prisma models** — `LcrEntry` (procurement line items with 30+ fields including qty, amount, dates, LCR comparisons), `LcrAliasMap` (maps informal sheet names to OTS entities), `LcrSyncLog` (sync run history with metrics)
- **Foreign key relations** — Project.lcrEntries, Building.lcrEntries, User.lcrAliasMaps for full data integrity
- **SQL migrations** — `add_supply_chain_lcr.sql` (tables + indexes) and `add_supply_chain_permissions.sql` (RBAC)

**Sync Engine**
- **Google Sheets sync service** — `src/lib/sync/lcrSync.ts` pulls procurement data from Google Sheets, computes MD5 row hashes for change detection, and performs intelligent upserts via Prisma transactions
- **Alias resolution system** — Auto-resolves project IDs (via projectNumber), product IDs (via item label), building IDs (via alias map), and supplier IDs (via alias map); tracks unresolved aliases with `resolutionStatus` field (pending/resolved)
- **Automated scheduler** — `LcrSyncScheduler` registered in `instrumentation.ts` using node-cron, configurable interval via `LCR_SYNC_INTERVAL_MINUTES` env var (default 30 min)
- **Soft-delete handling** — Rows removed from sheet are marked `isDeleted=true` instead of hard-deleted
- **Date parsing** — Supports YYYY-MM-DD and DD/MM/YYYY formats with Saudi Arabia locale defaults
- **Decimal handling** — Comma-separated numbers parsed correctly for SAR amounts

**API Routes (12 endpoints)**
- **CRUD Operations:**
  - `GET /api/supply-chain/lcr` — Paginated LCR entries with filters (projectId, buildingId, status, resolutionStatus, dateFrom, dateTo)
  - `GET /api/supply-chain/lcr/[id]` — Single entry detail with project/building relations
  - `POST /api/supply-chain/lcr/sync` — Manual sync trigger (admin/CEO only)
- **Alias Management:**
  - `GET /api/supply-chain/lcr/aliases` — Returns existing mappings grouped by entityType + pending aliases with affected row counts
  - `POST /api/supply-chain/lcr/aliases` — Create alias mapping with automatic back-fill of existing LCR rows + re-evaluation of resolutionStatus
  - `DELETE /api/supply-chain/lcr/aliases?id=` — Remove alias mapping (admin only)
- **Sync Logs:**
  - `GET /api/supply-chain/lcr/sync-logs` — Last 20 sync runs with metrics (inserted, updated, unchanged, deleted, pendingAliases, durationMs)
- **Reports (4 analytics endpoints):**
  - `GET /api/supply-chain/lcr/reports/status` — Procurement status breakdown by project and status (item count, total amount, total weight)
  - `GET /api/supply-chain/lcr/reports/spend-vs-target` — LCR1 spend vs target price with variance percentage per project
  - `GET /api/supply-chain/lcr/reports/supplier-performance` — Items awarded, total SAR, avg price/ton per supplier
  - `GET /api/supply-chain/lcr/reports/overdue` — Items past needed-by date without receiving date, sorted by days overdue
- **External Cron:**
  - `POST /api/cron/lcr-sync` — Protected endpoint with Bearer token auth (`CRON_SECRET`) for external cron triggers

**User Interface (3 pages)**
- **LCR Main Page** (`/supply-chain/lcr`)
  - Data table with 10 columns (SN, Project #, Building, Item, Qty, Status, Awarded To, Needed By, Receiving, Resolution)
  - 5 filter controls (Project dropdown, Status dropdown, Resolution dropdown, Date From, Date To) with reset button
  - Sync status bar showing last sync time, total rows, pending aliases count, and "Sync Now" button
  - Overdue highlighting (red text + days overdue badge) for items past needed-by date
  - Detail drawer with full entry info including LCR comparison table (LCR1★, LCR2, LCR3 with amounts and price/ton)
  - Pagination controls (50 items per page)
  - Resolution status icons (green checkmark = resolved, amber warning = pending)
- **Reports Page** (`/supply-chain/lcr/reports`)
  - 4 report cards with recharts visualizations:
    - Procurement Status — Stacked bar chart by project (Requested/Ordered/Received/Cancelled)
    - Spend vs Target — Table with variance % highlighting (red = over budget, green = under)
    - Supplier Performance — Table with items awarded, total SAR, avg price/ton
    - Overdue Items — Scrollable table with days overdue badges
- **Alias Management Page** (`/supply-chain/lcr/aliases`) — Admin only
  - Unresolved Aliases section with pending mappings (shows alias text, type badge, affected row count)
  - Dropdown selectors for buildings (from `/api/buildings`) and suppliers (from `/api/dolibarr/thirdparties?type=supplier`)
  - Save button triggers back-fill of existing rows + resolution status re-evaluation
  - Existing Mappings table with delete buttons (shows alias text, type, entity ID, mapped by, date)
  - Green "All aliases resolved" state when pendingAliases = 0

**Navigation & Permissions**
- **Sidebar section** — "Supply Chain" with Package icon, 3 menu items (LCR, Reports, Alias Management) with star badges
- **RBAC permissions** — `supply_chain.view` (CEO, Admin, Manager), `supply_chain.sync` (Admin), `supply_chain.alias` (Admin)
- **Navigation permissions** — Added to `src/lib/navigation-permissions.ts` for route-level access control

**Type Definitions**
- `LcrEntryWithRelations` — Full entry type with project/building/supplier relations
- `LcrSyncResult` — Sync operation result (status, inserted, updated, unchanged, deleted, pendingAliases, durationMs, error?)
- `LcrAliasWithPending` — Alias mapping with metadata
- `PendingAlias` — Unresolved alias with affected row count

**Environment Variables**
- `GOOGLE_SHEETS_KEY_JSON` — Service account JSON (stringified) for Google Sheets API
- `GOOGLE_SHEET_LCR_ID` — Google Sheet ID
- `GOOGLE_SHEET_LCR_RANGE` — Sheet tab name and column range (default: `Sheet1!A:AJ`)
- `LCR_SYNC_INTERVAL_MINUTES` — Sync interval in minutes (default: 30)
- `ENABLE_LCR_SCHEDULER` — Enable/disable automatic sync (default: false in dev, true in prod)

**Infrastructure**
- **Skeleton component** — Created `src/components/ui/skeleton.tsx` (shadcn pattern) for loading states
- **Memory saved** — Supply Chain module architecture and file locations stored for future reference

#### Technical Details
- **Column mapping** — 31 columns mapped from Google Sheets (SN, Project Number, Item, Qty, Amount, Status, Building Name, Request Date, Needed From/To, Buying Date, Receiving Date, PO Number, DN Number, Awarded To, Weight, Total Weight, LCR1/2/3 totals and prices, Target Price, MRF Number, Ratio, Thickness)
- **Hash-based diffing** — MD5 hash of concatenated cell values enables efficient change detection (only changed rows trigger updates)
- **Audit trail** — All sync operations logged to `AuditLog` with action=SYNC, source=GoogleSheets, and full metadata
- **Error handling** — Sync failures logged to `LcrSyncLog` with error messages; partial syncs marked as status='partial'
- **Prisma transactions** — All insert/update/delete operations wrapped in `$transaction` for atomicity

---

## [15.27.5] - 2026-03-22

### Backlog Task Management & Activity Trail

#### Added
- **Task status management** — Each linked task on the backlog detail page now has a clickable circle toggle and a status dropdown (Pending → In Progress → Completed); completing a task strikes through its title and highlights the row in green
- **Task delete** — A trash icon button on each task row opens a confirmation dialog before permanently removing the task from the backlog item
- **`PATCH /api/backlog/[id]/tasks/[taskId]`** — New in-context endpoint to update a task's status, title, description, or priority while scoped to its parent backlog item; handles `completedAt` / `completedById` tracking automatically
- **`DELETE /api/backlog/[id]/tasks/[taskId]`** — New endpoint to remove a task scoped to its parent backlog item
- **Live progress percentage** — The Progress sidebar card now shows a `% complete` label that updates in real time as tasks are completed or reopened
- **Task audit trail on backlog items** — Creating, completing, reopening, or deleting a task now writes an `AuditLog` entry (`entityType: ProductBacklogItem`) with a structured `metadata.event` field (`task_created`, `task_completed`, `task_reopened`, `task_deleted`)
- **Dynamic Activity Trail** — The backlog item detail page merges status milestones (Submitted → Under Review → Approved → …) with task audit events chronologically; task events display a distinct `ClipboardList` icon and color-coded dot (sky=created, emerald=completed, orange=reopened, red=deleted)
- **Backlog GET returns `activityLogs`** — `GET /api/backlog/[id]` now fetches and returns all `AuditLog` entries for the item so the activity trail is always up to date without a separate request

---

## [15.27.4] - 2026-03-22

### Global Search Bar

#### Added
- **Global Search Bar** — Persistent search icon (🔍) in the top-right navigation bar, positioned to the left of the notification bell and logout button; visible on every authenticated page
- **Ctrl+K keyboard shortcut** — Opens the search dialog from anywhere in the system
- **Cross-entity search** — A single query simultaneously searches Tasks, Projects, Initiatives, Weekly Issues, Backlog Items, NCRs, RFIs, and Assembly Marks via 8 parallel Prisma queries
- **`GET /api/search?q=`** — New search API endpoint; returns up to 5 results per category with `id`, `title`, `subtitle`, `badge` (status), and `url` fields
- **Categorized result groups** — Results are visually separated by entity type with a distinct color-coded icon per category
- **Status badges on results** — Each result shows a color-coded status badge (green for active/open, grey for completed/closed, red for overdue/critical)
- **Keyboard navigation** — Use ↑↓ arrow keys to move between results, Enter to open, Esc to close the dialog
- **300 ms debounce** — Input changes are debounced before triggering the API to avoid excessive requests
- **Minimum 2-character threshold** — Search only fires when at least 2 characters are entered

---

## [15.27.3] - 2026-03-22

### PTS Sync History Improvements & Project Dashboard Task Fixes

#### Fixed
- **PTS Sync History dialog horizontal scrolling** — Removed `min-w-[900px]` table constraint and switched the dialog to a flex column layout with vertical-only scroll; the table now fits within the screen on all device sizes without left/right navigation
- **PTS Sync History dialog size** — Dialog now expands to `max-h-[92vh]` using the full available screen height so more rows are visible without any clipping
- **Compact date formatting in history table** — Dates now display in a shorter locale format (`M/D/YY, h:mm AM/PM`) saving horizontal space
- **Long project lists in history** — Project number columns truncate at 4 entries with a `+N more` indicator
- **Duration and User columns hidden on mobile** — These columns use `hidden sm:table-cell` to only appear on larger screens, freeing space for the essential columns
- **Tasks in project dashboard** — Fixed task display and classification issues in the project dashboard view; tasks now appear correctly with accurate activity grouping after the main-activity schema corrections

#### Added
- **New buildings consent prompt in PTS Sync execute** — Before syncing, a dedicated amber "New Buildings to be Created" section now appears for every unmatched building belonging to selected projects; each building has an individual checkbox so users can choose exactly which new buildings to allow OTS to create
- **Select All / None controls for new buildings** — Two quick-action buttons let users accept or reject all pending new-building creations in one click
- **"Map Instead" shortcut** — A button inside the consent section opens the building mapping dialog directly, letting users link unmatched PTS buildings to existing OTS buildings rather than creating duplicates
- **Live count of buildings to be created** — A summary line below the checkboxes shows `X of Y new buildings will be created`, updating in real time as the user checks/unchecks items

---

## [15.27.2] - 2026-03-21

### Architecture Activity & Task Classification Enhancements

#### Added
- **Architecture Main Activity** — New "Architecture" activity added to the task classification system, positioned first in the activity workflow
- **Approved Architectural Drawings sub-activity** — Single sub-activity under Architecture for tracking architectural drawing approval status

---

## [15.27.1] - 2026-03-21

### Dashboard Widgets: Product Backlog & Weekly Issues

#### Added
- **Product Backlog widget** — New dashboard widget showing active/blocked/pending backlog counts, priority breakdown (Critical/High/Medium/Low), and up to 5 recent active items with code and status badges; links to `/backlog`
- **Weekly Issues widget** — New dashboard widget showing open/in-progress issue counts, overdue alert, priority breakdown, and up to 5 recent open issues with department and issue number; links to `/business-planning/issues`
- **`GET /api/dashboard/backlog/summary`** — Aggregates `ProductBacklogItem` records by status and priority, returns totals for active/blocked/pending groups and 5 recent non-completed items
- **`GET /api/dashboard/weekly-issues/summary`** — Aggregates `WeeklyIssue` records by status and priority, returns overdue count and 5 recent open issues
- Both widgets register as `BACKLOG` and `WEEKLY_ISSUES` types in the dashboard widget registry and are available via the **Add Widget** dialog; auto-refresh every 2 minutes

---

## [15.27.0] - 2026-03-20

### Task Attachments, Backlog Notifications & Compression

#### Added
- **Task Attachments** — Upload images and documents to any task in both full create/edit form and the quick-add table row (up to 10 files, 10 MB each); attachments are displayed in the task detail page with download and permission-gated delete
- **`TaskAttachment` model** — New `task_attachments` DB table with cascade-delete, stored under `/uploads/task-attachments/`
- **`GET/POST /api/tasks/[id]/attachments`** — List and upload attachments for a task
- **`DELETE /api/tasks/[id]/attachments/[attachmentId]`** — Delete an attachment (uploader or admin only; removes file from disk)
- **Attachment count in grid view** — Task cards in grid mode show a paperclip icon with the count of attached files
- **Image compression** — Raster image attachments (JPEG, PNG, WebP) are automatically compressed server-side using Sharp before storage; JPEG/WebP converted to WebP at 82% quality, PNG palettised with level-9 compression
- **Backlog status push notification** — When any backlog item status changes (e.g. SUBMITTED → UNDER_REVIEW → APPROVED), the item creator receives an in-app and mobile push notification informing them of the change and who made it

#### Fixed
- **Tasks not appearing after migration** — Attachment count and detail queries now degrade gracefully when the `task_attachments` table is not yet created; tasks still render without attachment data

#### Infrastructure
- SQL migration `20260319000000_add_task_attachments` — `CREATE TABLE task_attachments` with FK constraints and index; apply manually with `npx prisma generate` + the SQL below on existing servers

---

## [15.26.0] - 2026-03-20

### Task Attachments, Backlog Notifications & Compression

#### Added
- **Task Attachments** — Upload images and documents to any task in both full create/edit form and the quick-add table row (up to 10 files, 10 MB each); attachments are displayed in the task detail page with download and permission-gated delete
- **`TaskAttachment` model** — New `task_attachments` DB table with cascade-delete, stored under `/uploads/task-attachments/`
- **`GET/POST /api/tasks/[id]/attachments`** — List and upload attachments for a task
- **`DELETE /api/tasks/[id]/attachments/[attachmentId]`** — Delete an attachment (uploader or admin only; removes file from disk)
- **Attachment count in grid view** — Task cards in grid mode show a paperclip icon with the count of attached files
- **Image compression** — Raster image attachments (JPEG, PNG, WebP) are automatically compressed server-side using Sharp before storage; JPEG/WebP converted to WebP at 82% quality, PNG palettised with level-9 compression
- **Backlog status push notification** — When any backlog item status changes (e.g. SUBMITTED → UNDER_REVIEW → APPROVED), the item creator receives an in-app and mobile push notification

#### Fixed
- **Tasks not appearing after migration** — Attachment count and detail queries now degrade gracefully when the `task_attachments` table is not yet created

---

## [15.24.0] - 2026-03-16

### Parts Upload Enhancements & Bug Fixes

#### Added
- **CSV File Support** — Upload page now accepts `.csv` files in addition to `.xls` and `.xlsx`; CSV is read as text and parsed via the XLSX library
- **Header Row Selector** — New numeric input (default: 1) lets you specify which row contains column names; column mapping and preview update live on change; handles files where the header is not on the first row
- **Rollback Upload** — After a successful bulk upload a *Rollback Upload* button appears; clicking it soft-deletes all uploaded parts (`deletedAt` set) so the batch can be recovered from the Governance page; requires `production.delete_parts` permission; the rollback is logged as a system event
- **`POST /api/production/assembly-parts/rollback`** — New endpoint that accepts `{ partIds, projectId }` and soft-deletes the specified parts
- **`POST /api/user/tips-dismissed`** — New endpoint that writes a `tipsDismissed_<key>` flag into the user's `customPermissions` to persist feature-tip dismissals across devices and sessions

#### Fixed
- **Parts Upload 403 Forbidden** — Upload API was checking `production.upload_parts` (which does not exist); fixed to use the correct key `production.create_parts`
- **Part Mark now optional** — Bulk upload no longer fails when the Part Mark column is absent or unmapped; `partMark` defaults to an empty string and the part designation is generated without a trailing dash
- **Tasks "New Features" tips keep returning** — Dismissed state is now saved server-side in the user's `customPermissions`; dismissal persists across browser sessions, private windows, and different devices

#### Improved
- Bulk upload logs `entityType: 'AssemblyPart'` and the full `partIds` array in system events for downstream traceability (e.g. rollback)
- Bulk upload now also writes one `logActivity` (CREATE) record to the Governance audit trail in addition to the system event
- Upload error messages are now more descriptive; 403 responses show a clear "You do not have permission" message instead of a generic failure

---

## [15.23.0] - 2026-03-16

### Simple Tasks View

#### New Features
- **Simple Tasks View toggle** — new 4th view button (LayoutList icon) on `/tasks`, placed right next to the existing Project Management View toggle
- **Columns:** Task Name (links to detail), Assigned To, Status, Project, Building, Input Date, Due Date
- **Quick Add row** — inline form at the top of the table; press Enter or click Add to create a task without leaving the page
- **Inline Edit** — click the ⋮ menu → Edit to edit any row directly in the table; Save / Cancel buttons confirm or discard changes
- **3-dot action menu** — each row exposes View, Edit, and Delete actions
- **Overdue highlighting** — rows with a past due date and non-completed status are highlighted in red; completed tasks show a green left border
- **Sortable columns** — click any column header to sort ascending/descending

---

## [15.22.2] - 2026-03-15

### Mobile Push Notifications for Delayed & Upcoming Tasks

#### New Features
- **Manual Push Nudge** — New Push button on each row in the Delayed Tasks list lets supervisors send an immediate in-app + Web Push notification to the assigned user, asking them to update task status
- **Deadline Reminder Cron** — New `POST /api/cron/deadline-reminders` endpoint scans all tasks due within ~2 days and sends `DEADLINE_WARNING` push notifications to assignees automatically; protected by `CRON_SECRET` bearer token — schedule daily at 08:00

#### Technical Changes
- New `POST /api/notifications/notify-task` route creates a `DEADLINE_WARNING` notification (which PushService fans out as a Web Push) for a given task's assignee; validates task ownership and requires `tasks.view_all` or assignment
- New `POST /api/cron/deadline-reminders` route; `CRON_SECRET` is now read lazily inside the handler (not at module-import time) to prevent Next.js build failures when environment variables are absent in CI

#### Setup
1. Add `CRON_SECRET=<secret>` to `.env`
2. Configure a daily cron at 08:00: `curl -X POST https://<host>/api/cron/deadline-reminders -H "Authorization: Bearer <secret>"`

---

## [15.22.1] - 2026-03-15

### Task Workflow Fixes & PBAC Toggle Consistency

#### Fixed
- **Task status after rejection** — Duplicating a task or creating a revision after rejection now sets the initial status to `In Progress` instead of `Pending`, so tasks are immediately actionable
- **Completion notification routed to Approvals** — Completing a task now sends an `APPROVAL_REQUIRED` notification to the requester (instead of `TASK_COMPLETED`) so it surfaces in the Approvals tab with inline Approve/Reject buttons; the assignee is notified with `APPROVED`/`REJECTED` once the requester acts
- **Notification deep links** — Task notifications now navigate to `/tasks/[id]` (detail page) instead of the list page that silently discarded the `?id=` parameter
- **Logout cookie not clearing** — Logout now awaits the API fetch before redirecting so the browser applies the `Set-Cookie` headers that clear the session cookie; the logout API returns JSON (not a redirect) to prevent the response from being swallowed before headers are processed
- **What's New dialog reappearing** — Latest-version API now reads the user's `lastSeenVersion` from the server and returns `alreadySeen: true` when the user has already dismissed the dialog; `mark-version-seen` merges into existing `customPermissions` JSON instead of overwriting it to prevent accidental permission loss
- **Approval notifications on task detail page** — Approving or rejecting a task from the task detail page now notifies the assignee; previously only the notification action center triggered these notifications
- **Approval/rejection not logged** — `approved`, `approval_revoked`, and `rejected` events are now recorded in the task activity trail with human-readable labels
- **Missing Reject button on task detail** — Approve and Reject buttons now appear side-by-side when a task is Completed and not yet actioned
- **Completion circle turns grey after approval** — Circle now uses `status === 'Completed' || !!completedAt` so older tasks (where `completedAt` was `null`) correctly show green
- **Reset All hidden on mobile** — Moved Reset All out of the overflowing filter row into the search bar row so it is always reachable on narrow screens
- **PBAC toggle uses wrong permission** — My Tasks / All Tasks toggle in `DelayedTasksWidget`, `DelayedTasksNotificationDialog`, and the notifications page now checks the `tasks.view_all` PBAC permission instead of the `isAdmin` boolean; any user with a PBAC grant for `tasks.view_all` sees the toggle, and it can be revoked individually
- **Admin isAdmin bypassed PBAC revokes** — `permission-resolution.service.ts`: `isAdmin=true` users now start with all permissions but still have `customPermissions.revokes` and `restrictedModules` applied; previously the early-return for isAdmin bypassed the full PBAC resolution, making module restrictions ineffective for admins

---

## [15.22.0] - 2026-03-15

### Global Notification Bar & Dashboard Layout Improvements

#### New Features
- **Global TopBar** — Notification bell and logout button are now permanently visible in the top-right corner on every system page, giving users instant access regardless of which page they are on
- **Actionable Notification Dropdown** — The notification panel now supports inline actions directly from the dropdown list:
  - **Complete** button on task-assigned notifications to mark the task done immediately
  - **Approve / Reject** buttons on approval-request notifications to act without navigating away
- **Clear on Read** — Clicking any notification marks it as read and removes it from the dropdown list, keeping the list clean and focused on unread items
- **Clear All** — New trash icon in the notification panel header archives all notifications at once (POST `/api/notifications/bulk-archive`)
- **Unread Count Badge** — The panel header now displays the current unread count next to the "Notifications" title
- **New bulk-archive API** — `POST /api/notifications/bulk-archive` archives all unread notifications for the authenticated user

#### Improvements
- **Dashboard Full-Width Layout** — Removed `container mx-auto` constraint from the dashboard page; content now uses the full available width with consistent padding
- **Widget Grid Enhancement** — Updated widget grid from `sm:grid-cols-2 lg:grid-cols-3` to `md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4`, better utilizing wide-screen space and allowing four widgets per row on large monitors
- **Dashboard Header Simplified** — Removed the redundant per-page logout button from the dashboard since logout is now always accessible via the global TopBar
- **Notification Panel Polish** — Unread indicator dot, smaller timestamps, tighter spacing, and improved dark-mode-aware highlight colors

---

## [15.21.0] - 2026-03-15

### Task Management UX & Delayed Tasks Improvements

#### New Features
- **Clickable Delayed Tasks** — Tasks in the delayed tasks widget and login notification dialog are now clickable, navigating directly to the task detail page
- **Requested by Me** — New sidebar menu item under Tasks showing tasks where the current user is the requester
- **Requester Filter** — New dropdown filter on the Tasks page to filter tasks by requester, alongside the existing Assigned To filter
- **Delayed Tasks Scope Toggle** — Notifications page delayed tasks tab now defaults to showing only the user's own delayed tasks with an admin toggle to switch between "My Tasks" and "All Tasks"

#### Improvements
- Delayed tasks on the notifications page now default to personal tasks (`?personal=true`) instead of showing all system tasks
- Admin users see a My Tasks / All Tasks toggle on the delayed tasks tab for switching between personal and system-wide views
- Task filter reset now includes the new requester filter

---

## [15.20.2] - 2026-03-14

### Unique Browser Tab Titles

#### Improved
- **Page Titles** — Every page now displays a unique, descriptive title in the browser tab using the format `Hexa Steel® OTS ™ - <Page Name>` (e.g., "Hexa Steel® OTS ™ - Tasks", "Hexa Steel® OTS ™ - Settings", "Hexa Steel® OTS ™ - Financial"). Users can now easily identify and navigate between open tabs
- **Root Layout Template** — Updated the root metadata to use Next.js title template (`"Hexa Steel® OTS ™ - %s"`) so all pages inherit the brand prefix automatically
- **Coverage** — All 147 pages across the application have unique titles: Tasks, Projects, Dashboard, Settings, Financial reports, Production pages, QC, Business Planning, Operations Control, Knowledge Center, Backlog, and more
- **PWA Title** — Updated Apple Web App title to `Hexa Steel® OTS ™`

#### Technical Changes
- Updated `src/app/layout.tsx` metadata to use title template
- Added `export const metadata` to 37 server component pages
- Created server metadata wrapper (`page.tsx` + `_page-client.tsx`) pattern for 109 client component pages, enabling metadata export without breaking client-side interactivity

---

## [15.20.1] - 2026-03-14

### SWOT Analysis Bug Fixes

#### Fixed Issues
- **API 500 Error** - Fixed Prisma client generation issue where `swotAnalysis` model wasn't recognized. Regenerated Prisma client to include the `SwotAnalysis` model
- **Database Query Method** - Changed from `findUnique()` to `findFirst()` for year-based queries since `year` field doesn't have unique constraint
- **Input Field Clearing** - Fixed bug where input fields (especially Weaknesses) weren't clearing after clicking + button. Implemented proper category-to-field mapping
- **Data Persistence** - SWOT data now saves correctly and persists after page refresh
- **API Standards Compliance** - Updated API route to use proper imports (`@/lib/db`, `logger`, `withApiContext`) instead of deprecated patterns

#### Technical Changes
- Fixed `src/app/api/business-planning/swot/route.ts`:
  - Corrected Prisma import path
  - Replaced `console.error` with `logger.error`
  - Wrapped handlers with `withApiContext` for authentication
  - Updated all queries to use `findFirst()` instead of `findUnique()`
- Fixed `src/app/business-planning/swot/page.tsx`:
  - Fixed `addItem` function field clearing with proper key mapping
  - Replaced `category.slice(0, -1)` with explicit `keyMap` object

---

## [15.20.0] - 2026-03-12

### Mobile App & Push Notifications (PWA)

#### New Features
- **Progressive Web App (PWA)** — OTS is now installable as a mobile app on Android, iOS, and desktop via the browser. Includes manifest, service worker, and app icons
- **Web Push Notifications** — Users receive real-time push notifications on their mobile/desktop devices even when OTS is not open. Powered by VAPID/web-push
- **Per-Type Notification Preferences** — New settings page (`/settings/notifications`) where users can toggle push and in-app notifications individually for each type:
  - Task Assigned, Task Completed, Approval Required, Deadline Warning, Approved, Rejected, System
- **PWA Install Prompt** — Smart install banner appears for mobile users who haven't installed the app yet
- **Auto Service Worker Registration** — Handles background push events, notification click navigation to the relevant entity, and automatic cleanup of expired push subscriptions
- **Dynamic PWA Manifest** — Manifest served via `/api/manifest` to correctly handle base path configuration
- **VAPID Key Generation Script** — `node scripts/generate-vapid-keys.mjs` generates the required keys for push notification setup

#### Database Changes
- Added `push_subscriptions` table — Stores device push subscriptions per user (endpoint, keys, user agent)
- Added `user_notification_preferences` table — Per-type push/in-app toggle preferences per user

#### Technical Changes
- `NotificationService.createNotification()` now automatically triggers push delivery (fire-and-forget, non-blocking)
- New `PushService` handles VAPID configuration, push delivery, user preference checks, and stale subscription cleanup
- Middleware updated to allow PWA files (`sw.js`, `manifest.json`, `/icons/`) and public API routes (`/api/push/vapid-key`, `/api/manifest`)
- New API routes: `POST/DELETE/GET /api/push-subscription`, `GET/PUT /api/notification-preferences`, `GET /api/push/vapid-key`, `GET /api/manifest`
- Added `@radix-ui/react-switch` and `web-push` dependencies
- Architecture is Capacitor-ready for future app store distribution

#### Setup
1. Generate VAPID keys: `node scripts/generate-vapid-keys.mjs`
2. Add `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` to `.env`
3. Run migration: `npx prisma migrate deploy`
4. Restart the application

---

## [15.19.1] - 2026-03-11

### Delayed Tasks Widget & Login Notification

#### New Features
- **Delayed Tasks Dashboard Widget** — New widget showing delayed tasks with severity breakdown (Critical 7+ days, Warning 3-7 days, Minor 1-3 days) and a list of most overdue tasks
- **Login Notification Dialog** — Prompts users once per session about their delayed tasks requiring attention, with severity summary and task preview
- **Admin Toggle (My Tasks / All Tasks)** — Admin users can switch between viewing only their personal delayed tasks and all system-wide delayed tasks in both the widget and login dialog
- **Clickable Severity Cards** — Critical, Warning, and Minor severity cards in widget and dialog navigate to the notifications page with severity pre-filter applied
- **Severity Filter on Notifications Page** — Added `?severity=critical|warning|minor` query parameter support with filter pill buttons and clickable stat cards with active ring indicator

#### Bug Fixes
- **Delayed tasks scoped to user** — Widget and dialog now show only tasks where the user is assignee, assigner, or requester instead of all system tasks

#### Technical Changes
- Delayed tasks API supports `?personal=true` param to filter to user's own tasks regardless of admin permissions
- New `DELAYED_TASKS` widget type registered in WidgetContainer for drag-and-drop dashboard customization
- `DelayedTasksNotificationDialog` added to SessionProvider for all authenticated users

---

## [15.19.0] - 2026-03-10

### 🔐 PBAC Migration — Permission-Based Access Control

#### Breaking Changes
- **Deleted `src/lib/rbac.ts`** — Legacy role-based access control module removed entirely. All consumers now use `permission-checker.ts` and `permission-resolution.service.ts`.

#### New Features
- **Permission Resolution Service** — Hybrid permission model: `Final Permissions = Role Permissions + User Grants - User Revokes - Module Restrictions`
- **Custom Permissions with Grants/Revokes** — User edit form now supports granting extra permissions beyond their role and revoking specific role permissions per user
- **Clone Permissions API** — `POST /api/users/[id]/clone-permissions` copies custom permissions from one user to another
- **PBAC Verification Script** — `npx tsx scripts/verify-pbac-migration.ts` scans codebase for remaining role-based patterns

#### Migration Details
- **18+ API routes migrated** — All `['CEO', 'Admin'].includes(session.role)` checks replaced with `checkPermission()` calls
- **12+ page components migrated** — All role-based access checks replaced with `getCurrentUserPermissions()` + `userPermissions.includes()`
- **9 client components migrated** — `userRole` props replaced with `userPermissions: string[]` props:
  - `task-details.tsx`, `tasks-client.tsx`, `itp-client.tsx`, `itp-details.tsx`
  - `initiatives-client.tsx`, `initiative-detail.tsx`, `initiative-tasks-client.tsx`
  - `milestones-client.tsx`, `OperationTimelineClient.tsx`
- **Sidebar** — Already used permission-based navigation filtering (no changes needed)

#### Permission Mapping (Role Check → Permission)
- `['CEO', 'Admin', 'Manager'].includes(role)` → `quality.approve_wps`, `quality.approve_itp`, `documents.approve`, `initiatives.edit`
- `['CEO', 'Admin'].includes(role)` → `tasks.delete`, `initiatives.delete`, `quality.edit_itp`
- `['CEO', 'Admin', 'Manager', 'Engineer'].includes(role)` → `quality.create_itp`, `quality.edit_itp`, `tasks.edit`
- `session.role === 'Admin'` → `checkPermission('specific.permission')`

#### Technical Changes
- `customPermissions` JSON field on User model now uses `{ grants: string[], revokes: string[] }` format
- Backward compatible with legacy `string[]` format (treated as grants-only)
- `resolvePermissionsFromData()` pure function works both server-side and client-side
- User PATCH API accepts both legacy array and new grants/revokes object format via Zod union schema

---

## [15.18.7] - 2026-03-09

### 📊 System Events V2 - Enhanced Activity Tracking

#### New Features
- **User Filter** — Added user dropdown filter to system events page to view activities by specific users
- **Enhanced Colorization** — Category badges now use distinct color schemes (purple for files, blue for records, cyan for sync, orange for production, green for QC, indigo for projects)
- **Improved Table Layout** — Dolibarr-style table with separate Date and Time columns for better readability
- **User Column** — Each event now displays the user who performed the action with user icon
- **Project Reference** — Events linked to projects show project number with folder icon
- **Event Type Icons** — Visual icons for created (green), updated (blue), deleted (red), uploaded (purple), synced (cyan), approved (green), rejected (red)

#### Technical Details
- Added `userId` filter parameter to `/api/events` endpoint
- System events page fetches user list from `/api/users` for filter dropdown
- Event service already supported userId filtering in database queries
- Category colors defined in `CATEGORY_COLORS` constant with Tailwind CSS classes

---

## [15.18.6] - 2026-03-08

### ⚡ CI/CD & Deployment Improvements

#### Changes
- **Next.js Standalone Output** — Enabled `output: 'standalone'` for self-contained production builds; eliminates `npm ci` on the server
- **Next.js Build Caching** — Added `actions/cache` for `.next/cache` directory, scoped to `src/` files only for reliable cache hits
- **Optimized Deploy Package** — Ships only `.next/standalone`, `.next/static`, `public`, and prisma instead of full `.next` + all dependencies
- **Fixed PM2 Process Name** — Corrected PM2 process name from `ots-app` to `hexa-steel-ots` to match actual server configuration
- **Build-time Prisma Fix** — Added dummy `DATABASE_URL` during CI build so Prisma Client can initialize without a real database connection
- **Lazy Service Initialization** — OpenAI and Puppeteer clients are now lazily initialized, preventing build failures when API keys are not available at build time

#### Technical Improvements
- Standalone mode bundles only required `node_modules` into the build output
- PM2 now runs `server.js` directly instead of `next start`, reducing startup overhead
- Removed redundant `git pull`, `npm ci --omit=dev`, and `prisma generate` from server-side deploy
- Deploy workflow caches `.next/cache` keyed by `package-lock.json` and `src/**` file hashes
- Removed duplicate `prisma generate` step (already runs as part of `npm run build`)

---

## [15.18.5] - 2026-03-05

### 🔐 RBAC Overhaul - Permissions Now Work Correctly

#### CRITICAL FIX
This release fixes a fundamental issue where the RBAC permission system was being bypassed by hardcoded `role !== 'Admin'` checks. Users with proper permissions (like CEO with `projects.delete`) were getting "Forbidden" errors because the code only checked for Admin role, not actual permissions.

#### Bug Fixes
- **CRITICAL: CEO could not delete projects** — Despite having `projects.delete` permission, CEO users got Forbidden errors
- **CRITICAL: RBAC permissions ignored** — 18 API routes had hardcoded Admin-only checks that bypassed the permission system
- **projects/[id] DELETE** — Now uses `projects.delete` permission
- **users CRUD** — Now uses `users.create`, `users.edit`, `users.delete` permissions
- **departments POST** — Now uses `departments.create` permission
- **roles CRUD** — Now uses `roles.create`, `roles.edit`, `roles.delete` permissions
- **clients DELETE** — Now uses `clients.delete` permission
- **settings PATCH** — Now uses `settings.manage` permission
- **planning routes** — Now use `planning.create`, `planning.edit`, `planning.delete` permissions
- **operations routes** — Now use `operations.create`, `operations.edit`, `operations.delete` permissions
- **ITP DELETE** — Now uses `qc.delete` permission
- **Project import/export** — Now use `projects.create`, `projects.view` permissions

#### Technical Changes
- All 18 affected API routes now use `checkPermission()` from `@/lib/permission-checker`
- `isAdmin` flag on users still grants all permissions as intended
- Clear error messages now indicate which specific permission is missing
- Permission checks are centralized and consistent across the application

#### How RBAC Now Works
1. If user has `isAdmin: true` → All permissions granted
2. If user's role has the required permission → Action allowed
3. Otherwise → "Forbidden - You do not have permission to [action]"

---

## [15.18.4] - 2026-03-05

### 🛠️ Infrastructure Updates

#### Changes
- **Centralized Version Management** — Created single source of truth for version numbers in `src/lib/version.ts`
- **Automated Version Updates** — Added `scripts/update-version.js` to sync version across all files
- **Fixed Build Version Display** — Build now correctly shows v15.18.4 instead of outdated v15.18.1
- **Strategic Objectives Menu Link** — Added Strategic Objectives link to Business Planning section in sidebar

#### Technical Improvements
- All components now import version from centralized location
- Package.json version automatically synchronized
- Easier version updates going forward - just edit one file and run the script

---

## [15.18.3] - 2026-03-05

### Project Wizard Enhancements & Personalized Notifications

#### New Features
- **Stage Durations Persist from Wizard** — Engineering/Operations/Site week durations now saved to project and displayed in project details card
- **Resume Draft Projects** — PlayCircle icon appears next to Draft projects in projects list; clicking resumes the wizard from the saved step
- **Department Head Notifications** — Department managers are notified when tasks in their department are created, completed, or reassigned
- **Personalized Delayed Tasks** — Users only see delayed tasks they are involved in (assignee, creator, requester, or same department)
- **Personalized Schedule Alerts** — Users only see underperforming schedules for projects they manage or are assigned to

#### Bug Fixes
- **Wizard Status Fix** — Projects completed through the wizard are now set to `Active` status; only `Save as Draft` creates `Draft` projects
- **Stage Duration API Fields** — Added `engineeringWeeksMin/Max`, `operationsWeeksMin/Max`, `siteWeeksMin/Max` to both create and update API schemas
- **thirdPartyResponsibility Field** — Added to API schemas so wizard 3rd party responsibility data persists
- **params.id Lint Fix** — Fixed Promise access error in projects `[id]` API route

#### Changes
- Draft projects now store full wizard state (step, buildings, scopes, coatings, payments) in `remarks` field as JSON for resume capability
- Notification endpoints cache per-user instead of globally
- Admin/CEO users still see all delayed tasks and schedule alerts; other roles see only personalized data

#### Production Commands
```bash
# Run on production MySQL:
mysql -u root -p ots_db < prisma/migrations/add_stage_durations_and_fixes.sql
mysql -u root -p ots_db < prisma/migrations/add_strategic_objectives.sql  # if not already run

# Then restart the app:
pm2 restart ots
```

---

## [15.18.2] - 2026-03-05

### 🎯 Initiatives Display & RBAC Enhancements

#### New Features
- **Multi-select Objectives for Initiatives** — link one initiative to multiple objectives
  - Replaced single-select dropdown with checkbox-based multi-select interface
  - Support for many-to-many relationships via junction table
  - Backward compatibility maintained with direct objectiveId field
  - Visual feedback showing selected objectives count

- **Enhanced RBAC with browse_users Permission** — granular user access control
  - New `projects.browse_users` permission for browsing user lists
  - Allows Project Coordinators and Document Controllers to see user dropdowns
  - No need for full user management access to assign project managers
  - Users API updated to check this permission for assignment purposes

- **Objective Names in Initiative Cards** — improved visibility
  - Initiative cards now display linked objective names
  - Shows next to budget, owner, and timeline information
  - Supports displaying multiple objectives when linked
  - Uses Target icon for visual consistency

#### Bug Fixes
- **Initiatives Progress on Objectives Page** — fixed 0% display issue
  - Initiatives now show correct progress percentages on objectives page
  - Progress calculated from status when progress field is 0 or null
  - Completed initiatives now properly show 100% progress
  - Matches behavior on initiatives page for consistency

- **Initiatives Not Showing Under Objectives** — merged relationship handling
  - Fixed initiatives completely vanishing from objectives page
  - API now fetches from both direct and junction table relationships
  - Properly deduplicates initiatives by ID
  - Accurate initiative count displayed for each objective

- **Dynamic Version Display in Sidebar** — real-time version updates
  - Sidebar version now dynamically fetches from system version API
  - No more hardcoded version strings
  - Automatically reflects latest system version
  - Uses useVersion hook for reactive updates

#### Technical Improvements
- **Objectives API Enhanced** — handles complex initiative relationships
  - Supports both direct and many-to-many initiative relationships
  - Merges and deduplicates initiatives from multiple sources
  - Calculates effective progress for each initiative
  - Maintains backward compatibility with existing data

- **Users API Permission Checks** — more granular access control
  - Added projects.browse_users permission check
  - Allows user list access for assignment purposes
  - Respects both role permissions and custom permissions
  - Maintains security while enabling necessary functionality

#### Database Changes
- Junction table `InitiativeObjective` properly utilized for many-to-many relationships
- Direct `objectiveId` field maintained for backward compatibility
- Permission system extended with new projects.browse_users permission

---

## [15.18.1] - 2026-03-05

### 🎯 Strategic Planning & Initiatives Enhancements

#### New Features
- **Strategic Objectives Module** — 5-7 year mid-term planning
  - Create and manage strategic objectives with 5-7 year horizons
  - Link yearly company objectives to strategic objectives
  - Track progress, priority, and status for long-term goals
  - Category-based organization (Financial, Customer, Internal Process, Learning & Growth)
  - Full CRUD operations with card and table views

- **Initiatives Progress Tracking** — automatic progress calculation
  - Progress now auto-calculates from status when not manually set
  - Planned: 0%, In Progress: 50%, On Hold: 25%, Completed: 100%
  - Manual progress override still available
  - Average progress calculation fixed to use effective progress

- **Delayed Initiative Alerts** — visual indicators for overdue initiatives
  - Red border and background for delayed initiatives
  - "DELAYED" badge displayed prominently
  - Red progress bars for delayed items
  - Automatic detection based on end date and status

#### Improvements
- **Enhanced Initiatives Dashboard** — improved visual design
  - Colorized status cards with matching backgrounds
  - Smaller, more compact card layout
  - Color-coded progress indicators
  - Better visual hierarchy

- **Task Update Permissions** — fixed admin access issues
  - Admins now bypass permission checks via direct database lookup
  - Task requesters can now edit their tasks
  - Fixed stale session permission errors
  - Added rejection fields to allowed updates

#### Database Changes
- New `strategic_objectives` table created
- `company_objectives.strategicObjectiveId` field added
- `annual_initiatives.objectiveId` made nullable
- `initiative_objectives` junction table for many-to-many relationships
- Existing initiative-objective relationships migrated automatically

---

## [15.18.0] - 2026-03-01

### 📊 Financial Reports Enhancements

#### New Features
- **Expenses by Account Report** — monthly breakdown of expenses grouped by accounting account
  - Shows all 12 months (Jan-Dec) with amounts per account
  - Displays account code and account name from Dolibarr
  - Monthly totals and grand total columns
  - Excel/CSV export functionality
  - Sticky column headers for easy scrolling
  - Color-coded rows for better readability

#### Improvements
- **Project Analysis Report** — improved monthly revenue vs cost chart
  - Replaced ineffective line chart with horizontal bar chart
  - Shows actual values directly on bars (e.g., "SAR 2.74M")
  - Clear profit/loss display for each month
  - Better visual comparison between revenue and cost
- **Contract Amount Fix** — Project Analysis now reads Lead Amount instead of Budget
  - Contract column now displays `opp_amount` (Lead amount from Dolibarr)
  - Previously showed `budget_amount` which was incorrect
  - Balance calculation updated to use contract amount

#### Bug Fixes
- **Excel Export Fixed** — Journal entries and OTS Journal entries exports now work correctly
  - Changed file extension from `.xlsx` to `.csv` to match actual content
  - Added proper blob download with cleanup
  - Files now open in Excel without corruption errors
- **Account Mapping Errors Fixed** — resolved database table issues
  - Removed dependency on non-existent `dolibarr_accounting_account` table
  - Fixed "Unknown column 'sil.description'" error in drill-down modal
  - Now uses `fin_dolibarr_account_mapping` for CoA information

---

## [15.17.0] - 2026-02-28

### 📊 OTS Journal Entries Report & Bug Fixes

#### New Features
- **OTS Journal Entries Report** — new double-entry journal entries report generated from supplier invoices with proper expense categorization
  - Creates proper DR/CR entries: Expense accounts (by category), VAT Input, and Accounts Payable
  - Uses `fin_dolibarr_account_mapping` for accurate expense categorization
  - Group by category view with drill-down to individual entries
  - Excel export with full journal entry details
  - Category summary with visual distribution bars
  - Shows balanced/unbalanced status for each entry
- **Account Mapping Management Page** — GUI for mapping Dolibarr accounting codes to OTS cost categories
  - Find unmapped accounting codes with automatic category suggestions
  - Edit existing mappings with dropdown category selection
  - View total amounts per mapping to prioritize important codes
  - One-click mapping creation from unmapped codes list

#### Bug Fixes
- **Journal Entries Export Fixed** — resolved "Unknown column 'je.description'" error that broke Excel export and group-by-account features
  - Root cause: SQL queries referenced `je.description` but the `fin_journal_entries` table uses `label` column
  - Fixed in `/api/financial/journal-entries` route

#### Expense Categorization Explained
The expense categorization system works as follows:
- **Journal Entry Categories**: Uses `fin_chart_of_accounts.account_category` (e.g., "Cost of Sales", "Operating Expenses")
- **Supplier Invoice Categories**: Uses `fin_dolibarr_account_mapping.ots_cost_category` which maps Dolibarr's internal accounting rowids to OTS cost categories
- The new OTS Journal Entries report uses the supplier invoice categorization for more accurate expense breakdown

---

## [15.16.1] - 2026-02-27

### 🔍 Material Inspection Receipt (MIR) System - Critical Fixes

#### Bug Fixes
- **Database Migration Fixed** — corrected foreign key references from `projects` to `project` and `users` to `user`
- **Prisma Schema Mapping** — added `@@map` directives to all MIR models to map to snake_case database tables
- **PO Lookup Simplified** — removed complex SQL filters, now fetches recent POs and filters client-side for better reliability
- **Error Handling Improved** — added comprehensive logging and empty state UI for PO search results
- **Authentication Issues Resolved** — fixed intermittent 401 errors in PO lookup API

#### Technical Improvements
- MIR tables now created successfully without migration errors
- Prisma client properly maps camelCase fields to snake_case columns
- PO search now shows clear feedback when no results found
- Added result count display and loading states
- Enhanced debug logging for troubleshooting

---

## [15.16.0] - 2026-02-27

### 🔐 Task Visibility Control

#### New Features
- **View Other Users Tasks Permission** — new `tasks.view_others` permission added to role management
  - Allows granular control over whether users can see tasks assigned to other users
  - Users with this permission can view non-private tasks across the system
  - Users without this permission only see their own assigned or created tasks
  - Automatically added to Manager and Document Controller default roles

#### Permission Logic
- **tasks.view_all** — see all tasks including private tasks (except those not belonging to user)
- **tasks.view_others** — see other users' non-private tasks + own tasks
- **No permission** — only see own assigned or created tasks

#### API Changes
- Updated `GET /api/tasks` to respect new permission level
- Updated `GET /api/tasks/[id]` to enforce permission-based access control
- Enhanced filtering logic for better task visibility control

---

## [15.15.0] - 2026-02-27

### 🔍 Material Inspection Receipt (MIR) System & Purchase Order Integration

#### New Features
- **Material Inspection Receipt (MIR) System** — complete revamp of QC Material Inspection module to integrate with Dolibarr purchase orders
- **Purchase Order Lookup** — search and select purchase orders directly from Dolibarr to create material receipts
- **Automatic Item Population** — receipt items automatically populated from PO line items with supplier and product details
- **Partial Receiving Support** — receive materials in multiple batches with quantity tracking (ordered, received, accepted, rejected)
- **Per-Item Quality Inspection** — comprehensive quality checks for each item:
  - Surface condition assessment (Good, Minor Defects, Major Defects, Unacceptable)
  - Dimensional verification (Within Tolerance, Minor Deviation, Out of Tolerance)
  - Thickness measurements with status tracking
  - Specifications compliance verification
  - Material Test Certificate (MTC) tracking with number and file path
  - Heat number and batch number tracking
- **Quality Rejection Tracking** — reject items with detailed rejection reasons
- **Receipt Status Management** — track receipts through In Progress, Partially Received, and Completed statuses
- **PO Supplier & Project Display** — purchase orders now show supplier name and project reference in list and detail views

#### Database Changes
- **material_inspection_receipts** — new table linking to Dolibarr POs with supplier and project info
- **material_inspection_receipt_items** — detailed item tracking with quality inspection fields
- **material_inspection_receipt_attachments** — support for MTC files and inspection photos

#### API Enhancements
- **GET/POST/PATCH /api/qc/material-receipts** — receipt management endpoints
- **PATCH /api/qc/material-receipts/items** — item inspection updates
- **GET /api/qc/material-receipts/lookup-po** — search Dolibarr purchase orders
- **Enhanced /api/dolibarr/purchase-orders** — enriched with supplier names and project references
- **DolibarrClient.getThirdPartyById()** — fetch supplier details by ID
- **DolibarrClient.getProjectById()** — fetch project details by ID

#### UI Improvements
- **Modern MIR Interface** — clean, intuitive UI for material receiving workflow
- **PO Search Dialog** — quick search and selection of purchase orders
- **Receipt Dashboard** — overview with stats (total, in progress, partial, completed)
- **Item Inspection Dialog** — comprehensive form for quality checks per item
- **Status Badges** — visual indicators for receipt and inspection statuses
- **Filtering & Search** — filter receipts by status and search by receipt/PO number

---

## [15.14.0] - 2026-02-26

### 📊 Financial & Production Module Enhancements

#### New Features
- **Project Analysis Search** — search projects by name, number, or client name in the project analysis report
- **Contract Value Columns** — added Contract and Balance columns to project analysis table showing contract amount and remaining balance to invoice
- **Aggregate Cost Drill-Down** — click any cost category in the aggregate cost breakdown to see detailed invoice lines (product, supplier, invoice, project, qty, amount)
- **Journal Entries Excel Export** — export journal entries to CSV with one click
- **Journal Entries Hierarchy View** — view entries grouped by accounting account with collapsible drill-down showing debits, credits, and balance per account
- **Trial Balance Excel Export** — export trial balance report to CSV
- **Income Statement Excel Export** — export P&L report to CSV
- **Assembly Parts Length Column** — added Length (mm) column to assembly parts list

#### Bug Fixes
- **CRITICAL: Assembly parts page refresh loop** — `totalArea.toFixed is not a function` error caused by Prisma Decimal objects; now converted to Number
- **Status-by-name report refresh loop** — API response format changed to paginated; fixed to extract data array correctly
- **RBAC: CEO account forbidden on upload** — added CEO role to allowed roles in assembly-parts POST endpoint
- **RBAC: CEO cannot mark tasks complete** — added CEO role to task GET/PATCH/DELETE permission checks
- **RBAC: CEO cannot view all tasks** — added CEO to allowed roles alongside Admin and Manager

#### Improvements
- **Toast notifications** — replaced standard `alert()` calls with modern toast notifications in upload and assembly-parts pages
- **Project analysis table** — renamed "Revenue" column to "Invoiced" for clarity

---

## [15.13.0] - 2026-02-25

### 📊 Financial Report Accuracy & Cost Drill-Down

#### New Features
- **fin_dolibarr_account_mapping table** — maps Dolibarr accounting account rowids to OTS cost categories for accurate cost classification
- **Cost detail drill-down** — click any cost category bar in project analysis to see line-level details (product, supplier, invoice, qty, amount)
- **Account mapping management API** — GET/PUT `/api/financial/account-mapping` for viewing and editing category assignments
- **Cost details API** — `/api/financial/reports/project-analysis/cost-details` with project and category filtering

#### Bug Fixes
- **CRITICAL: 6,079 supplier invoices had fk_projet=NULL** — Dolibarr API returned valid `fk_project` but sync code failed to persist it; backfilled from `dolibarr_raw` JSON
- **PJ2411-0257 now shows 451 supplier invoices (SAR 3.7M)** — was showing 0 due to missing project linkage
- **Cost categories were 99% "Other Costs"** — `accounting_code` contained Dolibarr internal rowids (e.g. 107317231) that never matched CoA account codes; now uses dedicated mapping table
- **Raw Materials now correctly 72.3%** of total costs (was 0.1%) — proper for steel fabrication industry
- **Sync stored dolibarr_raw as NULL** — now stores full JSON payload for future data recovery
- **Building dropdown in task edit mode** — showed only designation prefix instead of full building name

#### Improvements
- **All cost category queries** in project analysis, cost structure, and expenses analysis use `fin_dolibarr_account_mapping` instead of broken CoA join
- **102 Dolibarr accounting codes** auto-classified into 10 cost categories: Raw Materials, Subcontractors, Equipment, Transportation, Labor, Rent, Insurance, Admin, Production Supplies, Other
- **Invoice sync** now stores `dolibarr_raw` JSON for both customer and supplier invoices

---

## [15.12.0] - 2026-02-24

### 🔒 Financial API Security & Cost Fix

#### New Features
- **requireFinancialPermission()** — shared server-side guard for all financial API routes
- **HTTP 403 Access Denied** for users without `financial.view` permission on any financial endpoint

#### Bug Fixes
- **CRITICAL: Cartesian product in client name subquery** — projects with multiple customers caused duplicate rows, showing identical costs across many projects
- **All projects showing identical costs (SAR 311K)** — caused by duplicated rows in LEFT JOIN, not real data
- **Financial reports accessible via direct URL** — now returns 403 instead of showing data
- **Console TypeError: fetchRiskCount** — silenced non-critical background fetch error

#### Improvements
- **All 27 financial API routes** use `requireFinancialPermission()` instead of basic session-only check
- **Client name subquery** uses `ROW_NUMBER()` to return exactly 1 client per project (highest revenue)
- **Write operations** (sync, config PUT, chart-of-accounts POST/PUT/DELETE) require `financial.manage`

---

## [15.11.0] - 2026-02-24

### 📊 Project Analysis & RBAC Fix

#### New Features
- **Clickable cost column** — click any cost value to see inline cost breakdown per project
- **Unlinked supplier costs warning** — shows how many supplier invoices are not linked to projects
- **Client name fallback** — resolves client from customer invoices when project has no fk_soc
- **Enhanced monthly chart** — Y-axis gridlines, value labels, and legend with totals

#### Bug Fixes
- **RBAC: Financial pages visible without permission** — removed `settings.view` from all financial navigation permissions (root cause)
- **Project status all showing "Draft"** — now inferred from revenue (Open if has revenue) and close date (Closed)
- **Client column empty** — added fallback JOIN on customer invoices to resolve client names
- **Project sync** — reads `socid`/`statut` as fallbacks from Dolibarr API response
- **Percent icon HMR error** — removed unused import from project-analysis page

#### Improvements
- **Compact table layout** — smaller padding, text-xs font, truncated columns for better screen fit
- **Revenue/Cost shown in compact format** — K SAR / M SAR instead of full numbers
- **Monthly chart** — enhanced with gridlines, value labels, and legend totals

---

## [15.10.0] - 2026-02-24

### 🔐 RBAC Overhaul & User Management

#### New Features
- **isAdmin flag on User** — grants all permissions regardless of role; user keeps their role title but gets full system access
- **Mobile number field** — international format (e.g. +966512345678) for WhatsApp notifications
- **financial_module restriction** — new MODULE_RESTRICTIONS entry covering financial.view/manage/sync/export
- **dolibarr_module restriction** — new MODULE_RESTRICTIONS entry covering dolibarr.view/sync

#### Bug Fixes
- **RBAC: Financial sidebar visible despite module disabled** — `/api/auth/me` was not applying `restrictedModules` filtering
- **permission-checker.ts** — refactored to use shared `resolveUserPermissions()` with isAdmin support
- **Missing navigation permissions** — added entries for assets, salaries, cost-structure, expenses-analysis, project-analysis routes
- **Project Analysis 500 error** — better error handling when dolibarr_projects table is empty

#### Improvements
- **User create/edit forms** — now include mobile number input and administrator toggle
- **API user routes** — accept isAdmin and mobileNumber fields with validation
- **Navigation permissions** — updated for all financial report routes

---

## [15.9.0] - 2026-02-24

### 📊 Financial Dashboard Improvements

#### New Features
- **All dashboard KPIs are now clickable** — each card links to its source report
- **Asset Report** (`/financial/reports/assets`) — shows all asset accounts grouped by category with balances
- **Salaries Report** (`/financial/reports/salaries`) — shows all salary records grouped by month with paid/unpaid status
- **Projects count** on dashboard with clickable link to Project Analysis
- **Projects sync button** in Sync Status section

#### Bug Fixes
- **Salaries showing SAR 0** — now falls back to `fin_salaries` table when journal entries have no salary data
- **Salaries included in Total Expenses** — ensures salary amounts are counted in the total expenses figure
- **Invoice sync hash now includes `fk_project`** — forces re-sync to backfill project links on all invoices

#### Improvements
- **Smart number formatting** — amounts < 1M now show as K SAR (e.g. SAR 90K instead of SAR 0.09M)
- **Removed duplicate Net Profit Margin** — merged margin % into the Net Profit card
- **Removed duplicate Cost of Sales** — was identical to Total Expenses; kept only Total Expenses
- **Dashboard Row 2 reorganized** — Gross Profit, ROA, ROE, Salaries, Projects (5 cards)

---

## [15.8.0] - 2026-02-23

### 🐛 Bug Fixes & Statement of Account Export

#### Bug Fixes
- **Assembly Parts page crash** — Fixed `totalArea.toFixed is not a function` error when Prisma returns null aggregates
- **Project Analysis report empty** — Report requires a full financial sync to populate `dolibarr_projects` table (trigger sync from Financial Dashboard)

#### New Features
- **Statement of Account — PDF Export** with official form layout
  - Hexa Steel branded header with company details (CR, VAT)
  - Customer/Supplier info box with period and balance due
  - Summary row: Total Invoiced, Total Paid, Outstanding Balance
  - Transaction table with color-coded payment rows
  - Totals row with debit/credit/balance
  - Footer with company address and page numbers on all pages
  - Auto-named file: `SOA_{name}_{from}_{to}.pdf`

- **Statement of Account — Excel Export**
  - Structured worksheet with header info, summary, and transaction table
  - Proper column widths and numeric formatting
  - Auto-named file: `SOA_{name}_{from}_{to}.xlsx`

#### Notes
- Salary sync 403 error is a Dolibarr API permission issue — grant salary read access to the API key in Dolibarr admin

---

## [15.7.0] - 2026-02-23

### 📊 Project Analysis Report

#### New Features
- **Project Analysis Report** (`/financial/reports/project-analysis`)
  - Syncs project data from Dolibarr `llxvv_projet` table into new `dolibarr_projects` mirror table
  - Links customer & supplier invoices to projects via `fk_projet` foreign key
  - Per-project financial metrics: revenue, collected, outstanding receivables, costs, profit/loss, margin %
  - Cost breakdown by category (raw materials, subcontractors, transportation, labor, equipment, etc.)
  - Monthly revenue vs cost trend with bar chart visualization
  - Collection rate tracking per project with progress bars
  - Supplier payment tracking and outstanding payables per project
  - Summary view with sortable project table and aggregate KPIs
  - Detail drill-down view with full invoice list, payment history, cost breakdown, and monthly trend
  - Date range filtering for period-specific analysis
  - Print-friendly layout
  - Replaces the old Project Profitability report with comprehensive analysis

#### Technical Details
- New migration: `add_dolibarr_projects.sql` — creates `dolibarr_projects` table, adds `fk_projet` to invoice tables
- New Dolibarr client methods: `getProjects()`, `getAllProjects()` for paginated project fetching
- New sync method: `syncProjects()` in `FinancialSyncService` — included in full sync and partial sync
- Updated invoice sync to capture `fk_projet` from Dolibarr API responses
- New service method: `getProjectAnalysis()` in `FinancialReportService`
- New API route: `GET /api/financial/reports/project-analysis` with `from`, `to`, `projectId` params
- Updated sidebar navigation and financial dashboard quick links

---

## [15.6.0] - 2026-02-23

### 📊 Financial Reports — Cost Structure & Expenses Analysis

#### New Features
- **Project Cost Structure Analysis** (`/financial/reports/project-cost-structure`)
  - Breakdown of project costs by category: raw materials, subcontractors, transportation, labor, equipment, rent, etc.
  - Visual bar chart distribution with percentage of total and percentage of revenue
  - Monthly cost trend with stacked bar visualization
  - Cost by supplier ranking with percentage breakdown
  - Cost-to-revenue ratio and gross margin KPIs
  - Smart category detection from product labels (Arabic & English) and accounting codes

- **Expenses Analysis Report** (`/financial/reports/expenses-analysis`)
  - Detailed expense breakdown by chart-of-accounts category with drill-down to individual accounts
  - Period-over-period comparison (current vs previous period change %)
  - Monthly expense trend with stacked bar visualization
  - Supplier expenses grouped by category (raw materials, subcontractors, transportation, etc.)
  - Top 50 expense items ranked by amount with supplier and quantity details
  - Expense-to-revenue ratio, net profit margin, and net profit KPIs

#### Technical Details
- New service methods: `getProjectCostStructure()`, `getExpensesAnalysis()` in `report-service.ts`
- New API routes: `GET /api/financial/reports/project-cost-structure`, `GET /api/financial/reports/expenses-analysis`
- Both reports accept `from` and `to` date parameters
- Added to sidebar navigation and financial dashboard quick links

---

## [15.5.0] - 2026-02-23

### ✨ Tasks Module Enhancement

#### New Features
- **Task Requester Field**
  - New `requester` field on tasks — choose/change who requested the task
  - Requester shown in table view, detail view, and full form (create/edit)
  - Requester dropdown available in inline quick-add and inline edit rows

- **Task Release Date**
  - New `releaseDate` field — target release/delivery date separate from due date
  - Release Date shown in table view, detail view, stage circles, and full form
  - Sortable column in table view

- **Tasks Dashboard** (`/tasks/dashboard`)
  - Team performance overview with summary cards (total, completed, overdue, in-progress, completion rate)
  - Per-member stats table: assigned tasks, completed, pending, in-progress, success rate, schedule slips, overdue, requested tasks
  - Success rate = % of completed tasks finished on or before due date
  - Schedule slips = tasks completed late + currently overdue tasks
  - Color-coded badges for quick visual assessment
  - Added to sidebar under Tasks section

- **Personalized Task Notifications**
  - When a task is assigned, the assignee receives a notification from the requester (or creator if no requester)
  - When a task is completed, the requester (or creator) receives a "Task Completed" notification
  - When a task is reassigned, the new assignee receives a notification
  - New `TASK_COMPLETED` notification type added to the system

#### Database Changes
- Added `requesterId` (FK to User) and `releaseDate` columns to Task table
- Added `TASK_COMPLETED` to NotificationType enum
- Migration scripts: `add_task_requester_release_date.sql`, `add_task_completed_notification_type.sql`

---

## [15.4.1] - 2026-02-22

### 🔧 Financial Sync Production Fix

Critical fix for production financial sync where supplier invoices were only partially syncing (536 vs 8880) and all financial figures showed SAR 0.00 due to journal entries being 0.

#### Fixed
- **Journal Entry Data Loss Prevention**
  - Journal entries are now generated in memory first, old entries deleted only after successful generation
  - Previously, old entries were deleted before regeneration — if generation failed, all entries were lost (0 journal entries)
  - This was the root cause of SAR 0.00 across all financial reports on production

- **Full Sync Resilience**
  - Each sync step (bank accounts, customer invoices, supplier invoices, journal entries) now wrapped in individual try/catch
  - A failure in supplier invoice sync no longer prevents journal entry generation from running
  - Journal entries are always generated from whatever data is available in the database

- **API Timeout & Batch Size**
  - Increased default Dolibarr API timeout from 30s to 120s to handle large batch fetches
  - Increased pagination batch size from 100 to 500 for customer and supplier invoices
  - Reduces total API calls from 89 to 18 for 8880 supplier invoices

- **Progress Logging**
  - Added detailed progress logging every 100 invoices during sync
  - Added page-level logging during Dolibarr API pagination
  - Helps diagnose production sync issues from server logs

---

## [15.0.0] - 2026-02-22

### 📊 Financial Reporting Module

Major release introducing a comprehensive Financial Reporting Module that syncs transactional data from Dolibarr ERP and generates standard financial reports with auto-generated double-entry journal entries.

#### Added
- **Financial Reporting Engine**
  - Trial Balance with opening, period, and closing balances
  - Income Statement (P&L) with gross profit, operating profit, and net profit
  - Balance Sheet with assets, liabilities, equity, and balance verification
  - VAT Report with 5% and 15% rate breakdown (ZATCA compliance ready)
  - AR/AP Aging Report with Current, 1-30, 31-60, 61-90, 90+ day buckets
  - All reports support date range filtering and print-friendly layout

- **Financial Data Sync from Dolibarr**
  - Customer invoice sync with line-level detail and VAT rates
  - Supplier invoice sync with payment tracking
  - Payment sync per invoice (customer and supplier)
  - Bank account sync with current balances from Dolibarr
  - MD5 hash-based change detection for efficient incremental syncing

- **Auto-Generated Journal Entries**
  - Double-entry bookkeeping from synced invoices and payments
  - Customer invoice: Debit AR, Credit Revenue + VAT Output
  - Supplier invoice: Debit Expense + VAT Input, Credit AP
  - Payments: Debit/Credit Bank and AR/AP accounts
  - Credit note support with reversed debit/credit entries
  - Configurable default account mappings via settings page

- **Chart of Accounts Management**
  - Full CRUD for chart of accounts with Arabic name support
  - Account types: Asset, Liability, Equity, Revenue, Expense
  - Category grouping for structured report presentation
  - Pre-populated Saudi standard chart of accounts

- **Financial Settings & Configuration**
  - Default account mapping (AR, AP, Revenue, Expense, VAT 5%/15%)
  - Bank account to accounting code mapping table
  - Automated 2-hour sync via protected cron endpoint

- **Financial Dashboard**
  - Overview cards: Revenue, Expenses, Net Profit, VAT Payable, AR, AP
  - Bank accounts summary with current balances
  - Quick links to all financial reports
  - Sync status with record counts and recent sync logs

- **Journal Entries Browser**
  - Filterable data table of all auto-generated entries
  - Filter by date range, journal code, account code, source type
  - Pagination and detailed entry information

#### Changed
- Added Financial Reports section to sidebar navigation
- Updated navigation permissions for financial module routes
- Extended Dolibarr API client with invoice, payment, and bank account methods

---

## [14.0.0] - 2026-02-22

### 🔗 Dolibarr ERP Integration Module

Major release introducing comprehensive Dolibarr ERP v22.0.1 integration with steel product specifications management.

#### Added
- **Dolibarr ERP Integration**
  - Full REST API client for Dolibarr v22.0.1 with retry logic and exponential backoff
  - Mirror tables for products, third parties, and contacts synced from Dolibarr
  - MD5 hash-based change detection — only updates records that actually changed
  - Soft-delete for records removed from Dolibarr (preserves history)
  - Automatic Unix timestamp conversion and string-to-number parsing for Dolibarr API
  - PMP (Weighted Average Cost) field mapped for production costing

- **Steel Product Specifications**
  - OTS-native steel specs table with grade, profile, dimensions, weight, and material properties
  - Pre-populated steel grade reference data (S235JR through HARDOX500)
  - Pre-populated profile reference data (IPE, HEA, HEB, UPN with standard dimensions)
  - Auto-fill dimensions when selecting a standard profile size
  - Surface finish, coating, and operational attributes (lead time, min order qty)
  - Fabrication and welding notes per product

- **Bulk Specs Assignment**
  - Pattern matching interface to assign specs to multiple products at once
  - Preview matched products before applying changes
  - Match by product ref or label with contains pattern
  - COALESCE-based updates preserve existing specs when bulk-assigning

- **Integration Dashboard**
  - Connection status card with Dolibarr version and API permissions check
  - Sync status with last sync times and record counts
  - Quick sync buttons for individual entity types or full sync
  - Sync history table showing last 10 runs with duration and counts
  - Products tab with search, profile type, and steel grade filters
  - Third parties tab with customer/supplier type filter
  - Steel specs editor modal with auto-populate from reference data

- **API & Infrastructure**
  - Protected cron endpoint for automated 30-minute sync cycles
  - Reference data API for steel grades and profiles (dropdown population)
  - Comprehensive sync logging with duration, counts, and error tracking
  - Integration config table for sync settings management

- **Login Form Enhancement**
  - Added password visibility toggle (eye icon) to login form
  - Users can now preview their password while typing

#### Fixed
- **Appearance System Removal**
  - Removed broken Appearance/Theme system that was overriding CSS variables with incompatible HSL values
  - Root cause: ThemeProvider used HSL format while globals.css uses oklch
  - Cleaned up 400+ lines of glass morphism CSS that caused visual glitches
  - System restored to clean default muted theme defined in globals.css

#### Changed
- **Navigation & Infrastructure**
  - Added Dolibarr ERP section to sidebar navigation
  - Updated navigation permissions for Dolibarr integration routes
  - Added environment variables for Dolibarr API configuration
  - Removed Appearance tab from Settings page and sidebar (was causing UI corruption)
  - Replaced appearance page with redirect to main settings
  - Simplified ThemeProvider to passthrough that clears saved theme data

---

## [13.5.4] - 2026-02-20

### 🎨 PTS Sync & Appearance Enhancements

#### Added
- **Building Management**
  - Building weight field in project wizard and buildings table
  - Building weight displayed on project details page

- **PTS Sync Enhancements**
  - Building mapping dialog to match PTS buildings with OTS buildings
  - Auto-extract building designation from part designation if column is empty
  - Expanded sync history dialog showing all columns
  - Fixed building designation column mapping (column S)

- **Appearance Settings**
  - Color palette picker in settings with 6 preset themes
  - Appearance tab added to main settings page
  - Project management view colorization by level (project/building/department)

#### Changed
- Project management view rows now color-coded by hierarchy level
- Buildings card in PTS sync now clickable to open mapping dialog

#### Fixed
- Fixed scope schedule creation - dates now optional
- Fixed PTS sync building designation column (S instead of R)
- Fixed PTS sync history dialog width

---

## [13.5.3] - 2026-02-19

### 📋 Task Management & Wizard Enhancements

#### Added
- **Task Rejection Workflow**
  - Task rejection with duplicate option for revision tracking
  - Rejection reason input with confirmation dialog
  - Rejected tasks display with reason tooltip

- **Revision & Remark Columns**
  - Revision and remark columns in all task views (table, quick add, project management)
  - Editable in quick add mode and inline edit mode
  - Displayed in full task view with "Additional Information" card

- **Inline Editing in Project Management View**
  - Edit tasks directly in project management view without full edit mode
  - Edit title, description, assigned to, dates, status, priority, remark, revision

- **Project Wizard Improvements**
  - Stage duration now uses weeks (min-max) instead of start-end dates
  - Stage durations displayed in project details under Dates & Durations

- **PTS Sync Enhancements**
  - Option to sync production log data by date or by project
  - Fixed building column mapping (column U instead of T)

#### Changed
- Project edit page now shows project number and name in header
- Task description shown below task name in project management view
- Modern alert messages for approval/rejection actions

#### Fixed
- Fixed hydration error in login form version display
- Fixed PTS sync building column mapping
- Date validation: due date cannot be before input date

---

## [13.5.2] - 2026-02-15

### 📋 Tasks UI Polish & PTS Preview

#### Added
- **Expand All / Collapse All**
  - Expand All and Collapse All buttons in project management view toolbar
  - Default state is expanded when switching to project management view

- **New Features Tip Banner**
  - Dismissible banner highlighting Ctrl+Click multi-select, sorting, project view, approval, and duplication
  - Persisted via localStorage so it only shows once

- **Approval Filter Buttons**
  - Inline Approved / Not Approved filter buttons next to status filters (replaces dropdown)

- **PTS Sync Data Preview**
  - Preview first 20 rows of PTS data before importing on the execute page
  - Shows mapped column data in a scrollable table for verification

#### Changed
- **Project Management View Consistency**
  - Rewritten to use Table/TableRow/TableCell components matching the main tasks table
  - Added Assigned To and Priority columns
  - Shows completion counts per project/building level
  - Uses system-consistent muted palette instead of colored backgrounds
  - Card header with title and expand/collapse controls

- **Building Dropdown in Quick Add**
  - Now shows full building name with designation, e.g. "Zone 8 Toilet (Z8T)" instead of just "Z8T"

- **Date Column Widths**
  - Input Date, Due Date, and Completion columns now have min-width to prevent date wrapping

- **Version Updated to 13.5.2**
  - Updated across: package.json, VersionBadge, login-form, app-sidebar, settings/version, latest-version API, /changelog page

#### Fixed
- Removed duplicate approval filter dropdown from additional filters section

---

## [13.5.1] - 2026-02-15

### 📋 Tasks Module Major Enhancement

#### Added
- **Sortable Table Headers**
  - All task table columns are now clickable to sort ascending/descending
  - Visual sort indicators (arrows) on active sort column

- **Task Duplication**
  - Duplicate any task via the dropdown menu (creates a copy with "Pending" status)

- **Multi-Select Filters**
  - Hold Ctrl/Cmd and click status or priority buttons to select multiple filters simultaneously
  - Visual hint shown when multi-select is active

- **Approval Status Column**
  - New "Approval" column with shield icon toggle for client approval tracking
  - Approval timestamp and approver name displayed
  - Approval filter dropdown (All / Approved / Not Approved)

- **Project Management View**
  - New hierarchical tree view: Project → Building → Activity (Department) → Task
  - Collapsible sections with duration, start/finish date aggregation
  - Inline task completion and approval toggles
  - Similar to MS Project / Primavera style layout

#### Changed
- **Building Filter Dependency**
  - Building dropdown now filters based on selected project
  - Resets automatically when project selection changes

- **Responsive Layout**
  - Tasks table now expands to full width when sidebar is collapsed
  - Horizontal scroll enabled for wide tables on narrow screens

#### Fixed
- Filter state now properly uses arrays for multi-select instead of single strings

---

## [13.5.0] - 2026-02-09

### 🛡️ Security & Performance Major Release

#### Security Improvements
- **Complete Server Security Overhaul**
  - Removed malware/cryptominer infection (EuXZqNPw process)
  - Implemented 7-layer security protection system
  - Added Fail2Ban with automatic IP blocking (13 attackers blocked)
  - Configured Cloudflare DDoS protection
  - Hardened SSH configuration and disabled root login
  - Installed ClamAV antivirus with 3.6M signature database
  - Added comprehensive firewall rules

#### Performance Improvements
- **Memory Optimization**
  - Freed 4GB RAM from malware consumption
  - Reduced CPU usage from 96% to 0-3%
  - Achieved 51% available memory headroom
  - System now runs at peak performance

- **Stability Enhancements**
  - Zero crashes since security cleanup
  - PM2 auto-restart configured every 6 hours
  - Automated daily backups (688K DB + 26M app)
  - Scheduled weekly virus scans

#### Bug Fixes
- **Session Management**
  - Fixed logout session persistence issue
  - Added multiple cookie domain variations for proper clearing
  - Client-side storage clearing on login page mount
  - Cache-busting for version API calls

- **PTS Sync Features**
  - Fixed sync history not saving (added PTSSyncBatch creation)
  - Added timeout handling for Google Sheets API (25s timeout)
  - Implemented auto-map button for column mapping
  - Added save/load mapping functionality with localStorage

- **Runtime Errors**
  - Fixed UpdateNotificationDialog null check error
  - Added proper error handling for undefined mappings

#### Automation
- **Backup System**
  - Daily automated database and application backups
  - Backup verification and logging
  - Retention policy management

- **Monitoring**
  - Automated security checks scheduled
  - Performance monitoring with PM2
  - Error logging and alerting

---

## [13.4.7] - 2026-02-07

### 🚀 New Features

#### Added
- **Quick Edit Mode for Tasks**
  - Edit tasks directly in the table row without navigating to separate page
  - All fields become editable inputs/dropdowns when clicking edit button
  - Supports editing: title, assignee, department, project, building, priority, status, input date, due date, and private flag
  - Visual feedback with blue background during edit mode
  - Save and Cancel buttons replace action buttons during editing
  - Maintains existing date values when entering edit mode

#### Fixed
- **Hydration Error Resolution**
  - Fixed server/client mismatch in login form version display
  - Version now fetched dynamically on client side to prevent hydration errors

- **Date Field Preservation**
  - Fixed issue where Input Date and Due Date fields were resetting to empty when entering edit mode
  - Dates now properly converted from ISO format to YYYY-MM-DD for HTML date inputs

- **Terminal Noise Reduction**
  - Disabled Prisma query logging to reduce terminal clutter
  - Only error messages are now logged to terminal

---

## [13.4.6] - 2026-02-03

### 🚀 Performance Improvements

#### Added
- **Database Connection Pooling Middleware**
  - Implemented singleton Prisma client with connection reuse
  - Automatic connection cleanup and graceful shutdown handling
  - Connection pool monitoring with health checks
  - Prevents connection timeout errors and improves query performance
  - Memory saved: 50-100MB, Query speed: 20-50ms faster

- **Memory Leak Detection System**
  - Lightweight monitoring tracks heap usage every 5 minutes
  - Detects abnormal growth patterns (>50MB/hour)
  - Alerts at 85% heap usage with detailed metrics
  - Auto-starts in production with minimal overhead (~10-15MB)

- **System Monitoring API**
  - New endpoint: `/api/system/monitor` (Admin/CEO access only)
  - Real-time memory metrics and database connection stats
  - System health dashboard with growth rate analysis
  - Provides actionable insights for system maintenance

#### Changed
- **Early Warning Engine Optimization**
  - Reduced cron job frequency from hourly to daily at 2:00 AM
  - 96% reduction in executions (24/day → 1/day)
  - Prevents missed cron executions due to blocking IO
  - Significantly reduces CPU and memory load during peak hours

- **PM2 Configuration Enhancements**
  - Increased memory limit from 2GB to 4GB
  - Reduced instances from 2 to 1 (single instance mode)
  - Memory usage: -51% (840MB → 415MB)
  - Free RAM: +197% (159MB → 472MB)

- **Database Connection Settings**
  - Increased connection pool limit from 5 to 20 connections
  - Extended connection timeout from 10s to 20s
  - Updated DATABASE_URL with optimized parameters

#### Fixed
- **System Stability Issues**
  - Resolved "PM2 process not found" errors
  - Fixed database connection pool exhaustion
  - Eliminated event loop latency spikes (9207ms → <100ms)
  - Prevented system crashes due to memory pressure

- **Cron Job Reliability**
  - Fixed missed cron job executions
  - Resolved blocking IO warnings in scheduled tasks
  - Improved error handling in background processes

### 📊 Performance Metrics
- Memory usage: -51% (840MB → 415MB per instance)
- Free RAM: +197% (159MB → 472MB)
- Cron executions: -96% (24/day → 1/day)
- DB connections: +300% (5 → 20 limit)
- Event loop latency: -99% (9207ms → <100ms)
- System crashes: 100% reduction

---

## [13.4.5] - 2026-02-01

### 🐛 Bug Fixes

#### Fixed
- **Payment Percentage Import Issue**
  - Fixed async state issue causing field mappings to be undefined during import
  - Resolved Excel column name trimming problem (spaces in column headers)
  - Added automatic payment amount calculation from percentages during import
  - Formula: `Payment Amount = Contract Value × Percentage ÷ 100`
  - Applied to all payment terms (down payment, payment 2-6)

- **Task Form Data Loss**
  - Fixed optional fields (building, department) resetting to default when editing tasks
  - Added buildingId and departmentId to Task type definition
  - Initialize state with existing task values instead of empty strings

- **Project Edit Contract Value**
  - Fixed contract value disappearing when editing projects
  - Changed conversion logic to handle 0 values correctly
  - Use explicit null/undefined check instead of truthy check

### 🎨 UI/UX Improvements

#### Added
- **Enhanced RAL Color Display**
  - Added RAL color names mapping for 200+ colors (e.g., '7015' → 'Slate Grey')
  - Display color name below RAL number in italic text
  - Color preview box shows actual RAL color (12x12 rounded square)
  - Tooltip shows both RAL number and color name
  - Improved visual hierarchy with flex-col layout

- **Painting System Total Microns**
  - Automatic calculation of total microns from all coating layers
  - Blue-highlighted row showing sum of all coat microns
  - Format: "Total Microns: 218 μm"
  - Only displays when coats are defined and total > 0

#### Changed
- **Technical Specifications Section**
  - Set to expand by default for better visibility
  - Removed duplicate "Contractual Tonnage" field (already in dashboard)
  - Removed duplicate "3rd Party Required" field below welding specs

- **Project Dashboard Navigation**
  - Made Tasks card clickable to navigate to tasks page
  - Links to `/tasks?project={projectId}` with automatic filtering
  - Added hover effect and cursor pointer for better UX

---

## [13.4.4] - 2026-02-01

### 🎨 UI/UX Improvements

#### Added
- **Table Header Styling**
  - Sticky table headers across all tables in the system
  - Distinct background color (slate-100/slate-800) for headers to differentiate from records
  - Headers remain visible when scrolling through long tables
  - Improved visual hierarchy and data readability

- **Production Daily Report (PDR) Table**
  - Added comprehensive daily production breakdown at bottom of production dashboard
  - Shows when project is selected with data by process type
  - Includes all processes: Cutting, Fit-up, Welding, Visualization, Sandblasting, Galvanization, Painting, Dispatch columns
  - Color-coded headers for easy process identification

#### Changed
- **Global Table Styling**
  - Applied consistent header styling system-wide
  - Enhanced contrast between headers and data rows
  - Better user experience for data-heavy pages

- **Project Workflow Phase Update**
  - Updated workflow sequence in project wizard and planning:
    - Design → **Detailing (Shop Drawings)** → Procurement → **Production** → Coating → **Dispatch & Delivery** → Erection → Handover
  - Renamed "Shop Drawing" to "Detailing (Shop Drawings)" for clarity
  - Renamed "Fabrication" to "Production" for consistency
  - Updated work unit dependencies to include new Detailing phase
  - Applied to project planning, work units, and risk register workflows

- **New Project Wizard Page**
  - Added dedicated page for project-specific requirements
  - **Cranes Configuration**: Option to include/exclude cranes for installation with question "Cranes for Installation?"
  - **Surveyor Scope**: Toggle to determine if surveying is within project scope
  - **3rd Party Testing**: Configuration for third-party testing requirements
  - **Responsibility Assignment**: Option to assign third-party responsibility ("our" or "customer")
  - Improved project setup with all critical requirements in one place

---

## [13.4.3] - 2026-01-31

### 🎨 UI/UX Improvements & System Enhancements

#### Added
- **Success Dialog Component**
  - Created reusable SuccessDialog component with modern design
  - Green checkmark icon and Cancel/OK buttons
  - Replaces browser alerts throughout the system
  - Updated project wizard to use success dialog

- **Centralized Formatting Utilities**
  - Created `src/lib/format.ts` for consistent formatting
  - Prepared for system settings integration

#### Changed
- **Date Validation**
  - Prevent end date before start date in wizard scope schedules
  - Shows alert if user tries to set invalid date range
  - Duration calculation returns 0 for invalid ranges

- **Cranes Question Update**
  - Only shows when Erection scope is selected
  - Changed wording: 'Cranes for Installation?'
  - Description: 'Will mobile cranes or overhead cranes be required for site installation?'

- **Currency Format (SAR)**
  - Changed from USD ($) to Saudi Riyal (﷼)
  - Format: '1,234.56 ﷼'
  - Updated across: project-details, projects-client, initiative-detail, initiatives-dashboard-client

- **Date Format (DD-MM-YYYY)**
  - Changed from DD/MM/YYYY to DD-MM-YYYY
  - Updated across all key components

---

## [13.4.2] - 2026-01-28

### 🚀 Navigation & System Stability Enhancements

#### Added
- **Project Navigation Controls**
  - Added back/forward navigation arrows to project detail pages
  - Navigate seamlessly between projects without returning to list
  - Back to list button for quick return to projects overview
  - Visual separator between navigation controls
  - Disabled state for arrows when at first/last project
  - Navigation based on project creation order

#### Fixed
- **PM2 Stability Improvements**
  - Increased memory limit from 1G to 2G to prevent crashes
  - Added exponential backoff for restart delays
  - Increased listen timeout from 10s to 30s
  - Increased kill timeout from 5s to 10s
  - Enhanced graceful shutdown handling
  - Improved auto-restart configuration (15 max restarts, 30s min uptime)
  - Added NODE_OPTIONS for better memory management
  - Fixed 502 Bad Gateway errors caused by PM2 crashes

#### Changed
- Updated PM2 configuration for better production stability
- Enhanced error recovery mechanisms

---

## [13.3.3] - 2026-01-07

### 🔧 System Improvements & UI Enhancements

#### Added
- **Production Activities Progress Table**
  - Replaced Recent Production Logs with comprehensive daily progress table
  - Shows weight and quantity by process type (Preparation, Fit-up, Welding, Visualization, Sandblasting, Galvanization, Painting)
  - Daily average row for quick insights
  - Color-coded rows for better readability

- **About OTS Page**
  - New system overview page at Settings > About OTS
  - Lists all 15+ integrated modules with descriptions
  - Technical stack information
  - System statistics and capabilities

- **Simplified Import Fields**
  - Streamlined production log import to essential fields only
  - Part Designation, Process Type, Date Processed, Processed Qty, Processing Team, Processing Location

#### Fixed
- **Session Management**
  - Fixed signout not properly ending session
  - Added visibility change detection to re-validate session on back button
  - Added pageshow event handler for bfcache restoration
  - Users now properly redirected to login after logout

- **Responsive Sidebar**
  - Updated all 33 layout files to use ResponsiveLayout component
  - Fixed "useSidebar must be used within SidebarProvider" errors
  - Consistent sidebar behavior across all pages

#### Changed
- Updated system version to 13.3.3
- Import modal now shows only 6 essential fields instead of 12

---

## [13.3.2] - 2026-01-07

### 🏭 Production Module Enhancements & Responsive UI

#### Added
- **Multi-Project Import Support**
  - Import production logs without selecting a project first
  - Parts are automatically matched by designation across all projects
  - Single CSV/Excel file can contain entries for multiple projects

- **Production Plan Report Improvements**
  - Report now correctly filters buildings by fabrication schedule within selected month
  - Only shows projects with fabrication activities overlapping the selected period

- **Page Size Selector**
  - Added page size dropdown (50, 100, 200, 500, 1000) for Production Logs page
  - Added page size dropdown for Assembly Parts page
  - Persistent pagination preferences

- **Download Template Button**
  - Added template download button for production log imports
  - Template includes sample data and all required columns

- **Monthly Target on Production Dashboard**
  - New Monthly Target card showing current month's production quota
  - Aggregates raw data from buildings with fabrication schedules in current month
  - Displays target tonnage based on project planning

- **Production Logs in Dashboard**
  - Added recent production logs section at bottom of production dashboard
  - Shows logs for selected project with process type badges

- **Responsive Sidebar Layout**
  - Pages now expand when sidebar is collapsed
  - Better utilization of screen space
  - Smooth transition animations

#### Fixed
- Fixed Production Plan report showing wrong projects for selected month
- Fixed production logs filter bug where logs disappeared when selecting a project
- Fixed Completion by Process stats to show entire project statistics, not just current page
- Fixed useEffect dependency issues causing stale data on filter changes

#### Changed
- Import modal no longer requires project selection upfront
- Improved API to return total stats for entire filtered dataset
- Updated sidebar version to 13.3.2

---

## [13.2.1] - 2026-01-07

### 🔧 Fixing Changelog Versioning System

#### Added
- Created accurate changelog based on actual development timeline
- Separated modules by their actual development phases
- Each major module gets its own major version number
- Included all incremental updates and patches

#### Fixed
- Fixed changelog version numbering inconsistencies
- Corrected module development dates based on actual code artifacts
- Aligned version numbers with module importance and development phases

#### Changed
- Restructured changelog to reflect true development history
- Updated version numbering scheme to be more meaningful

---

## [13.2.0] - 2026-01-07

### 🔧 Logout Session Handling Fix

#### Added
- Enhanced cookie deletion with domain-specific settings for hexasteel.sa
- Implemented client-side logout with full page redirect to prevent cached sessions
- Updated both UserMenu and Sidebar logout buttons to use fetch API with forced redirect
- Ensured logout redirects to ots.hexasteel.sa/login in production environment

#### Fixed
- Fixed logout session handling to properly end sessions in production
- Replaced form-based logout with fetch API for better session control
- Added window.location.href redirect to bypass Next.js router cache
- Prevented redirect back to dashboard after logout

#### Changed
- Updated logout mechanism to use fetch API instead of form submission
- Added domain-specific cookie deletion for production environment

---

## [13.1.1] - 2026-01-07

### 🔧 Version Consistency & Logout Fixes

#### Added
- Created comprehensive version synchronization across all components
- Updated package.json to match UI version displays
- Fixed login page OTS version display
- Updated settings/version page with correct version numbers

#### Fixed
- Fixed logout redirect to use ots.hexasteel.sa/login in production
- Synchronized package.json version
- Fixed login page version display
- Fixed settings/version page
- Ensured all version displays are consistent

#### Changed
- Updated changelog to reflect version consistency improvements
- Standardized version update process for future releases

---

## [13.1.0] - 2026-01-06

### 🎯 QC Dashboard & Process Management Updates

#### Added
- **RFI Process & Inspection Management**
  - Updated process types to include Fit-up, Welding, Visualization, Painting, Assembly, Inspection
  - Inspection types now dynamically update based on selected process type
  - Process-specific inspection types (e.g., NDT for Welding, Coating for Visualization)
  - Automatic inspection type reset when process changes

- **Create RFI/NCR Pages**
  - New dedicated page for creating RFIs at /qc/rfi/new
  - Multi-select production logs for batch RFI creation
  - New dedicated page for creating NCRs at /qc/ncr/new
  - Severity level selection: Critical, High, Medium, Low

- **Work Order & Task Management**
  - Work Order Production Progress tracking
  - CEO role now sees ALL tasks across all projects and users
  - New TaskAuditLog model for tracking all task changes
  - Task completion tracking with visual progress indicators

- **Tasks Counter Enhancement**
  - Redesigned tasks counter to match project summary widget style
  - Added real-time status breakdown with colored indicators
  - Shows counts for Pending, In Progress, Waiting for Approval, and Completed tasks
  - Visual separation with gradient background and border
  - Total tasks count with filtered context display

- **Colorized Filter Buttons**
  - Status filters: Pending (yellow), In Progress (blue), Waiting for Approval (purple), Completed (green)
  - Priority filters: High (red), Medium (orange), Low (gray)
  - Hover states with matching color themes
  - Improved visual feedback for active filters

- **Private Task Feature**
  - Auto-mark tasks as private when user assigns to themselves
  - Manual private task checkbox in full task form
  - Private tasks only visible to creator and assignee
  - Lock icon indicator for private tasks in table and grid views
  - API-level permission enforcement for private task access

#### Fixed
- Fixed QC dashboard error: "Cannot read properties of undefined (reading assemblyPart)"
- Updated QC dashboard to handle productionLogs array structure
- Fixed NCR recent items to access production logs through rfiRequest relationship
- Fixed QC dashboard layout orientation to match system-wide layout pattern
- Optimized QC dashboard width utilization with proper layout structure

#### Changed
- Updated QC dashboard layout to use lg:pl-64 pattern for better width utilization
- Standardized QC page structure to match production page layout
- Improved error handling for missing production log data

---

## [13.0.1] - 2025-12-28

### 📋 Enterprise Audit Trail System

#### Added
- **Enterprise Audit Trail System**
  - Automatic audit logging for all CRUD operations on critical entities
  - Field-level change tracking with before/after values
  - User context and request tracing for all operations
  - Audit logging integrated into Projects, Tasks, Buildings, Assembly Parts, Production Logs
  - Login/Logout event tracking
  - System event logging for bulk operations
  - API utility helpers: logActivity(), logAuditEvent(), logSystemEvent()

- **Dolibarr-Style Event Management**
  - Redesigned /events page with professional table layout
  - Proper date and time display in separate columns (MM/DD/YYYY, HH:MM:SS AM/PM)
  - Event reference numbers with icons
  - Owner/user tracking for each event
  - Category badges (production, auth, record, QC, etc.)
  - Entity type and project association display
  - Enhanced filtering by category and event type
  - Improved pagination with total counts

- **Bulk Operation Logging**
  - Bulk assembly part import logging
  - Mass production logging event tracking
  - Individual production log create/delete logging
  - Success/failure count tracking for bulk operations
  - Process type aggregation for mass operations

- **Governance Center Documentation**
  - Comprehensive Governance Center Guide (docs/GOVERNANCE_CENTER_GUIDE.md)
  - Quick Reference Guide (docs/GOVERNANCE_QUICK_GUIDE.md)
  - Audit trail usage documentation
  - Data recovery procedures
  - Version history explanation
  - Best practices for governance
  - Troubleshooting guide
  - Permission matrix documentation

---

## [13.0.0] - 2025-12-23

### 📚 Knowledge Center Module

Major update introducing comprehensive knowledge management capabilities.

#### Added
- **Knowledge Center**
  - Centralized knowledge management system
  - Best practices documentation and sharing
  - Lessons learned from completed projects
  - Technical documentation repository
  - Search and filter capabilities
  - Knowledge categorization and tagging

- **Knowledge Application**
  - Link knowledge entries to specific projects
  - Track knowledge application and effectiveness
  - Knowledge reuse metrics and analytics

---

## [12.0.0] - 2025-12-21

### 📋 Product Backlog Module

Major update introducing product backlog management and CEO control center.

#### Added
- **Product Backlog**
  - Comprehensive backlog management system
  - Feature request tracking and prioritization
  - User story management
  - Sprint planning capabilities
  - Backlog grooming and refinement tools

- **CEO Control Center**
  - Executive dashboard for high-level overview
  - Strategic decision support tools
  - Cross-project visibility and analytics
  - Key metrics and KPI tracking

---

## [12.1.0] - 2025-12-21

### ✅ Tasks Interface Enhancements

#### Added
- **Tasks Interface Enhancements**
  - Building selection in task creation (inline and full form)
  - Building column added to tasks table
  - Project-building dependency: buildings filter by selected project
  - Default task status changed to "In Progress"
  - Default status filter set to "In Progress"
  - Automatic department lookup when selecting user
  - Department auto-populates based on assigned user
  - Building dropdown disabled until project selected
  - Building selection resets when project changes

---

## [11.0.0] - 2025-12-18

### 🛡️ System Events & Governance Framework

Major update introducing comprehensive governance framework and system events management.

#### Added
- **Governance Framework**
  - System events management and tracking
  - Configurable governance rules engine
  - Automated policy enforcement mechanisms
  - Real-time compliance monitoring
  - Audit logging for all system activities

- **Policy Management**
  - Centralized policy configuration interface
  - Role-based policy enforcement
  - Automated compliance checks and validations
  - Policy violation detection and alerting
  - Comprehensive audit trail for governance

---

## [10.0.0] - 2025-12-18

### 🔄 PTS Sync Module

Major update introducing PTS data synchronization capabilities.

#### Added
- **PTS Sync Integration**
  - PTS data synchronization system
  - Automated data import from external systems
  - Real-time sync status monitoring
  - Data validation and cleansing
  - Sync error reporting and recovery

---

## [10.1.0] - 2025-12-18

### 🔄 PTS Sync Enhancements

#### Added
- **PTS Sync Enhancements**
  - Show skipped/corrupted items that were not synced
  - Display reason for each skipped item (missing data, invalid format)
  - Rollback option per project - delete all PTS-synced data
  - Completion percentage per synced project
  - Project stats showing synced parts/logs vs total
  - Confirmation dialog before rollback with warning

- **PTS Sync Field Mapping Wizard**
  - New 3-step wizard flow: Map Raw Data → Map Logs → Execute Sync
  - Visual column mapping UI showing Google Sheets headers with sample data
  - Map OTS database fields to any Google Sheets column
  - Required field validation before proceeding
  - Default mappings pre-configured for standard PTS format
  - Mappings saved locally for reuse

- **Production Logs Sync Improvements**
  - Only fetches required fields from Google Sheets: Part#, Process, Processed Qty, Process Date, Process Location, Processed By, Report No.
  - Project, building, weight, and part name are now read from existing assembly parts (not Google Sheets)
  - Only syncs logs that have matching assembly parts in OTS
  - Shows list of skipped items (logs without matching assembly parts) after sync
  - Shows list of successfully synced items with details (Part#, Process, Project, Building, Action)
  - Reduced field mapping UI to only show relevant fields

- **Streamlined PTS Sync**
  - Simplified PTS Sync page with sidebar navigation
  - Two-phase sync: Assembly Parts first, then Production Logs
  - Selective sync: Choose which projects and buildings to sync
  - Select All / Select None buttons for quick selection
  - Stop Sync button to abort long-running syncs
  - Live progress indicators showing created/updated/errors counts
  - Pre-sync validation showing matched vs unmatched projects/buildings

- **Assembly Parts & Logs Pagination**
  - Pagination for Assembly Parts page (100 items per page)
  - Pagination for Production Logs page (100 items per page)
  - Server-side search across all pages (not just current page)
  - Faster page loads for large datasets (20K+ records)

- **PTS/OTS Source Indicators**
  - Assembly Parts page shows source badge (PTS Imported / OTS Added)
  - Production Logs page shows source badge for PTS imported logs
  - Visual distinction between externally synced and manually added data

#### Fixed
- Fixed SidebarProvider import error on PTS Sync page
- PTS Sync page now uses layout-based sidebar (consistent with other pages)
- Fixed PTS-imported items showing as OTS source instead of PTS
- Fixed missing weight and area fields during PTS sync
- Updated 4581 existing assembly parts to correct PTS source

#### Changed
- Items without building designation are now skipped during sync
- Sync results now include detailed project-level statistics
- PTS sync now properly sets source=PTS and includes all weight/area fields
- PTS Sync page now has separate buttons for Assembly Parts and Production Logs
- Added "Import Logs from PTS" button on Production Log page for quick access

---

## [9.0.0] - 2025-12-17

### ⚡ Early Warning System & Risk Intelligence

Major update introducing predictive risk detection and comprehensive risk management capabilities.

#### Added
- **Early Warning System**
  - Predictive risk detection algorithms
  - Advanced dependency management system
  - Real-time capacity planning tools
  - Comprehensive risk dashboard
  - Automated risk mitigation strategies

- **Risk Intelligence**
  - AI-powered risk analysis and prediction
  - Dynamic risk scoring and prioritization
  - Historical risk pattern recognition
  - Proactive risk alerting system
  - Risk mitigation recommendation engine

---

## [9.1.0] - 2025-12-17

### 📅 Project Planning Enhancements

#### Added
- **Project Planning Enhancements**
  - Multi-select capability for bulk schedule deletion
  - Inline editing of existing schedules (start/end dates)
  - Select all/deselect all functionality
  - Visual feedback for selected rows
  - Edit mode with save/cancel actions

#### Fixed
- Early Warning System now uses actual production log data for progress
- Fabrication progress calculated from assembly part weights
- Operations Control sidebar emoji characters removed
- WorkUnit sync status mapping improved

#### Changed
- Leading indicators service uses production logs for accurate progress
- Schedule editing now supports inline date changes

---

## [8.0.0] - 2025-12-15

### 🎯 Operations Control System

Major update introducing centralized operations monitoring and control.

#### Added
- **Operations Control Center**
  - Centralized operations monitoring
  - Real-time work unit tracking
  - At-risk work units identification
  - Resource allocation optimization
  - Operations dashboard and analytics

---

## [8.1.0] - 2025-12-17

### 🎯 Operations Intelligence Dashboard

#### Added
- **Dependency Blueprint System**
  - Template-based automatic dependency creation
  - Blueprint matching by project structure type (PEB, Heavy Steel, etc.)
  - Default blueprint fallback for unmatched projects
  - Pre-seeded blueprints: Standard Steel Fabrication, PEB Project, Heavy Steel Structure
  - Workflow: DESIGN → PROCUREMENT → PRODUCTION → QC → DOCUMENTATION
  - Support for FS (Finish-to-Start), SS (Start-to-Start), FF (Finish-to-Finish) dependencies
  - Configurable lag days per dependency step

- **Load Estimation Rules**
  - Smart quantity estimation based on work type and context
  - Design tasks: Keyword-based drawing count (shop drawing=10, detail=8, connection=6)
  - Production: Weight from WorkOrder automatically populated
  - QC: 1 inspection per RFI
  - Documentation: 1 document per submission
  - All WorkUnits now have quantity for capacity calculation

- **Capacity Auto-Consumption**
  - ResourceCapacityService automatically pulls load from WorkUnits
  - Early Warning Engine detects overloads based on actual work data
  - No manual capacity entry required per WorkUnit
  - Real-time capacity utilization tracking

- **Operations Intelligence Dashboard**
  - Unified view of WorkUnits, Dependencies, and Capacity
  - System-wide view with project and building filters
  - Three layout modes: Table, Network Graph, Split View
  - Interactive dependency network visualization
  - Real-time capacity utilization per resource type
  - Create WorkUnit button with live impact preview
  - Shows blocking dependencies and capacity impact before creation
  - Click any WorkUnit to see its dependencies and capacity impact

#### Changed
- WorkUnitSyncService now uses blueprint-based dependency creation
- Legacy dependency logic retained as fallback when no blueprint exists
- Task sync now includes title for load estimation context

---

## [7.4.0] - 2025-12-14

### 📊 Planning Activities Widget

#### Added
- **Planning Activities Widget**
  - New Planning Activities widget in Project Dashboard
  - Shows all scope schedules (Design, Shop Drawing, Fabrication, Galvanization, Painting)
  - Real-time progress calculation based on actual production data
  - Overall project progress with status breakdown (Completed, On Track, At Risk, Critical)
  - Expandable building-level details for each activity type
  - Visual progress bars and status indicators

---

## [7.3.0] - 2025-12-14

### 📈 Dashboard Improvements

#### Added
- **Dashboard Enhancements**
  - New Work Orders widget showing pending, in-progress, completed, and overdue counts
  - Widget remove functionality - hover over widget to see remove button
  - Improved mobile-responsive grid layout for dashboard widgets
  - Collapsed sidebar now shows all module icons (not just 3)

---

## [7.2.0] - 2025-12-14

### 🎨 Login Page Branding

#### Added
- **Login Page Improvements**
  - Dolibarr-style login page with white card on dark (#2c3e50) background
  - Logo displayed inside white card for better visibility
  - Configurable login logo via Settings → Company → Login Page Logo
  - Fallback to "HEXA STEEL® - THRIVE DIFFERENT" text if no logo uploaded
  - Motivational footer with slogan: Hexa Steel® — "Forward Thinking"
  - Version header showing current system version

---

## [7.1.0] - 2025-12-14

### 🤖 AI Summary Enhancements

#### Added
- **AI Summary Improvements**
  - Colorized and structured AI summary display
  - Automatic detection of urgent items (red highlighting)
  - Warning items highlighted in orange
  - Info items displayed in blue
  - Section headers with visual separation
  - Improved readability with icons and borders

---

## [7.0.0] - 2025-12-14

### 📋 Work Orders Module

Major update introducing work orders management and notification system restructure.

#### Added
- **Work Orders Module**
  - New Work Orders page under Production module
  - Create, view, and manage production work orders
  - Work order status tracking and assignment
  - Integration with production planning workflow

- **User Preferences Menu**
  - New user dropdown menu accessible from sidebar
  - Quick access to profile settings
  - Change password functionality with secure validation
  - Direct links to notifications and settings
  - One-click sign out option

- **Notification Center Restructure**
  - Notifications now a collapsible menu in sidebar
  - Quick access sub-items: Delayed Tasks, Approvals, Deadlines
  - URL-based tab navigation for direct linking
  - Total badge count displayed on Notifications section header
  - Per-item sidebar badges for: All Notifications (unread), Delayed Tasks, Deadlines

---

## [6.0.0] - 2025-12-08

### 🔔 Notification Center

Major update introducing comprehensive notification system with AI-powered summaries.

#### Added
- **Notification System**
  - Real-time notification system for tasks, approvals, and deadlines
  - Notification bell with unread count badge
  - Dropdown notification panel with 5 tabs
  - Full-page notification center at /notifications
  - AI-powered notification summaries using OpenAI GPT-4
  - Automatic deadline scanner (runs daily at 8:00 AM)
  - 6 notification types: Task Assigned, Approval Required, Deadline Warning, Approved, Rejected, System

- **Database Changes**
  - New notifications table with indexes
  - New NotificationType enum
  - Foreign key relationship to users table

---

## [5.0.0] - 2025-11-25

### 📊 Business Planning Module

Major update introducing comprehensive business planning and strategic management capabilities.

#### Added
- **Business Planning Module**
  - OKR (Objectives and Key Results) system
  - Balanced Scorecard KPIs tracking
  - Annual plans and initiatives management
  - SWOT analysis framework
  - Strategic goal alignment tools
  - Performance metrics and dashboards

---

## [4.0.0] - 2025-10-25

### 🤖 AI Assistant

Major update introducing AI-powered assistant for operations management.

#### Added
- **AI Assistant**
  - Context-aware AI assistant for operations
  - OpenAI GPT-4 integration
  - Natural language processing for task management
  - Conversation history and context retention
  - Smart recommendations based on historical data

---

## [3.1.0] - 2025-10-21

### 📐 Engineering Module

#### Added
- **Engineering Module**
  - ITP (Inspection and Test Plan) management
  - WPS (Welding Procedure Specification) management
  - Document management system
  - Approval workflows
  - Engineering document timeline
  - Revision control

---

## [3.0.0] - 2025-10-18

### ✅ Quality Control Module

Major update introducing comprehensive quality control and inspection management.

#### Added
- **Quality Control Module**
  - RFI (Request for Inspection) system
  - NCR (Non-Conformance Report) management
  - Material inspection tracking
  - Welding inspection management
  - Dimensional inspection records
  - NDT (Non-Destructive Testing) inspection
  - QC status tracking and reporting

---

## [2.0.0] - 2025-10-13

### 🏭 Production Module

Major update introducing production tracking and management capabilities.

#### Added
- **Production Module**
  - Assembly part tracking and management
  - Production log system
  - Mass production logging
  - Processing teams and locations
  - Production status tracking
  - Work order management

---

## [1.0.0] - 2025-10-09

### 🚀 Initial Release - Core System

Initial release of the Hexa Steel Operation Tracking System with foundational features.

#### Added
- **Core System**
  - Project management with multi-building support
  - Client management and relationship tracking
  - User management with Role-Based Access Control (RBAC)
  - Department management and organizational structure
  - Task management system with assignment and tracking

- **Foundation Features**
  - Comprehensive dashboard with real-time analytics
  - Secure authentication and session management
  - Responsive design for all device types
  - Audit logging and activity tracking
  - Permission system with role-based access

- **Project Features**
  - Multi-building project support
  - Project timeline and milestones
  - Payment milestone tracking
  - Project status management
  - Client assignment and tracking