/**
 * useVerticalDnd - React hook for vertical sortable lists
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
  type Rect,
  getDropIndex,
  getRect,
} from '@agal1aoui/dnd-core'

export interface UseVerticalDndOptions<T> {
  items: T[]
  keyExtractor: (item: T) => string
  onReorder: (items: T[], fromIndex: number, toIndex: number) => void
  onDragStart?: (item: T) => void
  onDragEnd?: (item: T, cancelled: boolean) => void
  /** Called before drag starts. Return false to prevent drag. */
  onBeforeDragStart?: (item: T, element: HTMLElement) => boolean | void
  /** Called after drag ends and all cleanup is complete */
  onAfterDragEnd?: (item: T, cancelled: boolean, fromIndex: number, toIndex: number) => void
  handle?: string
  disabled?: boolean
  gap?: number
  animationDuration?: number
  /** Highlight the target item where the dragged item will be placed (default: false) */
  highlightDropTarget?: boolean
  /** Custom scroll container element for auto-scroll (default: window) */
  scrollContainer?: HTMLElement | Window
}

export interface VerticalItemProps {
  ref: (element: HTMLElement | null) => void
  'data-dnd-sortable-item': string
  'data-dnd-item-id': string
}

export interface UseVerticalDndReturn<T, E extends HTMLElement = HTMLElement> {
  /** Ref to attach to the container element */
  containerRef: RefObject<E | null>
  /** Get props to spread on each draggable item */
  getItemProps: (item: T, index: number) => VerticalItemProps
  /** Whether a drag operation is in progress */
  isDragging: boolean
  /** ID of the currently dragged item */
  activeId: string | null
}

interface DragState<T> {
  isDragging: boolean
  activeItem: T | null
  activeId: string | null
  activeIndex: number
  currentIndex: number
}

/**
 * High-performance vertical DnD hook with zero re-renders during drag
 *
 * @template T - The type of items in the list
 * @template E - The type of container element (defaults to HTMLElement)
 */
export function useVerticalDnd<T, E extends HTMLElement = HTMLElement>(
  options: UseVerticalDndOptions<T>
): UseVerticalDndReturn<T, E> {
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
    gap = 0,
    animationDuration = 200,
    highlightDropTarget = false,
    scrollContainer,
  } = options

  const containerRef = useRef<E>(null)
  const engineRef = useRef<DragEngine | null>(null)
  const itemElementsRef = useRef<Map<string, HTMLElement>>(new Map())
  const itemRectsRef = useRef<Map<string, DOMRect>>(new Map())
  const indexedRectsRef = useRef<Map<number, Rect>>(new Map())
  const cleanupFnsRef = useRef<Map<string, CleanupFn>>(new Map())

  // Mutable drag state - NO REACT STATE during drag
  const dragStateRef = useRef<DragState<T>>({
    isDragging: false,
    activeItem: null,
    activeId: null,
    activeIndex: -1,
    currentIndex: -1,
  })

  // Snapshot version for useSyncExternalStore (only changes on drag end)
  const snapshotVersionRef = useRef(0)
  const subscribersRef = useRef<Set<() => void>>(new Set())

  // Subscribe function for useSyncExternalStore
  const subscribe = useCallback((callback: () => void) => {
    subscribersRef.current.add(callback)
    return () => subscribersRef.current.delete(callback)
  }, [])

  // Get snapshot - only updates when drag ends
  const getSnapshot = useCallback(() => snapshotVersionRef.current, [])

  // Force React update (only called on drag end)
  const notifySubscribers = useCallback(() => {
    snapshotVersionRef.current++
    subscribersRef.current.forEach(cb => cb())
  }, [])

  // Use sync external store to trigger re-render only on drag end
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  // Create engine on mount
  useEffect(() => {
    engineRef.current = createDragEngine({
      autoScroll: true,
      scrollContainer: scrollContainer,
    })
    return () => {
      engineRef.current?.destroy()
      engineRef.current = null
    }
  }, [scrollContainer])

  // Stable refs for callbacks to avoid effect deps issues
  const callbacksRef = useRef({ onDragStart, onDragEnd, onReorder, onBeforeDragStart, onAfterDragEnd })
  callbacksRef.current = { onDragStart, onDragEnd, onReorder, onBeforeDragStart, onAfterDragEnd }

  const itemsRef = useRef(items)
  itemsRef.current = items

  const keyExtractorRef = useRef(keyExtractor)
  keyExtractorRef.current = keyExtractor

  const optionsRef = useRef({ highlightDropTarget })
  optionsRef.current = { highlightDropTarget }

  // Set up event handlers - only once
  useEffect(() => {
    const engine = engineRef.current
    if (!engine) return

    engine.on('onDragStart', (event: DragStartEvent) => {
      const currentItems = itemsRef.current
      const currentKeyExtractor = keyExtractorRef.current
      const item = event.data as T
      const index = currentItems.findIndex(i => currentKeyExtractor(i) === event.draggableId)

      // Get the active element
      const activeEl = itemElementsRef.current.get(event.draggableId)
      if (!activeEl) return

      // Call onBeforeDragStart hook - return false to prevent drag
      if (callbacksRef.current.onBeforeDragStart) {
        const result = callbacksRef.current.onBeforeDragStart(item, activeEl)
        if (result === false) {
          return
        }
      }

      // Cache all item rects at drag start (AABB collision optimization)
      itemRectsRef.current.clear()
      indexedRectsRef.current.clear()

      let i = 0
      for (const [id, el] of itemElementsRef.current) {
        const rect = getRect(el)
        itemRectsRef.current.set(id, el.getBoundingClientRect())
        indexedRectsRef.current.set(i, rect)
        i++
      }

      // Update mutable state - NO REACT RE-RENDER
      dragStateRef.current = {
        isDragging: true,
        activeItem: item,
        activeId: event.draggableId,
        activeIndex: index,
        currentIndex: index,
      }

      // Set initial styles via direct DOM manipulation
      activeEl.style.zIndex = '9999'
      activeEl.style.position = 'relative'
      activeEl.style.transition = 'none' // Disable transition during drag
      activeEl.setAttribute('data-dnd-dragging', '')

      callbacksRef.current.onDragStart?.(item)
    })

    engine.on('onDragMove', (event: DragMoveEvent) => {
      const state = dragStateRef.current
      if (!state.isDragging || state.activeId === null) return

      // Move active element with pointer using translate3d for GPU acceleration
      const activeEl = itemElementsRef.current.get(state.activeId)
      if (activeEl) {
        activeEl.style.transform = `translate3d(0, ${event.delta.y}px, 0)`
      }

      // Calculate new drop index using cached rects
      const elements = Array.from(itemElementsRef.current.values())
      const newIndex = getDropIndex(
        event.position,
        elements,
        'vertical',
        state.activeIndex,
        indexedRectsRef.current
      )

      if (newIndex !== state.currentIndex) {
        const currentItems = itemsRef.current
        const currentKeyExtractor = keyExtractorRef.current

        // Remove all drop indicators
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

        // Update sibling positions via direct DOM manipulation
        updateSiblingPositions(state, gap, animationDuration)
      }
    })

    engine.on('onDragEnd', (event: DragEndEvent) => {
      const state = dragStateRef.current
      if (!state.isDragging) return

      const currentItems = itemsRef.current
      const item = state.activeItem as T
      const fromIndex = state.activeIndex
      const toIndex = state.currentIndex

      // Reset all element styles and data attributes
      for (const [_, el] of itemElementsRef.current) {
        el.style.transform = ''
        el.style.zIndex = ''
        el.style.position = ''
        el.style.transition = `transform ${animationDuration}ms cubic-bezier(0.2, 0, 0, 1)`
        el.removeAttribute('data-dnd-dragging')
        el.removeAttribute('data-dnd-drop-target')
        el.removeAttribute('data-dnd-drop-before')
      }

      // Reorder if position changed
      if (fromIndex !== toIndex && fromIndex !== -1 && !event.cancelled) {
        const newItems = [...currentItems]
        const [movedItem] = newItems.splice(fromIndex, 1)
        newItems.splice(toIndex, 0, movedItem as T)
        callbacksRef.current.onReorder(newItems, fromIndex, toIndex)
      }

      callbacksRef.current.onDragEnd?.(item, event.cancelled)

      // Store final indices before resetting state
      const finalFromIndex = fromIndex
      const finalToIndex = event.cancelled ? fromIndex : toIndex

      // Reset drag state
      dragStateRef.current = {
        isDragging: false,
        activeItem: null,
        activeId: null,
        activeIndex: -1,
        currentIndex: -1,
      }
      itemRectsRef.current.clear()
      indexedRectsRef.current.clear()

      // Call onAfterDragEnd hook after all cleanup
      callbacksRef.current.onAfterDragEnd?.(item, event.cancelled, finalFromIndex, finalToIndex)

      // NOW trigger React re-render (only on drop)
      notifySubscribers()
    })
  }, [gap, animationDuration, notifySubscribers])

  // Helper to update sibling positions via DOM
  function updateSiblingPositions(
    state: DragState<T>,
    gap: number,
    animationDuration: number
  ) {
    const { activeId, activeIndex, currentIndex } = state
    let i = 0

    for (const [id, el] of itemElementsRef.current) {
      if (id === activeId) {
        i++
        continue
      }

      const rect = itemRectsRef.current.get(id)
      if (!rect) {
        i++
        continue
      }

      // Enable transition for smooth animation
      el.style.transition = `transform ${animationDuration}ms cubic-bezier(0.2, 0, 0, 1)`

      let translateY = 0

      if (i >= currentIndex && i < activeIndex) {
        // Items between new position and original shift down
        translateY = rect.height + gap
      } else if (i <= currentIndex && i > activeIndex) {
        // Items between original and new position shift up
        translateY = -(rect.height + gap)
      }

      el.style.transform = translateY !== 0 ? `translate3d(0, ${translateY}px, 0)` : ''
      i++
    }
  }

  // Register items with engine
  useEffect(() => {
    const engine = engineRef.current
    if (!engine) return

    // Cleanup old registrations
    for (const cleanup of cleanupFnsRef.current.values()) {
      cleanup()
    }
    cleanupFnsRef.current.clear()

    // Register items
    for (const item of items) {
      const id = keyExtractor(item)
      const element = itemElementsRef.current.get(id)

      if (element) {
        // Set base transition style
        element.style.transition = `transform ${animationDuration}ms cubic-bezier(0.2, 0, 0, 1)`

        const cleanup = engine.register(element, {
          id,
          disabled,
          handle,
          data: item,
          axis: 'y',
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
    (item: T, _index: number): VerticalItemProps => {
      const id = keyExtractor(item)

      return {
        ref: (element: HTMLElement | null) => {
          if (element) {
            itemElementsRef.current.set(id, element)
          } else {
            itemElementsRef.current.delete(id)
          }
        },
        'data-dnd-sortable-item': '',
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
