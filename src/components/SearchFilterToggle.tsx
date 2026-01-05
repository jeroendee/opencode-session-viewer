import type { MessageFilter } from '../hooks/useSearch';

interface SearchFilterToggleProps {
  value: MessageFilter;
  onChange: (filter: MessageFilter) => void;
}

export function SearchFilterToggle({ value, onChange }: SearchFilterToggleProps) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span id="search-filter-label" className="text-gray-500 dark:text-gray-400">Search in:</span>
      <div
        role="group"
        aria-labelledby="search-filter-label"
        className="flex rounded-md border border-gray-200 dark:border-gray-600 overflow-hidden"
      >
        <button
          type="button"
          onClick={() => onChange('all')}
          className={`px-2 py-1 text-xs transition-colors ${
            value === 'all'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
          aria-pressed={value === 'all'}
        >
          All
        </button>
        <button
          type="button"
          onClick={() => onChange('user')}
          className={`px-2 py-1 text-xs transition-colors ${
            value === 'user'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
          aria-pressed={value === 'user'}
        >
          User only
        </button>
      </div>
    </div>
  );
}
