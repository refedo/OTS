import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET - Fetch Dashboard Data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');
    const currentYear = year ? parseInt(year) : new Date().getFullYear();

    // Fetch Objectives for the year
    const objectives = await prisma.companyObjective.findMany({
      where: { year: currentYear },
      include: {
        keyResults: true,
        _count: { select: { initiatives: true } },
      },
    });

    // Fetch Initiatives for the year
    const initiatives = await prisma.annualInitiative.findMany({
      where: { year: currentYear },
      include: {
        department: { select: { name: true } },
      },
    });

    // Fetch BSC KPIs for the year
    const bscKPIs = await prisma.balancedScorecardKPI.findMany({
      where: { year: currentYear },
      include: {
        measurements: {
          orderBy: { recordedDate: 'desc' },
          take: 1,
        },
      },
    });

    // Fetch Department Plans
    const departmentPlans = await prisma.departmentPlan.findMany({
      where: { year: currentYear },
      include: {
        department: { select: { name: true } },
        objectives: true,
        kpis: true,
        initiatives: true,
      },
    });

    // Calculate OKR Progress
    const objectiveStats = {
      total: objectives.length,
      notStarted: objectives.filter((o) => o.status === 'Not Started').length,
      onTrack: objectives.filter((o) => o.status === 'On Track').length,
      atRisk: objectives.filter((o) => o.status === 'At Risk').length,
      behind: objectives.filter((o) => o.status === 'Behind').length,
      completed: objectives.filter((o) => o.status === 'Completed').length,
      avgProgress:
        objectives.reduce((sum, o) => sum + o.progress, 0) /
        (objectives.length || 1),
    };

    // Calculate Key Results Progress
    const allKeyResults = objectives.flatMap((o) => o.keyResults);
    const keyResultStats = {
      total: allKeyResults.length,
      completed: allKeyResults.filter((kr) => kr.status === 'Completed').length,
      onTrack: allKeyResults.filter((kr) => kr.status === 'On Track').length,
      atRisk: allKeyResults.filter((kr) => kr.status === 'At Risk').length,
      behind: allKeyResults.filter((kr) => kr.status === 'Behind').length,
      avgCompletion:
        allKeyResults.reduce((sum, kr) => sum + (kr.currentValue / kr.targetValue) * 100, 0) /
        (allKeyResults.length || 1),
    };

    // Calculate Initiative Stats
    const initiativeStats = {
      total: initiatives.length,
      planned: initiatives.filter((i) => i.status === 'Planned').length,
      inProgress: initiatives.filter((i) => i.status === 'In Progress').length,
      onHold: initiatives.filter((i) => i.status === 'On Hold').length,
      completed: initiatives.filter((i) => i.status === 'Completed').length,
      cancelled: initiatives.filter((i) => i.status === 'Cancelled').length,
      avgProgress:
        initiatives.reduce((sum, i) => sum + i.progress, 0) /
        (initiatives.length || 1),
      totalBudget: initiatives.reduce((sum, i) => sum + (i.budget || 0), 0),
    };

    // Calculate BSC KPI Stats by Category
    const bscStats = {
      financial: {
        total: bscKPIs.filter((k) => k.category === 'Financial').length,
        onTrack: bscKPIs.filter((k) => k.category === 'Financial' && k.status === 'On Track').length,
        atRisk: bscKPIs.filter((k) => k.category === 'Financial' && k.status === 'At Risk').length,
        behind: bscKPIs.filter((k) => k.category === 'Financial' && k.status === 'Behind').length,
      },
      customer: {
        total: bscKPIs.filter((k) => k.category === 'Customer').length,
        onTrack: bscKPIs.filter((k) => k.category === 'Customer' && k.status === 'On Track').length,
        atRisk: bscKPIs.filter((k) => k.category === 'Customer' && k.status === 'At Risk').length,
        behind: bscKPIs.filter((k) => k.category === 'Customer' && k.status === 'Behind').length,
      },
      internalProcess: {
        total: bscKPIs.filter((k) => k.category === 'Internal Process').length,
        onTrack: bscKPIs.filter((k) => k.category === 'Internal Process' && k.status === 'On Track').length,
        atRisk: bscKPIs.filter((k) => k.category === 'Internal Process' && k.status === 'At Risk').length,
        behind: bscKPIs.filter((k) => k.category === 'Internal Process' && k.status === 'Behind').length,
      },
      learningGrowth: {
        total: bscKPIs.filter((k) => k.category === 'Learning & Growth').length,
        onTrack: bscKPIs.filter((k) => k.category === 'Learning & Growth' && k.status === 'On Track').length,
        atRisk: bscKPIs.filter((k) => k.category === 'Learning & Growth' && k.status === 'At Risk').length,
        behind: bscKPIs.filter((k) => k.category === 'Learning & Growth' && k.status === 'Behind').length,
      },
    };

    // Department Performance
    const departmentPerformance = departmentPlans.map((dp) => ({
      departmentName: dp.department.name,
      objectives: dp.objectives.length,
      kpis: dp.kpis.length,
      initiatives: dp.initiatives.length,
      objectivesCompleted: dp.objectives.filter((o) => o.status === 'Completed').length,
      initiativesCompleted: dp.initiatives.filter((i) => i.status === 'Completed').length,
    }));

    // Weekly Issues Summary
    const weeklyIssues = await prisma.weeklyIssue.findMany({
      where: {
        createdAt: {
          gte: new Date(new Date().setDate(new Date().getDate() - 30)), // Last 30 days
        },
      },
      select: {
        status: true,
        priority: true,
      },
    });

    const issueStats = {
      total: weeklyIssues.length,
      open: weeklyIssues.filter((i) => i.status === 'Open').length,
      inProgress: weeklyIssues.filter((i) => i.status === 'In Progress').length,
      resolved: weeklyIssues.filter((i) => i.status === 'Resolved').length,
      critical: weeklyIssues.filter((i) => i.priority === 'Critical').length,
      high: weeklyIssues.filter((i) => i.priority === 'High').length,
    };

    return NextResponse.json({
      year: currentYear,
      objectiveStats,
      keyResultStats,
      initiativeStats,
      bscStats,
      departmentPerformance,
      issueStats,
      objectives,
      initiatives,
      bscKPIs,
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
