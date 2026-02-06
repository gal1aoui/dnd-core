import { BoardProvider, DragOverlay, type BoardDropResult } from '@agallaoui/board-dnd/react';
import type { Task, Column } from '../../types';
import { BoardColumn } from '../Column';
import { TicketOverlay } from '../Ticket';

interface BoardProps {
  columns: Column[];
  onDrop: (result: BoardDropResult<Task>) => void;
}

/**
 * Main Kanban board component
 * Wraps columns with DnD provider and overlay
 */
export function Board({ columns, onDrop }: BoardProps) {
  return (
    <BoardProvider onDrop={onDrop}>
      <div className="board">
        {columns.map((column) => (
          <BoardColumn key={column.id} column={column} />
        ))}
      </div>

      <DragOverlay>
        {(draggedItem) => (
          <TicketOverlay task={draggedItem.data as Task} />
        )}
      </DragOverlay>
    </BoardProvider>
  );
}
