/**
 * AI-powered notification summary
 * GET /api/notifications/summary
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/jwt';
import NotificationService from '@/lib/services/notification.service';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function getUserIdFromRequest(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '');
    const session = verifySession(token);
    return session?.sub || null;
  }

  const cookieName = process.env.COOKIE_NAME || 'ots_session';
  const token = request.cookies.get(cookieName)?.value;
  if (token) {
    const session = verifySession(token);
    return session?.sub || null;
  }

  return null;
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get unread notifications
    const notifications = await NotificationService.getNotifications({
      userId,
      isRead: false,
      isArchived: false,
      limit: 100,
    });

    if (notifications.length === 0) {
      return NextResponse.json({
        summary: 'You have no pending notifications.',
        count: 0,
      });
    }

    // Get deadline notifications
    const deadlineNotifications = await NotificationService.getDeadlineNotifications(userId);

    // Prepare data for AI
    const notificationData = notifications.map((n: any) => ({
      type: n.type,
      title: n.title,
      message: n.message,
      createdAt: n.createdAt,
      deadline: n.deadlineAt,
      metadata: n.metadata,
    }));

    const deadlineData = {
      urgent: deadlineNotifications.urgent.length,
      soon: deadlineNotifications.soon.length,
      upcoming: deadlineNotifications.upcoming.length,
    };

    // Create AI prompt
    const prompt = `You are an AI assistant for the Hexa Steel Operation Tracking System (OTS). 
Summarize the following notifications for the user in a concise, actionable format.

IMPORTANT RULES:
- Only use information provided in the data below
- Do not hallucinate or invent any information
- Be concise and professional
- Highlight urgent items first
- Group similar notifications

Notification Data:
${JSON.stringify(notificationData, null, 2)}

Deadline Summary:
- Urgent (< 24 hours): ${deadlineData.urgent}
- Soon (24-48 hours): ${deadlineData.soon}
- Upcoming (> 48 hours): ${deadlineData.upcoming}

Provide a brief summary (max 200 words) highlighting:
1. Most urgent items
2. Approval requests
3. Task assignments
4. Upcoming deadlines`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are a helpful assistant for the Hexa Steel OTS system. Provide concise, factual summaries based only on provided data.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 500,
    });

    const summary = completion.choices[0]?.message?.content || 'Unable to generate summary';

    return NextResponse.json({
      summary,
      count: notifications.length,
      deadlines: deadlineData,
    });
  } catch (error: any) {
    console.error('Error generating notification summary:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate summary' },
      { status: 500 }
    );
  }
}
