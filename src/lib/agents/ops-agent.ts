import type { OpsAgentMode, OpsAgentRun, Prisma } from '@prisma/client';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { systemEventService } from '@/services/system-events.service';
import { anthropic } from './anthropic-client';
import { executeTool } from './ops-agent-harness';
import { parseAgentBrief } from '@/lib/ops-agent/parsers';
import { dispatchOpsAgentNotifications } from '@/lib/ops-agent/notifier';
import type { BetaManagedAgentsStreamSessionEvents } from '@anthropic-ai/sdk/resources/beta/sessions/events';

const log = logger.child({ module: 'OpsAgent' });

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

const SYSTEM_PROMPT_INJECTION = (mode: OpsAgentMode, thresholds: OpsAgentThresholds, date: string) =>
  `Run a full operations sweep for Hexa Steel® today (${date}).
Call all read tools (get_stale_tasks, get_project_health, get_pipeline_stalls, get_hr_flags, get_project_status, get_recent_system_events), then produce your structured brief.
Current mode: ${mode}. Thresholds: ${JSON.stringify(thresholds)}.`;

export async function runOpsAgent(
  config: OpsAgentConfigData,
  triggeredBy: string,
  triggerType: 'cron' | 'manual' | 'event' = 'manual',
): Promise<OpsAgentRun> {
  const agentId = process.env.OTS_OPS_AGENT_ID;
  if (!agentId) {
    throw new Error('OTS_OPS_AGENT_ID is not configured');
  }

  const startedAt = Date.now();
  const date = new Date().toLocaleDateString('en-GB', { timeZone: 'Asia/Riyadh' });

  const run = await prisma.opsAgentRun.create({
    data: {
      triggeredBy,
      triggerType,
      mode: config.mode,
      status: 'RUNNING',
    },
  });

  log.info({ runId: run.id, mode: config.mode, triggeredBy }, 'Ops Agent run started');

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
    const environmentId = process.env.OTS_OPS_AGENT_ENVIRONMENT_ID ?? '';
    const session = await anthropic.beta.sessions.create({ agent: agentId, environment_id: environmentId });
    log.info({ runId: run.id, sessionId: session.id }, 'Managed agent session created');

    await prisma.opsAgentRun.update({
      where: { id: run.id },
      data: { sessionId: session.id },
    });

    await anthropic.beta.sessions.events.send(session.id, {
      events: [
        {
          type: 'user.message',
          content: [
            {
              type: 'text',
              text: SYSTEM_PROMPT_INJECTION(config.mode, config.thresholds, date),
            },
          ],
        },
      ],
    });

    let finalText = '';
    let inputTokens = 0;
    let outputTokens = 0;
    const actionsExecuted: Record<string, unknown>[] = [];
    const pendingToolCalls = new Map<string, { name: string; input: Record<string, unknown> }>();
    let done = false;

    while (!done) {
      const streamResponse = await anthropic.beta.sessions.events.stream(session.id);

      for await (const event of streamResponse as AsyncIterable<BetaManagedAgentsStreamSessionEvents>) {
        if (event.type === 'agent.custom_tool_use') {
          pendingToolCalls.set(event.id, { name: event.name, input: event.input as Record<string, unknown> });
          log.debug({ runId: run.id, tool: event.name }, 'Tool use event received');
        } else if (event.type === 'agent.message') {
          finalText = event.content.map((b) => b.text).join('');
        } else if (event.type === 'span.model_request_end') {
          if (event.model_usage) {
            inputTokens += event.model_usage.input_tokens ?? 0;
            outputTokens += event.model_usage.output_tokens ?? 0;
          }
        } else if (event.type === 'session.status_idle') {
          if (event.stop_reason.type === 'end_turn') {
            done = true;
            break;
          } else if (event.stop_reason.type === 'requires_action') {
            const toolResultEvents: Array<{
              type: 'user.custom_tool_result';
              custom_tool_use_id: string;
              content: Array<{ type: 'text'; text: string }>;
            }> = [];

            for (const eventId of event.stop_reason.event_ids) {
              const toolCall = pendingToolCalls.get(eventId);
              if (!toolCall) continue;

              const result = await executeTool(toolCall.name, toolCall.input, config.mode, run.id);
              toolResultEvents.push({
                type: 'user.custom_tool_result',
                custom_tool_use_id: eventId,
                content: [{ type: 'text', text: result }],
              });
              actionsExecuted.push({ tool: toolCall.name, input: toolCall.input, result });
              pendingToolCalls.delete(eventId);
            }

            if (toolResultEvents.length > 0) {
              await anthropic.beta.sessions.events.send(session.id, {
                events: toolResultEvents,
              });
            }

            break;
          } else if (event.stop_reason.type === 'retries_exhausted') {
            log.warn({ runId: run.id }, 'Agent session retries exhausted');
            done = true;
            break;
          }
        } else if (event.type === 'session.status_terminated') {
          done = true;
          break;
        }
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
      summary: `Ops Agent run completed in ${durationMs}ms — ${inputTokens + outputTokens} tokens`,
      details: { durationMs, inputTokens, outputTokens, mode: config.mode },
    });

    if (config.notifyPush || config.notifyWhatsApp) {
      await dispatchOpsAgentNotifications(completedRun, config, brief).catch((err) => {
        log.warn({ error: err }, 'Notification dispatch failed (non-fatal)');
      });
    }

    log.info({ runId: run.id, durationMs }, 'Ops Agent run completed');
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
