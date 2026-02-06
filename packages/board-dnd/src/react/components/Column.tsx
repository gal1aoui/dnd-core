/**
 * Pre-built board column component
 *
 * A ready-to-use column that handles all DnD drop zone wiring.
 */

import React, { type ReactNode, type CSSProperties } from 'react';
import { useBoardColumn, useBoardState, DropIndicator, type DropIndicatorRenderProps } from '../index';
import type { DndId } from '@agallaoui/dnd-core';

export interface BoardColumnProps<TItem = unknown, TColumn = unknown> {
  /** Unique column ID */
  id: DndId;
  /** Column data */
  data: TColumn;
  /** Items in this column */
  items: Array<TItem & { id: DndId }>;
  /** Whether dropping is disabled */
  disabled?: boolean;
  /** Render function for each item */
  renderItem: (item: TItem, index: number) => ReactNode;
  /** Custom drop indicator render (optional) */
  renderDropIndicator?: (props: DropIndicatorRenderProps) => ReactNode;
  /** Column header content */
  header?: ReactNode;
  /** Column footer content */
  footer?: ReactNode;
  /** Optional className for the column */
  className?: string;
  /** Optional className for the items container */
  itemsClassName?: string;
  /** Optional inline styles */
  style?: CSSProperties;
  /** ClassName when an item is being dragged over */
  overClassName?: string;
  /** Drop indicator height */
  indicatorHeight?: number;
  /** Drop indicator className */
  indicatorClassName?: string;
}

/**
 * Pre-built board column with drop zone
 *
 * Handles drop indicator positioning automatically, including same-column drags.
 *
 * @example
 * ```tsx
 * <BoardColumn
 *   id={column.id}
 *   data={{ title: column.title }}
 *   items={column.items}
 *   header={<h2>{column.title}</h2>}
 *   renderItem={(item, index) => (
 *     <BoardItem key={item.id} id={item.id} data={item} columnId={column.id} index={index}>
 *       <TaskCard task={item} />
 *     </BoardItem>
 *   )}
 * />
 * ```
 */
export function BoardColumn<TItem = unknown, TColumn = unknown>({
  id,
  data,
  items,
  disabled,
  renderItem,
  renderDropIndicator,
  header,
  footer,
  className = '',
  itemsClassName = '',
  style,
  overClassName = '',
  indicatorHeight,
  indicatorClassName = '',
}: BoardColumnProps<TItem, TColumn>) {
  const { ref, itemsContainerRef, isOver, dropIndicator } = useBoardColumn<TItem, TColumn>({
    id,
    data,
    disabled,
  });
  const boardState = useBoardState<TItem>();

  // Check if we're dragging within the same column
  const isDraggingFromThisColumn = boardState.sourceColumnId === id;
  const draggedItemId = boardState.draggedItem?.id;

  // Calculate the actual insert index for UI rendering
  const getAdjustedInsertIndex = (insertIndex: number): number => {
    if (!isDraggingFromThisColumn || !dropIndicator) return insertIndex;

    // Find the original index of the dragged item
    const draggedOriginalIndex = items.findIndex((item) => item.id === draggedItemId);

    // Adjust the insert index to account for the dragged item still being in the list
    if (draggedOriginalIndex !== -1 && insertIndex > draggedOriginalIndex) {
      return insertIndex + 1;
    }
    return insertIndex;
  };

  const adjustedInsertIndex = dropIndicator ? getAdjustedInsertIndex(dropIndicator.insertIndex) : null;

  const combinedClassName = `board-dnd-column ${className} ${isOver ? overClassName : ''}`.trim();

  const renderIndicator = (insertIndex: number) => {
    if (renderDropIndicator) {
      return renderDropIndicator({ columnId: id, insertIndex });
    }
    return (
      <DropIndicator
        height={indicatorHeight}
        className={indicatorClassName}
        columnId={id}
        insertIndex={insertIndex}
      />
    );
  };

  return (
    <div ref={ref} className={combinedClassName} style={style}>
      {header}
      <div ref={itemsContainerRef} className={`board-dnd-column-items ${itemsClassName}`}>
        {items.map((item, index) => {
          // Don't show indicator at the dragged item's original position
          const showIndicator = adjustedInsertIndex === index && item.id !== draggedItemId;

          return (
            <React.Fragment key={item.id}>
              {showIndicator && renderIndicator(index)}
              {renderItem(item, index)}
            </React.Fragment>
          );
        })}
        {adjustedInsertIndex === items.length && renderIndicator(items.length)}
      </div>
      {footer}
    </div>
  );
}
