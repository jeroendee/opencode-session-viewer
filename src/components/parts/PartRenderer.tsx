import type { Part } from '../../types/session';
import { isTextPart, isToolPart, isReasoningPart, isFilePart } from '../../types/session';

interface PartRendererProps {
  part: Part;
}

/**
 * Renders a message part based on its type.
 * This is a temporary simple renderer - will be enhanced in Phase 5
 * with proper markdown rendering, expandable tool details, etc.
 */
export function PartRenderer({ part }: PartRendererProps) {
  if (isTextPart(part)) {
    return (
      <div className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words">
        {part.text}
      </div>
    );
  }

  if (isToolPart(part)) {
    const status = part.state.status;
    const statusColor = status === 'completed' 
      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
      : status === 'error'
      ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';

    return (
      <div className={`inline-flex items-center gap-2 px-2 py-1 rounded text-sm ${statusColor}`}>
        <span className="font-mono">{part.tool}</span>
        {part.state.status === 'completed' && part.state.title && (
          <span className="text-xs opacity-75 truncate max-w-[200px]">
            {part.state.title}
          </span>
        )}
      </div>
    );
  }

  if (isReasoningPart(part)) {
    return (
      <div className="text-gray-500 dark:text-gray-400 italic text-sm border-l-2 border-gray-200 dark:border-gray-600 pl-3">
        <span className="text-xs font-medium uppercase text-gray-400 dark:text-gray-500 block mb-1">
          Thinking
        </span>
        {part.text}
      </div>
    );
  }

  if (isFilePart(part)) {
    return (
      <div className="text-sm text-gray-600 dark:text-gray-400">
        File: {part.filename || part.url}
      </div>
    );
  }

  // Skip step-start, step-finish, and other meta parts in display
  if (part.type === 'step-start' || part.type === 'step-finish' || part.type === 'snapshot') {
    return null;
  }

  // Generic fallback for other part types
  return (
    <div className="text-xs text-gray-400 dark:text-gray-500">
      [{part.type}]
    </div>
  );
}
