# TestSprite E2E Testing Scenarios - Hexa Steel OTS

## Overview
This document outlines comprehensive end-to-end testing scenarios for the Hexa Steel OTS (Order Tracking System) application using TestSprite.

**Base URL:** `https://ots.hexasteel.sa` (or `http://localhost:3000` for local testing)

---

## Critical User Workflows

### 1. Authentication & Session Management

#### Test: User Login Flow
```
GIVEN I am on the login page at /login
WHEN I enter valid credentials (username: admin, password: [your_password])
AND I click the "Sign In" button
THEN I should be redirected to the dashboard at /dashboard
AND I should see my user name in the header
AND a session cookie "ots_session" should be set
```

#### Test: Session Timeout (2-hour idle)
```
GIVEN I am logged in
WHEN I remain idle for 115 minutes (1 hour 55 minutes)
THEN I should see a warning dialog "You will be logged out in 5 minutes"
WHEN I click "Stay Logged In"
THEN the warning should disappear
AND my session should be refreshed
```

#### Test: Automatic Logout
```
GIVEN I am logged in
WHEN I remain idle for 120 minutes (2 hours)
THEN I should be automatically logged out
AND redirected to /login
AND see a message "Session expired due to inactivity"
```

---

### 2. SWOT Analysis Module (Recently Fixed)

#### Test: Create New SWOT Analysis
```
GIVEN I am logged in as Admin or Manager
WHEN I navigate to /business-planning/swot
AND I select year "2026"
AND I type "Strong market position" in the Strengths field
AND I click the "+" button
THEN the text "Strong market position" should appear in the strengths list
AND the input field should be cleared
WHEN I type "Limited digital presence" in the Weaknesses field
AND I click the "+" button
THEN the text should appear in the weaknesses list
AND the input field should be cleared
```

#### Test: Save and Persist SWOT Data
```
GIVEN I have added items to all SWOT categories
WHEN I click "Save SWOT Analysis"
THEN I should see a success toast "SWOT Analysis saved successfully"
WHEN I refresh the page
THEN all my SWOT items should still be visible
AND the year should remain "2026"
```

#### Test: Delete SWOT Item
```
GIVEN I have SWOT items displayed
WHEN I click the "X" button on any item
THEN that item should be removed from the list
WHEN I click "Save"
THEN the deletion should persist after refresh
```

---

### 3. Project Management Workflow

#### Test: Create New Project
```
GIVEN I am logged in with project creation permissions
WHEN I navigate to /projects
AND I click "New Project"
AND I fill in:
  - Project Code: "PJ2026-TEST-001"
  - Project Name: "Test Steel Fabrication"
  - Client: [select from dropdown]
  - Start Date: "2026-03-15"
  - Contract Value: "500000"
WHEN I click "Create Project"
THEN I should see a success message
AND the project should appear in the projects list
AND I should be able to navigate to /projects/[id]
```

#### Test: Edit Project Details
```
GIVEN I have a project "PJ2026-TEST-001"
WHEN I navigate to /projects/[id]/edit
AND I change the Contract Value to "550000"
AND I click "Save Changes"
THEN I should see "Project updated successfully"
WHEN I navigate back to the project view
THEN the Contract Value should show "SAR 550,000"
```

---

### 4. Financial Reporting & Dolibarr Integration

#### Test: Trigger Financial Sync
```
GIVEN I am logged in as Admin
WHEN I navigate to /financial/settings
AND I click "Sync Now"
THEN I should see a loading indicator
AND after completion, I should see "Sync completed successfully"
AND the "Last Sync" timestamp should be updated
```

#### Test: View Project Financial Analysis
```
GIVEN financial data has been synced
WHEN I navigate to /financial/reports/project-analysis
AND I select a project with invoices
THEN I should see:
  - Total Revenue
  - Total Costs broken down by category (Raw Materials, Labor, etc.)
  - Profit/Loss calculation
  - Cost percentages matching the category mapping
```

#### Test: Cost Category Drill-Down
```
GIVEN I am viewing project financial analysis
WHEN I click on a cost category (e.g., "Raw Materials - 72.3%")
THEN I should see a detailed breakdown of line items
AND each line should show: description, amount, date, invoice reference
```

---

### 5. Business Planning - Objectives & KPIs

#### Test: Create Strategic Objective
```
GIVEN I am on /business-planning/objectives
WHEN I click "Add Objective"
AND I fill in:
  - Title: "Increase Market Share"
  - Description: "Expand to new regions"
  - Target Date: "2026-12-31"
  - Owner: [select user]
WHEN I click "Save"
THEN the objective should appear in the list
AND I should be able to add KPIs to it
```

#### Test: Add KPI to Objective
```
GIVEN I have an objective "Increase Market Share"
WHEN I click "Add KPI"
AND I fill in:
  - KPI Name: "New Clients Acquired"
  - Target Value: "50"
  - Current Value: "12"
  - Unit: "clients"
WHEN I click "Save"
THEN the KPI should show progress: 24% (12/50)
AND a progress bar should be displayed
```

---

### 6. Document Management

#### Test: Upload Document
```
GIVEN I am on /documents
WHEN I click "Upload Document"
AND I select a PDF file
AND I fill in:
  - Title: "Safety Protocol 2026"
  - Category: "Safety"
  - Tags: "safety, protocol, 2026"
WHEN I click "Upload"
THEN I should see "Document uploaded successfully"
AND the document should appear in the documents list
```

#### Test: Document Timeline & Versions
```
GIVEN I have uploaded a document
WHEN I navigate to /documents/[id]
THEN I should see a timeline showing:
  - Upload event with timestamp
  - User who uploaded it
WHEN I upload a new version
THEN the timeline should show the version update
AND I should be able to download both versions
```

---

### 7. Notifications System

#### Test: Receive Notification
```
GIVEN I am logged in
WHEN another user assigns me a task
THEN I should see a notification badge in the header
AND the badge count should increment
WHEN I click the notifications icon
THEN I should see the notification details
AND I can mark it as read
```

#### Test: Notification Badge Persistence
```
GIVEN I have 3 unread notifications
WHEN I refresh the page
THEN the badge should still show "3"
WHEN I mark one as read
THEN the badge should update to "2"
```

---

### 8. Operations Timeline

#### Test: View Project Timeline
```
GIVEN I have a project with tasks
WHEN I navigate to /operations/timeline
AND I select the project
THEN I should see a Gantt-style timeline
AND tasks should be displayed with:
  - Start and end dates
  - Dependencies
  - Progress percentage
  - Assigned resources
```

---

### 9. Changelog & Version Display

#### Test: View Changelog
```
GIVEN I am logged in
WHEN I navigate to /changelog
THEN I should see a list of version updates
AND each entry should show:
  - Version number (e.g., v15.20.1)
  - Release date
  - Features/updates/fixes
AND new features (< 7 days old) should have a star badge
```

#### Test: Footer Version Display
```
GIVEN I am on any page
THEN I should see the current version in the footer (lower-left)
AND it should match the latest version in /changelog
AND the format should be "v15.20.1"
```

---

### 10. Role-Based Access Control (RBAC)

#### Test: Admin Access
```
GIVEN I am logged in as Admin
THEN I should have access to:
  - /admin/* (all admin routes)
  - /financial/* (all financial routes)
  - /business-planning/* (all planning routes)
  - User management
  - System settings
```

#### Test: Manager Access
```
GIVEN I am logged in as Manager
THEN I should have access to:
  - /projects/* (project management)
  - /business-planning/* (planning routes)
  - /operations/* (operations routes)
BUT NOT:
  - /admin/users (user management)
  - /admin/roles (role management)
```

#### Test: Viewer Access Restrictions
```
GIVEN I am logged in as Viewer
WHEN I try to access /projects/new
THEN I should see "Access Denied" or be redirected
AND I should only have read access to projects
```

---

## API Endpoint Tests

### Test: SWOT API - GET
```
GET /api/business-planning/swot?year=2026
Expected Response: 200 OK
Body: { id, year, strengths[], weaknesses[], opportunities[], threats[], strategies[] }
```

### Test: SWOT API - POST (Create/Update)
```
POST /api/business-planning/swot
Body: {
  year: 2026,
  strengths: ["Strong market position"],
  weaknesses: ["Limited digital presence"],
  opportunities: ["Growing construction sector"],
  threats: ["Economic uncertainty"],
  strategies: ["Digital transformation"]
}
Expected Response: 200 OK
Body: { id, year, ...all fields }
```

### Test: Financial Sync API
```
POST /api/financial/sync
Expected Response: 200 OK
Body: { message: "Sync completed", recordsProcessed: number }
```

---

## Performance Tests

### Test: Dashboard Load Time
```
GIVEN I am logged in
WHEN I navigate to /dashboard
THEN the page should load within 2 seconds
AND all widgets should render within 3 seconds
```

### Test: Large Project List
```
GIVEN there are 100+ projects in the system
WHEN I navigate to /projects
THEN the list should load within 3 seconds
AND pagination should work smoothly
```

---

## Mobile Responsiveness Tests

### Test: Mobile Navigation
```
GIVEN I am on a mobile device (viewport 375x667)
WHEN I navigate to any page
THEN the sidebar should be collapsed
AND I should see a hamburger menu icon
WHEN I click the menu icon
THEN the sidebar should slide in from the left
```

### Test: Mobile Forms
```
GIVEN I am on mobile
WHEN I fill out a form (e.g., create project)
THEN all form fields should be easily tappable
AND the keyboard should not obscure input fields
AND buttons should be large enough for touch (min 44x44px)
```

---

## Error Handling Tests

### Test: Network Error Handling
```
GIVEN I am on /projects
WHEN the network connection is lost
AND I try to save a project
THEN I should see an error message "Network error. Please check your connection."
AND the form data should be preserved
```

### Test: 500 Error Handling
```
GIVEN the API returns a 500 error
WHEN I try to load /business-planning/swot
THEN I should see a user-friendly error message
AND the error should be logged to the server (using logger, not console)
```

---

## TestSprite Usage Instructions

### Running Tests with TestSprite MCP

Since you have TestSprite configured in your MCP settings, you can use it to run these tests:

1. **Start your dev server:**
   ```bash
   npm run dev
   ```

2. **Access TestSprite through Windsurf:**
   - TestSprite should be available as an MCP tool
   - You can reference these test scenarios
   - TestSprite will execute browser-based E2E tests

3. **Test Execution:**
   - TestSprite can navigate your application
   - Fill forms, click buttons, verify UI elements
   - Check API responses and network requests
   - Validate data persistence

4. **Priority Test Order:**
   1. Authentication & Session (critical)
   2. SWOT Analysis (recently fixed - verify fixes)
   3. Project Management (core workflow)
   4. Financial Reporting (complex integration)
   5. RBAC (security critical)

---

## Test Data Requirements

Before running tests, ensure:
- ✅ Database is seeded with test data
- ✅ At least one Admin user exists
- ✅ At least one test project exists
- ✅ Dolibarr connection is configured (for financial tests)
- ✅ Test environment variables are set in `.env`

---

## Expected Test Coverage

- **Authentication:** 100% (critical path)
- **SWOT Analysis:** 100% (recently fixed)
- **Project CRUD:** 90%
- **Financial Reports:** 80%
- **Document Management:** 70%
- **Notifications:** 80%
- **RBAC:** 100% (security critical)

---

## Notes

- All tests should use the `logger` for error tracking (not `console.log`)
- API routes must use `withApiContext` wrapper
- All database queries must filter `deletedAt: null` for soft-deleted entities
- Session timeout is 2 hours with 5-minute warning
- Base path is `/ots` in production (`NEXT_PUBLIC_BASE_PATH`)

---

**Last Updated:** March 14, 2026  
**Version:** 15.20.1
