import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';
import { buildAIContext, ContextType } from '@/lib/ai-assistant/contextBuilder';
import OpenAI from 'openai';
import { z } from 'zod';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Request validation schema
const requestSchema = z.object({
  message: z.string().min(1).max(5000),
  contextType: z.enum(['projects', 'tasks', 'kpis', 'initiatives', 'departments']).optional().default('projects'),
  conversationId: z.string().uuid().optional(),
});

// System prompt for the AI Assistant
const SYSTEM_PROMPT = `You are the **Operation Focal Point AI Assistant** for an Operations Tracking System (OTS) used by a steel fabrication company.

**Your Role:**
- You have access to real-time data from the company's operations tracking system
- You help users with daily operations questions, KPI analysis, project guidance, and task management
- You provide actionable insights based on actual data from HSPS (objectives, KPIs, initiatives), projects, tasks, production logs, QC, and logistics modules

**Available Data:**
- HSPS data: Company objectives, Balanced Scorecard KPIs, Annual Initiatives
- Projects: Active projects with buildings, tonnage, timelines, and status
- Tasks: Operational tasks with status, priority, assignees, and due dates
- Production: Recent production logs with processes, quantities, and QC status
- QC: NCRs (Non-Conformance Reports), inspections, and quality metrics
- Logistics: Dispatch information and OTIF (On-Time In-Full) metrics

**Your Capabilities:**
1. **Read Data**: View and analyze all OTS data (projects, tasks, KPIs, production, QC)
2. **Write Data**: Create tasks, update task status, and modify records
3. Provide operational advice and best practices for steel fabrication
4. Analyze KPI performance and suggest improvements
5. Highlight underperforming areas and suggest root causes
6. Break down complex tasks into actionable steps
7. Generate practical documents: checklists, action plans, brief reports
8. Link recommendations to existing KPIs, objectives, or initiatives
9. Provide project status updates and identify delays
10. Summarize production performance and quality issues

**Available Actions:**
- **create_task**: Create a new task with title, description, priority, assignee, project, due date
- **update_task_status**: Update an existing task's status (Pending, In Progress, Completed, Cancelled)

**CRITICAL RULES:**
1. **Never hallucinate data** - Only reference information provided in the context
2. **Check the context carefully** - If you see tasks, projects, or other data in the context, use it! Don't say "I don't have this data" if it's actually there
3. If specific data is genuinely missing from the context, clearly state: "I don't have this specific data in the current context"
4. When citing data, always reference:
   - Project codes/numbers
   - Building designations
   - KPI names from HSPS
   - Task titles and IDs
   - NCR numbers
5. Do NOT invent KPIs, objectives, or initiatives that are not in the provided context
6. Be concise, structured, and practical - avoid generic theory
7. Focus on actionable insights that can improve operations
8. When analyzing KPIs, compare current vs target values and explain the gap
9. For project questions, reference actual project numbers and status
10. For quality issues, cite specific NCR numbers and severity levels
11. **For task queries**: Look in the context.tasks array - it contains all tasks with their status, priority, assignees, and due dates

**Response Format:**
- Use clear headings and bullet points
- Provide specific data points when available
- Suggest concrete next steps
- Link insights to business objectives when relevant`;

/**
 * POST /api/ai-assistant
 * Handle AI assistant chat requests
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Authentication check
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Validate request body
    const body = await req.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { message, contextType, conversationId } = parsed.data;

    // 3. Check OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    // 4. Build context from OTS data
    const context = await buildAIContext(session.sub, contextType);

    // 5. Generate conversation ID if not provided
    const finalConversationId = conversationId || crypto.randomUUID();

    // 6. Save user message to database
    await prisma.aIInteraction.create({
      data: {
        userId: session.sub,
        conversationId: finalConversationId,
        role: 'user',
        message,
        response: null,
        contextType,
        contextMeta: context as any,
      },
    });

    // 7. Prepare OpenAI messages
    const userPrompt = `Context Type: ${contextType}

Context Data:
${JSON.stringify(context, null, 2)}

User Question:
${message}`;

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'system', content: `Context Data:\n${JSON.stringify(context, null, 2)}` },
      { role: 'user', content: message },
    ];

    // 8. Call OpenAI API with function calling
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview', // Supports 128k tokens
      messages,
      temperature: 0.7,
      max_tokens: 2000,
      tools: [
        {
          type: 'function',
          function: {
            name: 'create_task',
            description: 'Create a new task in the OTS system',
            parameters: {
              type: 'object',
              properties: {
                title: {
                  type: 'string',
                  description: 'Task title',
                },
                description: {
                  type: 'string',
                  description: 'Detailed task description',
                },
                priority: {
                  type: 'string',
                  enum: ['Low', 'Medium', 'High', 'Urgent'],
                  description: 'Task priority level',
                },
                assignedToId: {
                  type: 'string',
                  description: 'User ID to assign the task to (optional)',
                },
                projectId: {
                  type: 'string',
                  description: 'Project ID if task is related to a project (optional)',
                },
                dueDate: {
                  type: 'string',
                  description: 'Due date in ISO format (optional)',
                },
                departmentId: {
                  type: 'string',
                  description: 'Department ID (optional)',
                },
              },
              required: ['title', 'description', 'priority'],
            },
          },
        },
        {
          type: 'function',
          function: {
            name: 'update_task_status',
            description: 'Update the status of an existing task',
            parameters: {
              type: 'object',
              properties: {
                taskId: {
                  type: 'string',
                  description: 'ID of the task to update',
                },
                status: {
                  type: 'string',
                  enum: ['Pending', 'In Progress', 'Completed', 'Cancelled'],
                  description: 'New status for the task',
                },
              },
              required: ['taskId', 'status'],
            },
          },
        },
      ],
      tool_choice: 'auto',
    });

    let assistantMessage = completion.choices[0]?.message?.content || '';
    const toolCalls = completion.choices[0]?.message?.tool_calls;

    // 9. Handle function calls if any
    if (toolCalls && toolCalls.length > 0) {
      const functionResults: string[] = [];

      for (const toolCall of toolCalls) {
        const functionName = toolCall.function.name;
        const functionArgs = JSON.parse(toolCall.function.arguments);

        console.log(`[AI Function Call] ${functionName}`, functionArgs);

        try {
          if (functionName === 'create_task') {
            const newTask = await prisma.task.create({
              data: {
                title: functionArgs.title,
                description: functionArgs.description,
                priority: functionArgs.priority,
                status: 'Pending',
                assignedToId: functionArgs.assignedToId || null,
                createdById: session.sub,
                projectId: functionArgs.projectId || null,
                buildingId: null,
                departmentId: functionArgs.departmentId || null,
                dueDate: functionArgs.dueDate ? new Date(functionArgs.dueDate) : null,
                taskInputDate: new Date(),
              },
            });

            functionResults.push(`✅ Task created successfully: "${newTask.title}" (ID: ${newTask.id})`);
          } else if (functionName === 'update_task_status') {
            const updatedTask = await prisma.task.update({
              where: { id: functionArgs.taskId },
              data: { status: functionArgs.status },
            });

            functionResults.push(`✅ Task status updated: "${updatedTask.title}" → ${updatedTask.status}`);
          }
        } catch (error) {
          console.error(`[AI Function Error] ${functionName}:`, error);
          functionResults.push(`❌ Failed to ${functionName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Append function results to assistant message
      assistantMessage = assistantMessage + '\n\n' + functionResults.join('\n');
    }

    if (!assistantMessage) {
      assistantMessage = 'No response generated';
    }

    // 10. Save assistant response to database
    await prisma.aIInteraction.create({
      data: {
        userId: session.sub,
        conversationId: finalConversationId,
        role: 'assistant',
        message: '',
        response: assistantMessage,
        contextType,
        contextMeta: null,
      },
    });

    // 11. Return response
    return NextResponse.json({
      assistantMessage,
      conversationId: finalConversationId,
      contextType,
    });
  } catch (error) {
    console.error('AI Assistant error:', error);
    
    // Detailed error logging
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      
      return NextResponse.json(
        { 
          error: 'Failed to process request', 
          message: error.message,
          details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ai-assistant
 * Fetch conversation history for the current user
 */
export async function GET(req: NextRequest) {
  try {
    // Authentication check
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get('conversationId');

    if (conversationId) {
      // Fetch specific conversation
      const interactions = await prisma.aIInteraction.findMany({
        where: {
          userId: session.sub,
          conversationId,
        },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          role: true,
          message: true,
          response: true,
          contextType: true,
          createdAt: true,
        },
      });

      return NextResponse.json({ interactions });
    } else {
      // Fetch all conversations (grouped)
      const interactions = await prisma.aIInteraction.findMany({
        where: {
          userId: session.sub,
        },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          conversationId: true,
          role: true,
          message: true,
          response: true,
          contextType: true,
          createdAt: true,
        },
        take: 100,
      });

      // Group by conversation
      const conversations = new Map<string, any>();
      
      interactions.forEach((interaction) => {
        const convId = interaction.conversationId || 'default';
        
        if (!conversations.has(convId)) {
          conversations.set(convId, {
            conversationId: convId,
            messages: [],
            lastMessageAt: interaction.createdAt,
            contextType: interaction.contextType,
          });
        }
        
        const conv = conversations.get(convId);
        conv.messages.push(interaction);
        
        if (new Date(interaction.createdAt) > new Date(conv.lastMessageAt)) {
          conv.lastMessageAt = interaction.createdAt;
        }
      });

      const conversationList = Array.from(conversations.values())
        .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());

      return NextResponse.json({ conversations: conversationList });
    }
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}
