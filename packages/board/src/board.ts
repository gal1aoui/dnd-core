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

export interface BoardOptions<TItem = unknown> {
  container: HTMLElement
  columns: BoardColumn<TItem>[]
  itemKeyExtractor: (item: TItem) => string
  onItemMove: (event: ItemMoveEvent<TItem>) => void
  onColumnReorder?: (event: ColumnReorderEvent) => void
  onDragStart?: (item: TItem, columnId: string) => void
  onDragEnd?: (item: TItem, cancelled: boolean) => void
  itemHandle?: string
  columnHandle?: string
  disabled?: boolean
  gap?: number
  animationDuration?: number
  allowColumnReorder?: boolean
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
  }

  constructor(options: BoardOptions<TItem>) {
    this.options = {
      gap: 0,
      animationDuration: 200,
      allowColumnReorder: false,
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

    // Cache all rects at drag start
    this.cacheRects()

    if (data.type === 'item') {
      const column = this.columns.find(c => c.id === data.columnId)
      if (!column) return

      const item = column.items.find(i => this.options.itemKeyExtractor(i) === data.itemId)
      if (!item) return

      const index = column.items.indexOf(item)

      this.dragState = {
        isDragging: true,
        activeItem: item,
        activeItemId: data.itemId!,
        activeColumnId: data.columnId,
        activeIndex: index,
        currentColumnId: data.columnId,
        currentIndex: index,
        type: 'item',
      }

      const key = `${data.columnId}:${data.itemId}`
      const activeEl = this.itemElements.get(key)
      if (activeEl) {
        activeEl.style.zIndex = '9999'
        activeEl.style.position = 'relative'
        activeEl.style.transition = 'none'
      }

      this.options.onDragStart?.(item, data.columnId)
    }
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
    } else if (targetColumnId) {
      // Still in the same column, update index
      const newIndex = this.findInsertIndexInColumn(targetColumnId, event.position)
      if (newIndex !== state.currentIndex) {
        state.currentIndex = newIndex
        this.updatePositions()
      }
    }
  }

  private handleDragEnd(event: DragEndEvent): void {
    const state = this.dragState
    if (!state.isDragging) return

    // Reset all styles
    for (const [, el] of this.itemElements) {
      el.style.transform = ''
      el.style.zIndex = ''
      el.style.position = ''
      el.style.transition = `transform ${this.options.animationDuration}ms cubic-bezier(0.2, 0, 0, 1)`
    }

    if (state.type === 'item' && !event.cancelled) {
      const fromColumnId = state.activeColumnId!
      const toColumnId = state.currentColumnId!
      const fromIndex = state.activeIndex
      const toIndex = state.currentIndex

      // Only emit if position actually changed
      if (fromColumnId !== toColumnId || fromIndex !== toIndex) {
        this.options.onItemMove({
          item: state.activeItem!,
          fromColumnId,
          toColumnId,
          fromIndex,
          toIndex,
        })
      }
    }

    this.options.onDragEnd?.(state.activeItem!, event.cancelled)

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
    }
    this.itemRects.clear()
    this.columnRects.clear()
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

        if (column.id === state.activeColumnId) {
          // Items in the source column
          if (column.id === state.currentColumnId) {
            // Moving within the same column
            if (i >= state.currentIndex && i < state.activeIndex) {
              translateY = rect.height + gap
            } else if (i <= state.currentIndex && i > state.activeIndex) {
              translateY = -(rect.height + gap)
            }
          } else {
            // Item left this column, shift items up
            if (i > state.activeIndex) {
              translateY = -(rect.height + gap)
            }
          }
        } else if (column.id === state.currentColumnId) {
          // Items in the target column (different from source)
          if (i >= state.currentIndex) {
            translateY = rect.height + gap
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
