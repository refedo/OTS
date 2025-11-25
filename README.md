# Hexa Steel® Operations Tracking System (OTS)

A comprehensive Enterprise Resource Planning (ERP) system specifically designed for steel fabrication and construction projects. Built with Next.js 15, TypeScript, Prisma, and MySQL.

## 🚀 Features

### Project Management
- **Project Wizard**: Step-by-step project creation with buildings, schedules, coating systems, and payment terms
- **Project Dashboard**: Real-time project status, progress tracking, and milestone management
- **Scope of Work**: Configurable project phases (Design, Shop Drawing, Procurement, Fabrication, Coating, Delivery, Erection)
- **Buildings Management**: Multi-building support with individual tracking
- **Payment Terms**: Flexible payment schedule configuration

### Document Control
- **Document Timeline**: Track all project documentation with version control
- **Document Types**: Architectural, Structural, Shop Drawings, Fabrication, Erection, As-Built, Quality Documents
- **Status Workflow**: Submission → Review → Approval with client response tracking
- **Revision Management**: Complete version history with audit trail
- **Client Responses**: Track Approved, Approved with Comments, Rejected, Resubmit

### Production Management
- **Production Dashboard**: Real-time production monitoring and analytics
- **Production Logs**: Track Preparation, Fit-up, Welding, Visualization, Sandblasting, Painting, Galvanization, Dispatch
- **Assembly Parts**: Complete parts management with BOM integration
- **Mass Logging**: Bulk production entry for efficiency
- **Production Reports**: Comprehensive reporting and analytics
- **Tonnage Tracking**: Weight-based progress monitoring

### Operations & Timeline
- **Operations Dashboard**: Project-wide analytics and KPIs
- **Timeline Visualization**: Interactive project timeline with milestones
- **Stage Tracking**: 11 standard operational stages
- **Automatic Event Capture**: Integration with Document Control, Production, Procurement
- **SLA Monitoring**: Delayed stage detection and alerts

### Procurement
- **Purchase Orders**: Complete PO management system
- **Supplier Management**: Vendor tracking and performance
- **Material Tracking**: Inventory and material status
- **Procurement Timeline**: Integration with operations timeline

### Planning & Scheduling
- **Scope Schedules**: Timeline planning for each scope of work
- **Building-Level Scheduling**: Individual building timelines
- **Month & Scope Filters**: Advanced filtering capabilities
- **Duration Tracking**: Automatic duration calculations

### Initiatives & Tasks
- **Strategic Initiatives**: Company-wide initiative management
- **Milestone Tracking**: Initiative milestones with progress monitoring
- **Task Management**: Detailed task tracking and assignment
- **Analytics Dashboard**: Initiative performance metrics
- **Budget Tracking**: Financial monitoring and analysis

### User Management
- **Role-Based Access Control**: Admin, Manager, Employee roles
- **Authentication**: Secure session-based authentication
- **User Profiles**: Complete user information management
- **Activity Tracking**: User action audit trail

## 🛠️ Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Database**: MySQL with Prisma ORM
- **UI Components**: shadcn/ui + Radix UI
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Icons**: Lucide React
- **Forms**: React Hook Form + Zod validation
- **Date Handling**: date-fns
- **Excel Processing**: xlsx

## 📋 Prerequisites

- Node.js 18+ 
- MySQL 8.0+
- npm or yarn

## 🚀 Getting Started

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

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL="mysql://user:password@localhost:3306/ots_db"

# Authentication
COOKIE_NAME="ots_session"
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 4. Database Setup

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# (Optional) Seed database
npx prisma db seed
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 6. Default Login

```
Email: admin@hexasteel.com
Password: admin123
```

**⚠️ Change default credentials in production!**

## 📁 Project Structure

```
src/
├── app/                      # Next.js App Router pages
│   ├── api/                 # API routes
│   ├── projects/            # Project management
│   ├── production/          # Production tracking
│   ├── document-timeline/   # Document control
│   ├── operations/          # Operations dashboard
│   ├── planning/            # Planning & scheduling
│   ├── initiatives/         # Initiatives & tasks
│   └── ...
├── components/              # React components
│   ├── ui/                 # shadcn/ui components
│   └── ...
├── lib/                     # Utilities
│   ├── db.ts               # Prisma client
│   ├── jwt.ts              # Authentication
│   └── ...
└── prisma/
    └── schema.prisma        # Database schema
```

## 🗄️ Database Schema

Key models:
- **Project**: Project information and metadata
- **Building**: Building/structure details
- **AssemblyPart**: Parts and components
- **ProductionLog**: Production tracking
- **DocumentSubmission**: Document control
- **OperationEvent**: Timeline events
- **PurchaseOrder**: Procurement
- **Initiative**: Strategic initiatives
- **User**: User management

See `prisma/schema.prisma` for complete schema.

## 🔐 Security

- Session-based authentication with JWT
- Role-based access control (RBAC)
- Password hashing with bcrypt
- SQL injection protection via Prisma
- XSS protection
- CSRF protection

## 📊 Key Modules

### Projects Dashboard
- Real-time project status
- Progress tracking by stage
- Production progress visualization
- Scope-based filtering

### Production Dashboard
- Overall tonnage tracking
- Process-wise progress (Fit-up, Welding, Visualization)
- Building-level production status
- Production logs and reports

### Document Control
- Complete document lifecycle
- Version control and revisions
- Client approval tracking
- Submission metrics

### Operations Timeline
- Visual project timeline
- Automatic event capture
- Stage completion tracking
- Delayed stage alerts

## 🚢 Deployment

### Production Build

```bash
npm run build
npm start
```

### Environment Variables

Ensure all production environment variables are set:
- `DATABASE_URL`: Production database connection
- `JWT_SECRET`: Strong secret key
- `NEXT_PUBLIC_APP_URL`: Production URL

### Database Migration

```bash
npx prisma migrate deploy
```

See `DEPLOYMENT_SUMMARY.md` for detailed deployment instructions.

## 📝 Documentation

- `GITHUB_SETUP.md` - GitHub setup and commit guide
- `DEPLOYMENT_SUMMARY.md` - Deployment instructions
- `OPERATIONS_TIMELINE_MODULE.md` - Operations timeline documentation
- `SIDEBAR_FIX.md` - UI component documentation

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is proprietary software owned by Hexa Steel®.

## 👥 Authors

- **Hexa Steel® Development Team**

## 🙏 Acknowledgments

- Built with Next.js and the React ecosystem
- UI components from shadcn/ui
- Icons from Lucide React

---

**Version**: 1.0.0  
**Last Updated**: November 2025  
**Repository**: https://github.com/refedo/OTS
