import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import type { Column, Task } from '../../types';
import { BoardDndService } from '../../services';
import { BoardColumnComponent } from '../column';
import type { BoardDropResult } from '@agallaoui/board-dnd/angular';

/**
 * Main Kanban board component
 * Handles the board layout and drag overlay
 */
@Component({
  selector: 'app-board',
  standalone: true,
  imports: [CommonModule, BoardColumnComponent],
  templateUrl: './board.component.html',
  styleUrl: './board.component.scss',
})
export class BoardComponent implements OnInit, OnDestroy {
  @Input({ required: true }) columns!: Column[];
  @Output() drop = new EventEmitter<BoardDropResult<Task>>();

  draggedItem: Task | null = null;
  overlayPosition = { x: 0, y: 0 };
  private dragOffset = { x: 0, y: 0 };
  private subscriptions: Subscription[] = [];
  private pointermoveHandler = (e: PointerEvent) => {
    this.overlayPosition = {
      x: e.clientX - this.dragOffset.x,
      y: e.clientY - this.dragOffset.y,
    };
  };

  constructor(private boardService: BoardDndService) {}

  ngOnInit(): void {
    // Subscribe to drop events and emit to parent
    this.subscriptions.push(
      this.boardService.drop$.subscribe((result) => this.drop.emit(result))
    );

    // Subscribe to drag state for overlay
    this.subscriptions.push(
      this.boardService.dragState$.subscribe((state) => {
        this.draggedItem = state.draggedItem?.data ?? null;
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
}
