/**
 * Pre-built draggable item component
 *
 * A ready-to-use wrapper that handles all DnD wiring for items.
 */

import { type ReactNode, type CSSProperties } from 'react';
import { useBoardItem } from '../index';
import type { DndId } from '@agallaoui/dnd-core';

export interface BoardItemProps<TItem = unknown> {
  /** Unique item ID */
  id: DndId;
  /** Item data passed to callbacks */
  data: TItem;
  /** ID of the column containing this item */
  columnId: DndId;
  /** Index within the column */
  index: number;
  /** Whether dragging is disabled */
  disabled?: boolean;
  /** Content to render - receives isDragging state */
  children: ReactNode | ((props: { isDragging: boolean }) => ReactNode);
  /** Optional className */
  className?: string;
  /** Optional inline styles */
  style?: CSSProperties;
  /** ClassName applied when dragging */
  draggingClassName?: string;
  /** Styles applied when dragging */
  draggingStyle?: CSSProperties;
}

/**
 * Pre-built draggable board item
 *
 * @example
 * ```tsx
 * <BoardItem id={task.id} data={task} columnId={columnId} index={index}>
 *   <TaskCard task={task} />
 * </BoardItem>
 * ```
 *
 * @example With render prop
 * ```tsx
 * <BoardItem id={task.id} data={task} columnId={columnId} index={index}>
 *   {({ isDragging }) => (
 *     <TaskCard task={task} isDragging={isDragging} />
 *   )}
 * </BoardItem>
 * ```
 */
export function BoardItem<TItem = unknown>({
  id,
  data,
  columnId,
  index,
  disabled,
  children,
  className = '',
  style,
  draggingClassName = '',
  draggingStyle,
}: BoardItemProps<TItem>) {
  const { ref, isDragging, style: dndStyle } = useBoardItem({
    id,
    data,
    columnId,
    index,
    disabled,
  });

  const combinedStyle: CSSProperties = {
    ...style,
    ...dndStyle,
    ...(isDragging ? draggingStyle : {}),
  };

  const combinedClassName = `board-dnd-item ${className} ${isDragging ? draggingClassName : ''}`.trim();

  return (
    <div ref={ref} className={combinedClassName} style={combinedStyle}>
      {typeof children === 'function' ? children({ isDragging }) : children}
    </div>
  );
}
