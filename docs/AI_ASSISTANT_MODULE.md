# AI Assistant Module - Operation Focal Point

## Overview

The **Operation Focal Point** is an AI-powered assistant integrated into the OTS (Operations Tracking System) that helps users with:

- Daily operations questions
- KPI analysis and insights
- HSPS (objectives, KPIs, initiatives) alignment
- Project, production, QC, logistics, and planning guidance
- Task breakdown and improvements
- Document generation (checklists, reports, action plans)

## Features

### 1. **Context-Aware Responses**
The AI Assistant can focus on different operational areas:
- **Projects**: Project status, delays, tonnage, timelines
- **Tasks**: Task management, priorities, assignments
- **KPIs**: Performance analysis, target vs actual, trends
- **Initiatives**: Strategic initiatives, progress, ownership
- **Departments**: Department-level summaries and metrics

### 2. **Real-Time Data Access**
The assistant has access to:
- HSPS module (Company Objectives, Balanced Scorecard KPIs, Annual Initiatives)
- Projects module (active projects, buildings, status, tonnage)
- Tasks module (pending/in-progress tasks, priorities, due dates)
- Production logs (recent 30 days, processes, quantities)
- QC module (NCRs, inspections, quality metrics)
- Logistics/Dispatch (OTIF metrics, shipments)

### 3. **Conversation History**
- All conversations are saved and grouped
- Users can revisit previous conversations
- Context is preserved across messages

### 4. **Security**
- All OpenAI API calls happen on the backend
- No API keys exposed to frontend
- User authentication required
- Role-based data access

## Architecture

### Backend Components

#### 1. **Prisma Schema** (`prisma/schema.prisma`)
```prisma
model AIInteraction {
  id              String   @id @default(uuid())
  userId          String
  conversationId  String?
  role            String   // 'user' or 'assistant'
  message         String   @db.LongText
  response        String?  @db.LongText
  contextType     String?
  contextMeta     Json?
  createdAt       DateTime @default(now())
  user            User     @relation(...)
}
```

#### 2. **Context Builder** (`src/lib/ai-assistant/contextBuilder.ts`)
Aggregates data from various OTS modules based on:
- User role and permissions
- Selected context type
- Recent data (last 30-90 days)

Functions:
- `buildAIContext()` - Main entry point
- `getHSPSContext()` - Objectives, KPIs, initiatives
- `getProjectsContext()` - Active projects
- `getTasksContext()` - Pending/in-progress tasks
- `getProductionContext()` - Recent production logs
- `getQCContext()` - NCRs and inspections
- `getDepartmentsContext()` - Department summaries

#### 3. **API Route** (`src/app/api/ai-assistant/route.ts`)
Handles:
- POST: Send message to AI, get response
- GET: Fetch conversation history

Flow:
1. Authenticate user
2. Validate input
3. Build context from OTS data
4. Call OpenAI API with system prompt + context + user message
5. Save interaction to database
6. Return response

### Frontend Components

#### 1. **ChatInterface** (`src/components/ai-chat/ChatInterface.tsx`)
Main chat UI with:
- Message bubbles (user vs assistant)
- Context selector dropdown
- Input box with send button
- Loading states
- Markdown rendering for assistant responses

#### 2. **ConversationSidebar** (`src/components/ai-chat/ConversationSidebar.tsx`)
Sidebar showing:
- New conversation button
- List of recent conversations
- Conversation titles (from first message)
- Context type badges
- Timestamps

#### 3. **AI Assistant Page** (`src/app/ai-assistant/page.tsx`)
Main page layout:
- Two-column layout (sidebar + chat)
- Conversation management
- State management for active conversation

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

This will install:
- `openai` - OpenAI Node.js SDK
- `react-markdown` - Markdown rendering for AI responses

### 2. Configure OpenAI API Key

Add to your `.env` file:

```env
OPENAI_API_KEY="sk-your-openai-api-key-here"
```

Get your API key from: https://platform.openai.com/api-keys

### 3. Run Prisma Migration

```bash
npx prisma migrate dev --name add_ai_assistant_module
```

This creates the `ai_interactions` table.

### 4. Generate Prisma Client

```bash
npx prisma generate
```

### 5. Start Development Server

```bash
npm run dev
```

Navigate to: http://localhost:3000/ai-assistant

## Usage Examples

### Example 1: KPI Analysis
**User**: "How are we performing vs our KPIs this month?"

**Assistant**: Analyzes current KPI values vs targets from the Balanced Scorecard KPIs and provides:
- List of underperforming KPIs
- Gap analysis (current vs target)
- Possible root causes
- Suggested actions

### Example 2: Project Status
**User**: "Which projects are delayed and why?"

**Assistant**: Reviews active projects and identifies:
- Projects with planned end dates in the past
- Projects marked as "On-Hold"
- Related NCRs or quality issues
- Production bottlenecks

### Example 3: Task Breakdown
**User**: "Break down the ERP implementation initiative into tasks"

**Assistant**: Generates:
- Phase-by-phase breakdown
- Actionable tasks with suggested owners
- Timeline recommendations
- Dependencies and risks

### Example 4: Quality Issues
**User**: "Show me the main NCRs impacting quality this quarter"

**Assistant**: Summarizes:
- Open NCRs by severity
- Most common defect types
- Projects most affected
- Suggested corrective actions

### Example 5: Action Plan
**User**: "Create an action plan to improve OTIF in logistics"

**Assistant**: Generates:
- Current OTIF performance
- Root cause analysis
- Step-by-step action plan
- Responsible parties
- Timeline and milestones

## AI Behavior Guidelines

The AI Assistant follows these rules:

1. **Never hallucinate** - Only reference data provided in context
2. **Be specific** - Cite project codes, KPI names, NCR numbers
3. **Be actionable** - Provide concrete next steps
4. **Link to objectives** - Connect insights to HSPS objectives/KPIs
5. **Admit limitations** - Say "I don't have this data" when appropriate
6. **Be concise** - Use bullet points and clear headings
7. **Focus on operations** - Provide practical, industry-specific advice

## System Prompt

The AI uses a detailed system prompt that:
- Defines its role as "Operation Focal Point"
- Lists available data sources
- Specifies capabilities
- Enforces strict rules against hallucination
- Guides response format

## Data Privacy & Security

- All data stays within your infrastructure
- OpenAI API calls are made server-side only
- User authentication required for all requests
- Role-based access control applied to context data
- Conversation history is user-specific
- No sensitive data (passwords, API keys) sent to OpenAI

## Limitations

1. **Data Recency**: Context limited to recent data (30-90 days)
2. **Data Volume**: Limited number of records per query to avoid token limits
3. **API Costs**: Each query costs OpenAI API credits
4. **Response Time**: Depends on OpenAI API latency (typically 2-5 seconds)
5. **Model Knowledge**: AI has general knowledge but relies on OTS data for specifics

## Troubleshooting

### Issue: "OpenAI API key not configured"
**Solution**: Add `OPENAI_API_KEY` to your `.env` file

### Issue: "Unauthorized" error
**Solution**: Ensure you're logged in to the OTS

### Issue: AI responses are generic
**Solution**: 
- Check that context builder is fetching data correctly
- Verify database has recent data
- Try different context types

### Issue: Slow responses
**Solution**:
- Check OpenAI API status
- Reduce context data volume in `contextBuilder.ts`
- Consider caching frequently accessed data

## Future Enhancements

Potential improvements:
1. **Streaming responses** - Show AI response as it's generated
2. **File attachments** - Upload documents for analysis
3. **Voice input** - Speech-to-text for queries
4. **Scheduled reports** - Automated daily/weekly summaries
5. **Multi-language support** - Support for Arabic, etc.
6. **Custom AI models** - Fine-tune on company-specific data
7. **Integration with other tools** - Export to Excel, PDF, etc.

## API Reference

### POST /api/ai-assistant

**Request Body:**
```json
{
  "message": "How are we performing vs KPIs?",
  "contextType": "kpis",
  "conversationId": "optional-uuid"
}
```

**Response:**
```json
{
  "assistantMessage": "Based on the current data...",
  "conversationId": "uuid",
  "contextType": "kpis"
}
```

### GET /api/ai-assistant

**Query Parameters:**
- `conversationId` (optional): Fetch specific conversation

**Response:**
```json
{
  "conversations": [
    {
      "conversationId": "uuid",
      "messages": [...],
      "lastMessageAt": "2024-12-08T...",
      "contextType": "projects"
    }
  ]
}
```

## Support

For issues or questions:
1. Check this documentation
2. Review the troubleshooting section
3. Check OpenAI API status
4. Contact the development team

---

**Last Updated**: December 2024
**Version**: 1.0.0
