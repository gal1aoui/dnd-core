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

## How It Works

### Service

The `BoardDndService` extends `BoardDndServiceBase` and bridges engine events to RxJS:

```typescript
@Injectable({ providedIn: 'root' })
export class BoardDndService extends BoardDndServiceBase<Task> implements OnDestroy {
  readonly drop$ = new Subject<BoardDropResult<Task>>();
  readonly dragState$ = this._dragState$.asObservable();

  constructor() {
    super({
      callbacks: { onDrop: (result) => this.drop$.next(result) }
    });
    this.subscribe((state) => this._dragState$.next(state));
  }
}
```

### Directives

**Column directive** - registers the element as a drop zone:

```html
<div boardColumn [boardColumnId]="column.id" [boardColumnData]="column">
  <!-- items -->
</div>
```

**Item directive** - registers the element as draggable:

```html
<div boardItem
  [boardItemId]="task.id"
  [boardItemData]="task"
  [boardItemColumnId]="column.id"
  [boardItemIndex]="i"
>
  <app-ticket-card [task]="task" />
</div>
```

### Drop Indicator

The column component handles indicator positioning, including same-column drag adjustment:

```typescript
shouldShowIndicatorAt(index: number, taskId: string): boolean {
  const adjustedIndex = this.getAdjustedInsertIndex();
  if (adjustedIndex === null) return false;
  if (taskId === this.boardService.state.draggedItem?.id) return false;
  return adjustedIndex === index;
}
```

### Handling Drops

Subscribe to `drop$` in the parent component:

```typescript
handleDrop(result: BoardDropResult<Task>): void {
  const source = this.columns.find(c => c.id === result.fromColumnId);
  const target = this.columns.find(c => c.id === result.toColumnId);
  const [item] = source.items.splice(result.fromIndex, 1);
  target.items.splice(result.toIndex, 0, item);
  this.columns = [...this.columns];
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
}
```

## License

MIT
