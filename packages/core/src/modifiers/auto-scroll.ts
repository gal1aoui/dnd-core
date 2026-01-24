/**
 * Auto-scroll modifier - scrolls container when dragging near edges
 */

import type { Position, Rect } from '../types'
import { getRect } from '../collision/rectangle'

export interface AutoScrollOptions {
  /** Speed of scrolling in pixels per frame */
  speed?: number
  /** Distance from edge to start scrolling */
  threshold?: number
  /** Scroll container element or window */
  container?: HTMLElement | Window
  /** Whether auto-scroll is enabled */
  enabled?: boolean
}

export interface AutoScroller {
  update(pointerPosition: Position): void
  start(): void
  stop(): void
  destroy(): void
}

const DEFAULT_SPEED = 15
const DEFAULT_THRESHOLD = 50

function isWindow(value: unknown): value is Window {
  return value === window || value === globalThis
}

function getScrollableRect(container: HTMLElement | Window): Rect {
  if (isWindow(container)) {
    return {
      top: 0,
      right: window.innerWidth,
      bottom: window.innerHeight,
      left: 0,
      width: window.innerWidth,
      height: window.innerHeight,
    }
  }
  return getRect(container)
}

function getScrollPosition(container: HTMLElement | Window): Position {
  if (isWindow(container)) {
    return {
      x: window.scrollX,
      y: window.scrollY,
    }
  }
  return {
    x: container.scrollLeft,
    y: container.scrollTop,
  }
}

function getMaxScroll(container: HTMLElement | Window): Position {
  if (isWindow(container)) {
    return {
      x: document.documentElement.scrollWidth - window.innerWidth,
      y: document.documentElement.scrollHeight - window.innerHeight,
    }
  }
  return {
    x: container.scrollWidth - container.clientWidth,
    y: container.scrollHeight - container.clientHeight,
  }
}

function setScroll(container: HTMLElement | Window, x: number, y: number): void {
  if (isWindow(container)) {
    window.scrollTo(x, y)
  } else {
    container.scrollLeft = x
    container.scrollTop = y
  }
}

export function createAutoScroller(options: AutoScrollOptions = {}): AutoScroller {
  const {
    speed = DEFAULT_SPEED,
    threshold = DEFAULT_THRESHOLD,
    container = window,
    enabled = true,
  } = options

  let animationFrame: number | null = null
  let lastPointerPosition: Position | null = null
  let isRunning = false

  function getScrollDirection(pointerPosition: Position): Position {
    const rect = getScrollableRect(container)
    const direction: Position = { x: 0, y: 0 }

    // Horizontal scrolling
    if (pointerPosition.x < rect.left + threshold) {
      // Scroll left
      direction.x = -1 * ((threshold - (pointerPosition.x - rect.left)) / threshold)
    } else if (pointerPosition.x > rect.right - threshold) {
      // Scroll right
      direction.x = 1 * ((threshold - (rect.right - pointerPosition.x)) / threshold)
    }

    // Vertical scrolling
    if (pointerPosition.y < rect.top + threshold) {
      // Scroll up
      direction.y = -1 * ((threshold - (pointerPosition.y - rect.top)) / threshold)
    } else if (pointerPosition.y > rect.bottom - threshold) {
      // Scroll down
      direction.y = 1 * ((threshold - (rect.bottom - pointerPosition.y)) / threshold)
    }

    return direction
  }

  function scrollStep() {
    if (!isRunning || !lastPointerPosition || !enabled) {
      animationFrame = null
      return
    }

    const direction = getScrollDirection(lastPointerPosition)

    if (direction.x !== 0 || direction.y !== 0) {
      const currentScroll = getScrollPosition(container)
      const maxScroll = getMaxScroll(container)

      const newX = Math.max(0, Math.min(maxScroll.x, currentScroll.x + direction.x * speed))
      const newY = Math.max(0, Math.min(maxScroll.y, currentScroll.y + direction.y * speed))

      setScroll(container, newX, newY)
    }

    animationFrame = requestAnimationFrame(scrollStep)
  }

  function update(pointerPosition: Position): void {
    lastPointerPosition = pointerPosition

    if (!animationFrame && isRunning && enabled) {
      animationFrame = requestAnimationFrame(scrollStep)
    }
  }

  function start(): void {
    isRunning = true
  }

  function stop(): void {
    isRunning = false
    lastPointerPosition = null

    if (animationFrame) {
      cancelAnimationFrame(animationFrame)
      animationFrame = null
    }
  }

  function destroy(): void {
    stop()
  }

  return {
    update,
    start,
    stop,
    destroy,
  }
}
