import {
  createDndEngine,
  type DragStartEvent,
  type DragOverEvent,
  type DropEvent,
  type DragEndEvent,
  type DndId,
} from '@agallaoui/dnd-core';

import type {
  BoardConfig,
  BoardDragState,
  BoardItem,
  BoardDropResult,
  DropIndicatorPosition,
} from './types';

/**
 * Internal payload for drag operations
 */
interface BoardDragPayload<TItem = unknown> {
  item: BoardItem<TItem>;
  columnId: DndId;
  index: number;
}

/**
 * Internal payload for drop zones (columns)
 */
interface BoardDropPayload<TColumn = unknown> {
  columnId: DndId;
  data: TColumn;
  getItemPositions: () => ItemPosition[];
}

/**
 * Position info for an item in a column
 */
interface ItemPosition {
  id: DndId;
  index: number;
  top: number;
  bottom: number;
  height: number;
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: Required<Omit<BoardConfig, 'callbacks'>> = {
  animate: true,
  animationDuration: 200,
  itemGap: 8,
  itemType: 'board-item',
};

/**
 * Board DnD Engine
 *
 * Extends the core DnD engine with Kanban-board-specific behavior:
 * - Column-based drop zones
 * - Drop indicator calculation
 * - Source item ghost rendering
 * - Index-based insertion
 *
 * ## Architecture
 *
 * ```
 * ┌─────────────────────────────────────────────────────────────┐
 * │                     Board DnD Engine                        │
 * ├─────────────────────────────────────────────────────────────┤
 * │  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐   │
 * │  │   Column    │  │   Indicator  │  │   Board State    │   │
 * │  │  Registry   │  │  Calculator  │  │    Manager       │   │
 * │  └─────────────┘  └──────────────┘  └──────────────────┘   │
 * │           │               │                  │              │
 * │           └───────────────┼──────────────────┘              │
 * │                           │                                 │
 * │              ┌────────────┴────────────┐                    │
 * │              │    Core DnD Engine      │                    │
 * │              │   (@agallaoui/dnd-core) │                    │
 * │              └─────────────────────────┘                    │
 * └─────────────────────────────────────────────────────────────┘
 * ```
 *
 * ## Drag Flow
 *
 * 1. **Drag Start**: Original item gets 50% opacity, overlay follows cursor
 * 2. **Drag Over**: Drop indicator shows at insertion point
 * 3. **Drop**: State update only on drop, items animate to new positions
 *
 * @example
 * ```typescript
 * const engine = createBoardEngine({
 *   callbacks: {
 *     onDrop: ({ item, fromColumnId, toColumnId, toIndex }) => {
 *       moveItem(item.id, fromColumnId, toColumnId, toIndex);
 *     }
 *   }
 * });
 * ```
 */
export interface BoardEngine<TItem = unknown, TColumn = unknown> {
  /** Register a column as a drop zone */
  registerColumn: (
    element: HTMLElement,
    options: {
      id: DndId;
      data: TColumn;
      getItemPositions: () => ItemPosition[];
    }
  ) => {
    destroy: () => void;
    update: (options: { data?: TColumn; disabled?: boolean }) => void;
  };

  /** Register an item as draggable */
  registerItem: (
    element: HTMLElement,
    options: {
      id: DndId;
      data: TItem;
      columnId: DndId;
      index: number;
      disabled?: boolean;
    }
  ) => {
    destroy: () => void;
    update: (options: { data?: TItem; columnId?: DndId; index?: number; disabled?: boolean }) => void;
  };

  /** Get current board drag state */
  getState: () => BoardDragState<TItem>;

  /** Subscribe to state changes */
  subscribe: (callback: (state: BoardDragState<TItem>) => void) => () => void;

  /** Cancel current drag */
  cancel: () => void;

  /** Clean up resources */
  destroy: () => void;
}

/**
 * Create initial board drag state
 */
function createInitialBoardState<TItem>(): BoardDragState<TItem> {
  return {
    isDragging: false,
    draggedItem: null,
    sourceColumnId: null,
    sourceIndex: null,
    dropIndicator: null,
    dragOffset: null,
  };
}

/**
 * Calculate drop indicator position based on pointer Y position
 */
function calculateDropIndicator(
  pointerY: number,
  columnId: DndId,
  itemPositions: ItemPosition[],
  itemGap: number
): DropIndicatorPosition {
  // If no items, insert at index 0
  if (itemPositions.length === 0) {
    return {
      columnId,
      insertIndex: 0,
      position: { x: 0, y: 0 },
    };
  }

  // Find insertion point based on Y position
  for (let i = 0; i < itemPositions.length; i++) {
    const item = itemPositions[i];
    const midpoint = item.top + item.height / 2;

    if (pointerY < midpoint) {
      return {
        columnId,
        insertIndex: i,
        position: { x: 0, y: item.top - itemGap / 2 },
      };
    }
  }

  // Insert at end
  const lastItem = itemPositions[itemPositions.length - 1];
  return {
    columnId,
    insertIndex: itemPositions.length,
    position: { x: 0, y: lastItem.bottom + itemGap / 2 },
  };
}

/**
 * Creates a new Board DnD engine instance
 *
 * @param config - Board configuration options
 * @returns A new BoardEngine instance
 */
export function createBoardEngine<TItem = unknown, TColumn = unknown>(
  config: BoardConfig<TItem> = {}
): BoardEngine<TItem, TColumn> {
  // Merge config with defaults
  const mergedConfig = {
    ...DEFAULT_CONFIG,
    ...config,
    callbacks: config.callbacks || {},
  };

  // Board-specific state
  let boardState = createInitialBoardState<TItem>();
  const subscribers = new Set<(state: BoardDragState<TItem>) => void>();

  // Track column positions for drop indicator calculation
  const columnGetters = new Map<DndId, () => ItemPosition[]>();

  /**
   * Notify subscribers of state change
   */
  function notifySubscribers(): void {
    subscribers.forEach((callback) => callback(boardState));
  }

  /**
   * Update board state and notify
   */
  function setBoardState(updates: Partial<BoardDragState<TItem>>): void {
    boardState = { ...boardState, ...updates };
    notifySubscribers();
  }

  // Create core DnD engine with board-specific handlers
  const coreEngine = createDndEngine<
    BoardDragPayload<TItem>,
    BoardDropPayload<TColumn>
  >({
    dragThreshold: 5,
    draggingBodyClass: 'board-dnd-dragging',
    callbacks: {
      onDragStart: (event: DragStartEvent<BoardDragPayload<TItem>>) => {
        const { item, columnId, index } = event.item.payload;

        setBoardState({
          isDragging: true,
          draggedItem: item,
          sourceColumnId: columnId,
          sourceIndex: index,
          dropIndicator: null,
          dragOffset: event.dragOffset,
        });

        mergedConfig.callbacks.onDragStart?.(item, columnId);
      },

      onDragOver: (
        event: DragOverEvent<BoardDragPayload<TItem>, BoardDropPayload<TColumn>>
      ) => {
        const { item, columnId: sourceColumnId } = event.item.payload;
        const { columnId, getItemPositions } = event.dropZone.payload;

        // Calculate drop indicator position
        let itemPositions = getItemPositions();

        // When dragging within the same column, exclude the dragged item
        // This allows the indicator to show at all positions including after the last visible item
        if (columnId === sourceColumnId) {
          itemPositions = itemPositions.filter((pos) => pos.id !== item.id);
          // Re-index the positions after filtering
          itemPositions = itemPositions.map((pos, idx) => ({ ...pos, index: idx }));
        }
        const indicator = calculateDropIndicator(
          event.position.y,
          columnId,
          itemPositions,
          mergedConfig.itemGap
        );

        // Store the indicator position for UI rendering
        // Since we filtered out the dragged item for same-column drags,
        // the insertIndex directly represents the visual and final position
        setBoardState({
          dropIndicator: indicator,
        });

        mergedConfig.callbacks.onDragOver?.(item, columnId, indicator.insertIndex);
      },

      onDrop: (
        event: DropEvent<BoardDragPayload<TItem>, BoardDropPayload<TColumn>>
      ) => {
        const { item, columnId: sourceColumnId, index: sourceIndex } =
          event.item.payload;
        const { columnId: targetColumnId } = event.dropZone.payload;

        // Get the insertion index from drop indicator
        // Since we filter out the dragged item when calculating positions in same-column drags,
        // the insertIndex already represents the correct target position (no adjustment needed)
        const toIndex = boardState.dropIndicator?.insertIndex ?? 0;

        const result: BoardDropResult<TItem> = {
          item,
          fromColumnId: sourceColumnId,
          fromIndex: sourceIndex,
          toColumnId: targetColumnId,
          toIndex,
        };

        // Reset state before callback (state update happens in callback)
        setBoardState(createInitialBoardState());

        mergedConfig.callbacks.onDrop?.(result);
      },

      onDragEnd: (event: DragEndEvent<BoardDragPayload<TItem>>) => {
        const { item } = event.item.payload;

        if (!event.dropped) {
          mergedConfig.callbacks.onDragCancel?.(item);
        }

        setBoardState(createInitialBoardState());
      },
    },
  });

  return {
    registerColumn: (element, options) => {
      const { id, data, getItemPositions } = options;

      columnGetters.set(id, getItemPositions);

      const handle = coreEngine.registerDroppable(element, {
        id,
        accepts: [mergedConfig.itemType],
        payload: {
          columnId: id,
          data,
          getItemPositions,
        },
      });

      return {
        destroy: () => {
          columnGetters.delete(id);
          handle.destroy();
        },
        update: (newOptions) => {
          handle.update({
            disabled: newOptions.disabled,
            payload: {
              columnId: id,
              data: newOptions.data ?? data,
              getItemPositions,
            },
          });
        },
      };
    },

    registerItem: (element, options) => {
      const { id, data, columnId, index, disabled } = options;

      const handle = coreEngine.registerDraggable(element, {
        id,
        type: mergedConfig.itemType,
        disabled,
        payload: {
          item: { id, data },
          columnId,
          index,
        },
      });

      return {
        destroy: () => handle.destroy(),
        update: (newOptions: { data?: TItem; index?: number; columnId?: DndId; disabled?: boolean }) => {
          handle.update({
            disabled: newOptions.disabled,
            payload: {
              item: { id, data: newOptions.data ?? data },
              columnId: newOptions.columnId ?? columnId,
              index: newOptions.index ?? index,
            },
          });
        },
      };
    },

    getState: () => boardState,

    subscribe: (callback) => {
      subscribers.add(callback);
      return () => subscribers.delete(callback);
    },

    cancel: () => {
      coreEngine.cancel();
      setBoardState(createInitialBoardState());
    },

    destroy: () => {
      coreEngine.destroy();
      columnGetters.clear();
      subscribers.clear();
      boardState = createInitialBoardState();
    },
  };
}

// Re-export ItemPosition for external use
export type { ItemPosition };
