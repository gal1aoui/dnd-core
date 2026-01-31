import { Component, ChangeDetectionStrategy } from '@angular/core'
import { CommonModule } from '@angular/common'
import { DndHorizontalListDirective, DndHorizontalItemDirective, type DndReorderEvent } from '@agal1aoui/angular-dnd'

interface Tab {
  id: string
  label: string
  icon: string
}

@Component({
  selector: 'app-horizontal-tabs',
  standalone: true,
  imports: [CommonModule, DndHorizontalListDirective, DndHorizontalItemDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="max-w-2xl mx-auto p-6">
      <h2 class="text-2xl font-bold mb-6">Horizontal Tabs</h2>
      <div
        [dndHorizontalList]="tabs"
        [dndKeyExtractor]="keyExtractor"
        [dndGap]="8"
        (dndReorder)="onReorder($event)"
        class="flex gap-2 border-b-2 border-gray-200"
      >
        <button
          *ngFor="let tab of tabs; trackBy: trackByFn"
          [dndHorizontalItem]="tab"
          [dndItemKey]="keyExtractor(tab)"
          (click)="activeTab = tab.id"
          class="tab-button"
          [class.active]="activeTab === tab.id"
        >
          <span class="mr-2">{{ tab.icon }}</span>
          {{ tab.label }}
        </button>
      </div>
      <div class="mt-6 p-4 bg-gray-50 rounded-lg">
        Content for: <strong>{{ getActiveTabLabel() }}</strong>
      </div>
    </div>
  `,
  styles: [`
    .tab-button {
      @apply px-4 py-3 font-medium cursor-grab select-none
             border-b-2 -mb-[2px] text-gray-500 border-transparent;
      transition: transform 200ms cubic-bezier(0.2, 0, 0, 1), color 200ms ease;
    }
    .tab-button:hover { @apply text-gray-700; }
    .tab-button.active { @apply text-blue-600 border-blue-600; }
    [data-dnd-dragging] { @apply cursor-grabbing bg-blue-50 rounded-t-lg; }
  `]
})
export class HorizontalTabsComponent {
  tabs: Tab[] = [
    { id: 'home', label: 'Home', icon: '🏠' },
    { id: 'products', label: 'Products', icon: '📦' },
    { id: 'about', label: 'About', icon: 'ℹ️' },
    { id: 'blog', label: 'Blog', icon: '📝' },
    { id: 'contact', label: 'Contact', icon: '📧' },
  ]

  activeTab = 'home'
  keyExtractor = (tab: Tab): string => tab.id
  trackByFn = (_: number, tab: Tab): string => tab.id

  onReorder(event: DndReorderEvent<Tab>): void {
    this.tabs = event.items
  }

  getActiveTabLabel(): string {
    return this.tabs.find(t => t.id === this.activeTab)?.label || ''
  }
}

interface Photo {
  id: string
  gradient: string
}

@Component({
  selector: 'app-horizontal-gallery',
  standalone: true,
  imports: [CommonModule, DndHorizontalListDirective, DndHorizontalItemDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="max-w-3xl mx-auto p-6">
      <h2 class="text-2xl font-bold mb-6">Horizontal Gallery</h2>
      <div
        [dndHorizontalList]="photos"
        [dndKeyExtractor]="keyExtractor"
        [dndGap]="12"
        (dndReorder)="onReorder($event)"
        class="flex gap-3 overflow-x-auto pb-4"
      >
        <div
          *ngFor="let photo of photos; trackBy: trackByFn"
          [dndHorizontalItem]="photo"
          [dndItemKey]="photo.id"
          class="photo-item"
          [style.background]="photo.gradient"
        ></div>
      </div>
    </div>
  `,
  styles: [`
    .photo-item {
      @apply w-24 h-24 flex-shrink-0 rounded-lg cursor-grab select-none;
      transition: transform 200ms cubic-bezier(0.2, 0, 0, 1), box-shadow 200ms ease;
    }
    .photo-item:hover { @apply shadow-lg; }
    [data-dnd-dragging] { @apply cursor-grabbing shadow-xl scale-110 z-10; }
  `]
})
export class HorizontalGalleryComponent {
  photos: Photo[] = [
    { id: '1', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
    { id: '2', gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
    { id: '3', gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
    { id: '4', gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' },
    { id: '5', gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' },
  ]

  keyExtractor = (photo: Photo): string => photo.id
  trackByFn = (_: number, photo: Photo): string => photo.id

  onReorder(event: DndReorderEvent<Photo>): void {
    this.photos = event.items
  }
}
