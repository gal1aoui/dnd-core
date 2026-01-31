import { useState } from 'react'
import { useHorizontalDnd } from '@agal1aoui/react-dnd'

interface Tab {
  id: string
  label: string
  icon: string
}

const initialTabs: Tab[] = [
  { id: 'home', label: 'Home', icon: '🏠' },
  { id: 'products', label: 'Products', icon: '📦' },
  { id: 'about', label: 'About', icon: 'ℹ️' },
  { id: 'blog', label: 'Blog', icon: '📝' },
  { id: 'contact', label: 'Contact', icon: '📧' },
]

export function HorizontalTabs() {
  const [tabs, setTabs] = useState<Tab[]>(initialTabs)
  const [activeTab, setActiveTab] = useState('home')

  const { containerRef, getItemProps } = useHorizontalDnd<Tab, HTMLDivElement>({
    items: tabs,
    keyExtractor: (tab) => tab.id,
    onReorder: setTabs,
    gap: 8,
  })

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Horizontal Tabs</h2>
      <div ref={containerRef} className="flex gap-2 border-b-2 border-gray-200 pb-0">
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            {...getItemProps(tab, index)}
            onClick={() => setActiveTab(tab.id)}
            className={`
              relative px-4 py-3 font-medium cursor-grab select-none
              border-b-3 -mb-[2px] transition-all duration-200
              ${activeTab === tab.id ? 'text-blue-600 border-blue-600' : 'text-gray-500 border-transparent hover:text-gray-700'}
              data-[dnd-dragging]:cursor-grabbing data-[dnd-dragging]:bg-blue-50 data-[dnd-dragging]:rounded-t-lg
              before:content-[''] before:absolute before:-left-1.5 before:top-1 before:bottom-1
              before:w-1 before:bg-blue-500 before:rounded-full
              before:opacity-0 before:transition-opacity
              data-[dnd-drop-before]:before:opacity-100
            `}
          >
            <span className="mr-2">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <p>Content for: <strong>{tabs.find(t => t.id === activeTab)?.label}</strong></p>
      </div>
    </div>
  )
}

interface Image {
  id: string
  hue: number
}

const initialImages: Image[] = Array.from({ length: 8 }, (_, i) => ({
  id: `img-${i + 1}`,
  hue: i * 45,
}))

export function HorizontalGallery() {
  const [images, setImages] = useState<Image[]>(initialImages)

  const { containerRef, getItemProps } = useHorizontalDnd<Image, HTMLDivElement>({
    items: images,
    keyExtractor: (img) => img.id,
    onReorder: setImages,
    gap: 12,
  })

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Horizontal Gallery</h2>
      <div ref={containerRef} className="flex gap-3 overflow-x-auto pb-4">
        {images.map((image, index) => (
          <div
            key={image.id}
            {...getItemProps(image, index)}
            className="
              relative w-24 h-24 flex-shrink-0 rounded-lg
              cursor-grab select-none transition-all duration-150
              data-[dnd-dragging]:cursor-grabbing data-[dnd-dragging]:scale-110
              data-[dnd-dragging]:shadow-xl data-[dnd-dragging]:z-10
              before:content-[''] before:absolute before:-left-2 before:top-0 before:bottom-0
              before:w-1 before:bg-blue-500 before:rounded-full
              before:opacity-0 before:transition-opacity
              data-[dnd-drop-before]:before:opacity-100
            "
            style={{ background: `linear-gradient(135deg, hsl(${image.hue}, 70%, 60%), hsl(${image.hue + 30}, 70%, 50%))` }}
          />
        ))}
      </div>
    </div>
  )
}
