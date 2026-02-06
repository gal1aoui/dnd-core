import type { Task } from '../../types';
import { PriorityBadge } from './PriorityBadge';

interface TicketOverlayProps {
  task: Task;
}

/**
 * Standalone card component for drag overlay
 * Rendered while dragging to show what's being moved
 */
export function TicketOverlay({ task }: TicketOverlayProps) {
  return (
    <div className="task-card overlay">
      <div className="task-header">
        <span className="task-title">{task.title}</span>
        <PriorityBadge priority={task.priority} />
      </div>
      <p className="task-description">{task.description}</p>
    </div>
  );
}
