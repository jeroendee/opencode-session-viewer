import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, MessageSquare } from 'lucide-react';
import type { MessageGroup } from '../utils/groupMessages';
import { getGroupSummary } from '../utils/groupMessages';
import { truncate } from '../utils/formatters';

interface JumpToDropdownProps {
  groups: MessageGroup[];
  currentIndex: number;
  onSelect: (messageId: string) => void;
}

export function JumpToDropdown({
  groups,
  currentIndex,
  onSelect,
}: JumpToDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      buttonRef.current?.focus();
    }
  }, []);

  const handleSelect = useCallback((messageId: string) => {
    onSelect(messageId);
    setIsOpen(false);
    buttonRef.current?.focus();
  }, [onSelect]);

  if (groups.length === 0) {
    return null;
  }

  const currentGroup = groups[currentIndex];
  const currentSummary = currentGroup
    ? truncate(getGroupSummary(currentGroup), 30)
    : 'Select message';

  return (
    <div ref={dropdownRef} className="relative" onKeyDown={handleKeyDown}>
      {/* Trigger button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 w-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors text-left"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <MessageSquare className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
        <span className="flex-1 text-sm text-gray-700 dark:text-gray-200 truncate">
          {currentIndex >= 0 ? `#${currentIndex + 1}: ${currentSummary}` : currentSummary}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div
          className="absolute left-0 right-0 mt-1 max-h-64 overflow-y-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50"
          role="listbox"
          aria-label="Jump to message"
        >
          {groups.map((group, index) => {
            const messageId = group.userMessage.info.id;
            const isSelected = index === currentIndex;
            const summary = truncate(getGroupSummary(group), 40);

            return (
              <button
                key={messageId}
                onClick={() => handleSelect(messageId)}
                className={`
                  w-full text-left px-3 py-2 text-sm transition-colors
                  ${isSelected
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200'
                  }
                `}
                role="option"
                aria-selected={isSelected}
              >
                <span className="font-mono text-xs text-gray-400 dark:text-gray-500 mr-2">
                  {index + 1}.
                </span>
                {summary}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
