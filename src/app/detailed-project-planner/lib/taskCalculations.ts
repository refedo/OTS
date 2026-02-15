import { TaskNode, PlannerTaskData, TaskLevel, LEVEL_ORDER } from './types';

/**
 * Build a tree structure from flat task data
 */
export function buildTree(flatTasks: PlannerTaskData[]): TaskNode[] {
  const taskMap = new Map<string, TaskNode>();
  const roots: TaskNode[] = [];

  // Create TaskNode for each task
  flatTasks.forEach(task => {
    taskMap.set(task.id, {
      ...task,
      children: [],
      collapsed: false,
      rowIndex: 0,
      depth: getDepth(task.level),
    });
  });

  // Build parent-child relationships
  flatTasks.forEach(task => {
    const node = taskMap.get(task.id)!;
    if (task.parentId && taskMap.has(task.parentId)) {
      taskMap.get(task.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  // Sort children by sortOrder
  const sortChildren = (nodes: TaskNode[]) => {
    nodes.sort((a, b) => a.sortOrder - b.sortOrder);
    nodes.forEach(node => sortChildren(node.children));
  };
  sortChildren(roots);

  return roots;
}

/**
 * Flatten tree into visible list (respecting collapsed state)
 */
export function flattenVisible(tree: TaskNode[], collapsedIds: Set<string>): TaskNode[] {
  const result: TaskNode[] = [];
  let rowIndex = 0;

  const traverse = (nodes: TaskNode[]) => {
    for (const node of nodes) {
      node.rowIndex = rowIndex;
      node.collapsed = collapsedIds.has(node.id);
      result.push(node);
      rowIndex++;

      if (!node.collapsed && node.children.length > 0) {
        traverse(node.children);
      }
    }
  };

  traverse(tree);
  return result;
}

/**
 * Get all task IDs in a subtree (for collapse/expand)
 */
export function getSubtreeIds(node: TaskNode): string[] {
  const ids: string[] = [node.id];
  node.children.forEach(child => {
    ids.push(...getSubtreeIds(child));
  });
  return ids;
}

/**
 * Get depth number from level
 */
export function getDepth(level: TaskLevel): number {
  return LEVEL_ORDER.indexOf(level);
}

/**
 * Get the next level down in hierarchy
 */
export function getChildLevel(level: TaskLevel): TaskLevel | null {
  const idx = LEVEL_ORDER.indexOf(level);
  if (idx < LEVEL_ORDER.length - 1) {
    return LEVEL_ORDER[idx + 1];
  }
  return null;
}

/**
 * Get the parent level in hierarchy
 */
export function getParentLevel(level: TaskLevel): TaskLevel | null {
  const idx = LEVEL_ORDER.indexOf(level);
  if (idx > 0) {
    return LEVEL_ORDER[idx - 1];
  }
  return null;
}

/**
 * Determine indent level for a task (can also use parentId chain)
 */
export function getIndentLevel(task: PlannerTaskData, allTasks: PlannerTaskData[]): number {
  let depth = 0;
  let currentParentId = task.parentId;
  while (currentParentId) {
    depth++;
    const parent = allTasks.find(t => t.id === currentParentId);
    currentParentId = parent?.parentId || null;
  }
  return depth;
}

/**
 * Find the next available sort order after a given task
 */
export function getNextSortOrder(tasks: PlannerTaskData[], afterTaskId?: string): number {
  if (!afterTaskId) {
    const maxOrder = Math.max(0, ...tasks.map(t => t.sortOrder));
    return maxOrder + 1;
  }

  const afterTask = tasks.find(t => t.id === afterTaskId);
  if (!afterTask) {
    return Math.max(0, ...tasks.map(t => t.sortOrder)) + 1;
  }

  // Find all tasks that come after this one and shift them
  return afterTask.sortOrder + 1;
}

/**
 * Recalculate sort orders to be sequential
 */
export function reindexSortOrders(tasks: PlannerTaskData[]): { id: string; sortOrder: number }[] {
  const sorted = [...tasks].sort((a, b) => a.sortOrder - b.sortOrder);
  return sorted.map((task, index) => ({
    id: task.id,
    sortOrder: index + 1,
  }));
}
