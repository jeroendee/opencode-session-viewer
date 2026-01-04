import { useState, useCallback, DragEvent, ReactNode } from 'react';
import { FolderOpen, AlertCircle } from 'lucide-react';
import {
  validateDirectoryDrop,
  readDroppedDirectory,
  DroppedDirectoryContents,
  FileSystemError,
} from '../lib/fileSystem';

interface FolderDropZoneProps {
  /** Called when a folder is successfully dropped and read */
  onFolderDropped: (contents: DroppedDirectoryContents) => void;
  /** Called when an error occurs during folder reading */
  onError?: (error: string) => void;
  /** Optional children to render inside the drop zone */
  children?: ReactNode;
  /** Optional className for additional styling */
  className?: string;
  /** Whether the component is currently loading */
  isLoading?: boolean;
}

/**
 * A drop zone component for drag-and-drop folder selection.
 * Works in Firefox, Safari, and other browsers that don't support the
 * File System Access API.
 */
export function FolderDropZone({
  onFolderDropped,
  onError,
  children,
  className = '',
  isLoading = false,
}: FolderDropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
    setError(null);
  }, []);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Keep drag over state active
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set to false if we're leaving the drop zone entirely
    // Check if the related target is still within the drop zone
    const relatedTarget = e.relatedTarget as Node | null;
    const currentTarget = e.currentTarget as Node;
    if (!relatedTarget || !currentTarget.contains(relatedTarget)) {
      setIsDragOver(false);
    }
  }, []);

  const handleDrop = useCallback(
    async (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      setError(null);

      // Validate the drop
      const validation = validateDirectoryDrop(e);
      if (!validation.isValid) {
        setError(validation.error);
        onError?.(validation.error);
        return;
      }

      // Read the directory contents
      setIsProcessing(true);
      try {
        const contents = await readDroppedDirectory(validation.entry);
        onFolderDropped(contents);
      } catch (err) {
        const errorMessage =
          err instanceof FileSystemError
            ? err.message
            : err instanceof Error
              ? err.message
              : 'Failed to read folder contents';
        setError(errorMessage);
        onError?.(errorMessage);
      } finally {
        setIsProcessing(false);
      }
    },
    [onFolderDropped, onError]
  );

  const showLoading = isLoading || isProcessing;

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        relative rounded-lg border-2 border-dashed transition-colors duration-200
        ${isDragOver
          ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/20'
          : 'border-gray-300 dark:border-gray-600'
        }
        ${error
          ? 'border-red-400 bg-red-50 dark:border-red-500 dark:bg-red-900/20'
          : ''
        }
        ${showLoading
          ? 'opacity-50 cursor-wait'
          : 'cursor-pointer hover:border-gray-400 dark:hover:border-gray-500'
        }
        ${className}
      `}
    >
      {children || (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          {showLoading ? (
            <>
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mb-4" />
              <p className="text-gray-600 dark:text-gray-400">Reading folder contents...</p>
            </>
          ) : error ? (
            <>
              <AlertCircle className="w-10 h-10 text-red-500 mb-4" />
              <p className="text-red-600 dark:text-red-400 font-medium mb-2">Error</p>
              <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
            </>
          ) : (
            <>
              <FolderOpen
                className={`w-10 h-10 mb-4 transition-colors ${
                  isDragOver
                    ? 'text-blue-500 dark:text-blue-400'
                    : 'text-gray-400 dark:text-gray-500'
                }`}
              />
              <p className="text-gray-600 dark:text-gray-400 font-medium mb-2">
                {isDragOver ? 'Drop folder here' : 'Drag and drop a folder'}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                Drop your OpenCode storage folder here to browse sessions
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
