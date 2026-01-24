/**
 * Vertical sortable - reorderable vertical list
 */

import {
  createDragEngine,
  type DragEngine,
  type CleanupFn,
  type DragStartEvent,
  type DragMoveEvent,
  type DragEndEvent,
  getDropIndex,
} from '@agal1aoui/dnd-core'

/** Item in the sortable list */
export interface SortableItem<T = unknown> {
  id: string
  data: T
  element?: HTMLElement
}

/** Reorder event */
export interface ReorderEvent<T = unknown> {
  item: SortableItem<T>
  fromIndex: number
  toIndex: number
  items: SortableItem<T>[]
}

/** Options for vertical sortable */
export interface VerticalSortableOptions<T = unknown> {
  /** Container element */
  container: HTMLElement
  /** Items to make sortable */
  items: SortableItem<T>[]
  /** Callback when items are reordered */
  onReorder: (event: ReorderEvent<T>) => void
  /** Optional callback when drag starts */
  onDragStart?: (item: SortableItem<T>) => void
  /** Optional callback when drag ends */
  onDragEnd?: (item: SortableItem<T>, cancelled: boolean) => void
  /** CSS selector for drag handle (optional) */
  handle?: string
  /** Disable sorting */
  disabled?: boolean
  /** Gap between items in pixels (for animation) */
  gap?: number
  /** Animation duration in ms */
  animationDuration?: number
  /** Lock axis to vertical only */
  lockAxis?: boolean
}

export class VerticalSortable<T = unknown> {
  private engine: DragEngine
  private options: VerticalSortableOptions<T>
  private items: SortableItem<T>[]
  private cleanupFns: CleanupFn[] = []

  private draggingItem: SortableItem<T> | null = null
  private draggingIndex: number = -1
  private currentIndex: number = -1
  private itemElements: HTMLElement[] = []
  private itemRects: Map<string, DOMRect> = new Map()

  constructor(options: VerticalSortableOptions<T>) {
    this.options = {
      gap: 0,
      animationDuration: 200,
      lockAxis: true,
      ...options,
    }

    this.items = [...options.items]
    this.engine = createDragEngine({
      autoScroll: true,
    })

    this.setupEngine()
    this.registerItems()
  }

  /** Update items */
  setItems(items: SortableItem<T>[]): void {
    this.cleanup()
    this.items = [...items]
    this.registerItems()
  }

  /** Enable/disable sorting */
  setDisabled(disabled: boolean): void {
    this.options.disabled = disabled
    // Re-register items with new disabled state
    this.cleanup()
    this.registerItems()
  }

  /** Destroy the sortable */
  destroy(): void {
    this.cleanup()
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

  private registerItems(): void {
    const { container, handle, disabled } = this.options

    // Find all item elements in container
    this.itemElements = Array.from(
      container.querySelectorAll<HTMLElement>('[data-dnd-sortable-item]')
    )

    // Register each item with the engine
    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i]!
      const element = this.itemElements[i]

      if (!element) continue

      item.element = element

      // Store item reference on element
      element.dataset.dndSortableId = item.id
      element.dataset.dndSortableIndex = String(i)

      // Set up transition for animations
      element.style.transition = `transform ${this.options.animationDuration}ms cubic-bezier(0.2, 0, 0, 1)`

      const cleanup = this.engine.register(element, {
        id: item.id,
        disabled,
        handle,
        data: item,
        axis: this.options.lockAxis ? 'y' : 'both',
      })

      this.cleanupFns.push(cleanup)
    }
  }

  private cleanup(): void {
    for (const fn of this.cleanupFns) {
      fn()
    }
    this.cleanupFns = []
  }

  private handleDragStart(event: DragStartEvent): void {
    const item = event.data as SortableItem<T>
    if (!item) return

    this.draggingItem = item
    this.draggingIndex = this.items.findIndex(i => i.id === item.id)
    this.currentIndex = this.draggingIndex

    // Cache all item rects
    this.itemRects.clear()
    for (const el of this.itemElements) {
      const id = el.dataset.dndSortableId
      if (id) {
        this.itemRects.set(id, el.getBoundingClientRect())
      }
    }

    // Set dragging element styles
    if (item.element) {
      item.element.style.zIndex = '9999'
      item.element.style.position = 'relative'
    }

    this.options.onDragStart?.(item)
  }

  private handleDragMove(event: DragMoveEvent): void {
    if (!this.draggingItem || this.draggingIndex === -1) return

    const draggingElement = this.draggingItem.element
    if (!draggingElement) return

    // Move dragging element with pointer
    if (this.options.lockAxis) {
      draggingElement.style.transform = `translateY(${event.delta.y}px)`
    } else {
      draggingElement.style.transform = `translate(${event.delta.x}px, ${event.delta.y}px)`
    }

    // Calculate new index based on pointer position
    const newIndex = getDropIndex(
      event.position,
      this.itemElements,
      'vertical',
      this.draggingIndex
    )

    if (newIndex !== this.currentIndex) {
      this.currentIndex = newIndex
      this.updateItemPositions()
    }
  }

  private handleDragEnd(event: DragEndEvent): void {
    if (!this.draggingItem) return

    const item = this.draggingItem
    const fromIndex = this.draggingIndex
    const toIndex = this.currentIndex

    // Reset all transforms
    for (const el of this.itemElements) {
      el.style.transform = ''
      el.style.zIndex = ''
      el.style.position = ''
    }

    // Emit reorder event if position changed
    if (fromIndex !== toIndex && !event.cancelled) {
      // Reorder items array
      const reorderedItems = [...this.items]
      const [movedItem] = reorderedItems.splice(fromIndex, 1)
      reorderedItems.splice(toIndex, 0, movedItem!)

      this.options.onReorder({
        item,
        fromIndex,
        toIndex,
        items: reorderedItems,
      })
    }

    this.options.onDragEnd?.(item, event.cancelled)

    // Reset state
    this.draggingItem = null
    this.draggingIndex = -1
    this.currentIndex = -1
    this.itemRects.clear()
  }

  private updateItemPositions(): void {
    const { gap = 0 } = this.options

    for (let i = 0; i < this.itemElements.length; i++) {
      const el = this.itemElements[i]!
      const id = el.dataset.dndSortableId

      // Skip dragging element
      if (id === this.draggingItem?.id) continue

      const rect = this.itemRects.get(id!)
      if (!rect) continue

      let translateY = 0

      // Determine if this item needs to shift
      if (i >= this.currentIndex && i < this.draggingIndex) {
        // Items between new position and original need to shift down
        translateY = rect.height + gap
      } else if (i <= this.currentIndex && i > this.draggingIndex) {
        // Items between original and new position need to shift up
        translateY = -(rect.height + gap)
      }

      el.style.transform = translateY !== 0 ? `translateY(${translateY}px)` : ''
    }
  }
}

/**
 * Create a new VerticalSortable instance
 */
export function createVerticalSortable<T = unknown>(
  options: VerticalSortableOptions<T>
): VerticalSortable<T> {
  return new VerticalSortable(options)
}
