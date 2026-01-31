# React DnD Demo

Interactive demos for `@agal1aoui/react-dnd` - a high-performance drag and drop library with zero re-renders during drag.

## Getting Started

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev
```

## Available Demos

### 1. Vertical List (`useVerticalDnd`)
Sortable vertical list with smooth animations.

```tsx
import { useVerticalDnd } from '@agal1aoui/react-dnd'

const { containerRef, getItemProps } = useVerticalDnd<Item, HTMLUListElement>({
  items,
  keyExtractor: (item) => item.id,
  onReorder: setItems,
  gap: 12,
})
```

### 2. Horizontal List (`useHorizontalDnd`)
Horizontal tabs and galleries.

```tsx
import { useHorizontalDnd } from '@agal1aoui/react-dnd'

const { containerRef, getItemProps } = useHorizontalDnd<Tab, HTMLDivElement>({
  items: tabs,
  keyExtractor: (tab) => tab.id,
  onReorder: setTabs,
  gap: 8,
})
```

### 3. Kanban Board (`useBoardDnd`)
Multi-column board with cross-column drag support, placeholder at original position, and drop indicator.

```tsx
import { useBoardDnd } from '@agal1aoui/react-dnd'

const { getColumnProps, getItemProps } = useBoardDnd({
  columns,
  columnKeyExtractor: (col) => col.id,
  itemKeyExtractor: (item) => item.id,
  getColumnItems: (col) => col.items,
  onItemMove: handleItemMove,
  itemGap: 12,
  placeholderOpacity: 0.5,        // Opacity of placeholder at original position
  indicatorColor: 'primary',       // Color theme for drop indicator
})
```

**Indicator Colors:** `'primary'` | `'secondary'` | `'success'` | `'warning'` | `'danger'` | `'default'`

### 4. Grid Layout (`useLayoutDnd`)
Responsive grid with item reordering.

```tsx
import { useLayoutDnd } from '@agal1aoui/react-dnd'

const { containerRef, getItemProps } = useLayoutDnd<Widget, HTMLDivElement>({
  items: widgets,
  keyExtractor: (widget) => widget.id,
  onReorder: setWidgets,
})
```

## Styling with Data Attributes

Style drag states using Tailwind's data attribute syntax:

```tsx
className="
  cursor-grab
  data-[dnd-dragging]:cursor-grabbing
  data-[dnd-dragging]:shadow-xl
  data-[dnd-dragging]:scale-105
  data-[dnd-drop-before]:before:opacity-100
"
```

### Available Attributes

| Attribute | Description |
|-----------|-------------|
| `data-dnd-dragging` | Applied to the item being dragged |
| `data-dnd-drop-before` | Applied to show drop insertion point |
| `data-dnd-drop-target` | Applied to highlight target (opt-in) |
| `data-dnd-over` | Applied to column when item hovers over |
| `data-dnd-placeholder` | Applied to placeholder at original position (board) |
| `data-dnd-drop-indicator` | Applied to the drop indicator element (board) |
| `data-dnd-indicator-color` | Color theme attribute on drop indicator |

## Drop Indicator

### List Drop Indicator (Vertical/Horizontal/Layout)
Show a visual line where the item will be inserted:

```tsx
className="
  relative
  before:content-[''] before:absolute before:-top-2 before:left-0 before:right-0
  before:h-1 before:bg-blue-500 before:rounded-full
  before:opacity-0 before:transition-opacity
  data-[dnd-drop-before]:before:opacity-100
"
```

### Board Drop Indicator
The board uses a separate DOM element for the drop indicator. Style it in your CSS:

```css
/* Drop indicator color variants */
[data-dnd-drop-indicator] {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.3), rgba(59, 130, 246, 0.1));
  border: 2px dashed #3b82f6;
}

[data-dnd-drop-indicator][data-dnd-indicator-color="primary"] {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.3), rgba(59, 130, 246, 0.1));
  border-color: #3b82f6;
}

[data-dnd-drop-indicator][data-dnd-indicator-color="success"] {
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.3), rgba(34, 197, 94, 0.1));
  border-color: #22c55e;
}

/* Placeholder at original position */
[data-dnd-placeholder] {
  filter: grayscale(20%);
}
```

## Options Reference

### Common Options

| Option | Type | Description |
|--------|------|-------------|
| `items` | `T[]` | Array of items |
| `keyExtractor` | `(item: T) => string` | Unique ID extractor |
| `onReorder` | `(items: T[]) => void` | Called on reorder |
| `disabled` | `boolean` | Disable drag |
| `handle` | `string` | CSS selector for drag handle |
| `gap` | `number` | Space between items (px) |
| `animationDuration` | `number` | Animation duration (ms) |
| `highlightDropTarget` | `boolean` | Highlight target item |

### Lifecycle Hooks

| Hook | Type | Description |
|------|------|-------------|
| `onDragStart` | `(item: T) => void` | Called when drag starts |
| `onDragEnd` | `(item: T, cancelled: boolean) => void` | Called when drag ends |
| `onBeforeDragStart` | `(item: T, element: HTMLElement) => boolean \| void` | Return `false` to prevent drag |
| `onAfterDragEnd` | `(item: T, cancelled: boolean, from: number, to: number) => void` | Called after cleanup, good for API calls |

## Generic Container Types

Specify container element type to avoid ref casting:

```tsx
// Before (requires casting)
const { containerRef } = useVerticalDnd({ ... })
<ul ref={containerRef as React.RefObject<HTMLUListElement>}>

// After (no casting needed)
const { containerRef } = useVerticalDnd<Task, HTMLUListElement>({ ... })
<ul ref={containerRef}>
```

## Performance Features

- **Zero re-renders** during drag operations
- **GPU-accelerated** transforms with `translate3d()`
- **Cached bounding boxes** computed once at drag start
- **Pointer capture** for reliable tracking
- **60fps animations** with smooth cubic-bezier easing
