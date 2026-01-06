import { useCallback } from 'react';
import { Bot } from 'lucide-react';
import type { MessageGroup } from '../utils/groupMessages';
import { getGroupSummary } from '../utils/groupMessages';
import { extractTasks } from '../utils/extractTasks';
import { truncate } from '../utils/formatters';

interface MessageIndexProps {
  groups: MessageGroup[];
  activeMessageId: string | null;
  matchedMessageIds: Set<string>;
  onMessageClick: (messageId: string) => void;
}

export function MessageIndex({
  groups,
  activeMessageId,
  matchedMessageIds,
  onMessageClick,
}: MessageIndexProps) {
  const handleClick = useCallback((messageId: string) => {
    onMessageClick(messageId);
  }, [onMessageClick]);

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
          const tasks = extractTasks(group);

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

              {/* Tasks under this message */}
              {tasks.length > 0 && (
                <ul className="ml-6 mt-1 space-y-0.5" aria-label="Tasks">
                  {tasks.map((task) => (
                    <li key={task.id}>
                      <button
                        onClick={() => handleClick(task.messageId)}
                        className="
                          flex items-center gap-1.5 px-2 py-0.5 text-xs
                          text-amber-700 dark:text-amber-400
                          hover:text-amber-900 dark:hover:text-amber-300
                          hover:bg-amber-50 dark:hover:bg-amber-900/20
                          rounded transition-colors w-full text-left
                        "
                      >
                        <Bot className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
                        <span className="sr-only">Task: </span>
                        <span className="truncate">{task.agentType}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
