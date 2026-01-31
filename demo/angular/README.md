# Angular DnD Demo

A demo application showcasing the `@agal1aoui/angular-dnd` library - a lightweight, zero-change-detection drag-and-drop solution for Angular.

## Features

- **Zero Change Detection** - All drag operations happen outside Angular's zone
- **CSS Transform Animations** - GPU-accelerated, smooth 60fps animations
- **Data Attribute Styling** - Use `[data-dnd-*]` selectors for drag states
- **TypeScript Support** - Full type safety with generics

## Getting Started

### Prerequisites

- Node.js 18+
- Angular 17+
- TailwindCSS (optional, for styling)

### Installation

```bash
# Install dependencies
npm install

# Start development server
ng serve
```

## Directives

### Vertical List

```typescript
import {
  DndVerticalListDirective,
  DndItemDirective,
  type DndReorderEvent
} from '@agal1aoui/angular-dnd'
```

**Template:**
```html
<ul
  [dndVerticalList]="items"
  [dndKeyExtractor]="keyExtractor"
  [dndGap]="12"
  (dndReorder)="onReorder($event)"
>
  <li
    *ngFor="let item of items; trackBy: trackByFn"
    [dndItem]="item"
    [dndItemKey]="keyExtractor(item)"
  >
    {{ item.title }}
  </li>
</ul>
```

**Component:**
```typescript
@Component({
  selector: 'app-list',
  standalone: true,
  imports: [CommonModule, DndVerticalListDirective, DndItemDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `...`
})
export class ListComponent {
  items = [
    { id: '1', title: 'Item 1' },
    { id: '2', title: 'Item 2' },
  ]

  keyExtractor = (item: Item): string => item.id
  trackByFn = (_: number, item: Item): string => item.id

  onReorder(event: DndReorderEvent<Item>): void {
    this.items = event.items
  }
}
```

### Horizontal List

```typescript
import {
  DndHorizontalListDirective,
  DndHorizontalItemDirective,
  type DndReorderEvent
} from '@agal1aoui/angular-dnd'
```

**Template:**
```html
<div
  [dndHorizontalList]="tabs"
  [dndKeyExtractor]="keyExtractor"
  [dndGap]="8"
  (dndReorder)="onReorder($event)"
  class="flex gap-2"
>
  <button
    *ngFor="let tab of tabs; trackBy: trackByFn"
    [dndHorizontalItem]="tab"
    [dndItemKey]="tab.id"
  >
    {{ tab.label }}
  </button>
</div>
```

## Directive Options

### Container Directives

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `dndVerticalList` | `T[]` | required | Array of items to render |
| `dndHorizontalList` | `T[]` | required | Array of items to render |
| `dndKeyExtractor` | `(item: T) => string` | required | Function to extract unique key |
| `dndGap` | `number` | `0` | Gap between items in pixels |
| `dndDisabled` | `boolean` | `false` | Disable drag and drop |

### Item Directives

| Input | Type | Description |
|-------|------|-------------|
| `dndItem` | `T` | The item data |
| `dndHorizontalItem` | `T` | The item data (horizontal) |
| `dndItemKey` | `string` | Unique key for the item |

### Events

| Output | Type | Description |
|--------|------|-------------|
| `dndReorder` | `DndReorderEvent<T>` | Emitted when items are reordered |

```typescript
interface DndReorderEvent<T> {
  items: T[]           // New array order
  fromIndex: number    // Original index
  toIndex: number      // New index
}
```

## Styling with Data Attributes

The library adds data attributes during drag operations:

```css
/* Item being dragged */
[data-dnd-dragging] {
  cursor: grabbing;
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.15);
  transform: rotate(2deg);
}

/* Drop insertion indicator (using pseudo-element) */
[data-dnd-drop-before]::before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: -6px;
  height: 3px;
  background: #3b82f6;
  border-radius: 2px;
}

/* For horizontal lists */
[data-dnd-drop-before]::before {
  top: 0;
  bottom: 0;
  left: -6px;
  width: 3px;
  height: auto;
}
```

### TailwindCSS with @apply

```css
.task-item {
  @apply p-4 bg-white rounded-lg shadow-sm cursor-grab select-none;
  transition: transform 200ms cubic-bezier(0.2, 0, 0, 1);
}

[data-dnd-dragging] {
  @apply cursor-grabbing shadow-xl border-blue-400;
}
```

## Demo Components

### Vertical List (`app-vertical-list`)

A task list demonstrating vertical drag-and-drop with priority badges and drag handles.

**Features:**
- Priority-based styling (high/medium/low)
- Drag handle indicator
- Smooth transform animations

### Horizontal Tabs (`app-horizontal-tabs`)

Reorderable tab navigation with active state tracking.

**Features:**
- Tab reordering
- Active tab persistence
- Border-bottom indicator

### Horizontal Gallery (`app-horizontal-gallery`)

A scrollable photo gallery with gradient backgrounds.

**Features:**
- Horizontal scrolling
- Scale animation on drag
- Shadow effects

## Best Practices

### 1. Use OnPush Change Detection

```typescript
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  ...
})
```

### 2. Implement trackBy

Always provide a `trackBy` function to optimize rendering:

```typescript
trackByFn = (_: number, item: Item): string => item.id
```

### 3. Keep Key Extractors Consistent

Use the same key for both directive and trackBy:

```html
<li
  *ngFor="let item of items; trackBy: trackByFn"
  [dndItem]="item"
  [dndItemKey]="keyExtractor(item)"
>
```

### 4. Use CSS Transitions

Add transitions for smooth animations:

```css
.item {
  transition: transform 200ms cubic-bezier(0.2, 0, 0, 1),
              box-shadow 200ms ease;
}
```

## Project Structure

```
src/
├── app/
│   ├── app.component.ts          # Main app with navigation
│   ├── vertical-list.component.ts # Vertical sortable demo
│   └── horizontal-list.component.ts # Tabs & gallery demos
├── index.html
├── main.ts
└── styles.css
```

## Building

```bash
# Development
ng serve

# Production build
ng build --configuration production
```

## Dependencies

- `@angular/core` ^17.0.0
- `@agal1aoui/angular-dnd` (workspace)
- `tailwindcss` ^3.0.0 (optional)
