import type { DndId, Point } from '@agallaoui/dnd-core';

/**
 * Represents a single item in a board column
 */
export interface BoardItem<T = unknown> {
  /** Unique identifier for the item */
  id: DndId;
  /** Custom data associated with this item */
  data: T;
}

/**
 * Represents a column in the board
 */
export interface BoardColumn<TItem = unknown, TColumn = unknown> {
  /** Unique identifier for the column */
  id: DndId;
  /** Items within this column, in order */
  items: BoardItem<TItem>[];
  /** Custom data associated with this column */
  data: TColumn;
}

/**
 * Complete board state
 */
export interface BoardState<TItem = unknown, TColumn = unknown> {
  /** All columns in the board, in order */
  columns: BoardColumn<TItem, TColumn>[];
}

/**
 * Position of the drop indicator within a column
 */
export interface DropIndicatorPosition {
  /** ID of the column where indicator is shown */
  columnId: DndId;
  /** Index where the item would be inserted */
  insertIndex: number;
  /** Pixel position for rendering the indicator */
  position: Point;
}

/**
 * Current drag state for board operations
 */
export interface BoardDragState<TItem = unknown> {
  /** Whether a drag is in progress */
  isDragging: boolean;
  /** The item being dragged */
  draggedItem: BoardItem<TItem> | null;
  /** ID of the source column */
  sourceColumnId: DndId | null;
  /** Original index in the source column */
  sourceIndex: number | null;
  /** Current drop indicator position */
  dropIndicator: DropIndicatorPosition | null;
  /** Offset from pointer to item origin (for overlay positioning) */
  dragOffset: Point | null;
}

/**
 * Result of a board drop operation
 */
export interface BoardDropResult<TItem = unknown> {
  /** The dropped item */
  item: BoardItem<TItem>;
  /** Source column ID */
  fromColumnId: DndId;
  /** Source index within column */
  fromIndex: number;
  /** Destination column ID */
  toColumnId: DndId;
  /** Destination index within column */
  toIndex: number;
}

/**
 * Callbacks for board drag and drop events
 */
export interface BoardCallbacks<TItem = unknown> {
  /** Called when a drag operation starts */
  onDragStart?: (item: BoardItem<TItem>, columnId: DndId) => void;

  /** Called continuously while dragging over columns */
  onDragOver?: (
    item: BoardItem<TItem>,
    columnId: DndId,
    insertIndex: number
  ) => void;

  /** Called when an item is dropped */
  onDrop?: (result: BoardDropResult<TItem>) => void;

  /** Called when a drag is cancelled */
  onDragCancel?: (item: BoardItem<TItem>) => void;
}

/**
 * Configuration options for the board DnD system
 */
export interface BoardConfig<TItem = unknown> {
  /** Callbacks for board events */
  callbacks?: BoardCallbacks<TItem>;

  /** Whether to animate item movements */
  animate?: boolean;

  /** Duration of animations in ms */
  animationDuration?: number;

  /** Gap between items in pixels (for indicator positioning) */
  itemGap?: number;

  /** Type identifier for draggable items */
  itemType?: string;
}

/**
 * Options for a board column component
 */
export interface BoardColumnOptions<TColumn = unknown> {
  /** Unique column ID */
  id: DndId;
  /** Column metadata */
  data: TColumn;
  /** Whether dropping is disabled */
  disabled?: boolean;
}

/**
 * Options for a board item component
 */
export interface BoardItemOptions<TItem = unknown> {
  /** Unique item ID */
  id: DndId;
  /** Item data */
  data: TItem;
  /** ID of the containing column */
  columnId: DndId;
  /** Index within the column */
  index: number;
  /** Whether dragging is disabled */
  disabled?: boolean;
}

/**
 * Render props for dragged item overlay
 */
export interface DragOverlayProps<TItem = unknown> {
  /** The item being dragged */
  item: BoardItem<TItem>;
  /** Current pointer position */
  position: Point;
  /** Offset from item origin to pointer */
  offset: Point;
}

/**
 * Render props for drop indicator
 */
export interface DropIndicatorProps {
  /** Column where indicator is shown */
  columnId: DndId;
  /** Index where item would be inserted */
  insertIndex: number;
  /** CSS styles for positioning */
  style: {
    position: 'absolute';
    top: number;
    left: number;
    width: number;
    height: number;
  };
}

/**
 * User-configurable board settings that can be persisted
 */
export interface BoardSettings {
  /** Minimum pixels to drag before starting */
  dragThreshold?: number;
  /** Whether to animate item movements */
  animate?: boolean;
  /** Duration of animations in ms */
  animationDuration?: number;
  /** Gap between items in pixels */
  itemGap?: number;
  /** Opacity of dragged item ghost */
  ghostOpacity?: number;
  /** Color of drop indicator */
  indicatorColor?: string;
  /** Height of drop indicator in pixels */
  indicatorHeight?: number;
  /** Border radius of drop indicator in pixels */
  indicatorBorderRadius?: number;
  /** Whether to allow cross-column dragging */
  allowCrossColumnDrag?: boolean;
  /** Cursor style during drag */
  dragCursor?: string;
  /** Whether to show the drag overlay */
  showOverlay?: boolean;
  /** Z-index for the drag overlay */
  overlayZIndex?: number;
  /** Whether to disable text selection during drag */
  disableTextSelection?: boolean;
}

/**
 * Default board settings
 */
export const defaultBoardSettings: Required<BoardSettings> = {
  dragThreshold: 5,
  animate: true,
  animationDuration: 200,
  itemGap: 8,
  ghostOpacity: 0.5,
  indicatorColor: '#3b82f6',
  indicatorHeight: 4,
  indicatorBorderRadius: 2,
  allowCrossColumnDrag: true,
  dragCursor: 'grabbing',
  showOverlay: true,
  overlayZIndex: 9999,
  disableTextSelection: true,
};
