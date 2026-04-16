import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';
import { APP_VERSION } from '@/lib/version';

const CURRENT_VERSION = {
  ...APP_VERSION,
  mainTitle: '🤖 OTS™ Operations Agent — Autonomous AI Sweep Engine',
  highlights: [
    'Introducing the OTS™ Operations Agent: a Claude-powered autonomous module that sweeps Tasks, Projects, HR/Manpower, and Pipeline daily, producing a structured Ops Brief with RED / AMBER / GREEN early warning signals.',
    'Three operating modes: READ_ONLY (observe only), ANNOTATE (flag records with risk notes), and FULL_ACTOR (trigger escalations and create follow-up tasks). Mode is enforced at the API harness level.',
    'Separate OpsRiskFlag table lets the agent annotate individual entities independently of the existing EWS — comparison mode shows both side-by-side.',
    'Daily cron runs automatically on the Saudi work week (Saturday–Wednesday, 07:00 Riyadh). Trigger manually from the /ops-agent dashboard at any time.',
    'Full UI dashboard: run history, live Ops Brief view, risk flag resolution, mode switcher, and configurable thresholds — all at /ops-agent.',
    'Push notifications dispatched to all ops_agent.view users after each completed run with RED/AMBER flag counts.',
  ],
  changes: {
    added: [
      'OpsAgentConfig Prisma model: stores mode, thresholds (taskStaleDays, projectStaleDays, otApprovalHours), enabled modules, schedule config',
      'OpsAgentRun Prisma model: tracks every agent run with status, brief JSON, input/output tokens, duration, session ID',
      'OpsRiskFlag Prisma model: entity-level risk flags with severity (RED/AMBER/GREEN), agent note, module tag, resolution tracking',
      'Idempotent SQL migration: prisma/manual_migrations/add_ops_agent_module.sql',
      'Anthropic SDK client with managed-agents-2026-04-01 beta header (src/lib/agents/anthropic-client.ts)',
      '9 agent tool definitions: get_stale_tasks, get_project_health, get_pipeline_stalls, get_hr_flags, get_project_status, get_recent_system_events (read), flag_record, create_followup_task, trigger_escalation (write, mode-gated)',
      'Agent harness: mode enforcement, tool→endpoint routing, x-ots-agent-secret authentication (src/lib/agents/ops-agent-harness.ts)',
      'Full session loop: stream events, handle agent.custom_tool_use, send user.custom_tool_result, parse structured brief (src/lib/agents/ops-agent.ts)',
      'Internal agent routes (/api/agent/ — agent-secret auth): tasks/stale, projects/health, pipeline/stalls, hr/flags, projects/status, events/recent, actions/flag-record, actions/create-task, actions/trigger-escalation',
      'Management API (/api/ops-agent/): POST /run (fire-and-forget 202), GET /run/[id], GET /runs, GET+PATCH /config, POST /cron, PATCH /flags/[id]/resolve',
      'OpsAgentScheduler: Saturday–Wednesday 07:00 Riyadh cron, registered in cron-registry and initialized in instrumentation.ts',
      'ops_agent.* permissions: view, run, configure, resolve_flags — added to ops_agent permission category',
      '/ops-agent navigation guard in navigation-permissions.ts',
      'OPS_AGENT event category + 10 event types in system-events (RUN_STARTED, RUN_COMPLETED, RUN_FAILED, CONFIG_UPDATED, MODE_CHANGED, RISK_FLAG_CREATED, RISK_FLAG_RESOLVED, ACTION_BLOCKED, TASK_CREATED, ESCALATION_TRIGGERED)',
      '/ops-agent page with server-side permission guard (ops_agent.view)',
      'OpsAgentLayout: live polling, run state management, 2-column responsive layout',
      'RunTriggerCard: run now button, live status messages, token/duration display',
      'OpsBriefView: RED/AMBER/GREEN cards, expandable module sections, recommended actions list',
      'RiskFlagList: flag table with severity icons, resolve button per flag',
      'RunHistoryList: last 10 runs with status, token count, flag count, click-to-load',
      'ModeSwitcher: three-button toggle, FULL_ACTOR requires confirmation dialog',
      'ThresholdEditor: threshold inputs, module enable/disable checkboxes, save button',
      'ComparisonBanner: dismissible info banner about EWS comparison mode',
      'Ops Agent sidebar entry: Radar icon, newSince badge, between CEO Dashboard and Early Warning',
      'Env vars: ANTHROPIC_API_KEY, OTS_OPS_AGENT_ID, OTS_OPS_AGENT_ENVIRONMENT_ID, OTS_INTERNAL_API_SECRET, ENABLE_OPS_AGENT_SCHEDULER, OPS_AGENT_CRON_SCHEDULE',
    ],
    fixed: [],
    changed: [
      'Version bumped to 19.0.0 (major — first autonomous AI agent module)',
    ],
  },
};

export async function GET(_req: NextRequest) {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;

  let alreadySeen = false;
  if (session) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: session.sub },
        select: { customPermissions: true },
      });
      const perms = user?.customPermissions as Record<string, unknown> | null;
      if (perms?.lastSeenVersion === CURRENT_VERSION.version) {
        alreadySeen = true;
      }
    } catch {
      // Non-critical; fall back to client-side check
    }
  }

  return NextResponse.json({ ...CURRENT_VERSION, alreadySeen });
}
