/**
 * Pointer sensor - unified mouse and touch handling
 */

import type { Position, DraggableConfig } from '../types'

export interface PointerSensorOptions {
  delay?: number
  distance?: number
  onStart: (position: Position, event: PointerEvent) => void
  onMove: (position: Position, event: PointerEvent) => void
  onEnd: (position: Position, event: PointerEvent) => void
  onCancel: () => void
}

export interface PointerSensor {
  attach(element: HTMLElement, config: DraggableConfig): () => void
  isActive(): boolean
  cancel(): void
  destroy(): void
}

export function createPointerSensor(options: PointerSensorOptions): PointerSensor {
  const { delay = 0, distance = 0, onStart, onMove, onEnd, onCancel } = options

  let isActive = false
  let isPending = false
  let startPosition: Position | null = null
  let delayTimeout: ReturnType<typeof setTimeout> | null = null
  let currentElement: HTMLElement | null = null
  let cleanupFns: (() => void)[] = []

  function getPosition(event: PointerEvent): Position {
    return {
      x: event.clientX,
      y: event.clientY,
    }
  }

  function getDistance(a: Position, b: Position): number {
    return Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2))
  }

  function clearDelayTimeout() {
    if (delayTimeout) {
      clearTimeout(delayTimeout)
      delayTimeout = null
    }
  }

  function handlePointerDown(event: PointerEvent) {
    // Only handle primary button (left click / touch)
    if (event.button !== 0) return

    // Ignore if already active
    if (isActive || isPending) return

    // Store initial position
    startPosition = getPosition(event)
    isPending = true

    // Capture pointer for reliable tracking
    currentElement?.setPointerCapture(event.pointerId)

    // Bind move/up handlers to document for reliable tracking
    const doc = currentElement?.ownerDocument ?? document

    function handlePointerMove(e: PointerEvent) {
      if (!startPosition) return

      const currentPosition = getPosition(e)
      const dist = getDistance(startPosition, currentPosition)

      if (isPending) {
        // Check if we've moved past the distance threshold
        if (dist >= distance) {
          clearDelayTimeout()
          isPending = false
          isActive = true
          onStart(startPosition, e)
          onMove(currentPosition, e)
        }
      } else if (isActive) {
        onMove(currentPosition, e)
      }
    }

    function handlePointerUp(e: PointerEvent) {
      const position = getPosition(e)

      clearDelayTimeout()

      if (isActive) {
        onEnd(position, e)
      }

      cleanup()
    }

    function handlePointerCancel() {
      clearDelayTimeout()

      if (isActive) {
        onCancel()
      }

      cleanup()
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        clearDelayTimeout()
        if (isActive) {
          onCancel()
        }
        cleanup()
      }
    }

    function cleanup() {
      isPending = false
      isActive = false
      startPosition = null

      doc.removeEventListener('pointermove', handlePointerMove)
      doc.removeEventListener('pointerup', handlePointerUp)
      doc.removeEventListener('pointercancel', handlePointerCancel)
      doc.removeEventListener('keydown', handleKeyDown)

      if (currentElement && event.pointerId) {
        try {
          currentElement.releasePointerCapture(event.pointerId)
        } catch {
          // Ignore - pointer may have already been released
        }
      }
    }

    doc.addEventListener('pointermove', handlePointerMove)
    doc.addEventListener('pointerup', handlePointerUp)
    doc.addEventListener('pointercancel', handlePointerCancel)
    doc.addEventListener('keydown', handleKeyDown)

    // If delay is set, wait before activating
    if (delay > 0 && distance === 0) {
      delayTimeout = setTimeout(() => {
        if (isPending && startPosition) {
          isPending = false
          isActive = true
          onStart(startPosition, event)
        }
      }, delay)
    } else if (distance === 0) {
      // No delay or distance, start immediately
      isPending = false
      isActive = true
      onStart(startPosition, event)
    }

    // Prevent default to avoid text selection
    event.preventDefault()
  }

  function attach(element: HTMLElement, config: DraggableConfig): () => void {
    currentElement = element

    const handleSelector = config.handle
    const handleElement = handleSelector
      ? element.querySelector<HTMLElement>(handleSelector)
      : element

    if (!handleElement) {
      console.warn(`DnD: Handle selector "${handleSelector}" not found in element`)
      return () => {}
    }

    // Set touch-action to prevent browser gestures
    handleElement.style.touchAction = 'none'

    handleElement.addEventListener('pointerdown', handlePointerDown)

    const cleanup = () => {
      handleElement.removeEventListener('pointerdown', handlePointerDown)
      handleElement.style.touchAction = ''
    }

    cleanupFns.push(cleanup)
    return cleanup
  }

  function cancel() {
    clearDelayTimeout()
    if (isActive) {
      onCancel()
    }
    isActive = false
    isPending = false
    startPosition = null
  }

  function destroy() {
    cancel()
    for (const fn of cleanupFns) {
      fn()
    }
    cleanupFns = []
    currentElement = null
  }

  return {
    attach,
    isActive: () => isActive,
    cancel,
    destroy,
  }
}
