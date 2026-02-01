# Angular DnD Demo

A complete Kanban board demo using `@agallaoui/board-dnd` with Angular 17+.

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

From the monorepo root:

```bash
# Install all dependencies
npm install

# Build the packages first
npm run build:core
npm run build:board

# Run the Angular demo
npm run dev:angular
```

Or from this directory:

```bash
npm install
npm run start
```

The demo will be available at `http://localhost:4200`.

## Features Demonstrated

### Core Functionality

- **Drag and Drop**: Drag task cards between columns
- **Drop Indicators**: Visual feedback showing insertion point
- **Ghost Effect**: Original item shows at 50% opacity during drag
- **Drag Overlay**: Dragged card follows cursor with rotation

### Angular Patterns

- **Standalone Components**: Modern Angular 17+ architecture
- **RxJS Integration**: State management with observables
- **Directives**: Clean directive-based DnD integration
- **OnPush Ready**: Compatible with OnPush change detection

## Architecture

```
src/app/
├── app.component.ts         # Main board component
├── board-dnd.service.ts     # DnD service wrapping the engine
├── board-column.directive.ts # Column drop zone directive
└── board-item.directive.ts   # Draggable item directive
```

## Key Components

### BoardDndService

Injectable service extending `BoardDndServiceBase`:

```typescript
@Injectable({ providedIn: 'root' })
export class BoardDndService extends BoardDndServiceBase<TaskData> {
  readonly drop$ = new Subject<BoardDropResult<TaskData>>();
  readonly dragState$ = new BehaviorSubject(this.state);

  constructor() {
    super({
      callbacks: {
        onDrop: (result) => this.drop$.next(result)
      }
    });

    this.subscribe(state => this.dragState$.next(state));
  }
}
```

### BoardColumnDirective

Makes elements drop zones:

```typescript
@Directive({ selector: '[boardColumn]', standalone: true })
export class BoardColumnDirective {
  @Input() boardColumnId!: string;
  @Input() boardColumnData: any;
}
```

Usage:
```html
<div
  boardColumn
  [boardColumnId]="column.id"
  [boardColumnData]="column"
>
  <!-- items here -->
</div>
```

### BoardItemDirective

Makes elements draggable:

```typescript
@Directive({ selector: '[boardItem]', standalone: true })
export class BoardItemDirective {
  @Input() boardItemId!: string;
  @Input() boardItemData!: TaskData;
  @Input() boardItemColumnId!: string;
  @Input() boardItemIndex!: number;
}
```

Usage:
```html
<div
  *ngFor="let task of column.items; let i = index"
  boardItem
  [boardItemId]="task.id"
  [boardItemData]="task"
  [boardItemColumnId]="column.id"
  [boardItemIndex]="i"
>
  {{ task.title }}
</div>
```

## Handling Drops

Subscribe to the `drop$` observable:

```typescript
export class AppComponent implements OnInit {
  constructor(private boardService: BoardDndService) {}

  ngOnInit() {
    this.boardService.drop$.subscribe(result => {
      this.handleDrop(result);
    });
  }

  handleDrop({ fromColumnId, fromIndex, toColumnId, toIndex }: BoardDropResult) {
    // 1. Find columns
    const source = this.columns.find(c => c.id === fromColumnId);
    const target = this.columns.find(c => c.id === toColumnId);

    // 2. Move item
    const [item] = source.items.splice(fromIndex, 1);
    target.items.splice(toIndex, 0, item);

    // 3. Trigger change detection
    this.columns = [...this.columns];
  }
}
```

## Drop Indicator

Show indicators using the service method:

```html
<ng-container *ngFor="let task of column.items; let i = index">
  <!-- Indicator before item -->
  <div
    *ngIf="getDropIndicator(column.id)?.insertIndex === i"
    class="drop-indicator"
  ></div>

  <div boardItem [boardItemId]="task.id" ...>
    {{ task.title }}
  </div>
</ng-container>

<!-- Indicator at end -->
<div
  *ngIf="getDropIndicator(column.id)?.insertIndex === column.items.length"
  class="drop-indicator"
></div>
```

```typescript
getDropIndicator(columnId: string) {
  return this.boardService.getDropIndicatorForColumn(columnId);
}
```

## State Access Patterns

### Reactive (Recommended)

```typescript
this.boardService.dragState$.pipe(
  map(state => state.isDragging)
).subscribe(isDragging => { ... });
```

### Imperative

```typescript
const isDragging = this.boardService.state.isDragging;
const draggedItem = this.boardService.state.draggedItem;
```

## Customization

### Directive Host Bindings

```typescript
@HostBinding('style.opacity')
get opacity() {
  return this.isDragging ? 0.5 : 1;
}

@HostBinding('class.column-over')
get overClass() {
  return this.isOver;
}
```

### CSS Variables

```css
:root {
  --color-primary: #3b82f6;
  --color-primary-light: #eff6ff;
}

.column-over {
  background-color: var(--color-primary-light);
}
```

## Browser Support

- Chrome 55+
- Firefox 59+
- Safari 13+
- Edge 79+

Requires Pointer Events API support.

## License

MIT
