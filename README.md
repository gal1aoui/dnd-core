# @agal1aoui/dnd - Lightweight Drag and Drop Library

A high-performance, framework-agnostic drag and drop library for React and Angular with zero re-renders during drag operations.

## Why This Library?

Most drag and drop libraries suffer from performance issues due to:

- **Excessive re-renders**: State updates on every mouse move cause React/Angular to re-render components hundreds of times per second
- **Heavy abstractions**: Complex APIs that add overhead and bundle size
- **Framework lock-in**: Tightly coupled to a single framework

This library was built with a different philosophy:

### Performance-First Architecture

- **Zero re-renders during drag**: Uses refs and direct DOM manipulation instead of state updates
- **GPU-accelerated animations**: All transforms use `translate3d()` for hardware acceleration
- **Cached bounding boxes**: Rects are computed once at drag start, not on every move
- **Pointer capture**: Uses `setPointerCapture()` for reliable tracking without document listeners

### Headless Core Design

- **Framework-agnostic core**: Pure TypeScript engine that works anywhere
- **Thin framework adapters**: React hooks and Angular directives are minimal wrappers
- **Data attribute styling**: Style drag states with CSS using `[data-dnd-dragging]`, `[data-dnd-over]`, etc.
- **TailwindCSS compatible**: No CSS-in-JS, just pure CSS selectors

## Packages

| Package                     | Description                                        |
|-----------------------------|----------------------------------------------------|
| `@agal1aoui/dnd-core`       | Core drag engine, sensors, and collision detection |
| `@agal1aoui/vertical-dnd`   | Vertical sortable lists                            |
| `@agal1aoui/horizontal-dnd` | Horizontal sortable lists                          |
| `@agal1aoui/board-dnd`      | Kanban-style multi-column boards                   |
| `@agal1aoui/layout-dnd`     | Flexible grid/flex layouts                         |
| `@agal1aoui/react-dnd`      | React hooks and components                         |
| `@agal1aoui/angular-dnd`    | Angular directives and services                    |

## Installation

```bash
# For React
npm install @agal1aoui/react-dnd

# For Angular
npm install @agal1aoui/angular-dnd

# Or install specific packages
npm install @agal1aoui/dnd-core @agal1aoui/vertical-dnd
```

## Quick Start

### React - Vertical Sortable List

```tsx
import { useVerticalDnd } from '@agal1aoui/react-dnd'

function SortableList() {
  const [items, setItems] = useState(['Item 1', 'Item 2', 'Item 3'])

  const { containerRef, getItemProps, activeId } = useVerticalDnd({
    items,
    keyExtractor: (item) => item,
    onReorder: (fromIndex, toIndex) => {
      setItems(reorder(items, fromIndex, toIndex))
    },
  })

  return (
    <ul ref={containerRef} className="space-y-2">
      {items.map((item, index) => (
        <li
          key={item}
          {...getItemProps(item, index)}
          className="p-4 bg-white rounded shadow cursor-grab
                     data-[dnd-dragging]:opacity-50
                     data-[dnd-dragging]:cursor-grabbing"
        >
          {item}
        </li>
      ))}
    </ul>
  )
}

function reorder<T>(list: T[], from: number, to: number): T[] {
  const result = [...list]
  const [removed] = result.splice(from, 1)
  result.splice(to, 0, removed)
  return result
}
```

### React - Horizontal Sortable List

```tsx
import { useHorizontalDnd } from '@agal1aoui/react-dnd'

function HorizontalTabs() {
  const [tabs, setTabs] = useState(['Home', 'Profile', 'Settings'])

  const { containerRef, getItemProps } = useHorizontalDnd({
    items: tabs,
    keyExtractor: (tab) => tab,
    onReorder: (fromIndex, toIndex) => {
      setTabs(reorder(tabs, fromIndex, toIndex))
    },
  })

  return (
    <div ref={containerRef} className="flex gap-2">
      {tabs.map((tab, index) => (
        <button
          key={tab}
          {...getItemProps(tab, index)}
          className="px-4 py-2 bg-gray-100 rounded
                     data-[dnd-dragging]:bg-blue-100"
        >
          {tab}
        </button>
      ))}
    </div>
  )
}
```

### React - Kanban Board

```tsx
import { useBoardDnd } from '@agal1aoui/react-dnd'

interface Task {
  id: string
  title: string
}

function KanbanBoard() {
  const [columns, setColumns] = useState([
    { id: 'todo', items: [{ id: '1', title: 'Task 1' }] },
    { id: 'doing', items: [{ id: '2', title: 'Task 2' }] },
    { id: 'done', items: [] },
  ])

  const { getColumnProps, getItemProps } = useBoardDnd({
    columns,
    itemKeyExtractor: (task: Task) => task.id,
    onItemMove: ({ item, fromColumnId, toColumnId, fromIndex, toIndex }) => {
      setColumns(moveItem(columns, fromColumnId, toColumnId, fromIndex, toIndex))
    },
  })

  return (
    <div className="flex gap-4">
      {columns.map((column) => (
        <div
          key={column.id}
          {...getColumnProps(column.id)}
          className="w-64 p-4 bg-gray-100 rounded"
        >
          <h3 className="font-bold mb-4">{column.id}</h3>
          <div className="space-y-2">
            {column.items.map((task, index) => (
              <div
                key={task.id}
                {...getItemProps(task.id, column.id, index)}
                className="p-3 bg-white rounded shadow cursor-grab
                           data-[dnd-dragging]:shadow-lg
                           data-[dnd-dragging]:rotate-2"
              >
                {task.title}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
```

### Angular - Vertical Sortable List

```typescript
// app.component.ts
import { Component } from '@angular/core'
import { VerticalDndDirective, DndItemDirective } from '@agal1aoui/angular-dnd'

@Component({
  selector: 'app-sortable-list',
  standalone: true,
  imports: [VerticalDndDirective, DndItemDirective],
  template: `
    <ul
      verticalDnd
      [items]="items"
      [keyExtractor]="keyExtractor"
      (reorder)="onReorder($event)"
    >
      @for (item of items; track item; let i = $index) {
        <li
          [dndItem]="item"
          [dndItemIndex]="i"
          class="p-4 bg-white rounded shadow cursor-grab"
        >
          {{ item }}
        </li>
      }
    </ul>
  `,
  styles: [`
    [data-dnd-dragging] {
      opacity: 0.5;
      cursor: grabbing;
    }
  `]
})
export class SortableListComponent {
  items = ['Item 1', 'Item 2', 'Item 3']

  keyExtractor = (item: string) => item

  onReorder(event: { fromIndex: number; toIndex: number }) {
    const result = [...this.items]
    const [removed] = result.splice(event.fromIndex, 1)
    result.splice(event.toIndex, 0, removed)
    this.items = result
  }
}
```

### Angular - Horizontal Sortable List

```typescript
import { Component } from '@angular/core'
import { HorizontalDndDirective, DndItemDirective } from '@agal1aoui/angular-dnd'

@Component({
  selector: 'app-horizontal-tabs',
  standalone: true,
  imports: [HorizontalDndDirective, DndItemDirective],
  template: `
    <div
      horizontalDnd
      [items]="tabs"
      [keyExtractor]="keyExtractor"
      (reorder)="onReorder($event)"
      class="flex gap-2"
    >
      @for (tab of tabs; track tab; let i = $index) {
        <button
          [dndItem]="tab"
          [dndItemIndex]="i"
          class="px-4 py-2 bg-gray-100 rounded"
        >
          {{ tab }}
        </button>
      }
    </div>
  `
})
export class HorizontalTabsComponent {
  tabs = ['Home', 'Profile', 'Settings']

  keyExtractor = (tab: string) => tab

  onReorder(event: { fromIndex: number; toIndex: number }) {
    const result = [...this.tabs]
    const [removed] = result.splice(event.fromIndex, 1)
    result.splice(event.toIndex, 0, removed)
    this.tabs = result
  }
}
```

## Styling with Data Attributes

The library adds data attributes to elements during drag operations, making it easy to style with CSS:

| Attribute           | Applied To        | When                         |
|---------------------|-------------------|------------------------------|
| `data-dnd-dragging` | Dragged element   | While being dragged          |
| `data-dnd-over`     | Droppable element | When dragged item is over it |
| `data-dnd-handle`   | Handle element    | When using drag handles      |

### TailwindCSS Examples

```html
<!-- Basic drag styling -->
<div class="data-[dnd-dragging]:opacity-50 data-[dnd-dragging]:scale-105">

<!-- Rotation effect -->
<div class="data-[dnd-dragging]:rotate-3 transition-transform">

<!-- Shadow on drag -->
<div class="shadow data-[dnd-dragging]:shadow-xl">

<!-- Drop target highlighting -->
<div class="data-[dnd-over]:ring-2 data-[dnd-over]:ring-blue-500">
```

### Plain CSS

```css
/* Dragging state */
[data-dnd-dragging] {
  opacity: 0.5;
  cursor: grabbing;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
}

/* Drop target */
[data-dnd-over] {
  outline: 2px dashed #3b82f6;
  outline-offset: 2px;
}

/* Smooth transitions for siblings */
[data-dnd-item] {
  transition: transform 200ms cubic-bezier(0.2, 0, 0, 1);
}
```

## Advanced Usage

### Custom Drag Handles

```tsx
// React
const { containerRef, getItemProps, getHandleProps } = useVerticalDnd({
  items,
  keyExtractor: (item) => item.id,
  onReorder: handleReorder,
})

return (
  <ul ref={containerRef}>
    {items.map((item, index) => (
      <li key={item.id} {...getItemProps(item, index)}>
        <span {...getHandleProps(item)} className="cursor-grab">
          ⠿
        </span>
        {item.title}
      </li>
    ))}
  </ul>
)
```

### Disabled State

```tsx
const { containerRef, getItemProps } = useVerticalDnd({
  items,
  keyExtractor: (item) => item.id,
  onReorder: handleReorder,
  disabled: isLocked, // Disable all drag operations
})
```

### Animation Duration

```tsx
const { containerRef, getItemProps } = useVerticalDnd({
  items,
  keyExtractor: (item) => item.id,
  onReorder: handleReorder,
  animationDuration: 300, // milliseconds
})
```

### Using the Core Library Directly

For custom implementations or other frameworks:

```typescript
import { createDragEngine } from '@agal1aoui/dnd-core'
import { VerticalSortable } from '@agal1aoui/vertical-dnd'

const container = document.getElementById('list')!

const sortable = new VerticalSortable({
  container,
  items: ['a', 'b', 'c'],
  keyExtractor: (item) => item,
  onReorder: (fromIndex, toIndex) => {
    console.log(`Moved from ${fromIndex} to ${toIndex}`)
  },
})

// Register items
document.querySelectorAll('[data-item]').forEach((el, index) => {
  const item = el.getAttribute('data-item')!
  sortable.registerItem(item, el as HTMLElement, index)
})

// Cleanup when done
sortable.destroy()
```

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    Framework Layer                       │
│  ┌─────────────────┐         ┌───────────────────┐       │
│  │   React Hooks   │         │ Angular Directives│       │
│  │ (zero re-render)│         │ (NgZone.outside)  │       │
│  └────────┬────────┘         └────────┬──────────┘       │
└───────────┼───────────────────────────┼──────────────────┘
            │                           │
┌───────────▼───────────────────────────▼──────────────────┐
│                   Sortable Layer                         │
│  ┌──────────┐ ┌────────────┐ ┌───────┐ ┌────────┐        │
│  │ Vertical │ │ Horizontal │ │ Board │ │ Layout │        │
│  └────┬─────┘ └─────┬──────┘ └───┬───┘ └───┬────┘        │
└───────┼─────────────┼────────────┼─────────┼─────────────┘
        │             │            │         │
┌───────▼─────────────▼────────────▼─────────▼────────────┐
│                     Core Layer                          │
│  ┌────────────┐  ┌───────────┐  ┌────────────────┐      │
│  │ DragEngine │  │  Sensors  │  │   Collision    │      │
│  │            │  │ (Pointer) │  │  (AABB, etc.)  │      │
│  └────────────┘  └───────────┘  └────────────────┘      │
└─────────────────────────────────────────────────────────┘
```

## Performance Principles

### 1. Zero Re-renders During Drag (React)

```typescript
// Bad: causes re-render on every mouse move
const [position, setPosition] = useState({ x: 0, y: 0 })
onDragMove: (e) => setPosition(e.position) // 60+ re-renders per second!

// Good: update DOM directly via refs
const positionRef = useRef({ x: 0, y: 0 })
onDragMove: (e) => {
  positionRef.current = e.position
  elementRef.current.style.transform = `translate3d(${e.delta.x}px, ${e.delta.y}px, 0)`
}
```

### 2. GPU-Accelerated Transforms

```typescript
// Bad: triggers layout recalculation
element.style.left = `${x}px`
element.style.top = `${y}px`

// Good: GPU-accelerated, no layout thrashing
element.style.transform = `translate3d(${x}px, ${y}px, 0)`
```

### 3. Cached Bounding Boxes

```typescript
// Bad: getBoundingClientRect on every mouse move
onDragMove: (e) => {
  const rect = element.getBoundingClientRect() // Expensive!
}

// Good: cache once at drag start
onDragStart: () => {
  this.cachedRects = new Map()
  elements.forEach(el => {
    this.cachedRects.set(el.id, el.getBoundingClientRect())
  })
}
```

### 4. Pointer Capture

```typescript
// Bad: document-level listeners
document.addEventListener('pointermove', handler)
document.addEventListener('pointerup', handler)

// Good: pointer capture on the element
element.setPointerCapture(event.pointerId)
element.addEventListener('pointermove', handler)
element.addEventListener('pointerup', handler)
```

## Browser Support

- Chrome 55+
- Firefox 59+
- Safari 13+
- Edge 79+

Requires Pointer Events API support.

## Roadmap

The following features are planned for future releases:

- **Working Code Examples** - Interactive playground and sandbox demos with CodeSandbox/StackBlitz integrations for each package
- **CDN Support** - UMD builds available via unpkg and jsDelivr for use without a bundler
- **Smooth Animations** - Enhanced animation system with customizable easing functions, spring physics, and gesture-based velocity tracking

## License

MIT
