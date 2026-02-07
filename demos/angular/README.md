# Angular Board DnD Demo

A complete Kanban board demo using `@agallaoui/board-dnd` with Angular 19.

## Getting Started

From the monorepo root:

```bash
npm install
npm run build:core && npm run build:board
npm run dev:angular
```

Or from this directory:

```bash
npm install
npm run start
```

Opens at `http://localhost:4200`.

## Features

- Drag task cards between columns
- Drop indicators with pulse animation
- Ghost effect on dragged items
- Drag overlay follows cursor
- Same-column reordering with adjusted indices
- Standalone components (Angular 19)
- RxJS-based state management
- Responsive layout

## Project Structure

```
src/
  styles.scss                                     # Global styles
  app/
    app.component.ts / .html / .scss              # Root component
    types/
      board.types.ts                              # TypeScript interfaces (Task, Column)
    data/
      initial-data.ts                             # Sample board data
    services/
      board-dnd.service.ts                        # DnD service (extends BoardDndServiceBase)
    directives/
      board-column.directive.ts                   # Column drop zone directive
      board-item.directive.ts                     # Draggable item directive
    components/
      board/
        board.component.ts / .html / .scss        # Board layout + drag overlay
      column/
        board-column.component.ts / .html / .scss # Column with indicator logic
      ticket/
        ticket-card.component.ts / .html / .scss  # Task card display
```

---

## How to Use `@agallaoui/board-dnd` in Angular

The Angular adapter uses a **service + directives** pattern. You extend the base service class, create directives for columns and items, and handle drops via RxJS.

### Step 1: Create the DnD Service

Extend `BoardDndServiceBase` to bridge engine events to RxJS observables:

```typescript
// services/board-dnd.service.ts
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
        onDragStart: (item, columnId) => {
          console.log(`Started dragging ${item.id} from ${columnId}`);
        },
        onDrop: (result) => this.drop$.next(result),
        onDragCancel: (item) => {
          console.log(`Cancelled dragging ${item.id}`);
        },
      },
    });

    // Bridge engine state to RxJS
    this.subscribe((state) => this._dragState$.next(state));
  }

  ngOnDestroy(): void {
    this.destroy();
    this.drop$.complete();
    this._dragState$.complete();
  }
}
```

### Step 2: Create the Item Directive

Makes elements draggable. Automatically applies ghost opacity and grab cursor:

```typescript
// directives/board-item.directive.ts
import { Directive, ElementRef, Input, OnInit, OnDestroy, OnChanges, HostBinding } from '@angular/core';
import { Subscription } from 'rxjs';
import { BoardDndService } from '../services';

@Directive({ selector: '[boardItem]', standalone: true })
export class BoardItemDirective implements OnInit, OnDestroy, OnChanges {
  @Input({ required: true }) boardItemId!: string;
  @Input({ required: true }) boardItemData!: any;
  @Input({ required: true }) boardItemColumnId!: string;
  @Input({ required: true }) boardItemIndex!: number;

  private handle: any = null;
  private subscription: Subscription | null = null;
  private isDragging = false;

  @HostBinding('style.opacity') get opacity() { return this.isDragging ? 0.5 : 1; }
  @HostBinding('style.cursor') get cursor() { return 'grab'; }
  @HostBinding('style.userSelect') readonly userSelect = 'none';
  @HostBinding('style.touchAction') readonly touchAction = 'none';

  constructor(private el: ElementRef<HTMLElement>, private boardService: BoardDndService) {}

  ngOnInit() {
    const element = this.el.nativeElement;
    element.setAttribute('data-board-item', 'true');
    element.setAttribute('data-board-item-id', this.boardItemId);

    this.handle = this.boardService.registerItem(element, {
      id: this.boardItemId,
      data: this.boardItemData,
      columnId: this.boardItemColumnId,
      index: this.boardItemIndex,
    });

    this.subscription = this.boardService.dragState$.subscribe((state) => {
      this.isDragging = state.draggedItem?.id === this.boardItemId;
    });
  }

  ngOnChanges() {
    this.handle?.update({ data: this.boardItemData, index: this.boardItemIndex });
  }

  ngOnDestroy() {
    this.handle?.destroy();
    this.subscription?.unsubscribe();
  }
}
```

### Step 3: Create the Column Directive

Registers elements as drop zones and calculates item positions:

```typescript
// directives/board-column.directive.ts
import { Directive, ElementRef, Input, OnInit, OnDestroy, HostBinding } from '@angular/core';
import { Subscription } from 'rxjs';
import { BoardDndService } from '../services';
import type { ItemPosition } from '@agallaoui/board-dnd/angular';

@Directive({ selector: '[boardColumn]', standalone: true })
export class BoardColumnDirective implements OnInit, OnDestroy {
  @Input({ required: true }) boardColumnId!: string;
  @Input() boardColumnData: unknown = {};

  private handle: any = null;
  private subscription: Subscription | null = null;
  private isOver = false;

  @HostBinding('class.column-over') get overClass() { return this.isOver; }

  constructor(private el: ElementRef<HTMLElement>, private boardService: BoardDndService) {}

  ngOnInit() {
    this.handle = this.boardService.registerColumn(this.el.nativeElement, {
      id: this.boardColumnId,
      data: this.boardColumnData,
      getItemPositions: () => this.getItemPositions(),
    });

    this.subscription = this.boardService.dragState$.subscribe((state) => {
      this.isOver = state.dropIndicator?.columnId === this.boardColumnId;
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
    this.subscription?.unsubscribe();
  }
}
```

### Step 4: Use Directives in Templates

**Column template** - apply `boardColumn` directive and render items with `boardItem`:

```html
<!-- components/column/board-column.component.html -->
<div class="column"
  boardColumn
  [boardColumnId]="column.id"
  [boardColumnData]="column"
>
  <div class="column-header">
    <h2>{{ column.title }}</h2>
    <span class="item-count">{{ column.items.length }}</span>
  </div>

  <div class="column-items">
    <ng-container *ngFor="let task of column.items; let i = index">
      <div *ngIf="shouldShowIndicatorAt(i, task.id)" class="drop-indicator"></div>

      <div
        boardItem
        [boardItemId]="task.id"
        [boardItemData]="task"
        [boardItemColumnId]="column.id"
        [boardItemIndex]="i"
      >
        <app-ticket-card [task]="task" />
      </div>
    </ng-container>

    <!-- Indicator at end of list -->
    <div *ngIf="getAdjustedInsertIndex() === column.items.length" class="drop-indicator"></div>
  </div>
</div>
```

### Step 5: Handle Drop Indicator Positioning

The column component calculates where to show the drop indicator, adjusting for same-column drags:

```typescript
// components/column/board-column.component.ts
export class BoardColumnComponent {
  @Input({ required: true }) column!: Column;

  constructor(private boardService: BoardDndService) {}

  shouldShowIndicatorAt(index: number, taskId: string): boolean {
    const adjustedIndex = this.getAdjustedInsertIndex();
    if (adjustedIndex === null) return false;

    const draggedItemId = this.boardService.state.draggedItem?.id;
    if (taskId === draggedItemId) return false;

    return adjustedIndex === index;
  }

  getAdjustedInsertIndex(): number | null {
    const indicator = this.boardService.getDropIndicatorForColumn(this.column.id);
    if (!indicator) return null;

    const isDraggingFromHere = this.boardService.state.sourceColumnId === this.column.id;
    if (!isDraggingFromHere) return indicator.insertIndex;

    const draggedItemId = this.boardService.state.draggedItem?.id;
    const draggedIdx = this.column.items.findIndex(item => item.id === draggedItemId);

    if (draggedIdx !== -1 && indicator.insertIndex > draggedIdx) {
      return indicator.insertIndex + 1;
    }
    return indicator.insertIndex;
  }
}
```

### Step 6: Handle the Drag Overlay

The board component subscribes to drag state and tracks pointer position for the overlay:

```typescript
// components/board/board.component.ts
export class BoardComponent implements OnInit, OnDestroy {
  @Input({ required: true }) columns!: Column[];
  @Output() drop = new EventEmitter<BoardDropResult<Task>>();

  draggedItem: Task | null = null;
  overlayPosition = { x: 0, y: 0 };
  private dragOffset = { x: 0, y: 0 };

  constructor(private boardService: BoardDndService) {}

  ngOnInit() {
    this.boardService.drop$.subscribe(result => this.drop.emit(result));

    this.boardService.dragState$.subscribe(state => {
      this.draggedItem = state.draggedItem?.data ?? null;
      this.dragOffset = state.dragOffset ?? { x: 0, y: 0 };

      if (this.draggedItem) {
        window.addEventListener('pointermove', this.onPointerMove);
      } else {
        window.removeEventListener('pointermove', this.onPointerMove);
      }
    });
  }

  private onPointerMove = (e: PointerEvent) => {
    this.overlayPosition = {
      x: e.clientX - this.dragOffset.x,
      y: e.clientY - this.dragOffset.y,
    };
  };
}
```

```html
<!-- components/board/board.component.html -->
<div class="board">
  <app-board-column *ngFor="let col of columns" [column]="col" />
</div>

<!-- Drag overlay -->
<div *ngIf="draggedItem" class="drag-overlay"
  [style.left.px]="overlayPosition.x"
  [style.top.px]="overlayPosition.y"
>
  <app-ticket-card [task]="draggedItem" />
</div>
```

### Step 7: Handle Drops in the Root Component

```typescript
// app.component.ts
export class AppComponent {
  columns: Column[] = [...initialColumns.map(c => ({ ...c, items: [...c.items] }))];

  handleDrop(result: BoardDropResult<Task>): void {
    const { fromColumnId, fromIndex, toColumnId, toIndex } = result;
    const source = this.columns.find(c => c.id === fromColumnId)!;
    const target = this.columns.find(c => c.id === toColumnId)!;
    const [item] = source.items.splice(fromIndex, 1);
    target.items.splice(toIndex, 0, item);
    this.columns = [...this.columns];
  }
}
```

```html
<!-- app.component.html -->
<div class="app">
  <header class="app-header">
    <h1>Board DnD Angular Demo</h1>
  </header>

  <app-board [columns]="columns" (drop)="handleDrop($event)" />
</div>
```

---

## Angular Helpers

The package provides utility methods on the base service:

| Method | Description |
|---|---|
| `registerColumn(element, config)` | Register a drop zone |
| `registerItem(element, config)` | Register a draggable item |
| `subscribe(callback)` | Listen to drag state changes |
| `isItemDragging(itemId)` | Check if a specific item is being dragged |
| `getDropIndicatorForColumn(columnId)` | Get indicator position for a column |
| `sourceColumnId` | ID of the column being dragged from |
| `draggedItem` | The item currently being dragged |
| `state` | Current drag state snapshot |
| `destroy()` | Clean up resources |

### Settings Manager

Persist user preferences to localStorage:

```typescript
import { BoardSettingsManager } from '@agallaoui/board-dnd/angular';

@Injectable({ providedIn: 'root' })
export class BoardSettingsService extends BoardSettingsManager {
  constructor() {
    super({
      storageKey: 'my-board-prefs',
      initialSettings: { ghostOpacity: 0.3, indicatorColor: '#10b981' },
    });
  }
}
```

### Same-column Index Adjustment Utility

```typescript
import { getAdjustedInsertIndex } from '@agallaoui/board-dnd/angular';

const adjusted = getAdjustedInsertIndex(
  indicator.insertIndex,
  this.column.items,
  this.boardService.sourceColumnId === this.column.id,
  this.boardService.draggedItem?.id
);
```

## Important: `:host` Styling

Angular custom elements (`<app-board>`, `<app-board-column>`) have no default display. For flex layouts to work, add `:host` styles in each component:

```scss
// board-column.component.scss
:host {
  display: flex;
  flex-direction: column;
  min-width: 300px;
  max-width: 340px;
  flex: 1;
}

// board.component.scss
:host {
  display: block;
  flex: 1;
}

// app.component.scss
:host {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}
```

## Customization

Override CSS custom properties in `styles.scss`:

```scss
:root {
  --color-primary: #3b82f6;
  --drop-indicator-color: var(--color-primary);
  --drop-indicator-height: 4px;
  --drop-indicator-radius: 2px;
  --board-dnd-transition-duration: 200ms;
}
```

## License

MIT
