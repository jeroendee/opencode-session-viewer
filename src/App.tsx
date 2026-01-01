import { ThemeToggle } from './components/ThemeToggle'

function App() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <header className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            OpenCode Session Viewer
          </h1>
          <ThemeToggle />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              Project Setup Complete
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              This is a placeholder. The session viewer will be implemented in subsequent phases.
            </p>
            <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-2">
              <li>React 18 + TypeScript</li>
              <li>Vite 6 with HMR</li>
              <li>Tailwind CSS with dark mode</li>
              <li>System theme preference detection</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
