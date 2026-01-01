import { X } from 'lucide-react';

interface KeyboardShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

const shortcuts = [
  { keys: ['/', 'Ctrl+K'], description: 'Focus search' },
  { keys: ['j'], description: 'Next message' },
  { keys: ['k'], description: 'Previous message' },
  { keys: ['e'], description: 'Toggle expand/collapse' },
  { keys: ['?'], description: 'Toggle this help' },
  { keys: ['Esc'], description: 'Close search/help' },
];

export function KeyboardShortcutsHelp({ isOpen, onClose }: KeyboardShortcutsHelpProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6"
        role="dialog"
        aria-labelledby="shortcuts-title"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 id="shortcuts-title" className="text-lg font-semibold text-gray-900 dark:text-white">
            Keyboard Shortcuts
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Shortcuts list */}
        <div className="space-y-3">
          {shortcuts.map(({ keys, description }) => (
            <div key={description} className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-300">
                {description}
              </span>
              <div className="flex items-center gap-1">
                {keys.map((key, idx) => (
                  <span key={key}>
                    {idx > 0 && <span className="text-gray-400 mx-1">or</span>}
                    <kbd className="px-2 py-1 text-xs font-mono bg-gray-100 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300">
                      {key}
                    </kbd>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <p className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 text-center">
          Press <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">?</kbd> to toggle this help
        </p>
      </div>
    </>
  );
}
