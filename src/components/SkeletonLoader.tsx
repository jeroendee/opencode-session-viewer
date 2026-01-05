interface SkeletonProps {
  /** Additional CSS classes */
  className?: string;
}

/**
 * Pulsing text line skeleton.
 */
export function SkeletonLine({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse ${className}`}
      role="presentation"
      aria-hidden="true"
    />
  );
}

/**
 * Pulsing circle skeleton (for avatars, icons).
 */
export function SkeletonCircle({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse ${className}`}
      role="presentation"
      aria-hidden="true"
    />
  );
}

/**
 * Pulsing rectangle skeleton (for images, cards).
 */
export function SkeletonRectangle({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`bg-gray-200 dark:bg-gray-700 rounded animate-pulse ${className}`}
      role="presentation"
      aria-hidden="true"
    />
  );
}

/**
 * Skeleton for a message group (user message + response).
 * Mimics the layout of the actual MessageGroup component.
 */
export function SkeletonMessageGroup() {
  return (
    <div className="space-y-4" aria-hidden="true">
      {/* User message skeleton */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
        <div className="flex items-center gap-3 mb-3">
          <SkeletonCircle className="w-8 h-8" />
          <SkeletonLine className="w-24" />
        </div>
        <div className="space-y-2">
          <SkeletonLine className="w-full" />
          <SkeletonLine className="w-3/4" />
        </div>
      </div>

      {/* Response skeleton */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 ml-4">
        <div className="flex items-center gap-3 mb-3">
          <SkeletonCircle className="w-8 h-8" />
          <SkeletonLine className="w-20" />
        </div>
        <div className="space-y-2">
          <SkeletonLine className="w-full" />
          <SkeletonLine className="w-5/6" />
          <SkeletonLine className="w-4/5" />
          <SkeletonLine className="w-2/3" />
        </div>
      </div>
    </div>
  );
}

/**
 * Full content area skeleton showing multiple message groups.
 */
export function SkeletonContent() {
  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <SkeletonMessageGroup />
        <SkeletonMessageGroup />
        <SkeletonMessageGroup />
      </div>
    </div>
  );
}
