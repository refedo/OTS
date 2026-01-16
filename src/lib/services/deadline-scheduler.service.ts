/**
 * Deadline Scheduler Service
 * Scans for upcoming deadlines and creates warning notifications
 * Runs daily using node-cron
 */

import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import NotificationService from './notification.service';

const prisma = new PrismaClient();

export class DeadlineSchedulerService {
  private static isRunning = false;

  /**
   * Start the deadline scheduler
   * Runs daily at 8:00 AM
   */
  static start() {
    if (this.isRunning) {
      console.log('Deadline scheduler is already running');
      return;
    }

    // Run daily at 8:00 AM
    cron.schedule('0 8 * * *', async () => {
      console.log('Running deadline check...');
      await this.checkDeadlines();
    });

    // Also run immediately on startup for testing
    this.checkDeadlines();

    this.isRunning = true;
    console.log('Deadline scheduler started');
  }

  /**
   * Check all entities with deadlines and create notifications
   */
  static async checkDeadlines() {
    try {
      const now = new Date();
      const in48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000);

      // Check Tasks
      await this.checkTaskDeadlines(now, in48Hours);

      // Check NCR Reports
      await this.checkNCRDeadlines(now, in48Hours);

      // Check RFI Requests (if they have inspection dates)
      await this.checkRFIDeadlines(now, in48Hours);

      // Check Document Submissions (review dates)
      await this.checkDocumentDeadlines(now, in48Hours);

      console.log('Deadline check completed');
    } catch (error) {
      console.error('Error checking deadlines:', error);
    }
  }

  /**
   * Check task deadlines
   */
  private static async checkTaskDeadlines(now: Date, in48Hours: Date) {
    try {
      const tasks = await prisma.task.findMany({
        where: {
          dueDate: {
            gte: now,
            lte: in48Hours,
          },
          status: {
            not: 'Completed',
          },
          assignedToId: {
            not: null,
          },
        },
        include: {
          assignedTo: true,
          project: {
            select: { name: true },
          },
          building: {
            select: { name: true },
          },
        },
      });

      for (const task of tasks) {
        if (!task.assignedToId || !task.dueDate) continue;

        // Check if notification already exists for this deadline
        const existingNotification = await prisma.notification.findFirst({
          where: {
            userId: task.assignedToId,
            type: 'DEADLINE_WARNING',
            relatedEntityType: 'task',
            relatedEntityId: task.id,
            createdAt: {
              gte: new Date(now.getTime() - 24 * 60 * 60 * 1000), // Within last 24 hours
            },
          },
        });

        if (existingNotification) continue;

        const hoursRemaining = Math.floor((task.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60));

        await NotificationService.notifyDeadlineWarning({
          userId: task.assignedToId,
          entityType: 'task',
          entityId: task.id,
          entityName: task.title,
          deadline: task.dueDate,
          hoursRemaining,
        });
      }

      console.log(`Checked ${tasks.length} tasks for deadlines`);
    } catch (error) {
      console.error('Error checking task deadlines:', error);
    }
  }

  /**
   * Check NCR report deadlines
   */
  private static async checkNCRDeadlines(now: Date, in48Hours: Date) {
    try {
      const ncrReports = await prisma.nCRReport.findMany({
        where: {
          deadline: {
            gte: now,
            lte: in48Hours,
          },
          status: {
            notIn: ['Closed'],
          },
          assignedToId: {
            not: null,
          },
        },
        include: {
          assignedTo: true,
          project: {
            select: { name: true },
          },
        },
      });

      for (const ncr of ncrReports) {
        if (!ncr.assignedToId) continue;

        const existingNotification = await prisma.notification.findFirst({
          where: {
            userId: ncr.assignedToId,
            type: 'DEADLINE_WARNING',
            relatedEntityType: 'ncr',
            relatedEntityId: ncr.id,
            createdAt: {
              gte: new Date(now.getTime() - 24 * 60 * 60 * 1000),
            },
          },
        });

        if (existingNotification) continue;

        const hoursRemaining = Math.floor((ncr.deadline.getTime() - now.getTime()) / (1000 * 60 * 60));

        await NotificationService.notifyDeadlineWarning({
          userId: ncr.assignedToId,
          entityType: 'NCR',
          entityId: ncr.id,
          entityName: ncr.ncrNumber,
          deadline: ncr.deadline,
          hoursRemaining,
        });
      }

      console.log(`Checked ${ncrReports.length} NCR reports for deadlines`);
    } catch (error) {
      console.error('Error checking NCR deadlines:', error);
    }
  }

  /**
   * Check RFI request inspection dates
   */
  private static async checkRFIDeadlines(now: Date, in48Hours: Date) {
    try {
      const rfiRequests = await prisma.rFIRequest.findMany({
        where: {
          inspectionDate: {
            gte: now,
            lte: in48Hours,
          },
          status: 'Waiting for Inspection',
          assignedToId: {
            not: null,
          },
        },
        include: {
          assignedTo: true,
          project: {
            select: { name: true },
          },
        },
      });

      for (const rfi of rfiRequests) {
        if (!rfi.assignedToId || !rfi.inspectionDate) continue;

        const existingNotification = await prisma.notification.findFirst({
          where: {
            userId: rfi.assignedToId,
            type: 'DEADLINE_WARNING',
            relatedEntityType: 'rfi',
            relatedEntityId: rfi.id,
            createdAt: {
              gte: new Date(now.getTime() - 24 * 60 * 60 * 1000),
            },
          },
        });

        if (existingNotification) continue;

        const hoursRemaining = Math.floor(
          (rfi.inspectionDate.getTime() - now.getTime()) / (1000 * 60 * 60)
        );

        await NotificationService.notifyDeadlineWarning({
          userId: rfi.assignedToId,
          entityType: 'RFI',
          entityId: rfi.id,
          entityName: rfi.rfiNumber || 'RFI Request',
          deadline: rfi.inspectionDate,
          hoursRemaining,
        });
      }

      console.log(`Checked ${rfiRequests.length} RFI requests for deadlines`);
    } catch (error) {
      console.error('Error checking RFI deadlines:', error);
    }
  }

  /**
   * Check document submission review dates
   */
  private static async checkDocumentDeadlines(now: Date, in48Hours: Date) {
    try {
      const documents = await prisma.document.findMany({
        where: {
          reviewDate: {
            gte: now,
            lte: in48Hours,
          },
          status: {
            in: ['Draft', 'Under Review'],
          },
          approvedById: {
            not: null,
          },
        },
        include: {
          approvedBy: true,
        },
      });

      for (const doc of documents) {
        if (!doc.approvedById || !doc.reviewDate) continue;

        const existingNotification = await prisma.notification.findFirst({
          where: {
            userId: doc.approvedById,
            type: 'DEADLINE_WARNING',
            relatedEntityType: 'document',
            relatedEntityId: doc.id,
            createdAt: {
              gte: new Date(now.getTime() - 24 * 60 * 60 * 1000),
            },
          },
        });

        if (existingNotification) continue;

        const hoursRemaining = Math.floor((doc.reviewDate.getTime() - now.getTime()) / (1000 * 60 * 60));

        await NotificationService.notifyDeadlineWarning({
          userId: doc.approvedById,
          entityType: 'document',
          entityId: doc.id,
          entityName: doc.title,
          deadline: doc.reviewDate,
          hoursRemaining,
        });
      }

      console.log(`Checked ${documents.length} documents for review deadlines`);
    } catch (error) {
      console.error('Error checking document deadlines:', error);
    }
  }

  /**
   * Stop the scheduler
   */
  static stop() {
    this.isRunning = false;
    console.log('Deadline scheduler stopped');
  }
}

export default DeadlineSchedulerService;
