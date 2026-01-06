import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { ChevronDown, FolderOpen } from 'lucide-react';

/**
 * Information about a directory for the dropdown.
 */
export interface DirectoryOption {
  path: string;
  name: string;
  sessionCount: number;
}

interface DirectoryFilterDropdownProps {
  directories: DirectoryOption[];
  selected: string | null;
  onChange: (directory: string | null) => void;
}

/**
 * Dropdown for filtering sessions by directory.
 * Uses ARIA listbox pattern with roving tabindex for accessibility.
 */
export function DirectoryFilterDropdown({
  directories,
  selected,
  onChange,
}: DirectoryFilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<(HTMLDivElement | null)[]>([]);

  // All options: "All directories" (null) + each directory
  const allOptions = useMemo<(string | null)[]>(
    () => [null, ...directories.map((d) => d.path)],
    [directories]
  );

  // Close dropdown when clicking outside
  // Uses pointerdown for consistent handling across mouse, touch, and pen input
  // Uses capture phase to handle events before they reach other handlers
  useEffect(() => {
    function handleClickOutside(event: PointerEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('pointerdown', handleClickOutside, true);
    }

    return () => {
      document.removeEventListener('pointerdown', handleClickOutside, true);
    };
  }, [isOpen]);

  // Focus the correct option when dropdown opens or focusedIndex changes
  useEffect(() => {
    if (isOpen && optionRefs.current[focusedIndex]) {
      optionRefs.current[focusedIndex]?.focus();
    }
  }, [isOpen, focusedIndex]);

  // Reset focused index to selected item when opening
  useEffect(() => {
    if (isOpen) {
      const selectedIndex = allOptions.findIndex((opt) => opt === selected);
      setFocusedIndex(selectedIndex >= 0 ? selectedIndex : 0);
    }
  }, [isOpen, selected, allOptions]);

  const handleSelect = useCallback((directory: string | null) => {
    onChange(directory);
    setIsOpen(false);
    buttonRef.current?.focus();
  }, [onChange]);

  // Handle keyboard navigation within the listbox
  const handleListboxKeyDown = useCallback((e: React.KeyboardEvent) => {
    const optionCount = allOptions.length;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex((prev) => (prev + 1) % optionCount);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex((prev) => (prev - 1 + optionCount) % optionCount);
        break;
      case 'Home':
        e.preventDefault();
        setFocusedIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setFocusedIndex(optionCount - 1);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        handleSelect(allOptions[focusedIndex]);
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        buttonRef.current?.focus();
        break;
      case 'Tab':
        // Close on Tab to maintain natural tab flow
        setIsOpen(false);
        break;
    }
  }, [allOptions, focusedIndex, handleSelect]);

  // Find the selected directory info
  const selectedDirectory = directories.find((d) => d.path === selected);
  const displayText = selectedDirectory ? selectedDirectory.name : 'All directories';
  const totalSessions = directories.reduce((sum, d) => sum + d.sessionCount, 0);

  return (
    <div ref={dropdownRef} className="relative">
      {/* Trigger button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 w-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors text-left"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label="Filter by directory"
      >
        <FolderOpen className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
        <span 
          className="flex-1 text-sm text-gray-700 dark:text-gray-200 truncate"
          title={selectedDirectory ? selectedDirectory.path : 'All directories'}
        >
          {displayText}
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
          {selectedDirectory ? selectedDirectory.sessionCount : totalSessions}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div
          ref={listboxRef}
          className="absolute left-0 right-0 mt-1 max-h-64 overflow-y-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50"
          role="listbox"
          aria-label="Select directory"
          onKeyDown={handleListboxKeyDown}
        >
          {/* All directories option */}
          <div
            ref={(el) => { optionRefs.current[0] = el; }}
            onClick={() => handleSelect(null)}
            className={`
              w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2 cursor-pointer
              ${selected === null
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100'
                : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200'
              }
              ${focusedIndex === 0 ? 'outline-none ring-2 ring-inset ring-blue-500' : ''}
            `}
            role="option"
            aria-selected={selected === null}
            tabIndex={focusedIndex === 0 ? 0 : -1}
          >
            <FolderOpen className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="flex-1 truncate">All directories</span>
            <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">
              {totalSessions}
            </span>
          </div>

          {/* Directory options */}
          {directories.map((directory, index) => {
            const optionIndex = index + 1; // offset by 1 for "All directories"
            const isSelected = selected === directory.path;
            const isFocused = focusedIndex === optionIndex;

            return (
              <div
                key={directory.path}
                ref={(el) => { optionRefs.current[optionIndex] = el; }}
                onClick={() => handleSelect(directory.path)}
                className={`
                  w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2 cursor-pointer
                  ${isSelected
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200'
                  }
                  ${isFocused ? 'outline-none ring-2 ring-inset ring-blue-500' : ''}
                `}
                role="option"
                aria-selected={isSelected}
                tabIndex={isFocused ? 0 : -1}
                title={directory.path}
              >
                <FolderOpen className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="flex-1 truncate">{directory.name}</span>
                <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">
                  {directory.sessionCount}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
