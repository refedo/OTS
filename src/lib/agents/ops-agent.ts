import type { OpsAgentMode, OpsAgentRun, Prisma } from '@prisma/client';
import type Anthropic from '@anthropic-ai/sdk';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { systemEventService } from '@/services/system-events.service';
import { anthropic } from './anthropic-client';
import { OPS_AGENT_TOOLS } from './ops-agent-tools';
import { executeTool } from './ops-agent-harness';
import { parseAgentBrief } from '@/lib/ops-agent/parsers';
import { dispatchOpsAgentNotifications } from '@/lib/ops-agent/notifier';

const log = logger.child({ module: 'OpsAgent' });

const OPS_AGENT_MODEL = process.env.OPS_AGENT_MODEL ?? 'claude-sonnet-4-6';

export interface OpsAgentThresholds {
  taskStaleDays: number;
  projectStaleDays: number;
  otApprovalHours: number;
}

export interface OpsAgentConfigData {
  id: string;
  mode: OpsAgentMode;
  enabledModules: Record<string, boolean>;
  thresholds: OpsAgentThresholds;
  notifyWhatsApp: boolean;
  notifyPush: boolean;
}

const SYSTEM_PROMPT = `You are the OTS™ Operations Agent for Hexa Steel®. Your job is to run a structured daily sweep of the ERP system and produce an Ops Brief in JSON format.

Always call ALL six read tools before writing anything. After gathering data, produce a JSON brief wrapped in a \`\`\`json code block with this exact structure:
{
  "summary": "One sentence summary of the day's operational health",
  "earlyWarning": {
    "red": [{ "label": "entity name", "reason": "why it's red" }],
    "amber": [{ "label": "entity name", "reason": "why it's amber" }],
    "green": [{ "label": "entity name", "reason": "why it's green" }]
  },
  "modules": {
    "tasks": { "critical": 0, "stale": 0, "items": [] },
    "projects": { "atRisk": 0, "items": [] },
    "hr": { "otPending": 0, "agencyUnreconciled": 0, "items": [] },
    "pipeline": { "stalled": 0, "items": [] }
  },
  "recommendedActions": [
    { "priority": "HIGH|MEDIUM|LOW", "action": "what to do", "relatedEntity": "optional entity name" }
  ]
}`;

const USER_PROMPT = (mode: OpsAgentMode, thresholds: OpsAgentThresholds, date: string) =>
  `Today is ${date}. Run a full operations sweep for Hexa Steel®.

Mode: ${mode}. Thresholds: task stale after ${thresholds.taskStaleDays} days, project stale after ${thresholds.projectStaleDays} days, OT approval threshold ${thresholds.otApprovalHours} hours.

Call all six read tools, then produce your structured JSON brief. ${
    mode !== 'READ_ONLY'
      ? 'You may also use flag_record and create_followup_task for critical items.'
      : 'Mode is READ_ONLY — do NOT call flag_record or create_followup_task.'
  }`;

export async function runOpsAgent(
  config: OpsAgentConfigData,
  triggeredBy: string,
  triggerType: 'cron' | 'manual' | 'event' = 'manual',
  existingRunId?: string,
): Promise<OpsAgentRun> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not configured');
  }

  const startedAt = Date.now();
  const date = new Date().toLocaleDateString('en-GB', { timeZone: 'Asia/Riyadh' });

  // Use pre-created run if provided (manual triggers create it first to return real ID)
  const run = existingRunId
    ? await prisma.opsAgentRun.findUniqueOrThrow({ where: { id: existingRunId } })
    : await prisma.opsAgentRun.create({
        data: { triggeredBy, triggerType, mode: config.mode, status: 'RUNNING' },
      });

  log.info({ runId: run.id, mode: config.mode, triggeredBy, model: OPS_AGENT_MODEL }, 'Ops Agent run started');

  await systemEventService.log({
    eventType: 'OPS_AGENT_RUN_STARTED',
    eventCategory: 'OPS_AGENT',
    severity: 'INFO',
    entityType: 'ops_agent_run',
    entityId: run.id,
    summary: `Ops Agent run started (${config.mode}) triggered by ${triggeredBy}`,
    details: { mode: config.mode, triggerType, triggeredBy },
  });

  try {
    const messages: Anthropic.MessageParam[] = [
      { role: 'user', content: USER_PROMPT(config.mode, config.thresholds, date) },
    ];

    let finalText = '';
    let inputTokens = 0;
    let outputTokens = 0;
    const actionsExecuted: Record<string, unknown>[] = [];
    let done = false;
    let iterations = 0;

    while (!done && iterations < 20) {
      iterations++;

      const response = await anthropic.messages.create({
        model: OPS_AGENT_MODEL,
        max_tokens: 8192,
        system: SYSTEM_PROMPT,
        tools: OPS_AGENT_TOOLS,
        messages,
      });

      inputTokens += response.usage.input_tokens;
      outputTokens += response.usage.output_tokens;

      // Add assistant response to conversation
      messages.push({ role: 'assistant', content: response.content });

      if (response.stop_reason === 'end_turn') {
        finalText = response.content
          .filter((b): b is Anthropic.TextBlock => b.type === 'text')
          .map((b) => b.text)
          .join('');
        done = true;
      } else if (response.stop_reason === 'tool_use') {
        const toolResults: Anthropic.ToolResultBlockParam[] = [];

        for (const block of response.content) {
          if (block.type !== 'tool_use') continue;

          log.debug({ runId: run.id, tool: block.name }, 'Executing tool');
          const result = await executeTool(
            block.name,
            block.input as Record<string, unknown>,
            config.mode,
            run.id,
          );

          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: result,
          });
          actionsExecuted.push({ tool: block.name, input: block.input, result });
        }

        messages.push({ role: 'user', content: toolResults });
      } else {
        // max_tokens or other stop reason — treat as done
        done = true;
      }
    }

    const brief = parseAgentBrief(finalText);
    const durationMs = Date.now() - startedAt;

    const completedRun = await prisma.opsAgentRun.update({
      where: { id: run.id },
      data: {
        status: 'COMPLETED',
        brief: brief as unknown as Prisma.InputJsonValue,
        actionsExecuted: actionsExecuted as unknown as Prisma.InputJsonValue,
        inputTokens,
        outputTokens,
        durationMs,
      },
      include: { riskFlags: true },
    });

    await systemEventService.log({
      eventType: 'OPS_AGENT_RUN_COMPLETED',
      eventCategory: 'OPS_AGENT',
      severity: 'INFO',
      entityType: 'ops_agent_run',
      entityId: run.id,
      summary: `Ops Agent run completed in ${(durationMs / 1000).toFixed(1)}s — ${inputTokens + outputTokens} tokens`,
      details: { durationMs, inputTokens, outputTokens, mode: config.mode, iterations },
    });

    if (config.notifyPush || config.notifyWhatsApp) {
      await dispatchOpsAgentNotifications(completedRun, config, brief).catch((err) => {
        log.warn({ error: err }, 'Notification dispatch failed (non-fatal)');
      });
    }

    log.info({ runId: run.id, durationMs, inputTokens, outputTokens }, 'Ops Agent run completed');
    return completedRun;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log.error({ error, runId: run.id }, 'Ops Agent run failed');

    const failedRun = await prisma.opsAgentRun.update({
      where: { id: run.id },
      data: {
        status: 'FAILED',
        errorMessage,
        durationMs: Date.now() - startedAt,
      },
    });

    await systemEventService.log({
      eventType: 'OPS_AGENT_RUN_FAILED',
      eventCategory: 'OPS_AGENT',
      severity: 'ERROR',
      entityType: 'ops_agent_run',
      entityId: run.id,
      summary: `Ops Agent run failed: ${errorMessage}`,
      details: { error: errorMessage, mode: config.mode },
    });

    return failedRun;
  }
}
