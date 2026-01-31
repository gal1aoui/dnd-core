import { useState } from 'react'
import { useLayoutDnd } from '@agal1aoui/react-dnd'

interface Widget {
  id: string
  title: string
  value: string
  icon: string
  gradient: string
}

const initialWidgets: Widget[] = [
  { id: 'weather', title: 'Weather', value: '24°C', icon: '⛅', gradient: 'from-blue-400 to-purple-500' },
  { id: 'calendar', title: 'Calendar', value: '3 events', icon: '📅', gradient: 'from-pink-400 to-red-500' },
  { id: 'tasks', title: 'Tasks', value: '5 pending', icon: '✅', gradient: 'from-cyan-400 to-blue-500' },
  { id: 'notes', title: 'Notes', value: '12 notes', icon: '📝', gradient: 'from-green-400 to-emerald-500' },
  { id: 'photos', title: 'Photos', value: '156', icon: '📷', gradient: 'from-orange-400 to-yellow-500' },
  { id: 'music', title: 'Music', value: 'Playing', icon: '🎵', gradient: 'from-purple-400 to-pink-500' },
  { id: 'mail', title: 'Mail', value: '23 unread', icon: '✉️', gradient: 'from-red-400 to-orange-500' },
  { id: 'fitness', title: 'Fitness', value: '8,432', icon: '🏃', gradient: 'from-green-400 to-teal-500' },
  { id: 'stocks', title: 'Stocks', value: '+2.4%', icon: '📈', gradient: 'from-violet-400 to-purple-500' },
]

export function WidgetDashboard() {
  const [widgets, setWidgets] = useState<Widget[]>(initialWidgets)

  const { containerRef, getItemProps } = useLayoutDnd<Widget, HTMLDivElement>({
    items: widgets,
    keyExtractor: (widget) => widget.id,
    onReorder: setWidgets,
  })

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Widget Dashboard</h2>
      <div ref={containerRef} className="grid grid-cols-3 gap-4">
        {widgets.map((widget, index) => (
          <div
            key={widget.id}
            {...getItemProps(widget, index)}
            className={`
              relative aspect-square rounded-2xl p-5 text-white
              bg-gradient-to-br ${widget.gradient}
              cursor-grab select-none flex flex-col items-center justify-center gap-3
              transition-all duration-200 hover:shadow-lg
              data-[dnd-dragging]:cursor-grabbing data-[dnd-dragging]:shadow-2xl
              data-[dnd-dragging]:scale-105 data-[dnd-dragging]:z-50
              before:content-[''] before:absolute before:-left-2.5 before:top-1 before:bottom-1
              before:w-1.5 before:bg-white before:rounded-full before:shadow-lg
              before:opacity-0 before:transition-opacity
              data-[dnd-drop-before]:before:opacity-100
            `}
          >
            <span className="text-4xl">{widget.icon}</span>
            <span className="font-semibold">{widget.title}</span>
            <span className="text-2xl font-bold">{widget.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

interface Photo {
  id: string
  hue: number
}

const photos: Photo[] = Array.from({ length: 12 }, (_, i) => ({
  id: `photo-${i + 1}`,
  hue: i * 30,
}))

export function PhotoGrid() {
  const [items, setItems] = useState<Photo[]>(photos)

  const { containerRef, getItemProps } = useLayoutDnd<Photo, HTMLDivElement>({
    items,
    keyExtractor: (photo) => photo.id,
    onReorder: setItems,
  })

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Photo Grid</h2>
      <div ref={containerRef} className="grid grid-cols-4 gap-2">
        {items.map((photo, index) => (
          <div
            key={photo.id}
            {...getItemProps(photo, index)}
            className="
              relative aspect-square rounded-lg cursor-grab select-none
              transition-all duration-150
              data-[dnd-dragging]:cursor-grabbing data-[dnd-dragging]:shadow-xl
              data-[dnd-dragging]:scale-110 data-[dnd-dragging]:z-50
              before:content-[''] before:absolute before:-left-1.5 before:top-0 before:bottom-0
              before:w-1 before:bg-blue-500 before:rounded-full
              before:opacity-0 before:transition-opacity
              data-[dnd-drop-before]:before:opacity-100
            "
            style={{ background: `linear-gradient(135deg, hsl(${photo.hue}, 70%, 60%), hsl(${photo.hue + 20}, 70%, 50%))` }}
          />
        ))}
      </div>
    </div>
  )
}
