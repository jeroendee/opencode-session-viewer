import { useState, useCallback } from 'react';
import { FolderOpen, AlertCircle, Loader2 } from 'lucide-react';
import { FolderDropZone } from './FolderDropZone';
import {
  isFileSystemAccessSupported,
  openDirectoryPicker,
  createFileSystemFromHandle,
  createFileSystemFromDropped,
  FileSystemError,
  DroppedDirectoryContents,
} from '../lib/fileSystem';
import { loadAllSessions } from '../lib/sessionLoader';
import { useSessionStore } from '../store/sessionStore';

/**
 * FolderPicker provides UI for selecting an OpenCode storage folder.
 * Supports both the File System Access API (Chromium) and drag-drop (all browsers).
 */
export function FolderPicker() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { setFileSystem, setProjects } = useSessionStore();

  const supportsDirectoryPicker = isFileSystemAccessSupported();

  const handleFolderLoaded = useCallback(
    async (
      createFs: () => ReturnType<typeof createFileSystemFromHandle> | ReturnType<typeof createFileSystemFromDropped>
    ) => {
      setIsLoading(true);
      setError(null);

      try {
        const fs = createFs();
        const result = await loadAllSessions(fs);

        if (result.projects.length === 0) {
          setError(
            'No sessions found. Make sure you selected the OpenCode storage folder (e.g., ~/.local/share/opencode/storage/)'
          );
          setIsLoading(false);
          return;
        }

        setFileSystem(fs);
        setProjects(result.projects);

        if (result.errorCount > 0) {
          console.warn(`Loaded with ${result.errorCount} errors`);
        }
      } catch (err) {
        const message =
          err instanceof FileSystemError
            ? err.message
            : err instanceof Error
              ? err.message
              : 'Failed to load sessions';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [setFileSystem, setProjects]
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
      const message =
        err instanceof FileSystemError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to open folder';
      setError(message);
    }
  }, [handleFolderLoaded]);

  const handleFolderDropped = useCallback(
    (contents: DroppedDirectoryContents) => {
      handleFolderLoaded(() => createFileSystemFromDropped(contents.files));
    },
    [handleFolderLoaded]
  );

  const handleDropError = useCallback((errorMessage: string) => {
    setError(errorMessage);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
      {/* Title and instructions */}
      <div className="text-center mb-8 max-w-md">
        <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-2">
          Open Sessions Folder
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Browse your OpenCode sessions by opening your storage folder:
        </p>
        <code className="inline-block mt-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded text-sm text-gray-700 dark:text-gray-300">
          ~/.local/share/opencode/storage/
        </code>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-6 w-full max-w-md p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Drop zone with optional browse button */}
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

      {/* Browser compatibility note */}
      <p className="mt-6 text-sm text-gray-500 dark:text-gray-400 text-center">
        Works in Chrome, Edge, Firefox, Safari
      </p>
    </div>
  );
}
