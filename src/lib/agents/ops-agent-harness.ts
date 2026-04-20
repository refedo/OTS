import type { OpsAgentMode } from '@prisma/client';
import { logger } from '@/lib/logger';
import type { OpsToolName } from './ops-agent-tools';

const log = logger.child({ module: 'OpsAgentHarness' });

const MODE_ORDER: OpsAgentMode[] = ['READ_ONLY', 'ANNOTATE', 'FULL_ACTOR'];

const TOOL_MODE_REQUIREMENTS: Record<OpsToolName, OpsAgentMode> = {
  get_stale_tasks: 'READ_ONLY',
  get_project_health: 'READ_ONLY',
  get_pipeline_stalls: 'READ_ONLY',
  get_hr_flags: 'READ_ONLY',
  get_project_status: 'READ_ONLY',
  get_recent_system_events: 'READ_ONLY',
  flag_record: 'ANNOTATE',
  create_followup_task: 'ANNOTATE',
  trigger_escalation: 'FULL_ACTOR',
};

const TOOL_ENDPOINTS: Record<OpsToolName, { method: string; path: string }> = {
  get_stale_tasks: { method: 'GET', path: '/api/agent/tasks/stale' },
  get_project_health: { method: 'GET', path: '/api/agent/projects/health' },
  get_pipeline_stalls: { method: 'GET', path: '/api/agent/pipeline/stalls' },
  get_hr_flags: { method: 'GET', path: '/api/agent/hr/flags' },
  get_project_status: { method: 'GET', path: '/api/agent/projects/status' },
  get_recent_system_events: { method: 'GET', path: '/api/agent/events/recent' },
  flag_record: { method: 'PATCH', path: '/api/agent/actions/flag-record' },
  create_followup_task: { method: 'POST', path: '/api/agent/actions/create-task' },
  trigger_escalation: { method: 'POST', path: '/api/agent/actions/trigger-escalation' },
};

function modeAllows(current: OpsAgentMode, required: OpsAgentMode): boolean {
  return MODE_ORDER.indexOf(current) >= MODE_ORDER.indexOf(required);
}

export async function executeTool(
  toolName: string,
  input: Record<string, unknown>,
  mode: OpsAgentMode,
  runId: string,
): Promise<string> {
  const name = toolName as OpsToolName;
  const requiredMode = TOOL_MODE_REQUIREMENTS[name];

  if (!requiredMode) {
    return JSON.stringify({ error: `Unknown tool: ${toolName}` });
  }

  if (!modeAllows(mode, requiredMode)) {
    log.warn({ toolName, mode, requiredMode }, 'Harness blocked tool — insufficient mode');
    return JSON.stringify({
      error: `Tool '${toolName}' requires mode '${requiredMode}' but current mode is '${mode}'. Action blocked.`,
      blocked: true,
    });
  }

  const endpoint = TOOL_ENDPOINTS[name];
  const baseUrl =
    process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
  const secret = process.env.OTS_INTERNAL_API_SECRET!;

  let url = `${baseUrl}${basePath}${endpoint.path}`;
  let body: string | undefined;

  const safeInput = input ?? {};
  if (endpoint.method === 'GET') {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(safeInput)) {
      if (v !== undefined && v !== null) params.set(k, String(v));
    }
    params.set('runId', runId);
    const qs = params.toString();
    if (qs) url += `?${qs}`;
  } else {
    body = JSON.stringify({ ...safeInput, runId });
  }

  try {
    const res = await fetch(url, {
      method: endpoint.method,
      headers: {
        'Content-Type': 'application/json',
        'x-ots-agent-secret': secret,
      },
      ...(body ? { body } : {}),
    });

    const text = await res.text();

    if (!res.ok) {
      log.error({ toolName, status: res.status, body: text }, 'Tool endpoint returned error');
      return JSON.stringify({ error: `Tool '${toolName}' failed: ${res.status} ${text}` });
    }

    // Limit result size to stay within provider TPM limits (e.g. Groq free tier = 12k TPM).
    // ~3 chars ≈ 1 token; keeping results under 6 000 chars ≈ 2 000 tokens leaves room for
    // system prompt, tool definitions, and model output within a 12 000 TPM budget.
    const MAX_CHARS = 6000;
    if (text.length > MAX_CHARS) {
      const truncated = text.slice(0, MAX_CHARS);
      // Close the JSON array/object so the string is still parseable where possible
      log.warn({ toolName, originalLength: text.length }, 'Tool result truncated to fit TPM limit');
      return truncated + `\n...[TRUNCATED: result was ${text.length} chars, showing first ${MAX_CHARS}]`;
    }

    return text;
  } catch (error) {
    log.error({ error, toolName }, 'Tool endpoint call failed');
    return JSON.stringify({ error: `Tool '${toolName}' network error: ${String(error)}` });
  }
}
