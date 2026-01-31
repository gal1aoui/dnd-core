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
  /** Called before drag starts. Return false to prevent drag. */
  onBeforeDragStart?: (item: T, element: HTMLElement) => boolean | void
  /** Called after drag ends and all cleanup is complete */
  onAfterDragEnd?: (item: T, cancelled: boolean, fromIndex: number, toIndex: number) => void
  handle?: string
  disabled?: boolean
  animationDuration?: number
  /** Highlight the target item where the dragged item will be placed (default: false) */
  highlightDropTarget?: boolean
}

export interface LayoutItemProps {
  ref: (element: HTMLElement | null) => void
  'data-dnd-layout-item': string
  'data-dnd-item-id': string
}

export interface UseLayoutDndReturn<T, E extends HTMLElement = HTMLElement> {
  /** Ref to attach to the container element */
  containerRef: RefObject<E | null>
  /** Get props to spread on each draggable item */
  getItemProps: (item: T, index: number) => LayoutItemProps
  /** Whether a drag operation is in progress */
  isDragging: boolean
  /** ID of the currently dragged item */
  activeId: string | null
  /** Index where the item will be dropped (for styling drop indicator) */
  targetIndex: number | null
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
  index: number
}

/**
 * High-performance layout DnD hook with zero re-renders during drag
 *
 * @template T - The type of items in the layout
 * @template E - The type of container element (defaults to HTMLElement)
 */
export function useLayoutDnd<T, E extends HTMLElement = HTMLElement>(
  options: UseLayoutDndOptions<T>
): UseLayoutDndReturn<T, E> {
  const {
    items,
    keyExtractor,
    onReorder,
    onDragStart,
    onDragEnd,
    onBeforeDragStart,
    onAfterDragEnd,
    handle,
    disabled = false,
    animationDuration = 200,
    highlightDropTarget = false,
  } = options

  const containerRef = useRef<E>(null)
  const engineRef = useRef<DragEngine | null>(null)
  const itemElementsRef = useRef<Map<string, HTMLElement>>(new Map())
  const itemPositionsRef = useRef<Map<string, ItemPosition>>(new Map())
  // Store positions indexed by their visual order for calculating shifts
  const orderedPositionsRef = useRef<ItemPosition[]>([])
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

  const callbacksRef = useRef({ onDragStart, onDragEnd, onReorder, onBeforeDragStart, onAfterDragEnd })
  callbacksRef.current = { onDragStart, onDragEnd, onReorder, onBeforeDragStart, onAfterDragEnd }

  const itemsRef = useRef(items)
  itemsRef.current = items

  const keyExtractorRef = useRef(keyExtractor)
  keyExtractorRef.current = keyExtractor

  const optionsRef = useRef({ highlightDropTarget })
  optionsRef.current = { highlightDropTarget }

  useEffect(() => {
    const engine = engineRef.current
    if (!engine) return

    engine.on('onDragStart', (event: DragStartEvent) => {
      const currentItems = itemsRef.current
      const currentKeyExtractor = keyExtractorRef.current
      const item = event.data as T
      const index = currentItems.findIndex(i => currentKeyExtractor(i) === event.draggableId)

      const activeEl = itemElementsRef.current.get(event.draggableId)
      if (!activeEl) return

      // Call onBeforeDragStart hook - return false to prevent drag
      if (callbacksRef.current.onBeforeDragStart) {
        const result = callbacksRef.current.onBeforeDragStart(item, activeEl)
        if (result === false) {
          return
        }
      }

      // Cache positions at drag start - store both by ID and by index
      itemPositionsRef.current.clear()
      orderedPositionsRef.current = []

      for (let i = 0; i < currentItems.length; i++) {
        const itemId = currentKeyExtractor(currentItems[i]!)
        const el = itemElementsRef.current.get(itemId)
        if (el) {
          const rect = el.getBoundingClientRect()
          const pos: ItemPosition = {
            x: rect.left,
            y: rect.top,
            width: rect.width,
            height: rect.height,
            index: i,
          }
          itemPositionsRef.current.set(itemId, pos)
          orderedPositionsRef.current[i] = pos
        }
      }

      dragStateRef.current = {
        isDragging: true,
        activeItem: item,
        activeId: event.draggableId,
        activeIndex: index,
        currentIndex: index,
      }

      activeEl.style.zIndex = '9999'
      activeEl.style.position = 'relative'
      activeEl.style.transition = 'none'
      activeEl.setAttribute('data-dnd-dragging', '')

      callbacksRef.current.onDragStart?.(item)
    })

    engine.on('onDragMove', (event: DragMoveEvent) => {
      const state = dragStateRef.current
      if (!state.isDragging || !state.activeId) return

      const activeEl = itemElementsRef.current.get(state.activeId)
      if (activeEl) {
        activeEl.style.transform = `translate3d(${event.delta.x}px, ${event.delta.y}px, 0)`
      }

      // Find closest item based on pointer position
      const newIndex = findClosestIndex(
        event.position,
        itemsRef.current,
        keyExtractorRef.current,
        itemPositionsRef.current,
        state.activeIndex
      )

      if (newIndex !== state.currentIndex) {
        const currentItems = itemsRef.current
        const currentKeyExtractor = keyExtractorRef.current

        // Remove previous drop indicators
        for (const [, el] of itemElementsRef.current) {
          el.removeAttribute('data-dnd-drop-target')
          el.removeAttribute('data-dnd-drop-before')
        }

        state.currentIndex = newIndex

        // Add drop indicator to target (optional highlight)
        if (optionsRef.current.highlightDropTarget) {
          const targetId = currentKeyExtractor(currentItems[newIndex]!)
          const targetEl = itemElementsRef.current.get(targetId)
          if (targetEl && targetId !== state.activeId) {
            targetEl.setAttribute('data-dnd-drop-target', '')
          }
        }

        // Add drop placement indicator - shows where item will be inserted
        // The element with data-dnd-drop-before is the one that will come AFTER the dropped item
        const insertBeforeIndex = state.activeIndex < newIndex ? newIndex + 1 : newIndex
        if (insertBeforeIndex < currentItems.length) {
          const beforeId = currentKeyExtractor(currentItems[insertBeforeIndex]!)
          const beforeEl = itemElementsRef.current.get(beforeId)
          if (beforeEl && beforeId !== state.activeId) {
            beforeEl.setAttribute('data-dnd-drop-before', '')
          }
        }

        updatePositions(
          state,
          animationDuration,
          itemsRef.current,
          keyExtractorRef.current,
          itemElementsRef.current,
          orderedPositionsRef.current
        )
      }
    })

    engine.on('onDragEnd', (event: DragEndEvent) => {
      const state = dragStateRef.current
      if (!state.isDragging) return

      const currentItems = itemsRef.current
      const item = state.activeItem!
      const fromIndex = state.activeIndex
      const toIndex = state.currentIndex

      // Reset all styles and remove data attributes
      for (const [, el] of itemElementsRef.current) {
        el.style.transform = ''
        el.style.zIndex = ''
        el.style.position = ''
        el.style.transition = `transform ${animationDuration}ms cubic-bezier(0.2, 0, 0, 1)`
        el.removeAttribute('data-dnd-dragging')
        el.removeAttribute('data-dnd-drop-target')
        el.removeAttribute('data-dnd-drop-before')
      }

      if (fromIndex !== toIndex && !event.cancelled) {
        const newItems = [...currentItems]
        const [movedItem] = newItems.splice(fromIndex, 1)
        newItems.splice(toIndex, 0, movedItem as T)
        callbacksRef.current.onReorder(newItems)
      }

      callbacksRef.current.onDragEnd?.(item, event.cancelled)

      // Store final indices before resetting state
      const finalFromIndex = fromIndex
      const finalToIndex = event.cancelled ? fromIndex : toIndex

      dragStateRef.current = {
        isDragging: false,
        activeItem: null,
        activeId: null,
        activeIndex: -1,
        currentIndex: -1,
      }
      itemPositionsRef.current.clear()
      orderedPositionsRef.current = []

      // Call onAfterDragEnd hook after all cleanup
      callbacksRef.current.onAfterDragEnd?.(item, event.cancelled, finalFromIndex, finalToIndex)

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
    targetIndex: dragStateRef.current.isDragging ? dragStateRef.current.currentIndex : null,
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

/**
 * Update positions using sequential shift approach
 * When dragging from activeIndex to currentIndex:
 * - Items between these indices shift to fill/make space
 * - Each item moves to the position of its neighbor
 */
function updatePositions<T>(
  state: DragState<T>,
  animationDuration: number,
  items: T[],
  keyExtractor: (item: T) => string,
  itemElements: Map<string, HTMLElement>,
  orderedPositions: ItemPosition[]
): void {
  const { activeId, activeIndex, currentIndex } = state

  for (let i = 0; i < items.length; i++) {
    const item = items[i]!
    const itemId = keyExtractor(item)
    const el = itemElements.get(itemId)

    if (!el || itemId === activeId) continue

    el.style.transition = `transform ${animationDuration}ms cubic-bezier(0.2, 0, 0, 1)`

    const currentPos = orderedPositions[i]
    if (!currentPos) continue

    // Determine where this item should visually appear
    let visualIndex = i

    if (activeIndex < currentIndex) {
      // Dragging forward (e.g., from 1 to 4)
      // Items between activeIndex+1 and currentIndex shift backward (left/up)
      if (i > activeIndex && i <= currentIndex) {
        visualIndex = i - 1
      }
    } else if (activeIndex > currentIndex) {
      // Dragging backward (e.g., from 4 to 1)
      // Items between currentIndex and activeIndex-1 shift forward (right/down)
      if (i >= currentIndex && i < activeIndex) {
        visualIndex = i + 1
      }
    }

    if (visualIndex !== i) {
      const targetPos = orderedPositions[visualIndex]
      if (targetPos) {
        const dx = targetPos.x - currentPos.x
        const dy = targetPos.y - currentPos.y
        el.style.transform = `translate3d(${dx}px, ${dy}px, 0)`
      }
    } else {
      el.style.transform = ''
    }
  }
}
