# @agallaoui/dnd-core

A lightweight, framework-agnostic drag-and-drop engine built on Pointer Events.

## Installation

```bash
npm install @agallaoui/dnd-core
```

## Features

- **Framework Agnostic** - Works with vanilla JS, React, Angular, or any framework
- **Pointer Events** - Modern unified API for mouse, touch, and stylus
- **Type Safe** - Full TypeScript support
- **Tree-shakable** - Import only what you need
- **Zero Dependencies** - No external runtime dependencies
- **Extensible** - Built to be extended (see `@agallaoui/board-dnd`)

## Import Paths

| Path | Description |
|---|---|
| `@agallaoui/dnd-core` | Core engine (framework-agnostic) |
| `@agallaoui/dnd-core/react` | React hooks & provider |
| `@agallaoui/dnd-core/angular` | Angular service base class |

## Usage

### Vanilla JavaScript

```typescript
import { createDndEngine } from '@agallaoui/dnd-core';

const engine = createDndEngine({
  dragThreshold: 5,
  callbacks: {
    onDragStart: ({ item, position }) => {
      console.log(`Started dragging ${item.id}`);
    },
    onDragOver: ({ item, dropZone }) => {
      console.log(`${item.id} over ${dropZone.id}`);
    },
    onDrop: ({ item, dropZone }) => {
      // Handle your state update
    },
    onDragEnd: ({ item, dropped }) => {
      console.log(`Drag ended, dropped: ${dropped}`);
    }
  }
});

// Register a draggable element
const dragHandle = engine.registerDraggable(element, {
  id: 'card-1',
  type: 'card',
  payload: { title: 'My Task' }
});

// Register a drop zone
const dropHandle = engine.registerDroppable(element, {
  id: 'column-1',
  accepts: ['card'],
  payload: { name: 'Todo' }
});

// Subscribe to state changes
const unsubscribe = engine.subscribe((state) => {
  // state.phase: 'idle' | 'dragging' | 'dropping'
});

// Cleanup
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

function DraggableCard({ id, data }) {
  const { ref, isDragging } = useDraggable({
    id,
    type: 'card',
    payload: data,
  });

  return (
    <div ref={ref} style={{ opacity: isDragging ? 0.5 : 1 }}>
      {data.title}
    </div>
  );
}

function DropZone({ id, children }) {
  const { ref, isOver } = useDroppable({
    id,
    accepts: ['card'],
  });

  return (
    <div ref={ref} className={isOver ? 'highlight' : ''}>
      {children}
    </div>
  );
}

function App() {
  return (
    <DndProvider onDrop={handleDrop}>
      <DropZone id="zone-1">
        <DraggableCard id="card-1" data={{ title: 'Task' }} />
      </DropZone>
    </DndProvider>
  );
}
```

### Angular

```typescript
import { Injectable, OnDestroy } from '@angular/core';
import { DndServiceBase } from '@agallaoui/dnd-core/angular';

@Injectable({ providedIn: 'root' })
export class DndService extends DndServiceBase implements OnDestroy {
  constructor() {
    super({
      callbacks: {
        onDrop: (event) => this.handleDrop(event)
      }
    });
  }

  ngOnDestroy() {
    this.destroy();
  }
}
```

## API Reference

### `createDndEngine(config?)`

| Option | Type | Default | Description |
|---|---|---|---|
| `dragThreshold` | `number` | `5` | Pixels before drag starts |
| `capturePointer` | `boolean` | `true` | Capture pointer events during drag |
| `draggingBodyClass` | `string` | `'dnd-dragging'` | CSS class on body during drag |
| `callbacks` | `DndCallbacks` | `{}` | Lifecycle callbacks |

### Engine Methods

| Method | Description |
|---|---|
| `registerDraggable(el, options)` | Register draggable element |
| `registerDroppable(el, options)` | Register drop zone |
| `getState()` | Get current DnD state |
| `subscribe(callback)` | Subscribe to state changes |
| `cancel()` | Cancel current drag |
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

## Bundle Size

| Import | Size (minified + gzip) |
|---|---|
| Core only | ~2.5kb |
| + React adapter | ~3.5kb |
| + Angular adapter | ~3.2kb |

## License

MIT
