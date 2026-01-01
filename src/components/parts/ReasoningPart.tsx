import { useState } from 'react';
import { Brain, ChevronDown, ChevronRight } from 'lucide-react';
import type { ReasoningPart as ReasoningPartType } from '../../types/session';

interface ReasoningPartProps {
  part: ReasoningPartType;
  defaultExpanded?: boolean;
}

export function ReasoningPart({ part, defaultExpanded = false }: ReasoningPartProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Get a preview of the reasoning text
  const previewLength = 50;
  const preview = part.text.length > previewLength
    ? part.text.substring(0, previewLength).trim() + '...'
    : part.text;

  return (
    <div className="my-2">
      {/* Collapsed header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors text-left"
        aria-expanded={isExpanded}
        aria-label={`${isExpanded ? 'Collapse' : 'Expand'} thinking section`}
      >
        {/* Expand/collapse indicator */}
        <span className="text-purple-400 dark:text-purple-500">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </span>

        {/* Brain icon */}
        <Brain className="w-4 h-4 text-purple-500 dark:text-purple-400" />

        {/* Label */}
        <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
          Thinking
        </span>

        {/* Preview when collapsed */}
        {!isExpanded && (
          <span className="text-sm text-purple-500 dark:text-purple-400 italic truncate max-w-[300px]">
            {preview}
          </span>
        )}
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="mt-2 ml-6 p-4 bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-800 rounded-lg">
          <pre className="text-sm text-purple-700 dark:text-purple-300 italic whitespace-pre-wrap font-sans leading-relaxed">
            {part.text}
          </pre>
        </div>
      )}
    </div>
  );
}
