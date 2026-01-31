/**
 * useBoardDnd - React hook for kanban-style board drag and drop
 *
 * ZERO RE-RENDERS DURING DRAG: All drag state is stored in refs
 * and DOM is manipulated directly. React state only updates on drop.
 */

import { useRef, useCallback, useEffect, useSyncExternalStore, type MutableRefObject } from 'react'
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

export type IndicatorColor = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'default'

export interface UseBoardDndOptions<TColumn, TItem> {
  columns: TColumn[]
  columnKeyExtractor: (column: TColumn) => string
  itemKeyExtractor: (item: TItem) => string
  getColumnItems: (column: TColumn) => TItem[]
  onItemMove: (event: ItemMoveEvent<TItem>) => void
  onDragStart?: (item: TItem, columnId: string) => void
  onDragEnd?: (item: TItem, cancelled: boolean) => void
  /** Called before drag starts. Return false to prevent drag. */
  onBeforeDragStart?: (item: TItem, element: HTMLElement, columnId: string) => boolean | void
  /** Called after drag ends and all cleanup is complete */
  onAfterDragEnd?: (item: TItem, cancelled: boolean, fromColumnId: string, toColumnId: string, fromIndex: number, toIndex: number) => void
  itemHandle?: string
  itemsDisabled?: boolean
  itemGap?: number
  animationDuration?: number
  /** Opacity of placeholder at original position (0-1). Default: 0.5 */
  placeholderOpacity?: number
  /** Color theme for drop indicator. Default: 'primary' */
  indicatorColor?: IndicatorColor
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
  activeItemHeight: number
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
    placeholderOpacity = 0.5,
    indicatorColor = 'primary',
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
    activeItemHeight: 0,
  })

  const dropIndicatorRef = useRef<HTMLElement | null>(null)
  const placeholderRef = useRef<HTMLElement | null>(null)

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
  const { onBeforeDragStart, onAfterDragEnd } = options
  const callbacksRef = useRef({ onItemMove, onDragStart, onDragEnd, onBeforeDragStart, onAfterDragEnd })
  callbacksRef.current = { onItemMove, onDragStart, onDragEnd, onBeforeDragStart, onAfterDragEnd }

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

      const key = `${data.columnId}:${data.itemId}`
      const activeEl = itemElementsRef.current.get(key)
      if (!activeEl) return

      // Call onBeforeDragStart hook - return false to prevent drag
      if (callbacksRef.current.onBeforeDragStart) {
        const result = callbacksRef.current.onBeforeDragStart(item, activeEl, data.columnId)
        if (result === false) {
          return
        }
      }

      const index = columnItems.indexOf(item)

      // Cache rects at drag start
      itemRectsRef.current.clear()
      columnRectsRef.current.clear()

      for (const [k, el] of itemElementsRef.current) {
        itemRectsRef.current.set(k, el.getBoundingClientRect())
      }
      for (const [id, el] of columnElementsRef.current) {
        columnRectsRef.current.set(id, el.getBoundingClientRect())
      }

      const activeRect = activeEl.getBoundingClientRect()

      dragStateRef.current = {
        isDragging: true,
        activeItem: item,
        activeItemId: data.itemId,
        activeColumnId: data.columnId,
        activeIndex: index,
        currentColumnId: data.columnId,
        currentIndex: index,
        activeItemHeight: activeRect.height,
      }

      activeEl.style.zIndex = '9999'
      activeEl.style.position = 'relative'
      activeEl.style.transition = 'none'
      activeEl.setAttribute('data-dnd-dragging', '')

      // Create placeholder at original position
      createPlaceholder(activeEl, placeholderOpacity, placeholderRef)

      // Create drop indicator
      createDropIndicator(activeRect.height, indicatorColor, dropIndicatorRef)

      // Show initial drop indicator position
      updateDropIndicator(
        dragStateRef.current,
        itemGap,
        columnsRef.current,
        extractorsRef.current,
        columnElementsRef.current,
        itemRectsRef.current,
        dropIndicatorRef
      )

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
        updateDropIndicator(
          state,
          itemGap,
          columnsRef.current,
          extractorsRef.current,
          columnElementsRef.current,
          itemRectsRef.current,
          dropIndicatorRef
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
          updateDropIndicator(
            state,
            itemGap,
            columnsRef.current,
            extractorsRef.current,
            columnElementsRef.current,
            itemRectsRef.current,
            dropIndicatorRef
          )
        }
      }
    })

    engine.on('onDragEnd', (event: DragEndEvent) => {
      const state = dragStateRef.current
      if (!state.isDragging) return

      // Clean up placeholder and drop indicator
      cleanupPlaceholder(placeholderRef)
      cleanupDropIndicator(dropIndicatorRef)

      // Reset all styles
      for (const [, el] of itemElementsRef.current) {
        el.style.transform = ''
        el.style.zIndex = ''
        el.style.position = ''
        el.style.opacity = ''
        el.style.transition = `transform ${animationDuration}ms cubic-bezier(0.2, 0, 0, 1)`
        el.removeAttribute('data-dnd-original')
        el.removeAttribute('data-dnd-dragging')
      }

      const fromColumnId = state.activeColumnId!
      const toColumnId = state.currentColumnId!
      const fromIndex = state.activeIndex
      const toIndex = event.cancelled ? state.activeIndex : state.currentIndex
      const item = state.activeItem!

      if (!event.cancelled) {
        if (fromColumnId !== toColumnId || fromIndex !== state.currentIndex) {
          callbacksRef.current.onItemMove({
            item,
            fromColumn: fromColumnId,
            toColumn: toColumnId,
            fromIndex,
            toIndex: state.currentIndex,
          })
        }
      }

      callbacksRef.current.onDragEnd?.(item, event.cancelled)

      dragStateRef.current = {
        isDragging: false,
        activeItem: null,
        activeItemId: null,
        activeColumnId: null,
        activeIndex: -1,
        currentColumnId: null,
        currentIndex: -1,
        activeItemHeight: 0,
      }
      itemRectsRef.current.clear()
      columnRectsRef.current.clear()

      // Call onAfterDragEnd hook after all cleanup
      callbacksRef.current.onAfterDragEnd?.(item, event.cancelled, fromColumnId, toColumnId, fromIndex, toIndex)

      notifySubscribers()
    })
  }, [itemGap, animationDuration, placeholderOpacity, indicatorColor, notifySubscribers])

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

      if (columnId === state.activeColumnId && columnId === state.currentColumnId) {
        // Same column: items shift based on position relative to active and current index
        if (i >= state.currentIndex && i < state.activeIndex) {
          translateY = state.activeItemHeight + gap
        } else if (i <= state.currentIndex && i > state.activeIndex) {
          translateY = -(state.activeItemHeight + gap)
        }
      } else if (columnId === state.activeColumnId) {
        // Source column but dragging to different column:
        // Don't shift items - placeholder keeps the space
        translateY = 0
      } else if (columnId === state.currentColumnId) {
        // Target column (different from source): items shift down to make room
        if (i >= state.currentIndex) {
          translateY = state.activeItemHeight + gap
        }
      }

      el.style.transform = translateY !== 0 ? `translate3d(0, ${translateY}px, 0)` : ''
    }
  }
}

function createPlaceholder(
  element: HTMLElement,
  opacity: number,
  placeholderRef: MutableRefObject<HTMLElement | null>
): void {
  // Create a clone as placeholder
  const placeholder = element.cloneNode(true) as HTMLElement
  placeholder.setAttribute('data-dnd-placeholder', '')
  placeholder.style.opacity = String(opacity)
  placeholder.style.pointerEvents = 'none'
  placeholder.style.position = 'absolute'
  placeholder.style.top = '0'
  placeholder.style.left = '0'
  placeholder.style.right = '0'
  placeholder.style.zIndex = '1'
  placeholder.style.transform = 'none'

  // Make the original invisible but keep space
  element.style.opacity = '0'
  element.setAttribute('data-dnd-original', '')

  // Insert placeholder before the element
  element.parentElement?.insertBefore(placeholder, element)

  placeholderRef.current = placeholder
}

function createDropIndicator(
  _height: number,
  _color: IndicatorColor,
  _dropIndicatorRef: MutableRefObject<HTMLElement | null>
): void {
  // We now use CSS-based indicators via data attributes, no DOM element needed
}

function updateDropIndicator<TColumn, TItem>(
  state: DragState<TItem>,
  _gap: number,
  columns: TColumn[],
  extractors: {
    columnKeyExtractor: (c: TColumn) => string
    itemKeyExtractor: (i: TItem) => string
    getColumnItems: (c: TColumn) => TItem[]
  },
  columnElements: Map<string, HTMLElement>,
  _itemRects: Map<string, DOMRect>,
  _dropIndicatorRef: MutableRefObject<HTMLElement | null>
): void {
  const { columnKeyExtractor, itemKeyExtractor, getColumnItems } = extractors

  // Clear all existing drop indicators
  for (const [, colEl] of columnElements) {
    const items = colEl.querySelectorAll('[data-dnd-board-item]')
    items.forEach(item => {
      item.removeAttribute('data-dnd-drop-before')
      item.removeAttribute('data-dnd-drop-after')
    })
    colEl.removeAttribute('data-dnd-drop-empty')
  }

  const columnEl = columnElements.get(state.currentColumnId!)
  if (!columnEl) return

  // Find the column
  const column = columns.find(c => columnKeyExtractor(c) === state.currentColumnId)
  if (!column) return

  const columnItems = getColumnItems(column)

  // Count visible items (excluding the dragged item if in same column)
  let visibleItems: Array<{ id: string; index: number }> = []
  for (let i = 0; i < columnItems.length; i++) {
    const itemId = itemKeyExtractor(columnItems[i]!)
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
    const firstItem = columnEl.querySelector(`[data-dnd-item-id="${visibleItems[0]!.id}"]`)
    if (firstItem) {
      firstItem.setAttribute('data-dnd-drop-before', '')
    }
  } else if (state.currentIndex >= visibleItems.length) {
    // Dropping at the end - show indicator AFTER last visible item
    const lastItem = columnEl.querySelector(`[data-dnd-item-id="${visibleItems[visibleItems.length - 1]!.id}"]`)
    if (lastItem) {
      lastItem.setAttribute('data-dnd-drop-after', '')
    }
  } else {
    // Dropping in the middle - show indicator BEFORE the item at currentIndex
    const targetItem = columnEl.querySelector(`[data-dnd-item-id="${visibleItems[state.currentIndex]!.id}"]`)
    if (targetItem) {
      targetItem.setAttribute('data-dnd-drop-before', '')
    }
  }
}

function cleanupPlaceholder(
  placeholderRef: MutableRefObject<HTMLElement | null>
): void {
  if (placeholderRef.current) {
    placeholderRef.current.remove()
    placeholderRef.current = null
  }
}

function cleanupDropIndicator(
  _dropIndicatorRef: MutableRefObject<HTMLElement | null>
): void {
  // Clean up CSS-based indicators
  document.querySelectorAll('[data-dnd-drop-before]').forEach(el => el.removeAttribute('data-dnd-drop-before'))
  document.querySelectorAll('[data-dnd-drop-after]').forEach(el => el.removeAttribute('data-dnd-drop-after'))
  document.querySelectorAll('[data-dnd-drop-empty]').forEach(el => el.removeAttribute('data-dnd-drop-empty'))
}
