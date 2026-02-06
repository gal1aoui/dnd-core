import type { Task } from '../../types';
import { priorityColors } from '../../data';

interface PriorityBadgeProps {
  priority: Task['priority'];
}

/**
 * Badge component displaying task priority with color coding
 */
export function PriorityBadge({ priority }: PriorityBadgeProps) {
  const { bg, text } = priorityColors[priority];

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        fontSize: '11px',
        fontWeight: 500,
        borderRadius: '9999px',
        backgroundColor: bg,
        color: text,
        textTransform: 'capitalize',
      }}
    >
      {priority}
    </span>
  );
}
