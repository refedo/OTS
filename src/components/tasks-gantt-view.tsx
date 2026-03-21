'use client';

import React, { useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';
import {
  SUB_ACTIVITY_DEPENDENCIES,
  SUB_ACTIVITIES,
  getMainActivityLabel,
  getSubActivityLabel,
} from '@/lib/activity-constants';

// ─── Types ───────────────────────────────────────────────────────────────────

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
      buildingKey: string;
      startDate: Date | null;
      endDate: Date | null;
      taskCount: number;
      completedCount: number;
      approvedCount: number;
      isBlocked: boolean;
      blockedByLabel: string;
    };

// ─── Layout constants ────────────────────────────────────────────────────────

const ROW_H = 32;
const MONTH_H = 22;  // top header: month names
const WEEK_H = 18;   // bottom header: week dates
const HEADER_H = MONTH_H + WEEK_H;

// Left-panel columns
const COL_NAME = 220;
const COL_START = 78;
const COL_FINISH = 78;
const COL_DUR = 52;
const LEFT_W = COL_NAME + COL_START + COL_FINISH + COL_DUR;

// Right-panel
const DAY_W = 7; // pixels per day

// ─── Helpers ─────────────────────────────────────────────────────────────────

function findSubActivityLabel(subKey: string): string {
  for (const subs of Object.values(SUB_ACTIVITIES)) {
    const found = subs.find((s) => s.key === subKey);
    if (found) return found.label;
  }
  return subKey;
}

function fmt(d: Date | null | undefined): string {
  if (!d) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
}

function diffDays(a: Date, b: Date): number {
  return Math.ceil((b.getTime() - a.getTime()) / 86_400_000);
}

// ─── Component ───────────────────────────────────────────────────────────────

export function TasksGanttView({ tasks }: { tasks: Task[] }) {
  // ── 1. Group tasks into hierarchy ──────────────────────────────────────────
  const { rows, globalStart, globalEnd } = useMemo(() => {
    const projectMap = new Map<
      string,
      {
        project: Task['project'];
        buildings: Map<
          string,
          {
            building: Task['building'];
            activities: Map<string, { label: string; subActivities: Map<string, SubActData> }>;
          }
        >;
      }
    >();

    tasks.forEach((task) => {
      if (!task.project) return;
      if (!task.taskInputDate && !task.dueDate) return;

      const pKey = task.project.id;
      if (!projectMap.has(pKey))
        projectMap.set(pKey, { project: task.project, buildings: new Map() });
      const pg = projectMap.get(pKey)!;

      const bKey = task.building?.id || '__no_building__';
      if (!pg.buildings.has(bKey))
        pg.buildings.set(bKey, { building: task.building, activities: new Map() });
      const bg = pg.buildings.get(bKey)!;

      const actKey = task.mainActivity || '__no_activity__';
      const actLabel = task.mainActivity ? getMainActivityLabel(task.mainActivity) : 'General';
      if (!bg.activities.has(actKey))
        bg.activities.set(actKey, { label: actLabel, subActivities: new Map() });
      const ag = bg.activities.get(actKey)!;

      const subKey = task.subActivity || '__no_sub__';
      if (!ag.subActivities.has(subKey))
        ag.subActivities.set(subKey, {
          tasks: [],
          startDate: null,
          endDate: null,
          completedCount: 0,
          approvedCount: 0,
        });
      const sg = ag.subActivities.get(subKey)!;
      sg.tasks.push(task);

      // Effective start = taskInputDate ?? dueDate
      const eStart = task.taskInputDate
        ? new Date(task.taskInputDate)
        : task.dueDate
        ? new Date(task.dueDate)
        : null;
      // Effective end = dueDate ?? taskInputDate
      const eEnd = task.dueDate
        ? new Date(task.dueDate)
        : task.taskInputDate
        ? new Date(task.taskInputDate)
        : null;

      if (eStart && (!sg.startDate || eStart < sg.startDate)) sg.startDate = eStart;
      if (eEnd && (!sg.endDate || eEnd > sg.endDate)) sg.endDate = eEnd;

      if (['Completed', 'Waiting for Approval'].includes(task.status)) sg.completedCount++;
      if (task.approvedAt) sg.approvedCount++;
    });

    const rows: GanttRow[] = [];
    let globalStart: Date | null = null;
    let globalEnd: Date | null = null;

    for (const [, { project, buildings }] of projectMap) {
      const pKey = project!.id;
      rows.push({ type: 'project', key: pKey, label: `Project# ${project?.projectNumber} — ${project?.name}`, indent: 0 });

      for (const [bKey, { building, activities }] of buildings) {
        rows.push({
          type: 'building',
          key: `${pKey}-${bKey}`,
          label: building ? `${building.name} (${building.designation})` : 'No Building',
          indent: 1,
        });

        // Build building-level sub-act map for blocked checking
        const bSubMap = new Map<string, SubActData>();
        for (const [, { subActivities }] of activities)
          for (const [sk, sd] of subActivities) bSubMap.set(sk, sd);

        for (const [actKey, { label: actLabel, subActivities }] of activities) {
          rows.push({ type: 'activity', key: `${pKey}-${bKey}-${actKey}`, label: actLabel, indent: 2 });

          for (const [subKey, subData] of subActivities) {
            const subLabel =
              actKey !== '__no_activity__' && subKey !== '__no_sub__'
                ? getSubActivityLabel(actKey, subKey)
                : 'General';

            const predKey = SUB_ACTIVITY_DEPENDENCIES[subKey];
            let isBlocked = false;
            let blockedByLabel = '';
            if (predKey) {
              const predData = bSubMap.get(predKey);
              if (predData && predData.tasks.length > 0 && !predData.tasks.every((t) => t.approvedAt)) {
                isBlocked = true;
                blockedByLabel = findSubActivityLabel(predKey);
              }
            }

            for (const d of [subData.startDate, subData.endDate].filter(Boolean) as Date[]) {
              if (!globalStart || d < globalStart) globalStart = d;
              if (!globalEnd || d > globalEnd) globalEnd = d;
            }

            rows.push({
              type: 'subactivity',
              key: `${pKey}-${bKey}-${actKey}-${subKey}`,
              label: subLabel,
              indent: 3,
              subActivityKey: subKey,
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

  // ── 2. Chart date range ────────────────────────────────────────────────────
  const chartStart = useMemo(() => {
    const anchor = globalStart || globalEnd;
    if (!anchor) return new Date();
    const d = new Date(anchor);
    d.setDate(1);
    d.setMonth(d.getMonth() - 1);
    return d;
  }, [globalStart, globalEnd]);

  const chartEnd = useMemo(() => {
    const anchor = globalEnd || globalStart;
    if (!anchor) return new Date();
    const d = new Date(anchor);
    d.setDate(1);
    d.setMonth(d.getMonth() + 2);
    return d;
  }, [globalEnd, globalStart]);

  const totalDays = Math.max(
    60,
    Math.ceil((chartEnd.getTime() - chartStart.getTime()) / 86_400_000)
  );
  const chartW = totalDays * DAY_W;
  const svgW = LEFT_W + chartW;
  const svgH = rows.length * ROW_H + HEADER_H;

  // ── 3. Month & week headers ────────────────────────────────────────────────
  const monthHeaders = useMemo(() => {
    const result: { label: string; x: number; w: number }[] = [];
    const d = new Date(chartStart);
    d.setDate(1);
    while (d < chartEnd) {
      const x = Math.round(diffDays(chartStart, d) * DAY_W);
      const next = new Date(d);
      next.setMonth(next.getMonth() + 1);
      const w = Math.round(diffDays(chartStart, next) * DAY_W) - x;
      result.push({ label: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }), x, w });
      d.setMonth(d.getMonth() + 1);
    }
    return result;
  }, [chartStart, chartEnd]);

  const weekHeaders = useMemo(() => {
    const result: { label: string; x: number; w: number }[] = [];
    // Start on the nearest Monday at or before chartStart
    const d = new Date(chartStart);
    const dow = d.getDay(); // 0=Sun
    d.setDate(d.getDate() - ((dow + 6) % 7)); // back to Monday
    while (d < chartEnd) {
      const x = Math.max(0, Math.round(diffDays(chartStart, d) * DAY_W));
      const next = new Date(d);
      next.setDate(next.getDate() + 7);
      const xNext = Math.round(diffDays(chartStart, next) * DAY_W);
      result.push({
        label: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
        x,
        w: xNext - x,
      });
      d.setDate(d.getDate() + 7);
    }
    return result;
  }, [chartStart, chartEnd]);

  // ── 4. Bar position helper ─────────────────────────────────────────────────
  const barFor = (row: GanttRow) => {
    if (row.type !== 'subactivity') return null;
    const s = row.startDate || row.endDate;
    const e = row.endDate || row.startDate;
    if (!s || !e) return null;
    const x = Math.round(diffDays(chartStart, s) * DAY_W);
    const w = Math.max(DAY_W * 2, Math.round(diffDays(s, e) * DAY_W));
    return { x: LEFT_W + x, w };
  };

  // ── 5. Today line ──────────────────────────────────────────────────────────
  const today = new Date();
  const todayX = LEFT_W + Math.round(diffDays(chartStart, today) * DAY_W);

  // ── 6. Dependency arrows ───────────────────────────────────────────────────
  const arrows = useMemo(() => {
    const idx = new Map<string, number>();
    rows.forEach((r, i) => {
      if (r.type === 'subactivity') idx.set(`${r.buildingKey}-${r.subActivityKey}`, i);
    });
    return rows.flatMap((r, i) => {
      if (r.type !== 'subactivity') return [];
      const predKey = SUB_ACTIVITY_DEPENDENCIES[r.subActivityKey];
      if (!predKey) return [];
      const pi = idx.get(`${r.buildingKey}-${predKey}`);
      if (pi === undefined) return [];
      return [{ fi: pi, ti: i, blocked: r.isBlocked }];
    });
  }, [rows]);

  // ── 7. Row background colours ──────────────────────────────────────────────
  const rowBg = (t: GanttRow['type']) =>
    t === 'project'
      ? '#dbeafe'
      : t === 'building'
      ? '#fef3c7'
      : t === 'activity'
      ? '#f3e8ff'
      : '#f0fdf4';

  const rowBgRight = (t: GanttRow['type']) =>
    t === 'project'
      ? '#eff6ff'
      : t === 'building'
      ? '#fffbeb'
      : t === 'activity'
      ? '#faf5ff'
      : '#f7fef9';

  // ── 8. Bar fill colour ─────────────────────────────────────────────────────
  const barFill = (r: Extract<GanttRow, { type: 'subactivity' }>) => {
    if (r.isBlocked) return '#f87171';
    if (r.approvedCount > 0 && r.approvedCount === r.taskCount) return '#16a34a';
    if (r.completedCount === r.taskCount && r.taskCount > 0) return '#34d399';
    if (r.endDate && r.endDate < today && r.completedCount < r.taskCount) return '#f97316';
    if (r.completedCount > 0) return '#3b82f6';
    return '#60a5fa';
  };

  // ── 9. Empty state ─────────────────────────────────────────────────────────
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 h-48 text-muted-foreground">
        <AlertTriangle className="h-8 w-8 text-amber-400" />
        <p className="text-sm">No tasks with dates found. Assign input dates and due dates to tasks to see the Gantt.</p>
      </div>
    );
  }

  // ── 10. Column X positions (left panel) ────────────────────────────────────
  const xStart  = COL_NAME;
  const xFinish = COL_NAME + COL_START;
  const xDur    = COL_NAME + COL_START + COL_FINISH;

  // ── 11. Render ─────────────────────────────────────────────────────────────
  return (
    <div>
      <div className="overflow-auto border-t" style={{ maxHeight: '78vh' }}>
        <svg
          width={svgW}
          height={svgH}
          style={{ display: 'block', fontFamily: "'Inter', 'Segoe UI', sans-serif", fontSize: '11px' }}
        >
          <defs>
            <marker id="arr-n" markerWidth="7" markerHeight="6" refX="7" refY="3" orient="auto">
              <polygon points="0 0,7 3,0 6" fill="#64748b" />
            </marker>
            <marker id="arr-b" markerWidth="7" markerHeight="6" refX="7" refY="3" orient="auto">
              <polygon points="0 0,7 3,0 6" fill="#ef4444" />
            </marker>
          </defs>

          {/* ── BACKGROUND ── */}
          <rect x={0} y={0} width={svgW} height={svgH} fill="#fff" />

          {/* ── HEADER BACKGROUND ── */}
          <rect x={0} y={0} width={LEFT_W} height={HEADER_H} fill="#f1f5f9" />
          <rect x={LEFT_W} y={0} width={chartW} height={HEADER_H} fill="#f8fafc" />

          {/* ── LEFT PANEL HEADER LABELS ── */}
          {/* column dividers */}
          {[xStart, xFinish, xDur].map((cx, i) => (
            <line key={i} x1={cx} y1={0} x2={cx} y2={svgH} stroke="#e2e8f0" strokeWidth="1" />
          ))}
          {/* header text */}
          <text x={8} y={HEADER_H / 2 + 5} fontWeight="700" fill="#374151" fontSize="11">Task / Sub-Activity</text>
          <text x={xStart + 4} y={HEADER_H / 2 + 5} fontWeight="700" fill="#374151" fontSize="11">Start</text>
          <text x={xFinish + 4} y={HEADER_H / 2 + 5} fontWeight="700" fill="#374151" fontSize="11">Finish</text>
          <text x={xDur + 4} y={HEADER_H / 2 + 5} fontWeight="700" fill="#374151" fontSize="11">Dur.</text>

          {/* ── MONTH HEADERS ── */}
          {monthHeaders.map((m, i) => (
            <g key={i}>
              <rect x={LEFT_W + m.x} y={0} width={m.w} height={MONTH_H}
                fill={i % 2 === 0 ? '#e2e8f0' : '#f1f5f9'} />
              <text x={LEFT_W + m.x + m.w / 2} y={MONTH_H - 5}
                textAnchor="middle" fontWeight="700" fill="#1e40af" fontSize="11">
                {m.label}
              </text>
              <line x1={LEFT_W + m.x} y1={0} x2={LEFT_W + m.x} y2={HEADER_H}
                stroke="#cbd5e1" strokeWidth="1" />
            </g>
          ))}

          {/* ── WEEK HEADERS ── */}
          {weekHeaders.map((w, i) => (
            <g key={i}>
              <rect x={LEFT_W + w.x} y={MONTH_H} width={w.w} height={WEEK_H}
                fill={i % 2 === 0 ? '#f8fafc' : '#f1f5f9'} />
              <text x={LEFT_W + w.x + 3} y={MONTH_H + WEEK_H - 4}
                fill="#64748b" fontSize="9">
                {w.label}
              </text>
              <line x1={LEFT_W + w.x} y1={MONTH_H} x2={LEFT_W + w.x} y2={svgH}
                stroke="#e2e8f0" strokeWidth="0.5" />
            </g>
          ))}

          {/* ── ROWS ── */}
          {rows.map((row, idx) => {
            const y = HEADER_H + idx * ROW_H;
            const isSub = row.type === 'subactivity';
            const bp = barFor(row);
            const sub = isSub ? (row as Extract<GanttRow, { type: 'subactivity' }>) : null;

            const textClr =
              row.type === 'project' ? '#1d4ed8'
              : row.type === 'building' ? '#92400e'
              : row.type === 'activity' ? '#6b21a8'
              : '#065f46';

            const fw = row.type === 'project' || row.type === 'building' ? '700' : '500';
            const pad = row.indent * 14 + 8;

            const dur = sub && sub.startDate && sub.endDate
              ? `${diffDays(sub.startDate, sub.endDate)}d`
              : '';

            return (
              <g key={row.key}>
                {/* Left panel cell */}
                <rect x={0} y={y} width={LEFT_W} height={ROW_H} fill={rowBg(row.type)} />

                {/* Right panel cell */}
                <rect x={LEFT_W} y={y} width={chartW} height={ROW_H}
                  fill={rowBgRight(row.type)} />

                {/* Horizontal row divider */}
                <line x1={0} y1={y + ROW_H} x2={svgW} y2={y + ROW_H}
                  stroke="#e5e7eb" strokeWidth="0.5" />

                {/* Task name (clipped) */}
                <clipPath id={`clip-${idx}`}>
                  <rect x={pad} y={y} width={COL_NAME - pad - 4} height={ROW_H} />
                </clipPath>
                <text
                  x={pad} y={y + ROW_H / 2 + 4}
                  fontWeight={fw} fill={textClr}
                  fontSize={row.type === 'project' ? 12 : 11}
                  clipPath={`url(#clip-${idx})`}
                >
                  {row.label}
                </text>

                {/* Blocked warning */}
                {isSub && sub?.isBlocked && (
                  <text x={COL_NAME - 16} y={y + ROW_H / 2 + 4} fontSize="12" fill="#ef4444">⚠</text>
                )}

                {/* Start date */}
                {isSub && sub?.startDate && (
                  <text x={xStart + 4} y={y + ROW_H / 2 + 4} fill="#374151" fontSize="10">
                    {fmt(sub.startDate)}
                  </text>
                )}

                {/* Finish date */}
                {isSub && sub?.endDate && (
                  <text x={xFinish + 4} y={y + ROW_H / 2 + 4} fill="#374151" fontSize="10">
                    {fmt(sub.endDate)}
                  </text>
                )}

                {/* Duration */}
                {dur && (
                  <text x={xDur + 4} y={y + ROW_H / 2 + 4} fill="#64748b" fontSize="10">
                    {dur}
                  </text>
                )}

                {/* Gantt bar */}
                {bp && isSub && sub && (() => {
                  const barY = y + Math.round(ROW_H * 0.22);
                  const barH = Math.round(ROW_H * 0.56);
                  const fill = barFill(sub);
                  const progress = sub.taskCount > 0 ? sub.completedCount / sub.taskCount : 0;

                  return (
                    <g>
                      {/* Bar background (track) */}
                      <rect x={bp.x} y={barY} width={bp.w} height={barH}
                        rx="3" fill={fill} opacity={0.25} />
                      {/* Progress fill */}
                      <rect x={bp.x} y={barY} width={Math.max(DAY_W, Math.round(bp.w * progress))}
                        height={barH} rx="3" fill={fill} />
                      {/* Top stripe for MS-Project look */}
                      <rect x={bp.x} y={barY} width={bp.w} height={3}
                        rx="1" fill={fill} opacity={0.6} />
                      {/* Left cap */}
                      <rect x={bp.x} y={barY} width={3} height={barH} rx="1" fill={fill} />
                      {/* Right cap */}
                      <rect x={bp.x + bp.w - 3} y={barY} width={3} height={barH} rx="1" fill={fill} />
                      {/* Label inside bar */}
                      {bp.w > 50 && (
                        <text x={bp.x + 6} y={barY + barH / 2 + 4}
                          fontSize="9" fontWeight="700"
                          fill={sub.isBlocked ? '#7f1d1d' : '#1e3a5f'}>
                          {sub.isBlocked
                            ? `⚠ BLOCKED by ${sub.blockedByLabel}`
                            : `${sub.approvedCount}/${sub.taskCount} approved`}
                        </text>
                      )}
                    </g>
                  );
                })()}

                {/* Sub-activity with no dates */}
                {isSub && !bp && (
                  <text x={LEFT_W + 8} y={y + ROW_H / 2 + 4}
                    fontSize="9" fill="#94a3b8" fontStyle="italic">
                    no dates set
                  </text>
                )}
              </g>
            );
          })}

          {/* ── LEFT / RIGHT PANEL DIVIDER ── */}
          <line x1={LEFT_W} y1={0} x2={LEFT_W} y2={svgH} stroke="#94a3b8" strokeWidth="2" />

          {/* ── HEADER BOTTOM BORDER ── */}
          <line x1={0} y1={HEADER_H} x2={svgW} y2={HEADER_H} stroke="#94a3b8" strokeWidth="1.5" />

          {/* ── TODAY LINE ── */}
          {todayX > LEFT_W && todayX < svgW && (
            <g>
              <line x1={todayX} y1={0} x2={todayX} y2={svgH}
                stroke="#ef4444" strokeWidth="1.5" strokeDasharray="5,3" />
              <rect x={todayX - 1} y={HEADER_H} width={28} height={14}
                fill="#ef4444" rx="2" />
              <text x={todayX + 2} y={HEADER_H + 10}
                fontSize="8" fontWeight="700" fill="white">TODAY</text>
            </g>
          )}

          {/* ── DEPENDENCY ARROWS ── */}
          {arrows.map((arr, i) => {
            const fromRow = rows[arr.fi];
            const toRow = rows[arr.ti];
            if (fromRow.type !== 'subactivity' || toRow.type !== 'subactivity') return null;
            const fb = barFor(fromRow);
            const tb = barFor(toRow);
            if (!fb || !tb) return null;

            const yMid = (n: number) => HEADER_H + n * ROW_H + ROW_H / 2;
            const y1 = yMid(arr.fi);
            const y2 = yMid(arr.ti);
            const x1 = fb.x + fb.w;       // right edge of predecessor
            const x2 = tb.x;              // left edge of successor
            const bendX = Math.max(x1 + 10, x2 - 8);

            const color = arr.blocked ? '#ef4444' : '#64748b';
            const dash  = arr.blocked ? '5,3' : undefined;
            const mkr   = arr.blocked ? 'url(#arr-b)' : 'url(#arr-n)';

            return (
              <path
                key={i}
                d={`M${x1},${y1} L${bendX},${y1} L${bendX},${y2} L${x2},${y2}`}
                stroke={color} strokeWidth="1.5" fill="none"
                strokeDasharray={dash} markerEnd={mkr}
              />
            );
          })}
        </svg>
      </div>

      {/* ── LEGEND ── */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 px-4 py-2.5 border-t text-xs text-muted-foreground bg-slate-50">
        <span className="font-semibold text-foreground">Legend:</span>
        {[
          { color: '#16a34a', label: 'All Approved' },
          { color: '#34d399', label: 'All Completed' },
          { color: '#3b82f6', label: 'In Progress' },
          { color: '#f97316', label: 'Overdue' },
          { color: '#f87171', label: 'Blocked' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <svg width="28" height="12">
              <rect x={0} y={2} width={28} height={8} rx="2" fill={color} opacity={0.3} />
              <rect x={0} y={2} width={14} height={8} rx="2" fill={color} />
              <rect x={0} y={2} width={3} height={8} rx="1" fill={color} />
              <rect x={25} y={2} width={3} height={8} rx="1" fill={color} />
            </svg>
            {label}
          </div>
        ))}
        <div className="flex items-center gap-1.5 ml-2">
          <svg width="30" height="12">
            <line x1="0" y1="6" x2="22" y2="6" stroke="#64748b" strokeWidth="1.5" />
            <polygon points="22,6 16,3 16,9" fill="#64748b" />
          </svg>
          FS Dependency
        </div>
        <div className="flex items-center gap-1.5">
          <svg width="30" height="12">
            <line x1="0" y1="6" x2="22" y2="6" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="5,3" />
            <polygon points="22,6 16,3 16,9" fill="#ef4444" />
          </svg>
          Blocked link
        </div>
        <div className="flex items-center gap-1.5 text-red-500 font-medium">⚠ predecessor not fully approved</div>
      </div>
    </div>
  );
}
