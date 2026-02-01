/**
 * @agallaoui/board-dnd
 *
 * Kanban-style board drag-and-drop extension for @agallaoui/dnd-core.
 *
 * ## Overview
 *
 * This package extends `@agallaoui/dnd-core` with board-specific functionality:
 * - Column-based drop zones
 * - Visual drop indicators
 * - Index-based item insertion
 * - Ghost item rendering during drag
 *
 * ## Architecture
 *
 * ```
 * ┌─────────────────────────────────────────────────────────────┐
 * │                     Board DnD Package                       │
 * ├─────────────────────────────────────────────────────────────┤
 * │  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐   │
 * │  │   Columns   │  │   Indicator  │  │   Board State    │   │
 * │  │  (Droppable)│  │  Calculator  │  │    (Extended)    │   │
 * │  └─────────────┘  └──────────────┘  └──────────────────┘   │
 * │           │               │                  │              │
 * │           └───────────────┼──────────────────┘              │
 * │                           │                                 │
 * │              ┌────────────┴────────────┐                    │
 * │              │    @agallaoui/dnd-core  │                    │
 * │              │      (Core Engine)      │                    │
 * │              └─────────────────────────┘                    │
 * └─────────────────────────────────────────────────────────────┘
 * ```
 *
 * ## Drag Behavior
 *
 * The board DnD follows a specific UX flow:
 *
 * ### Drag Start
 * - Original item remains in place with 50% opacity (ghost)
 * - Drag overlay follows the cursor
 * - Source column/index is tracked
 *
 * ### Drag Over Column
 * - Drop indicator shows at calculated insertion point
 * - Indicator position based on pointer Y relative to items
 * - Original item does NOT move (prevents layout shifts)
 *
 * ### Drop
 * - State update callback fired with from/to information
 * - Caller is responsible for updating their data
 * - Animations handled via CSS transitions
 *
 * ## Usage
 *
 * ### Vanilla JavaScript
 * ```typescript
 * import { createBoardEngine } from '@agallaoui/board-dnd';
 *
 * const engine = createBoardEngine({
 *   callbacks: {
 *     onDrop: ({ item, fromColumnId, toColumnId, toIndex }) => {
 *       moveItem(item.id, fromColumnId, toColumnId, toIndex);
 *     }
 *   }
 * });
 *
 * // Register columns
 * const colHandle = engine.registerColumn(columnElement, {
 *   id: 'col-1',
 *   data: { name: 'Todo' },
 *   getItemPositions: () => calculatePositions()
 * });
 *
 * // Register items
 * const itemHandle = engine.registerItem(itemElement, {
 *   id: 'item-1',
 *   data: { title: 'My Task' },
 *   columnId: 'col-1',
 *   index: 0
 * });
 * ```
 *
 * ### React
 * ```tsx
 * import { BoardProvider, useBoardColumn, useBoardItem } from '@agallaoui/board-dnd/react';
 *
 * function Board({ columns }) {
 *   return (
 *     <BoardProvider onDrop={handleDrop}>
 *       {columns.map(col => <Column key={col.id} {...col} />)}
 *       <DragOverlay>{(item) => <Card {...item} />}</DragOverlay>
 *     </BoardProvider>
 *   );
 * }
 * ```
 *
 * ### Angular
 * ```typescript
 * import { BoardDndServiceBase } from '@agallaoui/board-dnd/angular';
 *
 * @Injectable({ providedIn: 'root' })
 * export class BoardService extends BoardDndServiceBase {
 *   // Custom implementation
 * }
 * ```
 *
 * ## Drop Indicator Logic
 *
 * The indicator position is calculated by:
 *
 * 1. Getting bounding rects of all items in the target column
 * 2. Finding the midpoint of each item
 * 3. If pointer Y < item midpoint → insert before
 * 4. If pointer Y >= last item midpoint → insert at end
 *
 * This creates natural "snap" behavior where the indicator moves
 * as you cross the midpoint of each item.
 *
 * @packageDocumentation
 */

// Board engine
export { createBoardEngine, type BoardEngine, type ItemPosition } from './board-engine';

// All types
export type {
  // Board data types
  BoardItem,
  BoardColumn,
  BoardState,

  // Drag state types
  BoardDragState,
  DropIndicatorPosition,

  // Event types
  BoardDropResult,
  BoardCallbacks,

  // Configuration types
  BoardConfig,
  BoardColumnOptions,
  BoardItemOptions,

  // Render prop types
  DragOverlayProps,
  DropIndicatorProps,
} from './types';
