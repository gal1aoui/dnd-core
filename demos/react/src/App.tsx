import React, { useState, useCallback } from 'react';
import {
  BoardProvider,
  useBoardColumn,
  useBoardItem,
  DragOverlay,
  DropIndicator,
  type BoardDropResult,
} from '@agallaoui/board-dnd/react';

/**
 * Task data structure
 */
interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
}

/**
 * Column data structure
 */
interface Column {
  id: string;
  title: string;
  items: Task[];
}

/**
 * Initial board data
 */
const initialColumns: Column[] = [
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

/**
 * Priority badge component
 */
function PriorityBadge({ priority }: { priority: Task['priority'] }) {
  const colors = {
    low: { bg: '#dcfce7', text: '#166534' },
    medium: { bg: '#fef9c3', text: '#854d0e' },
    high: { bg: '#fee2e2', text: '#991b1b' },
  };

  const { bg, text } = colors[priority];

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

/**
 * Task card component
 */
function TaskCard({
  task,
  columnId,
  index,
}: {
  task: Task;
  columnId: string;
  index: number;
}) {
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

/**
 * Standalone card component for drag overlay
 */
function TaskCardOverlay({ task }: { task: Task }) {
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

/**
 * Board column component
 */
function BoardColumn({
  column,
}: {
  column: Column;
}) {
  const { ref, itemsContainerRef, isOver, dropIndicator } = useBoardColumn({
    id: column.id,
    data: { title: column.title },
  });

  return (
    <div ref={ref} className={`column ${isOver ? 'over' : ''}`}>
      <div className="column-header">
        <h2>{column.title}</h2>
        <span className="item-count">{column.items.length}</span>
      </div>
      <div ref={itemsContainerRef} className="column-items">
        {column.items.map((task, index) => (
          <React.Fragment key={task.id}>
            {dropIndicator?.insertIndex === index && (
              <DropIndicator className="drop-indicator" />
            )}
            <TaskCard
              task={task}
              columnId={column.id}
              index={index}
            />
          </React.Fragment>
        ))}
        {dropIndicator?.insertIndex === column.items.length && (
          <DropIndicator className="drop-indicator" />
        )}
      </div>
    </div>
  );
}

/**
 * Main App component
 */
export default function App() {
  const [columns, setColumns] = useState<Column[]>(initialColumns);

  /**
   * Handle drop event - move item between columns
   */
  const handleDrop = useCallback(
    ({ fromColumnId, fromIndex, toColumnId, toIndex }: BoardDropResult<Task>) => {
      setColumns((prevColumns) => {
        // Clone columns
        const newColumns = prevColumns.map((col) => ({
          ...col,
          items: [...col.items],
        }));

        // Find source and target columns
        const sourceCol = newColumns.find((c) => c.id === fromColumnId);
        const targetCol = newColumns.find((c) => c.id === toColumnId);

        if (!sourceCol || !targetCol) return prevColumns;

        // Remove from source
        const [movedItem] = sourceCol.items.splice(fromIndex, 1);

        // Adjust target index if moving within same column
        let adjustedIndex = toIndex;
        if (fromColumnId === toColumnId && fromIndex < toIndex) {
          adjustedIndex = toIndex;
        }

        // Insert at target
        targetCol.items.splice(adjustedIndex, 0, movedItem);

        return newColumns;
      });
    },
    []
  );

  return (
    <div className="app">
      <header className="app-header">
        <h1>@agallaoui/board-dnd React Demo</h1>
        <p>Drag tasks between columns to reorganize your board</p>
      </header>

      <BoardProvider onDrop={handleDrop}>
        <div className="board">
          {columns.map((column) => (
            <BoardColumn key={column.id} column={column} />
          ))}
        </div>

        <DragOverlay>
          {(draggedItem) => (
            <TaskCardOverlay task={draggedItem.data as Task} />
          )}
        </DragOverlay>
      </BoardProvider>

      <footer className="app-footer">
        <p>
          Built with{' '}
          <a
            href="https://github.com/agallaoui/dnd"
            target="_blank"
            rel="noopener noreferrer"
          >
            @agallaoui/board-dnd
          </a>
        </p>
      </footer>
    </div>
  );
}
