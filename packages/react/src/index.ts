/**
 * @agal1aoui/react-dnd
 * React hooks and components for drag and drop
 */

// Context
export { DndProvider, useDndContext } from './context'
export type { DndContextValue } from './context'

// Hooks
export { useVerticalDnd } from './hooks/use-vertical-dnd'
export type { UseVerticalDndOptions, UseVerticalDndReturn, VerticalItemProps } from './hooks/use-vertical-dnd'

export { useHorizontalDnd } from './hooks/use-horizontal-dnd'
export type { UseHorizontalDndOptions, UseHorizontalDndReturn, HorizontalItemProps } from './hooks/use-horizontal-dnd'

export { useBoardDnd } from './hooks/use-board-dnd'
export type { UseBoardDndOptions, UseBoardDndReturn, BoardColumnProps, BoardItemProps, ItemMoveEvent } from './hooks/use-board-dnd'

export { useLayoutDnd } from './hooks/use-layout-dnd'
export type { UseLayoutDndOptions, UseLayoutDndReturn, LayoutItemProps } from './hooks/use-layout-dnd'

// Re-export core types for convenience
export type {
  Position,
  Rect,
  DragState,
  DraggableId,
  DroppableId,
} from '@agal1aoui/dnd-core'
