# 🎯 Initiatives Module - Quick Reference Card

## 🚀 **What's Live NOW**

✅ **Database:** 3 models (Initiative, Milestone, Task)  
✅ **API:** 12 endpoints (full CRUD + dashboard)  
✅ **UI:** List page with filters at `/initiatives`  
✅ **Navigation:** Added to sidebar under "Initiatives"  
✅ **Docs:** Complete documentation available  

---

## 📍 **Access Points**

| What | Where | Status |
|------|-------|--------|
| List Page | `/initiatives` | ✅ LIVE |
| Create Form | `/initiatives/new` | ⏳ TO BUILD |
| Detail Page | `/initiatives/:id` | ⏳ TO BUILD |
| Dashboard | `/initiatives/dashboard` | ⏳ TO BUILD |
| API Docs | `/docs/features/INITIATIVES_MODULE.md` | ✅ LIVE |

---

## 🔌 **API Quick Reference**

```bash
# List all initiatives
GET /api/initiatives?status=In Progress&category=Digital

# Create initiative (Admin/Manager)
POST /api/initiatives
Body: { name, ownerId, category, priority, startDate, endDate }

# Get details
GET /api/initiatives/{id}

# Update (Admin/Manager)
PATCH /api/initiatives/{id}
Body: { status: "Completed", progress: 100 }

# Delete (Admin only)
DELETE /api/initiatives/{id}

# Add milestone
POST /api/initiatives/{id}/milestones
Body: { name, plannedDate, responsibleId }

# Update milestone
PATCH /api/initiatives/{id}/milestones/{mid}
Body: { progress: 75, status: "In Progress" }

# Add task
POST /api/initiatives/{id}/tasks
Body: { taskName, assignedTo, endDate }

# Dashboard data
GET /api/initiatives/dashboard?departmentId=xyz
```

---

## 🎨 **UI Components Available**

✅ `InitiativesClient` - List view with filters  
✅ `Progress` - Progress bar component  
✅ Status badges (5 colors)  
✅ Priority badges (4 colors)  
⏳ Initiative form (to build)  
⏳ Detail dashboard (to build)  
⏳ Milestone timeline (to build)  

---

## 📊 **Data Models**

### **Initiative**
```typescript
{
  id: string
  initiativeNumber: string  // INIT-2025-001
  name: string
  category: string?         // 8 predefined categories
  status: string            // Planned | In Progress | On Hold | Completed | Cancelled
  priority: string          // Low | Medium | High | Critical
  progress: number          // 0-100 (auto-calculated)
  ownerId: string
  departmentId: string?
  startDate: Date?
  endDate: Date?
  budget: number?
  kpiImpact: JSON?          // Array of KPI IDs
}
```

### **Milestone**
```typescript
{
  id: string
  initiativeId: string
  name: string
  plannedDate: Date?
  actualDate: Date?
  progress: number          // 0-100
  status: string            // Pending | In Progress | Completed | Delayed
  responsibleId: string?
}
```

### **Task**
```typescript
{
  id: string
  initiativeId: string
  taskName: string
  assignedTo: string?
  startDate: Date?
  endDate: Date?
  status: string            // Pending | In Progress | Completed
  progress: number          // 0-100
}
```

---

## 🔐 **Permissions Matrix**

| Action | Admin | Manager | Employee |
|--------|-------|---------|----------|
| View All | ✅ | ✅ | ✅ |
| Create | ✅ | ✅ | ❌ |
| Edit | ✅ | ✅* | ❌ |
| Delete | ✅ | ❌ | ❌ |
| Add Milestone | ✅ | ✅* | ❌ |
| Add Task | ✅ | ✅* | ❌ |

*Managers: Own department only

---

## 🎯 **Categories**

1. Digital Transformation
2. Lean Management
3. AI & Automation
4. Human Capital Development
5. Knowledge & Learning
6. Factory Optimization
7. Sustainability & Green Building
8. Operational Excellence

---

## 📈 **Progress Calculation**

```
Initiative Progress = (Milestone Avg + Task Avg) / 2

Example:
- 3 Milestones: 100%, 75%, 50% → Avg: 75%
- 4 Tasks: 100%, 100%, 50%, 25% → Avg: 68.75%
- Initiative: (75 + 68.75) / 2 = 71.875% ≈ 72%
```

**Auto-updates when:**
- Milestone created/updated/deleted
- Task created/updated/deleted

---

## 🛠️ **Quick Commands**

### **Create Test Initiative**
```bash
curl -X POST http://localhost:3000/api/initiatives \
  -H "Content-Type: application/json" \
  -H "Cookie: ots_session=YOUR_TOKEN" \
  -d '{
    "name": "Test Initiative",
    "category": "Digital Transformation",
    "ownerId": "USER_UUID",
    "priority": "High",
    "startDate": "2025-01-01",
    "endDate": "2025-12-31"
  }'
```

### **View in Browser**
```
http://localhost:3000/initiatives
```

### **Check Database**
```sql
SELECT * FROM Initiative;
SELECT * FROM InitiativeMilestone;
SELECT * FROM InitiativeTask;
```

---

## 📝 **Next Steps**

### **For Development:**
1. Build `/initiatives/new` form
2. Build `/initiatives/:id` detail page
3. Build `/initiatives/dashboard` analytics
4. Add milestone timeline view
5. Add task management UI

### **For Testing:**
1. Create initiatives via API
2. Add milestones and tasks
3. Test progress calculation
4. Verify permissions
5. Check filters work

### **For Production:**
1. Complete UI pages
2. Add notifications
3. Write tests
4. User training
5. Deploy

---

## 📚 **Documentation**

- **Full Docs:** `/docs/features/INITIATIVES_MODULE.md`
- **Setup Guide:** `/docs/INITIATIVES_SETUP.md`
- **Summary:** `/INITIATIVES_MODULE_SUMMARY.md`
- **This Card:** `/INITIATIVES_QUICK_REF.md`

---

## 🎨 **Color Codes**

### **Status**
- 🔵 Planned (Gray)
- 🔵 In Progress (Blue)
- 🟡 On Hold (Yellow)
- 🟢 Completed (Green)
- 🔴 Cancelled (Red)

### **Priority**
- ⚪ Low (Gray)
- 🟠 Medium (Orange)
- 🔴 High (Red)
- 🟣 Critical (Purple)

---

## ⚡ **Pro Tips**

1. **Initiative Numbers** auto-generate - don't create manually
2. **Progress** auto-calculates - update milestones/tasks instead
3. **KPI Impact** stored as JSON - flexible for multiple KPIs
4. **Filters** persist in URL - shareable links
5. **Permissions** enforced at API level - UI respects them

---

## 🐛 **Troubleshooting**

**Can't see initiatives?**
- Check you're logged in
- Verify database has data
- Check API endpoint works

**Can't create initiative?**
- Must be Admin or Manager
- Check all required fields
- Verify ownerId exists

**Progress not updating?**
- Check milestones/tasks exist
- Verify progress values 0-100
- API auto-calculates on changes

---

## 📞 **Support**

**Issues?** Check `/docs/features/INITIATIVES_MODULE.md`  
**Questions?** Review API endpoint documentation  
**Bugs?** Check browser console and network tab  

---

**Last Updated:** January 18, 2025  
**Version:** 1.0  
**Status:** 🟢 Core Complete | 🟡 UI In Progress
