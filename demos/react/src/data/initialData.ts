import type { Column } from '../types';

/**
 * Initial board data with sample tasks
 */
export const initialColumns: Column[] = [
  {
    id: 'todo',
    title: 'To Do',
    items: [
      {
        id: 'task-1',
        title: 'Research DnD libraries',
        description: 'Compare existing solutions and identify gaps',
        priority: 'high',
      },
      {
        id: 'task-2',
        title: 'Design API',
        description: 'Create clean, minimal public API',
        priority: 'high',
      },
      {
        id: 'task-3',
        title: 'Setup monorepo',
        description: 'Configure npm workspaces',
        priority: 'medium',
      },
    ],
  },
  {
    id: 'in-progress',
    title: 'In Progress',
    items: [
      {
        id: 'task-4',
        title: 'Implement core engine',
        description: 'Build pointer event handlers',
        priority: 'high',
      },
      {
        id: 'task-5',
        title: 'Add TypeScript types',
        description: 'Strong typing for all APIs',
        priority: 'medium',
      },
    ],
  },
  {
    id: 'review',
    title: 'Review',
    items: [
      {
        id: 'task-6',
        title: 'Write unit tests',
        description: 'Test core functionality',
        priority: 'medium',
      },
    ],
  },
  {
    id: 'done',
    title: 'Done',
    items: [
      {
        id: 'task-7',
        title: 'Project kickoff',
        description: 'Initial planning complete',
        priority: 'low',
      },
    ],
  },
];

export const priorityColors = {
  low: { bg: '#dcfce7', text: '#166534' },
  medium: { bg: '#fef9c3', text: '#854d0e' },
  high: { bg: '#fee2e2', text: '#991b1b' },
} as const;
