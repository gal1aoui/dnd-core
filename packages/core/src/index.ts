/**
 * @agal1aoui/dnd-core
 * Headless drag-and-drop engine - framework agnostic
 */

// Core engine
export { DragEngine, createDragEngine } from './engine'

// Types
export type {
  DraggableId,
  DroppableId,
  Position,
  Rect,
  DragState,
  Axis,
  CollisionAlgorithm,
  DraggableConfig,
  DroppableConfig,
  ActiveDrag,
  CollisionInfo,
  DragEngineOptions,
  CleanupFn,
  DragLifecycleHooks,
} from './types'

export { DND_ATTRIBUTES } from './types'

// Events
export type {
  DndBaseEvent,
  DragStartEvent,
  DragMoveEvent,
  DragOverEvent,
  DragLeaveEvent,
  DragEndEvent,
  DropEvent,
  DndEvent,
  DragEventHandlers,
} from './events'

// State
export type { DragStateData, StateMachine } from './state'
export { createStateMachine } from './state'

// Sensors
export type { PointerSensor, PointerSensorOptions } from './sensors/pointer'
export { createPointerSensor } from './sensors/pointer'

export type { KeyboardSensor, KeyboardSensorOptions } from './sensors/keyboard'
export { createKeyboardSensor } from './sensors/keyboard'

// Collision detection
export {
  getRect,
  getCenter,
  getDistance,
  getCorners,
  rectsIntersect,
  getIntersectionArea,
  isPointInRect,
  getDropIndex,
  detectRectangleCollision,
  detectClosestCenterCollision,
  detectClosestCornerCollision,
} from './collision/rectangle'

export type { DroppableEntry } from './collision/rectangle'

// Modifiers
export type { AutoScroller, AutoScrollOptions } from './modifiers/auto-scroll'
export { createAutoScroller } from './modifiers/auto-scroll'
