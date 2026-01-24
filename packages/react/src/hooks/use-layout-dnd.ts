/**
 * useLayoutDnd - React hook for flex-based widget layout drag and drop
 *
 * ZERO RE-RENDERS DURING DRAG: All drag state is stored in refs
 * and DOM is manipulated directly. React state only updates on drop.
 */

import { useRef, useCallback, useEffect, useSyncExternalStore, type RefObject } from 'react'
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

export interface UseLayoutDndOptions<T> {
  items: T[]
  keyExtractor: (item: T) => string
  onReorder: (items: T[]) => void
  onDragStart?: (item: T) => void
  onDragEnd?: (item: T, cancelled: boolean) => void
  handle?: string
  disabled?: boolean
  animationDuration?: number
}

export interface LayoutItemProps {
  ref: (element: HTMLElement | null) => void
  'data-dnd-layout-item': string
  'data-dnd-item-id': string
}

export interface UseLayoutDndReturn<T> {
  containerRef: RefObject<HTMLElement>
  getItemProps: (item: T, index: number) => LayoutItemProps
  isDragging: boolean
  activeId: string | null
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

/**
 * High-performance layout DnD hook with zero re-renders during drag
 */
export function useLayoutDnd<T>(
  options: UseLayoutDndOptions<T>
): UseLayoutDndReturn<T> {
  const {
    items,
    keyExtractor,
    onReorder,
    onDragStart,
    onDragEnd,
    handle,
    disabled = false,
    animationDuration = 200,
  } = options

  const containerRef = useRef<HTMLElement>(null)
  const engineRef = useRef<DragEngine | null>(null)
  const itemElementsRef = useRef<Map<string, HTMLElement>>(new Map())
  const itemPositionsRef = useRef<Map<string, ItemPosition>>(new Map())
  const cleanupFnsRef = useRef<Map<string, CleanupFn>>(new Map())

  // Mutable drag state - NO REACT STATE during drag
  const dragStateRef = useRef<DragState<T>>({
    isDragging: false,
    activeItem: null,
    activeId: null,
    activeIndex: -1,
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

  const callbacksRef = useRef({ onDragStart, onDragEnd, onReorder })
  callbacksRef.current = { onDragStart, onDragEnd, onReorder }

  const itemsRef = useRef(items)
  itemsRef.current = items

  const keyExtractorRef = useRef(keyExtractor)
  keyExtractorRef.current = keyExtractor

  useEffect(() => {
    const engine = engineRef.current
    if (!engine) return

    engine.on('onDragStart', (event: DragStartEvent) => {
      const currentItems = itemsRef.current
      const currentKeyExtractor = keyExtractorRef.current
      const item = event.data as T
      const index = currentItems.findIndex(i => currentKeyExtractor(i) === event.draggableId)

      // Cache positions at drag start
      itemPositionsRef.current.clear()
      for (const [id, el] of itemElementsRef.current) {
        const rect = el.getBoundingClientRect()
        itemPositionsRef.current.set(id, {
          x: rect.left,
          y: rect.top,
          width: rect.width,
          height: rect.height,
        })
      }

      dragStateRef.current = {
        isDragging: true,
        activeItem: item,
        activeId: event.draggableId,
        activeIndex: index,
        currentIndex: index,
      }

      const activeEl = itemElementsRef.current.get(event.draggableId)
      if (activeEl) {
        activeEl.style.zIndex = '9999'
        activeEl.style.position = 'relative'
        activeEl.style.transition = 'none'
      }

      callbacksRef.current.onDragStart?.(item)
    })

    engine.on('onDragMove', (event: DragMoveEvent) => {
      const state = dragStateRef.current
      if (!state.isDragging || !state.activeId) return

      const activeEl = itemElementsRef.current.get(state.activeId)
      if (activeEl) {
        activeEl.style.transform = `translate3d(${event.delta.x}px, ${event.delta.y}px, 0)`
      }

      // Find closest item
      const newIndex = findClosestIndex(
        event.position,
        itemsRef.current,
        keyExtractorRef.current,
        itemPositionsRef.current,
        state.activeIndex
      )

      if (newIndex !== state.currentIndex) {
        state.currentIndex = newIndex
        updatePositions(
          state,
          animationDuration,
          itemsRef.current,
          keyExtractorRef.current,
          itemElementsRef.current,
          itemPositionsRef.current
        )
      }
    })

    engine.on('onDragEnd', (event: DragEndEvent) => {
      const state = dragStateRef.current
      if (!state.isDragging) return

      const currentItems = itemsRef.current
      const fromIndex = state.activeIndex
      const toIndex = state.currentIndex

      // Reset all styles
      for (const [, el] of itemElementsRef.current) {
        el.style.transform = ''
        el.style.zIndex = ''
        el.style.position = ''
        el.style.transition = `transform ${animationDuration}ms cubic-bezier(0.2, 0, 0, 1)`
      }

      if (fromIndex !== toIndex && !event.cancelled) {
        const newItems = [...currentItems]
        const [movedItem] = newItems.splice(fromIndex, 1)
        newItems.splice(toIndex, 0, movedItem as T)
        callbacksRef.current.onReorder(newItems)
      }

      callbacksRef.current.onDragEnd?.(state.activeItem!, event.cancelled)

      dragStateRef.current = {
        isDragging: false,
        activeItem: null,
        activeId: null,
        activeIndex: -1,
        currentIndex: -1,
      }
      itemPositionsRef.current.clear()
      notifySubscribers()
    })
  }, [animationDuration, notifySubscribers])

  // Register items
  useEffect(() => {
    const engine = engineRef.current
    if (!engine) return

    for (const cleanup of cleanupFnsRef.current.values()) {
      cleanup()
    }
    cleanupFnsRef.current.clear()

    for (const item of items) {
      const id = keyExtractor(item)
      const element = itemElementsRef.current.get(id)

      if (element) {
        element.style.transition = `transform ${animationDuration}ms cubic-bezier(0.2, 0, 0, 1)`

        const cleanup = engine.register(element, {
          id,
          disabled,
          handle,
          data: item,
        })
        cleanupFnsRef.current.set(id, cleanup)
      }
    }

    return () => {
      for (const cleanup of cleanupFnsRef.current.values()) {
        cleanup()
      }
      cleanupFnsRef.current.clear()
    }
  }, [items, keyExtractor, disabled, handle, animationDuration])

  const getItemProps = useCallback(
    (item: T, _index: number): LayoutItemProps => {
      const id = keyExtractor(item)

      return {
        ref: (element: HTMLElement | null) => {
          if (element) {
            itemElementsRef.current.set(id, element)
          } else {
            itemElementsRef.current.delete(id)
          }
        },
        'data-dnd-layout-item': '',
        'data-dnd-item-id': id,
      }
    },
    [keyExtractor]
  )

  return {
    containerRef,
    getItemProps,
    isDragging: dragStateRef.current.isDragging,
    activeId: dragStateRef.current.activeId,
  }
}

// Helper functions

function findClosestIndex<T>(
  position: Position,
  items: T[],
  keyExtractor: (item: T) => string,
  itemPositions: Map<string, ItemPosition>,
  activeIndex: number
): number {
  let closestIndex = activeIndex
  let closestDistance = Infinity

  for (let i = 0; i < items.length; i++) {
    if (i === activeIndex) continue

    const itemId = keyExtractor(items[i]!)
    const pos = itemPositions.get(itemId)

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

function updatePositions<T>(
  state: DragState<T>,
  animationDuration: number,
  items: T[],
  keyExtractor: (item: T) => string,
  itemElements: Map<string, HTMLElement>,
  itemPositions: Map<string, ItemPosition>
): void {
  const { activeId, activeIndex, currentIndex } = state

  for (let i = 0; i < items.length; i++) {
    const item = items[i]!
    const itemId = keyExtractor(item)
    const el = itemElements.get(itemId)

    if (!el || itemId === activeId) continue

    el.style.transition = `transform ${animationDuration}ms cubic-bezier(0.2, 0, 0, 1)`

    const currentPos = itemPositions.get(itemId)
    if (!currentPos) continue

    // Calculate target position for visual swap
    let targetIndex = i

    if (i === currentIndex) {
      // This item is at the target position, swap with active
      targetIndex = activeIndex
    } else if (i > activeIndex && i <= currentIndex) {
      // Items shift left/up
      targetIndex = i - 1
    } else if (i < activeIndex && i >= currentIndex) {
      // Items shift right/down
      targetIndex = i + 1
    }

    if (targetIndex !== i) {
      const targetItem = items[targetIndex]
      if (targetItem) {
        const targetPos = itemPositions.get(keyExtractor(targetItem))
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
