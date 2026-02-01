# Changelog - Hexa Steel OTS

All notable changes to the Hexa Steel Operation Tracking System will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0/).

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