import { useCallback, useMemo } from 'react';
import { Bot, Lightbulb } from 'lucide-react';
import type { MessageGroup } from '../utils/groupMessages';
import { getGroupSummary } from '../utils/groupMessages';
import { extractSidebarItems, type SidebarItem } from '../utils/extractSidebarItems';
import { truncate } from '../utils/formatters';

interface MessageIndexProps {
  groups: MessageGroup[];
  activeMessageId: string | null;
  matchedMessageIds: Set<string>;
  onMessageClick: (messageId: string) => void;
  /** Callback when a sidebar item (task, subtask, or skill) is clicked */
  onSidebarItemClick?: (itemId: string, messageId: string, itemType: SidebarItem['itemType']) => void;
}

/**
 * Returns the appropriate icon for a sidebar item based on its type.
 */
function SidebarItemIcon({ itemType, className }: { itemType: SidebarItem['itemType']; className?: string }) {
  switch (itemType) {
    case 'skill':
      return <Lightbulb className={className} aria-hidden="true" />;
    case 'task':
    case 'subtask':
    default:
      return <Bot className={className} aria-hidden="true" />;
  }
}

/**
 * Returns the color classes for a sidebar item based on its type.
 */
function getSidebarItemColors(itemType: SidebarItem['itemType']) {
  switch (itemType) {
    case 'skill':
      return {
        text: 'text-teal-700 dark:text-teal-400',
        hoverText: 'hover:text-teal-900 dark:hover:text-teal-300',
        hoverBg: 'hover:bg-teal-50 dark:hover:bg-teal-900/20',
      };
    case 'subtask':
      return {
        text: 'text-purple-700 dark:text-purple-400',
        hoverText: 'hover:text-purple-900 dark:hover:text-purple-300',
        hoverBg: 'hover:bg-purple-50 dark:hover:bg-purple-900/20',
      };
    case 'task':
    default:
      return {
        text: 'text-amber-700 dark:text-amber-400',
        hoverText: 'hover:text-amber-900 dark:hover:text-amber-300',
        hoverBg: 'hover:bg-amber-50 dark:hover:bg-amber-900/20',
      };
  }
}

/**
 * Returns the screen reader label for a sidebar item based on its type.
 */
function getScreenReaderLabel(itemType: SidebarItem['itemType']): string {
  switch (itemType) {
    case 'skill':
      return 'Skill: ';
    case 'subtask':
      return 'Subtask: ';
    case 'task':
    default:
      return 'Task: ';
  }
}

export function MessageIndex({
  groups,
  activeMessageId,
  matchedMessageIds,
  onMessageClick,
  onSidebarItemClick,
}: MessageIndexProps) {
  const handleClick = useCallback((messageId: string) => {
    onMessageClick(messageId);
  }, [onMessageClick]);

  const handleItemClick = useCallback((itemId: string, messageId: string, itemType: SidebarItem['itemType']) => {
    if (onSidebarItemClick) {
      onSidebarItemClick(itemId, messageId, itemType);
    } else {
      // Fallback: scroll to the part element directly
      const element = document.getElementById(`part-${itemId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Add highlight animation based on item type
        const highlightClass = itemType === 'skill' ? 'highlight-skill' : 'highlight-part';
        element.classList.add(highlightClass);
        setTimeout(() => {
          element.classList.remove(highlightClass);
        }, 2000);
      }
    }
  }, [onSidebarItemClick]);

  // Memoize sidebar items extraction to avoid recomputing on every render
  // Only recomputes when groups array reference changes
  const itemsByMessageId = useMemo(() => {
    const map = new Map<string, SidebarItem[]>();
    for (const group of groups) {
      const messageId = group.userMessage.info.id;
      map.set(messageId, extractSidebarItems(group));
    }
    return map;
  }, [groups]);

  if (groups.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400 px-2">
        No messages loaded
      </p>
    );
  }

  return (
    <nav aria-label="Message navigation">
      <ul className="space-y-1">
        {groups.map((group, index) => {
          const messageId = group.userMessage.info.id;
          const isActive = messageId === activeMessageId;
          const hasMatch = matchedMessageIds.has(messageId);
          const summary = truncate(getGroupSummary(group), 40);
          const items = itemsByMessageId.get(messageId) ?? [];

          return (
            <li key={messageId}>
              <button
                onClick={() => handleClick(messageId)}
                className={`
                  w-full text-left px-3 py-2 rounded-md transition-colors group
                  ${isActive
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                  }
                  ${hasMatch && !isActive
                    ? 'bg-yellow-50 dark:bg-yellow-900/20 border-l-2 border-yellow-400'
                    : ''
                  }
                `}
                aria-current={isActive ? 'true' : undefined}
              >
                <div className="flex items-start gap-2">
                  {/* Message number */}
                  <span className={`
                    text-xs font-mono mt-0.5 flex-shrink-0
                    ${isActive
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-gray-400 dark:text-gray-500'
                    }
                  `}>
                    {index + 1}.
                  </span>

                  {/* Message summary */}
                  <span className={`
                    text-sm leading-snug
                    ${isActive
                      ? 'text-blue-900 dark:text-blue-100'
                      : 'text-gray-700 dark:text-gray-200 group-hover:text-gray-900 dark:group-hover:text-white'
                    }
                  `}>
                    {summary}
                  </span>

                  {/* Search match indicator */}
                  {hasMatch && (
                    <span className="ml-auto flex-shrink-0 w-2 h-2 rounded-full bg-yellow-400" aria-label="Search match" />
                  )}
                </div>
              </button>

              {/* Sidebar items (tasks and skills) under this message */}
              {items.length > 0 && (
                <ul className="ml-6 mt-1 space-y-0.5" aria-label="Tasks and skills">
                  {items.map((item) => {
                    const colors = getSidebarItemColors(item.itemType);
                    return (
                      <li key={item.id}>
                        <button
                          onClick={() => handleItemClick(item.id, item.messageId, item.itemType)}
                          className={`
                            flex items-center gap-1.5 px-2 py-0.5 text-xs
                            ${colors.text}
                            ${colors.hoverText}
                            ${colors.hoverBg}
                            rounded transition-colors w-full text-left
                          `}
                        >
                          <SidebarItemIcon itemType={item.itemType} className="w-3 h-3 flex-shrink-0" />
                          <span className="sr-only">{getScreenReaderLabel(item.itemType)}</span>
                          <span className="truncate">{item.label}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
