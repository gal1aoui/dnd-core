# React Board DnD Demo

A complete Kanban board demo using `@agallaoui/board-dnd` with React 18.

## Getting Started

From the monorepo root:

```bash
npm install
npm run build:core && npm run build:board
npm run dev:react
```

Or from this directory:

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`.

## Features

- Drag task cards between columns
- Drop indicators with pulse animation
- Ghost effect on dragged items
- Drag overlay follows cursor
- Same-column reordering with adjusted indices
- Responsive layout

## Project Structure

```
src/
  App.tsx                             # Root component
  main.tsx                            # Entry point
  styles.css                          # Global styles
  types/
    board.types.ts                    # TypeScript interfaces (Task, Column)
  data/
    initialData.ts                    # Sample board data
  hooks/
    useBoard.ts                       # Board state management hook
  components/
    Board/
      Board.tsx                       # BoardProvider + columns + DragOverlay
    Column/
      BoardColumn.tsx                 # Drop zone with indicator positioning
    Ticket/
      TicketCard.tsx                  # Draggable task card (useBoardItem)
      TicketOverlay.tsx               # Card shown during drag
      PriorityBadge.tsx               # Priority label component
```

---

## How to Use `@agallaoui/board-dnd` in React

This demo shows how to use the **hooks API** for full control. There's also a **pre-built components** option for faster setup.

### Option A: Pre-built Components (Fastest Setup)

```tsx
import { Board } from '@agallaoui/board-dnd/react/components';

function App() {
  const [cols, setCols] = useState(columns);

  const handleDrop = ({ fromColumnId, fromIndex, toColumnId, toIndex }) => {
    setCols(prev => {
      const next = prev.map(c => ({ ...c, items: [...c.items] }));
      const source = next.find(c => c.id === fromColumnId)!;
      const target = next.find(c => c.id === toColumnId)!;
      const [item] = source.items.splice(fromIndex, 1);
      target.items.splice(toIndex, 0, item);
      return next;
    });
  };

  return (
    <Board
      columns={cols}
      onDrop={handleDrop}
      renderItem={(task) => <div>{task.title}</div>}
      renderColumnHeader={(col) => <h3>{col.data.title}</h3>}
      renderOverlay={(item) => <div className="overlay">{item.data.title}</div>}
    />
  );
}
```

### Option B: Hooks API (Full Control) - Used in This Demo

#### 1. Define your types

```tsx
// types/board.types.ts
export interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
}

export interface Column {
  id: string;
  title: string;
  items: Task[];
}
```

#### 2. Create a state management hook

```tsx
// hooks/useBoard.ts
import { useState, useCallback } from 'react';
import type { BoardDropResult } from '@agallaoui/board-dnd/react';

export function useBoard(initialData: Column[]) {
  const [columns, setColumns] = useState<Column[]>(initialData);

  const handleDrop = useCallback(
    ({ fromColumnId, fromIndex, toColumnId, toIndex }: BoardDropResult<Task>) => {
      setColumns(prev => {
        const next = prev.map(c => ({ ...c, items: [...c.items] }));
        const source = next.find(c => c.id === fromColumnId)!;
        const target = next.find(c => c.id === toColumnId)!;
        const [item] = source.items.splice(fromIndex, 1);
        target.items.splice(toIndex, 0, item);
        return next;
      });
    },
    []
  );

  return { columns, handleDrop };
}
```

#### 3. Wrap your board with `BoardProvider` + `DragOverlay`

```tsx
// components/Board/Board.tsx
import { BoardProvider, DragOverlay, type BoardDropResult } from '@agallaoui/board-dnd/react';

export function Board({ columns, onDrop }) {
  return (
    <BoardProvider onDrop={onDrop}>
      <div className="board">
        {columns.map(col => (
          <BoardColumn key={col.id} column={col} />
        ))}
      </div>

      <DragOverlay>
        {(draggedItem) => <TicketOverlay task={draggedItem.data} />}
      </DragOverlay>
    </BoardProvider>
  );
}
```

#### 4. Create a column with drop zone + indicator

```tsx
// components/Column/BoardColumn.tsx
import React from 'react';
import { useBoardColumn, useBoardState, DropIndicator } from '@agallaoui/board-dnd/react';

export function BoardColumn({ column }) {
  const { ref, itemsContainerRef, isOver, dropIndicator } = useBoardColumn({
    id: column.id,
    data: { title: column.title },
  });

  const boardState = useBoardState();
  const isDraggingFromHere = boardState.sourceColumnId === column.id;
  const draggedItemId = boardState.draggedItem?.id;

  // Adjust insert index for same-column drags
  const getAdjustedIndex = (insertIndex: number) => {
    if (!isDraggingFromHere) return insertIndex;
    const draggedIdx = column.items.findIndex(i => i.id === draggedItemId);
    return draggedIdx !== -1 && insertIndex > draggedIdx
      ? insertIndex + 1
      : insertIndex;
  };

  const adjustedIndex = dropIndicator
    ? getAdjustedIndex(dropIndicator.insertIndex)
    : null;

  return (
    <div ref={ref} className={`column ${isOver ? 'over' : ''}`}>
      <h2>{column.title}</h2>
      <div ref={itemsContainerRef} className="column-items">
        {column.items.map((task, i) => (
          <React.Fragment key={task.id}>
            {adjustedIndex === i && task.id !== draggedItemId && (
              <DropIndicator />
            )}
            <TaskCard task={task} columnId={column.id} index={i} />
          </React.Fragment>
        ))}
        {adjustedIndex === column.items.length && <DropIndicator />}
      </div>
    </div>
  );
}
```

#### 5. Create a draggable item

```tsx
// components/Ticket/TicketCard.tsx
import { useBoardItem } from '@agallaoui/board-dnd/react';

export function TicketCard({ task, columnId, index }) {
  const { ref, isDragging, style } = useBoardItem({
    id: task.id,
    data: task,
    columnId,
    index,
  });

  return (
    <div ref={ref} style={style} className={`task-card ${isDragging ? 'dragging' : ''}`}>
      <span>{task.title}</span>
      <p>{task.description}</p>
    </div>
  );
}
```

#### 6. Wire it all together

```tsx
// App.tsx
export default function App() {
  const { columns, handleDrop } = useBoard(initialColumns);

  return (
    <div className="app">
      <Board columns={columns} onDrop={handleDrop} />
    </div>
  );
}
```

---

## Hooks Reference

| Hook | Returns | Description |
|---|---|---|
| `useBoardColumn({ id, data })` | `{ ref, itemsContainerRef, isOver, dropIndicator }` | Register a column drop zone |
| `useBoardItem({ id, data, columnId, index })` | `{ ref, isDragging, style }` | Register a draggable item |
| `useBoardState()` | `BoardDragState` | Subscribe to drag state |
| `useBoardSettings()` | `{ settings, updateSettings, resetSettings }` | Access board settings |

## Components Reference

| Component | Props | Description |
|---|---|---|
| `BoardProvider` | `onDrop, onDragStart?, onDragOver?, onDragCancel?` | Context provider |
| `DragOverlay` | `children: (item) => ReactNode, className?, wrapperClassName?` | Overlay following cursor |
| `DropIndicator` | `height?, className?, render?` | Insertion point indicator |
| `BoardSettingsProvider` | `initialSettings?, storageKey?, onSettingsChange?` | Settings persistence |

## Customization

### CSS Custom Properties

```css
:root {
  --board-dnd-indicator-color: #3b82f6;
  --board-dnd-overlay-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  --board-dnd-transition-duration: 200ms;
}
```

### Custom Drop Indicator

```tsx
<DropIndicator
  render={({ columnId, insertIndex }) => (
    <div className="my-custom-indicator">
      <div className="dot" />
      <div className="line" />
      <div className="dot" />
    </div>
  )}
/>
```

### Settings Provider

```tsx
import { BoardSettingsProvider } from '@agallaoui/board-dnd/react';

<BoardSettingsProvider
  storageKey="my-board-prefs"
  initialSettings={{ ghostOpacity: 0.3, indicatorColor: '#10b981' }}
>
  <BoardProvider onDrop={handleDrop}>
    {/* your board */}
  </BoardProvider>
</BoardSettingsProvider>
```

## License

MIT
