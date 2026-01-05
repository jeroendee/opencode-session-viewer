import { User } from 'lucide-react';
import type { UserMessage as UserMessageType } from '../types/session';
import { isTextPart, isFilePart } from '../types/session';
import { formatTime } from '../utils/formatters';
import { useSearchContextSafe } from '../contexts/SearchContext';
import { HighlightedText } from '../utils/highlightText';

interface UserMessageProps {
  message: UserMessageType;
  index: number;
}

export function UserMessage({ message, index }: UserMessageProps) {
  const { searchQuery } = useSearchContextSafe();

  // Extract text content from parts
  const textContent = message.parts
    .filter(isTextPart)
    .map(part => part.text)
    .join('\n');

  // Count file attachments
  const fileCount = message.parts.filter(isFilePart).length;

  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-100 dark:bg-blue-800 rounded-md">
            <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
            User
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            #{index + 1}
          </span>
        </div>
        <span className="text-xs text-gray-400 dark:text-gray-500">
          {formatTime(message.info.time.created)}
        </span>
      </div>

      {/* Content */}
      <div className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words">
        {textContent ? (
          <HighlightedText text={textContent} query={searchQuery} />
        ) : (
          <span className="italic text-gray-500">No text content</span>
        )}
      </div>

      {/* File attachments indicator */}
      {fileCount > 0 && (
        <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          {fileCount} file{fileCount !== 1 ? 's' : ''} attached
        </div>
      )}
    </div>
  );
}
