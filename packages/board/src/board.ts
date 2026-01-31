/**
 * Board - Kanban-style multi-column drag and drop
 *
 * Supports:
 * - Dragging items between columns
 * - Reordering items within columns
 * - Optional column reordering
 */

import {
  createDragEngine,
  type DragEngine,
  type DragStartEvent,
  type DragMoveEvent,
  type DragEndEvent,
  type CleanupFn,
  getCenter,
  getDistance,
  isPointInRect,
  type Rect,
  type Position,
} from '@agal1aoui/dnd-core'

export interface BoardColumn<T = unknown> {
  id: string
  items: T[]
  data?: unknown
}

export interface ItemMoveEvent<T = unknown> {
  item: T
  fromColumnId: string
  toColumnId: string
  fromIndex: number
  toIndex: number
}

export interface ColumnReorderEvent {
  columnId: string
  fromIndex: number
  toIndex: number
}

export type IndicatorColor = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'default'

export interface BoardOptions<TItem = unknown> {
  container: HTMLElement
  columns: BoardColumn<TItem>[]
  itemKeyExtractor: (item: TItem) => string
  onItemMove: (event: ItemMoveEvent<TItem>) => void
  onColumnReorder?: (event: ColumnReorderEvent) => void
  onDragStart?: (item: TItem, columnId: string) => void
  onDragEnd?: (item: TItem, cancelled: boolean) => void
  /** Called before drag starts. Return false to prevent drag. */
  onBeforeDragStart?: (item: TItem, element: HTMLElement, columnId: string) => boolean | void
  /** Called after drag ends and all cleanup is complete */
  onAfterDragEnd?: (item: TItem, cancelled: boolean, fromColumnId: string, toColumnId: string, fromIndex: number, toIndex: number) => void
  itemHandle?: string
  columnHandle?: string
  disabled?: boolean
  gap?: number
  animationDuration?: number
  allowColumnReorder?: boolean
  /** Opacity of placeholder at original position (0-1). Default: 0.5 */
  placeholderOpacity?: number
  /** Color theme for drop indicator. Default: 'primary' */
  indicatorColor?: IndicatorColor
}

interface DragState<T> {
  isDragging: boolean
  activeItem: T | null
  activeItemId: string | null
  activeColumnId: string | null
  activeIndex: number
  currentColumnId: string | null
  currentIndex: number
  type: 'item' | 'column' | null
  activeItemHeight: number
}

export class Board<TItem = unknown> {
  private engine: DragEngine
  private options: BoardOptions<TItem>
  private columns: BoardColumn<TItem>[]
  private cleanupFns = new Map<string, CleanupFn>()

  private itemElements = new Map<string, HTMLElement>()
  private columnElements = new Map<string, HTMLElement>()
  private itemRects = new Map<string, DOMRect>()
  private columnRects = new Map<string, DOMRect>()

  private dragState: DragState<TItem> = {
    isDragging: false,
    activeItem: null,
    activeItemId: null,
    activeColumnId: null,
    activeIndex: -1,
    currentColumnId: null,
    currentIndex: -1,
    type: null,
    activeItemHeight: 0,
  }

  constructor(options: BoardOptions<TItem>) {
    this.options = {
      gap: 0,
      animationDuration: 200,
      allowColumnReorder: false,
      placeholderOpacity: 0.5,
      indicatorColor: 'primary',
      ...options,
    }
    this.columns = [...options.columns]
    this.engine = createDragEngine({ autoScroll: true })
    this.setupEngine()
  }

  setColumns(columns: BoardColumn<TItem>[]): void {
    this.columns = [...columns]
  }

  registerColumn(columnId: string, element: HTMLElement): CleanupFn {
    this.columnElements.set(columnId, element)

    element.setAttribute('data-dnd-column', columnId)
    element.style.transition = `transform ${this.options.animationDuration}ms cubic-bezier(0.2, 0, 0, 1)`

    if (this.options.allowColumnReorder) {
      const cleanup = this.engine.register(element, {
        id: `column:${columnId}`,
        disabled: this.options.disabled,
        handle: this.options.columnHandle,
        data: { type: 'column', columnId },
      })
      this.cleanupFns.set(`column:${columnId}`, cleanup)
    }

    return () => {
      this.columnElements.delete(columnId)
      const cleanup = this.cleanupFns.get(`column:${columnId}`)
      cleanup?.()
      this.cleanupFns.delete(`column:${columnId}`)
    }
  }

  registerItem(itemId: string, columnId: string, element: HTMLElement): CleanupFn {
    const key = `${columnId}:${itemId}`
    this.itemElements.set(key, element)

    element.setAttribute('data-dnd-item', itemId)
    element.setAttribute('data-dnd-column', columnId)
    element.style.transition = `transform ${this.options.animationDuration}ms cubic-bezier(0.2, 0, 0, 1)`

    const cleanup = this.engine.register(element, {
      id: key,
      disabled: this.options.disabled,
      handle: this.options.itemHandle,
      data: { type: 'item', itemId, columnId },
    })
    this.cleanupFns.set(key, cleanup)

    return () => {
      this.itemElements.delete(key)
      const cleanup = this.cleanupFns.get(key)
      cleanup?.()
      this.cleanupFns.delete(key)
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
    const data = event.data as { type: string; itemId?: string; columnId: string }
    if (!data) return

    if (data.type === 'item') {
      const column = this.columns.find(c => c.id === data.columnId)
      if (!column) return

      const item = column.items.find(i => this.options.itemKeyExtractor(i) === data.itemId)
      if (!item) return

      const key = `${data.columnId}:${data.itemId}`
      const activeEl = this.itemElements.get(key)
      if (!activeEl) return

      // Call onBeforeDragStart hook - return false to prevent drag
      if (this.options.onBeforeDragStart) {
        const result = this.options.onBeforeDragStart(item, activeEl, data.columnId)
        if (result === false) {
          return
        }
      }

      // Cache all rects at drag start
      this.cacheRects()

      const index = column.items.indexOf(item)

      const activeRect = activeEl.getBoundingClientRect()

      this.dragState = {
        isDragging: true,
        activeItem: item,
        activeItemId: data.itemId!,
        activeColumnId: data.columnId,
        activeIndex: index,
        currentColumnId: data.columnId,
        currentIndex: index,
        type: 'item',
        activeItemHeight: activeRect.height,
      }

      activeEl.style.zIndex = '9999'
      activeEl.style.position = 'relative'
      activeEl.style.transition = 'none'
      activeEl.setAttribute('data-dnd-dragging', '')

      // Create placeholder at original position
      this.createPlaceholder(activeEl)

      // Create drop indicator
      this.createDropIndicator(activeRect.height)

      // Show initial drop indicator
      this.updateDropIndicator()

      this.options.onDragStart?.(item, data.columnId)
    }
  }

  private createPlaceholder(element: HTMLElement): void {
    const { placeholderOpacity = 0.5 } = this.options

    // Create a clone as placeholder
    const placeholder = element.cloneNode(true) as HTMLElement
    placeholder.setAttribute('data-dnd-placeholder', '')
    placeholder.style.opacity = String(placeholderOpacity)
    placeholder.style.pointerEvents = 'none'
    placeholder.style.position = 'absolute'
    placeholder.style.top = '0'
    placeholder.style.left = '0'
    placeholder.style.right = '0'
    placeholder.style.zIndex = '1'

    // Make the original invisible but keep space
    element.style.opacity = '0'

    // Insert placeholder before the element
    element.parentElement?.insertBefore(placeholder, element)
    element.setAttribute('data-dnd-original', '')

    // Store reference for cleanup
    ;(element as any).__dndPlaceholder = placeholder
  }

  private createDropIndicator(_height: number): void {
    // We now use CSS-based indicators via data attributes, no DOM element needed
  }

  private updateDropIndicator(): void {
    const state = this.dragState

    // Clear all existing drop indicators
    for (const [, colEl] of this.columnElements) {
      const items = colEl.querySelectorAll('[data-dnd-item]')
      items.forEach(item => {
        item.removeAttribute('data-dnd-drop-before')
        item.removeAttribute('data-dnd-drop-after')
      })
      colEl.removeAttribute('data-dnd-drop-empty')
    }

    const columnEl = this.columnElements.get(state.currentColumnId!)
    if (!columnEl) return

    // Find the column
    const column = this.columns.find(c => c.id === state.currentColumnId)
    if (!column) return

    // Count visible items (excluding the dragged item if in same column)
    const visibleItems: Array<{ id: string; index: number }> = []
    for (let i = 0; i < column.items.length; i++) {
      const itemId = this.options.itemKeyExtractor(column.items[i]!)
      if (state.currentColumnId === state.activeColumnId && itemId === state.activeItemId) {
        continue
      }
      visibleItems.push({ id: itemId, index: visibleItems.length })
    }

    if (visibleItems.length === 0) {
      // Empty column or only contains the dragged item
      columnEl.setAttribute('data-dnd-drop-empty', '')
      return
    }

    // Find which item should show the drop indicator
    if (state.currentIndex === 0) {
      // Dropping at the start - show indicator BEFORE first visible item
      const firstItem = columnEl.querySelector(`[data-dnd-item="${visibleItems[0]!.id}"]`)
      if (firstItem) {
        firstItem.setAttribute('data-dnd-drop-before', '')
      }
    } else if (state.currentIndex >= visibleItems.length) {
      // Dropping at the end - show indicator AFTER last visible item
      const lastItem = columnEl.querySelector(`[data-dnd-item="${visibleItems[visibleItems.length - 1]!.id}"]`)
      if (lastItem) {
        lastItem.setAttribute('data-dnd-drop-after', '')
      }
    } else {
      // Dropping in the middle - show indicator BEFORE the item at currentIndex
      const targetItem = columnEl.querySelector(`[data-dnd-item="${visibleItems[state.currentIndex]!.id}"]`)
      if (targetItem) {
        targetItem.setAttribute('data-dnd-drop-before', '')
      }
    }
  }

  private cleanupPlaceholder(): void {
    // Remove all placeholders
    const placeholders = document.querySelectorAll('[data-dnd-placeholder]')
    placeholders.forEach(p => p.remove())

    // Reset original elements
    const originals = document.querySelectorAll('[data-dnd-original]')
    originals.forEach(el => {
      (el as HTMLElement).style.opacity = ''
      el.removeAttribute('data-dnd-original')
      ;(el as any).__dndPlaceholder = null
    })
  }

  private cleanupDropIndicator(): void {
    // Clean up CSS-based indicators
    document.querySelectorAll('[data-dnd-drop-before]').forEach(el => el.removeAttribute('data-dnd-drop-before'))
    document.querySelectorAll('[data-dnd-drop-after]').forEach(el => el.removeAttribute('data-dnd-drop-after'))
    document.querySelectorAll('[data-dnd-drop-empty]').forEach(el => el.removeAttribute('data-dnd-drop-empty'))
  }

  private handleDragMove(event: DragMoveEvent): void {
    const state = this.dragState
    if (!state.isDragging || state.type !== 'item') return

    // Move active element
    const key = `${state.activeColumnId}:${state.activeItemId}`
    const activeEl = this.itemElements.get(key)
    if (activeEl) {
      activeEl.style.transform = `translate3d(${event.delta.x}px, ${event.delta.y}px, 0)`
    }

    // Find which column we're over
    const targetColumnId = this.findColumnAtPosition(event.position)

    if (targetColumnId && targetColumnId !== state.currentColumnId) {
      // Moving to a different column
      state.currentColumnId = targetColumnId
      state.currentIndex = this.findInsertIndexInColumn(targetColumnId, event.position)
      this.updatePositions()
      this.updateDropIndicator()
    } else if (targetColumnId) {
      // Still in the same column, update index
      const newIndex = this.findInsertIndexInColumn(targetColumnId, event.position)
      if (newIndex !== state.currentIndex) {
        state.currentIndex = newIndex
        this.updatePositions()
        this.updateDropIndicator()
      }
    }
  }

  private handleDragEnd(event: DragEndEvent): void {
    const state = this.dragState
    if (!state.isDragging) return

    // Clean up placeholder and indicator
    this.cleanupPlaceholder()
    this.cleanupDropIndicator()

    // Reset all styles
    for (const [, el] of this.itemElements) {
      el.style.transform = ''
      el.style.zIndex = ''
      el.style.position = ''
      el.style.opacity = ''
      el.style.transition = `transform ${this.options.animationDuration}ms cubic-bezier(0.2, 0, 0, 1)`
      el.removeAttribute('data-dnd-dragging')
      el.removeAttribute('data-dnd-original')
    }

    const fromColumnId = state.activeColumnId!
    const toColumnId = state.currentColumnId!
    const fromIndex = state.activeIndex
    const toIndex = event.cancelled ? state.activeIndex : state.currentIndex
    const item = state.activeItem!

    if (state.type === 'item' && !event.cancelled) {
      // Only emit if position actually changed
      if (fromColumnId !== toColumnId || fromIndex !== state.currentIndex) {
        this.options.onItemMove({
          item,
          fromColumnId,
          toColumnId,
          fromIndex,
          toIndex: state.currentIndex,
        })
      }
    }

    this.options.onDragEnd?.(item, event.cancelled)

    // Reset state
    this.dragState = {
      isDragging: false,
      activeItem: null,
      activeItemId: null,
      activeColumnId: null,
      activeIndex: -1,
      currentColumnId: null,
      currentIndex: -1,
      type: null,
      activeItemHeight: 0,
    }
    this.itemRects.clear()
    this.columnRects.clear()

    // Call onAfterDragEnd hook after all cleanup
    this.options.onAfterDragEnd?.(item, event.cancelled, fromColumnId, toColumnId, fromIndex, toIndex)
  }

  private cacheRects(): void {
    this.itemRects.clear()
    this.columnRects.clear()

    for (const [key, el] of this.itemElements) {
      this.itemRects.set(key, el.getBoundingClientRect())
    }

    for (const [id, el] of this.columnElements) {
      this.columnRects.set(id, el.getBoundingClientRect())
    }
  }

  private findColumnAtPosition(position: Position): string | null {
    for (const [id, rect] of this.columnRects) {
      if (isPointInRect(position, rect as Rect)) {
        return id
      }
    }

    // If not directly over a column, find the closest one
    let closest: string | null = null
    let minDist = Infinity

    for (const [id, rect] of this.columnRects) {
      const center = getCenter(rect as Rect)
      const dist = getDistance(position, center)
      if (dist < minDist) {
        minDist = dist
        closest = id
      }
    }

    return closest
  }

  private findInsertIndexInColumn(columnId: string, position: Position): number {
    const column = this.columns.find(c => c.id === columnId)
    if (!column) return 0

    const state = this.dragState

    for (let i = 0; i < column.items.length; i++) {
      const itemId = this.options.itemKeyExtractor(column.items[i]!)
      const key = `${columnId}:${itemId}`

      // Skip the active item if in the same column
      if (columnId === state.activeColumnId && itemId === state.activeItemId) {
        continue
      }

      const rect = this.itemRects.get(key)
      if (rect) {
        const center = getCenter(rect as Rect)
        if (position.y < center.y) {
          // Adjust index if we're moving within the same column
          if (columnId === state.activeColumnId && i > state.activeIndex) {
            return i - 1
          }
          return i
        }
      }
    }

    // Return last position
    if (columnId === state.activeColumnId) {
      return column.items.length - 1
    }
    return column.items.length
  }

  private updatePositions(): void {
    const state = this.dragState
    const { gap = 0, animationDuration = 200 } = this.options

    for (const column of this.columns) {
      for (let i = 0; i < column.items.length; i++) {
        const itemId = this.options.itemKeyExtractor(column.items[i]!)
        const key = `${column.id}:${itemId}`

        // Skip the active item
        if (column.id === state.activeColumnId && itemId === state.activeItemId) {
          continue
        }

        const el = this.itemElements.get(key)
        const rect = this.itemRects.get(key)
        if (!el || !rect) continue

        el.style.transition = `transform ${animationDuration}ms cubic-bezier(0.2, 0, 0, 1)`

        let translateY = 0

        if (column.id === state.activeColumnId && column.id === state.currentColumnId) {
          // Same column: items shift based on position relative to active and current index
          if (i >= state.currentIndex && i < state.activeIndex) {
            translateY = state.activeItemHeight + gap
          } else if (i <= state.currentIndex && i > state.activeIndex) {
            translateY = -(state.activeItemHeight + gap)
          }
        } else if (column.id === state.activeColumnId) {
          // Source column but dragging to different column:
          // Don't shift items - placeholder keeps the space
          translateY = 0
        } else if (column.id === state.currentColumnId) {
          // Target column (different from source): items shift down to make room
          if (i >= state.currentIndex) {
            translateY = state.activeItemHeight + gap
          }
        }

        el.style.transform = translateY !== 0 ? `translate3d(0, ${translateY}px, 0)` : ''
      }
    }
  }
}

export function createBoard<TItem = unknown>(
  options: BoardOptions<TItem>
): Board<TItem> {
  return new Board(options)
}
