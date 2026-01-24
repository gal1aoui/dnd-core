/**
 * State machine for drag operations
 */

import type { DragState, ActiveDrag, Position, DraggableId } from './types'

export interface DragStateData {
  state: DragState
  active: ActiveDrag | null
  overId: string | null
  pendingStart: {
    draggableId: DraggableId
    element: HTMLElement
    startPosition: Position
    startTime: number
  } | null
}

export interface StateMachine {
  getState(): DragStateData
  canTransition(to: DragState): boolean
  transition(to: DragState, data?: Partial<DragStateData>): void
  reset(): void
  subscribe(callback: (state: DragStateData) => void): () => void
}

const VALID_TRANSITIONS: Record<DragState, DragState[]> = {
  idle: ['pending'],
  pending: ['idle', 'dragging'],
  dragging: ['dropping', 'idle'],
  dropping: ['idle'],
}

export function createStateMachine(): StateMachine {
  let currentState: DragStateData = {
    state: 'idle',
    active: null,
    overId: null,
    pendingStart: null,
  }

  const subscribers = new Set<(state: DragStateData) => void>()

  function notify() {
    for (const callback of subscribers) {
      callback(currentState)
    }
  }

  return {
    getState() {
      return currentState
    },

    canTransition(to: DragState) {
      return VALID_TRANSITIONS[currentState.state].includes(to)
    },

    transition(to: DragState, data?: Partial<DragStateData>) {
      if (!this.canTransition(to)) {
        console.warn(
          `Invalid state transition: ${currentState.state} -> ${to}`
        )
        return
      }

      currentState = {
        ...currentState,
        ...data,
        state: to,
      }

      notify()
    },

    reset() {
      currentState = {
        state: 'idle',
        active: null,
        overId: null,
        pendingStart: null,
      }
      notify()
    },

    subscribe(callback: (state: DragStateData) => void) {
      subscribers.add(callback)
      return () => {
        subscribers.delete(callback)
      }
    },
  }
}
