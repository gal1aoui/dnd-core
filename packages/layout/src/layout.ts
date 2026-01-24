/**
 * Layout - Flex-based widget layout with responsive reordering
 *
 * Supports:
 * - Flex wrap layouts
 * - Grid-like positioning
 * - Responsive column count
 * - Smooth item swapping
 */

import {
  createDragEngine,
  type DragEngine,
  type DragStartEvent,
  type DragMoveEvent,
  type DragEndEvent,
  type CleanupFn,
  getDistance,
  type Position,
} from '@agal1aoui/dnd-core'

export interface LayoutItem<T = unknown> {
  id: string
  data: T
}

export interface ReorderEvent<T = unknown> {
  item: T
  fromIndex: number
  toIndex: number
  items: T[]
}

export interface LayoutOptions<T = unknown> {
  container: HTMLElement
  items: LayoutItem<T>[]
  onReorder: (event: ReorderEvent<T>) => void
  onDragStart?: (item: T) => void
  onDragEnd?: (item: T, cancelled: boolean) => void
  handle?: string
  disabled?: boolean
  gap?: number
  animationDuration?: number
}

interface DragState<T> {
  isDragging: boolean
  activeItem: T | null
  activeId: string | null
  activeIndex: number
  currentIndex: number
}

interface ItemPosition {
  x: number
  y: number
  width: number
  height: number
}

export class Layout<T = unknown> {
  private engine: DragEngine
  private options: LayoutOptions<T>
  private items: LayoutItem<T>[]
  private cleanupFns = new Map<string, CleanupFn>()

  private itemElements = new Map<string, HTMLElement>()
  private itemPositions = new Map<string, ItemPosition>()

  private dragState: DragState<T> = {
    isDragging: false,
    activeItem: null,
    activeId: null,
    activeIndex: -1,
    currentIndex: -1,
  }

  constructor(options: LayoutOptions<T>) {
    this.options = {
      gap: 0,
      animationDuration: 200,
      ...options,
    }
    this.items = [...options.items]
    this.engine = createDragEngine({ autoScroll: true })
    this.setupEngine()
  }

  setItems(items: LayoutItem<T>[]): void {
    this.items = [...items]
  }

  registerItem(id: string, element: HTMLElement): CleanupFn {
    this.itemElements.set(id, element)

    element.setAttribute('data-dnd-layout-item', id)
    element.style.transition = `transform ${this.options.animationDuration}ms cubic-bezier(0.2, 0, 0, 1)`

    const cleanup = this.engine.register(element, {
      id,
      disabled: this.options.disabled,
      handle: this.options.handle,
      data: this.items.find(i => i.id === id)?.data,
    })
    this.cleanupFns.set(id, cleanup)

    return () => {
      this.itemElements.delete(id)
      const cleanup = this.cleanupFns.get(id)
      cleanup?.()
      this.cleanupFns.delete(id)
    }
  }

  destroy(): void {
    for (const cleanup of this.cleanupFns.values()) {
      cleanup()
    }
    this.cleanupFns.clear()
    this.engine.destroy()
  }

  private setupEngine(): void {
    this.engine.on('onDragStart', (event: DragStartEvent) => {
      this.handleDragStart(event)
    })

    this.engine.on('onDragMove', (event: DragMoveEvent) => {
      this.handleDragMove(event)
    })

    this.engine.on('onDragEnd', (event: DragEndEvent) => {
      this.handleDragEnd(event)
    })
  }

  private handleDragStart(event: DragStartEvent): void {
    const item = this.items.find(i => i.id === event.draggableId)
    if (!item) return

    const index = this.items.indexOf(item)

    // Cache all positions at drag start
    this.cachePositions()

    this.dragState = {
      isDragging: true,
      activeItem: item.data,
      activeId: event.draggableId,
      activeIndex: index,
      currentIndex: index,
    }

    const activeEl = this.itemElements.get(event.draggableId)
    if (activeEl) {
      activeEl.style.zIndex = '9999'
      activeEl.style.position = 'relative'
      activeEl.style.transition = 'none'
    }

    this.options.onDragStart?.(item.data)
  }

  private handleDragMove(event: DragMoveEvent): void {
    const state = this.dragState
    if (!state.isDragging || !state.activeId) return

    // Move active element
    const activeEl = this.itemElements.get(state.activeId)
    if (activeEl) {
      activeEl.style.transform = `translate3d(${event.delta.x}px, ${event.delta.y}px, 0)`
    }

    // Find closest item by center distance
    const newIndex = this.findClosestIndex(event.position)

    if (newIndex !== state.currentIndex) {
      state.currentIndex = newIndex
      this.updatePositions()
    }
  }

  private handleDragEnd(event: DragEndEvent): void {
    const state = this.dragState
    if (!state.isDragging) return

    const fromIndex = state.activeIndex
    const toIndex = state.currentIndex

    // Reset all styles
    for (const [, el] of this.itemElements) {
      el.style.transform = ''
      el.style.zIndex = ''
      el.style.position = ''
      el.style.transition = `transform ${this.options.animationDuration}ms cubic-bezier(0.2, 0, 0, 1)`
    }

    if (fromIndex !== toIndex && !event.cancelled) {
      const item = state.activeItem as T
      const newItems = this.items.map(i => i.data)
      const [movedItem] = newItems.splice(fromIndex, 1)
      newItems.splice(toIndex, 0, movedItem as T)

      this.options.onReorder({
        item,
        fromIndex,
        toIndex,
        items: newItems,
      })
    }

    this.options.onDragEnd?.(state.activeItem!, event.cancelled)

    // Reset state
    this.dragState = {
      isDragging: false,
      activeItem: null,
      activeId: null,
      activeIndex: -1,
      currentIndex: -1,
    }
    this.itemPositions.clear()
  }

  private cachePositions(): void {
    this.itemPositions.clear()

    for (const [id, el] of this.itemElements) {
      const rect = el.getBoundingClientRect()
      this.itemPositions.set(id, {
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
      })
    }
  }

  private findClosestIndex(position: Position): number {
    const state = this.dragState
    let closestIndex = state.activeIndex
    let closestDistance = Infinity

    for (let i = 0; i < this.items.length; i++) {
      if (i === state.activeIndex) continue

      const item = this.items[i]!
      const pos = this.itemPositions.get(item.id)

      if (pos) {
        const center: Position = {
          x: pos.x + pos.width / 2,
          y: pos.y + pos.height / 2,
        }
        const distance = getDistance(position, center)

        if (distance < closestDistance) {
          closestDistance = distance
          closestIndex = i
        }
      }
    }

    return closestIndex
  }

  private updatePositions(): void {
    const state = this.dragState
    const { animationDuration = 200 } = this.options

    // For layout DnD, items swap positions visually
    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i]!
      const el = this.itemElements.get(item.id)

      if (!el || item.id === state.activeId) continue

      el.style.transition = `transform ${animationDuration}ms cubic-bezier(0.2, 0, 0, 1)`

      const currentPos = this.itemPositions.get(item.id)
      if (!currentPos) continue

      // Calculate where this item should visually be
      let targetIndex = i

      if (i === state.currentIndex) {
        // This item is at the target position, swap with active
        targetIndex = state.activeIndex
      } else if (i > state.activeIndex && i <= state.currentIndex) {
        // Items shift left/up
        targetIndex = i - 1
      } else if (i < state.activeIndex && i >= state.currentIndex) {
        // Items shift right/down
        targetIndex = i + 1
      }

      if (targetIndex !== i) {
        const targetItem = this.items[targetIndex]
        if (targetItem) {
          const targetPos = this.itemPositions.get(targetItem.id)
          if (targetPos) {
            const dx = targetPos.x - currentPos.x
            const dy = targetPos.y - currentPos.y
            el.style.transform = `translate3d(${dx}px, ${dy}px, 0)`
          }
        }
      } else {
        el.style.transform = ''
      }
    }
  }
}

export function createLayout<T = unknown>(options: LayoutOptions<T>): Layout<T> {
  return new Layout(options)
}
