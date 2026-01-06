import { useState, useCallback } from 'react';
import { FolderOpen, Loader2, AlertTriangle } from 'lucide-react';
import { FolderDropZone } from './FolderDropZone';
import { ErrorBanner } from './ErrorBanner';
import { SourceSelector } from './SourceSelector';
import {
  isFileSystemAccessSupported,
  isDragDropSupported,
  openDirectoryPicker,
  createFileSystemFromHandle,
  createFileSystemFromDropped,
  FileSystemError,
  DroppedDirectoryContents,
} from '../lib/fileSystem';
import { loadAllSessions } from '../lib/sessionLoader';
import { loadAllClaudeSessions } from '../lib/claudeSessionAdapter';
import { StorageError } from '../lib/errors';
import { useSessionStore } from '../store/sessionStore';

interface ErrorState {
  message: string;
  suggestion?: string;
  canRetry: boolean;
}

/**
 * FolderPicker provides UI for selecting an OpenCode storage folder.
 * Supports both the File System Access API (Chromium) and drag-drop (all browsers).
 */
export function FolderPicker() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ErrorState | null>(null);

  const { setFileSystem, setProjects, transcriptSource } = useSessionStore();

  // Source-specific configuration
  const sourceConfig = {
    opencode: {
      name: 'OpenCode',
      folderPath: '~/.local/share/opencode/storage/',
    },
    'claude-code': {
      name: 'Claude Code',
      folderPath: '~/.claude',
    },
  };

  const currentSource = sourceConfig[transcriptSource];

  const supportsDirectoryPicker = isFileSystemAccessSupported();
  const supportsDragDrop = isDragDropSupported();

  // Check browser compatibility
  const isSupported = supportsDirectoryPicker || supportsDragDrop;

  const handleFolderLoaded = useCallback(
    async (
      createFs: () => ReturnType<typeof createFileSystemFromHandle> | ReturnType<typeof createFileSystemFromDropped>
    ) => {
      setIsLoading(true);
      setError(null);

      try {
        const fs = createFs();
        // Dispatch to correct loader based on transcript source
        const result = transcriptSource === 'claude-code'
          ? await loadAllClaudeSessions(fs)
          : await loadAllSessions(fs);

        if (result.projects.length === 0) {
          setError({
            message: 'No sessions found in this folder.',
            suggestion: `Make sure you selected the ${currentSource.name} storage folder (e.g., ${currentSource.folderPath})`,
            canRetry: false,
          });
          setIsLoading(false);
          return;
        }

        setFileSystem(fs);
        setProjects(result.projects);

        if (result.errorCount > 0) {
          console.warn(`Loaded with ${result.errorCount} errors`);
        }
      } catch (err) {
        if (err instanceof StorageError) {
          setError({
            message: err.message,
            suggestion: err.suggestion,
            canRetry: err.canRetry,
          });
        } else if (err instanceof FileSystemError) {
          setError({
            message: err.message,
            suggestion: err.code === 'PERMISSION_DENIED'
              ? 'Click "Retry" to grant folder access.'
              : undefined,
            canRetry: err.code === 'PERMISSION_DENIED',
          });
        } else {
          setError({
            message: err instanceof Error ? err.message : 'Failed to load sessions',
            canRetry: false,
          });
        }
      } finally {
        setIsLoading(false);
      }
    },
    [setFileSystem, setProjects, currentSource, transcriptSource]
  );

  const handleBrowseClick = useCallback(async () => {
    setError(null);

    try {
      const handle = await openDirectoryPicker();
      await handleFolderLoaded(() => createFileSystemFromHandle(handle));
    } catch (err) {
      if (err instanceof FileSystemError && err.code === 'PERMISSION_DENIED') {
        // User cancelled - don't show an error
        return;
      }
      if (err instanceof FileSystemError) {
        setError({
          message: err.message,
          suggestion: err.code === 'NOT_SUPPORTED'
            ? 'Use Chrome or Edge for the best experience, or try dragging a folder.'
            : undefined,
          canRetry: false,
        });
      } else {
        setError({
          message: err instanceof Error ? err.message : 'Failed to open folder',
          canRetry: false,
        });
      }
    }
  }, [handleFolderLoaded]);

  const handleFolderDropped = useCallback(
    (contents: DroppedDirectoryContents) => {
      handleFolderLoaded(() => createFileSystemFromDropped(contents.files));
    },
    [handleFolderLoaded]
  );

  const handleDropError = useCallback((errorMessage: string) => {
    setError({
      message: errorMessage,
      canRetry: false,
    });
  }, []);

  const handleDismissError = useCallback(() => {
    setError(null);
  }, []);

  const handleRetry = useCallback(() => {
    setError(null);
    handleBrowseClick();
  }, [handleBrowseClick]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
      {/* Source selector */}
      <div className="mb-6">
        <SourceSelector />
      </div>

      {/* Title and instructions */}
      <div className="text-center mb-8 max-w-md">
        <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-2">
          Open Sessions Folder
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Browse your {currentSource.name} sessions by opening your storage folder:
        </p>
        <code className="inline-block mt-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded text-sm text-gray-700 dark:text-gray-300">
          {currentSource.folderPath}
        </code>
      </div>

      {/* Browser compatibility warning - shown when browser is unsupported */}
      {!isSupported && (
        <div className="w-full max-w-md p-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-base font-medium text-amber-800 dark:text-amber-200">
              Browser not supported
            </p>
            <p className="mt-2 text-sm text-amber-600 dark:text-amber-300">
              This application requires a browser with File System Access API or drag-and-drop support.
            </p>
            <p className="mt-3 text-sm text-amber-700 dark:text-amber-200">
              Please use{' '}
              <a
                href="https://www.google.com/chrome/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-amber-900 dark:hover:text-amber-100"
              >
                Chrome
              </a>
              {' '}or{' '}
              <a
                href="https://www.microsoft.com/edge"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-amber-900 dark:hover:text-amber-100"
              >
                Edge
              </a>
              {' '}for the best experience.
            </p>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mb-6 w-full max-w-md">
          <ErrorBanner
            message={error.message}
            suggestion={error.suggestion}
            canRetry={error.canRetry}
            onRetry={error.canRetry ? handleRetry : undefined}
            canDismiss={true}
            onDismiss={handleDismissError}
          />
        </div>
      )}

      {/* Drop zone with optional browse button - only shown when browser is supported */}
      {isSupported && (
        <FolderDropZone
          onFolderDropped={handleFolderDropped}
          onError={handleDropError}
          isLoading={isLoading}
          className="w-full max-w-md"
        >
          <div className="flex flex-col items-center justify-center p-8 text-center">
            {isLoading ? (
              <>
                <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
                <p className="text-gray-600 dark:text-gray-400">Loading sessions...</p>
              </>
            ) : (
              <>
                <FolderOpen className="w-10 h-10 text-gray-400 dark:text-gray-500 mb-4" />
                <p className="text-gray-600 dark:text-gray-400 font-medium mb-2">
                  Drop folder here
                </p>
                {supportsDirectoryPicker && (
                  <>
                    <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">or</p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleBrowseClick();
                      }}
                      data-testid="browse-folder-button"
                      className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
                    >
                      Browse Folder
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </FolderDropZone>
      )}

      {/* Browser compatibility note - only shown when browser is supported */}
      {isSupported && (
        <p className="mt-6 text-sm text-gray-500 dark:text-gray-400 text-center">
          Works in Chrome, Edge, Firefox, Safari
        </p>
      )}
    </div>
  );
}
