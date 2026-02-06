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
   * Check if a specific item is currently being dragged
   */
  isItemDragging(itemId: DndId): boolean {
    return this._state.isDragging && this._state.draggedItem?.id === itemId;
  }

  /**
   * Get drop indicator for a specific column (null if not hovering)
   */
  getDropIndicatorForColumn(columnId: DndId) {
    const indicator = this._state.dropIndicator;
    return indicator?.columnId === columnId ? indicator : null;
  }

  /**
   * Get the source column ID of the current drag
   */
  get sourceColumnId(): DndId | null {
    return this._state.sourceColumnId;
  }

  /**
   * Get the currently dragged item
   */
  get draggedItem() {
    return this._state.draggedItem;
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

// ============================================================================
// Board Settings Manager
// ============================================================================

import type { BoardSettings } from '../types';
import { defaultBoardSettings } from '../types';

/**
 * Settings manager for Angular board DnD
 *
 * Provides settings management with localStorage persistence.
 * Wrap in an Angular @Injectable() service for DI.
 *
 * @example
 * ```typescript
 * @Injectable({ providedIn: 'root' })
 * export class BoardSettingsService extends BoardSettingsManager {
 *   constructor() {
 *     super({
 *       storageKey: 'board-settings',
 *       initialSettings: { ghostOpacity: 0.3 },
 *     });
 *   }
 * }
 * ```
 */
export class BoardSettingsManager {
  private _settings: Required<BoardSettings>;
  private _storageKey?: string;
  private listeners: Set<(settings: Required<BoardSettings>) => void> = new Set();

  constructor(options: {
    storageKey?: string;
    initialSettings?: BoardSettings;
  } = {}) {
    this._storageKey = options.storageKey;

    // Load from storage
    let stored: BoardSettings = {};
    if (options.storageKey && typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(options.storageKey);
        if (raw) stored = JSON.parse(raw);
      } catch {
        // Ignore parse errors
      }
    }

    this._settings = {
      ...defaultBoardSettings,
      ...stored,
      ...options.initialSettings,
    };
  }

  get settings(): Required<BoardSettings> {
    return this._settings;
  }

  updateSettings(updates: Partial<BoardSettings>): void {
    this._settings = { ...this._settings, ...updates };
    this.persist();
    this.listeners.forEach((fn) => fn(this._settings));
  }

  resetSettings(): void {
    this._settings = { ...defaultBoardSettings };
    this.persist();
    this.listeners.forEach((fn) => fn(this._settings));
  }

  subscribe(callback: (settings: Required<BoardSettings>) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  destroy(): void {
    this.listeners.clear();
  }

  private persist(): void {
    if (this._storageKey && typeof window !== 'undefined') {
      localStorage.setItem(this._storageKey, JSON.stringify(this._settings));
    }
  }
}

// ============================================================================
// Utility: Adjusted insert index for same-column drags
// ============================================================================

/**
 * Calculate the adjusted insert index for same-column drags
 *
 * When dragging within the same column, the dragged item is still in the DOM,
 * so the insert index needs adjustment to account for it.
 *
 * @example
 * ```typescript
 * const adjustedIndex = getAdjustedInsertIndex(
 *   dropIndicator.insertIndex,
 *   items,
 *   boardService.sourceColumnId === columnId,
 *   boardService.draggedItem?.id
 * );
 * ```
 */
export function getAdjustedInsertIndex(
  insertIndex: number,
  items: Array<{ id: DndId }>,
  isDraggingFromThisColumn: boolean,
  draggedItemId: DndId | undefined
): number {
  if (!isDraggingFromThisColumn || !draggedItemId) return insertIndex;

  const draggedOriginalIndex = items.findIndex((item) => item.id === draggedItemId);
  if (draggedOriginalIndex !== -1 && insertIndex > draggedOriginalIndex) {
    return insertIndex + 1;
  }
  return insertIndex;
}

// Re-export settings
export { defaultBoardSettings } from '../types';

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
  BoardSettings,
} from '../types';

export type { ItemPosition } from '../board-engine';
export type { DndId } from '@agallaoui/dnd-core';
