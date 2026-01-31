import { useState } from 'react'
import { VerticalSortable } from './VerticalSortable'
import { HorizontalTabs, HorizontalGallery } from './HorizontalSortable'
import { KanbanBoard } from './KanbanBoard'
import { WidgetDashboard, PhotoGrid } from './GridLayout'

type Demo = 'vertical' | 'horizontal' | 'board' | 'layout'

const demos: { id: Demo; title: string }[] = [
  { id: 'vertical', title: 'Vertical List' },
  { id: 'horizontal', title: 'Horizontal' },
  { id: 'board', title: 'Kanban Board' },
  { id: 'layout', title: 'Grid Layout' },
]

export default function App() {
  const [activeDemo, setActiveDemo] = useState<Demo>('vertical')

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-6 px-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold">@agal1aoui/react-dnd Demo</h1>
          <p className="text-blue-100 text-sm mt-1">Zero re-renders during drag</p>
        </div>
      </header>

      <nav className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex gap-1 overflow-x-auto py-2">
            {demos.map((demo) => (
              <button
                key={demo.id}
                onClick={() => setActiveDemo(demo.id)}
                className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors
                  ${activeDemo === demo.id ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                {demo.title}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto py-8 px-6">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {activeDemo === 'vertical' && <VerticalSortable />}
          {activeDemo === 'horizontal' && (
            <div className="space-y-8">
              <HorizontalTabs />
              <HorizontalGallery />
            </div>
          )}
          {activeDemo === 'board' && <KanbanBoard />}
          {activeDemo === 'layout' && (
            <div className="space-y-12">
              <WidgetDashboard />
              <PhotoGrid />
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
