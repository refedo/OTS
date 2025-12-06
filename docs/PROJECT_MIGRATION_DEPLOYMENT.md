# Project Migration Module - Deployment Checklist

## Pre-Deployment Checklist

### ✅ Code Review
- [ ] All TypeScript files compile without errors
- [ ] No console.log statements in production code
- [ ] Error handling implemented for all API routes
- [ ] Rate limiting configured correctly
- [ ] File size limits appropriate for production

### ✅ Database
- [ ] Prisma schema includes all required fields
- [ ] Database migrations applied
- [ ] Test data cleaned from production database
- [ ] Database indexes optimized for queries

### ✅ Security
- [ ] JWT_SECRET environment variable set
- [ ] Role-based access control tested
- [ ] File upload validation working
- [ ] Rate limiting tested
- [ ] CORS configured if needed

### ✅ Testing
- [ ] Unit tests passing
- [ ] Manual testing completed
- [ ] Import with valid data tested
- [ ] Import with invalid data tested
- [ ] Export functionality tested
- [ ] Rate limiting tested
- [ ] Large file handling tested

### ✅ Documentation
- [ ] README files created
- [ ] API documentation complete
- [ ] User guide available
- [ ] Quick start guide ready

---

## Deployment Steps

### 1. Environment Setup

Ensure these environment variables are set:

```bash
DATABASE_URL="mysql://user:password@host:port/database"
JWT_SECRET="your-secure-jwt-secret"
```

### 2. Install Dependencies

```bash
npm install
```

The following packages are already in package.json:
- `xlsx` - Excel file handling
- `zod` - Data validation
- `@prisma/client` - Database ORM

### 3. Build Application

```bash
npm run build
```

### 4. Database Migration

```bash
npx prisma generate
npx prisma migrate deploy
```

### 5. Start Application

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm run start
```

---

## Post-Deployment Verification

### ✅ Functional Tests

1. **Authentication**
   - [ ] Login as Admin user
   - [ ] Login as PMO user
   - [ ] Verify non-admin users cannot access

2. **Template Download**
   - [ ] Navigate to `/projects/migration`
   - [ ] Click "Download Empty Template"
   - [ ] Verify Excel file downloads
   - [ ] Open file and verify structure

3. **Export All Projects**
   - [ ] Click "Download All Projects"
   - [ ] Verify Excel file downloads
   - [ ] Open file and verify data
   - [ ] Check both Projects and Buildings sheets

4. **Import Projects**
   - [ ] Upload valid Excel file
   - [ ] Verify success message
   - [ ] Check database for new projects
   - [ ] Verify buildings created

5. **Error Handling**
   - [ ] Upload invalid file type
   - [ ] Upload oversized file
   - [ ] Upload file with errors
   - [ ] Verify error messages display

6. **Rate Limiting**
   - [ ] Upload 10 files successfully
   - [ ] Verify 11th upload is blocked
   - [ ] Check rate limit message

### ✅ Performance Tests

- [ ] Upload file with 100+ projects
- [ ] Export 100+ projects
- [ ] Verify response times acceptable
- [ ] Check server memory usage

### ✅ Security Tests

- [ ] Attempt access without authentication
- [ ] Attempt access with non-admin role
- [ ] Upload malicious file types
- [ ] Verify all rejected appropriately

---

## Monitoring

### Key Metrics to Monitor

1. **API Response Times**
   - `/api/projects/import` - Should complete in <30s for 100 projects
   - `/api/projects/export` - Should complete in <10s for 100 projects

2. **Error Rates**
   - Monitor 400 errors (validation failures)
   - Monitor 500 errors (server errors)
   - Monitor 429 errors (rate limiting)

3. **File Upload Stats**
   - Number of successful imports
   - Number of failed imports
   - Average file size
   - Peak usage times

### Logging

Check logs for:
- Import errors: `Import error:`
- Export errors: `Export error:`
- Rate limit hits: `Rate limit exceeded`
- Validation failures: `Validation failed`

---

## Rollback Plan

If issues occur after deployment:

1. **Immediate Rollback**
   ```bash
   git revert <commit-hash>
   npm run build
   npm run start
   ```

2. **Database Rollback** (if needed)
   ```bash
   npx prisma migrate resolve --rolled-back <migration-name>
   ```

3. **Disable Feature**
   - Remove route from navigation
   - Add maintenance message to page

---

## User Communication

### Announcement Template

```
Subject: New Feature: Project Migration & Excel Upload

Dear Team,

We're excited to announce a new feature in the OTS system:

**Project Migration & Excel Upload Module**

This feature allows you to:
- Import projects from Excel files
- Export existing projects to Excel
- Download templates for easy data entry

**Who can access:**
- Admin and PMO users only

**How to access:**
Navigate to: Projects > Migration

**Documentation:**
- Quick Start Guide: [link]
- Full Documentation: [link]

**Support:**
Contact IT support for assistance.

Best regards,
IT Team
```

---

## Training Materials

### Quick Training Session (15 minutes)

1. **Introduction** (2 min)
   - Purpose of the module
   - Who can use it

2. **Demo: Export** (3 min)
   - Show export all projects
   - Open Excel file
   - Explain structure

3. **Demo: Import** (5 min)
   - Download template
   - Fill in sample data
   - Upload and import
   - Show validation

4. **Error Handling** (3 min)
   - Show common errors
   - How to fix them

5. **Q&A** (2 min)

### Training Checklist

- [ ] Schedule training session
- [ ] Prepare sample data
- [ ] Test demo in advance
- [ ] Prepare FAQ document
- [ ] Record session for reference

---

## Maintenance

### Regular Tasks

**Weekly:**
- [ ] Review error logs
- [ ] Check rate limiting stats
- [ ] Monitor disk space (uploaded files)

**Monthly:**
- [ ] Review import/export usage
- [ ] Optimize database queries if needed
- [ ] Update documentation if needed

**Quarterly:**
- [ ] Review and update validation rules
- [ ] Check for library updates
- [ ] Performance optimization review

---

## Troubleshooting Guide

### Common Issues

**Issue: "Unauthorized" error**
- Check user is logged in
- Verify user has Admin or PMO role
- Check JWT token validity

**Issue: "Rate limit exceeded"**
- Wait for reset time
- Or reset manually in database
- Check if limit is too restrictive

**Issue: "File too large"**
- Check file size (max 10MB)
- Optimize Excel file (remove formatting)
- Split into multiple files

**Issue: Import fails silently**
- Check server logs
- Verify database connection
- Check Prisma client version

**Issue: Validation errors unclear**
- Review error messages
- Check row numbers in Excel
- Compare with template

---

## Success Criteria

The deployment is successful when:

- ✅ All functional tests pass
- ✅ No critical errors in logs
- ✅ Performance meets requirements
- ✅ Security tests pass
- ✅ Users can successfully import/export
- ✅ Documentation is accessible
- ✅ Support team is trained

---

## Contact Information

**Development Team:**
- Lead Developer: [Name]
- Email: [email]

**Support:**
- IT Support: [contact]
- Documentation: [link]

---

## Version Information

- **Module Version:** 1.0.0
- **Release Date:** 2024-11-29
- **Compatible OTS Version:** 1.x
- **Dependencies:** See package.json

---

## Sign-off

- [ ] Development Lead: _______________
- [ ] QA Lead: _______________
- [ ] Security Review: _______________
- [ ] Product Owner: _______________
- [ ] Deployment Date: _______________

**Deployment Status:** ⬜ Pending | ⬜ In Progress | ⬜ Complete | ⬜ Rolled Back
