/**
 * Vertical DnD Directive for Angular
 *
 * CRITICAL: All drag operations run OUTSIDE Angular zone
 * to prevent change detection storms. Re-enters Angular only on drop.
 */

import {
  Directive,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  NgZone,
  inject,
  ElementRef,
} from '@angular/core'
import {
  createDragEngine,
  type DragEngine,
  type DragStartEvent,
  type DragMoveEvent,
  type DragEndEvent,
  type CleanupFn,
  getDropIndex,
} from '@agal1aoui/dnd-core'

export interface DndReorderEvent<T> {
  item: T
  fromIndex: number
  toIndex: number
  items: T[]
}

@Directive({
  selector: '[dndVerticalList]',
  standalone: true,
})
export class DndVerticalListDirective<T> implements OnInit, OnDestroy, OnChanges {
  private readonly ngZone = inject(NgZone)

  @Input({ required: true }) dndVerticalList!: T[]
  @Input({ required: true }) dndKeyExtractor!: (item: T) => string
  @Input() dndHandle?: string
  @Input() dndDisabled = false
  @Input() dndGap = 0
  @Input() dndAnimationDuration = 200

  @Output() dndReorder = new EventEmitter<DndReorderEvent<T>>()
  @Output() dndDragStart = new EventEmitter<T>()
  @Output() dndDragEnd = new EventEmitter<{ item: T; cancelled: boolean }>()

  private engine: DragEngine | null = null
  private cleanupFns = new Map<string, CleanupFn>()
  private itemElements = new Map<string, HTMLElement>()
  private itemRects = new Map<string, DOMRect>()

  // Mutable drag state (no Angular bindings during drag)
  private dragState = {
    isDragging: false,
    activeId: null as string | null,
    activeItem: null as T | null,
    activeIndex: -1,
    currentIndex: -1,
  }

  ngOnInit(): void {
    // Initialize engine OUTSIDE Angular zone
    this.ngZone.runOutsideAngular(() => {
      this.engine = createDragEngine({ autoScroll: true })
      this.setupEventHandlers()
    })
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['dndVerticalList'] || changes['dndDisabled'] || changes['dndHandle']) {
      // Re-register items outside Angular zone
      this.ngZone.runOutsideAngular(() => {
        this.registerItems()
      })
    }
  }

  ngOnDestroy(): void {
    this.cleanup()
    this.engine?.destroy()
    this.engine = null
  }

  /**
   * Called from DndItemDirective to register element
   */
  registerItem(id: string, element: HTMLElement): void {
    this.itemElements.set(id, element)

    this.ngZone.runOutsideAngular(() => {
      this.registerItemWithEngine(id, element)
    })
  }

  /**
   * Called from DndItemDirective to unregister element
   */
  unregisterItem(id: string): void {
    this.itemElements.delete(id)
    const cleanup = this.cleanupFns.get(id)
    cleanup?.()
    this.cleanupFns.delete(id)
  }

  private setupEventHandlers(): void {
    if (!this.engine) return

    this.engine.on('onDragStart', (event: DragStartEvent) => {
      this.handleDragStart(event)
    })

    this.engine.on('onDragMove', (event: DragMoveEvent) => {
      this.handleDragMove(event)
    })

    this.engine.on('onDragEnd', (event: DragEndEvent) => {
      this.handleDragEnd(event)
    })
  }

  private handleDragStart(event: DragStartEvent): void {
    const item = this.findItemById(event.draggableId)
    if (!item) return

    const index = this.dndVerticalList.findIndex(
      i => this.dndKeyExtractor(i) === event.draggableId
    )

    // Cache rects at drag start
    this.itemRects.clear()
    for (const [id, el] of this.itemElements) {
      this.itemRects.set(id, el.getBoundingClientRect())
    }

    this.dragState = {
      isDragging: true,
      activeId: event.draggableId,
      activeItem: item,
      activeIndex: index,
      currentIndex: index,
    }

    // Set styles directly (no change detection)
    const activeEl = this.itemElements.get(event.draggableId)
    if (activeEl) {
      activeEl.style.zIndex = '9999'
      activeEl.style.position = 'relative'
      activeEl.style.transition = 'none'
    }

    // Re-enter Angular ONLY for the callback
    this.ngZone.run(() => {
      this.dndDragStart.emit(item)
    })
  }

  private handleDragMove(event: DragMoveEvent): void {
    const state = this.dragState
    if (!state.isDragging || !state.activeId) return

    // Direct DOM manipulation (no change detection)
    const activeEl = this.itemElements.get(state.activeId)
    if (activeEl) {
      activeEl.style.transform = `translate3d(0, ${event.delta.y}px, 0)`
    }

    const elements = Array.from(this.itemElements.values())
    const newIndex = getDropIndex(event.position, elements, 'vertical', state.activeIndex)

    if (newIndex !== state.currentIndex) {
      state.currentIndex = newIndex
      this.updateSiblingPositions()
    }
  }

  private handleDragEnd(event: DragEndEvent): void {
    const state = this.dragState
    if (!state.isDragging) return

    const fromIndex = state.activeIndex
    const toIndex = state.currentIndex
    const item = state.activeItem as T

    // Reset all element styles
    for (const [, el] of this.itemElements) {
      el.style.transform = ''
      el.style.zIndex = ''
      el.style.position = ''
      el.style.transition = `transform ${this.dndAnimationDuration}ms cubic-bezier(0.2, 0, 0, 1)`
    }

    // Re-enter Angular zone for state updates
    this.ngZone.run(() => {
      if (fromIndex !== toIndex && fromIndex !== -1 && !event.cancelled) {
        const newItems = [...this.dndVerticalList]
        const [movedItem] = newItems.splice(fromIndex, 1)
        newItems.splice(toIndex, 0, movedItem as T)

        this.dndReorder.emit({
          item,
          fromIndex,
          toIndex,
          items: newItems,
        })
      }

      this.dndDragEnd.emit({ item, cancelled: event.cancelled })
    })

    // Reset drag state
    this.dragState = {
      isDragging: false,
      activeId: null,
      activeItem: null,
      activeIndex: -1,
      currentIndex: -1,
    }
    this.itemRects.clear()
  }

  private updateSiblingPositions(): void {
    const { activeId, activeIndex, currentIndex } = this.dragState
    let i = 0

    for (const [id, el] of this.itemElements) {
      if (id === activeId) {
        i++
        continue
      }

      const rect = this.itemRects.get(id)
      if (!rect) {
        i++
        continue
      }

      el.style.transition = `transform ${this.dndAnimationDuration}ms cubic-bezier(0.2, 0, 0, 1)`

      let translateY = 0

      if (i >= currentIndex && i < activeIndex) {
        translateY = rect.height + this.dndGap
      } else if (i <= currentIndex && i > activeIndex) {
        translateY = -(rect.height + this.dndGap)
      }

      el.style.transform = translateY !== 0 ? `translate3d(0, ${translateY}px, 0)` : ''
      i++
    }
  }

  private registerItems(): void {
    this.cleanup()

    for (const item of this.dndVerticalList) {
      const id = this.dndKeyExtractor(item)
      const element = this.itemElements.get(id)

      if (element) {
        this.registerItemWithEngine(id, element)
      }
    }
  }

  private registerItemWithEngine(id: string, element: HTMLElement): void {
    if (!this.engine) return

    element.style.transition = `transform ${this.dndAnimationDuration}ms cubic-bezier(0.2, 0, 0, 1)`

    const cleanup = this.engine.register(element, {
      id,
      disabled: this.dndDisabled,
      handle: this.dndHandle,
      data: this.findItemById(id),
      axis: 'y',
    })

    this.cleanupFns.set(id, cleanup)
  }

  private findItemById(id: string): T | undefined {
    return this.dndVerticalList.find(item => this.dndKeyExtractor(item) === id)
  }

  private cleanup(): void {
    for (const cleanup of this.cleanupFns.values()) {
      cleanup()
    }
    this.cleanupFns.clear()
  }
}

@Directive({
  selector: '[dndItem]',
  standalone: true,
})
export class DndItemDirective<T> implements OnInit, OnDestroy {
  private readonly elementRef = inject(ElementRef<HTMLElement>)
  private readonly parent = inject(DndVerticalListDirective, { optional: true })

  @Input({ required: true }) dndItem!: T
  @Input({ required: true }) dndItemKey!: string

  ngOnInit(): void {
    this.parent?.registerItem(this.dndItemKey, this.elementRef.nativeElement)
  }

  ngOnDestroy(): void {
    this.parent?.unregisterItem(this.dndItemKey)
  }
}
