// TypeScript interfaces for the Detailed Project Planner module

export type TaskLevel = 'building' | 'activity' | 'sub_activity' | 'sub_sub_activity';
export type TaskMode = 'auto' | 'manual';
export type ZoomLevel = 'day' | 'week' | 'month';

export interface PlannerProjectData {
  id: string;
  name: string;
  description: string | null;
  projectId: string | null;
  startDate: string | null;
  endDate: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlannerTaskData {
  id: string;
  plannerProjectId: string;
  parentId: string | null;
  name: string;
  level: TaskLevel;
  sortOrder: number;
  startDate: string | null;
  endDate: string | null;
  durationDays: number | null;
  progress: number;
  isSummary: boolean;
  isMilestone: boolean;
  taskMode: TaskMode;
  createdAt: string;
  updatedAt: string;
}

export interface TaskNode extends PlannerTaskData {
  children: TaskNode[];
  collapsed: boolean;
  rowIndex: number;
  depth: number;
}

export interface TimeScale {
  startDate: Date;
  endDate: Date;
  pixelsPerDay: number;
  headerHeight: number;
  rowHeight: number;
  zoomLevel: ZoomLevel;
}

export interface BarPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DragState {
  taskId: string;
  type: 'move' | 'resize-left' | 'resize-right';
  startX: number;
  originalStartDate: Date;
  originalEndDate: Date;
  currentDayDelta: number;
}

export interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  taskId: string | null;
}

export const ZOOM_PIXELS_PER_DAY: Record<ZoomLevel, number> = {
  day: 40,
  week: 15,
  month: 4,
};

export const ROW_HEIGHT = 36;
export const HEADER_HEIGHT = 50;
export const MIN_TABLE_WIDTH = 300;
export const MIN_GANTT_WIDTH = 400;
export const DEFAULT_SPLIT_PERCENT = 0.45;

export const LEVEL_INDENT: Record<TaskLevel, number> = {
  building: 0,
  activity: 20,
  sub_activity: 40,
  sub_sub_activity: 60,
};

export const LEVEL_ORDER: TaskLevel[] = ['building', 'activity', 'sub_activity', 'sub_sub_activity'];

export const COLORS = {
  ganttBar: '#4FC3C9',
  ganttBarHover: '#3AAFB5',
  ganttBarProgress: '#2D8E94',
  ganttSummary: '#333333',
  ganttMilestone: '#333333',
  ganttTodayLine: '#FF4444',
  ganttGridLine: '#E5E7EB',
  ganttHeaderBg: '#F8FAFC',
  ganttWeekendBg: '#FEF2F2',
  tableRowHover: '#F0F9FF',
  tableRowSelected: '#DBEAFE',
  tableHeaderBg: '#F1F5F9',
  tableBorder: '#E2E8F0',
};
