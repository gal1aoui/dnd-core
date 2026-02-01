/**
 * @agallaoui/dnd-core
 *
 * A lightweight, framework-agnostic drag-and-drop engine built on Pointer Events.
 *
 * ## Overview
 *
 * This package provides the core drag-and-drop functionality that can be used
 * standalone or extended by other packages like `@agallaoui/board-dnd`.
 *
 * ## Architecture
 *
 * ```
 * ┌─────────────────────────────────────────────────────────────┐
 * │                        DnD Engine                           │
 * ├─────────────────────────────────────────────────────────────┤
 * │  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐   │
 * │  │ Draggables  │  │  Droppables  │  │  State Manager   │   │
 * │  │  Registry   │  │   Registry   │  │  & Subscribers   │   │
 * │  └─────────────┘  └──────────────┘  └──────────────────┘   │
 * │           │               │                  │              │
 * │           └───────────────┼──────────────────┘              │
 * │                           │                                 │
 * │              ┌────────────┴────────────┐                    │
 * │              │    Pointer Event        │                    │
 * │              │       Handler           │                    │
 * │              └─────────────────────────┘                    │
 * └─────────────────────────────────────────────────────────────┘
 * ```
 *
 * ## Key Concepts
 *
 * ### Draggable
 * An element that can be picked up and moved. Registered with:
 * - `id`: Unique identifier
 * - `type`: Category for filtering drop targets
 * - `payload`: Custom data attached to drag operations
 *
 * ### Droppable
 * A zone where draggables can be dropped. Registered with:
 * - `id`: Unique identifier
 * - `accepts`: Array of drag types this zone accepts
 * - `payload`: Custom data attached to the zone
 *
 * ### DnD State
 * The engine maintains a reactive state object containing:
 * - Current drag phase (idle, dragging, dropping)
 * - Active drag data and position
 * - Hovered drop zone information
 *
 * ## Usage
 *
 * ### Vanilla JavaScript
 * ```typescript
 * import { createDndEngine } from '@agallaoui/dnd-core';
 *
 * const engine = createDndEngine({
 *   callbacks: {
 *     onDrop: ({ item, dropZone }) => {
 *       console.log(`Dropped ${item.id} on ${dropZone.id}`);
 *     }
 *   }
 * });
 *
 * // Register elements
 * const dragHandle = engine.registerDraggable(element, {
 *   id: 'item-1',
 *   type: 'card',
 *   payload: { title: 'My Card' }
 * });
 *
 * const dropHandle = engine.registerDroppable(dropZoneElement, {
 *   id: 'column-1',
 *   accepts: ['card'],
 *   payload: { columnName: 'Todo' }
 * });
 * ```
 *
 * ### React
 * ```tsx
 * import { DndProvider, useDraggable, useDroppable } from '@agallaoui/dnd-core/react';
 *
 * function App() {
 *   return (
 *     <DndProvider onDrop={handleDrop}>
 *       <DraggableCard />
 *       <DropColumn />
 *     </DndProvider>
 *   );
 * }
 * ```
 *
 * ### Angular
 * ```typescript
 * import { DndServiceBase } from '@agallaoui/dnd-core/angular';
 *
 * @Injectable({ providedIn: 'root' })
 * export class DndService extends DndServiceBase {
 *   // Custom implementation
 * }
 * ```
 *
 * ## Performance Optimizations
 *
 * - **Pointer Events**: Single event API for mouse/touch, no polyfills needed
 * - **Minimal DOM Access**: Bounding rects cached, batch reads/writes
 * - **Tree-shakable**: Only import what you use
 * - **Zero Dependencies**: No external runtime dependencies
 * - **Efficient State Updates**: Subscribers notified via Set iteration
 *
 * @packageDocumentation
 */

// Core engine
export { createDndEngine, type DndEngine } from './engine';

// All types
export type {
  // Basic types
  Point,
  Rect,
  DndId,
  DragPhase,

  // Data types
  DragData,
  DropZoneData,
  DndState,

  // Event types
  DragStartEvent,
  DragOverEvent,
  DropEvent,
  DragEndEvent,

  // Configuration types
  DndCallbacks,
  DndConfig,
  DraggableOptions,
  DroppableOptions,

  // Handle types
  DraggableHandle,
  DroppableHandle,
} from './types';
