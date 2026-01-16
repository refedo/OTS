import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[CEO Insights] Session role:', session.role);
    console.log('[CEO Insights] User ID:', session.sub);

    const user = await prisma.user.findUnique({
      where: { id: session.sub },
      include: { role: true },
    });

    console.log('[CEO Insights] User found:', user?.name);
    console.log('[CEO Insights] User role from DB:', user?.role?.name);

    // Check both session role and database role
    const isCEO = session.role === 'CEO' || user?.role?.name === 'CEO';
    
    if (!user || !isCEO) {
      console.log('[CEO Insights] Access denied - Session role:', session.role, 'DB role:', user?.role?.name);
      return NextResponse.json(
        { error: 'Access denied. CEO only.' },
        { status: 403 }
      );
    }

    console.log('[CEO Insights] Access granted for CEO:', user.name);

    // Fetch all backlog items
    const allItems = await prisma.productBacklogItem.findMany({
      include: {
        tasks: {
          select: {
            id: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    // Section 1: Strategic Snapshot
    const totalItems = allItems.length;
    const approvedItems = allItems.filter(item => 
      ['APPROVED', 'PLANNED', 'IN_PROGRESS', 'COMPLETED'].includes(item.status)
    ).length;
    const notApprovedItems = allItems.filter(item => 
      ['IDEA', 'UNDER_REVIEW'].includes(item.status)
    ).length;
    const highCriticalPriority = allItems.filter(item => 
      ['HIGH', 'CRITICAL'].includes(item.priority)
    ).length;
    const complianceItems = allItems.filter(item => item.complianceFlag).length;
    const techDebtItems = allItems.filter(item => item.type === 'TECH_DEBT').length;
    const techDebtPercentage = totalItems > 0 ? (techDebtItems / totalItems * 100).toFixed(1) : '0';

    // Section 2: Priority Radar
    const priorityRadar = allItems
      .filter(item => ['HIGH', 'CRITICAL'].includes(item.priority))
      .sort((a, b) => {
        const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      })
      .slice(0, 10)
      .map(item => ({
        id: item.id,
        code: item.code,
        title: item.title,
        priority: item.priority,
        status: item.status,
        riskLevel: item.riskLevel,
        type: item.type,
        category: item.category,
        hasNoTasks: item.tasks.length === 0,
        approvedButNotPlanned: item.status === 'APPROVED',
        inProgressTooLong: item.status === 'IN_PROGRESS' && 
          item.tasks.length > 0 && 
          item.tasks[0].createdAt < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days
      }));

    // Section 3: WHY Dashboard - Group by business reason themes
    const whyThemes = {
      'Reduce Delays': 0,
      'Increase Visibility': 0,
      'Compliance': 0,
      'Performance': 0,
      'Automation': 0,
      'Risk Reduction': 0,
      'Other': 0,
    };

    allItems.forEach(item => {
      const reason = (item.businessReason || '').toLowerCase();
      if (reason.includes('delay') || reason.includes('faster') || reason.includes('speed')) {
        whyThemes['Reduce Delays']++;
      } else if (reason.includes('visibility') || reason.includes('track') || reason.includes('monitor')) {
        whyThemes['Increase Visibility']++;
      } else if (reason.includes('compliance') || reason.includes('audit') || reason.includes('regulation')) {
        whyThemes['Compliance']++;
      } else if (reason.includes('performance') || reason.includes('optimize') || reason.includes('efficiency')) {
        whyThemes['Performance']++;
      } else if (reason.includes('automat') || reason.includes('manual') || reason.includes('reduce effort')) {
        whyThemes['Automation']++;
      } else if (reason.includes('risk') || reason.includes('prevent') || reason.includes('error')) {
        whyThemes['Risk Reduction']++;
      } else {
        whyThemes['Other']++;
      }
    });

    // Section 4: Investment Insight
    const investmentByCategory = {};
    const investmentByType = {};
    const investmentByModule = {};

    allItems.forEach(item => {
      // By category
      investmentByCategory[item.category] = (investmentByCategory[item.category] || 0) + 1;
      
      // By type
      investmentByType[item.type] = (investmentByType[item.type] || 0) + 1;
      
      // By module
      const modules = item.affectedModules as string[];
      modules.forEach(module => {
        investmentByModule[module] = (investmentByModule[module] || 0) + 1;
      });
    });

    const categoryPercentages = Object.entries(investmentByCategory).map(([key, value]) => ({
      category: key,
      count: value,
      percentage: totalItems > 0 ? ((value as number) / totalItems * 100).toFixed(1) : '0',
    }));

    const typePercentages = Object.entries(investmentByType).map(([key, value]) => ({
      type: key,
      count: value,
      percentage: totalItems > 0 ? ((value as number) / totalItems * 100).toFixed(1) : '0',
    }));

    const modulePercentages = Object.entries(investmentByModule)
      .sort((a, b) => (b[1] as number) - (a[1] as number))
      .map(([key, value]) => ({
        module: key,
        count: value,
        percentage: totalItems > 0 ? ((value as number) / totalItems * 100).toFixed(1) : '0',
      }));

    // Section 5: Silent Operations Health
    const automationItems = allItems.filter(item => 
      (item.businessReason || '').toLowerCase().includes('automat') ||
      (item.businessReason || '').toLowerCase().includes('manual') ||
      item.type === 'PERFORMANCE'
    ).length;

    const visibilityItems = allItems.filter(item =>
      (item.businessReason || '').toLowerCase().includes('visibility') ||
      (item.businessReason || '').toLowerCase().includes('track') ||
      (item.businessReason || '').toLowerCase().includes('predict')
    ).length;

    const silentOpsHealth = {
      automationPercentage: totalItems > 0 ? (automationItems / totalItems * 100).toFixed(1) : '0',
      visibilityPercentage: totalItems > 0 ? (visibilityItems / totalItems * 100).toFixed(1) : '0',
      manualReductionFocus: automationItems,
    };

    return NextResponse.json({
      strategicSnapshot: {
        totalItems,
        approvedItems,
        notApprovedItems,
        highCriticalPriority,
        complianceItems,
        techDebtPercentage,
      },
      priorityRadar,
      whyDashboard: whyThemes,
      investmentInsight: {
        byCategory: categoryPercentages,
        byType: typePercentages,
        byModule: modulePercentages,
      },
      silentOperationsHealth: silentOpsHealth,
    });
  } catch (error) {
    console.error('Error fetching CEO insights:', error);
    return NextResponse.json(
      { error: 'Failed to fetch CEO insights' },
      { status: 500 }
    );
  }
}
