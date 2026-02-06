/**
 * Task/Ticket data structure for the Kanban board
 */
export interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
}

/**
 * Column data structure
 */
export interface Column {
  id: string;
  title: string;
  items: Task[];
}

/**
 * Priority configuration for styling
 */
export interface PriorityConfig {
  bg: string;
  text: string;
}

export type PriorityColors = Record<Task['priority'], PriorityConfig>;
