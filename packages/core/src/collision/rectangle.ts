/**
 * Collision detection algorithms
 */

import type { Rect, Position, CollisionInfo, DroppableId } from '../types'

export interface DroppableEntry {
  id: DroppableId
  element: HTMLElement
  data?: unknown
}

/** Get center point of a rectangle */
export function getCenter(rect: Rect): Position {
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  }
}

/** Get bounding rect of an element */
export function getRect(element: HTMLElement): Rect {
  const rect = element.getBoundingClientRect()
  return {
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
    left: rect.left,
    width: rect.width,
    height: rect.height,
  }
}

/** Check if two rectangles intersect */
export function rectsIntersect(a: Rect, b: Rect): boolean {
  return !(
    a.right < b.left ||
    a.left > b.right ||
    a.bottom < b.top ||
    a.top > b.bottom
  )
}

/** Get intersection area of two rectangles */
export function getIntersectionArea(a: Rect, b: Rect): number {
  const xOverlap = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left))
  const yOverlap = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top))
  return xOverlap * yOverlap
}

/** Get distance between two points */
export function getDistance(a: Position, b: Position): number {
  return Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2))
}

/** Get corners of a rectangle */
export function getCorners(rect: Rect): Position[] {
  return [
    { x: rect.left, y: rect.top },
    { x: rect.right, y: rect.top },
    { x: rect.right, y: rect.bottom },
    { x: rect.left, y: rect.bottom },
  ]
}

/**
 * Rectangle intersection collision detection
 * Returns the droppable with the largest intersection area
 */
export function detectRectangleCollision(
  draggableRect: Rect,
  droppables: DroppableEntry[]
): CollisionInfo | null {
  let bestCollision: CollisionInfo | null = null
  let bestArea = 0

  for (const droppable of droppables) {
    const droppableRect = getRect(droppable.element)

    if (rectsIntersect(draggableRect, droppableRect)) {
      const area = getIntersectionArea(draggableRect, droppableRect)

      if (area > bestArea) {
        bestArea = area
        bestCollision = {
          droppableId: droppable.id,
          droppableElement: droppable.element,
          rect: droppableRect,
          data: droppable.data,
        }
      }
    }
  }

  return bestCollision
}

/**
 * Closest center collision detection
 * Returns the droppable whose center is closest to the draggable's center
 */
export function detectClosestCenterCollision(
  draggableRect: Rect,
  droppables: DroppableEntry[]
): CollisionInfo | null {
  const draggableCenter = getCenter(draggableRect)

  let bestCollision: CollisionInfo | null = null
  let bestDistance = Infinity

  for (const droppable of droppables) {
    const droppableRect = getRect(droppable.element)
    const droppableCenter = getCenter(droppableRect)
    const distance = getDistance(draggableCenter, droppableCenter)

    if (distance < bestDistance) {
      bestDistance = distance
      bestCollision = {
        droppableId: droppable.id,
        droppableElement: droppable.element,
        rect: droppableRect,
        data: droppable.data,
      }
    }
  }

  return bestCollision
}

/**
 * Closest corner collision detection
 * Returns the droppable where any corner is closest to any draggable corner
 */
export function detectClosestCornerCollision(
  draggableRect: Rect,
  droppables: DroppableEntry[]
): CollisionInfo | null {
  const draggableCorners = getCorners(draggableRect)

  let bestCollision: CollisionInfo | null = null
  let bestDistance = Infinity

  for (const droppable of droppables) {
    const droppableRect = getRect(droppable.element)
    const droppableCorners = getCorners(droppableRect)

    for (const dc of draggableCorners) {
      for (const drc of droppableCorners) {
        const distance = getDistance(dc, drc)

        if (distance < bestDistance) {
          bestDistance = distance
          bestCollision = {
            droppableId: droppable.id,
            droppableElement: droppable.element,
            rect: droppableRect,
            data: droppable.data,
          }
        }
      }
    }
  }

  return bestCollision
}

/**
 * Point-in-rect collision - checks if a point is inside a rectangle
 */
export function isPointInRect(point: Position, rect: Rect): boolean {
  return (
    point.x >= rect.left &&
    point.x <= rect.right &&
    point.y >= rect.top &&
    point.y <= rect.bottom
  )
}

/**
 * Get drop position within a sortable list
 * Returns the index where the item should be inserted
 */
export function getDropIndex(
  pointerPosition: Position,
  items: HTMLElement[],
  direction: 'vertical' | 'horizontal',
  excludeIndex?: number
): number {
  for (let i = 0; i < items.length; i++) {
    if (i === excludeIndex) continue

    const rect = getRect(items[i]!)
    const center = getCenter(rect)

    if (direction === 'vertical') {
      if (pointerPosition.y < center.y) {
        return excludeIndex !== undefined && i > excludeIndex ? i - 1 : i
      }
    } else {
      if (pointerPosition.x < center.x) {
        return excludeIndex !== undefined && i > excludeIndex ? i - 1 : i
      }
    }
  }

  return items.length - (excludeIndex !== undefined ? 1 : 0)
}
