import { useEffect, useState, useCallback, forwardRef } from 'react';
import { Search, X, Loader2 } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (query: string) => void;
  onClear: () => void;
  resultCount: number;
  debounceMs?: number;
  /** External loading indicator (e.g., when loading messages for search) */
  isLoading?: boolean;
}

export const SearchBar = forwardRef<HTMLInputElement, SearchBarProps>(function SearchBar({
  value,
  onChange,
  onClear,
  resultCount,
  debounceMs = 300,
  isLoading = false,
}, ref) {
  const [localValue, setLocalValue] = useState(value);
  const [isPendingDebounce, setIsPendingDebounce] = useState(false);

  // Sync local value when external value changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Debounce the onChange callback
  useEffect(() => {
    // If localValue is empty/whitespace, clear pending state immediately
    if (!localValue.trim()) {
      setIsPendingDebounce(false);
      if (localValue !== value) {
        onChange(localValue);
      }
      return;
    }

    // Mark as pending when local value differs from parent value
    if (localValue !== value) {
      setIsPendingDebounce(true);
    }

    const timer = setTimeout(() => {
      if (localValue !== value) {
        onChange(localValue);
      }
      setIsPendingDebounce(false);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [localValue, value, onChange, debounceMs]);

  // Show loading when debouncing or when externally loading
  const showLoading = isPendingDebounce || isLoading;

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
        ref={ref}
        type="text"
        value={localValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Search messages..."
        className="w-full pl-9 pr-16 py-2 text-sm bg-gray-100 dark:bg-gray-700 border border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-gray-800 rounded-lg outline-none transition-colors text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400"
        aria-label="Search messages"
      />

      {/* Result count, loading indicator, and clear button */}
      {localValue && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {showLoading ? (
            <Loader2 className="w-4 h-4 text-gray-400 animate-spin" aria-label="Searching" />
          ) : resultCount > 0 ? (
            <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
              {resultCount} match{resultCount !== 1 ? 'es' : ''}
            </span>
          ) : null}
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
});
