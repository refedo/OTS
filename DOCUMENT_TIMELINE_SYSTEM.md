# Document Timeline System - Implementation Guide

## Overview
A comprehensive document controlling timeline system that tracks submission, review, approval/rejection, client responses, versioning, and reporting for all documentation related to Projects and Buildings.

## Features Implemented

### 1. Database Schema
**Models Created:**
- `DocumentSubmission` - Main submission tracking
- `DocumentRevision` - Version history tracking

**Key Fields:**
- Project and Building linkage (required project, optional building)
- Document type, section, title, description
- Revision tracking (R0, R1, R2, etc.)
- Responsibility tracking (handledBy, submittedBy)
- Complete date tracking (submission, review due, approval, client response)
- Status workflow management
- Client response tracking
- Comments and notes (internal, client, rejection reasons)
- Days count metrics
- File attachments support (JSON)

### 2. Document Types Supported
- Architectural Drawing
- Structural Design Package (SAP Model, Connection Design, Calculation Note)
- Approval Drawings
- CRS (Comments Resolution Sheet)
- RAD (Request for Approval Drawing)
- RFI
- Shop Drawing
- Fabrication Package
- Fabrication Drawing
- Erection Drawing
- As-Built Drawing
- Quality Documents
- Test Reports
- Material Certificates
- Other

### 3. Status Workflow
**Internal Statuses:**
- Submitted
- Under Review
- Approved
- Rejected
- Resubmission Required

**Client Statuses:**
- Client Review
- Client Approved
- Client Rejected

**Client Response Options:**
- Approved
- Approved with Comments
- Rejected
- Resubmit

### 4. Responsibility Tracking
**Handled By (Developer/Engineer):**
- Design documents → Design Engineer
- Shop drawings → Shop Drawing Engineer
- Fabrication drawings → Fabrication Engineer
- All documents link to the responsible user

**Submitted By:**
- Automatically tracked (current logged-in user)

### 5. API Endpoints

#### Document Submissions
- `GET /api/document-submissions` - List all submissions with filters
  - Query params: projectId, buildingId, documentType, status
- `POST /api/document-submissions` - Create new submission
- `GET /api/document-submissions/[id]` - Get single submission with full details
- `PATCH /api/document-submissions/[id]` - Update submission status
- `DELETE /api/document-submissions/[id]` - Delete submission (Admin/Manager only)

#### Revisions
- `POST /api/document-submissions/[id]/revisions` - Add new revision

### 6. User Interface

#### Main Timeline Page (`/document-timeline`)
- Comprehensive table view with all submissions
- Advanced filtering (Project, Document Type, Status)
- Color-coded status badges
- Days count display
- Quick actions (View, Edit)
- Responsive design

#### New Submission Form (`/document-timeline/new`)
- Project selection (required)
- Building selection (optional)
- Document type dropdown
- Section/Area identifier
- Title and description
- Revision tracking
- Handled By assignment
- Date tracking (submission, review due)
- Client code reference
- Internal comments

#### Detail/View Page (`/document-timeline/[id]`)
- Complete submission information
- Status update form
- Add revision functionality
- Revision history timeline
- Status sidebar with metrics
- Timeline card with all dates
- People card (handler, submitter)
- Client response tracking
- Days to approval calculation

### 7. Key Features

#### Versioning System
- Track multiple revisions (R0, R1, R2, etc.)
- Each revision has its own:
  - Submission date
  - Status
  - Comments
  - Client response
  - Approval date
- Complete revision history display

#### Metrics & Reporting
- Days count: Automatically calculated from submission to approval
- Status tracking across all documents
- Client response tracking
- Building-specific tracking
- Section-based organization

#### Integration
- Fully integrated with Projects module
- Links to Buildings module
- User assignment and tracking
- Sidebar navigation added

## Usage Guide

### Creating a New Submission
1. Navigate to Document Timeline
2. Click "New Submission"
3. Select Project (required)
4. Select Building (optional)
5. Choose Document Type
6. Enter Title and Details
7. Assign Handler (developer/engineer)
8. Set Submission Date
9. Add Internal Comments
10. Submit

### Updating Status
1. Open submission detail page
2. Click "Update Status"
3. Change status
4. Add client response if received
5. Enter client comments
6. Set approval/response dates
7. Save changes

### Adding Revisions
1. Open submission detail page
2. Click "Add Revision"
3. Enter new revision number (R1, R2, etc.)
4. Set submission date
5. Update status
6. Add comments about changes
7. Submit revision

### Filtering & Search
- Filter by Project
- Filter by Document Type
- Filter by Status
- View all or specific project documents

## Database Relations

```
DocumentSubmission
├── project (Project) - Required
├── building (Building) - Optional
├── handler (User) - Optional
├── submitter (User) - Required
└── revisions (DocumentRevision[])

DocumentRevision
├── submission (DocumentSubmission)
└── submitter (User)
```

## Navigation
Access via sidebar: **Projects → Document Timeline**

## Benefits

1. **Complete Tracking**: Every document submission is tracked from start to finish
2. **Version Control**: Full revision history with comments
3. **Client Communication**: Track client responses and comments
4. **Responsibility**: Clear assignment of who handles each document
5. **Metrics**: Days count and status tracking for reporting
6. **Building-Specific**: Link documents to specific buildings when needed
7. **Audit Trail**: Complete history of all changes and revisions
8. **Guideline System**: Clear view of what's done and status of each building/submission

## Future Enhancements (Optional)
- File upload/attachment functionality
- Email notifications on status changes
- Advanced reporting and analytics
- Export to Excel/PDF
- Bulk operations
- Document templates
- Approval workflow automation
- Integration with external document management systems

## Technical Stack
- **Frontend**: Next.js 14, React, TypeScript, TailwindCSS
- **Backend**: Next.js API Routes
- **Database**: MySQL with Prisma ORM
- **UI Components**: shadcn/ui
- **Icons**: Lucide React

## Status: ✅ Production Ready
All features implemented and tested. Ready for use in production environment.
