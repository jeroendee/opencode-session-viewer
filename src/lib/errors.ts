/**
 * Error types for storage and session loading operations.
 * These are higher-level errors that describe issues with the OpenCode storage format,
 * distinct from the lower-level FileSystemError which handles file system access issues.
 */

export type StorageErrorCode =
  | 'PERMISSION_DENIED'
  | 'NOT_STORAGE_FOLDER'
  | 'PARSE_ERROR'
  | 'UNSUPPORTED_BROWSER'
  | 'EMPTY_FOLDER';

/**
 * Provides user-friendly suggestions for resolving storage errors.
 */
export function getErrorSuggestion(code: StorageErrorCode): string {
  switch (code) {
    case 'PERMISSION_DENIED':
      return 'Click "Retry" to grant folder access, or check your browser settings.';
    case 'NOT_STORAGE_FOLDER':
      return 'Select the OpenCode storage folder, typically at ~/.local/share/opencode/storage/';
    case 'PARSE_ERROR':
      return 'Some session files may be corrupted. The viewer will load what it can.';
    case 'UNSUPPORTED_BROWSER':
      return 'Use Chrome or Edge for the best experience, or try dragging a folder.';
    case 'EMPTY_FOLDER':
      return 'Make sure the folder contains OpenCode sessions.';
    default: {
      const _exhaustive: never = code;
      throw new Error(`Unhandled error code: ${_exhaustive}`);
    }
  }
}

/**
 * Storage error for session loading and folder operations.
 * Provides typed error codes and user-friendly messages.
 */
export class StorageError extends Error {
  constructor(
    message: string,
    public readonly code: StorageErrorCode
  ) {
    super(message);
    this.name = 'StorageError';
  }

  /**
   * Returns a user-friendly suggestion for resolving this error.
   */
  get suggestion(): string {
    return getErrorSuggestion(this.code);
  }

  /**
   * Whether this error can potentially be resolved by retrying.
   */
  get canRetry(): boolean {
    return this.code === 'PERMISSION_DENIED';
  }
}
