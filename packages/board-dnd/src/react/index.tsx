/**
 * React Adapter for @agallaoui/board-dnd
 *
 * Provides React components and hooks for building Kanban-style boards.
 *
 * ## Features
 *
 * - `BoardProvider`: Context provider for board DnD state
 * - `useBoardColumn`: Hook for column drop zones
 * - `useBoardItem`: Hook for draggable items
 * - `DragOverlay`: Component for rendering dragged item
 * - `DropIndicator`: Component for showing insertion point
 *
 * ## Usage
 *
 * ```tsx
 * import {
 *   BoardProvider,
 *   useBoardColumn,
 *   useBoardItem,
 *   DragOverlay,
 * } from '@agallaoui/board-dnd/react';
 *
 * function Board() {
 *   return (
 *     <BoardProvider onDrop={handleDrop}>
 *       <div className="board">
 *         {columns.map(col => <Column key={col.id} {...col} />)}
 *       </div>
 *       <DragOverlay>{(item) => <Card {...item} />}</DragOverlay>
 *     </BoardProvider>
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
  type CSSProperties,
} from 'react';

import { createBoardEngine, type BoardEngine, type ItemPosition } from '../board-engine';
import type {
  BoardConfig,
  BoardCallbacks,
  BoardDragState,
  BoardItem,
  DropIndicatorPosition,
  BoardSettings,
} from '../types';
import { defaultBoardSettings } from '../types';
import type { DndId, Point } from '@agallaoui/dnd-core';

/**
 * Context for sharing board engine across components
 * Using 'any' for the engine type as React context doesn't support generics well
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const BoardContext = createContext<BoardEngine<any, any> | null>(null);

/**
 * Props for BoardProvider component
 */
export interface BoardProviderProps<TItem = unknown>
  extends BoardCallbacks<TItem> {
  children: ReactNode;
  /** Whether to animate movements */
  animate?: boolean;
  /** Animation duration in ms */
  animationDuration?: number;
  /** Gap between items in pixels */
  itemGap?: number;
  /** Type identifier for items */
  itemType?: string;
}

/**
 * Provider component for board DnD functionality
 *
 * Wraps the board and provides context for all column and item components.
 *
 * @example
 * ```tsx
 * <BoardProvider
 *   onDrop={({ item, fromColumnId, toColumnId, toIndex }) => {
 *     moveItem(item.id, fromColumnId, toColumnId, toIndex);
 *   }}
 * >
 *   {children}
 * </BoardProvider>
 * ```
 */
export function BoardProvider<TItem = unknown>({
  children,
  animate,
  animationDuration,
  itemGap,
  itemType,
  onDragStart,
  onDragOver,
  onDrop,
  onDragCancel,
}: BoardProviderProps<TItem>) {
  // Store callbacks in ref to avoid engine recreation
  const callbacksRef = useRef<BoardCallbacks<TItem>>({
    onDragStart,
    onDragOver,
    onDrop,
    onDragCancel,
  });

  useEffect(() => {
    callbacksRef.current = {
      onDragStart,
      onDragOver,
      onDrop,
      onDragCancel,
    };
  }, [onDragStart, onDragOver, onDrop, onDragCancel]);

  // Create engine once
  const engine = useMemo(() => {
    const config: BoardConfig<TItem> = {
      animate,
      animationDuration,
      itemGap,
      itemType,
      callbacks: {
        onDragStart: (item, colId) =>
          callbacksRef.current.onDragStart?.(item, colId),
        onDragOver: (item, colId, idx) =>
          callbacksRef.current.onDragOver?.(item, colId, idx),
        onDrop: (result) => callbacksRef.current.onDrop?.(result),
        onDragCancel: (item) => callbacksRef.current.onDragCancel?.(item),
      },
    };
    return createBoardEngine<TItem, unknown>(config);
  }, [animate, animationDuration, itemGap, itemType]);

  // Note: We intentionally DON'T call engine.destroy() in useEffect cleanup.
  // In React 18 StrictMode, useEffect cleanup runs during simulated unmount,
  // which clears the engine's internal Maps. But ref callbacks don't re-run
  // (their deps are stable), leaving elements with listeners but not registered.
  // The engine is garbage collected when the component truly unmounts.

  return (
    <BoardContext.Provider value={engine}>{children}</BoardContext.Provider>
  );
}

/**
 * Hook to access the board engine
 */
export function useBoardEngine<TItem = unknown>(): BoardEngine<TItem, unknown> {
  const engine = useContext(BoardContext);
  if (!engine) {
    throw new Error('useBoardEngine must be used within a BoardProvider');
  }
  return engine as BoardEngine<TItem, unknown>;
}

/**
 * Hook to subscribe to board drag state
 */
export function useBoardState<TItem = unknown>(): BoardDragState<TItem> {
  const engine = useBoardEngine<TItem>();
  const [state, setState] = useState(() => engine.getState());

  useEffect(() => {
    return engine.subscribe(setState);
  }, [engine]);

  return state;
}

/**
 * Options for useBoardColumn hook
 */
export interface UseBoardColumnOptions<TColumn = unknown> {
  /** Unique column ID */
  id: DndId;
  /** Column metadata */
  data: TColumn;
  /** Whether dropping is disabled */
  disabled?: boolean;
}

/**
 * Return value from useBoardColumn hook
 */
export interface UseBoardColumnResult {
  /** Ref to attach to column element */
  ref: (element: HTMLElement | null) => void;
  /** Ref to attach to items container (for position calculation) */
  itemsContainerRef: (element: HTMLElement | null) => void;
  /** Whether an item is being dragged over this column */
  isOver: boolean;
  /** Drop indicator info if showing in this column */
  dropIndicator: DropIndicatorPosition | null;
}

/**
 * Hook to make an element a board column (drop zone)
 *
 * @example
 * ```tsx
 * function Column({ id, title, items }) {
 *   const { ref, itemsContainerRef, isOver, dropIndicator } = useBoardColumn({
 *     id,
 *     data: { title },
 *   });
 *
 *   return (
 *     <div ref={ref} className={isOver ? 'highlight' : ''}>
 *       <h2>{title}</h2>
 *       <div ref={itemsContainerRef}>
 *         {items.map((item, index) => (
 *           <BoardItem key={item.id} item={item} columnId={id} index={index} />
 *         ))}
 *         {dropIndicator && <DropIndicator {...dropIndicator} />}
 *       </div>
 *     </div>
 *   );
 * }
 * ```
 */
export function useBoardColumn<TItem = unknown, TColumn = unknown>(
  options: UseBoardColumnOptions<TColumn>
): UseBoardColumnResult {
  const engine = useBoardEngine<TItem>();
  const state = useBoardState<TItem>();
  const handleRef = useRef<ReturnType<typeof engine.registerColumn> | null>(
    null
  );
  const columnElementRef = useRef<HTMLElement | null>(null);
  const itemsContainerRef = useRef<HTMLElement | null>(null);
  const optionsRef = useRef(options);

  // Function to get item positions (using client coordinates for comparison with pointer)
  const getItemPositions = useCallback((): ItemPosition[] => {
    const container = itemsContainerRef.current;
    if (!container) return [];

    const positions: ItemPosition[] = [];

    // Get positions from all item elements in this column
    // Using client coordinates to match pointer position
    const items = container.querySelectorAll('[data-board-item]');
    items.forEach((el, index) => {
      const rect = el.getBoundingClientRect();
      const id = el.getAttribute('data-board-item-id');
      if (id) {
        positions.push({
          id,
          index,
          top: rect.top,       // Client coordinates
          bottom: rect.bottom, // Client coordinates
          height: rect.height,
        });
      }
    });

    return positions;
  }, []);

  // Update options ref
  useEffect(() => {
    optionsRef.current = options;
    handleRef.current?.update({ data: options.data, disabled: options.disabled });
  }, [options]);

  // Column element ref callback - handles both registration and cleanup
  // Note: We don't use a useEffect cleanup because the ref callback handles it
  // when React calls it with null. This is important for React 18 StrictMode.
  const ref = useCallback(
    (element: HTMLElement | null) => {
      if (handleRef.current) {
        handleRef.current.destroy();
        handleRef.current = null;
      }

      columnElementRef.current = element;

      if (element) {
        handleRef.current = engine.registerColumn(element, {
          id: optionsRef.current.id,
          data: optionsRef.current.data,
          getItemPositions,
        });
      }
    },
    [engine, getItemPositions]
  );

  // Items container ref callback
  const itemsRef = useCallback((element: HTMLElement | null) => {
    itemsContainerRef.current = element;
  }, []);

  const isOver = state.dropIndicator?.columnId === options.id;

  return {
    ref,
    itemsContainerRef: itemsRef,
    isOver,
    dropIndicator: isOver ? state.dropIndicator : null,
  };
}

/**
 * Options for useBoardItem hook
 */
export interface UseBoardItemOptions<TItem = unknown> {
  /** Unique item ID */
  id: DndId;
  /** Item data */
  data: TItem;
  /** ID of containing column */
  columnId: DndId;
  /** Index within column */
  index: number;
  /** Whether dragging is disabled */
  disabled?: boolean;
}

/**
 * Return value from useBoardItem hook
 */
export interface UseBoardItemResult {
  /** Ref to attach to item element */
  ref: (element: HTMLElement | null) => void;
  /** Whether this item is currently being dragged */
  isDragging: boolean;
  /** Style to apply for drag state (opacity) */
  style: CSSProperties;
}

/**
 * Hook to make an element a draggable board item
 *
 * @example
 * ```tsx
 * function Card({ id, data, columnId, index }) {
 *   const { ref, isDragging, style } = useBoardItem({
 *     id,
 *     data,
 *     columnId,
 *     index,
 *   });
 *
 *   return (
 *     <div ref={ref} style={style} className="card">
 *       {data.title}
 *     </div>
 *   );
 * }
 * ```
 */
export function useBoardItem<TItem = unknown>(
  options: UseBoardItemOptions<TItem>
): UseBoardItemResult {
  const engine = useBoardEngine<TItem>();
  const state = useBoardState<TItem>();
  const settingsContext = useContext(BoardSettingsContext);
  const handleRef = useRef<ReturnType<typeof engine.registerItem> | null>(null);
  const elementRef = useRef<HTMLElement | null>(null);
  const optionsRef = useRef(options);

  // Get ghost opacity from settings or use default
  const ghostOpacity = settingsContext?.settings.ghostOpacity ?? defaultBoardSettings.ghostOpacity;

  // Update options ref
  useEffect(() => {
    optionsRef.current = options;
    handleRef.current?.update({
      data: options.data,
      columnId: options.columnId,
      index: options.index,
      disabled: options.disabled,
    });
  }, [options]);

  // Ref callback - handles both registration and cleanup
  // Note: We don't use a useEffect cleanup because the ref callback handles it
  // when React calls it with null. This is important for React 18 StrictMode
  // compatibility where effects may be re-run without re-calling the ref.
  const ref = useCallback(
    (element: HTMLElement | null) => {
      if (handleRef.current) {
        handleRef.current.destroy();
        handleRef.current = null;
      }

      elementRef.current = element;

      if (element) {
        // Add data attributes for position calculation
        element.setAttribute('data-board-item', 'true');
        element.setAttribute('data-board-item-id', String(optionsRef.current.id));

        handleRef.current = engine.registerItem(element, {
          id: optionsRef.current.id,
          data: optionsRef.current.data,
          columnId: optionsRef.current.columnId,
          index: optionsRef.current.index,
          disabled: optionsRef.current.disabled,
        });
      }
    },
    [engine]
  );

  const isDragging =
    state.isDragging && state.draggedItem?.id === options.id;

  const style: CSSProperties = {
    opacity: isDragging ? ghostOpacity : 1,
    transition: isDragging ? 'none' : 'opacity 0.2s ease',
  };

  return {
    ref,
    isDragging,
    style,
  };
}

/**
 * Props for DragOverlay component
 */
export interface DragOverlayProps<TItem = unknown> {
  /** Render function for the dragged item */
  children: (item: BoardItem<TItem>) => ReactNode;
  /** Optional className for the overlay container */
  className?: string;
  /** Optional inline styles */
  style?: CSSProperties;
  /** Optional className for the wrapper div (outer container) */
  wrapperClassName?: string;
  /** Optional inline styles for the wrapper div (outer container) */
  wrapperStyle?: CSSProperties;
}

/**
 * Component that renders the dragged item following the cursor
 *
 * The overlay is rendered using a portal at the document body level
 * and uses CSS transforms for smooth movement.
 *
 * @example Basic usage
 * ```tsx
 * <DragOverlay>
 *   {(item) => <Card data={item.data} />}
 * </DragOverlay>
 * ```
 *
 * @example With wrapper customization
 * ```tsx
 * <DragOverlay
 *   wrapperClassName="drag-container"
 *   wrapperStyle={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))' }}
 *   className="drag-item"
 * >
 *   {(item) => <Card data={item.data} />}
 * </DragOverlay>
 * ```
 */
export function DragOverlay<TItem = unknown>({
  children,
  className = '',
  style: customStyle,
  wrapperClassName = '',
  wrapperStyle,
}: DragOverlayProps<TItem>) {
  const state = useBoardState<TItem>();
  const settingsContext = useContext(BoardSettingsContext);
  const settings = settingsContext?.settings ?? defaultBoardSettings;
  const [position, setPosition] = useState<Point | null>(null);

  // Track pointer position during drag
  useEffect(() => {
    if (!state.isDragging) {
      setPosition(null);
      return;
    }

    const handlePointerMove = (e: PointerEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('pointermove', handlePointerMove);
    return () => window.removeEventListener('pointermove', handlePointerMove);
  }, [state.isDragging]);

  if (!state.isDragging || !state.draggedItem || !position || !settings.showOverlay) {
    return null;
  }

  // Apply drag offset so the overlay appears where the user grabbed it
  const dragOffset = state.dragOffset || { x: 0, y: 0 };
  const overlayX = position.x - dragOffset.x;
  const overlayY = position.y - dragOffset.y;

  const overlayStyle: CSSProperties = {
    position: 'fixed',
    left: 0,
    top: 0,
    transform: `translate(${overlayX}px, ${overlayY}px)`,
    pointerEvents: 'none',
    zIndex: settings.overlayZIndex,
    cursor: settings.dragCursor,
    ...customStyle,
  };

  const content = (
    <div className={`board-dnd-overlay ${className}`} style={overlayStyle}>
      {children(state.draggedItem)}
    </div>
  );

  // If wrapper props provided, wrap the content
  if (wrapperClassName || wrapperStyle) {
    return (
      <div className={wrapperClassName} style={wrapperStyle}>
        {content}
      </div>
    );
  }

  return content;
}

/**
 * Props passed to custom render function
 */
export interface DropIndicatorRenderProps {
  /** Column ID where the indicator is shown */
  columnId: DndId;
  /** Index where the item will be inserted */
  insertIndex: number;
}

/**
 * Props for DropIndicator component
 */
export interface DropIndicatorComponentProps {
  /** Pixel height of the indicator */
  height?: number;
  /** Optional className */
  className?: string;
  /** Optional inline styles */
  style?: CSSProperties;
  /** Column ID (passed automatically when using with useBoardColumn) */
  columnId?: DndId;
  /** Insert index (passed automatically when using with useBoardColumn) */
  insertIndex?: number;
  /** Render prop for fully custom indicator */
  render?: (props: DropIndicatorRenderProps) => ReactNode;
}

/**
 * Component showing where an item will be inserted
 *
 * Supports custom rendering via the `render` prop for full control over the indicator appearance.
 *
 * @example Basic usage
 * ```tsx
 * function Column({ id, items }) {
 *   const { dropIndicator } = useBoardColumn({ id, data: {} });
 *
 *   return (
 *     <div>
 *       {items.map((item, i) => (
 *         <React.Fragment key={item.id}>
 *           {dropIndicator?.insertIndex === i && <DropIndicator />}
 *           <Card {...item} />
 *         </React.Fragment>
 *       ))}
 *       {dropIndicator?.insertIndex === items.length && <DropIndicator />}
 *     </div>
 *   );
 * }
 * ```
 *
 * @example Custom render prop
 * ```tsx
 * <DropIndicator
 *   columnId={columnId}
 *   insertIndex={insertIndex}
 *   render={({ columnId, insertIndex }) => (
 *     <div className="my-custom-indicator">
 *       Dropping at position {insertIndex} in column {columnId}
 *     </div>
 *   )}
 * />
 * ```
 */
export function DropIndicator({
  height,
  className = '',
  style: customStyle,
  columnId,
  insertIndex,
  render,
}: DropIndicatorComponentProps) {
  const settingsContext = useContext(BoardSettingsContext);
  const settings = settingsContext?.settings ?? defaultBoardSettings;
  const indicatorHeight = height ?? settings.indicatorHeight;
  const indicatorColor = settings.indicatorColor;
  const indicatorBorderRadius = settings.indicatorBorderRadius;

  // If a custom render function is provided, use it
  if (render && columnId !== undefined && insertIndex !== undefined) {
    return <>{render({ columnId, insertIndex })}</>;
  }

  const indicatorStyle: CSSProperties = {
    height: indicatorHeight,
    backgroundColor: `var(--board-dnd-indicator-color, ${indicatorColor})`,
    borderRadius: indicatorBorderRadius,
    opacity: 0.5,
    transition: 'opacity 0.15s ease',
    ...customStyle,
  };

  return (
    <div
      className={`board-dnd-indicator ${className}`}
      style={indicatorStyle}
    />
  );
}

// ============================================================================
// Board Settings Provider
// ============================================================================

/**
 * Context for board settings that can be persisted
 */
interface BoardSettingsContextValue {
  settings: Required<BoardSettings>;
  updateSettings: (settings: Partial<BoardSettings>) => void;
  resetSettings: () => void;
}

const BoardSettingsContext = createContext<BoardSettingsContextValue | null>(null);

/**
 * Props for BoardSettingsProvider component
 */
export interface BoardSettingsProviderProps {
  children: ReactNode;
  /** Initial settings (merged with defaults) */
  initialSettings?: BoardSettings;
  /** Storage key for persisting settings (uses localStorage if provided) */
  storageKey?: string;
  /** Callback when settings change */
  onSettingsChange?: (settings: Required<BoardSettings>) => void;
}

/**
 * Provider for board settings that can be persisted
 *
 * Use this to allow users to customize and save their board preferences.
 * Settings are automatically loaded from and saved to localStorage if a
 * storageKey is provided.
 *
 * @example
 * ```tsx
 * <BoardSettingsProvider
 *   storageKey="my-board-settings"
 *   initialSettings={{ ghostOpacity: 0.3 }}
 * >
 *   <BoardProvider onDrop={handleDrop}>
 *     ...
 *   </BoardProvider>
 * </BoardSettingsProvider>
 * ```
 */
export function BoardSettingsProvider({
  children,
  initialSettings = {},
  storageKey,
  onSettingsChange,
}: BoardSettingsProviderProps) {
  // Load from storage on mount
  const loadedSettings = useMemo(() => {
    if (storageKey && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          return JSON.parse(stored) as BoardSettings;
        }
      } catch {
        // Ignore parse errors
      }
    }
    return {};
  }, [storageKey]);

  const [settings, setSettings] = useState<Required<BoardSettings>>({
    ...defaultBoardSettings,
    ...loadedSettings,
    ...initialSettings,
  });

  // Save to storage and notify on change
  useEffect(() => {
    if (storageKey && typeof window !== 'undefined') {
      localStorage.setItem(storageKey, JSON.stringify(settings));
    }
    onSettingsChange?.(settings);
  }, [settings, storageKey, onSettingsChange]);

  const updateSettings = useCallback((updates: Partial<BoardSettings>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(defaultBoardSettings);
  }, []);

  const value = useMemo(
    () => ({ settings, updateSettings, resetSettings }),
    [settings, updateSettings, resetSettings]
  );

  return (
    <BoardSettingsContext.Provider value={value}>
      {children}
    </BoardSettingsContext.Provider>
  );
}

/**
 * Hook to access and update board settings
 *
 * @example
 * ```tsx
 * function SettingsPanel() {
 *   const { settings, updateSettings, resetSettings } = useBoardSettings();
 *
 *   return (
 *     <div>
 *       <input
 *         type="range"
 *         value={settings.ghostOpacity}
 *         onChange={(e) => updateSettings({ ghostOpacity: +e.target.value })}
 *       />
 *       <button onClick={resetSettings}>Reset</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useBoardSettings(): BoardSettingsContextValue {
  const context = useContext(BoardSettingsContext);
  if (!context) {
    // Return default settings if not wrapped in provider
    return {
      settings: defaultBoardSettings,
      updateSettings: () => {
        console.warn('useBoardSettings: No BoardSettingsProvider found');
      },
      resetSettings: () => {
        console.warn('useBoardSettings: No BoardSettingsProvider found');
      },
    };
  }
  return context;
}

// Re-export types
export type {
  BoardConfig,
  BoardCallbacks,
  BoardDragState,
  BoardItem,
  BoardDropResult,
  DropIndicatorPosition,
  BoardColumn,
  BoardState,
  BoardSettings,
} from '../types';

export { defaultBoardSettings } from '../types';

export type { DndId } from '@agallaoui/dnd-core';
