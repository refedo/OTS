# Hexa Steel® Operations Tracking System (OTS™)

**Version:** 16.4.1 | **Release Date:** March 26, 2026

A comprehensive Enterprise Resource Planning (ERP) system specifically designed for steel fabrication and construction projects. Built with Next.js 15, TypeScript, Prisma 6, and MySQL 8.



---

## Features

### Project Management
- **Project Wizard**: Step-by-step project creation with buildings, schedules, coating systems, and payment terms
- **Project Dashboard**: Real-time project status, progress tracking, and milestone management
- **Scope of Work**: Configurable project phases (Design, Shop Drawing, Procurement, Fabrication, Coating, Delivery, Erection)
- **Buildings Management**: Multi-building support with individual tracking
- **Payment Terms**: Flexible payment schedule configuration
- **Detailed Project Planner**: MS Project-style interactive scheduling with dependency tracking

### Document Control
- **Document Timeline**: Track all project documentation with version control
- **Document Types**: Architectural, Structural, Shop Drawings, Fabrication, Erection, As-Built, Quality Documents
- **Status Workflow**: Submission → Review → Approval with client response tracking
- **Revision Management**: Complete version history and audit trail
- **Client Responses**: Approved, Approved with Comments, Rejected, Resubmit

### Production Management
- **Production Dashboard**: Real-time monitoring and analytics
- **Production Logs**: Track Preparation, Fit-up, Welding, Visualization, Sandblasting, Painting, Galvanization, Dispatch
- **Assembly Parts**: Complete parts management with BOM integration
- **Work Orders & Work Units**: Granular work tracking with unit-level progress
- **Mass Logging**: Bulk production entry for efficiency
- **Tonnage Tracking**: Weight-based progress monitoring

### Quality Control & Inspections
- **Material Inspections**: Incoming material quality tracking
- **Welding Inspections**: Weld quality and procedure compliance (WPS)
- **Dimensional Inspections**: Tolerance and geometry verification
- **NDT Inspections**: Non-destructive testing records
- **ITP Management**: Inspection and Test Plan control

### Operations & Timeline
- **Operations Dashboard**: Project-wide analytics and KPIs
- **Timeline Visualization**: Interactive project timeline with milestones
- **Stage Tracking**: 11 standard operational stages
- **Automatic Event Capture**: Integration with Document Control, Production, Procurement
- **SLA Monitoring**: Delayed stage detection and alerts
- **Operations Intelligence**: Advanced analytics and trend analysis

### Financial Management
- **Chart of Accounts**: Full double-entry bookkeeping support
- **Journal Entries**: Manual and automated journal entry recording
- **Bank Account Management**: Multi-account tracking and reconciliation
- **Financial Reports**: Balance Sheet, Income Statement, Cash Flow Statement
- **Invoice Management**: Client invoicing and payment tracking
- **Account Mapping**: Map Dolibarr accounting account codes to OTS cost categories
- **Product Categories**: Define named product categories that carry a cost classification and an optional Chart-of-Accounts account code (bilingual EN/AR support)
- **Product Category Mapping**: Map each Dolibarr `product_ref` to a category so every invoice line is classified accurately; unmapped products surfaced for quick resolution
- **Supplier Classification**: Assign a default cost category to each supplier — used as a fallback when no account or product mapping exists
- **4-Level Classification Hierarchy**: Account Mapping → Product Category → Supplier Classification → Other/Unclassified, applied across all cost structure and expenses reports

### Procurement
- **Purchase Orders**: Complete PO lifecycle management
- **Supplier Management**: Vendor tracking and performance
- **Material Tracking**: Inventory and material status
- **Dolibarr ERP Integration**: Bi-directional sync with Dolibarr (products, POs, reference data)
- **Procurement Timeline**: Integration with operations timeline

### Supply Chain Management (v16.2.0)
- **LCR (Least Cost Routing)**: Automated procurement tracking with Google Sheets integration
- **Google Sheets Sync**: Real-time sync with MD5 hash change detection and intelligent upserts
- **Alias Resolution**: Auto-resolve project/building/supplier names from informal sheet text; fetches all Dolibarr suppliers via auto-pagination
- **Procurement Analytics**: 4 comprehensive reports (Status, Spend vs Target, Supplier Performance, Overdue Items)
- **Data Table**: Compact single-row header with filters (project, status, date range, search) — no overlap on any viewport
- **LCR Comparison**: Side-by-side comparison of LCR1, LCR2, LCR3 quotes with price/ton analysis
- **Sync Scheduler**: Automated cron job with configurable intervals (default 30 min)
- **Alias Management**: Admin interface for mapping informal names to OTS entities with auto back-fill
- **Overdue Tracking**: Automatic detection and highlighting of items past needed-by date
- **Purchase Orders**: Dolibarr purchase orders listed in OTS with status, supplier, project, and financial totals
- **AP Aging Report**: Direct link to Accounts Payable aging, pre-selected via URL param
- **Statement of Account**: Direct link from Supply Chain sidebar
- **12 API Endpoints**: Complete REST API for sync, CRUD, alias management, and reporting

### Planning & Scheduling
- **Scope Schedules**: Timeline planning per scope of work
- **Building-Level Scheduling**: Individual building timelines
- **Resource Capacity Planning**: Team workload and capacity management
- **Month & Scope Filters**: Advanced filtering capabilities

### Business Planning & Governance
- **Strategic Objectives**: OKR-style objective and key result tracking
- **KPI Management**: Define, monitor, and report KPIs with Balanced Scorecard support
- **SWOT Analysis**: Structured strategic analysis
- **Department Plans**: Department-level strategic planning
- **Governance & Compliance**: Policy adherence and audit controls
- **CEO Control Center**: Executive dashboard with consolidated metrics

### Risk Management
- **Risk Events**: Log and track project and operational risks
- **Early Warning Engine**: Automated risk pattern detection
- **Leading Indicators**: Predictive metrics for proactive management
- **Knowledge Center**: Historical risk patterns and lessons learned

### Initiatives & Tasks
- **Strategic Initiatives**: Company-wide initiative management
- **Milestone Tracking**: Initiative milestones with progress monitoring
- **Task Management**: Detailed task tracking, assignment, and requester filtering
- **Task Attachments**: Upload images and documents to tasks in both full and quick-add modes (up to 10 per task, 10 MB each); automatic server-side image compression via Sharp
- **Requested by Me**: Filter tasks where the current user is the requester
- **Delayed Tasks Alerts**: Dashboard widget and login notification with clickable task links
- **Budget Tracking**: Financial monitoring and analysis

### AI & Automation
- **AI Assistant**: GPT-powered conversational interface for project queries
- **Google Sheets Sync**: Automated data export and synchronization
- **PTS Sync**: External project tracking system integration
- **Scheduled Jobs**: Automated cron-based background processing
- **Notifications**: Real-time in-app user notifications with actionable dropdown (complete, approve, reject inline)
- **Global TopBar**: Persistent notification bell and logout button visible on every page

### Mobile App & Push Notifications (PWA)
- **Progressive Web App**: Installable on mobile devices via browser — no app store needed
- **Web Push Notifications**: Real-time push notifications delivered to mobile/desktop even when the app is closed; backlog item creators are notified on any status change
- **Per-Type Notification Preferences**: Users can toggle push and in-app notifications individually for each type (Task Assigned, Approval Required, Deadline Warning, etc.)
- **Auto Service Worker Registration**: Background push handling, notification click navigation, and auto-cleanup of stale subscriptions
- **PWA Install Prompt**: Smart install banner for mobile users
- **Capacitor-Ready**: Architecture supports wrapping with Capacitor for future app store distribution

### User Management
- **Role-Based Access Control**: Admin, Manager, Employee roles
- **Department Management**: Organizational structure support
- **Authentication**: Secure session-based authentication (JWT cookies)
- **Activity Tracking**: Full user action audit trail
- **Password Management**: Self-service password reset and change

### Global Search
- **Global Search Bar**: Persistent search icon (🔍) in the top-right navigation bar, visible on every authenticated page; click or press **Ctrl+K** to open
- **Cross-entity Search**: A single query simultaneously searches Tasks, Projects, Initiatives, Weekly Issues, Backlog Items, NCRs, RFIs, and Assembly Marks via parallel Prisma queries
- **Categorized Results**: Results grouped by entity type with color-coded icons and status badges (green=active, grey=completed, red=overdue)
- **Keyboard Navigation**: ↑↓ arrows to move between results, Enter to open, Esc to close
- **Fast & Debounced**: 300 ms debounce with a 2-character minimum; up to 5 results per category returned instantly

### System Administration & Backup
- **Backup Management UI**: View, create, download, and delete database backup files from `/settings/backups` — no server console access needed
- **Backup Stats**: Real-time stats for total backup count, total backup size, and server disk free space
- **Automated Retention**: Automatically prunes to the most recent 7 backups on each create
- **RBAC/PBAC Protected**: Dedicated `backups.*` permissions (view/create/delete/download) and a `backup_management` PBAC module for granular access control per role/user

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15.5.4 (App Router, Turbopack) |
| Language | TypeScript 5 (strict mode) |
| Runtime | React 19.1.0 |
| Database | MySQL 8 + Prisma 6.17.0 ORM |
| UI Components | shadcn/ui + Radix UI |
| Styling | Tailwind CSS 4 |
| Validation | Zod 3.23.8 |
| Forms | React Hook Form 7.64.0 |
| Charts | Recharts 3.3.0 |
| Icons | Lucide React |
| Logging | Pino (structured JSON logging) |
| Auth | JWT (jsonwebtoken 9) + bcryptjs 3 |
| AI | OpenAI SDK 4.73.0 |
| PDF Generation | jsPDF + jspdf-autotable |
| Document Processing | Puppeteer 24.32.1 |
| Spreadsheet | xlsx 0.18.5 |
| Drag & Drop | @dnd-kit/core + sortable |
| Google Integration | googleapis 169.0.0 |
| Scheduler | node-cron 4.2.1 |
| Date Handling | date-fns |
| Push Notifications | web-push (VAPID) |

---

## Prerequisites

- Node.js 18+
- MySQL 8.0+
- npm

---

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/refedo/OTS.git
cd OTS
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

```env
# Database (required)
DATABASE_URL="mysql://user:password@localhost:3306/ots_db"

# Authentication (required)
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
COOKIE_NAME="ots_session"             # default: ots_session
LOG_LEVEL="debug"                     # debug | info | warn | error

# Subpath deployment (optional)
NEXT_PUBLIC_BASE_PATH=""              # e.g. /ots for hexasteel.sa/ots

# AI Assistant (optional)
OPENAI_API_KEY="sk-..."

# Google Sheets Sync (optional)
GOOGLE_SHEETS_CREDENTIALS='{...}'    # Service account JSON

# Dolibarr ERP Integration (optional)
DOLIBARR_API_URL="https://your-dolibarr.com/api/index.php"
DOLIBARR_API_KEY="your-dolibarr-api-key"
DOLIBARR_API_TIMEOUT="10000"
DOLIBARR_API_RETRIES="3"

# Background Jobs (optional)
CRON_SECRET="your-cron-secret"
ENABLE_RISK_SCHEDULER="false"        # true in production to enable automated risk detection

# Backup Management (optional)
BACKUP_DIR="/var/backups/hexa-steel-ots"  # Override default backup directory path

# Push Notifications (optional — required for mobile push)
VAPID_PUBLIC_KEY=""                  # Generate with: node scripts/generate-vapid-keys.mjs
VAPID_PRIVATE_KEY=""
VAPID_SUBJECT="mailto:admin@hexasteel.sa"
```

### 4. Database Setup

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# (Optional) Seed the database with initial data
npm run db:seed
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 6. Default Login

```
Email:    admin@hexasteel.com
Password: admin123
```

> **Warning:** Change default credentials immediately in production.

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/                   # Login, register, password reset
│   ├── api/                      # 30+ REST API route handlers
│   │   ├── auth/                 # Authentication & session
│   │   ├── projects/             # Project CRUD & analytics
│   │   ├── documents/            # Document control
│   │   ├── production/           # Production logs & reports
│   │   ├── qc/                   # Quality control inspections
│   │   ├── financial/            # Accounting & financial reports
│   │   ├── business-planning/    # OKRs, KPIs, initiatives
│   │   ├── governance/           # Governance & compliance
│   │   ├── dolibarr/             # Dolibarr ERP integration
│   │   ├── ai-assistant/         # AI chat endpoint
│   │   ├── risk-events/          # Risk management
│   │   ├── notifications/        # User notifications
│   │   └── ...
│   ├── dashboard/                # Main dashboard
│   ├── projects/                 # Project management pages
│   ├── documents/                # Document control pages
│   ├── production/               # Production tracking pages
│   ├── qc/                       # Quality control pages
│   ├── financial/                # Financial management pages
│   ├── business-planning/        # Strategic planning pages
│   ├── governance/               # Governance pages
│   ├── operations/               # Operations dashboard
│   ├── planning/                 # Planning & scheduling
│   ├── initiatives/              # Initiatives & tasks
│   ├── risk-dashboard/           # Risk management dashboard
│   ├── detailed-project-planner/ # MS Project-style planner
│   ├── ceo-control-center/       # Executive dashboard
│   ├── ai-assistant/             # AI chat interface
│   ├── knowledge-center/         # Risk patterns & lessons learned
│   ├── resource-capacity/        # Resource capacity planning
│   ├── settings/                 # Application settings
│   ├── users/                    # User management
│   └── roles/                    # Role management
├── components/
│   ├── ui/                       # shadcn/ui base components (read-only)
│   ├── dashboard/                # Dashboard widgets
│   ├── projects/                 # Project components
│   ├── operations/               # Operations components
│   ├── ai-chat/                  # AI assistant UI
│   └── reports/                  # Report components
├── lib/
│   ├── db.ts                     # Prisma client singleton
│   ├── logger.ts                 # Pino structured logger
│   ├── api-utils.ts              # withApiContext, logActivity, logAuditEvent
│   ├── jwt.ts                    # JWT session verification
│   ├── env.ts                    # Environment variable validation
│   ├── utils.ts                  # Shared utilities (cn, etc.)
│   └── services/                 # Business logic services
│       ├── deadline-scheduler.ts
│       ├── early-warning-engine.ts
│       ├── leading-indicators.ts
│       ├── google-sheets-sync.ts
│       ├── pts-sync.ts
│       ├── notification.ts
│       ├── resource-capacity.ts
│       └── governance/
├── hooks/                        # Shared React hooks
├── contexts/                     # React context providers
├── modules/                      # Feature modules
├── types/                        # Shared TypeScript types
└── services/                     # Client-side service layer
prisma/
└── schema.prisma                 # 90-model database schema
.github/
└── workflows/
    ├── deploy.yml                # CI/CD deployment pipeline
    └── release.yml               # Release automation
```

---

## Database Schema

The schema contains **90 models** across all business domains.

| Domain | Key Models |
|---|---|
| Organization | User, Role, Department |
| Projects | Project, Building, Client, ScopeSchedule |
| Documents | DocumentSubmission, DocumentRevision, DocumentReference |
| Production | ProductionLog, AssemblyPart, WorkUnit, WorkOrder |
| QC | MaterialInspection, WeldingInspection, DimensionalInspection, NDTInspection |
| Operations | OperationEvent, OperationEventAudit, OperationStageConfig |
| Financial | ChartOfAccount, BankAccount, JournalEntry, AccountMapping |
| Planning | ProjectPlan, InitiativeTask, InitiativeMilestone |
| Governance | StrategicObjective, KeyResult, KPIDefinition, BalancedScorecardKPI |
| Risk | RiskEvent, RiskPattern, KnowledgeEntry |
| Planner | PlannerProject, PlannerTask, DependencyBlueprint |

All models support soft deletes (`deletedAt`) and audit tracking (`createdById`, `updatedById`).

See `prisma/schema.prisma` for the complete schema.

---

## API Conventions

All API routes follow a standard pattern:

- **Auth**: All routes are wrapped with `withApiContext` (JWT verification + audit context)
- **Validation**: All request bodies validated with Zod schemas
- **Soft Deletes**: All queries filter `where: { deletedAt: null }`
- **Logging**: Structured logging via Pino — no `console.log` in production code
- **Error Responses**: Consistent `{ error, details? }` JSON shape

---

## Security

- JWT session cookies (`ots_session`) with configurable secret
- Role-based access control (Admin, Manager, Employee)
- Password hashing with bcryptjs
- SQL injection protection via Prisma parameterized queries
- Environment validation at startup — app refuses to start with missing required vars
- Audit trail on all write operations

---

## Scripts

```bash
npm run dev              # Start development server (Turbopack)
npm run build            # Generate Prisma client + production build
npm start                # Start production server
npm run lint             # ESLint
npm run db:seed          # Seed database with initial data
npx prisma generate      # Regenerate Prisma client
npx prisma migrate dev   # Create and apply a new migration
npx prisma migrate deploy # Apply pending migrations (production)
node scripts/generate-vapid-keys.mjs # Generate VAPID keys for push notifications
```

---

## Deployment

### Production Build

```bash
npm run build
npm start
```

### Required Environment Variables in Production

| Variable | Description |
|---|---|
| `DATABASE_URL` | MySQL 8 connection string |
| `JWT_SECRET` | Strong random secret (min 32 chars) |
| `NEXT_PUBLIC_APP_URL` | Public URL of the application |

### Subpath Deployment

To deploy under a subpath (e.g. `hexasteel.sa/ots`):

```env
NEXT_PUBLIC_BASE_PATH=/ots
```

### Database Migration

```bash
npx prisma migrate deploy
```

See `DEPLOYMENT_SUMMARY.md` for full deployment instructions.

---

## Documentation

| File | Description |
|---|---|
| `DEPLOYMENT_SUMMARY.md` | Full deployment guide |
| `GITHUB_SETUP.md` | Git workflow and branching |
| `OPERATIONS_TIMELINE_MODULE.md` | Operations timeline technical docs |
| `docs/` | Additional technical documentation |

---

## License

Proprietary software — All rights reserved by Hexa Steel®.

## Authors

**Walid Dami** — Hexa Steel® Development Team

---

**Version**: 16.2.0
**Last Updated**: March 2026
**Repository**: https://github.com/refedo/OTS
