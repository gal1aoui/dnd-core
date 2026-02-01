/**
 * Angular Adapter for @agallaoui/dnd-core
 *
 * Provides Angular directives and services for integrating the DnD engine.
 * These are thin wrappers that manage lifecycle and provide reactive state.
 *
 * ## Features
 *
 * - `DndService`: Injectable service managing the DnD engine
 * - `DraggableDirective`: Make elements draggable
 * - `DroppableDirective`: Make elements drop zones
 *
 * ## Usage
 *
 * ```typescript
 * // In your module
 * import { DndModule } from '@agallaoui/dnd-core/angular';
 *
 * @NgModule({
 *   imports: [DndModule]
 * })
 * export class AppModule {}
 *
 * // In your component template
 * <div
 *   dndDraggable
 *   [dndId]="item.id"
 *   [dndType]="'card'"
 *   [dndPayload]="item"
 * >
 *   {{ item.title }}
 * </div>
 * ```
 *
 * Note: This file provides the type definitions and a vanilla JS implementation.
 * For full Angular integration, wrap these in proper Angular decorators in your project.
 */

import { createDndEngine, type DndEngine } from '../engine';
import type {
  DndConfig,
  DndState,
  DraggableOptions,
  DroppableOptions,
  DndId,
} from '../types';

/**
 * Configuration for Angular DnD service
 */
export interface DndServiceConfig<TDrag = unknown, TDrop = unknown>
  extends DndConfig<TDrag, TDrop> {}

/**
 * DnD Service for Angular
 *
 * This is a framework-agnostic implementation that can be wrapped
 * in an Angular @Injectable decorator.
 *
 * @example
 * ```typescript
 * @Injectable({ providedIn: 'root' })
 * export class DndService extends DndServiceBase<CardData, ColumnData> {
 *   constructor() {
 *     super({
 *       callbacks: {
 *         onDrop: (e) => this.handleDrop(e)
 *       }
 *     });
 *   }
 * }
 * ```
 */
export class DndServiceBase<TDrag = unknown, TDrop = unknown> {
  private engine: DndEngine<TDrag, TDrop>;
  private stateListeners: Set<(state: DndState<TDrag, TDrop>) => void> =
    new Set();
  private _state: DndState<TDrag, TDrop>;

  constructor(config: DndServiceConfig<TDrag, TDrop> = {}) {
    this.engine = createDndEngine<TDrag, TDrop>(config);
    this._state = this.engine.getState();

    // Subscribe to state changes
    this.engine.subscribe((state) => {
      this._state = state;
      this.stateListeners.forEach((listener) => listener(state));
    });
  }

  /**
   * Current DnD state
   */
  get state(): DndState<TDrag, TDrop> {
    return this._state;
  }

  /**
   * Subscribe to state changes
   */
  subscribe(callback: (state: DndState<TDrag, TDrop>) => void): () => void {
    this.stateListeners.add(callback);
    return () => this.stateListeners.delete(callback);
  }

  /**
   * Register an element as draggable
   */
  registerDraggable(element: HTMLElement, options: DraggableOptions<TDrag>) {
    return this.engine.registerDraggable(element, options);
  }

  /**
   * Register an element as a drop zone
   */
  registerDroppable(element: HTMLElement, options: DroppableOptions<TDrop>) {
    return this.engine.registerDroppable(element, options);
  }

  /**
   * Cancel current drag operation
   */
  cancel(): void {
    this.engine.cancel();
  }

  /**
   * Update engine configuration
   */
  updateConfig(config: Partial<DndConfig<TDrag, TDrop>>): void {
    this.engine.updateConfig(config);
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.engine.destroy();
    this.stateListeners.clear();
  }
}

/**
 * Input configuration for draggable directive
 */
export interface DraggableDirectiveInputs<T = unknown> {
  dndId: DndId;
  dndType: string;
  dndPayload: T;
  dndDisabled?: boolean;
  dndHandleSelector?: string;
}

/**
 * Input configuration for droppable directive
 */
export interface DroppableDirectiveInputs<T = unknown> {
  dndId: DndId;
  dndAccepts?: string[];
  dndPayload: T;
  dndDisabled?: boolean;
}

/**
 * Helper function to create a draggable directive behavior
 *
 * Use this in your Angular directive's ngOnInit/ngOnDestroy lifecycle
 *
 * @example
 * ```typescript
 * @Directive({ selector: '[dndDraggable]' })
 * export class DraggableDirective implements OnInit, OnDestroy, OnChanges {
 *   @Input() dndId!: string;
 *   @Input() dndType!: string;
 *   @Input() dndPayload: any;
 *   @Input() dndDisabled = false;
 *
 *   private handle: DraggableHandle | null = null;
 *
 *   constructor(
 *     private el: ElementRef<HTMLElement>,
 *     private dndService: DndService
 *   ) {}
 *
 *   ngOnInit() {
 *     this.handle = this.dndService.registerDraggable(
 *       this.el.nativeElement,
 *       {
 *         id: this.dndId,
 *         type: this.dndType,
 *         payload: this.dndPayload,
 *         disabled: this.dndDisabled,
 *       }
 *     );
 *   }
 *
 *   ngOnChanges() {
 *     this.handle?.update({
 *       disabled: this.dndDisabled,
 *       payload: this.dndPayload,
 *     });
 *   }
 *
 *   ngOnDestroy() {
 *     this.handle?.destroy();
 *   }
 * }
 * ```
 */
export function createDraggableDirective<TDrag, TDrop>(
  service: DndServiceBase<TDrag, TDrop>,
  element: HTMLElement,
  inputs: DraggableDirectiveInputs<TDrag>
) {
  const handle = service.registerDraggable(element, {
    id: inputs.dndId,
    type: inputs.dndType,
    payload: inputs.dndPayload,
    disabled: inputs.dndDisabled,
    handleSelector: inputs.dndHandleSelector,
  });

  return {
    update: (newInputs: Partial<DraggableDirectiveInputs<TDrag>>) => {
      handle.update({
        disabled: newInputs.dndDisabled,
        payload: newInputs.dndPayload,
        handleSelector: newInputs.dndHandleSelector,
      });
    },
    destroy: () => handle.destroy(),
    isDragging: () => handle.isDragging(),
  };
}

/**
 * Helper function to create a droppable directive behavior
 *
 * @example
 * ```typescript
 * @Directive({ selector: '[dndDroppable]' })
 * export class DroppableDirective implements OnInit, OnDestroy {
 *   @Input() dndId!: string;
 *   @Input() dndAccepts: string[] = [];
 *   @Input() dndPayload: any;
 *
 *   private handle: DroppableHandle | null = null;
 *
 *   constructor(
 *     private el: ElementRef<HTMLElement>,
 *     private dndService: DndService
 *   ) {}
 *
 *   ngOnInit() {
 *     this.handle = this.dndService.registerDroppable(
 *       this.el.nativeElement,
 *       {
 *         id: this.dndId,
 *         accepts: this.dndAccepts,
 *         payload: this.dndPayload,
 *       }
 *     );
 *   }
 *
 *   ngOnDestroy() {
 *     this.handle?.destroy();
 *   }
 * }
 * ```
 */
export function createDroppableDirective<TDrag, TDrop>(
  service: DndServiceBase<TDrag, TDrop>,
  element: HTMLElement,
  inputs: DroppableDirectiveInputs<TDrop>
) {
  const handle = service.registerDroppable(element, {
    id: inputs.dndId,
    accepts: inputs.dndAccepts,
    payload: inputs.dndPayload,
    disabled: inputs.dndDisabled,
  });

  return {
    update: (newInputs: Partial<DroppableDirectiveInputs<TDrop>>) => {
      handle.update({
        disabled: newInputs.dndDisabled,
        accepts: newInputs.dndAccepts,
        payload: newInputs.dndPayload,
      });
    },
    destroy: () => handle.destroy(),
    isOver: () => handle.isOver(),
  };
}

// Re-export types
export type {
  DndConfig,
  DndState,
  DndCallbacks,
  DraggableOptions,
  DroppableOptions,
  DragStartEvent,
  DragOverEvent,
  DropEvent,
  DragEndEvent,
  DndId,
  DragData,
  DropZoneData,
} from '../types';

export { createDndEngine, type DndEngine } from '../engine';
