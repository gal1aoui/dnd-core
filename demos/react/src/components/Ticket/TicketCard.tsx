import { useBoardItem } from '@agallaoui/board-dnd/react';
import type { Task } from '../../types';
import { PriorityBadge } from './PriorityBadge';

interface TicketCardProps {
  task: Task;
  columnId: string;
  index: number;
}

/**
 * Draggable task card component
 */
export function TicketCard({ task, columnId, index }: TicketCardProps) {
  const { ref, isDragging, style } = useBoardItem({
    id: task.id,
    data: task,
    columnId,
    index,
  });

  return (
    <div
      ref={ref}
      className={`task-card ${isDragging ? 'dragging' : ''}`}
      style={style}
    >
      <div className="task-header">
        <span className="task-title">{task.title}</span>
        <PriorityBadge priority={task.priority} />
      </div>
      <p className="task-description">{task.description}</p>
    </div>
  );
}
