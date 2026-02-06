import {
  Directive,
  ElementRef,
  Input,
  OnInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  HostBinding,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { BoardDndService } from '../services';
import type { Task } from '../types';

/**
 * Directive to make an element a draggable board item
 *
 * @example
 * ```html
 * <div
 *   boardItem
 *   [boardItemId]="task.id"
 *   [boardItemData]="task"
 *   [boardItemColumnId]="columnId"
 *   [boardItemIndex]="index"
 * >
 *   {{ task.title }}
 * </div>
 * ```
 */
@Directive({
  selector: '[boardItem]',
  standalone: true,
})
export class BoardItemDirective implements OnInit, OnDestroy, OnChanges {
  @Input({ required: true }) boardItemId!: string;
  @Input({ required: true }) boardItemData!: Task;
  @Input({ required: true }) boardItemColumnId!: string;
  @Input({ required: true }) boardItemIndex!: number;
  @Input() boardItemDisabled = false;

  private handle: ReturnType<typeof this.boardService.registerItem> | null =
    null;
  private subscription: Subscription | null = null;
  private isDragging = false;

  /**
   * Apply ghost opacity when this item is being dragged
   */
  @HostBinding('style.opacity')
  get opacity(): number {
    return this.isDragging ? 0.5 : 1;
  }

  /**
   * Apply grab cursor
   */
  @HostBinding('style.cursor')
  get cursor(): string {
    return this.boardItemDisabled ? 'default' : 'grab';
  }

  /**
   * Disable text selection
   */
  @HostBinding('style.userSelect')
  readonly userSelect = 'none';

  /**
   * Disable touch scrolling
   */
  @HostBinding('style.touchAction')
  readonly touchAction = 'none';

  constructor(
    private el: ElementRef<HTMLElement>,
    private boardService: BoardDndService
  ) {}

  ngOnInit(): void {
    // Add data attributes for position calculation
    const element = this.el.nativeElement;
    element.setAttribute('data-board-item', 'true');
    element.setAttribute('data-board-item-id', this.boardItemId);

    // Register with board engine
    this.handle = this.boardService.registerItem(element, {
      id: this.boardItemId,
      data: this.boardItemData,
      columnId: this.boardItemColumnId,
      index: this.boardItemIndex,
      disabled: this.boardItemDisabled,
    });

    // Subscribe to drag state for this item
    this.subscription = this.boardService.dragState$.subscribe((state) => {
      this.isDragging = state.draggedItem?.id === this.boardItemId;
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (
      this.handle &&
      (changes['boardItemData'] ||
        changes['boardItemIndex'] ||
        changes['boardItemDisabled'])
    ) {
      this.handle.update({
        data: this.boardItemData,
        index: this.boardItemIndex,
        disabled: this.boardItemDisabled,
      });
    }

    if (changes['boardItemId'] && this.el.nativeElement) {
      this.el.nativeElement.setAttribute(
        'data-board-item-id',
        this.boardItemId
      );
    }
  }

  ngOnDestroy(): void {
    this.handle?.destroy();
    this.subscription?.unsubscribe();
    this.el.nativeElement.removeAttribute('data-board-item');
    this.el.nativeElement.removeAttribute('data-board-item-id');
  }
}
