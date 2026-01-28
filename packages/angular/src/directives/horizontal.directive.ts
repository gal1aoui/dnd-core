/**
 * Horizontal DnD Directive for Angular
 *
 * CRITICAL: All drag operations run OUTSIDE Angular zone
 * to prevent change detection storms. Re-enters Angular only on drop.
 */

import {
  Directive,
  Input,
  Output,
  EventEmitter,
  ElementRef,
  OnInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  NgZone,
  inject,
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
  selector: '[dndHorizontalList]',
  standalone: true,
})
export class DndHorizontalListDirective<T> implements OnInit, OnDestroy, OnChanges {
  private readonly ngZone = inject(NgZone)

  @Input({ required: true }) dndHorizontalList!: T[]
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

  private dragState = {
    isDragging: false,
    activeId: null as string | null,
    activeItem: null as T | null,
    activeIndex: -1,
    currentIndex: -1,
  }

  ngOnInit(): void {
    this.ngZone.runOutsideAngular(() => {
      this.engine = createDragEngine({ autoScroll: true })
      this.setupEventHandlers()
    })
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['dndHorizontalList'] || changes['dndDisabled'] || changes['dndHandle']) {
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

  registerItem(id: string, element: HTMLElement): void {
    this.itemElements.set(id, element)
    this.ngZone.runOutsideAngular(() => {
      this.registerItemWithEngine(id, element)
    })
  }

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

    const index = this.dndHorizontalList.findIndex(
      i => this.dndKeyExtractor(i) === event.draggableId
    )

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

    const activeEl = this.itemElements.get(event.draggableId)
    if (activeEl) {
      activeEl.style.zIndex = '9999'
      activeEl.style.position = 'relative'
      activeEl.style.transition = 'none'
    }

    this.ngZone.run(() => {
      this.dndDragStart.emit(item)
    })
  }

  private handleDragMove(event: DragMoveEvent): void {
    const state = this.dragState
    if (!state.isDragging || !state.activeId) return

    const activeEl = this.itemElements.get(state.activeId)
    if (activeEl) {
      activeEl.style.transform = `translate3d(${event.delta.x}px, 0, 0)`
    }

    const elements = Array.from(this.itemElements.values())
    const newIndex = getDropIndex(event.position, elements, 'horizontal', state.activeIndex)

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

    for (const [, el] of this.itemElements) {
      el.style.transform = ''
      el.style.zIndex = ''
      el.style.position = ''
      el.style.transition = `transform ${this.dndAnimationDuration}ms cubic-bezier(0.2, 0, 0, 1)`
    }

    this.ngZone.run(() => {
      if (fromIndex !== toIndex && fromIndex !== -1 && !event.cancelled) {
        const newItems = [...this.dndHorizontalList]
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

      let translateX = 0

      if (i >= currentIndex && i < activeIndex) {
        translateX = rect.width + this.dndGap
      } else if (i <= currentIndex && i > activeIndex) {
        translateX = -(rect.width + this.dndGap)
      }

      el.style.transform = translateX !== 0 ? `translate3d(${translateX}px, 0, 0)` : ''
      i++
    }
  }

  private registerItems(): void {
    this.cleanup()

    for (const item of this.dndHorizontalList) {
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
      axis: 'x',
    })

    this.cleanupFns.set(id, cleanup)
  }

  private findItemById(id: string): T | undefined {
    return this.dndHorizontalList.find(item => this.dndKeyExtractor(item) === id)
  }

  private cleanup(): void {
    for (const cleanup of this.cleanupFns.values()) {
      cleanup()
    }
    this.cleanupFns.clear()
  }
}

@Directive({
  selector: '[dndHorizontalItem]',
  standalone: true,
})
export class DndHorizontalItemDirective<T> implements OnInit, OnDestroy {
  private readonly elementRef = inject(ElementRef<HTMLElement>)
  private readonly parent = inject(DndHorizontalListDirective, { optional: true })

  @Input({ required: true }) dndHorizontalItem!: T
  @Input({ required: true }) dndItemKey!: string

  ngOnInit(): void {
    this.parent?.registerItem(this.dndItemKey, this.elementRef.nativeElement)
  }

  ngOnDestroy(): void {
    this.parent?.unregisterItem(this.dndItemKey)
  }
}
