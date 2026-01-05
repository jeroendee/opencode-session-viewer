import { AlertCircle, X, RefreshCw } from 'lucide-react';

export interface ErrorBannerProps {
  /** The error message to display */
  message: string;
  /** Optional suggestion text for how to resolve the error */
  suggestion?: string;
  /** Whether to show a retry button */
  canRetry?: boolean;
  /** Callback when retry button is clicked */
  onRetry?: () => void;
  /** Whether to show a dismiss button */
  canDismiss?: boolean;
  /** Callback when dismiss button is clicked */
  onDismiss?: () => void;
  /** Optional test id for testing */
  testId?: string;
}

/**
 * ErrorBanner displays an error message with optional retry and dismiss buttons.
 * Used for showing user-actionable errors like permission issues or invalid folders.
 */
export function ErrorBanner({
  message,
  suggestion,
  canRetry = false,
  onRetry,
  canDismiss = true,
  onDismiss,
  testId = 'error-banner',
}: ErrorBannerProps) {
  return (
    <div
      data-testid={testId}
      role="alert"
      className="w-full p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
    >
      <div className="flex items-start gap-3">
        <AlertCircle
          className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5"
          aria-hidden="true"
        />

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-red-800 dark:text-red-200">
            {message}
          </p>

          {suggestion && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-300">
              {suggestion}
            </p>
          )}

          {canRetry && onRetry && (
            <button
              onClick={onRetry}
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-700 dark:text-red-200 bg-red-100 dark:bg-red-800/50 hover:bg-red-200 dark:hover:bg-red-800 rounded-md transition-colors"
            >
              <RefreshCw className="w-4 h-4" aria-hidden="true" />
              Retry
            </button>
          )}
        </div>

        {canDismiss && onDismiss && (
          <button
            onClick={onDismiss}
            className="flex-shrink-0 p-1 text-red-400 hover:text-red-600 dark:hover:text-red-300 rounded transition-colors"
            aria-label="Dismiss error"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
