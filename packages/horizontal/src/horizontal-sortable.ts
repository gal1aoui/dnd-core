/**
 * Horizontal sortable - reorderable horizontal list
 */

import {
  createDragEngine,
  type DragEngine,
  type CleanupFn,
  type DragStartEvent,
  type DragMoveEvent,
  type DragEndEvent,
  type Rect,
  getDropIndex,
  getRect,
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

/** Options for horizontal sortable */
export interface HorizontalSortableOptions<T = unknown> {
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
  /** Called before drag starts. Return false to prevent drag. */
  onBeforeDragStart?: (item: SortableItem<T>, element: HTMLElement) => boolean | void
  /** Called after drag ends and all cleanup is complete */
  onAfterDragEnd?: (item: SortableItem<T>, cancelled: boolean, fromIndex: number, toIndex: number) => void
  /** CSS selector for drag handle (optional) */
  handle?: string
  /** Disable sorting */
  disabled?: boolean
  /** Gap between items in pixels (for animation) */
  gap?: number
  /** Animation duration in ms */
  animationDuration?: number
  /** Lock axis to horizontal only */
  lockAxis?: boolean
}

export class HorizontalSortable<T = unknown> {
  private engine: DragEngine
  private options: HorizontalSortableOptions<T>
  private items: SortableItem<T>[]
  private cleanupFns: CleanupFn[] = []

  private draggingItem: SortableItem<T> | null = null
  private draggingIndex: number = -1
  private currentIndex: number = -1
  private itemElements: HTMLElement[] = []
  private itemRects: Map<string, DOMRect> = new Map()
  private indexedRects: Map<number, Rect> = new Map()

  constructor(options: HorizontalSortableOptions<T>) {
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

    this.itemElements = Array.from(
      container.querySelectorAll<HTMLElement>('[data-dnd-sortable-item]')
    )

    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i]!
      const element = this.itemElements[i]

      if (!element) continue

      item.element = element

      element.dataset.dndSortableId = item.id
      element.dataset.dndSortableIndex = String(i)

      element.style.transition = `transform ${this.options.animationDuration}ms cubic-bezier(0.2, 0, 0, 1)`

      const cleanup = this.engine.register(element, {
        id: item.id,
        disabled,
        handle,
        data: item,
        axis: this.options.lockAxis ? 'x' : 'both',
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
    if (!item || !item.element) return

    // Call onBeforeDragStart hook - return false to prevent drag
    if (this.options.onBeforeDragStart) {
      const result = this.options.onBeforeDragStart(item, item.element)
      if (result === false) {
        return
      }
    }

    this.draggingItem = item
    this.draggingIndex = this.items.findIndex(i => i.id === item.id)
    this.currentIndex = this.draggingIndex

    // Cache all item rects (by id and by index for getDropIndex)
    this.itemRects.clear()
    this.indexedRects.clear()

    for (let i = 0; i < this.itemElements.length; i++) {
      const el = this.itemElements[i]!
      const id = el.dataset.dndSortableId
      const rect = getRect(el)

      if (id) {
        this.itemRects.set(id, el.getBoundingClientRect())
      }
      this.indexedRects.set(i, rect)
    }

    // Set dragging element styles
    item.element.style.zIndex = '9999'
    item.element.style.position = 'relative'
    item.element.style.transition = 'none' // Disable transition during drag

    this.options.onDragStart?.(item)
  }

  private handleDragMove(event: DragMoveEvent): void {
    if (!this.draggingItem || this.draggingIndex === -1) return

    const draggingElement = this.draggingItem.element
    if (!draggingElement) return

    // Move dragging element with pointer using translate3d for GPU acceleration
    if (this.options.lockAxis) {
      draggingElement.style.transform = `translate3d(${event.delta.x}px, 0, 0)`
    } else {
      draggingElement.style.transform = `translate3d(${event.delta.x}px, ${event.delta.y}px, 0)`
    }

    // Calculate new index based on pointer position using cached rects
    const newIndex = getDropIndex(
      event.position,
      this.itemElements,
      'horizontal',
      this.draggingIndex,
      this.indexedRects
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
    const { animationDuration = 200 } = this.options

    // Reset all transforms with transition
    for (const el of this.itemElements) {
      el.style.transform = ''
      el.style.zIndex = ''
      el.style.position = ''
      el.style.transition = `transform ${animationDuration}ms cubic-bezier(0.2, 0, 0, 1)`
    }

    // Emit reorder event if position changed
    if (fromIndex !== toIndex && fromIndex !== -1 && !event.cancelled) {
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
    const finalFromIndex = fromIndex
    const finalToIndex = event.cancelled ? fromIndex : toIndex

    this.draggingItem = null
    this.draggingIndex = -1
    this.currentIndex = -1
    this.itemRects.clear()
    this.indexedRects.clear()

    // Call onAfterDragEnd hook after all cleanup
    this.options.onAfterDragEnd?.(item, event.cancelled, finalFromIndex, finalToIndex)
  }

  private updateItemPositions(): void {
    const { gap = 0, animationDuration = 200 } = this.options

    for (let i = 0; i < this.itemElements.length; i++) {
      const el = this.itemElements[i]!
      const id = el.dataset.dndSortableId

      if (id === this.draggingItem?.id) continue

      const rect = this.itemRects.get(id!)
      if (!rect) continue

      // Enable transition for smooth animation
      el.style.transition = `transform ${animationDuration}ms cubic-bezier(0.2, 0, 0, 1)`

      let translateX = 0

      if (i >= this.currentIndex && i < this.draggingIndex) {
        translateX = rect.width + gap
      } else if (i <= this.currentIndex && i > this.draggingIndex) {
        translateX = -(rect.width + gap)
      }

      // Use translate3d for GPU acceleration
      el.style.transform = translateX !== 0 ? `translate3d(${translateX}px, 0, 0)` : ''
    }
  }
}

/**
 * Create a new HorizontalSortable instance
 */
export function createHorizontalSortable<T = unknown>(
  options: HorizontalSortableOptions<T>
): HorizontalSortable<T> {
  return new HorizontalSortable(options)
}
