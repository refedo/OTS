/**
 * KPI Event Hooks
 * 
 * Functions to trigger KPI recalculation when source data changes
 */

import prisma from '@/lib/db';
import { calculateAndStoreKPI, getPeriodDates } from './calculator';

/**
 * Recalculate production-related KPIs for a project
 */
export async function recalculateProductionKPIs(projectId: string) {
  try {
    console.log(`🔄 Recalculating production KPIs for project ${projectId}...`);

    // Get all active production-related KPIs
    const kpis = await prisma.kPIDefinition.findMany({
      where: {
        isActive: true,
        calculationType: 'auto',
        OR: [
          { sourceModules: { array_contains: 'production' } },
          { code: { startsWith: 'PROD_' } },
        ],
      },
    });

    if (kpis.length === 0) {
      console.log('⏭️  No production KPIs found');
      return;
    }

    // Recalculate each KPI
    for (const kpi of kpis) {
      const { periodStart, periodEnd } = getPeriodDates(kpi.frequency);
      
      try {
        await calculateAndStoreKPI(kpi.id, 'project', projectId, periodStart, periodEnd);
        console.log(`✓ Recalculated ${kpi.code} for project`);
      } catch (error) {
        console.error(`✗ Failed to recalculate ${kpi.code}:`, error);
      }
    }

    console.log(`✅ Production KPIs recalculated for project ${projectId}`);
  } catch (error) {
    console.error('Error recalculating production KPIs:', error);
  }
}

/**
 * Recalculate QC-related KPIs for a project
 */
export async function recalculateQCKPIs(projectId: string) {
  try {
    console.log(`🔄 Recalculating QC KPIs for project ${projectId}...`);

    // Get all active QC-related KPIs
    const kpis = await prisma.kPIDefinition.findMany({
      where: {
        isActive: true,
        calculationType: 'auto',
        OR: [
          { sourceModules: { array_contains: 'qc' } },
          { code: { startsWith: 'QC_' } },
        ],
      },
    });

    if (kpis.length === 0) {
      console.log('⏭️  No QC KPIs found');
      return;
    }

    // Recalculate each KPI
    for (const kpi of kpis) {
      const { periodStart, periodEnd } = getPeriodDates(kpi.frequency);
      
      try {
        await calculateAndStoreKPI(kpi.id, 'project', projectId, periodStart, periodEnd);
        console.log(`✓ Recalculated ${kpi.code} for project`);
      } catch (error) {
        console.error(`✗ Failed to recalculate ${kpi.code}:`, error);
      }
    }

    console.log(`✅ QC KPIs recalculated for project ${projectId}`);
  } catch (error) {
    console.error('Error recalculating QC KPIs:', error);
  }
}

/**
 * Recalculate project-related KPIs
 */
export async function recalculateProjectKPIs(projectId: string) {
  try {
    console.log(`🔄 Recalculating project KPIs for project ${projectId}...`);

    // Get all active project-related KPIs
    const kpis = await prisma.kPIDefinition.findMany({
      where: {
        isActive: true,
        calculationType: 'auto',
        OR: [
          { sourceModules: { array_contains: 'projects' } },
          { code: { startsWith: 'PROJECT_' } },
          { code: { startsWith: 'PLANNING_' } },
        ],
      },
    });

    if (kpis.length === 0) {
      console.log('⏭️  No project KPIs found');
      return;
    }

    // Recalculate each KPI
    for (const kpi of kpis) {
      const { periodStart, periodEnd } = getPeriodDates(kpi.frequency);
      
      try {
        await calculateAndStoreKPI(kpi.id, 'project', projectId, periodStart, periodEnd);
        console.log(`✓ Recalculated ${kpi.code} for project`);
      } catch (error) {
        console.error(`✗ Failed to recalculate ${kpi.code}:`, error);
      }
    }

    console.log(`✅ Project KPIs recalculated for project ${projectId}`);
  } catch (error) {
    console.error('Error recalculating project KPIs:', error);
  }
}

/**
 * Recalculate all KPIs for a department
 */
export async function recalculateDepartmentKPIs(departmentId: string) {
  try {
    console.log(`🔄 Recalculating KPIs for department ${departmentId}...`);

    // Get all active KPIs
    const kpis = await prisma.kPIDefinition.findMany({
      where: {
        isActive: true,
        calculationType: 'auto',
      },
    });

    if (kpis.length === 0) {
      console.log('⏭️  No KPIs found');
      return;
    }

    // Recalculate each KPI
    for (const kpi of kpis) {
      const { periodStart, periodEnd } = getPeriodDates(kpi.frequency);
      
      try {
        await calculateAndStoreKPI(kpi.id, 'department', departmentId, periodStart, periodEnd);
        console.log(`✓ Recalculated ${kpi.code} for department`);
      } catch (error) {
        console.error(`✗ Failed to recalculate ${kpi.code}:`, error);
      }
    }

    console.log(`✅ KPIs recalculated for department ${departmentId}`);
  } catch (error) {
    console.error('Error recalculating department KPIs:', error);
  }
}

/**
 * Recalculate company-wide KPIs
 */
export async function recalculateCompanyKPIs() {
  try {
    console.log(`🔄 Recalculating company-wide KPIs...`);

    // Get all active KPIs
    const kpis = await prisma.kPIDefinition.findMany({
      where: {
        isActive: true,
        calculationType: 'auto',
      },
    });

    if (kpis.length === 0) {
      console.log('⏭️  No KPIs found');
      return;
    }

    // Recalculate each KPI
    for (const kpi of kpis) {
      const { periodStart, periodEnd } = getPeriodDates(kpi.frequency);
      
      try {
        await calculateAndStoreKPI(kpi.id, 'company', null, periodStart, periodEnd);
        console.log(`✓ Recalculated ${kpi.code} for company`);
      } catch (error) {
        console.error(`✗ Failed to recalculate ${kpi.code}:`, error);
      }
    }

    console.log(`✅ Company-wide KPIs recalculated`);
  } catch (error) {
    console.error('Error recalculating company KPIs:', error);
  }
}
