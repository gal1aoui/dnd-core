# @agallaoui/board-dnd

Kanban-style board drag-and-drop extension for `@agallaoui/dnd-core`.

## Installation

```bash
npm install @agallaoui/board-dnd @agallaoui/dnd-core
```

## Features

- **Column-Based Layout** - Designed for Kanban/Trello-style boards
- **Drop Indicators** - Visual feedback showing insertion point
- **Ghost Items** - Source item shows at reduced opacity during drag
- **Index Tracking** - Precise insertion position within columns
- **Customizable** - Custom drop indicators, settings persistence, pre-built components
- **State-on-Drop** - No DOM reordering until drop completes

## Import Paths

| Path | Description |
|---|---|
| `@agallaoui/board-dnd` | Board engine (framework-agnostic) |
| `@agallaoui/board-dnd/react` | React hooks & providers |
| `@agallaoui/board-dnd/react/components` | Pre-built React components |
| `@agallaoui/board-dnd/angular` | Angular service & helpers |
| `@agallaoui/board-dnd/styles` | Optional CSS styles |

## React - Hooks API

```tsx
import {
  BoardProvider,
  useBoardColumn,
  useBoardItem,
  DragOverlay,
  DropIndicator,
} from '@agallaoui/board-dnd/react';

function Board({ columns, onDrop }) {
  return (
    <BoardProvider onDrop={onDrop}>
      <div className="board">
        {columns.map(col => <Column key={col.id} {...col} />)}
      </div>
      <DragOverlay>{item => <Card {...item.data} />}</DragOverlay>
    </BoardProvider>
  );
}

function Column({ id, title, items }) {
  const { ref, itemsContainerRef, isOver, dropIndicator } = useBoardColumn({
    id,
    data: { title },
  });

  return (
    <div ref={ref} className={isOver ? 'column over' : 'column'}>
      <h3>{title}</h3>
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
    index,
  });

  return <div ref={ref} style={style}>{item.title}</div>;
}
```

## React - Pre-built Components

For quick setup without wiring hooks manually:

```tsx
import { Board } from '@agallaoui/board-dnd/react/components';

function App() {
  return (
    <Board
      columns={[
        { id: 'todo', data: { title: 'To Do' }, items: todoItems },
        { id: 'done', data: { title: 'Done' }, items: doneItems },
      ]}
      onDrop={handleDrop}
      renderItem={(task) => <TaskCard task={task} />}
      renderColumnHeader={(col) => <h2>{col.data.title}</h2>}
      renderOverlay={(item) => <TaskCard task={item.data} />}
    />
  );
}
```

Individual components are also available:

```tsx
import { BoardColumn, BoardItem } from '@agallaoui/board-dnd/react/components';
```

## Custom Drop Indicator

Use the `render` prop for a fully custom indicator:

```tsx
<DropIndicator
  columnId={columnId}
  insertIndex={insertIndex}
  render={({ columnId, insertIndex }) => (
    <div className="my-custom-indicator" />
  )}
/>
```

## Settings Provider

Persist user preferences with `BoardSettingsProvider`:

```tsx
import { BoardSettingsProvider, useBoardSettings } from '@agallaoui/board-dnd/react';

<BoardSettingsProvider
  storageKey="my-board-settings"
  initialSettings={{ ghostOpacity: 0.3, indicatorColor: '#10b981' }}
>
  <BoardProvider onDrop={handleDrop}>
    {/* board content */}
  </BoardProvider>
</BoardSettingsProvider>

// Access settings anywhere
function SettingsPanel() {
  const { settings, updateSettings, resetSettings } = useBoardSettings();
  // ...
}
```

## Angular

### 1. Create a service

```typescript
import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { BoardDndServiceBase, BoardDropResult, BoardDragState } from '@agallaoui/board-dnd/angular';

@Injectable({ providedIn: 'root' })
export class BoardDndService extends BoardDndServiceBase<Task> implements OnDestroy {
  readonly drop$ = new Subject<BoardDropResult<Task>>();
  private readonly _dragState$ = new BehaviorSubject<BoardDragState<Task>>(this.state);
  readonly dragState$ = this._dragState$.asObservable();

  constructor() {
    super({
      callbacks: {
        onDrop: (result) => this.drop$.next(result),
      }
    });
    this.subscribe((state) => this._dragState$.next(state));
  }

  ngOnDestroy(): void {
    this.destroy();
    this.drop$.complete();
    this._dragState$.complete();
  }
}
```

### 2. Create directives

```typescript
@Directive({ selector: '[boardColumn]', standalone: true })
export class BoardColumnDirective implements OnInit, OnDestroy {
  @Input({ required: true }) boardColumnId!: string;
  @Input() boardColumnData: unknown = {};

  constructor(private el: ElementRef, private boardService: BoardDndService) {}

  ngOnInit() {
    this.handle = this.boardService.registerColumn(this.el.nativeElement, {
      id: this.boardColumnId,
      data: this.boardColumnData,
      getItemPositions: () => this.getItemPositions(),
    });
  }
  // ...
}

@Directive({ selector: '[boardItem]', standalone: true })
export class BoardItemDirective implements OnInit, OnDestroy {
  @Input({ required: true }) boardItemId!: string;
  @Input() boardItemData!: any;
  @Input() boardItemColumnId!: string;
  @Input() boardItemIndex!: number;
  // ...
}
```

### 3. Use in templates

```html
<div boardColumn [boardColumnId]="column.id" [boardColumnData]="column">
  <div *ngFor="let task of column.items; let i = index"
    boardItem
    [boardItemId]="task.id"
    [boardItemData]="task"
    [boardItemColumnId]="column.id"
    [boardItemIndex]="i"
  >
    {{ task.title }}
  </div>
</div>
```

### Angular Settings Manager

```typescript
import { BoardSettingsManager } from '@agallaoui/board-dnd/angular';

@Injectable({ providedIn: 'root' })
export class BoardSettingsService extends BoardSettingsManager {
  constructor() {
    super({ storageKey: 'board-settings', initialSettings: { ghostOpacity: 0.3 } });
  }
}
```

### Utility: Same-column drag index

```typescript
import { getAdjustedInsertIndex } from '@agallaoui/board-dnd/angular';

const adjustedIndex = getAdjustedInsertIndex(
  dropIndicator.insertIndex,
  items,
  boardService.sourceColumnId === columnId,
  boardService.draggedItem?.id
);
```

## Vanilla JavaScript

```typescript
import { createBoardEngine } from '@agallaoui/board-dnd';

const engine = createBoardEngine({
  callbacks: {
    onDrop: ({ item, fromColumnId, toColumnId, toIndex }) => {
      moveItem(item.id, fromColumnId, toColumnId, toIndex);
    }
  }
});

engine.registerColumn(element, {
  id: 'column-1',
  data: { name: 'Todo' },
  getItemPositions: () => getPositions()
});

engine.registerItem(element, {
  id: 'item-1',
  data: { title: 'Task' },
  columnId: 'column-1',
  index: 0
});
```

## Board Settings

All settings are optional and have sensible defaults:

| Setting | Type | Default | Description |
|---|---|---|---|
| `dragThreshold` | `number` | `5` | Pixels before drag starts |
| `animate` | `boolean` | `true` | Enable animations |
| `animationDuration` | `number` | `200` | Animation duration (ms) |
| `itemGap` | `number` | `8` | Gap between items (px) |
| `ghostOpacity` | `number` | `0.5` | Opacity of dragged item ghost |
| `indicatorColor` | `string` | `'#3b82f6'` | Drop indicator color |
| `indicatorHeight` | `number` | `4` | Drop indicator height (px) |
| `indicatorBorderRadius` | `number` | `2` | Drop indicator border radius |
| `allowCrossColumnDrag` | `boolean` | `true` | Allow cross-column dragging |
| `dragCursor` | `string` | `'grabbing'` | Cursor during drag |
| `showOverlay` | `boolean` | `true` | Show drag overlay |
| `overlayZIndex` | `number` | `9999` | Overlay z-index |

## CSS Custom Properties

```css
:root {
  --board-dnd-indicator-color: #3b82f6;
  --board-dnd-overlay-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  --board-dnd-transition-duration: 200ms;
}
```

## Bundle Size

| Import | Size (minified + gzip) |
|---|---|
| Core | ~1.5kb |
| + React adapter | ~2.5kb |
| + React components | ~3.5kb |
| + Angular adapter | ~2.2kb |

## License

MIT
