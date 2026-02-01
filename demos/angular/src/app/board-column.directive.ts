import {
  Directive,
  ElementRef,
  Input,
  OnInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  ContentChildren,
  QueryList,
  AfterContentInit,
  HostBinding,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { BoardDndService } from './board-dnd.service';
import { BoardItemDirective } from './board-item.directive';
import type { ItemPosition } from '@agallaoui/board-dnd/angular';

/**
 * Directive to make an element a board column (drop zone)
 *
 * @example
 * ```html
 * <div
 *   boardColumn
 *   [boardColumnId]="column.id"
 *   [boardColumnData]="column"
 * >
 *   <div class="items">
 *     <div *ngFor="let task of column.items; let i = index"
 *       boardItem
 *       [boardItemId]="task.id"
 *       [boardItemData]="task"
 *       [boardItemColumnId]="column.id"
 *       [boardItemIndex]="i"
 *     >
 *       {{ task.title }}
 *     </div>
 *   </div>
 * </div>
 * ```
 */
@Directive({
  selector: '[boardColumn]',
  standalone: true,
})
export class BoardColumnDirective
  implements OnInit, OnDestroy, OnChanges, AfterContentInit
{
  @Input({ required: true }) boardColumnId!: string;
  @Input() boardColumnData: unknown = {};
  @Input() boardColumnDisabled = false;

  @ContentChildren(BoardItemDirective, { read: ElementRef, descendants: true })
  itemElements!: QueryList<ElementRef<HTMLElement>>;

  private handle: ReturnType<typeof this.boardService.registerColumn> | null =
    null;
  private subscription: Subscription | null = null;
  private isOver = false;

  /**
   * Add highlight class when item is over column
   */
  @HostBinding('class.column-over')
  get overClass(): boolean {
    return this.isOver;
  }

  constructor(
    private el: ElementRef<HTMLElement>,
    private boardService: BoardDndService
  ) {}

  ngOnInit(): void {
    // Register with board engine
    this.handle = this.boardService.registerColumn(this.el.nativeElement, {
      id: this.boardColumnId,
      data: this.boardColumnData,
      getItemPositions: () => this.getItemPositions(),
    });

    // Subscribe to drag state for this column
    this.subscription = this.boardService.dragState$.subscribe((state) => {
      this.isOver = state.dropIndicator?.columnId === this.boardColumnId;
    });
  }

  ngAfterContentInit(): void {
    // Items are now available
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (
      this.handle &&
      (changes['boardColumnData'] || changes['boardColumnDisabled'])
    ) {
      this.handle.update({
        data: this.boardColumnData,
        disabled: this.boardColumnDisabled,
      });
    }
  }

  ngOnDestroy(): void {
    this.handle?.destroy();
    this.subscription?.unsubscribe();
  }

  /**
   * Calculate positions of all items in this column
   * Uses client coordinates to match pointer position during drag
   */
  private getItemPositions(): ItemPosition[] {
    const positions: ItemPosition[] = [];

    // Query all board items in this column
    const items = this.el.nativeElement.querySelectorAll('[data-board-item]');
    items.forEach((el, index) => {
      const rect = el.getBoundingClientRect();
      const id = el.getAttribute('data-board-item-id');
      if (id) {
        positions.push({
          id,
          index,
          top: rect.top,       // Client coordinates (matches pointer position)
          bottom: rect.bottom, // Client coordinates
          height: rect.height,
        });
      }
    });

    return positions;
  }
}
