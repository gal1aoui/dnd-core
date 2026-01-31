import { useState, useCallback } from 'react'
import { useBoardDnd, type ItemMoveEvent } from '@agal1aoui/react-dnd'

interface Task {
  id: string
  title: string
  tag: 'feature' | 'bug' | 'improvement' | 'task'
  priority: 1 | 2 | 3
}

interface Column {
  id: string
  title: string
  items: Task[]
}

const initialColumns: Column[] = [
  {
    id: 'todo',
    title: 'To Do',
    items: [
      { id: '1', title: 'Implement user auth', tag: 'feature', priority: 3 },
      { id: '2', title: 'Design landing page', tag: 'task', priority: 2 },
      { id: '3', title: 'Setup CI/CD', tag: 'improvement', priority: 1 },
    ],
  },
  {
    id: 'progress',
    title: 'In Progress',
    items: [
      { id: '4', title: 'Fix navigation bug', tag: 'bug', priority: 3 },
      { id: '5', title: 'Add dark mode', tag: 'feature', priority: 2 },
    ],
  },
  {
    id: 'review',
    title: 'In Review',
    items: [
      { id: '6', title: 'API rate limiting', tag: 'improvement', priority: 2 },
    ],
  },
  {
    id: 'done',
    title: 'Done',
    items: [
      { id: '7', title: 'Initial setup', tag: 'task', priority: 1 },
    ],
  },
]

const tagColors = {
  feature: 'bg-blue-100 text-blue-700',
  bug: 'bg-red-100 text-red-700',
  improvement: 'bg-green-100 text-green-700',
  task: 'bg-purple-100 text-purple-700',
}

export function KanbanBoard() {
  const [columns, setColumns] = useState<Column[]>(initialColumns)

  const handleItemMove = useCallback((event: ItemMoveEvent<Task>) => {
    const { item, fromColumn, toColumn, fromIndex, toIndex } = event

    setColumns((prev) => {
      const newColumns = prev.map((col) => ({ ...col, items: [...col.items] }))
      const sourceCol = newColumns.find((c) => c.id === fromColumn)!
      const targetCol = newColumns.find((c) => c.id === toColumn)!
      sourceCol.items.splice(fromIndex, 1)
      targetCol.items.splice(toIndex, 0, item)
      return newColumns
    })
  }, [])

  const { getColumnProps, getItemProps } = useBoardDnd({
    columns,
    columnKeyExtractor: (column) => column.id,
    itemKeyExtractor: (task) => task.id,
    getColumnItems: (column) => column.items,
    onItemMove: handleItemMove,
    itemGap: 12,
    placeholderOpacity: 0.5,
    indicatorColor: 'primary',
  })

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Kanban Board</h2>
      <div className="flex gap-6 overflow-x-auto pb-4">
        {columns.map((column) => (
          <div
            key={column.id}
            {...getColumnProps(column)}
            className="
              w-72 flex-shrink-0 bg-gray-100 rounded-lg p-4
              data-[dnd-over]:bg-blue-50 data-[dnd-over]:ring-2 data-[dnd-over]:ring-blue-400
            "
          >
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
              <h3 className="font-semibold text-gray-700">{column.title}</h3>
              <span className="px-2 py-0.5 text-sm bg-gray-200 text-gray-600 rounded-full">
                {column.items.length}
              </span>
            </div>
            <div className="space-y-3 min-h-[100px]">
              {column.items.map((task, index) => (
                <div
                  key={task.id}
                  {...getItemProps(task, column.id, index)}
                  className="
                    p-3 bg-white rounded-lg shadow-sm cursor-grab select-none
                    border border-transparent hover:shadow-md
                    data-[dnd-dragging]:cursor-grabbing data-[dnd-dragging]:shadow-xl
                    data-[dnd-dragging]:rotate-3 data-[dnd-dragging]:border-blue-400
                  "
                >
                  <h4 className="font-medium text-gray-800 mb-2">{task.title}</h4>
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-0.5 text-xs rounded ${tagColors[task.tag]}`}>
                      {task.tag}
                    </span>
                    <div className="flex gap-0.5">
                      {[1, 2, 3].map((level) => (
                        <span
                          key={level}
                          className={`w-2 h-2 rounded-full ${level <= task.priority ? 'bg-amber-400' : 'bg-gray-200'}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {column.items.length === 0 && (
              <div className="text-center py-8 text-gray-400 text-sm">Drop items here</div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
