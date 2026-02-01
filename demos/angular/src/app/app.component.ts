import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { BoardDndService, TaskData } from './board-dnd.service';
import { BoardColumnDirective } from './board-column.directive';
import { BoardItemDirective } from './board-item.directive';
import type { BoardDropResult, DropIndicatorPosition } from '@agallaoui/board-dnd/angular';

/**
 * Column data interface
 */
interface Column {
  id: string;
  title: string;
  items: TaskData[];
}

/**
 * Initial board data
 */
const initialColumns: Column[] = [
  {
    id: 'todo',
    title: 'To Do',
    items: [
      {
        id: 'task-1',
        title: 'Research DnD libraries',
        description: 'Compare existing solutions and identify gaps',
        priority: 'high',
      },
      {
        id: 'task-2',
        title: 'Design API',
        description: 'Create clean, minimal public API',
        priority: 'high',
      },
      {
        id: 'task-3',
        title: 'Setup monorepo',
        description: 'Configure npm workspaces',
        priority: 'medium',
      },
    ],
  },
  {
    id: 'in-progress',
    title: 'In Progress',
    items: [
      {
        id: 'task-4',
        title: 'Implement core engine',
        description: 'Build pointer event handlers',
        priority: 'high',
      },
      {
        id: 'task-5',
        title: 'Add TypeScript types',
        description: 'Strong typing for all APIs',
        priority: 'medium',
      },
    ],
  },
  {
    id: 'review',
    title: 'Review',
    items: [
      {
        id: 'task-6',
        title: 'Write unit tests',
        description: 'Test core functionality',
        priority: 'medium',
      },
    ],
  },
  {
    id: 'done',
    title: 'Done',
    items: [
      {
        id: 'task-7',
        title: 'Project kickoff',
        description: 'Initial planning complete',
        priority: 'low',
      },
    ],
  },
];

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, BoardColumnDirective, BoardItemDirective],
  template: `
    <div class="app">
      <header class="app-header">
        <h1>&#64;agallaoui/board-dnd Angular Demo</h1>
        <p>Drag tasks between columns to reorganize your board</p>
      </header>

      <div class="board">
        <div
          *ngFor="let column of columns"
          class="column"
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
              <!-- Drop indicator before item -->
              <div
                *ngIf="getDropIndicator(column.id)?.insertIndex === i"
                class="drop-indicator"
              ></div>

              <!-- Task card -->
              <div
                class="task-card"
                boardItem
                [boardItemId]="task.id"
                [boardItemData]="task"
                [boardItemColumnId]="column.id"
                [boardItemIndex]="i"
              >
                <div class="task-header">
                  <span class="task-title">{{ task.title }}</span>
                  <span
                    class="priority-badge"
                    [ngClass]="'priority-' + task.priority"
                  >
                    {{ task.priority }}
                  </span>
                </div>
                <p class="task-description">{{ task.description }}</p>
              </div>
            </ng-container>

            <!-- Drop indicator at end -->
            <div
              *ngIf="getDropIndicator(column.id)?.insertIndex === column.items.length"
              class="drop-indicator"
            ></div>
          </div>
        </div>
      </div>

      <!-- Drag overlay -->
      <div
        *ngIf="draggedItem"
        class="drag-overlay"
        [style.left.px]="overlayPosition.x"
        [style.top.px]="overlayPosition.y"
      >
        <div class="task-card overlay">
          <div class="task-header">
            <span class="task-title">{{ draggedItem.title }}</span>
            <span
              class="priority-badge"
              [ngClass]="'priority-' + draggedItem.priority"
            >
              {{ draggedItem.priority }}
            </span>
          </div>
          <p class="task-description">{{ draggedItem.description }}</p>
        </div>
      </div>

      <footer class="app-footer">
        <p>
          Built with
          <a
            href="https://github.com/agallaoui/dnd"
            target="_blank"
            rel="noopener noreferrer"
          >
            &#64;agallaoui/board-dnd
          </a>
        </p>
      </footer>
    </div>
  `,
  styles: [],
})
export class AppComponent implements OnInit, OnDestroy {
  columns: Column[] = [...initialColumns.map((c) => ({ ...c, items: [...c.items] }))];
  draggedItem: TaskData | null = null;
  overlayPosition = { x: 0, y: 0 };
  private dragOffset = { x: 0, y: 0 };

  private subscriptions: Subscription[] = [];
  private pointermoveHandler = (e: PointerEvent) => {
    // Apply drag offset so overlay appears where user grabbed the item
    this.overlayPosition = {
      x: e.clientX - this.dragOffset.x,
      y: e.clientY - this.dragOffset.y,
    };
  };

  constructor(private boardService: BoardDndService) {}

  ngOnInit(): void {
    // Subscribe to drop events
    this.subscriptions.push(
      this.boardService.drop$.subscribe((result) => this.handleDrop(result))
    );

    // Subscribe to drag state for overlay
    this.subscriptions.push(
      this.boardService.dragState$.subscribe((state) => {
        this.draggedItem = state.draggedItem?.data ?? null;
        // Capture drag offset for proper overlay positioning
        this.dragOffset = state.dragOffset ?? { x: 0, y: 0 };
        if (this.draggedItem) {
          window.addEventListener('pointermove', this.pointermoveHandler);
        } else {
          window.removeEventListener('pointermove', this.pointermoveHandler);
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((s) => s.unsubscribe());
    window.removeEventListener('pointermove', this.pointermoveHandler);
  }

  /**
   * Get drop indicator for a column
   */
  getDropIndicator(columnId: string): DropIndicatorPosition | null {
    return this.boardService.getDropIndicatorForColumn(columnId);
  }

  /**
   * Handle drop event - move item between columns
   */
  private handleDrop(result: BoardDropResult<TaskData>): void {
    const { fromColumnId, fromIndex, toColumnId, toIndex } = result;

    // Find source and target columns
    const sourceCol = this.columns.find((c) => c.id === fromColumnId);
    const targetCol = this.columns.find((c) => c.id === toColumnId);

    if (!sourceCol || !targetCol) return;

    // Remove from source
    const [movedItem] = sourceCol.items.splice(fromIndex, 1);

    // Adjust target index if moving within same column
    let adjustedIndex = toIndex;
    if (fromColumnId === toColumnId && fromIndex < toIndex) {
      adjustedIndex = toIndex;
    }

    // Insert at target
    targetCol.items.splice(adjustedIndex, 0, movedItem);

    // Trigger change detection
    this.columns = [...this.columns];
  }
}
