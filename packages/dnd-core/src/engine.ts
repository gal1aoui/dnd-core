import type {
  DndState,
  DndConfig,
  DndCallbacks,
  DragData,
  DropZoneData,
  DraggableOptions,
  DroppableOptions,
  DraggableHandle,
  DroppableHandle,
  Point,
  Rect,
} from './types';

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: Required<Omit<DndConfig, 'callbacks'>> = {
  dragThreshold: 5,
  capturePointer: false, // Disabled by default - can cause issues with window event listeners
  draggingBodyClass: 'dnd-dragging',
};

/**
 * Creates a new DnD state object
 */
function createInitialState<TDrag, TDrop>(): DndState<TDrag, TDrop> {
  return {
    phase: 'idle',
    dragData: null,
    pointerPosition: null,
    startPosition: null,
    dragOffset: null,
    activeDropZone: null,
    dropZones: new Map(),
  };
}

/**
 * Core DnD Engine
 *
 * Framework-agnostic drag-and-drop engine built on Pointer Events.
 * Handles all drag/drop logic without any framework dependencies.
 *
 * ## Architecture
 *
 * The engine maintains internal state and coordinates between:
 * - Registered draggable elements
 * - Registered drop zone elements
 * - Pointer event handlers
 * - Lifecycle callbacks
 *
 * ## Key Features
 *
 * - **Pointer Events**: Uses modern pointer events for unified mouse/touch handling
 * - **Drag Threshold**: Prevents accidental drags with configurable pixel threshold
 * - **Type Filtering**: Drop zones can filter which drag types they accept
 * - **Zero Dependencies**: No external libraries required
 *
 * ## Usage
 *
 * ```typescript
 * const engine = createDndEngine({
 *   callbacks: {
 *     onDrop: ({ item, dropZone }) => {
 *       console.log(`Dropped ${item.id} on ${dropZone.id}`);
 *     }
 *   }
 * });
 *
 * // Register elements
 * const dragHandle = engine.registerDraggable(element, options);
 * const dropHandle = engine.registerDroppable(element, options);
 *
 * // Cleanup
 * dragHandle.destroy();
 * dropHandle.destroy();
 * engine.destroy();
 * ```
 */
export interface DndEngine<TDrag = unknown, TDrop = unknown> {
  /** Register an element as draggable */
  registerDraggable: (
    element: HTMLElement,
    options: DraggableOptions<TDrag>
  ) => DraggableHandle<TDrag>;

  /** Register an element as a drop zone */
  registerDroppable: (
    element: HTMLElement,
    options: DroppableOptions<TDrop>
  ) => DroppableHandle<TDrop>;

  /** Get current DnD state (read-only) */
  getState: () => Readonly<DndState<TDrag, TDrop>>;

  /** Subscribe to state changes */
  subscribe: (callback: (state: DndState<TDrag, TDrop>) => void) => () => void;

  /** Update configuration */
  updateConfig: (config: Partial<DndConfig<TDrag, TDrop>>) => void;

  /** Cancel current drag operation */
  cancel: () => void;

  /** Clean up all resources */
  destroy: () => void;
}

/**
 * Creates a new DnD engine instance
 *
 * @param config - Engine configuration options
 * @returns A new DndEngine instance
 */
export function createDndEngine<TDrag = unknown, TDrop = unknown>(
  config: DndConfig<TDrag, TDrop> = {}
): DndEngine<TDrag, TDrop> {
  // Merge config with defaults
  const mergedConfig: Required<Omit<DndConfig, 'callbacks'>> & {
    callbacks: DndCallbacks<TDrag, TDrop>;
  } = {
    ...DEFAULT_CONFIG,
    callbacks: config.callbacks || {},
  };

  if (config.dragThreshold !== undefined) {
    mergedConfig.dragThreshold = config.dragThreshold;
  }
  if (config.capturePointer !== undefined) {
    mergedConfig.capturePointer = config.capturePointer;
  }
  if (config.draggingBodyClass !== undefined) {
    mergedConfig.draggingBodyClass = config.draggingBodyClass;
  }

  // Internal state
  let state = createInitialState<TDrag, TDrop>();
  const subscribers = new Set<(state: DndState<TDrag, TDrop>) => void>();

  // Track registered elements
  const draggables = new Map<
    HTMLElement,
    { options: DraggableOptions<TDrag>; cleanup: () => void }
  >();
  const droppables = new Map<
    HTMLElement,
    { options: DroppableOptions<TDrop>; cleanup: () => void }
  >();

  // Active drag state
  let activeDragElement: HTMLElement | null = null;
  let pendingDragStart: { element: HTMLElement; event: PointerEvent } | null = null;

  /**
   * Notify all subscribers of state change
   */
  function notifySubscribers(): void {
    subscribers.forEach((callback) => callback(state));
  }

  /**
   * Update state immutably and notify subscribers
   */
  function setState(
    updates: Partial<DndState<TDrag, TDrop>>
  ): void {
    state = { ...state, ...updates };
    notifySubscribers();
  }

  /**
   * Calculate distance between two points
   */
  function distance(a: Point, b: Point): number {
    return Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2));
  }

  /**
   * Get element's bounding rect
   */
  function getRect(element: HTMLElement): Rect {
    const rect = element.getBoundingClientRect();
    return {
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height,
    };
  }

  /**
   * Check if point is inside rect
   */
  function isPointInRect(point: Point, rect: Rect): boolean {
    return (
      point.x >= rect.x &&
      point.x <= rect.x + rect.width &&
      point.y >= rect.y &&
      point.y <= rect.y + rect.height
    );
  }

  /**
   * Find drop zone under current pointer position
   */
  function findDropZoneAtPoint(point: Point): {
    element: HTMLElement;
    data: DropZoneData<TDrop>;
  } | null {
    for (const [element, { options }] of droppables) {
      if (options.disabled) continue;

      const rect = getRect(element);
      if (!isPointInRect(point, rect)) continue;

      // Check if this drop zone accepts the current drag type
      if (state.dragData) {
        const accepts = options.accepts || [];
        if (accepts.length > 0 && !accepts.includes(state.dragData.type)) {
          continue;
        }
      }

      return {
        element,
        data: {
          id: options.id,
          accepts: options.accepts || [],
          payload: options.payload,
        },
      };
    }
    return null;
  }

  /**
   * Handle pointer down on draggable
   */
  function handlePointerDown(
    element: HTMLElement,
    options: DraggableOptions<TDrag>,
    event: PointerEvent
  ): void {
    if (options.disabled) return;
    if (state.phase !== 'idle') return;

    // Check handle selector
    if (options.handleSelector) {
      const target = event.target as HTMLElement;
      if (!target.closest(options.handleSelector)) return;
    }

    // Prevent text selection
    event.preventDefault();

    // Store pending drag
    pendingDragStart = { element, event };

    // Calculate offset from pointer to element origin
    const rect = getRect(element);
    const dragOffset: Point = {
      x: event.clientX - rect.x,
      y: event.clientY - rect.y,
    };

    setState({
      startPosition: { x: event.clientX, y: event.clientY },
      pointerPosition: { x: event.clientX, y: event.clientY },
      dragOffset,
    });

    // Add move/up listeners to window
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    if (mergedConfig.capturePointer) {
      element.setPointerCapture(event.pointerId);
    }
  }

  /**
   * Handle pointer move during drag
   */
  function handlePointerMove(event: PointerEvent): void {
    const currentPos: Point = { x: event.clientX, y: event.clientY };

    if (pendingDragStart && state.startPosition) {
      // Check if we've exceeded drag threshold
      const dist = distance(state.startPosition, currentPos);

      if (dist >= mergedConfig.dragThreshold) {
        // Start actual drag
        const { element, event: startEvent } = pendingDragStart;
        const options = draggables.get(element)?.options;

        if (!options) return;

        const dragData: DragData<TDrag> = {
          id: options.id,
          type: options.type,
          payload: options.payload,
        };

        activeDragElement = element;
        pendingDragStart = null;

        setState({
          phase: 'dragging',
          dragData,
          pointerPosition: currentPos,
        });

        // Add body class
        document.body.classList.add(mergedConfig.draggingBodyClass);

        // Fire callback
        mergedConfig.callbacks.onDragStart?.({
          item: dragData,
          element,
          position: state.startPosition,
          dragOffset: state.dragOffset || { x: 0, y: 0 },
          originalEvent: startEvent,
        });
      }
    } else if (state.phase === 'dragging') {
      setState({ pointerPosition: currentPos });

      // Find drop zone under pointer
      const dropZone = findDropZoneAtPoint(currentPos);
      const previousDropZone = state.activeDropZone;

      if (dropZone) {
        // Check if we moved to a different drop zone
        if (!previousDropZone || previousDropZone.id !== dropZone.data.id) {
          // Left previous zone
          if (previousDropZone) {
            mergedConfig.callbacks.onDragLeave?.(previousDropZone);
          }

          setState({ activeDropZone: dropZone.data });
        }

        // Fire drag over callback
        if (state.dragData) {
          mergedConfig.callbacks.onDragOver?.({
            item: state.dragData,
            dropZone: dropZone.data,
            position: currentPos,
            dropZoneElement: dropZone.element,
          });
        }
      } else if (previousDropZone) {
        // Left all drop zones
        mergedConfig.callbacks.onDragLeave?.(previousDropZone);
        setState({ activeDropZone: null });
      }
    }
  }

  /**
   * Handle pointer up (drop or cancel)
   */
  function handlePointerUp(event: PointerEvent): void {
    const finalPos: Point = { x: event.clientX, y: event.clientY };

    // Clean up event listeners
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', handlePointerUp);

    if (activeDragElement && mergedConfig.capturePointer) {
      activeDragElement.releasePointerCapture(event.pointerId);
    }

    // Remove body class
    document.body.classList.remove(mergedConfig.draggingBodyClass);

    const wasDragging = state.phase === 'dragging';
    const dragData = state.dragData;

    // Find final drop zone
    const dropZone = findDropZoneAtPoint(finalPos);
    let dropped = false;

    if (wasDragging && dragData && dropZone) {
      dropped = true;

      // Fire drop callback
      mergedConfig.callbacks.onDrop?.({
        item: dragData,
        dropZone: dropZone.data,
        position: finalPos,
        dropZoneElement: dropZone.element,
      });
    }

    // Fire drag end callback
    if (wasDragging && dragData) {
      mergedConfig.callbacks.onDragEnd?.({
        item: dragData,
        dropped,
        position: finalPos,
      });
    }

    // Reset state
    pendingDragStart = null;
    activeDragElement = null;
    setState(createInitialState());
  }

  /**
   * Register an element as draggable
   */
  function registerDraggable(
    element: HTMLElement,
    options: DraggableOptions<TDrag>
  ): DraggableHandle<TDrag> {
    // Use a function that looks up current options from the map
    // This ensures updates are reflected in the event handler
    const onPointerDown = (e: PointerEvent) => {
      const currentOptions = draggables.get(element)?.options;
      if (currentOptions) {
        handlePointerDown(element, currentOptions, e);
      }
    };

    // Use passive: false to ensure we can preventDefault
    element.addEventListener('pointerdown', onPointerDown, { passive: false });
    element.style.touchAction = 'none'; // Prevent scroll during drag
    element.style.userSelect = 'none'; // Prevent text selection
    element.draggable = false; // Prevent native HTML5 drag

    const cleanup = () => {
      element.removeEventListener('pointerdown', onPointerDown, { passive: false } as EventListenerOptions);
      element.style.touchAction = '';
      element.style.userSelect = '';
      element.draggable = true;
    };

    // Store the initial options
    draggables.set(element, { options, cleanup });

    // Keep track of the initial id for isDragging check
    const initialId = options.id;

    return {
      destroy: () => {
        cleanup();
        draggables.delete(element);
      },
      update: (newOptions: Partial<DraggableOptions<TDrag>>) => {
        const existing = draggables.get(element);
        if (existing) {
          existing.options = { ...existing.options, ...newOptions } as DraggableOptions<TDrag>;
        }
      },
      isDragging: () => {
        const currentOptions = draggables.get(element)?.options;
        return (
          state.phase === 'dragging' &&
          state.dragData?.id === (currentOptions?.id ?? initialId)
        );
      },
    };
  }

  /**
   * Register an element as a drop zone
   */
  function registerDroppable(
    element: HTMLElement,
    options: DroppableOptions<TDrop>
  ): DroppableHandle<TDrop> {
    const dropZoneData: DropZoneData<TDrop> = {
      id: options.id,
      accepts: options.accepts || [],
      payload: options.payload,
    };

    // Add to state's drop zones map
    state.dropZones.set(options.id, dropZoneData);

    const cleanup = () => {
      state.dropZones.delete(options.id);
    };

    droppables.set(element, { options, cleanup });

    return {
      destroy: () => {
        cleanup();
        droppables.delete(element);
      },
      update: (newOptions: Partial<DroppableOptions<TDrop>>) => {
        const existing = droppables.get(element);
        if (existing) {
          existing.options = { ...existing.options, ...newOptions } as DroppableOptions<TDrop>;

          // Update drop zone data in state
          const updatedData: DropZoneData<TDrop> = {
            id: existing.options.id,
            accepts: existing.options.accepts || [],
            payload: existing.options.payload,
          };
          state.dropZones.set(existing.options.id, updatedData);
        }
      },
      isOver: () =>
        state.activeDropZone?.id === options.id,
    };
  }

  return {
    registerDraggable,
    registerDroppable,

    getState: () => state,

    subscribe: (callback) => {
      subscribers.add(callback);
      return () => subscribers.delete(callback);
    },

    updateConfig: (newConfig) => {
      if (newConfig.dragThreshold !== undefined) {
        mergedConfig.dragThreshold = newConfig.dragThreshold;
      }
      if (newConfig.capturePointer !== undefined) {
        mergedConfig.capturePointer = newConfig.capturePointer;
      }
      if (newConfig.draggingBodyClass !== undefined) {
        mergedConfig.draggingBodyClass = newConfig.draggingBodyClass;
      }
      if (newConfig.callbacks) {
        Object.assign(mergedConfig.callbacks, newConfig.callbacks);
      }
    },

    cancel: () => {
      if (state.phase !== 'idle') {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
        document.body.classList.remove(mergedConfig.draggingBodyClass);

        if (state.dragData) {
          mergedConfig.callbacks.onDragEnd?.({
            item: state.dragData,
            dropped: false,
            position: state.pointerPosition || { x: 0, y: 0 },
          });
        }

        pendingDragStart = null;
        activeDragElement = null;
        setState(createInitialState());
      }
    },

    destroy: () => {
      // Cancel any active drag
      if (state.phase !== 'idle') {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
        document.body.classList.remove(mergedConfig.draggingBodyClass);
      }

      // Clean up all draggables
      draggables.forEach(({ cleanup }) => cleanup());
      draggables.clear();

      // Clean up all droppables
      droppables.forEach(({ cleanup }) => cleanup());
      droppables.clear();

      // Clear subscribers
      subscribers.clear();

      // Reset state
      state = createInitialState();
    },
  };
}
