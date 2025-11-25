# QC Module Analysis & Implementation Plan

## Current State Analysis

### ✅ What We Have (Implemented)

#### 1. **RFI (Request for Inspection) Module**
- **Status**: ✅ Fully Implemented
- **Features**:
  - RFI creation from production logs
  - Individual item inspection (one row per production log)
  - Inspection-type-specific fields (Dimensional, Visual, NDT, Coating, Paint, Surface Prep)
  - Two-tier rejection system (Minor/Major)
  - Automatic NCR creation on major rejection
  - Comprehensive update dialog with measurement fields
  - Filtering by project, process, QC status, inspection type
  - Bulk operations (approve, delete)
  - RFI numbering: `RFI-YYMM-XXXX`
- **Database**: `RFIRequest`, `RFIProductionLog` (junction table)
- **Routes**: `/qc/rfi`, `/api/qc/rfi`

#### 2. **NCR (Non-Conformance Report) Module**
- **Status**: ✅ Fully Implemented
- **Features**:
  - NCR creation (manual and automatic from RFI major rejection)
  - NCR tracking with status (Open, In Progress, Closed, Overdue)
  - Severity levels (Low, Medium, High, Critical)
  - Corrective action tracking
  - Root cause analysis
  - Preventive action
  - Deadline management with auto-overdue
  - Assignment to users
  - Linked to RFI and Production Log
  - NCR numbering: `{ProjectNumber}-NCR-XXX`
- **Database**: `NCRReport`
- **Routes**: `/qc/ncr`, `/api/qc/ncr`

#### 3. **QC Dashboard**
- **Status**: ✅ Partially Implemented
- **Features**:
  - RFI statistics (total, pending, approved, rejected)
  - NCR statistics (total, open, in progress, closed, overdue)
  - Approval rate metrics
  - NCR closure time
  - Recent RFIs and NCRs
  - Filtering by project and building
- **Routes**: `/qc` (main dashboard)

#### 4. **Production Integration**
- **Status**: ✅ Implemented
- **Features**:
  - QC status on production logs (Not Required, Pending Inspection, Approved, Rejected)
  - RFI creation from production logs (bulk selection)
  - RFI number display on production logs
  - QC status filtering
  - Rectification workflow

---

## ❌ What's Missing (To Be Implemented)

### 1. **Specialized QC Submodules**

Currently, all inspections go through the generic RFI system. We need specialized modules for:

#### a) **Material Inspection Module**
- **Purpose**: Incoming material inspection (steel plates, sections, bolts, etc.)
- **Fields Needed**:
  - Material type, grade, specification
  - Supplier information
  - Mill certificates tracking
  - Chemical composition verification
  - Mechanical properties testing
  - Visual inspection results
  - Accept/Reject/Hold status
- **Integration**: Link to material requisitions/purchases

#### b) **Welding QC Module** 
- **Purpose**: Welding process and welder qualification tracking
- **Fields Needed**:
  - WPS (Welding Procedure Specification) reference
  - Welder ID/qualification
  - Joint type and location
  - Welding parameters (current, voltage, travel speed)
  - Visual inspection results
  - Weld defects tracking
  - Repair records
- **Integration**: Link to WPS module, production logs

#### c) **Dimensional/Fit-up QC Module**
- **Purpose**: Dimensional accuracy and fit-up checks
- **Fields Needed**:
  - Measured dimensions (L/W/H/Thickness)
  - Tolerance verification
  - Straightness, flatness checks
  - Fit-up gaps
  - Alignment verification
  - Drawing reference
- **Integration**: Link to assembly parts, production logs

#### d) **NDT (Non-Destructive Testing) Module**
- **Purpose**: NDT testing records (UT, MT, PT, RT, VT)
- **Fields Needed**:
  - NDT method (Ultrasonic, Magnetic Particle, Dye Penetrant, Radiographic, Visual)
  - Test procedure reference
  - Equipment calibration
  - Test results and acceptance criteria
  - Defect location and size
  - NDT operator certification
  - Test reports and images
- **Integration**: Link to welding records, production logs

#### e) **Coating/Painting QC Module**
- **Purpose**: Surface preparation and coating inspection
- **Fields Needed**:
  - Surface preparation method and grade
  - Blast profile measurement
  - Coating system specification
  - DFT (Dry Film Thickness) measurements
  - Adhesion test results
  - Holiday detection
  - Color and appearance
  - Environmental conditions (temp, humidity)
- **Integration**: Link to production logs, coating specifications

#### f) **Galvanization QC Module**
- **Purpose**: Hot-dip galvanizing inspection
- **Fields Needed**:
  - Coating thickness measurements
  - Surface appearance
  - Adherence test
  - Galvanizer certificate
  - Batch number
  - Zinc purity verification
- **Integration**: Link to production logs

#### g) **Final/Dispatch QC Module**
- **Purpose**: Final inspection before dispatch
- **Fields Needed**:
  - Completeness check
  - Marking and identification
  - Protection and packaging
  - Documentation completeness
  - Loading inspection
  - Dispatch clearance
- **Integration**: Link to dispatch/shipping module

#### h) **Site/Erection QC Module**
- **Purpose**: On-site erection quality control
- **Fields Needed**:
  - Erection sequence verification
  - Bolt torque verification
  - Alignment checks
  - Site welding inspection
  - Touch-up coating
  - As-built documentation
- **Integration**: Link to site activities, erection plans

### 2. **ITP (Inspection and Test Plan) Integration**
- **Status**: ❌ Not Implemented
- **Needed**:
  - Auto-generate inspection checklists from project ITP
  - Link inspection types to production stages
  - Hold points and witness points tracking
  - ITP compliance dashboard

### 3. **QC Document Management**
- **Status**: ❌ Not Implemented
- **Needed**:
  - Mill certificates repository
  - Test reports storage
  - Calibration certificates
  - WPS/PQR documents
  - NDT reports
  - Material traceability

### 4. **Advanced QC Dashboard**
- **Status**: ⚠️ Partially Implemented
- **Needed**:
  - Tabs for each QC submodule
  - KPIs per inspection type
  - Trend analysis
  - Rejection rate by process/inspector
  - Inspection backlog
  - Compliance metrics

### 5. **QC Workflow Enhancements**
- **Status**: ⚠️ Partially Implemented
- **Needed**:
  - Hold/Release workflow for materials
  - Inspection scheduling and assignment
  - Mobile-friendly inspection forms
  - Barcode/QR code scanning for traceability
  - Photo attachments for inspections
  - Digital signatures

### 6. **Reporting & Analytics**
- **Status**: ❌ Not Implemented
- **Needed**:
  - Monthly QC reports
  - Inspection summary by project
  - Defect analysis (Pareto charts)
  - Inspector performance metrics
  - Material rejection trends
  - NCR aging reports

---

## 🎯 Implementation Priority

### Phase 1: Core QC Submodules (High Priority)
1. **Material Inspection Module** - Critical for incoming quality
2. **Welding QC Module** - Core fabrication quality
3. **Dimensional QC Module** - Accuracy verification
4. **NDT Module** - Weld quality assurance

### Phase 2: Finishing & Dispatch (Medium Priority)
5. **Coating/Painting QC Module**
6. **Galvanization QC Module**
7. **Final/Dispatch QC Module**

### Phase 3: Site & Advanced Features (Lower Priority)
8. **Site/Erection QC Module**
9. **ITP Integration**
10. **Advanced Reporting & Analytics**

---

## 🏗️ Database Schema Extensions Needed

### New Tables to Create:

```prisma
// 1. Material Inspection
model MaterialInspection {
  id                String      @id @default(uuid())
  inspectionNumber  String      @unique
  projectId         String
  materialType      String
  grade             String
  specification     String
  supplier          String?
  heatNumber        String?
  millCertNumber    String?
  quantity          Float
  unit              String
  inspectorId       String
  inspectionDate    DateTime
  result            String      // Accepted, Rejected, Hold
  remarks           String?     @db.Text
  attachments       String?     @db.Text
  
  project           Project     @relation(fields: [projectId], references: [id])
  inspector         User        @relation(fields: [inspectorId], references: [id])
  
  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt
}

// 2. Welding QC
model WeldingInspection {
  id                String      @id @default(uuid())
  inspectionNumber  String      @unique
  projectId         String
  buildingId        String?
  productionLogId   String
  wpsNumber         String?
  welderCode        String?
  jointType         String
  jointLocation     String
  weldingProcess    String
  inspectorId       String
  inspectionDate    DateTime
  visualResult      String      // Pass, Fail
  defects           String?     @db.Text
  repairRequired    Boolean     @default(false)
  result            String      // Accepted, Rejected
  remarks           String?     @db.Text
  attachments       String?     @db.Text
  
  project           Project     @relation(fields: [projectId], references: [id])
  building          Building?   @relation(fields: [buildingId], references: [id])
  productionLog     ProductionLog @relation(fields: [productionLogId], references: [id])
  inspector         User        @relation(fields: [inspectorId], references: [id])
  
  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt
}

// 3. Dimensional QC
model DimensionalInspection {
  id                String      @id @default(uuid())
  inspectionNumber  String      @unique
  projectId         String
  buildingId        String?
  productionLogId   String
  partDesignation   String
  measuredLength    Float?
  measuredWidth     Float?
  measuredHeight    Float?
  measuredThickness Float?
  toleranceCheck    String      // Within, Out of Tolerance
  inspectorId       String
  inspectionDate    DateTime
  result            String      // Accepted, Rejected
  remarks           String?     @db.Text
  attachments       String?     @db.Text
  
  project           Project     @relation(fields: [projectId], references: [id])
  building          Building?   @relation(fields: [buildingId], references: [id])
  productionLog     ProductionLog @relation(fields: [productionLogId], references: [id])
  inspector         User        @relation(fields: [inspectorId], references: [id])
  
  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt
}

// 4. NDT Inspection
model NDTInspection {
  id                String      @id @default(uuid())
  inspectionNumber  String      @unique
  projectId         String
  buildingId        String?
  productionLogId   String
  ndtMethod         String      // UT, MT, PT, RT, VT
  testProcedure     String?
  equipmentId       String?
  operatorCert      String?
  testResult        String      // Pass, Fail
  defectDetails     String?     @db.Text
  inspectorId       String
  inspectionDate    DateTime
  result            String      // Accepted, Rejected
  remarks           String?     @db.Text
  attachments       String?     @db.Text
  
  project           Project     @relation(fields: [projectId], references: [id])
  building          Building?   @relation(fields: [buildingId], references: [id])
  productionLog     ProductionLog @relation(fields: [productionLogId], references: [id])
  inspector         User        @relation(fields: [inspectorId], references: [id])
  
  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt
}

// 5. Coating Inspection
model CoatingInspection {
  id                String      @id @default(uuid())
  inspectionNumber  String      @unique
  projectId         String
  buildingId        String?
  productionLogId   String
  coatingSystem     String
  surfacePrep       String?
  blastProfile      Float?
  dftMeasurements   String?     @db.Text // JSON array
  adhesionTest      String?
  holidayTest       String?
  inspectorId       String
  inspectionDate    DateTime
  result            String      // Accepted, Rejected
  remarks           String?     @db.Text
  attachments       String?     @db.Text
  
  project           Project     @relation(fields: [projectId], references: [id])
  building          Building?   @relation(fields: [buildingId], references: [id])
  productionLog     ProductionLog @relation(fields: [productionLogId], references: [id])
  inspector         User        @relation(fields: [inspectorId], references: [id])
  
  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt
}
```

---

## 🔗 Integration Points

### 1. Production Logs Enhancement
- Add specific QC inspection links (not just RFI)
- Track which QC modules have inspected each log
- Display inspection status per module

### 2. QC Dashboard Tabs
- Material tab → Material Inspections
- Welding tab → Welding Inspections
- Dimensional tab → Dimensional Inspections
- NDT tab → NDT Inspections
- Coating tab → Coating Inspections
- RFI tab → Current RFI system
- NCR tab → Current NCR system

### 3. Unified QC Status
- Production log can have multiple QC checks
- Overall QC status = all required checks passed
- Hold production if any critical check fails

---

## 📝 Implementation Recommendations

### DO NOT Change:
1. ✅ Keep existing RFI system as-is
2. ✅ Keep existing NCR system as-is
3. ✅ Keep current RFI-NCR integration
4. ✅ Keep production log QC status field

### DO Add:
1. ➕ New specialized QC tables (parallel to RFI)
2. ➕ New QC dashboard tabs
3. ➕ New API routes for each module
4. ➕ Enhanced QC dashboard with module-specific KPIs
5. ➕ Cross-module reporting

### Integration Strategy:
- RFI remains the "catch-all" inspection request system
- Specialized modules handle specific inspection types
- NCR can be raised from any QC module (not just RFI)
- Production logs link to multiple QC records
- Dashboard aggregates data from all QC sources

---

## 🎯 Next Steps

1. **Review and approve this plan**
2. **Implement Phase 1 modules** (Material, Welding, Dimensional, NDT)
3. **Create unified QC dashboard with tabs**
4. **Add API routes for new modules**
5. **Update production integration**
6. **Implement Phase 2 & 3 as needed**

---

## 📊 Success Metrics

- All QC inspection types have dedicated modules
- Single unified QC dashboard
- Seamless integration with production
- NCR can be raised from any module
- Complete traceability from material to dispatch
- Role-based access control maintained
- No disruption to existing RFI/NCR workflows
