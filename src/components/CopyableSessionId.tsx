import { Copy, Check } from 'lucide-react';
import { useCopyToClipboard } from '../hooks/useCopyToClipboard';

interface CopyableSessionIdProps {
  sessionId: string;
  className?: string;
}

/**
 * Displays a session ID with click-to-copy functionality.
 * Shows a copy icon on hover that changes to a checkmark after copying.
 */
export function CopyableSessionId({ sessionId, className = '' }: CopyableSessionIdProps) {
  const { copied, copy } = useCopyToClipboard();

  const handleClick = () => {
    copy(sessionId);
  };

  return (
    <button
      onClick={handleClick}
      className={`
        group inline-flex items-center gap-1.5 px-2 py-1
        bg-gray-100 dark:bg-gray-700 rounded-md
        hover:bg-gray-200 dark:hover:bg-gray-600
        transition-colors cursor-pointer
        ${className}
      `}
      title={copied ? 'Copied!' : 'Click to copy session ID'}
      aria-label={copied ? 'Session ID copied to clipboard' : `Copy session ID: ${sessionId}`}
    >
      <span className="font-mono text-xs text-gray-600 dark:text-gray-300 truncate max-w-[200px]">
        {sessionId}
      </span>
      <span className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        {copied ? (
          <Check className="w-3.5 h-3.5 text-green-500" aria-hidden="true" />
        ) : (
          <Copy className="w-3.5 h-3.5 text-gray-400" aria-hidden="true" />
        )}
      </span>
    </button>
  );
}
