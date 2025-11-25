# Phase 1 QC Modules - Database Migration

## Database Schema Changes

### New Tables Added:
1. **MaterialInspection** - Incoming material inspection records
2. **WeldingInspection** - Welding quality control records
3. **DimensionalInspection** - Dimensional accuracy checks
4. **NDTInspection** - Non-destructive testing records

### Relations Added:
- User model: 4 new relations (materialInspections, weldingInspections, dimensionalInspections, ndtInspections)
- Project model: 4 new relations
- Building model: 3 new relations (welding, dimensional, NDT)
- ProductionLog model: 3 new relations (welding, dimensional, NDT)

## Migration Steps

### 1. Run Prisma Migration

```bash
# Generate migration
npx prisma migrate dev --name add_qc_specialized_modules

# This will:
# - Create 4 new tables
# - Add foreign key constraints
# - Create indexes
# - Update relations
```

### 2. Verify Migration

```bash
# Check migration status
npx prisma migrate status

# View database
npx prisma studio
```

### 3. Seed Data (Optional)

If you want to add sample inspection records for testing, create a seed script.

## Rollback Plan

If you need to rollback:

```bash
# Rollback last migration
npx prisma migrate resolve --rolled-back <migration_name>

# Or manually drop tables
DROP TABLE IF EXISTS NDTInspection;
DROP TABLE IF EXISTS DimensionalInspection;
DROP TABLE IF EXISTS WeldingInspection;
DROP TABLE IF EXISTS MaterialInspection;
```

## Notes

- ✅ No breaking changes to existing tables
- ✅ RFI and NCR tables unchanged
- ✅ Production logs unchanged
- ✅ All new tables are independent
- ✅ Foreign keys properly configured with CASCADE/SET NULL

## Next Steps After Migration

1. Create API routes for each module
2. Create UI pages for each module
3. Update QC dashboard with tabs
4. Test integration with production logs
