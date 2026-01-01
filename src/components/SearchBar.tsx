import { useEffect, useState, useCallback } from 'react';
import { Search, X } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (query: string) => void;
  onClear: () => void;
  resultCount: number;
  debounceMs?: number;
}

export function SearchBar({
  value,
  onChange,
  onClear,
  resultCount,
  debounceMs = 300,
}: SearchBarProps) {
  const [localValue, setLocalValue] = useState(value);

  // Sync local value when external value changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Debounce the onChange callback
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localValue !== value) {
        onChange(localValue);
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [localValue, value, onChange, debounceMs]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(e.target.value);
  }, []);

  const handleClear = useCallback(() => {
    setLocalValue('');
    onClear();
  }, [onClear]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      handleClear();
    }
  }, [handleClear]);

  return (
    <div className="relative">
      {/* Search icon */}
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />

      {/* Input */}
      <input
        type="text"
        value={localValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Search messages..."
        className="w-full pl-9 pr-16 py-2 text-sm bg-gray-100 dark:bg-gray-700 border border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-gray-800 rounded-lg outline-none transition-colors text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400"
        aria-label="Search messages"
      />

      {/* Result count and clear button */}
      {localValue && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {resultCount > 0 && (
            <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
              {resultCount} match{resultCount !== 1 ? 'es' : ''}
            </span>
          )}
          <button
            onClick={handleClear}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
            aria-label="Clear search"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      )}
    </div>
  );
}
