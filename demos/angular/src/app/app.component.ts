import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { Column, Task } from './types';
import { initialColumns } from './data';
import { BoardComponent } from './components';
import type { BoardDropResult } from '@agallaoui/board-dnd/angular';

/**
 * Main App component - Clean and minimal
 *
 * The board functionality is separated into:
 * - components/board - Main board wrapper with DnD provider
 * - components/column - Drop zone columns
 * - components/ticket - Ticket card display
 * - directives/ - Board DnD directives
 * - services/ - Board DnD service
 * - types/ - TypeScript interfaces
 * - data/ - Initial board data
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, BoardComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  columns: Column[] = [...initialColumns.map((c) => ({ ...c, items: [...c.items] }))];

  /**
   * Handle drop event - move item between columns
   */
  handleDrop(result: BoardDropResult<Task>): void {
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
