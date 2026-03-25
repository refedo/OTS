import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { v4 as uuidv4 } from 'uuid';

export type TransactionType = 'EARN' | 'SPEND' | 'BONUS' | 'ADJUSTMENT' | 'REDEMPTION';
export type SourceType = 'TASK_COMPLETION' | 'ON_TIME_BONUS' | 'PRIORITY_BONUS' | 'STREAK_BONUS' | 'MANUAL' | 'REDEMPTION';

interface PointRule {
  id: string;
  rule_code: string;
  rule_name: string;
  description: string | null;
  points: number;
  multiplier: number;
  is_active: boolean;
  conditions: Record<string, unknown> | null;
}

interface UserPoints {
  id: string;
  user_id: string;
  total_points: number;
  lifetime_points: number;
  current_streak: number;
  longest_streak: number;
  last_earned_at: Date | null;
}

interface PointTransaction {
  id: string;
  user_id: string;
  points: number;
  transaction_type: TransactionType;
  source_type: SourceType;
  source_id: string | null;
  description: string;
  metadata: Record<string, unknown> | null;
  created_at: Date;
}

interface TaskForPoints {
  id: string;
  title: string;
  priority: string;
  dueDate: Date | null;
  completedAt: Date | null;
  assignedToId: string | null;
}

interface PointsEarnedResult {
  basePoints: number;
  bonusPoints: number;
  totalPoints: number;
  breakdown: Array<{ rule: string; points: number; description: string }>;
  newStreak: number;
  badgesEarned: string[];
}

class PointsService {
  private async getRules(): Promise<PointRule[]> {
    const rules = await prisma.$queryRaw<PointRule[]>`
      SELECT id, rule_code, rule_name, description, points, multiplier, is_active, conditions
      FROM point_rules
      WHERE is_active = TRUE
    `;
    return rules;
  }

  private async getRule(ruleCode: string): Promise<PointRule | null> {
    const rules = await prisma.$queryRaw<PointRule[]>`
      SELECT id, rule_code, rule_name, description, points, multiplier, is_active, conditions
      FROM point_rules
      WHERE rule_code = ${ruleCode} AND is_active = TRUE
      LIMIT 1
    `;
    return rules[0] || null;
  }

  async getUserPoints(userId: string): Promise<UserPoints | null> {
    const points = await prisma.$queryRaw<UserPoints[]>`
      SELECT id, user_id, total_points, lifetime_points, current_streak, longest_streak, last_earned_at
      FROM user_points
      WHERE user_id = ${userId}
      LIMIT 1
    `;
    return points[0] || null;
  }

  async ensureUserPoints(userId: string): Promise<UserPoints> {
    let userPoints = await this.getUserPoints(userId);
    
    if (!userPoints) {
      const id = uuidv4();
      await prisma.$executeRaw`
        INSERT INTO user_points (id, user_id, total_points, lifetime_points, current_streak, longest_streak)
        VALUES (${id}, ${userId}, 0, 0, 0, 0)
      `;
      userPoints = await this.getUserPoints(userId);
    }
    
    return userPoints!;
  }

  async addTransaction(
    userId: string,
    points: number,
    transactionType: TransactionType,
    sourceType: SourceType,
    description: string,
    sourceId?: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    const id = uuidv4();
    const metadataJson = metadata ? JSON.stringify(metadata) : null;
    
    await prisma.$executeRaw`
      INSERT INTO point_transactions (id, user_id, points, transaction_type, source_type, source_id, description, metadata)
      VALUES (${id}, ${userId}, ${points}, ${transactionType}, ${sourceType}, ${sourceId || null}, ${description}, ${metadataJson})
    `;
  }

  async updateUserPoints(userId: string, pointsDelta: number, updateStreak: boolean = false): Promise<void> {
    await this.ensureUserPoints(userId);
    
    if (updateStreak) {
      // Check if user earned points yesterday to continue streak
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const userPoints = await this.getUserPoints(userId);
      let newStreak = 1;
      
      if (userPoints?.last_earned_at) {
        const lastEarnedDate = new Date(userPoints.last_earned_at);
        lastEarnedDate.setHours(0, 0, 0, 0);
        
        if (lastEarnedDate.getTime() === yesterday.getTime()) {
          // Continuing streak
          newStreak = userPoints.current_streak + 1;
        } else if (lastEarnedDate.getTime() === today.getTime()) {
          // Already earned today, keep current streak
          newStreak = userPoints.current_streak;
        }
        // Otherwise, streak resets to 1
      }
      
      await prisma.$executeRaw`
        UPDATE user_points
        SET 
          total_points = total_points + ${pointsDelta},
          lifetime_points = lifetime_points + ${Math.max(0, pointsDelta)},
          current_streak = ${newStreak},
          longest_streak = GREATEST(longest_streak, ${newStreak}),
          last_earned_at = NOW()
        WHERE user_id = ${userId}
      `;
    } else {
      await prisma.$executeRaw`
        UPDATE user_points
        SET 
          total_points = total_points + ${pointsDelta},
          lifetime_points = lifetime_points + ${Math.max(0, pointsDelta)}
        WHERE user_id = ${userId}
      `;
    }
  }

  async awardPointsForTaskCompletion(task: TaskForPoints): Promise<PointsEarnedResult | null> {
    if (!task.assignedToId || !task.completedAt) {
      return null;
    }

    const userId = task.assignedToId;
    const breakdown: Array<{ rule: string; points: number; description: string }> = [];
    const badgesEarned: string[] = [];
    let totalPoints = 0;

    try {
      // 1. Base points for task completion
      const baseRule = await this.getRule('TASK_COMPLETE');
      if (baseRule) {
        let basePoints = baseRule.points;
        
        // Apply priority multiplier
        if (task.priority === 'High') {
          const priorityRule = await this.getRule('HIGH_PRIORITY');
          if (priorityRule) {
            basePoints = Math.round(basePoints * Number(priorityRule.multiplier));
            breakdown.push({
              rule: 'HIGH_PRIORITY',
              points: basePoints - baseRule.points,
              description: `High priority bonus (${priorityRule.multiplier}x)`
            });
          }
        }
        
        breakdown.push({
          rule: 'TASK_COMPLETE',
          points: baseRule.points,
          description: 'Task completion'
        });
        totalPoints += basePoints;
      }

      // 2. On-time bonus
      if (task.dueDate && task.completedAt) {
        const dueDate = new Date(task.dueDate);
        const completedAt = new Date(task.completedAt);
        dueDate.setHours(23, 59, 59, 999);
        
        if (completedAt <= dueDate) {
          const onTimeRule = await this.getRule('ON_TIME_BONUS');
          if (onTimeRule) {
            breakdown.push({
              rule: 'ON_TIME_BONUS',
              points: onTimeRule.points,
              description: 'Completed on time'
            });
            totalPoints += onTimeRule.points;
          }
          
          // 3. Early completion bonus (2+ days early)
          const daysEarly = Math.floor((dueDate.getTime() - completedAt.getTime()) / (1000 * 60 * 60 * 24));
          if (daysEarly >= 2) {
            const earlyRule = await this.getRule('EARLY_COMPLETION');
            if (earlyRule) {
              breakdown.push({
                rule: 'EARLY_COMPLETION',
                points: earlyRule.points,
                description: `Completed ${daysEarly} days early`
              });
              totalPoints += earlyRule.points;
            }
          }
        }
      }

      // Record the transaction
      await this.addTransaction(
        userId,
        totalPoints,
        'EARN',
        'TASK_COMPLETION',
        `Completed task: ${task.title}`,
        task.id,
        { breakdown, taskPriority: task.priority }
      );

      // Update user points and streak
      await this.updateUserPoints(userId, totalPoints, true);

      // Check for streak bonuses
      const userPoints = await this.getUserPoints(userId);
      const newStreak = userPoints?.current_streak || 1;

      // Award streak bonuses
      const streakBonuses = [
        { days: 3, rule: 'STREAK_3', badge: 'STREAK_3' },
        { days: 7, rule: 'STREAK_7', badge: 'STREAK_7' },
        { days: 30, rule: 'STREAK_30', badge: 'STREAK_30' }
      ];

      for (const streakBonus of streakBonuses) {
        if (newStreak === streakBonus.days) {
          const rule = await this.getRule(streakBonus.rule);
          if (rule) {
            await this.addTransaction(
              userId,
              rule.points,
              'BONUS',
              'STREAK_BONUS',
              `${streakBonus.days}-day streak bonus!`,
              undefined,
              { streakDays: streakBonus.days }
            );
            await this.updateUserPoints(userId, rule.points, false);
            totalPoints += rule.points;
            breakdown.push({
              rule: streakBonus.rule,
              points: rule.points,
              description: `${streakBonus.days}-day streak bonus!`
            });
            
            // Award badge
            await this.awardBadge(userId, streakBonus.badge, `${streakBonus.days}-Day Streak`, 'flame');
            badgesEarned.push(streakBonus.badge);
          }
        }
      }

      // Check for first task badge
      const taskCount = await this.getUserTaskCompletionCount(userId);
      if (taskCount === 1) {
        await this.awardBadge(userId, 'FIRST_TASK', 'First Task Completed', 'trophy');
        badgesEarned.push('FIRST_TASK');
      }

      // Milestone badges
      const milestones = [
        { count: 10, badge: 'TASKS_10', name: '10 Tasks Champion', icon: 'medal' },
        { count: 50, badge: 'TASKS_50', name: '50 Tasks Master', icon: 'award' },
        { count: 100, badge: 'TASKS_100', name: 'Century Club', icon: 'crown' },
        { count: 500, badge: 'TASKS_500', name: 'Task Legend', icon: 'star' }
      ];

      for (const milestone of milestones) {
        if (taskCount === milestone.count) {
          await this.awardBadge(userId, milestone.badge, milestone.name, milestone.icon);
          badgesEarned.push(milestone.badge);
        }
      }

      const basePoints = breakdown.find(b => b.rule === 'TASK_COMPLETE')?.points || 0;
      const bonusPoints = totalPoints - basePoints;

      logger.info({ userId, taskId: task.id, totalPoints, breakdown }, 'Points awarded for task completion');

      return {
        basePoints,
        bonusPoints,
        totalPoints,
        breakdown,
        newStreak,
        badgesEarned
      };
    } catch (error) {
      logger.error({ error, userId, taskId: task.id }, 'Failed to award points for task completion');
      throw error;
    }
  }

  private async getUserTaskCompletionCount(userId: string): Promise<number> {
    const result = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count FROM point_transactions
      WHERE user_id = ${userId} AND source_type = 'TASK_COMPLETION'
    `;
    return Number(result[0].count);
  }

  async awardBadge(userId: string, badgeCode: string, badgeName: string, badgeIcon: string): Promise<boolean> {
    try {
      // Check if badge already exists
      const existing = await prisma.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM user_badges WHERE user_id = ${userId} AND badge_code = ${badgeCode} LIMIT 1
      `;
      
      if (existing.length > 0) {
        return false; // Already has badge
      }

      const id = uuidv4();
      await prisma.$executeRaw`
        INSERT INTO user_badges (id, user_id, badge_code, badge_name, badge_icon)
        VALUES (${id}, ${userId}, ${badgeCode}, ${badgeName}, ${badgeIcon})
      `;
      
      logger.info({ userId, badgeCode, badgeName }, 'Badge awarded');
      return true;
    } catch (error) {
      logger.error({ error, userId, badgeCode }, 'Failed to award badge');
      return false;
    }
  }

  async getUserBadges(userId: string): Promise<Array<{ badge_code: string; badge_name: string; badge_icon: string; earned_at: Date }>> {
    return prisma.$queryRaw`
      SELECT badge_code, badge_name, badge_icon, earned_at
      FROM user_badges
      WHERE user_id = ${userId}
      ORDER BY earned_at DESC
    `;
  }

  async getLeaderboard(limit: number = 10, departmentId?: string): Promise<Array<{
    user_id: string;
    user_name: string;
    position: string | null;
    department_name: string | null;
    total_points: number;
    lifetime_points: number;
    current_streak: number;
    badge_count: number;
    rank: number;
  }>> {
    if (departmentId) {
      return prisma.$queryRaw`
        SELECT 
          up.user_id,
          u.name AS user_name,
          u.position,
          d.name AS department_name,
          up.total_points,
          up.lifetime_points,
          up.current_streak,
          (SELECT COUNT(*) FROM user_badges ub WHERE ub.user_id = up.user_id) AS badge_count,
          ROW_NUMBER() OVER (ORDER BY up.total_points DESC) AS \`rank\`
        FROM user_points up
        JOIN User u ON up.user_id = u.id
        LEFT JOIN Department d ON u.departmentId = d.id
        WHERE u.status = 'active' AND u.departmentId = ${departmentId}
        ORDER BY up.total_points DESC
        LIMIT ${limit}
      `;
    }
    
    return prisma.$queryRaw`
      SELECT 
        up.user_id,
        u.name AS user_name,
        u.position,
        d.name AS department_name,
        up.total_points,
        up.lifetime_points,
        up.current_streak,
        (SELECT COUNT(*) FROM user_badges ub WHERE ub.user_id = up.user_id) AS badge_count,
        ROW_NUMBER() OVER (ORDER BY up.total_points DESC) AS \`rank\`
      FROM user_points up
      JOIN User u ON up.user_id = u.id
      LEFT JOIN Department d ON u.departmentId = d.id
      WHERE u.status = 'active'
      ORDER BY up.total_points DESC
      LIMIT ${limit}
    `;
  }

  async getUserRank(userId: string): Promise<number | null> {
    const result = await prisma.$queryRaw<Array<{ rank: bigint }>>`
      SELECT \`rank\` FROM (
        SELECT 
          user_id,
          ROW_NUMBER() OVER (ORDER BY total_points DESC) AS \`rank\`
        FROM user_points up
        JOIN User u ON up.user_id = u.id
        WHERE u.status = 'active'
      ) ranked
      WHERE user_id = ${userId}
    `;
    return result[0] ? Number(result[0].rank) : null;
  }

  async getRecentTransactions(userId: string, limit: number = 10): Promise<PointTransaction[]> {
    return prisma.$queryRaw`
      SELECT id, user_id, points, transaction_type, source_type, source_id, description, metadata, created_at
      FROM point_transactions
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;
  }

  async getPointsStats(userId: string): Promise<{
    totalPoints: number;
    lifetimePoints: number;
    currentStreak: number;
    longestStreak: number;
    rank: number | null;
    badgeCount: number;
    thisWeekPoints: number;
    thisMonthPoints: number;
  }> {
    const userPoints = await this.ensureUserPoints(userId);
    const rank = await this.getUserRank(userId);
    const badges = await this.getUserBadges(userId);
    
    // Get this week's points
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);
    
    const weekPoints = await prisma.$queryRaw<[{ total: number | null }]>`
      SELECT COALESCE(SUM(points), 0) as total
      FROM point_transactions
      WHERE user_id = ${userId} 
        AND transaction_type IN ('EARN', 'BONUS')
        AND created_at >= ${weekStart}
    `;
    
    // Get this month's points
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    
    const monthPoints = await prisma.$queryRaw<[{ total: number | null }]>`
      SELECT COALESCE(SUM(points), 0) as total
      FROM point_transactions
      WHERE user_id = ${userId}
        AND transaction_type IN ('EARN', 'BONUS')
        AND created_at >= ${monthStart}
    `;

    return {
      totalPoints: userPoints.total_points,
      lifetimePoints: userPoints.lifetime_points,
      currentStreak: userPoints.current_streak,
      longestStreak: userPoints.longest_streak,
      rank,
      badgeCount: badges.length,
      thisWeekPoints: Number(weekPoints[0].total) || 0,
      thisMonthPoints: Number(monthPoints[0].total) || 0
    };
  }

  async manualAdjustment(
    userId: string,
    points: number,
    reason: string,
    adjustedBy: string
  ): Promise<void> {
    const transactionType: TransactionType = points >= 0 ? 'BONUS' : 'ADJUSTMENT';
    
    await this.addTransaction(
      userId,
      points,
      transactionType,
      'MANUAL',
      reason,
      undefined,
      { adjustedBy }
    );
    
    await this.updateUserPoints(userId, points, false);
    
    logger.info({ userId, points, reason, adjustedBy }, 'Manual points adjustment');
  }
}

export const pointsService = new PointsService();
