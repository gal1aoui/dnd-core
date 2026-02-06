import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import {
  BoardDndServiceBase,
  type BoardDragState,
  type BoardDropResult,
} from '@agallaoui/board-dnd/angular';
import type { Task } from '../types';

/**
 * Angular service wrapping the board DnD engine
 *
 * Provides RxJS observables for reactive state management
 * and handles cleanup on destroy.
 */
@Injectable({ providedIn: 'root' })
export class BoardDndService
  extends BoardDndServiceBase<Task>
  implements OnDestroy
{
  /**
   * Observable stream of drop events
   */
  readonly drop$ = new Subject<BoardDropResult<Task>>();

  /**
   * Observable stream of drag state changes
   */
  private readonly _dragState$ = new BehaviorSubject<BoardDragState<Task>>(
    this.state
  );
  readonly dragState$ = this._dragState$.asObservable();

  constructor() {
    super({
      callbacks: {
        onDragStart: (item, columnId) => {
          console.log(`Started dragging ${item.id} from ${columnId}`);
        },
        onDragOver: (item, columnId, insertIndex) => {
          // Optional: track hover position
        },
        onDrop: (result) => {
          this.drop$.next(result);
        },
        onDragCancel: (item) => {
          console.log(`Cancelled dragging ${item.id}`);
        },
      },
    });

    // Bridge engine subscription to RxJS
    this.subscribe((state) => {
      this._dragState$.next(state);
    });
  }

  ngOnDestroy(): void {
    this.destroy();
    this.drop$.complete();
    this._dragState$.complete();
  }
}
