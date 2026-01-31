import { useState } from 'react'
import { useVerticalDnd } from '@agal1aoui/react-dnd'

interface Task {
  id: string
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
}

const initialTasks: Task[] = [
  { id: '1', title: 'Research Phase', description: 'Gather requirements', priority: 'high' },
  { id: '2', title: 'Design System', description: 'Create UI components', priority: 'medium' },
  { id: '3', title: 'Development', description: 'Build features', priority: 'high' },
  { id: '4', title: 'Testing', description: 'QA and bug fixes', priority: 'medium' },
  { id: '5', title: 'Deployment', description: 'Launch to production', priority: 'low' },
]

const priorityColors = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-green-100 text-green-700',
}

export function VerticalSortable() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)

  const { containerRef, getItemProps } = useVerticalDnd<Task, HTMLUListElement>({
    items: tasks,
    keyExtractor: (task) => task.id,
    onReorder: setTasks,
    gap: 12,
  })

  return (
    <div className="max-w-md mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Vertical List</h2>
      <ul ref={containerRef} className="space-y-3">
        {tasks.map((task, index) => (
          <li
            key={task.id}
            {...getItemProps(task, index)}
            className="
              relative p-4 bg-white rounded-lg shadow-sm border-2 border-transparent
              cursor-grab select-none transition-all duration-200
              hover:shadow-md hover:border-gray-200
              data-[dnd-dragging]:cursor-grabbing data-[dnd-dragging]:shadow-xl
              data-[dnd-dragging]:border-blue-400 data-[dnd-dragging]:rotate-2
              before:content-[''] before:absolute before:-top-2 before:left-0 before:right-0
              before:h-1 before:bg-blue-500 before:rounded-full
              before:opacity-0 before:transition-opacity
              data-[dnd-drop-before]:before:opacity-100
            "
          >
            <div className="flex items-center gap-3">
              <span className="text-gray-400">&#9776;</span>
              <div className="flex-1">
                <h3 className="font-semibold">{task.title}</h3>
                <p className="text-sm text-gray-500">{task.description}</p>
              </div>
              <span className={`px-2 py-1 text-xs rounded-full ${priorityColors[task.priority]}`}>
                {task.priority}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
