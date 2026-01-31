import { Component } from '@angular/core'
import { CommonModule } from '@angular/common'
import { VerticalListComponent } from './vertical-list.component'
import { HorizontalTabsComponent, HorizontalGalleryComponent } from './horizontal-list.component'

type Demo = 'vertical' | 'horizontal'

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, VerticalListComponent, HorizontalTabsComponent, HorizontalGalleryComponent],
  template: `
    <div class="min-h-screen bg-gray-50">
      <header class="bg-gradient-to-r from-red-500 to-orange-500 text-white py-6 px-6">
        <div class="max-w-6xl mx-auto">
          <h1 class="text-2xl font-bold">&#64;agal1aoui/angular-dnd Demo</h1>
          <p class="text-red-100 text-sm mt-1">Zero change detection during drag</p>
        </div>
      </header>

      <nav class="bg-white shadow-sm sticky top-0 z-40">
        <div class="max-w-6xl mx-auto px-6">
          <div class="flex gap-1 py-2">
            <button
              *ngFor="let demo of demos"
              (click)="activeDemo = demo.id"
              class="px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors"
              [class.bg-orange-100]="activeDemo === demo.id"
              [class.text-orange-700]="activeDemo === demo.id"
              [class.text-gray-600]="activeDemo !== demo.id"
              [class.hover:bg-gray-100]="activeDemo !== demo.id"
            >
              {{ demo.title }}
            </button>
          </div>
        </div>
      </nav>

      <main class="max-w-6xl mx-auto py-8 px-6">
        <div class="bg-white rounded-xl shadow-lg overflow-hidden">
          <ng-container [ngSwitch]="activeDemo">
            <app-vertical-list *ngSwitchCase="'vertical'" />
            <ng-container *ngSwitchCase="'horizontal'">
              <app-horizontal-tabs />
              <hr class="my-6" />
              <app-horizontal-gallery />
            </ng-container>
          </ng-container>
        </div>
      </main>
    </div>
  `,
})
export class AppComponent {
  activeDemo: Demo = 'vertical'
  demos: { id: Demo; title: string }[] = [
    { id: 'vertical', title: 'Vertical List' },
    { id: 'horizontal', title: 'Horizontal' },
  ]
}
