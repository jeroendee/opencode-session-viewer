import { FileIcon, Download } from 'lucide-react';
import type { FilePart as FilePartType } from '../../types/session';

interface FilePartProps {
  part: FilePartType;
}

/**
 * Check if a MIME type represents an image.
 */
function isImageMime(mime: string): boolean {
  return mime.startsWith('image/');
}

/**
 * Validates a URL for safe opening.
 * Only allows http, https, and data URLs for images.
 */
function isSafeUrl(url: string, mime: string): boolean {
  // Allow relative URLs
  if (url.startsWith('/') || url.startsWith('./')) {
    return true;
  }
  
  // Allow http and https
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return true;
  }
  
  // Allow data URLs only for images
  if (url.startsWith('data:') && mime.startsWith('image/')) {
    return true;
  }
  
  return false;
}

/**
 * Get a display name for the file.
 */
function getDisplayName(part: FilePartType): string {
  if (part.filename) {
    return part.filename;
  }
  
  // Try to extract filename from URL
  try {
    const url = new URL(part.url);
    const pathname = url.pathname;
    const lastSegment = pathname.split('/').pop();
    if (lastSegment) {
      return lastSegment;
    }
  } catch {
    // URL parsing failed
  }
  
  // Try to extract from source
  if (part.source?.type === 'file' && part.source.path) {
    return part.source.path.split('/').pop() || 'File';
  }
  
  return 'File';
}

export function FilePart({ part }: FilePartProps) {
  const isImage = isImageMime(part.mime);
  const displayName = getDisplayName(part);
  const safeUrl = isSafeUrl(part.url, part.mime);

  const handleOpen = () => {
    if (!safeUrl) {
      console.warn('Blocked unsafe URL:', part.url);
      return;
    }
    window.open(part.url, '_blank', 'noopener,noreferrer');
  };

  if (isImage && safeUrl) {
    return (
      <div className="my-3 inline-block">
        <button
          onClick={handleOpen}
          className="group flex flex-col items-center gap-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-label={`Open ${displayName} in new window`}
        >
          {/* Image thumbnail */}
          <div className="relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800">
            <img
              src={part.url}
              alt={displayName}
              className="max-w-[200px] max-h-[200px] object-contain"
              loading="lazy"
            />
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Download className="w-6 h-6 text-white" />
            </div>
          </div>
          
          {/* Filename */}
          <span className="text-xs text-gray-600 dark:text-gray-400 max-w-[200px] truncate">
            {displayName}
          </span>
        </button>
      </div>
    );
  }

  // Non-image file or unsafe URL (show as non-clickable for unsafe)
  return (
    <button
      onClick={handleOpen}
      disabled={!safeUrl}
      className={`my-2 inline-flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
        safeUrl 
          ? 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer' 
          : 'bg-gray-100 dark:bg-gray-700 opacity-50 cursor-not-allowed'
      }`}
      aria-label={safeUrl ? `Open ${displayName} in new window` : `${displayName} (blocked URL)`}
    >
      <FileIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
      <span className="text-sm text-gray-700 dark:text-gray-300 max-w-[300px] truncate">
        {displayName}
      </span>
      {safeUrl && <Download className="w-4 h-4 text-gray-400" />}
    </button>
  );
}
