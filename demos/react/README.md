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

## How It Works

### State Management

```tsx
// hooks/useBoard.ts
const { columns, handleDrop } = useBoard(initialColumns);
```

The `useBoard` hook manages column state and handles the `onDrop` callback to move items between columns.

### Board Setup

```tsx
// components/Board/Board.tsx
<BoardProvider onDrop={onDrop}>
  <div className="board">
    {columns.map(col => (
      <BoardColumn key={col.id} column={col} />
    ))}
  </div>
  <DragOverlay>
    {(item) => <TicketOverlay task={item.data} />}
  </DragOverlay>
</BoardProvider>
```

### Column with Drop Indicator

```tsx
// components/Column/BoardColumn.tsx
const { ref, itemsContainerRef, isOver, dropIndicator } = useBoardColumn({
  id: column.id,
  data: { title: column.title },
});
```

### Draggable Items

```tsx
// components/Ticket/TicketCard.tsx
const { ref, isDragging, style } = useBoardItem({
  id: task.id,
  data: task,
  columnId,
  index,
});
```

## Customization

Override CSS custom properties:

```css
:root {
  --color-primary: #3b82f6;
  --board-dnd-indicator-color: var(--color-primary);
  --board-dnd-transition-duration: 200ms;
}
```

## License

MIT
