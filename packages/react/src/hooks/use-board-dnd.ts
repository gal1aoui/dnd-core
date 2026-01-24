/**
 * useBoardDnd - React hook for kanban-style board drag and drop
 *
 * ZERO RE-RENDERS DURING DRAG: All drag state is stored in refs
 * and DOM is manipulated directly. React state only updates on drop.
 */

import { useRef, useCallback, useEffect, useSyncExternalStore } from 'react'
import {
  createDragEngine,
  type DragEngine,
  type DragStartEvent,
  type DragMoveEvent,
  type DragEndEvent,
  type CleanupFn,
  getCenter,
  isPointInRect,
  getDistance,
  type Rect,
  type Position,
} from '@agal1aoui/dnd-core'

export interface ItemMoveEvent<TItem> {
  item: TItem
  fromColumn: string
  toColumn: string
  fromIndex: number
  toIndex: number
}

export interface UseBoardDndOptions<TColumn, TItem> {
  columns: TColumn[]
  columnKeyExtractor: (column: TColumn) => string
  itemKeyExtractor: (item: TItem) => string
  getColumnItems: (column: TColumn) => TItem[]
  onItemMove: (event: ItemMoveEvent<TItem>) => void
  onDragStart?: (item: TItem, columnId: string) => void
  onDragEnd?: (item: TItem, cancelled: boolean) => void
  itemHandle?: string
  itemsDisabled?: boolean
  itemGap?: number
  animationDuration?: number
}

export interface BoardColumnProps {
  ref: (element: HTMLElement | null) => void
  'data-dnd-column': string
}

export interface BoardItemProps {
  ref: (element: HTMLElement | null) => void
  'data-dnd-board-item': string
  'data-dnd-item-id': string
  'data-dnd-column-id': string
}

export interface UseBoardDndReturn<TColumn, TItem> {
  getColumnProps: (column: TColumn) => BoardColumnProps
  getItemProps: (item: TItem, columnKey: string, index: number) => BoardItemProps
  isDragging: boolean
  activeItemId: string | null
}

interface DragState<TItem> {
  isDragging: boolean
  activeItem: TItem | null
  activeItemId: string | null
  activeColumnId: string | null
  activeIndex: number
  currentColumnId: string | null
  currentIndex: number
}

export function useBoardDnd<TColumn, TItem>(
  options: UseBoardDndOptions<TColumn, TItem>
): UseBoardDndReturn<TColumn, TItem> {
  const {
    columns,
    columnKeyExtractor,
    itemKeyExtractor,
    getColumnItems,
    onItemMove,
    onDragStart,
    onDragEnd,
    itemHandle,
    itemsDisabled = false,
    itemGap = 0,
    animationDuration = 200,
  } = options

  const engineRef = useRef<DragEngine | null>(null)
  const columnElementsRef = useRef<Map<string, HTMLElement>>(new Map())
  const itemElementsRef = useRef<Map<string, HTMLElement>>(new Map())
  const itemRectsRef = useRef<Map<string, DOMRect>>(new Map())
  const columnRectsRef = useRef<Map<string, DOMRect>>(new Map())
  const cleanupFnsRef = useRef<Map<string, CleanupFn>>(new Map())

  // Mutable drag state - NO REACT STATE during drag
  const dragStateRef = useRef<DragState<TItem>>({
    isDragging: false,
    activeItem: null,
    activeItemId: null,
    activeColumnId: null,
    activeIndex: -1,
    currentColumnId: null,
    currentIndex: -1,
  })

  const snapshotVersionRef = useRef(0)
  const subscribersRef = useRef<Set<() => void>>(new Set())

  const subscribe = useCallback((callback: () => void) => {
    subscribersRef.current.add(callback)
    return () => subscribersRef.current.delete(callback)
  }, [])

  const getSnapshot = useCallback(() => snapshotVersionRef.current, [])

  const notifySubscribers = useCallback(() => {
    snapshotVersionRef.current++
    subscribersRef.current.forEach(cb => cb())
  }, [])

  useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  useEffect(() => {
    engineRef.current = createDragEngine({ autoScroll: true })
    return () => {
      engineRef.current?.destroy()
      engineRef.current = null
    }
  }, [])

  // Stable refs for callbacks
  const callbacksRef = useRef({ onItemMove, onDragStart, onDragEnd })
  callbacksRef.current = { onItemMove, onDragStart, onDragEnd }

  const columnsRef = useRef(columns)
  columnsRef.current = columns

  const extractorsRef = useRef({ columnKeyExtractor, itemKeyExtractor, getColumnItems })
  extractorsRef.current = { columnKeyExtractor, itemKeyExtractor, getColumnItems }

  useEffect(() => {
    const engine = engineRef.current
    if (!engine) return

    engine.on('onDragStart', (event: DragStartEvent) => {
      const data = event.data as { itemId: string; columnId: string }
      if (!data) return

      const { columnKeyExtractor, itemKeyExtractor, getColumnItems } = extractorsRef.current
      const currentColumns = columnsRef.current

      const column = currentColumns.find(c => columnKeyExtractor(c) === data.columnId)
      if (!column) return

      const columnItems = getColumnItems(column)
      const item = columnItems.find(i => itemKeyExtractor(i) === data.itemId)
      if (!item) return

      const index = columnItems.indexOf(item)

      // Cache rects at drag start
      itemRectsRef.current.clear()
      columnRectsRef.current.clear()

      for (const [key, el] of itemElementsRef.current) {
        itemRectsRef.current.set(key, el.getBoundingClientRect())
      }
      for (const [id, el] of columnElementsRef.current) {
        columnRectsRef.current.set(id, el.getBoundingClientRect())
      }

      dragStateRef.current = {
        isDragging: true,
        activeItem: item,
        activeItemId: data.itemId,
        activeColumnId: data.columnId,
        activeIndex: index,
        currentColumnId: data.columnId,
        currentIndex: index,
      }

      const key = `${data.columnId}:${data.itemId}`
      const activeEl = itemElementsRef.current.get(key)
      if (activeEl) {
        activeEl.style.zIndex = '9999'
        activeEl.style.position = 'relative'
        activeEl.style.transition = 'none'
      }

      callbacksRef.current.onDragStart?.(item, data.columnId)
    })

    engine.on('onDragMove', (event: DragMoveEvent) => {
      const state = dragStateRef.current
      if (!state.isDragging) return

      const key = `${state.activeColumnId}:${state.activeItemId}`
      const activeEl = itemElementsRef.current.get(key)
      if (activeEl) {
        activeEl.style.transform = `translate3d(${event.delta.x}px, ${event.delta.y}px, 0)`
      }

      const targetColumnId = findColumnAtPosition(event.position, columnRectsRef.current)

      if (targetColumnId && targetColumnId !== state.currentColumnId) {
        state.currentColumnId = targetColumnId
        state.currentIndex = findInsertIndex(
          targetColumnId,
          event.position,
          columnsRef.current,
          extractorsRef.current,
          itemRectsRef.current,
          state
        )
        updatePositions(
          state,
          itemGap,
          animationDuration,
          columnsRef.current,
          extractorsRef.current,
          itemElementsRef.current,
          itemRectsRef.current
        )
      } else if (targetColumnId) {
        const newIndex = findInsertIndex(
          targetColumnId,
          event.position,
          columnsRef.current,
          extractorsRef.current,
          itemRectsRef.current,
          state
        )
        if (newIndex !== state.currentIndex) {
          state.currentIndex = newIndex
          updatePositions(
            state,
            itemGap,
            animationDuration,
            columnsRef.current,
            extractorsRef.current,
            itemElementsRef.current,
            itemRectsRef.current
          )
        }
      }
    })

    engine.on('onDragEnd', (event: DragEndEvent) => {
      const state = dragStateRef.current
      if (!state.isDragging) return

      // Reset all styles
      for (const [, el] of itemElementsRef.current) {
        el.style.transform = ''
        el.style.zIndex = ''
        el.style.position = ''
        el.style.transition = `transform ${animationDuration}ms cubic-bezier(0.2, 0, 0, 1)`
      }

      if (!event.cancelled) {
        const fromColumnId = state.activeColumnId!
        const toColumnId = state.currentColumnId!
        const fromIndex = state.activeIndex
        const toIndex = state.currentIndex

        if (fromColumnId !== toColumnId || fromIndex !== toIndex) {
          callbacksRef.current.onItemMove({
            item: state.activeItem!,
            fromColumn: fromColumnId,
            toColumn: toColumnId,
            fromIndex,
            toIndex,
          })
        }
      }

      callbacksRef.current.onDragEnd?.(state.activeItem!, event.cancelled)

      dragStateRef.current = {
        isDragging: false,
        activeItem: null,
        activeItemId: null,
        activeColumnId: null,
        activeIndex: -1,
        currentColumnId: null,
        currentIndex: -1,
      }
      itemRectsRef.current.clear()
      columnRectsRef.current.clear()
      notifySubscribers()
    })
  }, [itemGap, animationDuration, notifySubscribers])

  // Register items
  useEffect(() => {
    const engine = engineRef.current
    if (!engine) return

    for (const cleanup of cleanupFnsRef.current.values()) {
      cleanup()
    }
    cleanupFnsRef.current.clear()

    for (const column of columns) {
      const columnId = columnKeyExtractor(column)
      const items = getColumnItems(column)

      for (const item of items) {
        const itemId = itemKeyExtractor(item)
        const key = `${columnId}:${itemId}`
        const element = itemElementsRef.current.get(key)

        if (element) {
          element.style.transition = `transform ${animationDuration}ms cubic-bezier(0.2, 0, 0, 1)`

          const cleanup = engine.register(element, {
            id: key,
            disabled: itemsDisabled,
            handle: itemHandle,
            data: { itemId, columnId },
          })
          cleanupFnsRef.current.set(key, cleanup)
        }
      }
    }

    return () => {
      for (const cleanup of cleanupFnsRef.current.values()) {
        cleanup()
      }
      cleanupFnsRef.current.clear()
    }
  }, [columns, columnKeyExtractor, itemKeyExtractor, getColumnItems, itemsDisabled, itemHandle, animationDuration])

  const getColumnProps = useCallback(
    (column: TColumn): BoardColumnProps => {
      const id = columnKeyExtractor(column)
      return {
        ref: (element: HTMLElement | null) => {
          if (element) {
            columnElementsRef.current.set(id, element)
          } else {
            columnElementsRef.current.delete(id)
          }
        },
        'data-dnd-column': id,
      }
    },
    [columnKeyExtractor]
  )

  const getItemProps = useCallback(
    (item: TItem, columnKey: string, _index: number): BoardItemProps => {
      const id = itemKeyExtractor(item)
      const key = `${columnKey}:${id}`

      return {
        ref: (element: HTMLElement | null) => {
          if (element) {
            itemElementsRef.current.set(key, element)
          } else {
            itemElementsRef.current.delete(key)
          }
        },
        'data-dnd-board-item': '',
        'data-dnd-item-id': id,
        'data-dnd-column-id': columnKey,
      }
    },
    [itemKeyExtractor]
  )

  return {
    getColumnProps,
    getItemProps,
    isDragging: dragStateRef.current.isDragging,
    activeItemId: dragStateRef.current.activeItemId,
  }
}

// Helper functions

function findColumnAtPosition(
  position: Position,
  columnRects: Map<string, DOMRect>
): string | null {
  for (const [id, rect] of columnRects) {
    if (isPointInRect(position, rect as Rect)) {
      return id
    }
  }

  let closest: string | null = null
  let minDist = Infinity

  for (const [id, rect] of columnRects) {
    const center = getCenter(rect as Rect)
    const dist = getDistance(position, center)
    if (dist < minDist) {
      minDist = dist
      closest = id
    }
  }

  return closest
}

function findInsertIndex<TColumn, TItem>(
  columnId: string,
  position: Position,
  columns: TColumn[],
  extractors: {
    columnKeyExtractor: (c: TColumn) => string
    itemKeyExtractor: (i: TItem) => string
    getColumnItems: (c: TColumn) => TItem[]
  },
  itemRects: Map<string, DOMRect>,
  state: DragState<TItem>
): number {
  const { columnKeyExtractor, itemKeyExtractor, getColumnItems } = extractors
  const column = columns.find(c => columnKeyExtractor(c) === columnId)
  if (!column) return 0

  const columnItems = getColumnItems(column)

  for (let i = 0; i < columnItems.length; i++) {
    const itemId = itemKeyExtractor(columnItems[i]!)
    const key = `${columnId}:${itemId}`

    if (columnId === state.activeColumnId && itemId === state.activeItemId) {
      continue
    }

    const rect = itemRects.get(key)
    if (rect) {
      const center = getCenter(rect as Rect)
      if (position.y < center.y) {
        if (columnId === state.activeColumnId && i > state.activeIndex) {
          return i - 1
        }
        return i
      }
    }
  }

  if (columnId === state.activeColumnId) {
    return columnItems.length - 1
  }
  return columnItems.length
}

function updatePositions<TColumn, TItem>(
  state: DragState<TItem>,
  gap: number,
  animationDuration: number,
  columns: TColumn[],
  extractors: {
    columnKeyExtractor: (c: TColumn) => string
    itemKeyExtractor: (i: TItem) => string
    getColumnItems: (c: TColumn) => TItem[]
  },
  itemElements: Map<string, HTMLElement>,
  itemRects: Map<string, DOMRect>
): void {
  const { columnKeyExtractor, itemKeyExtractor, getColumnItems } = extractors

  for (const column of columns) {
    const columnId = columnKeyExtractor(column)
    const columnItems = getColumnItems(column)

    for (let i = 0; i < columnItems.length; i++) {
      const itemId = itemKeyExtractor(columnItems[i]!)
      const key = `${columnId}:${itemId}`

      if (columnId === state.activeColumnId && itemId === state.activeItemId) {
        continue
      }

      const el = itemElements.get(key)
      const rect = itemRects.get(key)
      if (!el || !rect) continue

      el.style.transition = `transform ${animationDuration}ms cubic-bezier(0.2, 0, 0, 1)`

      let translateY = 0

      if (columnId === state.activeColumnId) {
        if (columnId === state.currentColumnId) {
          if (i >= state.currentIndex && i < state.activeIndex) {
            translateY = rect.height + gap
          } else if (i <= state.currentIndex && i > state.activeIndex) {
            translateY = -(rect.height + gap)
          }
        } else {
          if (i > state.activeIndex) {
            translateY = -(rect.height + gap)
          }
        }
      } else if (columnId === state.currentColumnId) {
        if (i >= state.currentIndex) {
          translateY = rect.height + gap
        }
      }

      el.style.transform = translateY !== 0 ? `translate3d(0, ${translateY}px, 0)` : ''
    }
  }
}
