/**
 * Core types for the DnD engine
 */

/** Unique identifier for draggable items */
export type DraggableId = string

/** Unique identifier for droppable containers */
export type DroppableId = string

/** Position coordinates */
export interface Position {
  x: number
  y: number
}

/** Bounding rectangle */
export interface Rect {
  top: number
  right: number
  bottom: number
  left: number
  width: number
  height: number
}

/** Drag state machine states */
export type DragState = 'idle' | 'pending' | 'dragging' | 'dropping'

/** Axis constraint for dragging */
export type Axis = 'x' | 'y' | 'both'

/** Collision detection algorithm type */
export type CollisionAlgorithm = 'rectangle' | 'closest-center' | 'closest-corner'

/** Data attributes applied by the engine */
export const DND_ATTRIBUTES = {
  item: 'data-dnd-item',
  itemId: 'data-dnd-item-id',
  container: 'data-dnd-container',
  containerId: 'data-dnd-container-id',
  dragging: 'data-dnd-dragging',
  over: 'data-dnd-over',
  placeholder: 'data-dnd-placeholder',
  disabled: 'data-dnd-disabled',
  handle: 'data-dnd-handle',
  dropIndicator: 'data-dnd-drop-indicator',
} as const

/** Configuration for a draggable item */
export interface DraggableConfig {
  id: DraggableId
  disabled?: boolean
  handle?: string // CSS selector for drag handle
  data?: unknown // User data attached to draggable
  axis?: Axis
  delay?: number // Delay in ms before drag starts
  distance?: number // Min distance in px before drag starts
}

/** Configuration for a droppable container */
export interface DroppableConfig {
  id: DroppableId
  disabled?: boolean
  accepts?: DraggableId[] | ((draggableId: DraggableId) => boolean)
  data?: unknown // User data attached to droppable
  direction?: 'vertical' | 'horizontal'
}

/** Active drag operation state */
export interface ActiveDrag {
  draggableId: DraggableId
  draggableElement: HTMLElement
  initialPosition: Position
  currentPosition: Position
  initialRect: Rect
  delta: Position
  data?: unknown
}

/** Information about collision with a droppable */
export interface CollisionInfo {
  droppableId: DroppableId
  droppableElement: HTMLElement
  rect: Rect
  data?: unknown
}

/** Engine options */
export interface DragEngineOptions {
  /** Root element to attach listeners to (default: document) */
  root?: HTMLElement | Document
  /** Collision detection algorithm */
  collisionAlgorithm?: CollisionAlgorithm
  /** Enable auto-scroll when dragging near edges */
  autoScroll?: boolean
  /** Auto-scroll speed in px/frame */
  autoScrollSpeed?: number
  /** Auto-scroll activation threshold in px from edge */
  autoScrollThreshold?: number
  /** Enable keyboard support */
  keyboard?: boolean
  /** Custom scroll container (default: window) */
  scrollContainer?: HTMLElement | Window
}

/** Registration cleanup function */
export type CleanupFn = () => void
