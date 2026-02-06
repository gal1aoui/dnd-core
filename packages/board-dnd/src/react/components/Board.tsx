/**
 * Pre-built complete board component
 *
 * A ready-to-use Kanban board that handles all DnD wiring.
 * Perfect for quick setup with minimal configuration.
 */

import { type ReactNode, type CSSProperties } from 'react';
import {
  BoardProvider,
  DragOverlay,
  type BoardDropResult,
  type BoardItem as BoardItemType,
  type DropIndicatorRenderProps,
} from '../index';
import { BoardColumn } from './Column';
import { BoardItem } from './Item';
import type { DndId } from '@agallaoui/dnd-core';

export interface ColumnData<TItem = unknown, TColumn = unknown> {
  id: DndId;
  data: TColumn;
  items: Array<TItem & { id: DndId }>;
}

export interface BoardProps<TItem = unknown, TColumn = unknown> {
  /** Columns with their items */
  columns: Array<ColumnData<TItem, TColumn>>;
  /** Callback when an item is dropped */
  onDrop: (result: BoardDropResult<TItem>) => void;
  /** Render function for each item */
  renderItem: (item: TItem, columnId: DndId, index: number) => ReactNode;
  /** Render function for the drag overlay */
  renderOverlay?: (item: BoardItemType<TItem>) => ReactNode;
  /** Custom column header render */
  renderColumnHeader?: (column: ColumnData<TItem, TColumn>) => ReactNode;
  /** Custom column footer render */
  renderColumnFooter?: (column: ColumnData<TItem, TColumn>) => ReactNode;
  /** Custom drop indicator render */
  renderDropIndicator?: (props: DropIndicatorRenderProps) => ReactNode;
  /** Called when drag starts */
  onDragStart?: (item: BoardItemType<TItem>, columnId: DndId) => void;
  /** Called during drag over */
  onDragOver?: (item: BoardItemType<TItem>, columnId: DndId, index: number) => void;
  /** Called when drag is cancelled */
  onDragCancel?: (item: BoardItemType<TItem>) => void;
  /** Whether to animate movements */
  animate?: boolean;
  /** Animation duration in ms */
  animationDuration?: number;
  /** Gap between items in pixels */
  itemGap?: number;
  /** Board container className */
  className?: string;
  /** Board container styles */
  style?: CSSProperties;
  /** Column className */
  columnClassName?: string;
  /** Column className when hovered */
  columnOverClassName?: string;
  /** Column items container className */
  columnItemsClassName?: string;
  /** Item className */
  itemClassName?: string;
  /** Item className when dragging */
  itemDraggingClassName?: string;
  /** Drag overlay className */
  overlayClassName?: string;
  /** Drag overlay wrapper className */
  overlayWrapperClassName?: string;
  /** Drop indicator height */
  indicatorHeight?: number;
  /** Drop indicator className */
  indicatorClassName?: string;
}

/**
 * Complete pre-built Kanban board
 *
 * Provides a fully wired board with columns, items, and drag overlay.
 * Use this for quick setup with minimal configuration.
 *
 * @example Basic usage
 * ```tsx
 * <Board
 *   columns={[
 *     { id: 'todo', data: { title: 'To Do' }, items: todoTasks },
 *     { id: 'done', data: { title: 'Done' }, items: doneTasks },
 *   ]}
 *   onDrop={handleDrop}
 *   renderItem={(task) => <TaskCard task={task} />}
 * />
 * ```
 *
 * @example With customization
 * ```tsx
 * <Board
 *   columns={columns}
 *   onDrop={handleDrop}
 *   renderItem={(task) => <TaskCard task={task} />}
 *   renderColumnHeader={(col) => <h2>{col.data.title}</h2>}
 *   renderOverlay={(item) => <TaskCard task={item.data} isOverlay />}
 *   renderDropIndicator={({ columnId, insertIndex }) => (
 *     <div className="custom-indicator" />
 *   )}
 *   columnClassName="bg-gray-100"
 *   columnOverClassName="bg-blue-50"
 * />
 * ```
 */
export function Board<TItem = unknown, TColumn = unknown>({
  columns,
  onDrop,
  renderItem,
  renderOverlay,
  renderColumnHeader,
  renderColumnFooter,
  renderDropIndicator,
  onDragStart,
  onDragOver,
  onDragCancel,
  animate,
  animationDuration,
  itemGap,
  className = '',
  style,
  columnClassName = '',
  columnOverClassName = '',
  columnItemsClassName = '',
  itemClassName = '',
  itemDraggingClassName = '',
  overlayClassName = '',
  overlayWrapperClassName = '',
  indicatorHeight,
  indicatorClassName = '',
}: BoardProps<TItem, TColumn>) {
  return (
    <BoardProvider
      onDrop={onDrop}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragCancel={onDragCancel}
      animate={animate}
      animationDuration={animationDuration}
      itemGap={itemGap}
    >
      <div className={`board-dnd-board ${className}`} style={style}>
        {columns.map((column) => (
          <BoardColumn
            key={String(column.id)}
            id={column.id}
            data={column.data}
            items={column.items}
            className={columnClassName}
            overClassName={columnOverClassName}
            itemsClassName={columnItemsClassName}
            header={renderColumnHeader?.(column)}
            footer={renderColumnFooter?.(column)}
            renderDropIndicator={renderDropIndicator}
            indicatorHeight={indicatorHeight}
            indicatorClassName={indicatorClassName}
            renderItem={(item, index) => (
              <BoardItem
                key={String((item as TItem & { id: DndId }).id)}
                id={(item as TItem & { id: DndId }).id}
                data={item}
                columnId={column.id}
                index={index}
                className={itemClassName}
                draggingClassName={itemDraggingClassName}
              >
                {renderItem(item, column.id, index)}
              </BoardItem>
            )}
          />
        ))}
      </div>
      <DragOverlay
        className={overlayClassName}
        wrapperClassName={overlayWrapperClassName}
      >
        {(item) =>
          renderOverlay ? (
            renderOverlay(item as BoardItemType<TItem>)
          ) : (
            <div className="board-dnd-overlay-item">
              {renderItem(item.data as TItem, '' as DndId, -1)}
            </div>
          )
        }
      </DragOverlay>
    </BoardProvider>
  );
}
