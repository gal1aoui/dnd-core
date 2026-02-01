# @agallaoui/dnd - Modular Drag & Drop Library

A lightweight, modular drag-and-drop library built on Pointer Events. Designed for Kanban boards, lists, and custom DnD interfaces.

## Packages

| Package                                      | Description                    | Size   |
|----------------------------------------------|--------------------------------|------  |
| [@agallaoui/dnd-core](./packages/dnd-core)   | Framework-agnostic core engine | ~2.5kb |
| [@agallaoui/board-dnd](./packages/board-dnd) | Kanban board extension         | ~1.5kb |

## Installation

```bash
# Core only (for custom implementations)
npm install @agallaoui/dnd-core

# Board DnD (includes core as dependency)
npm install @agallaoui/board-dnd
```

## Quick Start

### React

```tsx
import {
  BoardProvider,
  useBoardColumn,
  useBoardItem,
  DragOverlay,
  DropIndicator,
} from '@agallaoui/board-dnd/react';

function Board() {
  const handleDrop = ({ item, fromColumnId, toColumnId, toIndex }) => {
    // Update your state
    moveItem(item.id, fromColumnId, toColumnId, toIndex);
  };

  return (
    <BoardProvider onDrop={handleDrop}>
      <div className="board">
        {columns.map(col => <Column key={col.id} {...col} />)}
      </div>
      <DragOverlay>{item => <Card {...item.data} />}</DragOverlay>
    </BoardProvider>
  );
}
```

### Angular

```typescript
@Injectable({ providedIn: 'root' })
export class BoardDndService extends BoardDndServiceBase<TaskData> {
  drop$ = new Subject<BoardDropResult>();

  constructor() {
    super({
      callbacks: { onDrop: result => this.drop$.next(result) }
    });
  }
}
```

### Vanilla JavaScript

```typescript
import { createBoardEngine } from '@agallaoui/board-dnd';

const engine = createBoardEngine({
  callbacks: {
    onDrop: ({ item, toColumnId, toIndex }) => {
      updateData(item.id, toColumnId, toIndex);
    }
  }
});
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       Application Layer                         │
│  ┌─────────────────────────┐  ┌─────────────────────────────┐   │
│  │     React Components    │  │    Angular Directives       │   │
│  │  (useBoardItem, etc.)   │  │  (boardItem, boardColumn)   │   │
│  └────────────┬────────────┘  └──────────────┬──────────────┘   │
├───────────────┼──────────────────────────────┼──────────────────┤
│               │    @agallaoui/board-dnd      │                  │
│  ┌────────────┴──────────────────────────────┴──────────────┐   │
│  │                    Board Engine                          │   │
│  │  • Column registration    • Drop indicator calculation   │   │
│  │  • Index-based insertion  • Ghost item state             │   │
│  └────────────────────────────┬─────────────────────────────┘   │
├───────────────────────────────┼─────────────────────────────────┤
│                               │     @agallaoui/dnd-core         │
│  ┌────────────────────────────┴─────────────────────────────┐   │
│  │                     Core DnD Engine                      │   │
│  │  • Pointer event handling  • Draggable/Droppable registry│   │
│  │  • Hit testing             • State management            │   │
│  │  • Lifecycle callbacks     • Type filtering              │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Detailed Package Documentation

### @agallaoui/dnd-core

The core package provides the fundamental drag-and-drop engine. It's completely framework-agnostic and can be used with any UI library or vanilla JavaScript.

#### Core Engine Features

| Feature                 | Description                                                                  |
|-------------------------|------------------------------------------------------------------------------|
| **Pointer Events**      | Modern unified API for mouse, touch, and stylus input                        |
| **Drag Threshold**      | Configurable minimum distance before drag starts (prevents accidental drags) |
| **Type Filtering**      | Drop zones can specify which drag types they accept                          |
| **Lifecycle Callbacks** | `onDragStart`, `onDragOver`, `onDragLeave`, `onDrop`, `onDragEnd`            |
| **State Subscriptions** | Reactive state updates for UI synchronization                                |
| **Pointer Capture**     | Optional pointer capture for reliable cross-element tracking                 |

#### Engine API

```typescript
import { createDndEngine } from '@agallaoui/dnd-core';

const engine = createDndEngine({
  // Minimum pixels before drag activates
  dragThreshold: 5,

  // Capture pointer events during drag
  capturePointer: true,

  // Class added to body during drag
  draggingBodyClass: 'dnd-dragging',

  // Lifecycle callbacks
  callbacks: {
    onDragStart: ({ item, element, position, originalEvent }) => {
      // Called when drag begins (after threshold)
    },
    onDragOver: ({ item, dropZone, position, dropZoneElement }) => {
      // Called continuously while over a valid drop zone
    },
    onDragLeave: (dropZone) => {
      // Called when leaving a drop zone
    },
    onDrop: ({ item, dropZone, position, dropZoneElement }) => {
      // Called on successful drop
    },
    onDragEnd: ({ item, dropped, position }) => {
      // Called when drag ends (success or cancel)
    }
  }
});

// Register draggable elements
const dragHandle = engine.registerDraggable(element, {
  id: 'item-1',
  type: 'card',
  payload: { title: 'My Item' },
  disabled: false,
  handleSelector: '.drag-handle' // Optional: restrict to specific handles
});

// Register drop zones
const dropHandle = engine.registerDroppable(element, {
  id: 'column-1',
  accepts: ['card'], // Empty array accepts all types
  payload: { name: 'Todo' },
  disabled: false
});

// Subscribe to state changes
const unsubscribe = engine.subscribe((state) => {
  // state.phase: 'idle' | 'dragging' | 'dropping'
  // state.dragData: current drag item info
  // state.activeDropZone: hovered drop zone
  // state.pointerPosition: current pointer coordinates
});

// Cleanup
dragHandle.destroy();
dropHandle.destroy();
engine.destroy();
```

#### React Adapter

```tsx
import {
  DndProvider,
  useDraggable,
  useDroppable,
  useDndState,
  useDndEngine
} from '@agallaoui/dnd-core/react';

// Provider wraps your app
<DndProvider onDrop={handleDrop} onDragStart={handleStart}>
  <App />
</DndProvider>

// Make elements draggable
function DraggableItem({ id, data }) {
  const { ref, isDragging, dragData } = useDraggable({
    id,
    type: 'item',
    payload: data,
    disabled: false
  });

  return <div ref={ref} style={{ opacity: isDragging ? 0.5 : 1 }}>...</div>;
}

// Make elements droppable
function DropZone({ id }) {
  const { ref, isOver, dropZoneData, draggedItem } = useDroppable({
    id,
    accepts: ['item'],
    payload: { zoneId: id }
  });

  return <div ref={ref} className={isOver ? 'highlight' : ''}>...</div>;
}

// Access state anywhere
function StatusBar() {
  const state = useDndState();
  return <div>{state.phase === 'dragging' ? 'Dragging...' : 'Ready'}</div>;
}
```

#### Angular Adapter

```typescript
import {
  DndServiceBase,
  createDraggableDirective,
  createDroppableDirective
} from '@agallaoui/dnd-core/angular';

// Create injectable service
@Injectable({ providedIn: 'root' })
export class DndService extends DndServiceBase implements OnDestroy {
  constructor() {
    super({ callbacks: { onDrop: e => this.handleDrop(e) } });
  }
  ngOnDestroy() { this.destroy(); }
}

// Create draggable directive
@Directive({ selector: '[appDraggable]' })
export class DraggableDirective implements OnInit, OnDestroy {
  @Input() itemId!: string;
  @Input() itemData: any;

  private handle: DraggableHandle | null = null;

  constructor(private el: ElementRef, private dnd: DndService) {}

  ngOnInit() {
    this.handle = this.dnd.registerDraggable(this.el.nativeElement, {
      id: this.itemId,
      type: 'item',
      payload: this.itemData
    });
  }

  ngOnDestroy() { this.handle?.destroy(); }
}
```

---

### @agallaoui/board-dnd

The board package extends the core with Kanban-specific functionality. It handles column-based layouts, drop indicators, and index-based insertion.

#### Board-Specific Features

| Feature               | Description                                          |
|-----------------------|------------------------------------------------------|
| **Column Drop Zones** | Automatic column registration and hit testing        |
| **Drop Indicators**   | Calculated insertion point based on pointer position |
| **Ghost Items**       | Source item shows at 50% opacity during drag         |
| **Index Tracking**    | Precise from/to index for item moves                 |
| **State-on-Drop**     | No DOM changes until drop completes                  |

#### Drag UX Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  DRAG START                                                     │
│  • Original item stays in place                                 │
│  • Original item gets 50% opacity (ghost)                       │
│  • Drag overlay appears following cursor                        │
├─────────────────────────────────────────────────────────────────┤
│  DRAG OVER COLUMN                                               │
│  • Drop indicator shows at insertion point                      │
│  • Indicator position based on pointer Y vs item midpoints      │
│  • Original item remains stationary (no layout shifts)          │
├─────────────────────────────────────────────────────────────────┤
│  DROP                                                           │
│  • Callback fires with from/to information                      │
│  • Caller updates their state (item moves in data)              │
│  • Re-render shows item in new position                         │
│  • Opacity restored to 100%                                     │
└─────────────────────────────────────────────────────────────────┘
```

#### Drop Indicator Calculation

The insertion point is calculated by comparing pointer Y to item midpoints:

```
┌─────────────────────┐
│      Item 0         │ midpoint ─┐
├─────────────────────┤           │ pointer above = insert at 0
│      Item 1         │ midpoint ─┤
├─────────────────────┤           │ pointer between = insert at 1
│      Item 2         │ midpoint ─┤
└─────────────────────┘           │ pointer below = insert at 2

Algorithm:
for each item:
  if pointer.y < item.midpoint:
    return item.index
return items.length
```

#### Board Engine API

```typescript
import { createBoardEngine } from '@agallaoui/board-dnd';

const engine = createBoardEngine({
  animate: true,
  animationDuration: 200,
  itemGap: 8,
  itemType: 'board-item',

  callbacks: {
    onDragStart: (item, columnId) => { ... },
    onDragOver: (item, columnId, insertIndex) => { ... },
    onDrop: ({ item, fromColumnId, fromIndex, toColumnId, toIndex }) => {
      // Move item in your data structure
    },
    onDragCancel: (item) => { ... }
  }
});

// Register column
const colHandle = engine.registerColumn(element, {
  id: 'column-1',
  data: { name: 'Todo' },
  getItemPositions: () => [
    { id: 'item-1', index: 0, top: 0, bottom: 50, height: 50 },
    { id: 'item-2', index: 1, top: 58, bottom: 108, height: 50 },
  ]
});

// Register item
const itemHandle = engine.registerItem(element, {
  id: 'item-1',
  data: { title: 'Task 1' },
  columnId: 'column-1',
  index: 0,
  disabled: false
});

// Subscribe to board state
engine.subscribe((state) => {
  // state.isDragging
  // state.draggedItem
  // state.sourceColumnId
  // state.dropIndicator: { columnId, insertIndex, position }
});
```

#### React Board Components

```tsx
import {
  BoardProvider,
  useBoardColumn,
  useBoardItem,
  useBoardState,
  DragOverlay,
  DropIndicator
} from '@agallaoui/board-dnd/react';

function Board() {
  return (
    <BoardProvider onDrop={handleDrop}>
      <div className="columns">
        {columns.map(col => <Column key={col.id} {...col} />)}
      </div>
      <DragOverlay>
        {item => <Card {...item.data} />}
      </DragOverlay>
    </BoardProvider>
  );
}

function Column({ id, items }) {
  const { ref, itemsContainerRef, isOver, dropIndicator } = useBoardColumn({
    id,
    data: { columnId: id }
  });

  return (
    <div ref={ref} className={isOver ? 'over' : ''}>
      <div ref={itemsContainerRef}>
        {items.map((item, i) => (
          <Fragment key={item.id}>
            {dropIndicator?.insertIndex === i && <DropIndicator />}
            <Card item={item} columnId={id} index={i} />
          </Fragment>
        ))}
        {dropIndicator?.insertIndex === items.length && <DropIndicator />}
      </div>
    </div>
  );
}

function Card({ item, columnId, index }) {
  const { ref, isDragging, style } = useBoardItem({
    id: item.id,
    data: item,
    columnId,
    index
  });

  return <div ref={ref} style={style}>{item.title}</div>;
}
```

---

## Performance Optimizations

| Optimization                | Description                                              |
|-----------------------------|----------------------------------------------------------|
| **Pointer Events**          | Single unified event API, no mouse/touch polyfills       |
| **Minimal DOM Access**      | Bounding rects read once per drag-over                   |
| **CSS Transforms**          | `transform` and `opacity` for GPU-accelerated animations |
| **Tree-Shakable**           | Dead code eliminated in production builds                |
| **Zero Dependencies**       | No external runtime dependencies                         |
| **Efficient Subscriptions** | Set-based subscriber notification                        |

### Bundle Sizes

| Import Path                  | Size (minified + gzip) |
|------------------------------|------------------------|
| `@agallaoui/dnd-core`        | ~2.5kb                 |
| `@agallaoui/dnd-core/react`  | ~3.5kb                 |
| `@agallaoui/board-dnd`       | ~1.5kb                 |
| `@agallaoui/board-dnd/react` | ~2.5kb                 |

---

## Demos

### React Demo

```bash
npm run dev:react
# Opens http://localhost:5173
```

See [demos/react-demo](./demos/react-demo) for the complete implementation.

### Angular Demo

```bash
npm run dev:angular
# Opens http://localhost:4200
```

See [demos/angular-demo](./demos/angular-demo) for the complete implementation.

---

## Browser Support

- Chrome 55+
- Firefox 59+
- Safari 13+
- Edge 79+

Requires Pointer Events API support.

---

## Development

```bash
# Install dependencies
npm install

# Build all packages
npm run build

# Build individual packages
npm run build:core
npm run build:board

# Run demos
npm run dev:react
npm run dev:angular

# Clean build outputs
npm run clean
```

---

## License

MIT
