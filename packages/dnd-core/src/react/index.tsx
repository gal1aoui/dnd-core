/**
 * React Adapter for @agallaoui/dnd-core
 *
 * Provides React hooks for integrating the DnD engine with React components.
 * These are thin wrappers that manage lifecycle and provide reactive state.
 *
 * ## Features
 *
 * - `useDndEngine`: Create and manage a DnD engine instance
 * - `useDraggable`: Make an element draggable
 * - `useDroppable`: Make an element a drop zone
 * - `useDndState`: Subscribe to DnD state changes
 *
 * ## Usage
 *
 * ```tsx
 * import { DndProvider, useDraggable, useDroppable } from '@agallaoui/dnd-core/react';
 *
 * function App() {
 *   return (
 *     <DndProvider onDrop={handleDrop}>
 *       <DraggableItem />
 *       <DropZone />
 *     </DndProvider>
 *   );
 * }
 * ```
 */

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';

import { createDndEngine, type DndEngine } from '../engine';
import type {
  DndConfig,
  DndState,
  DndCallbacks,
  DraggableOptions,
  DroppableOptions,
  DragData,
  DropZoneData,
} from '../types';

/**
 * Context for sharing DnD engine across components
 * Using 'any' for the engine type as React context doesn't support generics well
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const DndContext = createContext<DndEngine<any, any> | null>(null);

/**
 * Props for DndProvider component
 */
export interface DndProviderProps<TDrag = unknown, TDrop = unknown>
  extends DndCallbacks<TDrag, TDrop> {
  children: ReactNode;
  /** Minimum pixels before drag starts */
  dragThreshold?: number;
  /** Whether to capture pointer on drag start */
  capturePointer?: boolean;
  /** CSS class added to body during drag */
  draggingBodyClass?: string;
}

/**
 * Provider component that creates and shares a DnD engine instance
 *
 * @example
 * ```tsx
 * <DndProvider
 *   onDragStart={(e) => console.log('Started:', e.item.id)}
 *   onDrop={(e) => moveItem(e.item.id, e.dropZone.id)}
 * >
 *   {children}
 * </DndProvider>
 * ```
 */
export function DndProvider<TDrag = unknown, TDrop = unknown>({
  children,
  dragThreshold,
  capturePointer,
  draggingBodyClass,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
}: DndProviderProps<TDrag, TDrop>) {
  // Store callbacks in ref to avoid recreating engine on callback changes
  const callbacksRef = useRef<DndCallbacks<TDrag, TDrop>>({
    onDragStart,
    onDragOver,
    onDragLeave,
    onDrop,
    onDragEnd,
  });

  // Update callbacks ref on changes
  useEffect(() => {
    callbacksRef.current = {
      onDragStart,
      onDragOver,
      onDragLeave,
      onDrop,
      onDragEnd,
    };
  }, [onDragStart, onDragOver, onDragLeave, onDrop, onDragEnd]);

  // Create engine once
  const engine = useMemo(() => {
    const config: DndConfig<TDrag, TDrop> = {
      dragThreshold,
      capturePointer,
      draggingBodyClass,
      callbacks: {
        onDragStart: (e) => callbacksRef.current.onDragStart?.(e),
        onDragOver: (e) => callbacksRef.current.onDragOver?.(e),
        onDragLeave: (z) => callbacksRef.current.onDragLeave?.(z),
        onDrop: (e) => callbacksRef.current.onDrop?.(e),
        onDragEnd: (e) => callbacksRef.current.onDragEnd?.(e),
      },
    };
    return createDndEngine<TDrag, TDrop>(config);
  }, [dragThreshold, capturePointer, draggingBodyClass]);

  // Note: We intentionally DON'T call engine.destroy() in useEffect cleanup.
  // In React 18 StrictMode, useEffect cleanup runs during simulated unmount,
  // which clears the engine's internal Maps. But ref callbacks don't re-run
  // (their deps are stable), leaving elements with listeners but not registered.
  // The engine is garbage collected when the component truly unmounts.

  return <DndContext.Provider value={engine}>{children}</DndContext.Provider>;
}

/**
 * Hook to access the DnD engine instance
 *
 * @throws Error if used outside DndProvider
 */
export function useDndEngine<TDrag = unknown, TDrop = unknown>(): DndEngine<
  TDrag,
  TDrop
> {
  const engine = useContext(DndContext);
  if (!engine) {
    throw new Error('useDndEngine must be used within a DndProvider');
  }
  return engine as DndEngine<TDrag, TDrop>;
}

/**
 * Hook to subscribe to DnD state changes
 *
 * @returns Current DnD state
 */
export function useDndState<TDrag = unknown, TDrop = unknown>(): DndState<
  TDrag,
  TDrop
> {
  const engine = useDndEngine<TDrag, TDrop>();
  const [state, setState] = useState(() => engine.getState());

  useEffect(() => {
    return engine.subscribe(setState);
  }, [engine]);

  return state;
}

/**
 * Options for useDraggable hook
 */
export interface UseDraggableOptions<T = unknown>
  extends Omit<DraggableOptions<T>, 'id'> {
  /** Unique identifier (can use any stable value) */
  id: DraggableOptions<T>['id'];
}

/**
 * Return value from useDraggable hook
 */
export interface UseDraggableResult<T = unknown> {
  /** Ref to attach to the draggable element */
  ref: (element: HTMLElement | null) => void;
  /** Whether this item is currently being dragged */
  isDragging: boolean;
  /** The drag data if currently dragging */
  dragData: DragData<T> | null;
}

/**
 * Hook to make an element draggable
 *
 * @example
 * ```tsx
 * function DraggableCard({ id, data }) {
 *   const { ref, isDragging } = useDraggable({
 *     id,
 *     type: 'card',
 *     payload: data,
 *   });
 *
 *   return (
 *     <div ref={ref} style={{ opacity: isDragging ? 0.5 : 1 }}>
 *       {data.title}
 *     </div>
 *   );
 * }
 * ```
 */
export function useDraggable<T = unknown>(
  options: UseDraggableOptions<T>
): UseDraggableResult<T> {
  const engine = useDndEngine<T, unknown>();
  const state = useDndState<T, unknown>();
  const handleRef = useRef<ReturnType<typeof engine.registerDraggable> | null>(
    null
  );
  const elementRef = useRef<HTMLElement | null>(null);
  const optionsRef = useRef(options);

  // Update options ref
  useEffect(() => {
    optionsRef.current = options;
    handleRef.current?.update(options);
  }, [options]);

  // Ref callback to register/unregister element
  // Note: We don't use a separate useEffect cleanup because the ref callback
  // handles it when React calls it with null. This is important for React 18
  // StrictMode compatibility where effects may be re-run without re-calling refs.
  const ref = useCallback(
    (element: HTMLElement | null) => {
      // Clean up previous
      if (handleRef.current) {
        handleRef.current.destroy();
        handleRef.current = null;
      }

      elementRef.current = element;

      // Register new element
      if (element) {
        handleRef.current = engine.registerDraggable(element, optionsRef.current);
      }
    },
    [engine]
  );

  const isDragging =
    state.phase === 'dragging' && state.dragData?.id === options.id;

  return {
    ref,
    isDragging,
    dragData: isDragging ? state.dragData : null,
  };
}

/**
 * Options for useDroppable hook
 */
export interface UseDroppableOptions<T = unknown>
  extends Omit<DroppableOptions<T>, 'id'> {
  /** Unique identifier */
  id: DroppableOptions<T>['id'];
}

/**
 * Return value from useDroppable hook
 */
export interface UseDroppableResult<TDrag = unknown, TDrop = unknown> {
  /** Ref to attach to the drop zone element */
  ref: (element: HTMLElement | null) => void;
  /** Whether a draggable is currently over this zone */
  isOver: boolean;
  /** The active drop zone data if hovered */
  dropZoneData: DropZoneData<TDrop> | null;
  /** The item being dragged over this zone */
  draggedItem: DragData<TDrag> | null;
}

/**
 * Hook to make an element a drop zone
 *
 * @example
 * ```tsx
 * function Column({ id, items }) {
 *   const { ref, isOver } = useDroppable({
 *     id,
 *     accepts: ['card'],
 *     payload: { columnId: id },
 *   });
 *
 *   return (
 *     <div ref={ref} className={isOver ? 'highlight' : ''}>
 *       {items.map(item => <Card key={item.id} {...item} />)}
 *     </div>
 *   );
 * }
 * ```
 */
export function useDroppable<TDrag = unknown, TDrop = unknown>(
  options: UseDroppableOptions<TDrop>
): UseDroppableResult<TDrag, TDrop> {
  const engine = useDndEngine<TDrag, TDrop>();
  const state = useDndState<TDrag, TDrop>();
  const handleRef = useRef<ReturnType<typeof engine.registerDroppable> | null>(
    null
  );
  const elementRef = useRef<HTMLElement | null>(null);
  const optionsRef = useRef(options);

  // Update options ref
  useEffect(() => {
    optionsRef.current = options;
    handleRef.current?.update(options);
  }, [options]);

  // Ref callback to register/unregister element
  // Note: We don't use a separate useEffect cleanup because the ref callback
  // handles it when React calls it with null. This is important for React 18
  // StrictMode compatibility where effects may be re-run without re-calling refs.
  const ref = useCallback(
    (element: HTMLElement | null) => {
      // Clean up previous
      if (handleRef.current) {
        handleRef.current.destroy();
        handleRef.current = null;
      }

      elementRef.current = element;

      // Register new element
      if (element) {
        handleRef.current = engine.registerDroppable(element, optionsRef.current);
      }
    },
    [engine]
  );

  const isOver = state.activeDropZone?.id === options.id;

  return {
    ref,
    isOver,
    dropZoneData: isOver ? state.activeDropZone : null,
    draggedItem: isOver ? state.dragData : null,
  };
}

// Re-export types for convenience
export type {
  DndConfig,
  DndState,
  DndCallbacks,
  DraggableOptions,
  DroppableOptions,
  DragData,
  DropZoneData,
  DragStartEvent,
  DragOverEvent,
  DropEvent,
  DragEndEvent,
} from '../types';
