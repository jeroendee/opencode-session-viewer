/**
 * File System Access API implementation for Chromium browsers.
 * Provides functions to open a directory picker and read files/directories.
 */

// Custom error class for file system operations
export class FileSystemError extends Error {
  constructor(
    message: string,
    public readonly code: 'PERMISSION_DENIED' | 'NOT_FOUND' | 'NOT_SUPPORTED' | 'UNKNOWN'
  ) {
    super(message);
    this.name = 'FileSystemError';
  }
}

/**
 * Check if the File System Access API is supported in the current browser.
 */
export function isFileSystemAccessSupported(): boolean {
  return 'showDirectoryPicker' in window;
}

/**
 * Opens the native directory picker dialog.
 * Only works in Chromium-based browsers (Chrome, Edge, Opera, etc.)
 *
 * @returns The FileSystemDirectoryHandle for the selected directory
 * @throws FileSystemError if permission is denied or operation fails
 */
export async function openDirectoryPicker(): Promise<FileSystemDirectoryHandle> {
  if (!isFileSystemAccessSupported()) {
    throw new FileSystemError(
      'File System Access API is not supported in this browser. Please use Chrome, Edge, or another Chromium-based browser.',
      'NOT_SUPPORTED'
    );
  }

  try {
    return await window.showDirectoryPicker({
      mode: 'read',
      startIn: 'documents',
    });
  } catch (error) {
    if (error instanceof DOMException) {
      if (error.name === 'AbortError') {
        throw new FileSystemError('Directory picker was cancelled', 'PERMISSION_DENIED');
      }
      if (error.name === 'SecurityError') {
        throw new FileSystemError(
          'Permission denied. Please allow access to the directory.',
          'PERMISSION_DENIED'
        );
      }
    }
    throw new FileSystemError(
      `Failed to open directory picker: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'UNKNOWN'
    );
  }
}

/**
 * Result from walking a directory, containing the path and file handle.
 */
export interface WalkEntry {
  /** Path segments from the root directory */
  path: string[];
  /** File system handle for the entry */
  handle: FileSystemFileHandle;
}

/**
 * Recursively walks through a directory and yields all files.
 * Uses an async generator for memory efficiency with large directories.
 *
 * @param handle - The directory handle to walk
 * @param path - Current path segments (used internally for recursion)
 * @yields WalkEntry for each file found
 */
export async function* walkDirectory(
  handle: FileSystemDirectoryHandle,
  path: string[] = []
): AsyncGenerator<WalkEntry> {
  try {
    for await (const entry of handle.values()) {
      const entryPath = [...path, entry.name];
      if (entry.kind === 'file') {
        yield { path: entryPath, handle: entry };
      } else if (entry.kind === 'directory') {
        yield* walkDirectory(entry, entryPath);
      }
    }
  } catch (error) {
    if (error instanceof DOMException) {
      if (error.name === 'NotAllowedError') {
        throw new FileSystemError(
          `Permission denied for directory: ${path.join('/') || '(root)'}`,
          'PERMISSION_DENIED'
        );
      }
      if (error.name === 'NotFoundError') {
        throw new FileSystemError(
          `Directory not found: ${path.join('/') || '(root)'}`,
          'NOT_FOUND'
        );
      }
      if (error.name === 'AbortError') {
        throw new FileSystemError(
          `Directory access was cancelled: ${path.join('/') || '(root)'}`,
          'PERMISSION_DENIED'
        );
      }
    }
    throw new FileSystemError(
      `Failed to walk directory ${path.join('/') || '(root)'}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'UNKNOWN'
    );
  }
}

/**
 * Reads the text content of a file.
 *
 * @param handle - The file handle to read
 * @returns The file content as a string
 * @throws FileSystemError if reading fails
 */
export async function readFile(handle: FileSystemFileHandle): Promise<string> {
  try {
    const file = await handle.getFile();
    return await file.text();
  } catch (error) {
    if (error instanceof DOMException && error.name === 'NotAllowedError') {
      throw new FileSystemError('Permission denied to read file', 'PERMISSION_DENIED');
    }
    throw new FileSystemError(
      `Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'UNKNOWN'
    );
  }
}

/**
 * Gets a subdirectory handle from a parent directory.
 *
 * @param parent - The parent directory handle
 * @param name - Name of the subdirectory
 * @returns The subdirectory handle, or null if not found
 */
export async function getSubdirectory(
  parent: FileSystemDirectoryHandle,
  name: string
): Promise<FileSystemDirectoryHandle | null> {
  try {
    return await parent.getDirectoryHandle(name);
  } catch (error) {
    if (error instanceof DOMException) {
      if (error.name === 'NotFoundError') {
        return null;
      }
      if (error.name === 'NotAllowedError') {
        throw new FileSystemError(`Permission denied for directory: ${name}`, 'PERMISSION_DENIED');
      }
    }
    throw new FileSystemError(
      `Failed to get subdirectory '${name}': ${error instanceof Error ? error.message : 'Unknown error'}`,
      'UNKNOWN'
    );
  }
}

/**
 * Gets a file handle from a directory.
 *
 * @param directory - The directory handle
 * @param name - Name of the file
 * @returns The file handle, or null if not found
 */
export async function getFileHandle(
  directory: FileSystemDirectoryHandle,
  name: string
): Promise<FileSystemFileHandle | null> {
  try {
    return await directory.getFileHandle(name);
  } catch (error) {
    if (error instanceof DOMException) {
      if (error.name === 'NotFoundError') {
        return null;
      }
      if (error.name === 'NotAllowedError') {
        throw new FileSystemError(`Permission denied for file: ${name}`, 'PERMISSION_DENIED');
      }
    }
    throw new FileSystemError(
      `Failed to get file '${name}': ${error instanceof Error ? error.message : 'Unknown error'}`,
      'UNKNOWN'
    );
  }
}

/**
 * Lists all entries (files and directories) in a directory.
 *
 * @param handle - The directory handle
 * @returns Array of entry names with their kinds
 */
export async function listDirectory(
  handle: FileSystemDirectoryHandle
): Promise<Array<{ name: string; kind: 'file' | 'directory' }>> {
  const entries: Array<{ name: string; kind: 'file' | 'directory' }> = [];
  try {
    for await (const entry of handle.values()) {
      entries.push({ name: entry.name, kind: entry.kind });
    }
    return entries;
  } catch (error) {
    if (error instanceof DOMException) {
      if (error.name === 'NotAllowedError') {
        throw new FileSystemError('Permission denied to list directory', 'PERMISSION_DENIED');
      }
    }
    throw new FileSystemError(
      `Failed to list directory: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'UNKNOWN'
    );
  }
}

/**
 * Resolves a path within a directory handle.
 * Can navigate through nested directories using path segments.
 *
 * @param root - The root directory handle
 * @param path - Array of path segments to navigate
 * @returns Object containing the final directory and optional file handle
 */
export async function resolvePath(
  root: FileSystemDirectoryHandle,
  path: string[]
): Promise<{
  directory: FileSystemDirectoryHandle;
  file: FileSystemFileHandle | null;
}> {
  if (path.length === 0) {
    return { directory: root, file: null };
  }

  let currentDir = root;

  // Navigate to the parent directory of the final segment
  for (let i = 0; i < path.length - 1; i++) {
    const subdir = await getSubdirectory(currentDir, path[i]);
    if (!subdir) {
      throw new FileSystemError(`Directory not found: ${path.slice(0, i + 1).join('/')}`, 'NOT_FOUND');
    }
    currentDir = subdir;
  }

  // Try to get the last segment as a file
  const lastName = path[path.length - 1];
  const fileHandle = await getFileHandle(currentDir, lastName);
  if (fileHandle) {
    return { directory: currentDir, file: fileHandle };
  }

  // Try as a directory
  const dirHandle = await getSubdirectory(currentDir, lastName);
  if (dirHandle) {
    return { directory: dirHandle, file: null };
  }

  throw new FileSystemError(`Path not found: ${path.join('/')}`, 'NOT_FOUND');
}

/**
 * Result type for tryResolvePath when path is found.
 */
export interface ResolvedPath {
  found: true;
  directory: FileSystemDirectoryHandle;
  file: FileSystemFileHandle | null;
}

/**
 * Result type for tryResolvePath when path is not found.
 */
export interface UnresolvedPath {
  found: false;
  directory: null;
  file: null;
}

export type TryResolvePathResult = ResolvedPath | UnresolvedPath;

/**
 * Attempts to resolve a path within a directory handle without throwing on missing paths.
 * Can navigate through nested directories using path segments.
 *
 * @param root - The root directory handle
 * @param path - Array of path segments to navigate
 * @returns Object with found=true and handles if found, or found=false if not found
 * @throws FileSystemError only for permission errors, not for missing paths
 */
export async function tryResolvePath(
  root: FileSystemDirectoryHandle,
  path: string[]
): Promise<TryResolvePathResult> {
  if (path.length === 0) {
    return { found: true, directory: root, file: null };
  }

  let currentDir = root;

  // Navigate to the parent directory of the final segment
  for (let i = 0; i < path.length - 1; i++) {
    const subdir = await getSubdirectory(currentDir, path[i]);
    if (!subdir) {
      return { found: false, directory: null, file: null };
    }
    currentDir = subdir;
  }

  // Try to get the last segment as a file
  const lastName = path[path.length - 1];
  const fileHandle = await getFileHandle(currentDir, lastName);
  if (fileHandle) {
    return { found: true, directory: currentDir, file: fileHandle };
  }

  // Try as a directory
  const dirHandle = await getSubdirectory(currentDir, lastName);
  if (dirHandle) {
    return { found: true, directory: dirHandle, file: null };
  }

  return { found: false, directory: null, file: null };
}
