/**
 * Pre-built React components for quick board setup
 *
 * These components provide ready-to-use building blocks for Kanban boards.
 * Use them for quick setup or as examples for building custom components.
 *
 * @example Quick setup
 * ```tsx
 * import { Board } from '@agallaoui/board-dnd/react/components';
 *
 * function App() {
 *   return (
 *     <Board
 *       columns={columns}
 *       onDrop={handleDrop}
 *       renderItem={(task) => <TaskCard task={task} />}
 *     />
 *   );
 * }
 * ```
 *
 * @example Custom composition
 * ```tsx
 * import { BoardColumn, BoardItem } from '@agallaoui/board-dnd/react/components';
 *
 * function MyBoard() {
 *   return (
 *     <BoardProvider onDrop={handleDrop}>
 *       {columns.map(col => (
 *         <BoardColumn
 *           key={col.id}
 *           id={col.id}
 *           data={col.data}
 *           items={col.items}
 *           renderItem={(item, index) => (
 *             <BoardItem id={item.id} data={item} columnId={col.id} index={index}>
 *               <TaskCard task={item} />
 *             </BoardItem>
 *           )}
 *         />
 *       ))}
 *     </BoardProvider>
 *   );
 * }
 * ```
 */

export { Board, type BoardProps, type ColumnData } from './Board';
export { BoardColumn, type BoardColumnProps } from './Column';
export { BoardItem, type BoardItemProps } from './Item';
