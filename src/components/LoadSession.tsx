import { useCallback, useEffect, useRef, useState } from 'react';
import { Upload, FileJson, Loader2, AlertCircle, X } from 'lucide-react';
import { useSessionStore } from '../store/sessionStore';

export function LoadSession() {
  const { isLoading, error, loadSession, loadSessionFromUrl, clearError, setError } = useSessionStore();
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle URL parameter on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionUrl = params.get('session');
    if (sessionUrl) {
      loadSessionFromUrl(sessionUrl).catch(() => {
        // Error is already set in the store by loadSessionFromUrl
      });
    }
  }, [loadSessionFromUrl]);

  const handleFileSelect = useCallback((file: File) => {
    if (file.type === 'application/json' || file.name.endsWith('.json')) {
      loadSession(file);
    } else {
      setError('Please select a JSON file');
    }
  }, [loadSession, setError]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInputRef.current?.click();
    }
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
      {/* Error message */}
      {error && (
        <div className="mb-6 w-full max-w-md p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
          <button
            onClick={clearError}
            className="p-1 hover:bg-red-100 dark:hover:bg-red-800 rounded"
            aria-label="Dismiss error"
          >
            <X className="w-4 h-4 text-red-500" />
          </button>
        </div>
      )}

      {/* Drop zone */}
      <div
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onKeyDown={handleKeyDown}
        className={`
          w-full max-w-md p-12 border-2 border-dashed rounded-xl
          flex flex-col items-center justify-center gap-4
          cursor-pointer transition-colors
          ${isDragging
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
          }
          ${isLoading ? 'pointer-events-none opacity-60' : ''}
        `}
        role="button"
        tabIndex={0}
        aria-label="Drop a session file here or click to browse"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          onChange={handleInputChange}
          className="hidden"
          aria-hidden="true"
        />

        {isLoading ? (
          <>
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
            <p className="text-gray-600 dark:text-gray-300">Loading session...</p>
          </>
        ) : (
          <>
            <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-full">
              {isDragging ? (
                <FileJson className="w-12 h-12 text-blue-500" />
              ) : (
                <Upload className="w-12 h-12 text-gray-400 dark:text-gray-500" />
              )}
            </div>
            <div className="text-center">
              <p className="text-lg font-medium text-gray-700 dark:text-gray-200">
                Drop a session file here
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                or click to browse
              </p>
            </div>
          </>
        )}
      </div>

      {/* URL hint */}
      <p className="mt-6 text-sm text-gray-500 dark:text-gray-400 text-center max-w-md">
        You can also load a session by adding <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">?session=URL</code> to the page URL.
      </p>
    </div>
  );
}
