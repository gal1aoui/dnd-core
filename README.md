# @agallaoui/board-dnd

A lightweight, modular drag-and-drop library for Kanban boards. Built on Pointer Events with React and Angular adapters.

| Package | Description |
|---|---|
| `@agallaoui/dnd-core` | Framework-agnostic core engine (~2.5kb) |
| `@agallaoui/board-dnd` | Kanban board extension (~1.5kb) |

## Installation

```bash
npm install @agallaoui/board-dnd
```

This installs both `@agallaoui/board-dnd` and `@agallaoui/dnd-core` (peer dependency).

---

## React

Two approaches: **pre-built components** (fastest setup) or **hooks** (full control).

### Option A: Pre-built Components

The quickest way to get a working board. One component, a few render props, done.

```tsx
import { Board } from '@agallaoui/board-dnd/react/components';

interface Task {
  id: string;
  title: string;
}

const columns = [
  { id: 'todo', data: { title: 'To Do' }, items: [{ id: '1', title: 'Task 1' }] },
  { id: 'doing', data: { title: 'In Progress' }, items: [] },
  { id: 'done', data: { title: 'Done' }, items: [] },
];

function App() {
  const [cols, setCols] = useState(columns);

  const handleDrop = ({ fromColumnId, fromIndex, toColumnId, toIndex }) => {
    setCols(prev => {
      const next = prev.map(c => ({ ...c, items: [...c.items] }));
      const source = next.find(c => c.id === fromColumnId)!;
      const target = next.find(c => c.id === toColumnId)!;
      const [item] = source.items.splice(fromIndex, 1);
      target.items.splice(toIndex, 0, item);
      return next;
    });
  };

  return (
    <Board
      columns={cols}
      onDrop={handleDrop}
      renderItem={(task) => <div>{task.title}</div>}
      renderColumnHeader={(col) => <h3>{col.data.title}</h3>}
      renderOverlay={(item) => <div className="overlay">{item.data.title}</div>}
    />
  );
}
```

**Available props:**

| Prop | Type | Description |
|---|---|---|
| `columns` | `ColumnData[]` | Columns with their items |
| `onDrop` | `(result) => void` | Called when an item is dropped |
| `renderItem` | `(item, columnId, index) => ReactNode` | Render each item |
| `renderOverlay` | `(item) => ReactNode` | Render the drag overlay |
| `renderColumnHeader` | `(column) => ReactNode` | Custom column header |
| `renderColumnFooter` | `(column) => ReactNode` | Custom column footer |
| `renderDropIndicator` | `(props) => ReactNode` | Custom drop indicator |
| `className` | `string` | Board container class |
| `columnClassName` | `string` | Column class |
| `columnOverClassName` | `string` | Column class when hovered |
| `itemClassName` | `string` | Item class |
| `itemDraggingClassName` | `string` | Item class when dragging |

### Option B: Hooks API

Full control over layout and rendering. You wire the hooks yourself.

#### Step 1: Define your types

```tsx
interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
}

interface Column {
  id: string;
  title: string;
  items: Task[];
}
```

#### Step 2: Board component

```tsx
import { BoardProvider, DragOverlay, type BoardDropResult } from '@agallaoui/board-dnd/react';

function Board({ columns, onDrop }) {
  return (
    <BoardProvider onDrop={onDrop}>
      <div className="board">
        {columns.map(col => (
          <BoardColumn key={col.id} column={col} />
        ))}
      </div>

      <DragOverlay>
        {(item) => (
          <div className="task-card overlay">
            {item.data.title}
          </div>
        )}
      </DragOverlay>
    </BoardProvider>
  );
}
```

#### Step 3: Column component

```tsx
import React from 'react';
import { useBoardColumn, useBoardState, DropIndicator } from '@agallaoui/board-dnd/react';

function BoardColumn({ column }) {
  const { ref, itemsContainerRef, isOver, dropIndicator } = useBoardColumn({
    id: column.id,
    data: { title: column.title },
  });

  const boardState = useBoardState();
  const isDraggingFromHere = boardState.sourceColumnId === column.id;
  const draggedItemId = boardState.draggedItem?.id;

  // Adjust insert index for same-column drags
  const getAdjustedIndex = (insertIndex: number) => {
    if (!isDraggingFromHere) return insertIndex;
    const draggedIdx = column.items.findIndex(i => i.id === draggedItemId);
    return draggedIdx !== -1 && insertIndex > draggedIdx
      ? insertIndex + 1
      : insertIndex;
  };

  const adjustedIndex = dropIndicator
    ? getAdjustedIndex(dropIndicator.insertIndex)
    : null;

  return (
    <div ref={ref} className={`column ${isOver ? 'over' : ''}`}>
      <h2>{column.title}</h2>
      <div ref={itemsContainerRef} className="column-items">
        {column.items.map((task, i) => (
          <React.Fragment key={task.id}>
            {adjustedIndex === i && task.id !== draggedItemId && (
              <DropIndicator />
            )}
            <TaskCard task={task} columnId={column.id} index={i} />
          </React.Fragment>
        ))}
        {adjustedIndex === column.items.length && <DropIndicator />}
      </div>
    </div>
  );
}
```

#### Step 4: Item component

```tsx
import { useBoardItem } from '@agallaoui/board-dnd/react';

function TaskCard({ task, columnId, index }) {
  const { ref, isDragging, style } = useBoardItem({
    id: task.id,
    data: task,
    columnId,
    index,
  });

  return (
    <div ref={ref} style={style} className={`task-card ${isDragging ? 'dragging' : ''}`}>
      <span>{task.title}</span>
      <p>{task.description}</p>
    </div>
  );
}
```

#### Step 5: State management

```tsx
import { useState, useCallback } from 'react';
import type { BoardDropResult } from '@agallaoui/board-dnd/react';

function App() {
  const [columns, setColumns] = useState(initialColumns);

  const handleDrop = useCallback(
    ({ fromColumnId, fromIndex, toColumnId, toIndex }: BoardDropResult<Task>) => {
      setColumns(prev => {
        const next = prev.map(c => ({ ...c, items: [...c.items] }));
        const source = next.find(c => c.id === fromColumnId)!;
        const target = next.find(c => c.id === toColumnId)!;
        const [item] = source.items.splice(fromIndex, 1);
        target.items.splice(toIndex, 0, item);
        return next;
      });
    },
    []
  );

  return <Board columns={columns} onDrop={handleDrop} />;
}
```

### React Hooks Reference

| Hook | Returns | Description |
|---|---|---|
| `useBoardColumn({ id, data })` | `{ ref, itemsContainerRef, isOver, dropIndicator }` | Register a column drop zone |
| `useBoardItem({ id, data, columnId, index })` | `{ ref, isDragging, style }` | Register a draggable item |
| `useBoardState()` | `BoardDragState` | Subscribe to drag state |
| `useBoardSettings()` | `{ settings, updateSettings, resetSettings }` | Access board settings |

### React Components Reference

| Component | Props | Description |
|---|---|---|
| `BoardProvider` | `onDrop, onDragStart?, onDragOver?, onDragCancel?` | Context provider |
| `DragOverlay` | `children: (item) => ReactNode, className?, wrapperClassName?` | Overlay following cursor |
| `DropIndicator` | `height?, className?, render?` | Insertion point indicator |
| `BoardSettingsProvider` | `initialSettings?, storageKey?, onSettingsChange?` | Settings persistence |

---

## Angular

### Step 1: Create the service

```typescript
// board-dnd.service.ts
import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import {
  BoardDndServiceBase,
  type BoardDragState,
  type BoardDropResult,
} from '@agallaoui/board-dnd/angular';

@Injectable({ providedIn: 'root' })
export class BoardDndService extends BoardDndServiceBase<Task> implements OnDestroy {
  readonly drop$ = new Subject<BoardDropResult<Task>>();
  private readonly _dragState$ = new BehaviorSubject<BoardDragState<Task>>(this.state);
  readonly dragState$ = this._dragState$.asObservable();

  constructor() {
    super({
      callbacks: {
        onDrop: (result) => this.drop$.next(result),
      },
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

### Step 2: Create directives

```typescript
// board-item.directive.ts
import { Directive, ElementRef, Input, OnInit, OnDestroy, OnChanges } from '@angular/core';
import { BoardDndService } from './board-dnd.service';

@Directive({ selector: '[boardItem]', standalone: true })
export class BoardItemDirective implements OnInit, OnDestroy, OnChanges {
  @Input({ required: true }) boardItemId!: string;
  @Input({ required: true }) boardItemData!: any;
  @Input({ required: true }) boardItemColumnId!: string;
  @Input({ required: true }) boardItemIndex!: number;

  private handle: any = null;

  constructor(private el: ElementRef<HTMLElement>, private boardService: BoardDndService) {}

  ngOnInit() {
    this.el.nativeElement.setAttribute('data-board-item', 'true');
    this.el.nativeElement.setAttribute('data-board-item-id', this.boardItemId);

    this.handle = this.boardService.registerItem(this.el.nativeElement, {
      id: this.boardItemId,
      data: this.boardItemData,
      columnId: this.boardItemColumnId,
      index: this.boardItemIndex,
    });
  }

  ngOnChanges() {
    this.handle?.update({
      data: this.boardItemData,
      index: this.boardItemIndex,
    });
  }

  ngOnDestroy() {
    this.handle?.destroy();
  }
}
```

```typescript
// board-column.directive.ts
import { Directive, ElementRef, Input, OnInit, OnDestroy } from '@angular/core';
import type { ItemPosition } from '@agallaoui/board-dnd/angular';
import { BoardDndService } from './board-dnd.service';

@Directive({ selector: '[boardColumn]', standalone: true })
export class BoardColumnDirective implements OnInit, OnDestroy {
  @Input({ required: true }) boardColumnId!: string;
  @Input() boardColumnData: unknown = {};

  private handle: any = null;

  constructor(private el: ElementRef<HTMLElement>, private boardService: BoardDndService) {}

  ngOnInit() {
    this.handle = this.boardService.registerColumn(this.el.nativeElement, {
      id: this.boardColumnId,
      data: this.boardColumnData,
      getItemPositions: () => this.getItemPositions(),
    });
  }

  private getItemPositions(): ItemPosition[] {
    const positions: ItemPosition[] = [];
    const items = this.el.nativeElement.querySelectorAll('[data-board-item]');
    items.forEach((el, index) => {
      const rect = el.getBoundingClientRect();
      const id = el.getAttribute('data-board-item-id');
      if (id) {
        positions.push({ id, index, top: rect.top, bottom: rect.bottom, height: rect.height });
      }
    });
    return positions;
  }

  ngOnDestroy() {
    this.handle?.destroy();
  }
}
```

### Step 3: Use in templates

```html
<!-- board.component.html -->
<div class="board">
  <app-column *ngFor="let col of columns" [column]="col" />
</div>
```

```html
<!-- column.component.html -->
<div class="column" boardColumn [boardColumnId]="column.id" [boardColumnData]="column">
  <h2>{{ column.title }}</h2>

  <div class="column-items">
    <ng-container *ngFor="let task of column.items; let i = index">
      <div *ngIf="shouldShowIndicator(i, task.id)" class="drop-indicator"></div>

      <div class="task-card"
        boardItem
        [boardItemId]="task.id"
        [boardItemData]="task"
        [boardItemColumnId]="column.id"
        [boardItemIndex]="i"
      >
        {{ task.title }}
      </div>
    </ng-container>

    <div *ngIf="showIndicatorAtEnd()" class="drop-indicator"></div>
  </div>
</div>
```

### Step 4: Handle drops

```typescript
// app.component.ts
export class AppComponent implements OnInit {
  columns = [...];

  constructor(private boardService: BoardDndService) {}

  ngOnInit() {
    this.boardService.drop$.subscribe(({ fromColumnId, fromIndex, toColumnId, toIndex }) => {
      const source = this.columns.find(c => c.id === fromColumnId)!;
      const target = this.columns.find(c => c.id === toColumnId)!;
      const [item] = source.items.splice(fromIndex, 1);
      target.items.splice(toIndex, 0, item);
      this.columns = [...this.columns];
    });
  }
}
```

### Angular Helper: Same-column index adjustment

```typescript
import { getAdjustedInsertIndex } from '@agallaoui/board-dnd/angular';

// In your column component
shouldShowIndicator(index: number, taskId: string): boolean {
  const indicator = this.boardService.getDropIndicatorForColumn(this.column.id);
  if (!indicator) return false;

  const adjusted = getAdjustedInsertIndex(
    indicator.insertIndex,
    this.column.items,
    this.boardService.sourceColumnId === this.column.id,
    this.boardService.draggedItem?.id
  );

  return adjusted === index && taskId !== this.boardService.draggedItem?.id;
}
```

---

## Customization

### Custom Drop Indicator (React)

```tsx
<DropIndicator
  columnId={columnId}
  insertIndex={insertIndex}
  render={({ columnId, insertIndex }) => (
    <div className="my-indicator">
      <div className="dot" />
      <div className="line" />
      <div className="dot" />
    </div>
  )}
/>
```

### Settings Provider (React)

Persist user preferences to localStorage:

```tsx
import { BoardSettingsProvider, useBoardSettings } from '@agallaoui/board-dnd/react';

<BoardSettingsProvider
  storageKey="my-board-prefs"
  initialSettings={{
    ghostOpacity: 0.3,
    indicatorColor: '#10b981',
    indicatorHeight: 3,
  }}
>
  <BoardProvider onDrop={handleDrop}>
    {/* your board */}
  </BoardProvider>
</BoardSettingsProvider>
```

### Settings Manager (Angular)

```typescript
import { BoardSettingsManager } from '@agallaoui/board-dnd/angular';

@Injectable({ providedIn: 'root' })
export class BoardSettingsService extends BoardSettingsManager {
  constructor() {
    super({
      storageKey: 'my-board-prefs',
      initialSettings: { ghostOpacity: 0.3 },
    });
  }
}
```

### All Settings

| Setting | Default | Description |
|---|---|---|
| `dragThreshold` | `5` | Pixels before drag starts |
| `animate` | `true` | Enable animations |
| `animationDuration` | `200` | Animation duration (ms) |
| `itemGap` | `8` | Gap between items (px) |
| `ghostOpacity` | `0.5` | Opacity of ghost item |
| `indicatorColor` | `'#3b82f6'` | Drop indicator color |
| `indicatorHeight` | `4` | Drop indicator height (px) |
| `indicatorBorderRadius` | `2` | Drop indicator radius (px) |
| `allowCrossColumnDrag` | `true` | Allow cross-column dragging |
| `dragCursor` | `'grabbing'` | Cursor during drag |
| `showOverlay` | `true` | Show drag overlay |
| `overlayZIndex` | `9999` | Overlay z-index |

### CSS Custom Properties

```css
:root {
  --board-dnd-indicator-color: #3b82f6;
  --board-dnd-overlay-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  --board-dnd-transition-duration: 200ms;
}
```

### Optional CSS

Import the bundled styles for sensible defaults:

```tsx
import '@agallaoui/board-dnd/styles';
```

This provides classes like `.board-dnd-board`, `.board-dnd-column`, `.board-dnd-card`, `.board-dnd-indicator`, etc. You can use these or write your own.

---

## Import Paths

| Path | What you get |
|---|---|
| `@agallaoui/board-dnd` | `createBoardEngine` (vanilla JS) |
| `@agallaoui/board-dnd/react` | `BoardProvider`, `useBoardColumn`, `useBoardItem`, `useBoardState`, `DragOverlay`, `DropIndicator`, `BoardSettingsProvider`, `useBoardSettings` |
| `@agallaoui/board-dnd/react/components` | `Board`, `BoardColumn`, `BoardItem` (pre-built) |
| `@agallaoui/board-dnd/angular` | `BoardDndServiceBase`, `BoardSettingsManager`, `getAdjustedInsertIndex`, `createBoardColumnDirective`, `createBoardItemDirective` |
| `@agallaoui/board-dnd/styles` | Default CSS styles |

---

## Types

```typescript
interface BoardDropResult<TItem> {
  item: BoardItem<TItem>;
  fromColumnId: DndId;
  fromIndex: number;
  toColumnId: DndId;
  toIndex: number;
}

interface BoardDragState<TItem> {
  isDragging: boolean;
  draggedItem: BoardItem<TItem> | null;
  sourceColumnId: DndId | null;
  sourceIndex: number | null;
  dropIndicator: DropIndicatorPosition | null;
  dragOffset: Point | null;
}

interface DropIndicatorPosition {
  columnId: DndId;
  insertIndex: number;
  position: Point;
}

interface BoardItem<T> {
  id: DndId;
  data: T;
}
```

---

## Demos

See working examples in the [demos/react](./demos/react) and [demos/angular](./demos/angular) directories.

```bash
# React demo
npm run dev:react    # http://localhost:5173

# Angular demo
npm run dev:angular  # http://localhost:4200
```

## Browser Support

Chrome 55+ / Firefox 59+ / Safari 13+ / Edge 79+ (requires Pointer Events API)

## License

MIT
