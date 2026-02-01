/**
 * Angular Adapter for @agallaoui/board-dnd
 *
 * Provides Angular services and directive helpers for Kanban-style boards.
 *
 * ## Features
 *
 * - `BoardDndServiceBase`: Injectable service for board DnD state
 * - Directive helpers for columns and items
 * - Reactive state with RxJS-friendly subscription
 *
 * ## Usage
 *
 * ```typescript
 * // board-dnd.service.ts
 * import { Injectable, OnDestroy } from '@angular/core';
 * import { BoardDndServiceBase } from '@agallaoui/board-dnd/angular';
 * import { Subject } from 'rxjs';
 *
 * @Injectable({ providedIn: 'root' })
 * export class BoardDndService extends BoardDndServiceBase implements OnDestroy {
 *   drop$ = new Subject<BoardDropResult>();
 *
 *   constructor() {
 *     super({
 *       callbacks: {
 *         onDrop: (result) => this.drop$.next(result)
 *       }
 *     });
 *   }
 *
 *   ngOnDestroy() {
 *     this.destroy();
 *     this.drop$.complete();
 *   }
 * }
 * ```
 */

import {
  createBoardEngine,
  type BoardEngine,
  type ItemPosition,
} from '../board-engine';

import type {
  BoardConfig,
  BoardDragState,
} from '../types';

import type { DndId } from '@agallaoui/dnd-core';

/**
 * Configuration for Angular board service
 */
export interface BoardDndServiceConfig<TItem = unknown>
  extends BoardConfig<TItem> {}

/**
 * Board DnD Service Base Class for Angular
 *
 * Extend this class to create an Angular injectable service.
 * Provides board-specific DnD functionality with reactive state.
 *
 * ## State Management
 *
 * The service maintains reactive state that can be:
 * - Subscribed to via the `subscribe` method
 * - Converted to an RxJS Observable for Angular patterns
 * - Accessed synchronously via `state` getter
 *
 * @example
 * ```typescript
 * @Injectable({ providedIn: 'root' })
 * export class BoardDndService extends BoardDndServiceBase<TaskData> {
 *   // Create RxJS subject for Angular patterns
 *   private stateSubject = new BehaviorSubject(this.state);
 *   state$ = this.stateSubject.asObservable();
 *
 *   constructor() {
 *     super({
 *       callbacks: {
 *         onDrop: (result) => this.handleDrop(result)
 *       }
 *     });
 *
 *     // Bridge engine subscription to RxJS
 *     this.subscribe((state) => this.stateSubject.next(state));
 *   }
 *
 *   private handleDrop(result: BoardDropResult<TaskData>) {
 *     // Emit to your store or make API call
 *   }
 * }
 * ```
 */
export class BoardDndServiceBase<TItem = unknown, TColumn = unknown> {
  private engine: BoardEngine<TItem, TColumn>;
  private stateListeners: Set<(state: BoardDragState<TItem>) => void> =
    new Set();
  private _state: BoardDragState<TItem>;

  constructor(config: BoardDndServiceConfig<TItem> = {}) {
    this.engine = createBoardEngine<TItem, TColumn>(config);
    this._state = this.engine.getState();

    // Subscribe to engine state changes
    this.engine.subscribe((state) => {
      this._state = state;
      this.stateListeners.forEach((listener) => listener(state));
    });
  }

  /**
   * Current board drag state
   */
  get state(): BoardDragState<TItem> {
    return this._state;
  }

  /**
   * Subscribe to state changes
   *
   * @returns Unsubscribe function
   */
  subscribe(callback: (state: BoardDragState<TItem>) => void): () => void {
    this.stateListeners.add(callback);
    return () => this.stateListeners.delete(callback);
  }

  /**
   * Register an element as a column (drop zone)
   */
  registerColumn(
    element: HTMLElement,
    options: {
      id: DndId;
      data: TColumn;
      getItemPositions: () => ItemPosition[];
    }
  ) {
    return this.engine.registerColumn(element, options);
  }

  /**
   * Register an element as a draggable item
   */
  registerItem(
    element: HTMLElement,
    options: {
      id: DndId;
      data: TItem;
      columnId: DndId;
      index: number;
      disabled?: boolean;
    }
  ) {
    return this.engine.registerItem(element, options);
  }

  /**
   * Cancel current drag operation
   */
  cancel(): void {
    this.engine.cancel();
  }

  /**
   * Clean up resources (call in ngOnDestroy)
   */
  destroy(): void {
    this.engine.destroy();
    this.stateListeners.clear();
  }
}

/**
 * Input configuration for board column directive
 */
export interface BoardColumnDirectiveInputs<TColumn = unknown> {
  /** Unique column ID */
  boardColumnId: DndId;
  /** Column metadata */
  boardColumnData: TColumn;
  /** Whether dropping is disabled */
  boardColumnDisabled?: boolean;
}

/**
 * Input configuration for board item directive
 */
export interface BoardItemDirectiveInputs<TItem = unknown> {
  /** Unique item ID */
  boardItemId: DndId;
  /** Item data */
  boardItemData: TItem;
  /** ID of containing column */
  boardItemColumnId: DndId;
  /** Index within column */
  boardItemIndex: number;
  /** Whether dragging is disabled */
  boardItemDisabled?: boolean;
}

/**
 * Helper to create column directive logic
 *
 * Use in your Angular directive's lifecycle hooks.
 *
 * @example
 * ```typescript
 * @Directive({ selector: '[boardColumn]' })
 * export class BoardColumnDirective implements OnInit, OnDestroy, OnChanges {
 *   @Input() boardColumnId!: string;
 *   @Input() boardColumnData: any;
 *   @Input() boardColumnDisabled = false;
 *
 *   @ContentChildren(BoardItemDirective, { read: ElementRef })
 *   itemElements!: QueryList<ElementRef>;
 *
 *   private handle: ReturnType<typeof createBoardColumnDirective> | null = null;
 *
 *   constructor(
 *     private el: ElementRef<HTMLElement>,
 *     private boardService: BoardDndService
 *   ) {}
 *
 *   ngOnInit() {
 *     this.handle = createBoardColumnDirective(
 *       this.boardService,
 *       this.el.nativeElement,
 *       {
 *         boardColumnId: this.boardColumnId,
 *         boardColumnData: this.boardColumnData,
 *         boardColumnDisabled: this.boardColumnDisabled,
 *       },
 *       () => this.getItemPositions()
 *     );
 *   }
 *
 *   private getItemPositions(): ItemPosition[] {
 *     // Calculate from itemElements
 *   }
 *
 *   ngOnDestroy() {
 *     this.handle?.destroy();
 *   }
 * }
 * ```
 */
export function createBoardColumnDirective<TItem, TColumn>(
  service: BoardDndServiceBase<TItem, TColumn>,
  element: HTMLElement,
  inputs: BoardColumnDirectiveInputs<TColumn>,
  getItemPositions: () => ItemPosition[]
) {
  const handle = service.registerColumn(element, {
    id: inputs.boardColumnId,
    data: inputs.boardColumnData,
    getItemPositions,
  });

  return {
    update: (newInputs: Partial<BoardColumnDirectiveInputs<TColumn>>) => {
      handle.update({
        data: newInputs.boardColumnData,
        disabled: newInputs.boardColumnDisabled,
      });
    },
    destroy: () => handle.destroy(),
  };
}

/**
 * Helper to create item directive logic
 *
 * @example
 * ```typescript
 * @Directive({ selector: '[boardItem]' })
 * export class BoardItemDirective implements OnInit, OnDestroy, OnChanges {
 *   @Input() boardItemId!: string;
 *   @Input() boardItemData: any;
 *   @Input() boardItemColumnId!: string;
 *   @Input() boardItemIndex!: number;
 *
 *   @HostBinding('style.opacity')
 *   get opacity() {
 *     return this.isDragging ? 0.5 : 1;
 *   }
 *
 *   private handle: ReturnType<typeof createBoardItemDirective> | null = null;
 *   private isDragging = false;
 *
 *   constructor(
 *     private el: ElementRef<HTMLElement>,
 *     private boardService: BoardDndService
 *   ) {}
 *
 *   ngOnInit() {
 *     this.handle = createBoardItemDirective(
 *       this.boardService,
 *       this.el.nativeElement,
 *       {
 *         boardItemId: this.boardItemId,
 *         boardItemData: this.boardItemData,
 *         boardItemColumnId: this.boardItemColumnId,
 *         boardItemIndex: this.boardItemIndex,
 *       }
 *     );
 *
 *     // Subscribe to drag state for this item
 *     this.boardService.subscribe((state) => {
 *       this.isDragging = state.draggedItem?.id === this.boardItemId;
 *     });
 *   }
 *
 *   ngOnDestroy() {
 *     this.handle?.destroy();
 *   }
 * }
 * ```
 */
export function createBoardItemDirective<TItem, TColumn>(
  service: BoardDndServiceBase<TItem, TColumn>,
  element: HTMLElement,
  inputs: BoardItemDirectiveInputs<TItem>
) {
  // Add data attributes for position calculation
  element.setAttribute('data-board-item', 'true');
  element.setAttribute('data-board-item-id', String(inputs.boardItemId));

  const handle = service.registerItem(element, {
    id: inputs.boardItemId,
    data: inputs.boardItemData,
    columnId: inputs.boardItemColumnId,
    index: inputs.boardItemIndex,
    disabled: inputs.boardItemDisabled,
  });

  return {
    update: (newInputs: Partial<BoardItemDirectiveInputs<TItem>>) => {
      if (newInputs.boardItemId !== undefined) {
        element.setAttribute('data-board-item-id', String(newInputs.boardItemId));
      }
      handle.update({
        data: newInputs.boardItemData,
        index: newInputs.boardItemIndex,
        disabled: newInputs.boardItemDisabled,
      });
    },
    destroy: () => {
      element.removeAttribute('data-board-item');
      element.removeAttribute('data-board-item-id');
      handle.destroy();
    },
  };
}

// Re-export types
export type {
  BoardConfig,
  BoardCallbacks,
  BoardDragState,
  BoardItem,
  BoardDropResult,
  BoardColumn,
  BoardState,
  DropIndicatorPosition,
} from '../types';

export type { ItemPosition } from '../board-engine';
export type { DndId } from '@agallaoui/dnd-core';
