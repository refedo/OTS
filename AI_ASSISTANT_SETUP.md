# AI Assistant Module - Setup Guide

## ✅ Implementation Complete

The **Operation Focal Point** AI Assistant module has been successfully implemented in your OTS system.

## 📁 Files Created

### Backend
- ✅ `prisma/schema.prisma` - Updated with `AIInteraction` model
- ✅ `src/lib/ai-assistant/contextBuilder.ts` - Context aggregation from OTS modules
- ✅ `src/app/api/ai-assistant/route.ts` - API endpoint for AI interactions

### Frontend
- ✅ `src/components/ai-chat/ChatInterface.tsx` - Main chat UI component
- ✅ `src/components/ai-chat/ConversationSidebar.tsx` - Conversation history sidebar
- ✅ `src/app/ai-assistant/page.tsx` - AI Assistant page

### Documentation
- ✅ `docs/AI_ASSISTANT_MODULE.md` - Complete module documentation
- ✅ `prisma/migrations/add_ai_assistant_module.sql` - Database migration SQL

### Configuration
- ✅ `package.json` - Updated with `openai` and `react-markdown` dependencies
- ✅ `.env.example` - Updated with `OPENAI_API_KEY` configuration

## 🚀 Setup Steps

### Step 1: Install Dependencies (Already Done)

Dependencies have been installed with `--legacy-peer-deps` due to zod version conflict:
- `openai@^4.73.0` - OpenAI Node.js SDK
- `react-markdown@^9.0.1` - Markdown rendering

### Step 2: Configure OpenAI API Key

1. Get your OpenAI API key from: https://platform.openai.com/api-keys
2. Add it to your `.env` file:

```env
OPENAI_API_KEY="sk-your-actual-openai-api-key-here"
```

⚠️ **IMPORTANT**: Never commit your `.env` file to version control!

### Step 3: Run Database Migration

**Option A: Using Prisma Migrate (Recommended)**

Stop your dev server first, then run:

```bash
npx prisma migrate dev --name add_ai_assistant_module
```

**Option B: Manual SQL Execution**

If Prisma migrate has issues, run the SQL file directly:

```bash
mysql -u your_username -p your_database < prisma/migrations/add_ai_assistant_module.sql
```

Or use your MySQL client to execute the contents of `prisma/migrations/add_ai_assistant_module.sql`

### Step 4: Generate Prisma Client

After migration, regenerate the Prisma client:

```bash
npx prisma generate
```

If you get a file lock error, stop all running Node processes and try again.

### Step 5: Start Development Server

```bash
npm run dev
```

### Step 6: Access AI Assistant

Navigate to: **http://localhost:3000/ai-assistant**

## 🎯 Features Implemented

### 1. Context-Aware AI
- **Projects Context**: Active projects, buildings, tonnage, timelines
- **Tasks Context**: Pending/in-progress tasks, priorities, assignments
- **KPIs Context**: Balanced Scorecard KPIs, targets vs actuals
- **Initiatives Context**: Annual initiatives, progress, ownership
- **Departments Context**: Department summaries and metrics

### 2. Real-Time Data Access
The AI has access to:
- ✅ HSPS module (Objectives, KPIs, Initiatives)
- ✅ Projects module (Active projects, buildings)
- ✅ Tasks module (Operational tasks)
- ✅ Production logs (Last 30 days)
- ✅ QC module (NCRs, inspections)
- ✅ Departments (Users, tasks count)

### 3. Conversation Management
- ✅ Save all conversations
- ✅ Group messages by conversation
- ✅ View conversation history
- ✅ Resume previous conversations

### 4. Security
- ✅ Backend-only OpenAI API calls
- ✅ User authentication required
- ✅ Role-based data access
- ✅ No API keys exposed to frontend

## 🧪 Testing the AI Assistant

### Test Query Examples

1. **KPI Analysis**
   ```
   "How are we performing vs our KPIs this month?"
   ```

2. **Project Status**
   ```
   "Which projects are delayed and why?"
   ```

3. **Quality Issues**
   ```
   "Show me open NCRs impacting quality"
   ```

4. **Task Management**
   ```
   "What are the high-priority tasks due this week?"
   ```

5. **Action Plan**
   ```
   "Create an action plan to improve production efficiency"
   ```

## 📊 Expected Behavior

### Good Response Example
```
Based on your current KPI data:

**Underperforming KPIs:**
1. NCR Rate: 4.5 NCRs/100tons (Target: 2.0)
   - Gap: 125% above target
   - Status: Behind

2. On-Time Delivery Rate: 92% (Target: 98%)
   - Gap: 6% below target
   - Status: At Risk

**Recommendations:**
1. Focus on root cause analysis for NCRs
2. Review production scheduling
3. Improve coordination with logistics
```

### What the AI Won't Do
- ❌ Invent KPIs that don't exist in your system
- ❌ Reference projects not in your database
- ❌ Provide data it doesn't have access to
- ❌ Make up numbers or statistics

## 🔧 Troubleshooting

### Issue: "OpenAI API key not configured"
**Solution**: Add `OPENAI_API_KEY` to your `.env` file

### Issue: "Unauthorized" error
**Solution**: Make sure you're logged in to the OTS

### Issue: Migration fails with "schema drift"
**Solution**: 
1. Stop dev server
2. Run: `npx prisma db push` (for development)
3. Or use the manual SQL file

### Issue: Prisma generate fails with EPERM
**Solution**:
1. Stop all Node processes
2. Close VS Code
3. Reopen and try again

### Issue: AI responses are generic
**Solution**:
1. Check that you have data in your database
2. Try different context types
3. Verify OpenAI API key is valid

### Issue: Slow responses
**Solution**:
- Normal response time is 2-5 seconds
- Check your internet connection
- Verify OpenAI API status: https://status.openai.com

## 💰 Cost Considerations

### OpenAI API Pricing (GPT-4)
- Input: ~$0.03 per 1K tokens
- Output: ~$0.06 per 1K tokens
- Average query: ~$0.05-$0.15

### Cost Management
1. Set usage limits in OpenAI dashboard
2. Monitor API usage regularly
3. Consider caching for repeated queries
4. Use GPT-3.5-turbo for lower costs (change model in API route)

## 📈 Next Steps

### Recommended Enhancements
1. **Add navigation link** to AI Assistant in main menu
2. **Set up monitoring** for API usage and costs
3. **Train users** on effective prompting
4. **Collect feedback** on AI responses
5. **Fine-tune context** based on usage patterns

### Optional Features
- Streaming responses (show AI typing)
- File attachments for analysis
- Voice input support
- Scheduled automated reports
- Export conversations to PDF

## 📚 Documentation

Full documentation available at: `docs/AI_ASSISTANT_MODULE.md`

## 🆘 Support

If you encounter issues:
1. Check this setup guide
2. Review the troubleshooting section
3. Check OpenAI API status
4. Review server logs for errors

## ✨ Success Checklist

- [ ] OpenAI API key configured in `.env`
- [ ] Database migration completed
- [ ] Prisma client generated
- [ ] Dev server running
- [ ] Can access `/ai-assistant` page
- [ ] Can send messages and get responses
- [ ] Conversations are saved
- [ ] Context selector works

---

**Congratulations!** Your AI Assistant module is ready to use. 🎉

Start by asking it about your current operations, KPIs, or projects!
