# React DnD Demo

A complete Kanban board demo using `@agallaoui/board-dnd` with React.

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

From the monorepo root:

```bash
# Install all dependencies
npm install

# Build the packages first
npm run build:core
npm run build:board

# Run the React demo
npm run dev:react
```

Or from this directory:

```bash
npm install
npm run dev
```

The demo will be available at `http://localhost:5173`.

## Features Demonstrated

### Core Functionality

- **Drag and Drop**: Drag task cards between columns
- **Drop Indicators**: Visual feedback showing where items will be inserted
- **Ghost Effect**: Original item shows at 50% opacity during drag
- **Drag Overlay**: Dragged card follows cursor with rotation effect

### Board Layout

- 4 columns: To Do, In Progress, Review, Done
- Each column shows item count
- Responsive design for different screen sizes

### Visual Feedback

- Column highlights when item is dragged over
- Smooth CSS transitions for all interactions
- Priority badges with color coding

## Code Structure

```
src/
├── main.tsx          # React entry point
├── App.tsx           # Main application component
│   ├── TaskCard      # Draggable task card
│   ├── BoardColumn   # Drop zone column
│   └── DragOverlay   # Floating drag preview
└── styles.css        # Application styles
```

## Key Components

### BoardProvider

Wraps the board and provides DnD context:

```tsx
<BoardProvider onDrop={handleDrop}>
  {/* columns */}
</BoardProvider>
```

### useBoardColumn

Hook for making a column a drop zone:

```tsx
const { ref, itemsContainerRef, isOver, dropIndicator } = useBoardColumn({
  id: column.id,
  data: { title: column.title },
});
```

### useBoardItem

Hook for making items draggable:

```tsx
const { ref, isDragging, style } = useBoardItem({
  id: task.id,
  data: task,
  columnId,
  index,
});
```

### DragOverlay

Renders the dragged item preview:

```tsx
<DragOverlay>
  {(draggedItem) => <TaskCardOverlay task={draggedItem.data} />}
</DragOverlay>
```

## Handling Drops

The `handleDrop` callback receives complete information about the move:

```tsx
const handleDrop = ({ item, fromColumnId, fromIndex, toColumnId, toIndex }) => {
  setColumns((cols) => {
    // 1. Clone state
    const newColumns = cols.map(c => ({ ...c, items: [...c.items] }));

    // 2. Find columns
    const source = newColumns.find(c => c.id === fromColumnId);
    const target = newColumns.find(c => c.id === toColumnId);

    // 3. Move item
    const [item] = source.items.splice(fromIndex, 1);
    target.items.splice(toIndex, 0, item);

    return newColumns;
  });
};
```

## Customization

### CSS Custom Properties

Override these to customize the look:

```css
:root {
  --board-dnd-indicator-color: #3b82f6;
  --board-dnd-transition-duration: 200ms;
}
```

### Styling States

```css
/* Column when item is over it */
.column.over {
  background-color: #eff6ff;
}

/* Item being dragged (ghost) */
.task-card.dragging {
  opacity: 0.5;
}

/* Drag overlay */
.task-card.overlay {
  transform: rotate(3deg);
  box-shadow: 0 10px 15px rgba(0, 0, 0, 0.1);
}
```

## Browser Support

- Chrome 55+
- Firefox 59+
- Safari 13+
- Edge 79+

Requires Pointer Events API support.

## License

MIT
