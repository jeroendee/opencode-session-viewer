import { Moon, Sun, Monitor } from 'lucide-react'
import { useTheme } from '../hooks/useTheme'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg" role="group" aria-label="Theme selection">
      <button
        onClick={() => setTheme('light')}
        className={`p-2 rounded-md transition-colors ${
          theme === 'light'
            ? 'bg-white dark:bg-gray-700 shadow-sm'
            : 'hover:bg-gray-200 dark:hover:bg-gray-700'
        }`}
        aria-label="Switch to light mode"
        aria-pressed={theme === 'light'}
      >
        <Sun className="w-4 h-4 text-gray-600 dark:text-gray-300" />
      </button>
      <button
        onClick={() => setTheme('dark')}
        className={`p-2 rounded-md transition-colors ${
          theme === 'dark'
            ? 'bg-white dark:bg-gray-700 shadow-sm'
            : 'hover:bg-gray-200 dark:hover:bg-gray-700'
        }`}
        aria-label="Switch to dark mode"
        aria-pressed={theme === 'dark'}
      >
        <Moon className="w-4 h-4 text-gray-600 dark:text-gray-300" />
      </button>
      <button
        onClick={() => setTheme('system')}
        className={`p-2 rounded-md transition-colors ${
          theme === 'system'
            ? 'bg-white dark:bg-gray-700 shadow-sm'
            : 'hover:bg-gray-200 dark:hover:bg-gray-700'
        }`}
        aria-label="Use system preference"
        aria-pressed={theme === 'system'}
      >
        <Monitor className="w-4 h-4 text-gray-600 dark:text-gray-300" />
      </button>
    </div>
  )
}
