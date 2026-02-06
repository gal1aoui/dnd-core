import React from 'react';
import { useBoardColumn, useBoardState, DropIndicator } from '@agallaoui/board-dnd/react';
import type { Column, Task } from '../../types';
import { TicketCard } from '../Ticket';

interface BoardColumnProps {
  column: Column;
}

/**
 * Board column component with drop zone functionality
 * Handles drop indicator positioning for both cross-column and same-column drags
 */
export function BoardColumn({ column }: BoardColumnProps) {
  const { ref, itemsContainerRef, isOver, dropIndicator } = useBoardColumn({
    id: column.id,
    data: { title: column.title },
  });
  const boardState = useBoardState<Task>();

  // Check if we're dragging within the same column
  const isDraggingFromThisColumn = boardState.sourceColumnId === column.id;
  const draggedItemId = boardState.draggedItem?.id;

  // Calculate the actual insert index for UI rendering
  // When dragging within the same column, the engine calculates positions
  // excluding the dragged item, so we need to adjust for display
  const getAdjustedInsertIndex = (insertIndex: number): number => {
    if (!isDraggingFromThisColumn || !dropIndicator) return insertIndex;

    // Find the original index of the dragged item
    const draggedOriginalIndex = column.items.findIndex(
      (item) => item.id === draggedItemId
    );

    // Adjust the insert index to account for the dragged item still being in the list
    if (draggedOriginalIndex !== -1 && insertIndex > draggedOriginalIndex) {
      return insertIndex + 1;
    }
    return insertIndex;
  };

  const adjustedInsertIndex = dropIndicator
    ? getAdjustedInsertIndex(dropIndicator.insertIndex)
    : null;

  return (
    <div ref={ref} className={`column ${isOver ? 'over' : ''}`}>
      <div className="column-header">
        <h2>{column.title}</h2>
        <span className="item-count">{column.items.length}</span>
      </div>
      <div ref={itemsContainerRef} className="column-items">
        {column.items.map((task, index) => {
          // Don't show indicator at the dragged item's original position
          const showIndicator =
            adjustedInsertIndex === index && task.id !== draggedItemId;

          return (
            <React.Fragment key={task.id}>
              {showIndicator && <DropIndicator className="drop-indicator" />}
              <TicketCard task={task} columnId={column.id} index={index} />
            </React.Fragment>
          );
        })}
        {adjustedInsertIndex === column.items.length && (
          <DropIndicator className="drop-indicator" />
        )}
      </div>
    </div>
  );
}
