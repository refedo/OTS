# Changelog - Hexa Steel OTS

All notable changes to the Hexa Steel Operation Tracking System will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- **Project Dashboard Module** (v1.0)
  - Unified single-project dashboard showing all project data in one place
  - Dynamic project selector with deep linking support (`?projectId=xxx`)
  - 8 specialized widgets: ProjectHeader, WPS Status, ITP Status, Production Progress, QC Progress, Buildings Status, Documentation Status, Tasks Overview
  - Real-time data from database (zero placeholder data)
  - Collapsible widgets for better UX
  - Individual and global refresh functionality
  - Responsive grid layout
  - Color-coded progress indicators (green/yellow/red)
  - Interactive charts for production and QC trends
  - Per-building status breakdown
  - Task filtering (all, my tasks, non-completed, completed)

### Planned
- **Reporting & Analytics Module**
  - Power BI integration for advanced analytics
  - Custom report designer embedded in OTS
  - Professional PDF report generation for projects
  - Scheduled report delivery via email
  - Custom dashboard templates
  - Export to Excel/CSV functionality

---

## [1.1.0] - 2024-12-08

### Added
- **Notification Center Module**
  - Real-time notification system for tasks, approvals, and deadlines
  - Notification bell with unread count badge
  - Dropdown notification panel with 5 tabs (All, Unread, Approvals, Deadlines, Archived)
  - Full-page notification center at `/notifications`
  - AI-powered notification summaries using OpenAI GPT-4
  - Automatic deadline scanner (runs daily at 8:00 AM)
  - 6 notification types: Task Assigned, Approval Required, Deadline Warning, Approved, Rejected, System
  - Mark as read/archive functionality
  - Bulk operations (mark all as read)
  - Click-to-navigate to related entities
  - Deadline countdown badges
  - Time-ago formatting

- **Database Changes**
  - New `notifications` table with indexes
  - New `NotificationType` enum
  - Foreign key relationship to users table

- **API Endpoints**
  - `GET /api/notifications` - List notifications with filters
  - `PATCH /api/notifications/[id]/read` - Mark as read
  - `PATCH /api/notifications/[id]/archive` - Archive notification
  - `POST /api/notifications/bulk-read` - Mark all as read
  - `GET /api/notifications/summary` - AI-powered summary

- **Services**
  - NotificationService with trigger methods for all notification types
  - DeadlineSchedulerService for automatic deadline warnings
  - Integration points for Tasks, RFI, NCR, Documents, ITP/WPS

- **Documentation**
  - Complete module documentation
  - Integration examples for all modules
  - Quick start guide
  - Deployment checklist

### Technical Details
- Frontend: React 19, Next.js 14, TypeScript, Tailwind CSS, ShadCN UI
- Backend: Next.js API Routes, Prisma ORM
- Database: MySQL with optimized indexes
- Scheduling: node-cron
- AI: OpenAI API (GPT-4o-mini)

---

## [1.0.0] - 2024-11-25

### Added
- **Core System**
  - Project management with multi-building support
  - Client management
  - User management with RBAC (Admin, Manager, Engineer, Production Supervisor, QC Inspector, Viewer)
  - Department management
  - Task management system

- **Production Module**
  - Assembly part tracking
  - Production log system with multiple process types
  - Mass production logging
  - Processing teams and locations management

- **Quality Control Module**
  - RFI (Request for Inspection) system
  - NCR (Non-Conformance Report) management
  - Material inspection
  - Welding inspection
  - Dimensional inspection
  - NDT inspection

- **Engineering Module**
  - ITP (Inspection & Test Plan) management
  - WPS (Welding Procedure Specification) management
  - Document management system with categories
  - Document submission and approval workflow

- **Business Planning Module**
  - Company objectives and key results (OKR)
  - Balanced Scorecard KPIs
  - Annual plans and initiatives
  - Department objectives and KPIs
  - SWOT analysis
  - Weekly issues tracking

- **Operations Timeline**
  - Project timeline visualization
  - Scope schedules per building
  - Operation events tracking

- **AI Assistant**
  - Context-aware AI assistant
  - Integration with OpenAI
  - Conversation history
  - Multi-context support (projects, tasks, KPIs, initiatives)

- **Dashboard & Reporting**
  - Project dashboard with KPIs
  - Production metrics
  - QC statistics
  - Business planning metrics
  - Custom reports

- **System Settings**
  - Company information management
  - System-wide settings
  - Production settings (teams, locations)
  - Report customization

### Technical Stack
- Frontend: Next.js 15, React 19, TypeScript
- Backend: Next.js API Routes
- Database: MySQL with Prisma ORM
- Authentication: JWT with HTTP-only cookies
- UI: Tailwind CSS, ShadCN UI, Radix UI
- Charts: Recharts
- PDF Generation: jsPDF
- Excel: XLSX
- AI: OpenAI API

---

## Version Numbering Guide

### Format: MAJOR.MINOR.PATCH

- **MAJOR** (X.0.0): Breaking changes, major feature overhauls, architecture changes
- **MINOR** (1.X.0): New features, new modules, significant enhancements
- **PATCH** (1.0.X): Bug fixes, minor improvements, documentation updates

### Examples:
- `1.0.0 → 1.1.0`: Added Notification Center (new feature)
- `1.1.0 → 1.1.1`: Fixed notification badge count bug (bug fix)
- `1.1.0 → 2.0.0`: Complete UI redesign (breaking change)

---

## Upcoming Features (Roadmap)

### v1.2.0 (Planned)
- [ ] Email notifications
- [ ] SMS notifications
- [ ] User notification preferences
- [ ] WebSocket for real-time updates
- [ ] Mobile push notifications

### v1.3.0 (Planned)
- [ ] Advanced reporting module
- [ ] Custom dashboard builder
- [ ] Data export/import improvements
- [ ] Bulk operations enhancements

### v2.0.0 (Future)
- [ ] Mobile application
- [ ] Offline mode
- [ ] Multi-language support
- [ ] Advanced analytics

---

## Migration Notes

### Upgrading to 1.1.0
1. Run `npm install --legacy-peer-deps`
2. Run `npx prisma generate`
3. Run `npx prisma db push`
4. Add `<NotificationBell />` to your header
5. Optional: Add `OPENAI_API_KEY` to `.env` for AI summaries

---

## Support

For issues or questions about any version:
- Check documentation in `/docs` folder
- Review integration examples
- Contact development team

---

**Current Version:** 1.1.0  
**Last Updated:** December 8, 2024
