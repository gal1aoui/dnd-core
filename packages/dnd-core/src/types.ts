/**
 * Represents a 2D point coordinate
 */
export interface Point {
  x: number;
  y: number;
}

/**
 * Represents a rectangular area with position and dimensions
 */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Unique identifier for draggable and droppable elements
 */
export type DndId = string | number;

/**
 * Represents the data associated with a draggable item
 */
export interface DragData<T = unknown> {
  /** Unique identifier for the draggable item */
  id: DndId;
  /** The type/category of the draggable (for filtering valid drop targets) */
  type: string;
  /** Custom payload data attached to the drag operation */
  payload: T;
}

/**
 * Represents the data associated with a drop zone
 */
export interface DropZoneData<T = unknown> {
  /** Unique identifier for the drop zone */
  id: DndId;
  /** Accepted drag types (empty array accepts all) */
  accepts: string[];
  /** Custom payload data attached to the drop zone */
  payload: T;
}

/**
 * Current state of the drag operation
 */
export type DragPhase = 'idle' | 'dragging' | 'dropping';

/**
 * Complete state of the DnD system at any given moment
 */
export interface DndState<TDrag = unknown, TDrop = unknown> {
  /** Current phase of the drag operation */
  phase: DragPhase;
  /** Data of the item being dragged (null when idle) */
  dragData: DragData<TDrag> | null;
  /** Current pointer position relative to viewport */
  pointerPosition: Point | null;
  /** Initial pointer position when drag started */
  startPosition: Point | null;
  /** Offset from pointer to drag element origin */
  dragOffset: Point | null;
  /** Currently hovered drop zone (null if none) */
  activeDropZone: DropZoneData<TDrop> | null;
  /** List of all registered drop zones */
  dropZones: Map<DndId, DropZoneData<TDrop>>;
}

/**
 * Event payload for drag start
 */
export interface DragStartEvent<T = unknown> {
  /** The dragged item data */
  item: DragData<T>;
  /** The DOM element being dragged */
  element: HTMLElement;
  /** Starting pointer position */
  position: Point;
  /** Offset from pointer to element origin */
  dragOffset: Point;
  /** Original pointer event */
  originalEvent: PointerEvent;
}

/**
 * Event payload for drag over
 */
export interface DragOverEvent<TDrag = unknown, TDrop = unknown> {
  /** The dragged item data */
  item: DragData<TDrag>;
  /** The drop zone being hovered */
  dropZone: DropZoneData<TDrop>;
  /** Current pointer position */
  position: Point;
  /** The drop zone DOM element */
  dropZoneElement: HTMLElement;
}

/**
 * Event payload for drop
 */
export interface DropEvent<TDrag = unknown, TDrop = unknown> {
  /** The dragged item data */
  item: DragData<TDrag>;
  /** The drop zone where the item was dropped */
  dropZone: DropZoneData<TDrop>;
  /** Final pointer position */
  position: Point;
  /** The drop zone DOM element */
  dropZoneElement: HTMLElement;
}

/**
 * Event payload for drag end (includes cancelled drags)
 */
export interface DragEndEvent<T = unknown> {
  /** The dragged item data */
  item: DragData<T>;
  /** Whether the drag resulted in a successful drop */
  dropped: boolean;
  /** Final pointer position */
  position: Point;
}

/**
 * Lifecycle callbacks for the DnD system
 */
export interface DndCallbacks<TDrag = unknown, TDrop = unknown> {
  /** Called when a drag operation starts */
  onDragStart?: (event: DragStartEvent<TDrag>) => void;
  /** Called when dragging over a valid drop zone */
  onDragOver?: (event: DragOverEvent<TDrag, TDrop>) => void;
  /** Called when leaving a drop zone */
  onDragLeave?: (dropZone: DropZoneData<TDrop>) => void;
  /** Called when an item is dropped on a valid drop zone */
  onDrop?: (event: DropEvent<TDrag, TDrop>) => void;
  /** Called when a drag operation ends (success or cancel) */
  onDragEnd?: (event: DragEndEvent<TDrag>) => void;
}

/**
 * Configuration options for the DnD engine
 */
export interface DndConfig<TDrag = unknown, TDrop = unknown> {
  /** Minimum distance in pixels before drag starts (prevents accidental drags) */
  dragThreshold?: number;
  /** Whether to capture pointer on drag start */
  capturePointer?: boolean;
  /** CSS class applied to body during drag */
  draggingBodyClass?: string;
  /** Lifecycle callbacks */
  callbacks?: DndCallbacks<TDrag, TDrop>;
}

/**
 * Options for making an element draggable
 */
export interface DraggableOptions<T = unknown> {
  /** Unique identifier for this draggable */
  id: DndId;
  /** The type/category of this draggable */
  type: string;
  /** Custom payload data */
  payload: T;
  /** Whether dragging is currently disabled */
  disabled?: boolean;
  /** Optional handle selector (only these elements can initiate drag) */
  handleSelector?: string;
}

/**
 * Options for making an element a drop zone
 */
export interface DroppableOptions<T = unknown> {
  /** Unique identifier for this drop zone */
  id: DndId;
  /** Types of draggables this zone accepts (empty = all) */
  accepts?: string[];
  /** Custom payload data */
  payload: T;
  /** Whether dropping is currently disabled */
  disabled?: boolean;
}

/**
 * Return value from registering a draggable
 */
export interface DraggableHandle<T = unknown> {
  /** Call to unregister this draggable */
  destroy: () => void;
  /** Update options dynamically */
  update: (options: Partial<DraggableOptions<T>>) => void;
  /** Check if currently being dragged */
  isDragging: () => boolean;
}

/**
 * Return value from registering a droppable
 */
export interface DroppableHandle<T = unknown> {
  /** Call to unregister this droppable */
  destroy: () => void;
  /** Update options dynamically */
  update: (options: Partial<DroppableOptions<T>>) => void;
  /** Check if currently hovered by a draggable */
  isOver: () => boolean;
}
