# @agallaoui/dnd - Modular Drag & Drop Library

A lightweight, modular drag-and-drop library built on Pointer Events. Designed for Kanban boards, lists, and custom DnD interfaces.

## Packages

| Package | Description | Size |
|---|---|---|
| [@agallaoui/dnd-core](./packages/dnd-core) | Framework-agnostic core engine | ~2.5kb |
| [@agallaoui/board-dnd](./packages/board-dnd) | Kanban board extension | ~1.5kb |

## Installation

```bash
# Core only (for custom implementations)
npm install @agallaoui/dnd-core

# Board DnD (includes core as dependency)
npm install @agallaoui/board-dnd
```

## Quick Start

### React - Hooks API

```tsx
import {
  BoardProvider,
  useBoardColumn,
  useBoardItem,
  DragOverlay,
  DropIndicator,
} from '@agallaoui/board-dnd/react';

function Board() {
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

### React - Pre-built Components

```tsx
import { Board } from '@agallaoui/board-dnd/react/components';

function App() {
  return (
    <Board
      columns={columns}
      onDrop={handleDrop}
      renderItem={(task) => <TaskCard task={task} />}
      renderColumnHeader={(col) => <h2>{col.data.title}</h2>}
    />
  );
}
```

### Angular

```typescript
// Extend the base service with RxJS observables
@Injectable({ providedIn: 'root' })
export class BoardDndService extends BoardDndServiceBase<Task> {
  drop$ = new Subject<BoardDropResult<Task>>();
  dragState$ = new BehaviorSubject(this.state);

  constructor() {
    super({
      callbacks: { onDrop: result => this.drop$.next(result) }
    });
    this.subscribe(state => this.dragState$.next(state));
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
+---------------------------------------------------------------+
|                       Application Layer                       |
|  +-------------------------+  +-----------------------------+ |
|  |     React Components    |  |    Angular Directives       | |
|  |  (useBoardItem, etc.)   |  |  (boardItem, boardColumn)   | |
|  +------------+------------+  +--------------+--------------+ |
+---------------|-----------------------------|----------------+
|               |    @agallaoui/board-dnd      |                |
|  +------------+------------------------------+--------------+ |
|  |                    Board Engine                          | |
|  |  - Column registration    - Drop indicator calculation   | |
|  |  - Index-based insertion  - Ghost item state             | |
|  +----------------------------+-----------------------------+ |
+-------------------------------|-------------------------------+
|                               |     @agallaoui/dnd-core       |
|  +----------------------------+-----------------------------+ |
|  |                     Core DnD Engine                      | |
|  |  - Pointer event handling  - Draggable/Droppable registry| |
|  |  - Hit testing             - State management            | |
|  |  - Lifecycle callbacks     - Type filtering              | |
|  +----------------------------------------------------------+ |
+---------------------------------------------------------------+
```

---

## Import Paths

### @agallaoui/dnd-core

| Path | Description |
|---|---|
| `@agallaoui/dnd-core` | Core DnD engine (framework-agnostic) |
| `@agallaoui/dnd-core/react` | React hooks: `useDraggable`, `useDroppable`, `DndProvider` |
| `@agallaoui/dnd-core/angular` | Angular adapter: `DndServiceBase` |

### @agallaoui/board-dnd

| Path | Description |
|---|---|
| `@agallaoui/board-dnd` | Board engine (framework-agnostic) |
| `@agallaoui/board-dnd/react` | React hooks: `useBoardColumn`, `useBoardItem`, `BoardProvider` |
| `@agallaoui/board-dnd/react/components` | Pre-built components: `Board`, `BoardColumn`, `BoardItem` |
| `@agallaoui/board-dnd/angular` | Angular adapter: `BoardDndServiceBase`, `BoardSettingsManager` |
| `@agallaoui/board-dnd/styles` | Optional CSS styles |

---

## Features

| Feature | dnd-core | board-dnd |
|---|---|---|
| Pointer Events API | Y | Y |
| Type-safe (TypeScript) | Y | Y |
| Zero dependencies | Y | Y |
| Tree-shakable | Y | Y |
| React adapter | Y | Y |
| Angular adapter | Y | Y |
| Column drop zones | - | Y |
| Drop indicators | - | Y |
| Ghost items | - | Y |
| Index tracking | - | Y |
| User settings (persist) | - | Y |
| Pre-built components | - | Y |
| Custom drop indicators | - | Y |

---

## Demos

### React Demo

```bash
npm run dev:react
# Opens http://localhost:5173
```

See [demos/react](./demos/react) for the complete implementation.

### Angular Demo

```bash
npm run dev:angular
# Opens http://localhost:4200
```

See [demos/angular](./demos/angular) for the complete implementation.

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

## Browser Support

- Chrome 55+
- Firefox 59+
- Safari 13+
- Edge 79+

Requires Pointer Events API support.

## License

MIT
