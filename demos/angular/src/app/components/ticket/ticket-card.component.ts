import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { Task } from '../../types';
import { priorityColors } from '../../data';

/**
 * Ticket card component displaying task details
 * Used inside the board column with the boardItem directive
 */
@Component({
  selector: 'app-ticket-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ticket-card.component.html',
  styleUrl: './ticket-card.component.scss',
})
export class TicketCardComponent {
  @Input({ required: true }) task!: Task;

  getPriorityBg(priority: Task['priority']): string {
    return priorityColors[priority].bg;
  }

  getPriorityText(priority: Task['priority']): string {
    return priorityColors[priority].text;
  }
}
