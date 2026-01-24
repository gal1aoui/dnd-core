/**
 * Keyboard sensor for accessibility
 */

import type { Position } from '../types'

export interface KeyboardSensorOptions {
  /** Step size for arrow key movement in pixels */
  step?: number
  /** Large step size when holding Shift */
  largeStep?: number
  onStart: (element: HTMLElement) => void
  onMove: (delta: Position) => void
  onEnd: () => void
  onCancel: () => void
}

export interface KeyboardSensor {
  attach(element: HTMLElement): () => void
  isActive(): boolean
  cancel(): void
  destroy(): void
}

export function createKeyboardSensor(options: KeyboardSensorOptions): KeyboardSensor {
  const {
    step = 10,
    largeStep = 50,
    onStart,
    onMove,
    onEnd,
    onCancel
  } = options

  let isActive = false
  let currentElement: HTMLElement | null = null
  let cleanupFns: (() => void)[] = []

  function handleKeyDown(event: KeyboardEvent) {
    if (!currentElement) return

    // Start drag with Enter or Space
    if (!isActive && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault()
      isActive = true
      onStart(currentElement)
      return
    }

    if (!isActive) return

    const moveStep = event.shiftKey ? largeStep : step

    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault()
        onMove({ x: 0, y: -moveStep })
        break
      case 'ArrowDown':
        event.preventDefault()
        onMove({ x: 0, y: moveStep })
        break
      case 'ArrowLeft':
        event.preventDefault()
        onMove({ x: -moveStep, y: 0 })
        break
      case 'ArrowRight':
        event.preventDefault()
        onMove({ x: moveStep, y: 0 })
        break
      case 'Enter':
      case ' ':
        event.preventDefault()
        isActive = false
        onEnd()
        break
      case 'Escape':
        event.preventDefault()
        isActive = false
        onCancel()
        break
    }
  }

  function attach(element: HTMLElement): () => void {
    currentElement = element

    // Ensure element is focusable
    if (!element.hasAttribute('tabindex')) {
      element.setAttribute('tabindex', '0')
    }

    element.addEventListener('keydown', handleKeyDown)

    const cleanup = () => {
      element.removeEventListener('keydown', handleKeyDown)
    }

    cleanupFns.push(cleanup)
    return cleanup
  }

  function cancel() {
    if (isActive) {
      onCancel()
    }
    isActive = false
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
