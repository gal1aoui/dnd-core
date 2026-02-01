# @agallaoui/board-dnd

Kanban-style board drag-and-drop extension for `@agallaoui/dnd-core`.

## Installation

```bash
npm install @agallaoui/board-dnd @agallaoui/dnd-core
```

## Features

- **Column-Based Layout**: Designed for Kanban/Trello-style boards
- **Drop Indicators**: Visual feedback showing insertion point
- **Ghost Items**: Original item shows at 50% opacity during drag
- **Index Tracking**: Precise insertion position within columns
- **State-on-Drop**: No DOM reordering until drop completes
- **CSS Animations**: Pure CSS transitions for smooth UX

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Board DnD Package                       │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │   Columns   │  │   Indicator  │  │   Board State    │   │
│  │  (Droppable)│  │  Calculator  │  │    (Extended)    │   │
│  └─────────────┘  └──────────────┘  └──────────────────┘   │
│           │               │                  │              │
│           └───────────────┼──────────────────┘              │
│                           │                                 │
│              ┌────────────┴────────────┐                    │
│              │    @agallaoui/dnd-core  │                    │
│              │      (Core Engine)      │                    │
│              └─────────────────────────┘                    │
└─────────────────────────────────────────────────────────────┘
```

## Drag UX Flow

### 1. Drag Start
- Original item remains in its position
- Original item gets 50% opacity (ghost effect)
- Drag overlay follows the cursor

### 2. Drag Over Column
- Drop indicator appears at insertion point
- Indicator matches item width with 50% opacity
- Original item does NOT move or disappear

### 3. Drop
- Item removed from source column
- Item inserted at indicator position in target column
- Opacity restored to 100%
- State update fired (caller handles data update)

## Usage

### React

```tsx
import {
  BoardProvider,
  useBoardColumn,
  useBoardItem,
  DragOverlay,
  DropIndicator,
} from '@agallaoui/board-dnd/react';
import '@agallaoui/board-dnd/styles';

interface Task {
  id: string;
  title: string;
}

// Card component
function Card({ id, data, columnId, index }: {
  id: string;
  data: Task;
  columnId: string;
  index: number;
}) {
  const { ref, isDragging, style } = useBoardItem({
    id,
    data,
    columnId,
    index,
  });

  return (
    <div ref={ref} style={style} className="board-dnd-card">
      {data.title}
    </div>
  );
}

// Column component
function Column({ id, title, items }: {
  id: string;
  title: string;
  items: Task[];
}) {
  const { ref, itemsContainerRef, isOver, dropIndicator } = useBoardColumn({
    id,
    data: { title },
  });

  return (
    <div
      ref={ref}
      className={`board-dnd-column ${isOver ? 'board-dnd-column-over' : ''}`}
    >
      <h3 className="board-dnd-column-header">{title}</h3>
      <div ref={itemsContainerRef} className="board-dnd-column-items">
        {items.map((item, index) => (
          <React.Fragment key={item.id}>
            {dropIndicator?.insertIndex === index && <DropIndicator />}
            <Card
              id={item.id}
              data={item}
              columnId={id}
              index={index}
            />
          </React.Fragment>
        ))}
        {dropIndicator?.insertIndex === items.length && <DropIndicator />}
      </div>
    </div>
  );
}

// Board component
function Board() {
  const [columns, setColumns] = useState(initialColumns);

  const handleDrop = useCallback(({ item, fromColumnId, toColumnId, toIndex }) => {
    setColumns(cols => moveItem(cols, item.id, fromColumnId, toColumnId, toIndex));
  }, []);

  return (
    <BoardProvider onDrop={handleDrop}>
      <div className="board-dnd-board">
        {columns.map(col => (
          <Column key={col.id} id={col.id} title={col.title} items={col.items} />
        ))}
      </div>
      <DragOverlay>
        {(item) => (
          <div className="board-dnd-card">
            {item.data.title}
          </div>
        )}
      </DragOverlay>
    </BoardProvider>
  );
}
```

### Angular

```typescript
// board-dnd.service.ts
import { Injectable, OnDestroy } from '@angular/core';
import { BoardDndServiceBase, BoardDropResult } from '@agallaoui/board-dnd/angular';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class BoardDndService extends BoardDndServiceBase<TaskData> implements OnDestroy {
  readonly drop$ = new Subject<BoardDropResult<TaskData>>();
  readonly dragState$ = new BehaviorSubject(this.state);

  constructor() {
    super({
      callbacks: {
        onDrop: (result) => this.drop$.next(result),
      }
    });

    this.subscribe((state) => this.dragState$.next(state));
  }

  ngOnDestroy() {
    this.destroy();
    this.drop$.complete();
    this.dragState$.complete();
  }
}

// board-item.directive.ts
@Directive({ selector: '[boardItem]' })
export class BoardItemDirective implements OnInit, OnDestroy, OnChanges {
  @Input() boardItemId!: string;
  @Input() boardItemData!: TaskData;
  @Input() boardItemColumnId!: string;
  @Input() boardItemIndex!: number;

  @HostBinding('style.opacity')
  get opacity(): number {
    const state = this.boardService.state;
    return state.draggedItem?.id === this.boardItemId ? 0.5 : 1;
  }

  private handle: ReturnType<typeof this.boardService.registerItem> | null = null;

  constructor(
    private el: ElementRef<HTMLElement>,
    private boardService: BoardDndService
  ) {}

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

  ngOnChanges(changes: SimpleChanges) {
    if (this.handle) {
      this.handle.update({
        data: this.boardItemData,
        index: this.boardItemIndex,
      });
    }
  }

  ngOnDestroy() {
    this.handle?.destroy();
  }
}
```

### Vanilla JavaScript

```typescript
import { createBoardEngine } from '@agallaoui/board-dnd';

const engine = createBoardEngine({
  callbacks: {
    onDragStart: (item, columnId) => {
      // Add ghost class to source item
      const element = document.querySelector(`[data-id="${item.id}"]`);
      element?.classList.add('dragging');
    },
    onDrop: ({ item, fromColumnId, toColumnId, toIndex }) => {
      // Update your data structure
      const data = getData();
      moveItem(data, item.id, fromColumnId, toColumnId, toIndex);
      renderBoard(data);
    },
    onDragEnd: (item) => {
      // Remove ghost class
      document.querySelectorAll('.dragging').forEach(el => {
        el.classList.remove('dragging');
      });
    }
  }
});

// Register column
columns.forEach(column => {
  const el = document.getElementById(column.id);
  engine.registerColumn(el, {
    id: column.id,
    data: column,
    getItemPositions: () => getPositionsForColumn(column.id)
  });
});

// Register items
items.forEach(item => {
  const el = document.getElementById(item.id);
  engine.registerItem(el, {
    id: item.id,
    data: item,
    columnId: item.columnId,
    index: item.index
  });
});
```

## Drop Indicator Logic

The indicator position is calculated by comparing the pointer Y position to item midpoints:

```
┌─────────────────┐
│     Item 0      │ ← midpoint
├─────────────────┤
│     Item 1      │ ← midpoint
├─────────────────┤
│     Item 2      │ ← midpoint
└─────────────────┘

Pointer above Item 1 midpoint → Insert at index 1
Pointer below Item 1 midpoint → Insert at index 2
```

## API Reference

### `createBoardEngine(config?)`

Creates a board DnD engine instance.

**Config Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `animate` | `boolean` | `true` | Enable animations |
| `animationDuration` | `number` | `200` | Animation duration (ms) |
| `itemGap` | `number` | `8` | Gap between items (px) |
| `itemType` | `string` | `'board-item'` | Drag type identifier |
| `callbacks` | `BoardCallbacks` | `{}` | Event callbacks |

### Callbacks

```typescript
interface BoardCallbacks<TItem> {
  onDragStart?: (item: BoardItem<TItem>, columnId: DndId) => void;
  onDragOver?: (item: BoardItem<TItem>, columnId: DndId, insertIndex: number) => void;
  onDrop?: (result: BoardDropResult<TItem>) => void;
  onDragCancel?: (item: BoardItem<TItem>) => void;
}

interface BoardDropResult<TItem> {
  item: BoardItem<TItem>;
  fromColumnId: DndId;
  fromIndex: number;
  toColumnId: DndId;
  toIndex: number;
}
```

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
|--------|------------------------|
| Core | ~1.5kb |
| + React adapter | ~2.5kb |
| + Angular adapter | ~2.2kb |

## License

MIT
