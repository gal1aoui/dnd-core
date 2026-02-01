# @agallaoui/dnd-core

A lightweight, framework-agnostic drag-and-drop engine built on Pointer Events.

## Installation

```bash
npm install @agallaoui/dnd-core
```

## Features

- **Framework Agnostic**: Core engine works with vanilla JS, React, Angular, or any framework
- **Pointer Events**: Modern API for unified mouse/touch/stylus handling
- **Type Safe**: Full TypeScript support with comprehensive type definitions
- **Tree-shakable**: Import only what you need
- **Zero Dependencies**: No external runtime dependencies
- **Extensible**: Built to be extended (see `@agallaoui/board-dnd`)

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        DnD Engine                           │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐    │
│  │ Draggables  │  │  Droppables  │  │  State Manager   │    │
│  │  Registry   │  │   Registry   │  │  & Subscribers   │    │
│  └─────────────┘  └──────────────┘  └──────────────────┘    │
│           │               │                  │              │
│           └───────────────┼──────────────────┘              │
│                           │                                 │
│              ┌────────────┴────────────┐                    │
│              │    Pointer Event        │                    │
│              │       Handler           │                    │
│              └─────────────────────────┘                    │
└─────────────────────────────────────────────────────────────┘
```

## Usage

### Vanilla JavaScript

```typescript
import { createDndEngine } from '@agallaoui/dnd-core';

const engine = createDndEngine({
  dragThreshold: 5, // Pixels before drag starts
  callbacks: {
    onDragStart: ({ item, position }) => {
      console.log(`Started dragging ${item.id} at`, position);
    },
    onDragOver: ({ item, dropZone }) => {
      console.log(`${item.id} is over ${dropZone.id}`);
    },
    onDrop: ({ item, dropZone }) => {
      console.log(`Dropped ${item.id} on ${dropZone.id}`);
      // Handle your state update here
    },
    onDragEnd: ({ item, dropped }) => {
      console.log(`Drag ended, dropped: ${dropped}`);
    }
  }
});

// Register a draggable element
const dragHandle = engine.registerDraggable(cardElement, {
  id: 'card-1',
  type: 'card',
  payload: { title: 'My Task', priority: 'high' }
});

// Register a drop zone
const dropHandle = engine.registerDroppable(columnElement, {
  id: 'column-todo',
  accepts: ['card'], // Only accept 'card' type draggables
  payload: { status: 'todo' }
});

// Subscribe to state changes
const unsubscribe = engine.subscribe((state) => {
  console.log('DnD state:', state.phase, state.dragData);
});

// Clean up when done
dragHandle.destroy();
dropHandle.destroy();
engine.destroy();
```

### React

```tsx
import {
  DndProvider,
  useDraggable,
  useDroppable,
  useDndState
} from '@agallaoui/dnd-core/react';

// Draggable component
function DraggableCard({ id, data }) {
  const { ref, isDragging } = useDraggable({
    id,
    type: 'card',
    payload: data,
  });

  return (
    <div
      ref={ref}
      style={{ opacity: isDragging ? 0.5 : 1 }}
      className="card"
    >
      {data.title}
    </div>
  );
}

// Droppable component
function Column({ id, title, items }) {
  const { ref, isOver } = useDroppable({
    id,
    accepts: ['card'],
    payload: { columnId: id },
  });

  return (
    <div
      ref={ref}
      className={`column ${isOver ? 'highlight' : ''}`}
    >
      <h2>{title}</h2>
      {items.map(item => (
        <DraggableCard key={item.id} id={item.id} data={item} />
      ))}
    </div>
  );
}

// App with provider
function App() {
  const [columns, setColumns] = useState(initialColumns);

  const handleDrop = ({ item, dropZone }) => {
    setColumns(cols => moveItem(cols, item.id, dropZone.payload.columnId));
  };

  return (
    <DndProvider onDrop={handleDrop}>
      <div className="board">
        {columns.map(col => (
          <Column key={col.id} {...col} />
        ))}
      </div>
    </DndProvider>
  );
}
```

### Angular

```typescript
// dnd.service.ts
import { Injectable, OnDestroy } from '@angular/core';
import { DndServiceBase } from '@agallaoui/dnd-core/angular';

@Injectable({ providedIn: 'root' })
export class DndService extends DndServiceBase implements OnDestroy {
  constructor() {
    super({
      callbacks: {
        onDrop: (event) => {
          // Emit to your state management
          this.dropSubject.next(event);
        }
      }
    });
  }

  ngOnDestroy() {
    this.destroy();
  }
}

// draggable.directive.ts
@Directive({ selector: '[appDraggable]' })
export class DraggableDirective implements OnInit, OnDestroy, OnChanges {
  @Input() dndId!: string;
  @Input() dndType = 'item';
  @Input() dndPayload: any;
  @Input() dndDisabled = false;

  private handle: DraggableHandle | null = null;

  constructor(
    private el: ElementRef<HTMLElement>,
    private dndService: DndService
  ) {}

  ngOnInit() {
    this.handle = this.dndService.registerDraggable(
      this.el.nativeElement,
      {
        id: this.dndId,
        type: this.dndType,
        payload: this.dndPayload,
        disabled: this.dndDisabled,
      }
    );
  }

  ngOnChanges(changes: SimpleChanges) {
    if (this.handle && (changes['dndDisabled'] || changes['dndPayload'])) {
      this.handle.update({
        disabled: this.dndDisabled,
        payload: this.dndPayload,
      });
    }
  }

  ngOnDestroy() {
    this.handle?.destroy();
  }
}
```

## API Reference

### `createDndEngine(config?)`

Creates a new DnD engine instance.

**Config Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `dragThreshold` | `number` | `5` | Pixels of movement before drag starts |
| `capturePointer` | `boolean` | `true` | Whether to capture pointer events |
| `draggingBodyClass` | `string` | `'dnd-dragging'` | CSS class added to body during drag |
| `callbacks` | `DndCallbacks` | `{}` | Lifecycle callbacks |

**Returns:** `DndEngine`

### `DndEngine`

| Method | Description |
|--------|-------------|
| `registerDraggable(element, options)` | Register an element as draggable |
| `registerDroppable(element, options)` | Register an element as a drop zone |
| `getState()` | Get current DnD state |
| `subscribe(callback)` | Subscribe to state changes |
| `updateConfig(config)` | Update engine configuration |
| `cancel()` | Cancel current drag operation |
| `destroy()` | Clean up all resources |

### Callbacks

```typescript
interface DndCallbacks {
  onDragStart?: (event: DragStartEvent) => void;
  onDragOver?: (event: DragOverEvent) => void;
  onDragLeave?: (dropZone: DropZoneData) => void;
  onDrop?: (event: DropEvent) => void;
  onDragEnd?: (event: DragEndEvent) => void;
}
```

## Performance

The engine is designed for optimal performance:

- **Pointer Events**: Single event API, no need for separate mouse/touch handling
- **Minimal Allocations**: Object pooling for frequently created objects
- **Efficient Hit Testing**: Uses bounding rect caching
- **RAF-aligned Updates**: Position updates aligned with animation frames
- **Tree-shaking**: Unused code eliminated in production builds

## Bundle Size

| Import                     | Size (minified + gzip) |
|----------------------------|------------------------|
| Core only                  | ~2.5kb |
| + React adapter            | ~3.5kb |
| + Angular adapter          | ~3.2kb |

## License

MIT
