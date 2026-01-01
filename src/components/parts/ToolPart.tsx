import { useState } from 'react';
import { Check, X, Loader2, ChevronDown, ChevronRight, Clock } from 'lucide-react';
import type { ToolPart as ToolPartType } from '../../types/session';
import { isToolCompleted, isToolError } from '../../types/session';
import { ToolIcon } from './toolIcons';
import { formatDurationCompact } from '../../utils/formatters';

interface ToolPartProps {
  part: ToolPartType;
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'completed':
      return <Check className="w-4 h-4 text-green-600 dark:text-green-400" />;
    case 'error':
      return <X className="w-4 h-4 text-red-600 dark:text-red-400" />;
    case 'running':
      return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
    default:
      return <Loader2 className="w-4 h-4 text-gray-400" />;
  }
}

function formatInput(input: unknown): string {
  if (typeof input === 'string') {
    return input;
  }
  try {
    return JSON.stringify(input, null, 2);
  } catch {
    return String(input);
  }
}

export function ToolPart({ part }: ToolPartProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const { state } = part;
  const title = isToolCompleted(state) ? state.title : undefined;
  const hasDetails = isToolCompleted(state) || isToolError(state);

  // Calculate duration if available
  let duration: number | undefined;
  if (isToolCompleted(state) || isToolError(state)) {
    duration = state.time.end - state.time.start;
  }

  return (
    <div className="my-2">
      {/* Collapsed chip / header */}
      <button
        onClick={() => hasDetails && setIsExpanded(!isExpanded)}
        disabled={!hasDetails}
        className={`
          inline-flex items-center gap-2 px-3 py-1.5 rounded-lg
          bg-gray-100 dark:bg-gray-700
          ${hasDetails ? 'cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600' : 'cursor-default'}
          transition-colors text-left
        `}
        aria-expanded={hasDetails ? isExpanded : undefined}
        aria-label={hasDetails ? `${isExpanded ? 'Collapse' : 'Expand'} ${part.tool} tool details` : `${part.tool} tool`}
      >
        {/* Expand/collapse indicator */}
        {hasDetails && (
          <span className="text-gray-400 dark:text-gray-500">
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </span>
        )}

        {/* Tool icon */}
        <span className="text-gray-500 dark:text-gray-400">
          <ToolIcon toolName={part.tool} className="w-4 h-4" />
        </span>

        {/* Tool name */}
        <span className="font-mono text-sm text-gray-700 dark:text-gray-300">
          {part.tool}
        </span>

        {/* Title (if available) */}
        {title && (
          <span className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-[300px]">
            {title}
          </span>
        )}

        {/* Status icon */}
        <StatusIcon status={state.status} />
      </button>

      {/* Expanded details */}
      {isExpanded && hasDetails && (
        <div className="mt-2 ml-6 p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm">
          {/* Input section */}
          <div className="mb-4">
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
              Input
            </div>
            <pre className="bg-gray-100 dark:bg-gray-700 p-3 rounded overflow-x-auto text-xs font-mono text-gray-800 dark:text-gray-200 max-h-48 overflow-y-auto">
              {formatInput(state.input)}
            </pre>
          </div>

          {/* Output section (for completed) */}
          {isToolCompleted(state) && state.output && (
            <div className="mb-4">
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                Output
              </div>
              <pre className="bg-gray-100 dark:bg-gray-700 p-3 rounded overflow-x-auto text-xs font-mono text-gray-800 dark:text-gray-200 max-h-64 overflow-y-auto whitespace-pre-wrap">
                {state.output}
              </pre>
            </div>
          )}

          {/* Error section (for error state) */}
          {isToolError(state) && (
            <div className="mb-4">
              <div className="text-xs font-semibold text-red-500 dark:text-red-400 uppercase mb-1">
                Error
              </div>
              <pre className="bg-red-50 dark:bg-red-900/20 p-3 rounded overflow-x-auto text-xs font-mono text-red-700 dark:text-red-300 max-h-48 overflow-y-auto whitespace-pre-wrap">
                {state.error}
              </pre>
            </div>
          )}

          {/* Duration */}
          {duration !== undefined && (
            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <Clock className="w-3 h-3" />
              <span>Duration: {formatDurationCompact(duration)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
