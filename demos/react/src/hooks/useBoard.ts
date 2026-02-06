import { useState, useCallback } from 'react';
import type { BoardDropResult } from '@agallaoui/board-dnd/react';
import type { Task, Column } from '../types';

/**
 * Custom hook for managing board state
 * Handles column data and drag-drop operations
 */
export function useBoard(initialData: Column[]) {
  const [columns, setColumns] = useState<Column[]>(initialData);

  /**
   * Handle drop event - move item between columns
   */
  const handleDrop = useCallback(
    ({ fromColumnId, fromIndex, toColumnId, toIndex }: BoardDropResult<Task>) => {
      setColumns((prevColumns) => {
        // Clone columns
        const newColumns = prevColumns.map((col) => ({
          ...col,
          items: [...col.items],
        }));

        // Find source and target columns
        const sourceCol = newColumns.find((c) => c.id === fromColumnId);
        const targetCol = newColumns.find((c) => c.id === toColumnId);

        if (!sourceCol || !targetCol) return prevColumns;

        // Remove from source
        const [movedItem] = sourceCol.items.splice(fromIndex, 1);

        // Adjust target index if moving within same column
        let adjustedIndex = toIndex;
        if (fromColumnId === toColumnId && fromIndex < toIndex) {
          adjustedIndex = toIndex;
        }

        // Insert at target
        targetCol.items.splice(adjustedIndex, 0, movedItem);

        return newColumns;
      });
    },
    []
  );

  /**
   * Add a new task to a column
   */
  const addTask = useCallback((columnId: string, task: Task) => {
    setColumns((prevColumns) =>
      prevColumns.map((col) =>
        col.id === columnId
          ? { ...col, items: [...col.items, task] }
          : col
      )
    );
  }, []);

  /**
   * Remove a task from a column
   */
  const removeTask = useCallback((columnId: string, taskId: string) => {
    setColumns((prevColumns) =>
      prevColumns.map((col) =>
        col.id === columnId
          ? { ...col, items: col.items.filter((item) => item.id !== taskId) }
          : col
      )
    );
  }, []);

  /**
   * Update a task
   */
  const updateTask = useCallback((columnId: string, taskId: string, updates: Partial<Task>) => {
    setColumns((prevColumns) =>
      prevColumns.map((col) =>
        col.id === columnId
          ? {
              ...col,
              items: col.items.map((item) =>
                item.id === taskId ? { ...item, ...updates } : item
              ),
            }
          : col
      )
    );
  }, []);

  return {
    columns,
    handleDrop,
    addTask,
    removeTask,
    updateTask,
    setColumns,
  };
}
