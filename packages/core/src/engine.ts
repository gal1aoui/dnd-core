/**
 * DragEngine - The core drag and drop engine
 */

import type {
  DragEngineOptions,
  DraggableConfig,
  DroppableConfig,
  DraggableId,
  DroppableId,
  Position,
  CleanupFn,
  CollisionInfo,
  ActiveDrag,
} from './types'

import { createStateMachine, type StateMachine } from './state'
import { createEventEmitter, type EventEmitter, type DragEventHandlers } from './events'
import { createPointerSensor, type PointerSensor } from './sensors/pointer'
import { createKeyboardSensor, type KeyboardSensor } from './sensors/keyboard'
import { createAutoScroller, type AutoScroller } from './modifiers/auto-scroll'
import {
  getRect,
  detectRectangleCollision,
  detectClosestCenterCollision,
  detectClosestCornerCollision,
  type DroppableEntry,
} from './collision/rectangle'

const ATTRIBUTES = {
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

export class DragEngine {
  private options: Required<DragEngineOptions>
  private stateMachine: StateMachine
  private eventEmitter: EventEmitter
  private autoScroller: AutoScroller | null = null

  private draggables = new Map<DraggableId, {
    element: HTMLElement
    config: DraggableConfig
    sensor: PointerSensor
    keyboardSensor?: KeyboardSensor
    cleanup: CleanupFn
  }>()

  private droppables = new Map<DroppableId, {
    element: HTMLElement
    config: DroppableConfig
  }>()

  private currentOverId: DroppableId | null = null
  private lastVelocity: Position = { x: 0, y: 0 }
  private lastMoveTime = 0
  private lastPosition: Position = { x: 0, y: 0 }

  constructor(options: DragEngineOptions = {}) {
    this.options = {
      root: options.root ?? document,
      collisionAlgorithm: options.collisionAlgorithm ?? 'rectangle',
      autoScroll: options.autoScroll ?? true,
      autoScrollSpeed: options.autoScrollSpeed ?? 15,
      autoScrollThreshold: options.autoScrollThreshold ?? 50,
      keyboard: options.keyboard ?? true,
      scrollContainer: options.scrollContainer ?? window,
    }

    this.stateMachine = createStateMachine()
    this.eventEmitter = createEventEmitter()

    if (this.options.autoScroll) {
      this.autoScroller = createAutoScroller({
        speed: this.options.autoScrollSpeed,
        threshold: this.options.autoScrollThreshold,
        container: this.options.scrollContainer,
      })
    }
  }

  /**
   * Register event handlers
   */
  on<K extends keyof DragEventHandlers>(
    event: K,
    handler: DragEventHandlers[K]
  ): this {
    this.eventEmitter.on(event, handler)
    return this
  }

  /**
   * Remove event handler
   */
  off<K extends keyof DragEventHandlers>(event: K): this {
    this.eventEmitter.off(event)
    return this
  }

  /**
   * Register a draggable element
   */
  register(element: HTMLElement, config: DraggableConfig): CleanupFn {
    if (this.draggables.has(config.id)) {
      console.warn(`DnD: Draggable with id "${config.id}" already registered`)
      this.unregister(config.id)
    }

    // Set data attributes
    element.setAttribute(ATTRIBUTES.item, '')
    element.setAttribute(ATTRIBUTES.itemId, config.id)

    if (config.disabled) {
      element.setAttribute(ATTRIBUTES.disabled, '')
    }

    // Create pointer sensor
    const sensor = createPointerSensor({
      delay: config.delay,
      distance: config.distance,
      onStart: (position, event) => this.handleDragStart(config.id, position, event),
      onMove: (position, event) => this.handleDragMove(position, event),
      onEnd: (position, event) => this.handleDragEnd(position, event),
      onCancel: () => this.handleDragCancel(),
    })

    const sensorCleanup = sensor.attach(element, config)

    // Create keyboard sensor if enabled
    let keyboardSensor: KeyboardSensor | undefined
    let keyboardCleanup: CleanupFn | undefined

    if (this.options.keyboard) {
      keyboardSensor = createKeyboardSensor({
        onStart: () => this.handleKeyboardDragStart(config.id, element),
        onMove: (delta) => this.handleKeyboardMove(delta),
        onEnd: () => this.handleKeyboardDragEnd(),
        onCancel: () => this.handleDragCancel(),
      })
      keyboardCleanup = keyboardSensor.attach(element)
    }

    const cleanup = () => {
      sensorCleanup()
      keyboardCleanup?.()
      sensor.destroy()
      keyboardSensor?.destroy()
      element.removeAttribute(ATTRIBUTES.item)
      element.removeAttribute(ATTRIBUTES.itemId)
      element.removeAttribute(ATTRIBUTES.disabled)
      element.removeAttribute(ATTRIBUTES.dragging)
    }

    this.draggables.set(config.id, {
      element,
      config,
      sensor,
      keyboardSensor,
      cleanup,
    })

    return () => this.unregister(config.id)
  }

  /**
   * Unregister a draggable element
   */
  unregister(id: DraggableId): void {
    const draggable = this.draggables.get(id)
    if (draggable) {
      draggable.cleanup()
      this.draggables.delete(id)
    }
  }

  /**
   * Register a droppable container
   */
  registerDropzone(element: HTMLElement, config: DroppableConfig): CleanupFn {
    if (this.droppables.has(config.id)) {
      console.warn(`DnD: Droppable with id "${config.id}" already registered`)
      this.unregisterDropzone(config.id)
    }

    element.setAttribute(ATTRIBUTES.container, '')
    element.setAttribute(ATTRIBUTES.containerId, config.id)

    if (config.disabled) {
      element.setAttribute(ATTRIBUTES.disabled, '')
    }

    this.droppables.set(config.id, { element, config })

    return () => this.unregisterDropzone(config.id)
  }

  /**
   * Unregister a droppable container
   */
  unregisterDropzone(id: DroppableId): void {
    const droppable = this.droppables.get(id)
    if (droppable) {
      droppable.element.removeAttribute(ATTRIBUTES.container)
      droppable.element.removeAttribute(ATTRIBUTES.containerId)
      droppable.element.removeAttribute(ATTRIBUTES.disabled)
      droppable.element.removeAttribute(ATTRIBUTES.over)
      this.droppables.delete(id)
    }
  }

  /**
   * Get current drag state
   */
  getState() {
    return this.stateMachine.getState()
  }

  /**
   * Subscribe to state changes
   */
  subscribe(callback: (state: ReturnType<StateMachine['getState']>) => void): CleanupFn {
    return this.stateMachine.subscribe(callback)
  }

  /**
   * Cancel current drag operation
   */
  cancel(): void {
    const state = this.stateMachine.getState()
    if (state.state === 'dragging' || state.state === 'pending') {
      this.handleDragCancel()
    }
  }

  /**
   * Destroy the engine and cleanup
   */
  destroy(): void {
    this.cancel()

    for (const [id] of this.draggables) {
      this.unregister(id)
    }

    for (const [id] of this.droppables) {
      this.unregisterDropzone(id)
    }

    this.autoScroller?.destroy()
    this.eventEmitter.clear()
  }

  // Private methods

  private handleDragStart(id: DraggableId, position: Position, event: PointerEvent): void {
    const draggable = this.draggables.get(id)
    if (!draggable || draggable.config.disabled) return

    const element = draggable.element
    const rect = getRect(element)

    const active: ActiveDrag = {
      draggableId: id,
      draggableElement: element,
      initialPosition: position,
      currentPosition: position,
      initialRect: rect,
      delta: { x: 0, y: 0 },
      data: draggable.config.data,
    }

    this.stateMachine.transition('pending', { pendingStart: null })
    this.stateMachine.transition('dragging', { active })

    // Set dragging attribute
    element.setAttribute(ATTRIBUTES.dragging, '')

    // Start auto-scroll
    this.autoScroller?.start()

    // Initialize velocity tracking
    this.lastPosition = position
    this.lastMoveTime = performance.now()
    this.lastVelocity = { x: 0, y: 0 }

    this.eventEmitter.emit({
      type: 'dragstart',
      timestamp: Date.now(),
      nativeEvent: event,
      draggableId: id,
      element,
      position,
      rect,
      data: draggable.config.data,
    })
  }

  private handleDragMove(position: Position, event: PointerEvent): void {
    const state = this.stateMachine.getState()
    if (state.state !== 'dragging' || !state.active) return

    const { active } = state
    const now = performance.now()
    const dt = now - this.lastMoveTime

    // Calculate velocity
    if (dt > 0) {
      this.lastVelocity = {
        x: (position.x - this.lastPosition.x) / dt * 1000,
        y: (position.y - this.lastPosition.y) / dt * 1000,
      }
    }

    this.lastPosition = position
    this.lastMoveTime = now

    // Update active state
    const delta = {
      x: position.x - active.initialPosition.x,
      y: position.y - active.initialPosition.y,
    }

    active.currentPosition = position
    active.delta = delta

    // Update auto-scroll
    this.autoScroller?.update(position)

    // Check collisions
    this.checkCollisions(position)

    this.eventEmitter.emit({
      type: 'dragmove',
      timestamp: Date.now(),
      nativeEvent: event,
      draggableId: active.draggableId,
      position,
      delta,
      velocity: this.lastVelocity,
      data: active.data,
    })
  }

  private handleDragEnd(position: Position, event: PointerEvent): void {
    const state = this.stateMachine.getState()
    if (state.state !== 'dragging' || !state.active) return

    const { active } = state
    const delta = {
      x: position.x - active.initialPosition.x,
      y: position.y - active.initialPosition.y,
    }

    // Stop auto-scroll
    this.autoScroller?.stop()

    // Emit drop event if over a droppable
    if (this.currentOverId) {
      const droppable = this.droppables.get(this.currentOverId)
      if (droppable) {
        this.eventEmitter.emit({
          type: 'drop',
          timestamp: Date.now(),
          nativeEvent: event,
          draggableId: active.draggableId,
          droppableId: this.currentOverId,
          droppableElement: droppable.element,
          position,
          draggableData: active.data,
          droppableData: droppable.config.data,
        })

        droppable.element.removeAttribute(ATTRIBUTES.over)
      }
    }

    // Remove dragging attribute
    active.draggableElement.removeAttribute(ATTRIBUTES.dragging)

    this.eventEmitter.emit({
      type: 'dragend',
      timestamp: Date.now(),
      nativeEvent: event,
      draggableId: active.draggableId,
      position,
      delta,
      cancelled: false,
      data: active.data,
    })

    this.currentOverId = null
    this.stateMachine.reset()
  }

  private handleDragCancel(): void {
    const state = this.stateMachine.getState()
    if (state.state !== 'dragging' || !state.active) {
      this.stateMachine.reset()
      return
    }

    const { active } = state

    // Stop auto-scroll
    this.autoScroller?.stop()

    // Remove attributes
    active.draggableElement.removeAttribute(ATTRIBUTES.dragging)

    if (this.currentOverId) {
      const droppable = this.droppables.get(this.currentOverId)
      droppable?.element.removeAttribute(ATTRIBUTES.over)
    }

    this.eventEmitter.emit({
      type: 'dragend',
      timestamp: Date.now(),
      draggableId: active.draggableId,
      position: active.currentPosition,
      delta: active.delta,
      cancelled: true,
      data: active.data,
    })

    this.currentOverId = null
    this.stateMachine.reset()
  }

  private handleKeyboardDragStart(id: DraggableId, element: HTMLElement): void {
    const draggable = this.draggables.get(id)
    if (!draggable || draggable.config.disabled) return

    const rect = getRect(element)
    const position = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }

    const active: ActiveDrag = {
      draggableId: id,
      draggableElement: element,
      initialPosition: position,
      currentPosition: position,
      initialRect: rect,
      delta: { x: 0, y: 0 },
      data: draggable.config.data,
    }

    this.stateMachine.transition('pending', { pendingStart: null })
    this.stateMachine.transition('dragging', { active })

    element.setAttribute(ATTRIBUTES.dragging, '')

    this.eventEmitter.emit({
      type: 'dragstart',
      timestamp: Date.now(),
      draggableId: id,
      element,
      position,
      rect,
      data: draggable.config.data,
    })
  }

  private handleKeyboardMove(delta: Position): void {
    const state = this.stateMachine.getState()
    if (state.state !== 'dragging' || !state.active) return

    const { active } = state
    const newDelta = {
      x: active.delta.x + delta.x,
      y: active.delta.y + delta.y,
    }

    const position = {
      x: active.initialPosition.x + newDelta.x,
      y: active.initialPosition.y + newDelta.y,
    }

    active.currentPosition = position
    active.delta = newDelta

    this.checkCollisions(position)

    this.eventEmitter.emit({
      type: 'dragmove',
      timestamp: Date.now(),
      draggableId: active.draggableId,
      position,
      delta: newDelta,
      velocity: { x: 0, y: 0 },
      data: active.data,
    })
  }

  private handleKeyboardDragEnd(): void {
    const state = this.stateMachine.getState()
    if (state.state !== 'dragging' || !state.active) return

    const { active } = state

    if (this.currentOverId) {
      const droppable = this.droppables.get(this.currentOverId)
      if (droppable) {
        this.eventEmitter.emit({
          type: 'drop',
          timestamp: Date.now(),
          draggableId: active.draggableId,
          droppableId: this.currentOverId,
          droppableElement: droppable.element,
          position: active.currentPosition,
          draggableData: active.data,
          droppableData: droppable.config.data,
        })

        droppable.element.removeAttribute(ATTRIBUTES.over)
      }
    }

    active.draggableElement.removeAttribute(ATTRIBUTES.dragging)

    this.eventEmitter.emit({
      type: 'dragend',
      timestamp: Date.now(),
      draggableId: active.draggableId,
      position: active.currentPosition,
      delta: active.delta,
      cancelled: false,
      data: active.data,
    })

    this.currentOverId = null
    this.stateMachine.reset()
  }

  private checkCollisions(position: Position): void {
    const state = this.stateMachine.getState()
    if (state.state !== 'dragging' || !state.active) return

    const { active } = state

    // Build list of valid droppables
    const droppables: DroppableEntry[] = []

    for (const [id, droppable] of this.droppables) {
      if (droppable.config.disabled) continue

      // Check if droppable accepts this draggable
      const accepts = droppable.config.accepts
      if (accepts) {
        if (typeof accepts === 'function') {
          if (!accepts(active.draggableId)) continue
        } else if (!accepts.includes(active.draggableId)) {
          continue
        }
      }

      droppables.push({
        id,
        element: droppable.element,
        data: droppable.config.data,
      })
    }

    // Calculate draggable rect at current position
    const draggableRect = {
      ...active.initialRect,
      left: active.initialRect.left + active.delta.x,
      right: active.initialRect.right + active.delta.x,
      top: active.initialRect.top + active.delta.y,
      bottom: active.initialRect.bottom + active.delta.y,
    }

    // Detect collision
    let collision: CollisionInfo | null = null

    switch (this.options.collisionAlgorithm) {
      case 'rectangle':
        collision = detectRectangleCollision(draggableRect, droppables)
        break
      case 'closest-center':
        collision = detectClosestCenterCollision(draggableRect, droppables)
        break
      case 'closest-corner':
        collision = detectClosestCornerCollision(draggableRect, droppables)
        break
    }

    const newOverId = collision?.droppableId ?? null

    // Handle over/leave events
    if (newOverId !== this.currentOverId) {
      // Leaving previous droppable
      if (this.currentOverId) {
        const prevDroppable = this.droppables.get(this.currentOverId)
        if (prevDroppable) {
          prevDroppable.element.removeAttribute(ATTRIBUTES.over)

          this.eventEmitter.emit({
            type: 'dragleave',
            timestamp: Date.now(),
            draggableId: active.draggableId,
            droppableId: this.currentOverId,
            droppableElement: prevDroppable.element,
          })
        }
      }

      // Entering new droppable
      if (collision) {
        collision.droppableElement.setAttribute(ATTRIBUTES.over, '')

        this.eventEmitter.emit({
          type: 'dragover',
          timestamp: Date.now(),
          draggableId: active.draggableId,
          droppableId: collision.droppableId,
          droppableElement: collision.droppableElement,
          position,
          collision,
          draggableData: active.data,
          droppableData: collision.data,
        })
      }

      this.currentOverId = newOverId
    }
  }
}

/**
 * Create a new DragEngine instance
 */
export function createDragEngine(options?: DragEngineOptions): DragEngine {
  return new DragEngine(options)
}
