'use client'

import { useTheme } from 'next-themes'
import { Sun, Moon } from 'lucide-react'
import { useSyncExternalStore } from 'react'

const emptySubscribe = () => () => {}

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  )

  if (!mounted) return <div className="w-9 h-9" />

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="p-2 text-pewter hover:text-cream transition-colors group relative flex items-center justify-center"
      title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
      <div className="relative w-5 h-5 overflow-hidden">
        <Sun 
          className={`absolute inset-0 transition-all duration-500 transform ${
            theme === 'dark' ? 'translate-y-[120%] rotate-90 opacity-0' : 'translate-y-0 rotate-0 opacity-100'
          }`} 
          size={20} 
        />
        <Moon 
          className={`absolute inset-0 transition-all duration-500 transform ${
            theme === 'dark' ? 'translate-y-0 rotate-0 opacity-100' : '-translate-y-[120%] -rotate-90 opacity-0'
          }`} 
          size={20} 
        />
      </div>
    </button>
  )
}
