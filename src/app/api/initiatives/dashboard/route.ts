import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifySession } from '@/lib/jwt';

// GET /api/initiatives/dashboard - Get analytics summary
export async function GET(request: NextRequest) {
  try {
    const cookieName = process.env.COOKIE_NAME || 'ots_session';
    const token = request.cookies.get(cookieName)?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = verifySession(token);
    if (!session) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    // Get query parameters for filtering
    const { searchParams } = new URL(request.url);
    const departmentId = searchParams.get('departmentId');
    const ownerId = searchParams.get('ownerId');
    const category = searchParams.get('category');

    // Build where clause
    const where: any = {};
    if (departmentId) where.departmentId = departmentId;
    if (ownerId) where.ownerId = ownerId;
    if (category) where.category = category;

    // Get all initiatives with filters
    const initiatives = await prisma.initiative.findMany({
      where,
      include: {
        owner: {
          select: { id: true, name: true },
        },
        department: {
          select: { id: true, name: true },
        },
        milestones: true,
        tasks: true,
      },
    });

    // Calculate statistics
    const totalInitiatives = initiatives.length;
    
    // Count by status
    const byStatus = initiatives.reduce((acc: any, init) => {
      acc[init.status] = (acc[init.status] || 0) + 1;
      return acc;
    }, {});

    // Count by category
    const byCategory = initiatives.reduce((acc: any, init) => {
      const cat = init.category || 'Uncategorized';
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {});

    // Count by priority
    const byPriority = initiatives.reduce((acc: any, init) => {
      acc[init.priority] = (acc[init.priority] || 0) + 1;
      return acc;
    }, {});

    // Average completion percentage
    const averageCompletion = initiatives.length > 0
      ? initiatives.reduce((sum, init) => sum + (init.progress || 0), 0) / initiatives.length
      : 0;

    // Top 5 initiatives by progress
    const topInitiatives = [...initiatives]
      .sort((a, b) => (b.progress || 0) - (a.progress || 0))
      .slice(0, 5)
      .map(init => ({
        id: init.id,
        initiativeNumber: init.initiativeNumber,
        name: init.name,
        progress: init.progress,
        status: init.status,
        owner: init.owner,
      }));

    // Delayed initiatives (past end date and not completed)
    const today = new Date();
    const delayedInitiatives = initiatives
      .filter(init => 
        init.endDate && 
        new Date(init.endDate) < today && 
        init.status !== 'Completed' &&
        init.status !== 'Cancelled'
      )
      .map(init => ({
        id: init.id,
        initiativeNumber: init.initiativeNumber,
        name: init.name,
        endDate: init.endDate,
        status: init.status,
        owner: init.owner,
        daysOverdue: Math.floor((today.getTime() - new Date(init.endDate!).getTime()) / (1000 * 60 * 60 * 24)),
      }));

    // Initiatives by department
    const byDepartment = initiatives.reduce((acc: any, init) => {
      const dept = init.department?.name || 'No Department';
      acc[dept] = (acc[dept] || 0) + 1;
      return acc;
    }, {});

    // Budget summary
    const totalBudget = initiatives.reduce((sum, init) => sum + (init.budget || 0), 0);
    const budgetByStatus = initiatives.reduce((acc: any, init) => {
      if (!acc[init.status]) acc[init.status] = 0;
      acc[init.status] += init.budget || 0;
      return acc;
    }, {});

    // Milestone statistics
    const totalMilestones = initiatives.reduce((sum, init) => sum + init.milestones.length, 0);
    const completedMilestones = initiatives.reduce((sum, init) => 
      sum + init.milestones.filter(m => m.status === 'Completed').length, 0
    );
    const delayedMilestones = initiatives.reduce((sum, init) => 
      sum + init.milestones.filter(m => m.status === 'Delayed').length, 0
    );

    // Task statistics
    const totalTasks = initiatives.reduce((sum, init) => sum + init.tasks.length, 0);
    const completedTasks = initiatives.reduce((sum, init) => 
      sum + init.tasks.filter(t => t.status === 'Completed').length, 0
    );

    return NextResponse.json({
      summary: {
        totalInitiatives,
        averageCompletion: Math.round(averageCompletion * 100) / 100,
        totalBudget,
        totalMilestones,
        completedMilestones,
        delayedMilestones,
        totalTasks,
        completedTasks,
      },
      byStatus,
      byCategory,
      byPriority,
      byDepartment,
      budgetByStatus,
      topInitiatives,
      delayedInitiatives,
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
