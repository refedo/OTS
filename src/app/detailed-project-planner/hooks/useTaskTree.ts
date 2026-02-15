'use client';

import { useState, useCallback, useMemo } from 'react';
import { PlannerTaskData, TaskNode, TaskLevel } from '../lib/types';
import { buildTree, flattenVisible, getChildLevel } from '../lib/taskCalculations';

interface UseTaskTreeReturn {
  tree: TaskNode[];
  visibleTasks: TaskNode[];
  collapsedIds: Set<string>;
  selectedTaskId: string | null;
  toggleCollapse: (taskId: string) => void;
  collapseAll: () => void;
  expandAll: () => void;
  selectTask: (taskId: string | null) => void;
  setTasks: (tasks: PlannerTaskData[]) => void;
  tasks: PlannerTaskData[];
  getChildLevelFor: (parentLevel: TaskLevel) => TaskLevel | null;
  findTask: (taskId: string) => TaskNode | undefined;
}

export function useTaskTree(initialTasks: PlannerTaskData[] = []): UseTaskTreeReturn {
  const [tasks, setTasks] = useState<PlannerTaskData[]>(initialTasks);
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const tree = useMemo(() => buildTree(tasks), [tasks]);

  const visibleTasks = useMemo(
    () => flattenVisible(tree, collapsedIds),
    [tree, collapsedIds]
  );

  const toggleCollapse = useCallback((taskId: string) => {
    setCollapsedIds(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  }, []);

  const collapseAll = useCallback(() => {
    const allSummaryIds = new Set<string>();
    const collectSummaryIds = (nodes: TaskNode[]) => {
      nodes.forEach(node => {
        if (node.children.length > 0) {
          allSummaryIds.add(node.id);
          collectSummaryIds(node.children);
        }
      });
    };
    collectSummaryIds(tree);
    setCollapsedIds(allSummaryIds);
  }, [tree]);

  const expandAll = useCallback(() => {
    setCollapsedIds(new Set());
  }, []);

  const selectTask = useCallback((taskId: string | null) => {
    setSelectedTaskId(taskId);
  }, []);

  const getChildLevelFor = useCallback((parentLevel: TaskLevel): TaskLevel | null => {
    return getChildLevel(parentLevel);
  }, []);

  const findTask = useCallback((taskId: string): TaskNode | undefined => {
    const search = (nodes: TaskNode[]): TaskNode | undefined => {
      for (const node of nodes) {
        if (node.id === taskId) return node;
        const found = search(node.children);
        if (found) return found;
      }
      return undefined;
    };
    return search(tree);
  }, [tree]);

  return {
    tree,
    visibleTasks,
    collapsedIds,
    selectedTaskId,
    toggleCollapse,
    collapseAll,
    expandAll,
    selectTask,
    setTasks,
    tasks,
    getChildLevelFor,
    findTask,
  };
}
