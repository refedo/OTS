# Hexa Steel OTS - Upgrade Checklist

Use this checklist for every deployment to ensure smooth upgrades.

## Pre-Deployment Checklist

### 1. Code Review
- [ ] All code changes reviewed and approved
- [ ] No console.log or debug statements in production code
- [ ] All TypeScript errors resolved
- [ ] Tests passing locally

### 2. Database
- [ ] Prisma schema changes reviewed
- [ ] Migration tested in development
- [ ] Backup plan in place
- [ ] Migration rollback tested

### 3. Environment
- [ ] Environment variables updated
- [ ] Secrets rotated if needed
- [ ] Configuration files updated

### 4. Dependencies
- [ ] Package.json updated
- [ ] Security vulnerabilities checked (npm audit)
- [ ] Breaking changes reviewed

## Deployment Steps

### 1. Backup
- [ ] Database backup created
- [ ] Current version documented
- [ ] Git commit hash recorded

### 2. Deploy
- [ ] Code pushed to repository
- [ ] GitHub Actions completed successfully
- [ ] Migrations applied
- [ ] Application restarted

### 3. Verification
- [ ] Health check passing
- [ ] Critical features tested
- [ ] No errors in logs
- [ ] Performance acceptable

## Post-Deployment

### 1. Monitoring (First 24 Hours)
- [ ] Error rates normal
- [ ] Response times acceptable
- [ ] Database performance good
- [ ] User reports reviewed

### 2. Documentation
- [ ] Deployment recorded in system_versions
- [ ] Release notes updated
- [ ] Team notified

### 3. Cleanup
- [ ] Old backups archived
- [ ] Temporary files removed
- [ ] Logs reviewed

## Rollback Plan

If issues detected:
- [ ] Stop deployment
- [ ] Run rollback script
- [ ] Restore database if needed
- [ ] Notify team
- [ ] Document issues

## Emergency Contacts

- System Admin: admin@hexasteel.com
- Database Admin: dba@hexasteel.com
- Digital Ocean Support: https://cloud.digitalocean.com/support
