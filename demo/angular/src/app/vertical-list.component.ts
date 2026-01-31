import { Component, ChangeDetectionStrategy } from '@angular/core'
import { CommonModule } from '@angular/common'
import { DndVerticalListDirective, DndItemDirective, type DndReorderEvent } from '@agal1aoui/angular-dnd'

interface Task {
  id: string
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
}

@Component({
  selector: 'app-vertical-list',
  standalone: true,
  imports: [CommonModule, DndVerticalListDirective, DndItemDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="max-w-md mx-auto p-6">
      <h2 class="text-2xl font-bold mb-6">Vertical List</h2>
      <ul
        [dndVerticalList]="tasks"
        [dndKeyExtractor]="keyExtractor"
        [dndGap]="12"
        (dndReorder)="onReorder($event)"
        class="space-y-3"
      >
        <li
          *ngFor="let task of tasks; trackBy: trackByFn"
          [dndItem]="task"
          [dndItemKey]="keyExtractor(task)"
          class="task-item"
          [class.task-high]="task.priority === 'high'"
          [class.task-medium]="task.priority === 'medium'"
          [class.task-low]="task.priority === 'low'"
        >
          <span class="drag-handle">&#9776;</span>
          <div class="flex-1">
            <h3 class="font-semibold">{{ task.title }}</h3>
            <p class="text-sm text-gray-500">{{ task.description }}</p>
          </div>
          <span class="priority-badge">{{ task.priority }}</span>
        </li>
      </ul>
    </div>
  `,
  styles: [`
    .task-item {
      @apply p-4 bg-white rounded-lg shadow-sm border-2 border-transparent
             cursor-grab select-none flex items-center gap-3;
      transition: transform 200ms cubic-bezier(0.2, 0, 0, 1), box-shadow 200ms ease;
    }
    .task-item:hover { @apply shadow-md; }
    [data-dnd-dragging] { @apply cursor-grabbing shadow-xl border-blue-400; transform: rotate(2deg); }
    .drag-handle { @apply text-gray-400 text-lg; }
    .priority-badge { @apply px-2 py-1 text-xs rounded-full font-medium; }
    .task-high .priority-badge { @apply bg-red-100 text-red-700; }
    .task-medium .priority-badge { @apply bg-yellow-100 text-yellow-700; }
    .task-low .priority-badge { @apply bg-green-100 text-green-700; }
  `]
})
export class VerticalListComponent {
  tasks: Task[] = [
    { id: '1', title: 'Research Phase', description: 'Gather requirements', priority: 'high' },
    { id: '2', title: 'Design System', description: 'Create UI components', priority: 'medium' },
    { id: '3', title: 'Development', description: 'Build features', priority: 'high' },
    { id: '4', title: 'Testing', description: 'QA and bug fixes', priority: 'medium' },
    { id: '5', title: 'Deployment', description: 'Launch to production', priority: 'low' },
  ]

  keyExtractor = (task: Task): string => task.id
  trackByFn = (_: number, task: Task): string => task.id

  onReorder(event: DndReorderEvent<Task>): void {
    this.tasks = event.items
  }
}
