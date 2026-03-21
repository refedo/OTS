'use client';

import React, { useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  SUB_ACTIVITY_DEPENDENCIES,
  SUB_ACTIVITIES,
  getMainActivityLabel,
  getSubActivityLabel,
} from '@/lib/activity-constants';

type Task = {
  id: string;
  title: string;
  taskInputDate: string | null;
  dueDate: string | null;
  status: string;
  approvedAt: string | null;
  mainActivity: string | null;
  subActivity: string | null;
  project: { id: string; projectNumber: string; name: string } | null;
  building: { id: string; designation: string; name: string } | null;
};

const ROW_HEIGHT = 36;
const LEFT_WIDTH = 300;
const DAY_WIDTH = 5;
const HEADER_HEIGHT = 44;

function findSubActivityLabel(subKey: string): string {
  for (const subs of Object.values(SUB_ACTIVITIES)) {
    const found = subs.find((s) => s.key === subKey);
    if (found) return found.label;
  }
  return subKey;
}

type SubActData = {
  tasks: Task[];
  startDate: Date | null;
  endDate: Date | null;
  completedCount: number;
  approvedCount: number;
};

type GanttRow =
  | { type: 'project'; key: string; label: string; indent: number }
  | { type: 'building'; key: string; label: string; indent: number }
  | { type: 'activity'; key: string; label: string; indent: number }
  | {
      type: 'subactivity';
      key: string;
      label: string;
      indent: number;
      subActivityKey: string;
      mainActivityKey: string;
      buildingKey: string;
      startDate: Date | null;
      endDate: Date | null;
      taskCount: number;
      completedCount: number;
      approvedCount: number;
      isBlocked: boolean;
      blockedByLabel: string;
    };

export function TasksGanttView({ tasks }: { tasks: Task[] }) {
  const { rows, globalStart, globalEnd } = useMemo(() => {
    const projectMap = new Map<
      string,
      {
        project: Task['project'];
        buildings: Map<
          string,
          {
            building: Task['building'];
            activities: Map<
              string,
              {
                label: string;
                subActivities: Map<string, SubActData>;
              }
            >;
          }
        >;
      }
    >();

    tasks.forEach((task) => {
      if (!task.project) return;
      if (!task.taskInputDate && !task.dueDate) return;

      const pKey = task.project.id;
      if (!projectMap.has(pKey)) {
        projectMap.set(pKey, { project: task.project, buildings: new Map() });
      }
      const pg = projectMap.get(pKey)!;

      const bKey = task.building?.id || '__no_building__';
      if (!pg.buildings.has(bKey)) {
        pg.buildings.set(bKey, { building: task.building, activities: new Map() });
      }
      const bg = pg.buildings.get(bKey)!;

      const actKey = task.mainActivity || '__no_activity__';
      const actLabel = task.mainActivity ? getMainActivityLabel(task.mainActivity) : 'General';
      if (!bg.activities.has(actKey)) {
        bg.activities.set(actKey, { label: actLabel, subActivities: new Map() });
      }
      const ag = bg.activities.get(actKey)!;

      const subKey = task.subActivity || '__no_sub__';
      if (!ag.subActivities.has(subKey)) {
        ag.subActivities.set(subKey, {
          tasks: [],
          startDate: null,
          endDate: null,
          completedCount: 0,
          approvedCount: 0,
        });
      }
      const sg = ag.subActivities.get(subKey)!;
      sg.tasks.push(task);

      if (task.taskInputDate) {
        const d = new Date(task.taskInputDate);
        if (!sg.startDate || d < sg.startDate) sg.startDate = d;
      }
      if (task.dueDate) {
        const d = new Date(task.dueDate);
        if (!sg.endDate || d > sg.endDate) sg.endDate = d;
      }
      if (['Completed', 'Waiting for Approval'].includes(task.status)) sg.completedCount++;
      if (task.approvedAt) sg.approvedCount++;
    });

    const rows: GanttRow[] = [];
    let globalStart: Date | null = null;
    let globalEnd: Date | null = null;

    for (const [, { project, buildings }] of projectMap) {
      const pKey = project!.id;
      rows.push({
        type: 'project',
        key: pKey,
        label: `Project# ${project?.projectNumber} — ${project?.name}`,
        indent: 0,
      });

      for (const [bKey, { building, activities }] of buildings) {
        rows.push({
          type: 'building',
          key: `${pKey}-${bKey}`,
          label: building
            ? `${building.name} (${building.designation})`
            : 'No Building',
          indent: 1,
        });

        // Collect all sub-activity data for this building (for blocked checking)
        const buildingSubActMap = new Map<string, SubActData>();
        for (const [, { subActivities }] of activities) {
          for (const [subKey, subData] of subActivities) {
            buildingSubActMap.set(subKey, subData);
          }
        }

        for (const [actKey, { label: actLabel, subActivities }] of activities) {
          rows.push({
            type: 'activity',
            key: `${pKey}-${bKey}-${actKey}`,
            label: actLabel,
            indent: 2,
          });

          for (const [subKey, subData] of subActivities) {
            const subLabel =
              actKey !== '__no_activity__' && subKey !== '__no_sub__'
                ? getSubActivityLabel(actKey, subKey)
                : 'General';

            const predecessorKey = SUB_ACTIVITY_DEPENDENCIES[subKey];
            let isBlocked = false;
            let blockedByLabel = '';

            if (predecessorKey) {
              const predData = buildingSubActMap.get(predecessorKey);
              if (predData && predData.tasks.length > 0) {
                const allApproved = predData.tasks.every((t) => t.approvedAt);
                isBlocked = !allApproved;
                if (isBlocked) {
                  blockedByLabel = findSubActivityLabel(predecessorKey);
                }
              }
            }

            if (subData.startDate) {
              if (!globalStart || subData.startDate < globalStart)
                globalStart = subData.startDate;
            }
            if (subData.endDate) {
              if (!globalEnd || subData.endDate > globalEnd)
                globalEnd = subData.endDate;
            }

            rows.push({
              type: 'subactivity',
              key: `${pKey}-${bKey}-${actKey}-${subKey}`,
              label: subLabel,
              indent: 3,
              subActivityKey: subKey,
              mainActivityKey: actKey,
              buildingKey: `${pKey}-${bKey}`,
              startDate: subData.startDate,
              endDate: subData.endDate,
              taskCount: subData.tasks.length,
              completedCount: subData.completedCount,
              approvedCount: subData.approvedCount,
              isBlocked,
              blockedByLabel,
            });
          }
        }
      }
    }

    return { rows, globalStart, globalEnd };
  }, [tasks]);

  const chartStart = useMemo(() => {
    if (!globalStart) return new Date();
    const d = new Date(globalStart);
    d.setDate(1);
    d.setMonth(d.getMonth() - 1);
    return d;
  }, [globalStart]);

  const chartEnd = useMemo(() => {
    if (!globalEnd) return new Date();
    const d = new Date(globalEnd);
    d.setDate(1);
    d.setMonth(d.getMonth() + 2);
    return d;
  }, [globalEnd]);

  const totalDays = Math.max(
    30,
    Math.ceil((chartEnd.getTime() - chartStart.getTime()) / (1000 * 60 * 60 * 24))
  );
  const chartWidth = totalDays * DAY_WIDTH;
  const totalHeight = rows.length * ROW_HEIGHT + HEADER_HEIGHT;
  const svgWidth = LEFT_WIDTH + chartWidth;

  const months = useMemo(() => {
    const result: { label: string; x: number; width: number }[] = [];
    const d = new Date(chartStart);
    d.setDate(1);

    while (d < chartEnd) {
      const startX = Math.max(
        0,
        Math.ceil((d.getTime() - chartStart.getTime()) / (1000 * 60 * 60 * 24)) * DAY_WIDTH
      );
      const monthEnd = new Date(d);
      monthEnd.setMonth(monthEnd.getMonth() + 1);
      const endX = Math.min(
        chartWidth,
        Math.ceil((monthEnd.getTime() - chartStart.getTime()) / (1000 * 60 * 60 * 24)) * DAY_WIDTH
      );

      result.push({
        label: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        x: startX,
        width: endX - startX,
      });
      d.setMonth(d.getMonth() + 1);
    }
    return result;
  }, [chartStart, chartEnd, chartWidth]);

  const getBarParams = (row: GanttRow) => {
    if (row.type !== 'subactivity' || (!row.startDate && !row.endDate)) return null;

    const start = row.startDate || row.endDate!;
    const end = row.endDate || row.startDate!;

    const startDays = Math.ceil(
      (start.getTime() - chartStart.getTime()) / (1000 * 60 * 60 * 24)
    );
    const endDays = Math.ceil(
      (end.getTime() - chartStart.getTime()) / (1000 * 60 * 60 * 24)
    );
    const x = LEFT_WIDTH + startDays * DAY_WIDTH;
    const width = Math.max(10, (endDays - startDays) * DAY_WIDTH);

    return { x, width, startDays, endDays };
  };

  const today = new Date();
  const todayX =
    LEFT_WIDTH +
    Math.ceil((today.getTime() - chartStart.getTime()) / (1000 * 60 * 60 * 24)) * DAY_WIDTH;

  // Build dependency arrows
  const arrows = useMemo(() => {
    const subActIdx = new Map<string, number>();
    rows.forEach((row, idx) => {
      if (row.type === 'subactivity') {
        subActIdx.set(`${row.buildingKey}-${row.subActivityKey}`, idx);
      }
    });

    const result: {
      fromIdx: number;
      toIdx: number;
      isBlocked: boolean;
    }[] = [];

    rows.forEach((row, idx) => {
      if (row.type !== 'subactivity') return;
      const predKey = SUB_ACTIVITY_DEPENDENCIES[row.subActivityKey];
      if (!predKey) return;
      const predIdx = subActIdx.get(`${row.buildingKey}-${predKey}`);
      if (predIdx === undefined) return;
      result.push({ fromIdx: predIdx, toIdx: idx, isBlocked: row.isBlocked });
    });

    return result;
  }, [rows]);

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-2 text-muted-foreground">
        <AlertTriangle className="h-8 w-8 text-amber-400" />
        <p className="text-sm">
          No tasks with dates found. Assign input dates and due dates to tasks to see them in
          the Gantt view.
        </p>
      </div>
    );
  }

  const rowBgColors: Record<GanttRow['type'], string> = {
    project: '#dbeafe',
    building: '#fef3c7',
    activity: '#f3e8ff',
    subactivity: '#d1fae5',
  };

  const leftTextColors: Record<GanttRow['type'], string> = {
    project: '#1d4ed8',
    building: '#92400e',
    activity: '#6b21a8',
    subactivity: '#065f46',
  };

  return (
    <div>
      <div className="overflow-auto" style={{ maxHeight: '75vh' }}>
        <svg
          width={svgWidth}
          height={totalHeight}
          style={{ display: 'block', fontFamily: 'inherit' }}
        >
          {/* ── Background ── */}
          <rect x={0} y={0} width={svgWidth} height={totalHeight} fill="#fff" />

          {/* ── Month headers ── */}
          {months.map((m, i) => (
            <g key={i}>
              <rect
                x={LEFT_WIDTH + m.x}
                y={0}
                width={m.width}
                height={HEADER_HEIGHT}
                fill={i % 2 === 0 ? '#f8fafc' : '#f1f5f9'}
              />
              <text
                x={LEFT_WIDTH + m.x + m.width / 2}
                y={HEADER_HEIGHT / 2 + 5}
                textAnchor="middle"
                fontSize="11"
                fill="#475569"
                fontWeight="600"
              >
                {m.label}
              </text>
              <line
                x1={LEFT_WIDTH + m.x}
                y1={0}
                x2={LEFT_WIDTH + m.x}
                y2={totalHeight}
                stroke="#e2e8f0"
                strokeWidth="1"
              />
            </g>
          ))}

          {/* ── Left panel header ── */}
          <rect x={0} y={0} width={LEFT_WIDTH} height={HEADER_HEIGHT} fill="#f1f5f9" />
          <text x={12} y={HEADER_HEIGHT / 2 + 5} fontSize="12" fill="#374151" fontWeight="700">
            Task Hierarchy
          </text>

          {/* ── Rows ── */}
          {rows.map((row, idx) => {
            const y = HEADER_HEIGHT + idx * ROW_HEIGHT;
            const bg = rowBgColors[row.type];
            const textColor = leftTextColors[row.type];
            const paddingLeft = row.indent * 20 + 12;
            const barParams = getBarParams(row);
            const isSub = row.type === 'subactivity';

            let barFill = '#93c5fd';
            if (isSub) {
              const r = row as Extract<GanttRow, { type: 'subactivity' }>;
              if (r.isBlocked) barFill = '#f87171';
              else if (r.approvedCount === r.taskCount && r.taskCount > 0) barFill = '#22c55e';
              else if (r.completedCount === r.taskCount && r.taskCount > 0) barFill = '#34d399';
              else if (r.endDate && r.endDate < today && r.completedCount < r.taskCount)
                barFill = '#fb923c';
              else if (r.completedCount > 0) barFill = '#60a5fa';
            }

            return (
              <g key={row.key}>
                {/* Left label bg */}
                <rect x={0} y={y} width={LEFT_WIDTH} height={ROW_HEIGHT} fill={bg} />
                {/* Right chart bg */}
                <rect
                  x={LEFT_WIDTH}
                  y={y}
                  width={chartWidth}
                  height={ROW_HEIGHT}
                  fill={bg}
                  opacity={0.5}
                />
                {/* Horizontal divider */}
                <line
                  x1={0}
                  y1={y + ROW_HEIGHT}
                  x2={svgWidth}
                  y2={y + ROW_HEIGHT}
                  stroke="#e5e7eb"
                  strokeWidth="0.5"
                />

                {/* Label text */}
                <text
                  x={paddingLeft}
                  y={y + ROW_HEIGHT / 2 + 4}
                  fontSize={row.type === 'project' ? 12 : row.type === 'building' ? 11 : 10}
                  fill={textColor}
                  fontWeight={row.type === 'project' || row.type === 'building' ? '700' : '500'}
                >
                  {row.label.length > 36 ? row.label.slice(0, 35) + '…' : row.label}
                  {isSub &&
                    (() => {
                      const r = row as Extract<GanttRow, { type: 'subactivity' }>;
                      return (
                        <tspan fontSize="9" fill="#94a3b8" dx="4">
                          {r.completedCount}/{r.taskCount}
                        </tspan>
                      );
                    })()}
                </text>

                {/* Blocked icon */}
                {isSub &&
                  (row as Extract<GanttRow, { type: 'subactivity' }>).isBlocked && (
                    <text
                      x={LEFT_WIDTH - 18}
                      y={y + ROW_HEIGHT / 2 + 4}
                      fontSize="12"
                      fill="#ef4444"
                      title="Blocked"
                    >
                      ⚠
                    </text>
                  )}

                {/* Gantt bar */}
                {barParams && isSub && (
                  <g>
                    {/* Shadow */}
                    <rect
                      x={barParams.x + 1}
                      y={y + 8}
                      width={barParams.width}
                      height={ROW_HEIGHT - 16}
                      rx="3"
                      fill="rgba(0,0,0,0.08)"
                    />
                    {/* Bar */}
                    <rect
                      x={barParams.x}
                      y={y + 7}
                      width={barParams.width}
                      height={ROW_HEIGHT - 14}
                      rx="3"
                      fill={barFill}
                    />
                    {/* Progress overlay */}
                    {(() => {
                      const r = row as Extract<GanttRow, { type: 'subactivity' }>;
                      if (!r.taskCount || !r.completedCount || r.completedCount >= r.taskCount)
                        return null;
                      return (
                        <rect
                          x={barParams.x}
                          y={y + 7}
                          width={barParams.width * (r.completedCount / r.taskCount)}
                          height={ROW_HEIGHT - 14}
                          rx="3"
                          fill="rgba(255,255,255,0.3)"
                        />
                      );
                    })()}
                    {/* Bar label */}
                    {barParams.width > 40 && (
                      <text
                        x={barParams.x + 5}
                        y={y + ROW_HEIGHT / 2 + 4}
                        fontSize="9"
                        fill="white"
                        fontWeight="700"
                      >
                        {(row as Extract<GanttRow, { type: 'subactivity' }>).isBlocked
                          ? 'BLOCKED'
                          : `${(row as Extract<GanttRow, { type: 'subactivity' }>).approvedCount}/${(row as Extract<GanttRow, { type: 'subactivity' }>).taskCount} approved`}
                      </text>
                    )}
                  </g>
                )}

                {/* No-bar indicator */}
                {isSub && !barParams && (
                  <text
                    x={LEFT_WIDTH + 8}
                    y={y + ROW_HEIGHT / 2 + 4}
                    fontSize="9"
                    fill="#94a3b8"
                    fontStyle="italic"
                  >
                    no dates set
                  </text>
                )}
              </g>
            );
          })}

          {/* ── Vertical divider between left and right panels ── */}
          <line
            x1={LEFT_WIDTH}
            y1={0}
            x2={LEFT_WIDTH}
            y2={totalHeight}
            stroke="#94a3b8"
            strokeWidth="1.5"
          />

          {/* ── Today line ── */}
          {todayX > LEFT_WIDTH && todayX < svgWidth && (
            <g>
              <line
                x1={todayX}
                y1={0}
                x2={todayX}
                y2={totalHeight}
                stroke="#ef4444"
                strokeWidth="1.5"
                strokeDasharray="5,3"
              />
              <rect x={todayX - 1} y={0} width={26} height={14} fill="#ef4444" rx="2" />
              <text x={todayX + 2} y={10} fontSize="8" fill="white" fontWeight="700">
                TODAY
              </text>
            </g>
          )}

          {/* ── Dependency arrows ── */}
          {arrows.map((arrow, i) => {
            const fromRow = rows[arrow.fromIdx];
            const toRow = rows[arrow.toIdx];
            if (fromRow.type !== 'subactivity' || toRow.type !== 'subactivity') return null;

            const fromBar = getBarParams(fromRow);
            const toBar = getBarParams(toRow);
            if (!fromBar || !toBar) return null;

            const y1 = HEADER_HEIGHT + arrow.fromIdx * ROW_HEIGHT + ROW_HEIGHT / 2;
            const y2 = HEADER_HEIGHT + arrow.toIdx * ROW_HEIGHT + ROW_HEIGHT / 2;
            const x1 = fromBar.x + fromBar.width;
            const x2 = toBar.x;

            const bendX = Math.max(x1 + 12, x2 - 8);
            const color = arrow.isBlocked ? '#ef4444' : '#64748b';
            const dash = arrow.isBlocked ? '5,3' : undefined;

            return (
              <g key={i} opacity={0.85}>
                <path
                  d={`M ${x1} ${y1} L ${bendX} ${y1} L ${bendX} ${y2} L ${x2} ${y2}`}
                  stroke={color}
                  strokeWidth="1.5"
                  fill="none"
                  strokeDasharray={dash}
                  markerEnd={`url(#arrowhead-${arrow.isBlocked ? 'blocked' : 'normal'})`}
                />
              </g>
            );
          })}

          {/* ── Arrow marker defs ── */}
          <defs>
            <marker
              id="arrowhead-normal"
              markerWidth="8"
              markerHeight="6"
              refX="8"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 8 3, 0 6" fill="#64748b" />
            </marker>
            <marker
              id="arrowhead-blocked"
              markerWidth="8"
              markerHeight="6"
              refX="8"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 8 3, 0 6" fill="#ef4444" />
            </marker>
          </defs>
        </svg>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 px-4 py-2.5 border-t text-xs text-muted-foreground bg-muted/20">
        <span className="font-medium text-foreground">Legend:</span>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-3 rounded" style={{ background: '#22c55e' }} />
          All Approved
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-3 rounded" style={{ background: '#34d399' }} />
          All Completed
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-3 rounded" style={{ background: '#60a5fa' }} />
          In Progress
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-3 rounded" style={{ background: '#fb923c' }} />
          Overdue
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-3 rounded" style={{ background: '#f87171' }} />
          Blocked
        </div>
        <div className="flex items-center gap-1.5 ml-1">
          <svg width="28" height="12">
            <line x1="0" y1="6" x2="20" y2="6" stroke="#64748b" strokeWidth="1.5" />
            <polygon points="20,6 14,3 14,9" fill="#64748b" />
          </svg>
          Dependency
        </div>
        <div className="flex items-center gap-1.5">
          <svg width="28" height="12">
            <line
              x1="0"
              y1="6"
              x2="20"
              y2="6"
              stroke="#ef4444"
              strokeWidth="1.5"
              strokeDasharray="5,3"
            />
            <polygon points="20,6 14,3 14,9" fill="#ef4444" />
          </svg>
          Blocked dependency
        </div>
        <div className="flex items-center gap-1.5 text-red-500">
          <span>⚠</span> Predecessor not fully approved
        </div>
      </div>
    </div>
  );
}
