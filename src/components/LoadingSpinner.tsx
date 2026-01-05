import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  /** Size of the spinner in pixels (default: 24) */
  size?: number;
  /** Optional label text shown below or beside the spinner */
  label?: string;
  /** Layout direction: vertical stacks label below, horizontal puts it beside (default: vertical) */
  layout?: 'vertical' | 'horizontal';
  /** Additional CSS classes */
  className?: string;
}

/**
 * Simple loading spinner using Lucide's Loader2 icon.
 * Configurable size with optional label text.
 */
export function LoadingSpinner({
  size = 24,
  label,
  layout = 'vertical',
  className = '',
}: LoadingSpinnerProps) {
  const isVertical = layout === 'vertical';

  return (
    <div
      className={`
        flex items-center
        ${isVertical ? 'flex-col gap-2' : 'flex-row gap-2'}
        ${className}
      `}
      role="status"
      aria-label={label ?? 'Loading'}
    >
      <Loader2
        className="animate-spin text-blue-500"
        style={{ width: size, height: size }}
        aria-hidden="true"
      />
      {label && (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {label}
        </span>
      )}
    </div>
  );
}
