'use client';

import React, { useMemo, useRef, useCallback } from 'react';
import { AlertTriangle, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  SUB_ACTIVITY_DEPENDENCIES,
  SUB_ACTIVITIES,
  getMainActivityLabel,
  getSubActivityLabel,
} from '@/lib/activity-constants';

// ─── Types ────────────────────────────────────────────────────────────────────

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
  | { type: 'project';    key: string; label: string; indent: number }
  | { type: 'building';   key: string; label: string; indent: number }
  | { type: 'activity';   key: string; label: string; indent: number }
  | {
      type: 'subactivity';
      key: string; label: string; indent: number;
      subActivityKey: string; buildingKey: string;
      startDate: Date | null; endDate: Date | null;
      taskCount: number; completedCount: number; approvedCount: number;
      isBlocked: boolean; blockedByLabel: string;
    };

// ─── Layout constants ─────────────────────────────────────────────────────────

const ROW_H   = 32;
const MONTH_H = 22;
const WEEK_H  = 18;
const HDR_H   = MONTH_H + WEEK_H;

const COL_NAME   = 220;
const COL_START  = 78;
const COL_FINISH = 78;
const COL_DUR    = 52;
const LEFT_W     = COL_NAME + COL_START + COL_FINISH + COL_DUR;

const DAY_W = 7; // px per day

// ─── Helpers ──────────────────────────────────────────────────────────────────

function findSubActLabel(subKey: string): string {
  for (const subs of Object.values(SUB_ACTIVITIES)) {
    const f = subs.find((s) => s.key === subKey);
    if (f) return f.label;
  }
  return subKey;
}

function fmt(d: Date | null | undefined): string {
  if (!d) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
}

function daysBetween(a: Date, b: Date): number {
  return Math.ceil((b.getTime() - a.getTime()) / 86_400_000);
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TasksGanttView({ tasks }: { tasks: Task[] }) {
  const leftRef  = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const syncing  = useRef(false);

  // ── Sync vertical scroll between the two panels ──
  const onRightScroll = useCallback(() => {
    if (syncing.current) return;
    syncing.current = true;
    if (leftRef.current && rightRef.current)
      leftRef.current.scrollTop = rightRef.current.scrollTop;
    requestAnimationFrame(() => { syncing.current = false; });
  }, []);

  const onLeftScroll = useCallback(() => {
    if (syncing.current) return;
    syncing.current = true;
    if (leftRef.current && rightRef.current)
      rightRef.current.scrollTop = leftRef.current.scrollTop;
    requestAnimationFrame(() => { syncing.current = false; });
  }, []);

  // ── Build row hierarchy ───────────────────────────────────────────────────
  const { rows, globalStart, globalEnd } = useMemo(() => {
    const projectMap = new Map<string, {
      project: Task['project'];
      buildings: Map<string, {
        building: Task['building'];
        activities: Map<string, { label: string; subActivities: Map<string, SubActData> }>;
      }>;
    }>();

    tasks.forEach((task) => {
      if (!task.project || (!task.taskInputDate && !task.dueDate)) return;

      const pKey = task.project.id;
      if (!projectMap.has(pKey))
        projectMap.set(pKey, { project: task.project, buildings: new Map() });
      const pg = projectMap.get(pKey)!;

      const bKey = task.building?.id || '__no_building__';
      if (!pg.buildings.has(bKey))
        pg.buildings.set(bKey, { building: task.building, activities: new Map() });
      const bg = pg.buildings.get(bKey)!;

      const actKey  = task.mainActivity || '__no_activity__';
      const actLabel = task.mainActivity ? getMainActivityLabel(task.mainActivity) : 'General';
      if (!bg.activities.has(actKey))
        bg.activities.set(actKey, { label: actLabel, subActivities: new Map() });
      const ag = bg.activities.get(actKey)!;

      const subKey = task.subActivity || '__no_sub__';
      if (!ag.subActivities.has(subKey))
        ag.subActivities.set(subKey, { tasks: [], startDate: null, endDate: null, completedCount: 0, approvedCount: 0 });
      const sg = ag.subActivities.get(subKey)!;
      sg.tasks.push(task);

      const eStart = task.taskInputDate ? new Date(task.taskInputDate)
                   : task.dueDate       ? new Date(task.dueDate) : null;
      const eEnd   = task.dueDate       ? new Date(task.dueDate)
                   : task.taskInputDate ? new Date(task.taskInputDate) : null;

      if (eStart && (!sg.startDate || eStart < sg.startDate)) sg.startDate = eStart;
      if (eEnd   && (!sg.endDate   || eEnd   > sg.endDate))   sg.endDate   = eEnd;

      if (['Completed', 'Waiting for Approval'].includes(task.status)) sg.completedCount++;
      if (task.approvedAt) sg.approvedCount++;
    });

    const rows: GanttRow[] = [];
    let globalStart: Date | null = null;
    let globalEnd:   Date | null = null;

    for (const [, { project, buildings }] of projectMap) {
      const pKey = project!.id;
      rows.push({ type: 'project', key: pKey, indent: 0,
        label: `Project# ${project?.projectNumber} — ${project?.name}` });

      for (const [bKey, { building, activities }] of buildings) {
        rows.push({ type: 'building', key: `${pKey}-${bKey}`, indent: 1,
          label: building ? `${building.name} (${building.designation})` : 'No Building' });

        const bSubMap = new Map<string, SubActData>();
        for (const [, { subActivities }] of activities)
          for (const [sk, sd] of subActivities) bSubMap.set(sk, sd);

        for (const [actKey, { label: actLabel, subActivities }] of activities) {
          rows.push({ type: 'activity', key: `${pKey}-${bKey}-${actKey}`, indent: 2, label: actLabel });

          for (const [subKey, subData] of subActivities) {
            const subLabel = actKey !== '__no_activity__' && subKey !== '__no_sub__'
              ? getSubActivityLabel(actKey, subKey) : 'General';

            const predKey = SUB_ACTIVITY_DEPENDENCIES[subKey];
            let isBlocked = false, blockedByLabel = '';
            if (predKey) {
              const pd = bSubMap.get(predKey);
              if (pd && pd.tasks.length > 0 && !pd.tasks.every((t) => t.approvedAt)) {
                isBlocked = true;
                blockedByLabel = findSubActLabel(predKey);
              }
            }

            for (const d of [subData.startDate, subData.endDate].filter(Boolean) as Date[]) {
              if (!globalStart || d < globalStart) globalStart = d;
              if (!globalEnd   || d > globalEnd)   globalEnd   = d;
            }

            rows.push({
              type: 'subactivity',
              key: `${pKey}-${bKey}-${actKey}-${subKey}`,
              indent: 3, label: subLabel,
              subActivityKey: subKey, buildingKey: `${pKey}-${bKey}`,
              startDate: subData.startDate, endDate: subData.endDate,
              taskCount: subData.tasks.length, completedCount: subData.completedCount,
              approvedCount: subData.approvedCount, isBlocked, blockedByLabel,
            });
          }
        }
      }
    }

    return { rows, globalStart, globalEnd };
  }, [tasks]);

  // ── Date range for chart ──────────────────────────────────────────────────
  const chartStart = useMemo(() => {
    const anchor = globalStart || globalEnd;
    if (!anchor) return new Date();
    const d = new Date(anchor);
    d.setDate(1); d.setMonth(d.getMonth() - 1);
    return d;
  }, [globalStart, globalEnd]);

  const chartEnd = useMemo(() => {
    const anchor = globalEnd || globalStart;
    if (!anchor) return new Date();
    const d = new Date(anchor);
    d.setDate(1); d.setMonth(d.getMonth() + 2);
    return d;
  }, [globalEnd, globalStart]);

  const totalDays = Math.max(60, daysBetween(chartStart, chartEnd));
  const chartW    = totalDays * DAY_W;
  const svgH      = rows.length * ROW_H + HDR_H;

  // ── Month & week header bands ─────────────────────────────────────────────
  const monthBands = useMemo(() => {
    const result: { label: string; x: number; w: number }[] = [];
    const d = new Date(chartStart); d.setDate(1);
    while (d < chartEnd) {
      const x = Math.round(daysBetween(chartStart, d) * DAY_W);
      const nxt = new Date(d); nxt.setMonth(nxt.getMonth() + 1);
      const w = Math.round(daysBetween(chartStart, nxt) * DAY_W) - x;
      result.push({ label: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }), x, w });
      d.setMonth(d.getMonth() + 1);
    }
    return result;
  }, [chartStart, chartEnd]);

  const weekBands = useMemo(() => {
    const result: { label: string; x: number }[] = [];
    const d = new Date(chartStart);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // back to Monday
    while (d < chartEnd) {
      const x = Math.round(daysBetween(chartStart, d) * DAY_W);
      if (x >= 0)
        result.push({ label: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }), x });
      d.setDate(d.getDate() + 7);
    }
    return result;
  }, [chartStart, chartEnd]);

  // ── Bar positioning ───────────────────────────────────────────────────────
  const barFor = (row: GanttRow) => {
    if (row.type !== 'subactivity') return null;
    const s = row.startDate || row.endDate;
    const e = row.endDate   || row.startDate;
    if (!s || !e) return null;
    const x = Math.round(daysBetween(chartStart, s) * DAY_W);
    const w = Math.max(DAY_W * 2, Math.round(daysBetween(s, e) * DAY_W));
    return { x, w };
  };

  // ── Today line ────────────────────────────────────────────────────────────
  const today  = new Date();
  const todayX = Math.round(daysBetween(chartStart, today) * DAY_W);

  // ── Navigation helpers ────────────────────────────────────────────────────
  const scrollMonths = (n: number) => {
    if (rightRef.current) rightRef.current.scrollLeft += n * 30 * DAY_W;
  };
  const scrollToToday = () => {
    if (rightRef.current) {
      const offset = Math.max(0, todayX - 120);
      rightRef.current.scrollTo({ left: offset, behavior: 'smooth' });
    }
  };

  // ── Dependency arrows ─────────────────────────────────────────────────────
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

  // ── Colour helpers ────────────────────────────────────────────────────────
  const LEFT_BG: Record<GanttRow['type'], string> = {
    project:     '#dbeafe',
    building:    '#fef3c7',
    activity:    '#f3e8ff',
    subactivity: '#f0fdf4',
  };
  const RIGHT_BG: Record<GanttRow['type'], string> = {
    project:     '#eff6ff',
    building:    '#fffbeb',
    activity:    '#faf5ff',
    subactivity: '#f7fef9',
  };
  const TEXT_CLR: Record<GanttRow['type'], string> = {
    project:     '#1d4ed8',
    building:    '#92400e',
    activity:    '#6b21a8',
    subactivity: '#065f46',
  };

  const barColor = (r: Extract<GanttRow, { type: 'subactivity' }>) => {
    if (r.isBlocked) return '#f87171';
    if (r.approvedCount  === r.taskCount && r.taskCount > 0) return '#16a34a';
    if (r.completedCount === r.taskCount && r.taskCount > 0) return '#34d399';
    if (r.endDate && r.endDate < today && r.completedCount < r.taskCount) return '#f97316';
    if (r.completedCount > 0) return '#3b82f6';
    return '#60a5fa';
  };

  // ── Column x positions ────────────────────────────────────────────────────
  const xStart  = COL_NAME;
  const xFinish = COL_NAME + COL_START;
  const xDur    = COL_NAME + COL_START + COL_FINISH;

  // ── Empty state ───────────────────────────────────────────────────────────
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 h-48 text-muted-foreground">
        <AlertTriangle className="h-8 w-8 text-amber-400" />
        <p className="text-sm">No tasks with dates found. Assign input dates and due dates to tasks to see the Gantt.</p>
      </div>
    );
  }

  const FONT = "'Inter','Segoe UI',sans-serif";

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* ── Navigation toolbar ── */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 border-b bg-slate-50 text-xs">
        <span className="text-muted-foreground font-medium mr-1">Navigate:</span>
        <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => scrollMonths(-3)}>
          <ChevronLeft className="h-3 w-3" /><ChevronLeft className="h-3 w-3 -ml-1.5" /> 3m
        </Button>
        <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => scrollMonths(-1)}>
          <ChevronLeft className="h-3 w-3" /> 1m
        </Button>
        <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={scrollToToday}>
          <Calendar className="h-3 w-3 mr-1" /> Today
        </Button>
        <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => scrollMonths(1)}>
          1m <ChevronRight className="h-3 w-3" />
        </Button>
        <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => scrollMonths(3)}>
          3m <ChevronRight className="h-3 w-3" /><ChevronRight className="h-3 w-3 -ml-1.5" />
        </Button>
        <span className="ml-3 text-muted-foreground">or scroll the chart horizontally</span>
      </div>

      {/* ── Two-panel layout ── */}
      <div className="flex border-t" style={{ maxHeight: '74vh', overflow: 'hidden' }}>

        {/* ── LEFT PANEL (fixed, vertically scrollable) ── */}
        <div
          ref={leftRef}
          onScroll={onLeftScroll}
          style={{
            width: LEFT_W, flexShrink: 0,
            overflowY: 'auto', overflowX: 'hidden',
            borderRight: '2px solid #94a3b8',
          }}
        >
          <svg width={LEFT_W} height={svgH} style={{ display: 'block', fontFamily: FONT }}>
            {/* Header background */}
            <rect x={0} y={0} width={LEFT_W} height={HDR_H} fill="#f1f5f9" />
            <rect x={0} y={HDR_H} width={LEFT_W} height={svgH - HDR_H} fill="#fff" />

            {/* Column dividers */}
            {[xStart, xFinish, xDur].map((cx, i) => (
              <line key={i} x1={cx} y1={0} x2={cx} y2={svgH} stroke="#e2e8f0" strokeWidth="1" />
            ))}

            {/* Header labels */}
            <text x={8}          y={HDR_H/2+5} fontWeight="700" fill="#374151" fontSize="11">Task / Sub-Activity</text>
            <text x={xStart+4}   y={HDR_H/2+5} fontWeight="700" fill="#374151" fontSize="11">Start</text>
            <text x={xFinish+4}  y={HDR_H/2+5} fontWeight="700" fill="#374151" fontSize="11">Finish</text>
            <text x={xDur+4}     y={HDR_H/2+5} fontWeight="700" fill="#374151" fontSize="11">Dur.</text>

            {/* Header bottom border */}
            <line x1={0} y1={HDR_H} x2={LEFT_W} y2={HDR_H} stroke="#94a3b8" strokeWidth="1.5" />

            {/* Rows */}
            {rows.map((row, idx) => {
              const y   = HDR_H + idx * ROW_H;
              const sub = row.type === 'subactivity'
                ? (row as Extract<GanttRow, { type: 'subactivity' }>)
                : null;
              const pad = row.indent * 14 + 8;
              const fw  = row.type === 'project' || row.type === 'building' ? '700' : '500';
              const dur = sub?.startDate && sub?.endDate
                ? `${daysBetween(sub.startDate, sub.endDate)}d` : '';

              return (
                <g key={row.key}>
                  <rect x={0} y={y} width={LEFT_W} height={ROW_H} fill={LEFT_BG[row.type]} />
                  <line x1={0} y1={y+ROW_H} x2={LEFT_W} y2={y+ROW_H} stroke="#e5e7eb" strokeWidth="0.5" />

                  {/* Task name with clip */}
                  <clipPath id={`lc-${idx}`}>
                    <rect x={pad} y={y} width={COL_NAME - pad - 4} height={ROW_H} />
                  </clipPath>
                  <text x={pad} y={y+ROW_H/2+4} fontWeight={fw}
                    fill={TEXT_CLR[row.type]}
                    fontSize={row.type === 'project' ? 12 : 11}
                    clipPath={`url(#lc-${idx})`}>
                    {row.label}
                  </text>

                  {/* Blocked icon */}
                  {sub?.isBlocked && (
                    <text x={COL_NAME-16} y={y+ROW_H/2+4} fontSize="12" fill="#ef4444">⚠</text>
                  )}

                  {/* Start / Finish / Duration */}
                  {sub?.startDate && (
                    <text x={xStart+4} y={y+ROW_H/2+4} fill="#374151" fontSize="10">{fmt(sub.startDate)}</text>
                  )}
                  {sub?.endDate && (
                    <text x={xFinish+4} y={y+ROW_H/2+4} fill="#374151" fontSize="10">{fmt(sub.endDate)}</text>
                  )}
                  {dur && (
                    <text x={xDur+4} y={y+ROW_H/2+4} fill="#64748b" fontSize="10">{dur}</text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* ── RIGHT PANEL (scrollable in both directions) ── */}
        <div
          ref={rightRef}
          onScroll={onRightScroll}
          style={{ flex: 1, overflow: 'auto' }}
        >
          <svg width={chartW} height={svgH} style={{ display: 'block', fontFamily: FONT }}>
            <defs>
              <marker id="arr-n" markerWidth="7" markerHeight="6" refX="7" refY="3" orient="auto">
                <polygon points="0 0,7 3,0 6" fill="#64748b" />
              </marker>
              <marker id="arr-b" markerWidth="7" markerHeight="6" refX="7" refY="3" orient="auto">
                <polygon points="0 0,7 3,0 6" fill="#ef4444" />
              </marker>
            </defs>

            {/* Chart background */}
            <rect x={0} y={0} width={chartW} height={svgH} fill="#fff" />

            {/* Month header bands */}
            {monthBands.map((m, i) => (
              <g key={i}>
                <rect x={m.x} y={0} width={m.w} height={MONTH_H}
                  fill={i % 2 === 0 ? '#e2e8f0' : '#f1f5f9'} />
                <text x={m.x + m.w/2} y={MONTH_H-5}
                  textAnchor="middle" fontWeight="700" fill="#1e40af" fontSize="11">
                  {m.label}
                </text>
                <line x1={m.x} y1={0} x2={m.x} y2={HDR_H} stroke="#cbd5e1" strokeWidth="1" />
              </g>
            ))}

            {/* Week header bands */}
            {weekBands.map((w, i) => (
              <g key={i}>
                <rect x={w.x} y={MONTH_H} width={DAY_W*7} height={WEEK_H}
                  fill={i % 2 === 0 ? '#f8fafc' : '#f1f5f9'} />
                <text x={w.x+3} y={MONTH_H+WEEK_H-4} fill="#64748b" fontSize="9">{w.label}</text>
                {/* Full-height week gridline */}
                <line x1={w.x} y1={MONTH_H} x2={w.x} y2={svgH}
                  stroke="#e2e8f0" strokeWidth="0.5" />
              </g>
            ))}

            {/* Header bottom border */}
            <line x1={0} y1={HDR_H} x2={chartW} y2={HDR_H} stroke="#94a3b8" strokeWidth="1.5" />

            {/* Row backgrounds + bars */}
            {rows.map((row, idx) => {
              const y   = HDR_H + idx * ROW_H;
              const bp  = barFor(row);
              const sub = row.type === 'subactivity'
                ? (row as Extract<GanttRow, { type: 'subactivity' }>)
                : null;

              return (
                <g key={row.key}>
                  {/* Row background */}
                  <rect x={0} y={y} width={chartW} height={ROW_H} fill={RIGHT_BG[row.type]} />
                  <line x1={0} y1={y+ROW_H} x2={chartW} y2={y+ROW_H}
                    stroke="#e5e7eb" strokeWidth="0.5" />

                  {/* Bar */}
                  {bp && sub && (() => {
                    const barY  = y + Math.round(ROW_H * 0.22);
                    const barH  = Math.round(ROW_H * 0.56);
                    const fill  = barColor(sub);
                    const prog  = sub.taskCount > 0 ? sub.completedCount / sub.taskCount : 0;

                    return (
                      <g>
                        {/* Track (background) */}
                        <rect x={bp.x} y={barY} width={bp.w} height={barH}
                          rx="3" fill={fill} opacity={0.2} />
                        {/* Progress fill */}
                        <rect x={bp.x} y={barY}
                          width={Math.max(DAY_W, Math.round(bp.w * prog))}
                          height={barH} rx="3" fill={fill} />
                        {/* Top highlight stripe */}
                        <rect x={bp.x} y={barY} width={bp.w} height={3}
                          rx="1" fill={fill} opacity={0.5} />
                        {/* Left & right end caps */}
                        <rect x={bp.x}          y={barY} width={3} height={barH} fill={fill} />
                        <rect x={bp.x+bp.w-3}   y={barY} width={3} height={barH} fill={fill} />
                        {/* Label */}
                        {bp.w > 55 && (
                          <text x={bp.x+7} y={barY+barH/2+4}
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

                  {/* No-date placeholder */}
                  {!bp && sub && (
                    <text x={8} y={y+ROW_H/2+4} fontSize="9" fill="#94a3b8" fontStyle="italic">
                      no dates set
                    </text>
                  )}
                </g>
              );
            })}

            {/* Today line */}
            {todayX > 0 && todayX < chartW && (
              <g>
                <line x1={todayX} y1={0} x2={todayX} y2={svgH}
                  stroke="#ef4444" strokeWidth="1.5" strokeDasharray="5,3" />
                <rect x={todayX-1} y={HDR_H} width={30} height={14} fill="#ef4444" rx="2" />
                <text x={todayX+2} y={HDR_H+10} fontSize="8" fontWeight="700" fill="white">TODAY</text>
              </g>
            )}

            {/* Dependency arrows */}
            {arrows.map((arr, i) => {
              const fr = rows[arr.fi]; const tr = rows[arr.ti];
              if (fr.type !== 'subactivity' || tr.type !== 'subactivity') return null;
              const fb = barFor(fr); const tb = barFor(tr);
              if (!fb || !tb) return null;

              const yMid = (n: number) => HDR_H + n * ROW_H + ROW_H / 2;
              const y1 = yMid(arr.fi), y2 = yMid(arr.ti);
              const x1 = fb.x + fb.w;               // right edge of predecessor bar
              const x2 = tb.x;                       // left edge of successor bar
              const bx = Math.max(x1 + 12, x2 - 8); // bend X

              const color = arr.blocked ? '#ef4444' : '#64748b';

              return (
                <path key={i}
                  d={`M${x1},${y1} L${bx},${y1} L${bx},${y2} L${x2},${y2}`}
                  stroke={color} strokeWidth="1.5" fill="none"
                  strokeDasharray={arr.blocked ? '5,3' : undefined}
                  markerEnd={arr.blocked ? 'url(#arr-b)' : 'url(#arr-n)'}
                />
              );
            })}
          </svg>
        </div>
      </div>

      {/* ── Legend ── */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 px-4 py-2 border-t text-xs text-muted-foreground bg-slate-50">
        <span className="font-semibold text-foreground">Legend:</span>
        {[
          { c: '#16a34a', l: 'All Approved' },
          { c: '#34d399', l: 'All Completed' },
          { c: '#3b82f6', l: 'In Progress' },
          { c: '#f97316', l: 'Overdue' },
          { c: '#f87171', l: 'Blocked' },
        ].map(({ c, l }) => (
          <div key={l} className="flex items-center gap-1.5">
            <svg width="28" height="12">
              <rect x={0} y={2} width={28} height={8} rx="2" fill={c} opacity={0.2} />
              <rect x={0} y={2} width={14} height={8} rx="2" fill={c} />
              <rect x={0} y={2} width={3}  height={8} rx="1" fill={c} />
              <rect x={25} y={2} width={3} height={8} rx="1" fill={c} />
            </svg>
            {l}
          </div>
        ))}
        <div className="flex items-center gap-1.5 ml-2">
          <svg width="30" height="12">
            <line x1="0" y1="6" x2="22" y2="6" stroke="#64748b" strokeWidth="1.5" />
            <polygon points="22,6 16,3 16,9" fill="#64748b" />
          </svg>
          FS link
        </div>
        <div className="flex items-center gap-1.5">
          <svg width="30" height="12">
            <line x1="0" y1="6" x2="22" y2="6" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="5,3" />
            <polygon points="22,6 16,3 16,9" fill="#ef4444" />
          </svg>
          Blocked link
        </div>
      </div>
    </div>
  );
}
