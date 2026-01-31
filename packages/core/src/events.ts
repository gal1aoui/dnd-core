/**
 * Event types for drag operations
 */

import type { Position, Rect, DraggableId, DroppableId, CollisionInfo } from './types'

/** Base event interface */
export interface DndBaseEvent {
  /** Timestamp of the event */
  timestamp: number
  /** Original DOM event if available */
  nativeEvent?: Event
}

/** Fired when drag operation starts */
export interface DragStartEvent extends DndBaseEvent {
  type: 'dragstart'
  /** ID of the draggable item */
  draggableId: DraggableId
  /** The draggable element */
  element: HTMLElement
  /** Initial position */
  position: Position
  /** Initial bounding rect */
  rect: Rect
  /** User data attached to draggable */
  data?: unknown
}

/** Fired continuously during drag */
export interface DragMoveEvent extends DndBaseEvent {
  type: 'dragmove'
  /** ID of the draggable item */
  draggableId: DraggableId
  /** Current position */
  position: Position
  /** Change from initial position */
  delta: Position
  /** Velocity of movement */
  velocity: Position
  /** User data attached to draggable */
  data?: unknown
}

/** Fired when dragging over a droppable */
export interface DragOverEvent extends DndBaseEvent {
  type: 'dragover'
  /** ID of the draggable item */
  draggableId: DraggableId
  /** ID of the droppable being hovered */
  droppableId: DroppableId
  /** The droppable element */
  droppableElement: HTMLElement
  /** Current position */
  position: Position
  /** Collision info */
  collision: CollisionInfo
  /** User data attached to draggable */
  draggableData?: unknown
  /** User data attached to droppable */
  droppableData?: unknown
}

/** Fired when leaving a droppable */
export interface DragLeaveEvent extends DndBaseEvent {
  type: 'dragleave'
  /** ID of the draggable item */
  draggableId: DraggableId
  /** ID of the droppable being left */
  droppableId: DroppableId
  /** The droppable element */
  droppableElement: HTMLElement
}

/** Fired when drag operation ends (drop or cancel) */
export interface DragEndEvent extends DndBaseEvent {
  type: 'dragend'
  /** ID of the draggable item */
  draggableId: DraggableId
  /** Final position */
  position: Position
  /** Total change from initial position */
  delta: Position
  /** Was the drag cancelled? */
  cancelled: boolean
  /** User data attached to draggable */
  data?: unknown
}

/** Fired when item is dropped on a droppable */
export interface DropEvent extends DndBaseEvent {
  type: 'drop'
  /** ID of the draggable item */
  draggableId: DraggableId
  /** ID of the droppable where item was dropped */
  droppableId: DroppableId
  /** The droppable element */
  droppableElement: HTMLElement
  /** Drop position */
  position: Position
  /** User data attached to draggable */
  draggableData?: unknown
  /** User data attached to droppable */
  droppableData?: unknown
}

/** Union of all DnD events */
export type DndEvent =
  | DragStartEvent
  | DragMoveEvent
  | DragOverEvent
  | DragLeaveEvent
  | DragEndEvent
  | DropEvent

/** Event handlers */
export interface DragEventHandlers {
  onDragStart?: (event: DragStartEvent) => void
  onDragMove?: (event: DragMoveEvent) => void
  onDragOver?: (event: DragOverEvent) => void
  onDragLeave?: (event: DragLeaveEvent) => void
  onDragEnd?: (event: DragEndEvent) => void
  onDrop?: (event: DropEvent) => void
}

/** Map event type to handler key */
const EVENT_TO_HANDLER: Record<string, keyof DragEventHandlers> = {
  dragstart: 'onDragStart',
  dragmove: 'onDragMove',
  dragover: 'onDragOver',
  dragleave: 'onDragLeave',
  dragend: 'onDragEnd',
  drop: 'onDrop',
}

/** Create an event emitter */
export function createEventEmitter() {
  const handlers: DragEventHandlers = {}

  return {
    on<K extends keyof DragEventHandlers>(
      event: K,
      handler: DragEventHandlers[K]
    ): void {
      handlers[event] = handler
    },

    off<K extends keyof DragEventHandlers>(event: K): void {
      delete handlers[event]
    },

    emit<E extends DndEvent>(event: E): void {
      const handlerKey = EVENT_TO_HANDLER[event.type]
      if (!handlerKey) return

      const handler = handlers[handlerKey]
      if (handler) {
        // @ts-expect-error - TypeScript can't narrow the handler type correctly
        handler(event)
      }
    },

    clear(): void {
      for (const key of Object.keys(handlers) as (keyof DragEventHandlers)[]) {
        delete handlers[key]
      }
    },
  }
}

export type EventEmitter = ReturnType<typeof createEventEmitter>
