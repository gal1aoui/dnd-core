import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { Column, Task } from '../../types';
import { BoardDndService } from '../../services';
import { BoardColumnDirective, BoardItemDirective } from '../../directives';
import { TicketCardComponent } from '../ticket';

/**
 * Board column component with drop zone functionality
 * Handles drop indicator positioning for both cross-column and same-column drags
 */
@Component({
  selector: 'app-board-column',
  standalone: true,
  imports: [
    CommonModule,
    BoardColumnDirective,
    BoardItemDirective,
    TicketCardComponent,
  ],
  templateUrl: './board-column.component.html',
  styleUrl: './board-column.component.scss',
})
export class BoardColumnComponent {
  @Input({ required: true }) column!: Column;

  constructor(private boardService: BoardDndService) {}

  /**
   * Check if we should show the drop indicator at a given index
   */
  shouldShowIndicatorAt(index: number, taskId: string): boolean {
    const adjustedIndex = this.getAdjustedInsertIndex();
    if (adjustedIndex === null) return false;

    // Don't show indicator at the dragged item's position
    const draggedItemId = this.boardService.state.draggedItem?.id;
    if (taskId === draggedItemId) return false;

    return adjustedIndex === index;
  }

  /**
   * Get the adjusted insert index for UI rendering
   * When dragging within the same column, the engine calculates positions
   * excluding the dragged item, so we need to adjust for display
   */
  getAdjustedInsertIndex(): number | null {
    const indicator = this.boardService.getDropIndicatorForColumn(this.column.id);
    if (!indicator) return null;

    const isDraggingFromThisColumn =
      this.boardService.state.sourceColumnId === this.column.id;

    if (!isDraggingFromThisColumn) {
      return indicator.insertIndex;
    }

    // Find the original index of the dragged item
    const draggedItemId = this.boardService.state.draggedItem?.id;
    const draggedOriginalIndex = this.column.items.findIndex(
      (item: Task) => item.id === draggedItemId
    );

    // Adjust the insert index to account for the dragged item still being in the list
    if (draggedOriginalIndex !== -1 && indicator.insertIndex > draggedOriginalIndex) {
      return indicator.insertIndex + 1;
    }

    return indicator.insertIndex;
  }
}
