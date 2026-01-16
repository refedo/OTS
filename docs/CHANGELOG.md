# Changelog

All notable changes to the MRP System will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [1.1.0] - 2025-10-17

### Changed
- 🔄 RFI numbering format changed from `RFI-YYYY-XXXX` to `RFI-YYMM-XXXX`
- 🔄 RFI numbers now reset monthly instead of yearly
- 🔄 Format: RFI-2510-0001 (October 2025, sequence 1)

### Added
- ✅ Quantity column in RFI list
- ✅ RFI number display on Production Logs page
- ✅ Individual item rows in RFI list (one row per production log)
- ✅ Clickable RFI number links from Production Logs to RFI page

---

## [1.0.0] - 2025-10-16

### Added - Quality Control Module

#### RFI Management
- ✅ Create RFIs from production logs with automatic grouping
- ✅ Many-to-many relationship between RFIs and production logs
- ✅ Automatic RFI numbering (RFI-YYYY-NNNN format)
- ✅ Process-to-inspection type mapping
- ✅ Multi-item RFI support

#### RFI List & Filtering
- ✅ Comprehensive RFI list page
- ✅ Search functionality across parts, projects, inspection types
- ✅ Project filter dropdown
- ✅ Building filter dropdown
- ✅ Status filter (Pending/Approved/Rejected)
- ✅ Inspection type filter
- ✅ Visual indicators (status badges, rectification icons)

#### Bulk Operations
- ✅ Bulk approve multiple RFIs
- ✅ Bulk delete multiple RFIs
- ✅ Checkbox selection system
- ✅ Confirmation dialogs with warnings
- ✅ Success/failure reporting

#### Workflows
- ✅ Submit items for QC inspection
- ✅ Approve/reject RFIs
- ✅ Rectification workflow for rejected items
- ✅ Status synchronization between RFIs and production logs

#### API Endpoints
- ✅ POST /api/qc/rfi - Create RFIs
- ✅ GET /api/qc/rfi - List RFIs with filters
- ✅ GET /api/qc/rfi/[id] - Get RFI details
- ✅ PATCH /api/qc/rfi/[id] - Update RFI
- ✅ DELETE /api/qc/rfi/[id] - Delete RFI with status reset

#### Database Schema
- ✅ RFIRequest model
- ✅ RFIProductionLog junction table
- ✅ Extended ProductionLog with QC fields
- ✅ Proper indexes and constraints
- ✅ Cascade delete rules

#### Maintenance Tools
- ✅ cleanup-qc-system.bat - Automated cleanup
- ✅ delete-broken-rfis.ts - Remove broken RFIs
- ✅ cleanup-orphaned-qc-status.ts - Reset orphaned statuses
- ✅ migrate-rfi-many-to-many.bat - Schema migration

### Changed
- 🔄 Production logs page enhanced with QC submission
- 🔄 RFI schema migrated from single-log to many-to-many
- 🔄 Improved error handling and validation

### Fixed
- 🐛 RFI deletion now properly resets production log statuses
- 🐛 Orphaned QC statuses cleaned up
- 🐛 Backward compatibility issues resolved

---

## [0.9.0] - 2025-10-01 (Pre-QC Module)

### Existing Features
- Production log tracking
- Project and building management
- Assembly part management
- User authentication
- Basic NCR functionality

---

## Future Releases

### [1.1.0] - Planned
- Email notifications for RFI assignments
- File attachment support
- Enhanced NCR integration
- Dashboard analytics

### [1.2.0] - Planned
- Mobile-responsive improvements
- Advanced reporting
- Export functionality
- Batch printing

### [2.0.0] - Planned
- Mobile app
- Offline capability
- ERP integration
- Advanced analytics

---

## Update Guidelines

When adding changes:
1. Use appropriate category (Added/Changed/Fixed/Removed)
2. Include feature name and description
3. Use ✅ for completed, 🔄 for in-progress, 🐛 for bugs
4. Update version number following semantic versioning
5. Add date in YYYY-MM-DD format

---

**Last Updated:** October 16, 2025
