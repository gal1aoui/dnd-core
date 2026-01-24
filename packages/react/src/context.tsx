/**
 * DnD Context for React
 */

import { createContext, useContext, useRef, useEffect, type ReactNode } from 'react'
import { createDragEngine, type DragEngine, type DragEngineOptions } from '@agal1aoui/dnd-core'

export interface DndContextValue {
  engine: DragEngine
}

const DndContext = createContext<DndContextValue | null>(null)

export interface DndProviderProps {
  children: ReactNode
  options?: DragEngineOptions
}

/**
 * Provider component for DnD context
 * Wrap your app or a section where you want to enable drag and drop
 */
export function DndProvider({ children, options }: DndProviderProps) {
  const engineRef = useRef<DragEngine | null>(null)

  if (!engineRef.current) {
    engineRef.current = createDragEngine(options)
  }

  useEffect(() => {
    return () => {
      engineRef.current?.destroy()
    }
  }, [])

  return (
    <DndContext.Provider value={{ engine: engineRef.current }}>
      {children}
    </DndContext.Provider>
  )
}

/**
 * Hook to access the DnD context
 */
export function useDndContext(): DndContextValue {
  const context = useContext(DndContext)

  if (!context) {
    throw new Error('useDndContext must be used within a DndProvider')
  }

  return context
}
