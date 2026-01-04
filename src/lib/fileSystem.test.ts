import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isFileSystemAccessSupported,
  FileSystemError,
  openDirectoryPicker,
  walkDirectory,
  readFile,
  getSubdirectory,
  getFileHandle,
  listDirectory,
  resolvePath,
  tryResolvePath,
  readDroppedDirectory,
  isDragDropSupported,
  getDirectoryFromDrop,
  validateDirectoryDrop,
  createFileSystemFromHandle,
  createFileSystemFromDropped,
  type VirtualFileSystem,
} from './fileSystem';

// Mock FileSystemFileHandle
function createMockFileHandle(name: string, content: string): FileSystemFileHandle {
  return {
    kind: 'file',
    name,
    getFile: vi.fn().mockResolvedValue({
      text: vi.fn().mockResolvedValue(content),
    }),
    isSameEntry: vi.fn(),
    queryPermission: vi.fn(),
    requestPermission: vi.fn(),
  } as unknown as FileSystemFileHandle;
}

// Mock FileSystemDirectoryHandle
function createMockDirectoryHandle(
  name: string,
  entries: Map<string, FileSystemHandle>
): FileSystemDirectoryHandle {
  const handle = {
    kind: 'directory',
    name,
    values: vi.fn().mockImplementation(async function* () {
      for (const entry of entries.values()) {
        yield entry;
      }
    }),
    getFileHandle: vi.fn().mockImplementation(async (fileName: string) => {
      const entry = entries.get(fileName);
      if (entry && entry.kind === 'file') {
        return entry;
      }
      const error = new DOMException('File not found', 'NotFoundError');
      throw error;
    }),
    getDirectoryHandle: vi.fn().mockImplementation(async (dirName: string) => {
      const entry = entries.get(dirName);
      if (entry && entry.kind === 'directory') {
        return entry;
      }
      const error = new DOMException('Directory not found', 'NotFoundError');
      throw error;
    }),
    isSameEntry: vi.fn(),
    queryPermission: vi.fn(),
    requestPermission: vi.fn(),
    resolve: vi.fn(),
    keys: vi.fn(),
    entries: vi.fn(),
  } as unknown as FileSystemDirectoryHandle;

  return handle;
}

// Helper to safely remove and restore window properties
function removeWindowProperty(propertyName: string): () => void {
  const descriptor = Object.getOwnPropertyDescriptor(window, propertyName);
  const hasProperty = propertyName in window;

  if (hasProperty) {
    // Make it configurable first if needed, then delete
    Object.defineProperty(window, propertyName, {
      value: undefined,
      configurable: true,
      writable: true,
    });
    delete (window as unknown as Record<string, unknown>)[propertyName];
  }

  // Return restore function
  return () => {
    if (descriptor) {
      Object.defineProperty(window, propertyName, descriptor);
    }
  };
}

describe('isFileSystemAccessSupported', () => {
  let restoreProperty: (() => void) | null = null;

  afterEach(() => {
    vi.unstubAllGlobals();
    if (restoreProperty) {
      restoreProperty();
      restoreProperty = null;
    }
  });

  it('returns true when showDirectoryPicker is available', () => {
    vi.stubGlobal('showDirectoryPicker', vi.fn());
    expect(isFileSystemAccessSupported()).toBe(true);
  });

  it('returns false when showDirectoryPicker is not available', () => {
    // Remove the property entirely to simulate unsupported browser
    restoreProperty = removeWindowProperty('showDirectoryPicker');
    expect(isFileSystemAccessSupported()).toBe(false);
  });
});

describe('openDirectoryPicker', () => {
  let mockShowDirectoryPicker: ReturnType<typeof vi.fn>;
  let restoreProperty: (() => void) | null = null;

  beforeEach(() => {
    mockShowDirectoryPicker = vi.fn();
    vi.stubGlobal('showDirectoryPicker', mockShowDirectoryPicker);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (restoreProperty) {
      restoreProperty();
      restoreProperty = null;
    }
  });

  it('throws NOT_SUPPORTED error when API is not available', async () => {
    // Remove the property entirely to simulate unsupported browser
    restoreProperty = removeWindowProperty('showDirectoryPicker');

    await expect(openDirectoryPicker()).rejects.toThrow(FileSystemError);
    await expect(openDirectoryPicker()).rejects.toMatchObject({
      code: 'NOT_SUPPORTED',
    });
  });

  it('returns directory handle on success', async () => {
    const mockHandle = createMockDirectoryHandle('test', new Map());
    mockShowDirectoryPicker.mockResolvedValue(mockHandle);

    const result = await openDirectoryPicker();
    expect(result).toBe(mockHandle);
    expect(mockShowDirectoryPicker).toHaveBeenCalledWith({
      mode: 'read',
      startIn: 'documents',
    });
  });

  it('throws PERMISSION_DENIED on user cancellation', async () => {
    const abortError = new DOMException('User cancelled', 'AbortError');
    mockShowDirectoryPicker.mockRejectedValue(abortError);

    await expect(openDirectoryPicker()).rejects.toThrow(FileSystemError);
    await expect(openDirectoryPicker()).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
  });

  it('throws PERMISSION_DENIED on security error', async () => {
    const securityError = new DOMException('Access denied', 'SecurityError');
    mockShowDirectoryPicker.mockRejectedValue(securityError);

    await expect(openDirectoryPicker()).rejects.toThrow(FileSystemError);
    await expect(openDirectoryPicker()).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
  });
});

describe('walkDirectory', () => {
  it('yields all files in a flat directory', async () => {
    const file1 = createMockFileHandle('file1.txt', 'content1');
    const file2 = createMockFileHandle('file2.json', 'content2');
    const entries = new Map<string, FileSystemHandle>([
      ['file1.txt', file1],
      ['file2.json', file2],
    ]);
    const root = createMockDirectoryHandle('root', entries);

    const results: Array<{ path: string[]; handle: FileSystemFileHandle }> = [];
    for await (const entry of walkDirectory(root)) {
      results.push(entry);
    }

    expect(results).toHaveLength(2);
    expect(results.map((r) => r.path)).toContainEqual(['file1.txt']);
    expect(results.map((r) => r.path)).toContainEqual(['file2.json']);
  });

  it('recursively walks nested directories', async () => {
    const deepFile = createMockFileHandle('deep.txt', 'deep content');
    const subDir = createMockDirectoryHandle(
      'subdir',
      new Map([['deep.txt', deepFile]])
    );
    const rootFile = createMockFileHandle('root.txt', 'root content');
    const root = createMockDirectoryHandle(
      'root',
      new Map<string, FileSystemHandle>([
        ['root.txt', rootFile],
        ['subdir', subDir],
      ])
    );

    const results: Array<{ path: string[]; handle: FileSystemFileHandle }> = [];
    for await (const entry of walkDirectory(root)) {
      results.push(entry);
    }

    expect(results).toHaveLength(2);
    expect(results.map((r) => r.path)).toContainEqual(['root.txt']);
    expect(results.map((r) => r.path)).toContainEqual(['subdir', 'deep.txt']);
  });

  it('handles empty directories', async () => {
    const root = createMockDirectoryHandle('empty', new Map());

    const results: Array<{ path: string[]; handle: FileSystemFileHandle }> = [];
    for await (const entry of walkDirectory(root)) {
      results.push(entry);
    }

    expect(results).toHaveLength(0);
  });
});

describe('readFile', () => {
  it('reads file content as text', async () => {
    const fileHandle = createMockFileHandle('test.txt', 'Hello, World!');

    const content = await readFile(fileHandle);
    expect(content).toBe('Hello, World!');
  });

  it('throws PERMISSION_DENIED on NotAllowedError', async () => {
    const fileHandle = {
      kind: 'file',
      name: 'test.txt',
      getFile: vi.fn().mockRejectedValue(
        new DOMException('Access denied', 'NotAllowedError')
      ),
    } as unknown as FileSystemFileHandle;

    await expect(readFile(fileHandle)).rejects.toThrow(FileSystemError);
    await expect(readFile(fileHandle)).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
  });
});

describe('getSubdirectory', () => {
  it('returns subdirectory handle when it exists', async () => {
    const subDir = createMockDirectoryHandle('subdir', new Map());
    const root = createMockDirectoryHandle('root', new Map([['subdir', subDir]]));

    const result = await getSubdirectory(root, 'subdir');
    expect(result).toBe(subDir);
  });

  it('returns null when subdirectory does not exist', async () => {
    const root = createMockDirectoryHandle('root', new Map());

    const result = await getSubdirectory(root, 'nonexistent');
    expect(result).toBeNull();
  });
});

describe('getFileHandle', () => {
  it('returns file handle when it exists', async () => {
    const file = createMockFileHandle('test.txt', 'content');
    const dir = createMockDirectoryHandle('dir', new Map([['test.txt', file]]));

    const result = await getFileHandle(dir, 'test.txt');
    expect(result).toBe(file);
  });

  it('returns null when file does not exist', async () => {
    const dir = createMockDirectoryHandle('dir', new Map());

    const result = await getFileHandle(dir, 'nonexistent.txt');
    expect(result).toBeNull();
  });
});

describe('listDirectory', () => {
  it('lists all entries with their kinds', async () => {
    const file = createMockFileHandle('file.txt', 'content');
    const subDir = createMockDirectoryHandle('subdir', new Map());
    const root = createMockDirectoryHandle(
      'root',
      new Map<string, FileSystemHandle>([
        ['file.txt', file],
        ['subdir', subDir],
      ])
    );

    const entries = await listDirectory(root);

    expect(entries).toHaveLength(2);
    expect(entries).toContainEqual({ name: 'file.txt', kind: 'file' });
    expect(entries).toContainEqual({ name: 'subdir', kind: 'directory' });
  });

  it('returns empty array for empty directory', async () => {
    const root = createMockDirectoryHandle('empty', new Map());

    const entries = await listDirectory(root);
    expect(entries).toHaveLength(0);
  });
});

describe('resolvePath', () => {
  it('returns root directory for empty path', async () => {
    const root = createMockDirectoryHandle('root', new Map());

    const result = await resolvePath(root, []);

    expect(result.directory).toBe(root);
    expect(result.file).toBeNull();
  });

  it('resolves file in root directory', async () => {
    const file = createMockFileHandle('test.txt', 'content');
    const root = createMockDirectoryHandle('root', new Map([['test.txt', file]]));

    const result = await resolvePath(root, ['test.txt']);

    expect(result.directory).toBe(root);
    expect(result.file).toBe(file);
  });

  it('resolves nested file path', async () => {
    const deepFile = createMockFileHandle('deep.json', '{}');
    const subDir = createMockDirectoryHandle(
      'subdir',
      new Map([['deep.json', deepFile]])
    );
    const root = createMockDirectoryHandle('root', new Map([['subdir', subDir]]));

    const result = await resolvePath(root, ['subdir', 'deep.json']);

    expect(result.directory).toBe(subDir);
    expect(result.file).toBe(deepFile);
  });

  it('resolves subdirectory path', async () => {
    const subDir = createMockDirectoryHandle('subdir', new Map());
    const root = createMockDirectoryHandle('root', new Map([['subdir', subDir]]));

    const result = await resolvePath(root, ['subdir']);

    expect(result.directory).toBe(subDir);
    expect(result.file).toBeNull();
  });

  it('throws NOT_FOUND for nonexistent path', async () => {
    const root = createMockDirectoryHandle('root', new Map());

    await expect(resolvePath(root, ['nonexistent'])).rejects.toThrow(
      FileSystemError
    );
    await expect(resolvePath(root, ['nonexistent'])).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('throws NOT_FOUND for missing intermediate directory', async () => {
    const root = createMockDirectoryHandle('root', new Map());

    await expect(resolvePath(root, ['missing', 'path'])).rejects.toThrow(
      FileSystemError
    );
    await expect(resolvePath(root, ['missing', 'path'])).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });
});

describe('tryResolvePath', () => {
  it('returns found=true with root directory for empty path', async () => {
    const root = createMockDirectoryHandle('root', new Map());

    const result = await tryResolvePath(root, []);

    expect(result.found).toBe(true);
    if (result.found) {
      expect(result.directory).toBe(root);
      expect(result.file).toBeNull();
    }
  });

  it('returns found=true with file for existing file path', async () => {
    const file = createMockFileHandle('test.txt', 'content');
    const root = createMockDirectoryHandle('root', new Map([['test.txt', file]]));

    const result = await tryResolvePath(root, ['test.txt']);

    expect(result.found).toBe(true);
    if (result.found) {
      expect(result.directory).toBe(root);
      expect(result.file).toBe(file);
    }
  });

  it('returns found=true for nested file path', async () => {
    const deepFile = createMockFileHandle('deep.json', '{}');
    const subDir = createMockDirectoryHandle(
      'subdir',
      new Map([['deep.json', deepFile]])
    );
    const root = createMockDirectoryHandle('root', new Map([['subdir', subDir]]));

    const result = await tryResolvePath(root, ['subdir', 'deep.json']);

    expect(result.found).toBe(true);
    if (result.found) {
      expect(result.directory).toBe(subDir);
      expect(result.file).toBe(deepFile);
    }
  });

  it('returns found=false for nonexistent path without throwing', async () => {
    const root = createMockDirectoryHandle('root', new Map());

    const result = await tryResolvePath(root, ['nonexistent']);

    expect(result.found).toBe(false);
    expect(result.directory).toBeNull();
    expect(result.file).toBeNull();
  });

  it('returns found=false for missing intermediate directory without throwing', async () => {
    const root = createMockDirectoryHandle('root', new Map());

    const result = await tryResolvePath(root, ['missing', 'path']);

    expect(result.found).toBe(false);
    expect(result.directory).toBeNull();
    expect(result.file).toBeNull();
  });

  it('returns found=true for subdirectory path', async () => {
    const subDir = createMockDirectoryHandle('subdir', new Map());
    const root = createMockDirectoryHandle('root', new Map([['subdir', subDir]]));

    const result = await tryResolvePath(root, ['subdir']);

    expect(result.found).toBe(true);
    if (result.found) {
      expect(result.directory).toBe(subDir);
      expect(result.file).toBeNull();
    }
  });
});

// ============================================================================
// Drag-Drop API Tests
// ============================================================================

// Mock FileSystemDirectoryEntry for drag-drop
function createMockFileSystemFileEntry(
  name: string,
  content: string
): FileSystemFileEntry {
  // Create a mock file with proper text() method
  const mockFile = {
    name,
    text: () => Promise.resolve(content),
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(content.length)),
    slice: vi.fn(),
    stream: vi.fn(),
    size: content.length,
    type: 'text/plain',
    lastModified: Date.now(),
  } as unknown as File;

  return {
    isFile: true,
    isDirectory: false,
    name,
    fullPath: `/${name}`,
    filesystem: {} as FileSystem,
    file: (callback: FileCallback) => callback(mockFile),
    getParent: vi.fn(),
  } as unknown as FileSystemFileEntry;
}

function createMockFileSystemDirectoryEntry(
  name: string,
  entries: FileSystemEntry[]
): FileSystemDirectoryEntry {
  let readCalled = false;
  return {
    isFile: false,
    isDirectory: true,
    name,
    fullPath: `/${name}`,
    filesystem: {} as FileSystem,
    createReader: () => ({
      readEntries: (successCallback: FileSystemEntriesCallback) => {
        // First call returns entries, second call returns empty array
        if (!readCalled) {
          readCalled = true;
          successCallback(entries);
        } else {
          successCallback([]);
        }
      },
    }),
    getFile: vi.fn(),
    getDirectory: vi.fn(),
    getParent: vi.fn(),
  } as unknown as FileSystemDirectoryEntry;
}

describe('isDragDropSupported', () => {
  const originalDataTransferItem = globalThis.DataTransferItem;

  afterEach(() => {
    // Restore original
    if (originalDataTransferItem) {
      (globalThis as Record<string, unknown>).DataTransferItem = originalDataTransferItem;
    } else {
      delete (globalThis as Record<string, unknown>).DataTransferItem;
    }
  });

  it('returns true when webkitGetAsEntry is available', () => {
    // Mock DataTransferItem with webkitGetAsEntry
    (globalThis as Record<string, unknown>).DataTransferItem = class {
      webkitGetAsEntry() {
        return null;
      }
    };

    expect(isDragDropSupported()).toBe(true);
  });

  it('returns false when DataTransferItem is undefined', () => {
    delete (globalThis as Record<string, unknown>).DataTransferItem;
    expect(isDragDropSupported()).toBe(false);
  });

  it('returns false when webkitGetAsEntry is not available', () => {
    // Mock DataTransferItem without webkitGetAsEntry
    (globalThis as Record<string, unknown>).DataTransferItem = class {};

    expect(isDragDropSupported()).toBe(false);
  });
});

describe('readDroppedDirectory', () => {
  it('reads files from a flat directory', async () => {
    const file1 = createMockFileSystemFileEntry('file1.txt', 'content1');
    const file2 = createMockFileSystemFileEntry('file2.json', '{"key": "value"}');
    const rootDir = createMockFileSystemDirectoryEntry('root', [file1, file2]);

    const result = await readDroppedDirectory(rootDir);

    expect(result.rootName).toBe('root');
    expect(result.files.size).toBe(2);
    expect(result.files.get('file1.txt')).toBe('content1');
    expect(result.files.get('file2.json')).toBe('{"key": "value"}');
  });

  it('reads files from nested directories', async () => {
    const deepFile = createMockFileSystemFileEntry('deep.txt', 'deep content');
    const subDir = createMockFileSystemDirectoryEntry('subdir', [deepFile]);
    const rootFile = createMockFileSystemFileEntry('root.txt', 'root content');
    const rootDir = createMockFileSystemDirectoryEntry('root', [rootFile, subDir]);

    const result = await readDroppedDirectory(rootDir);

    expect(result.rootName).toBe('root');
    expect(result.files.size).toBe(2);
    expect(result.files.get('root.txt')).toBe('root content');
    expect(result.files.get('subdir/deep.txt')).toBe('deep content');
  });

  it('handles empty directories', async () => {
    const rootDir = createMockFileSystemDirectoryEntry('empty', []);

    const result = await readDroppedDirectory(rootDir);

    expect(result.rootName).toBe('empty');
    expect(result.files.size).toBe(0);
  });

  it('handles deeply nested directories', async () => {
    const deepFile = createMockFileSystemFileEntry('file.txt', 'content');
    const level3 = createMockFileSystemDirectoryEntry('level3', [deepFile]);
    const level2 = createMockFileSystemDirectoryEntry('level2', [level3]);
    const level1 = createMockFileSystemDirectoryEntry('level1', [level2]);
    const root = createMockFileSystemDirectoryEntry('root', [level1]);

    const result = await readDroppedDirectory(root);

    expect(result.rootName).toBe('root');
    expect(result.files.size).toBe(1);
    expect(result.files.get('level1/level2/level3/file.txt')).toBe('content');
  });
});

describe('getDirectoryFromDrop', () => {
  it('returns null when dataTransfer is undefined', () => {
    const event = { dataTransfer: undefined } as unknown as DragEvent;
    expect(getDirectoryFromDrop(event)).toBeNull();
  });

  it('returns null when items is empty', () => {
    const event = {
      dataTransfer: {
        items: { length: 0 },
      },
    } as unknown as DragEvent;
    expect(getDirectoryFromDrop(event)).toBeNull();
  });

  it('returns null when item is not a file', () => {
    const event = {
      dataTransfer: {
        items: {
          0: { kind: 'string' },
          length: 1,
        },
      },
    } as unknown as DragEvent;
    expect(getDirectoryFromDrop(event)).toBeNull();
  });

  it('returns null when webkitGetAsEntry returns null', () => {
    const event = {
      dataTransfer: {
        items: {
          0: { kind: 'file', webkitGetAsEntry: () => null },
          length: 1,
        },
      },
    } as unknown as DragEvent;
    expect(getDirectoryFromDrop(event)).toBeNull();
  });

  it('returns null when entry is a file, not a directory', () => {
    const fileEntry = createMockFileSystemFileEntry('file.txt', 'content');
    const event = {
      dataTransfer: {
        items: {
          0: { kind: 'file', webkitGetAsEntry: () => fileEntry },
          length: 1,
        },
      },
    } as unknown as DragEvent;
    expect(getDirectoryFromDrop(event)).toBeNull();
  });

  it('returns directory entry when valid directory is dropped', () => {
    const dirEntry = createMockFileSystemDirectoryEntry('folder', []);
    const event = {
      dataTransfer: {
        items: {
          0: { kind: 'file', webkitGetAsEntry: () => dirEntry },
          length: 1,
        },
      },
    } as unknown as DragEvent;
    expect(getDirectoryFromDrop(event)).toBe(dirEntry);
  });
});

describe('validateDirectoryDrop', () => {
  it('returns error when no items are dropped', () => {
    const event = { dataTransfer: { items: { length: 0 } } } as unknown as DragEvent;
    const result = validateDirectoryDrop(event);

    expect(result.isValid).toBe(false);
    if (!result.isValid) {
      expect(result.error).toBe('No items were dropped');
    }
  });

  it('returns error when multiple items are dropped', () => {
    const event = {
      dataTransfer: {
        items: {
          0: {},
          1: {},
          length: 2,
        },
      },
    } as unknown as DragEvent;
    const result = validateDirectoryDrop(event);

    expect(result.isValid).toBe(false);
    if (!result.isValid) {
      expect(result.error).toBe('Please drop only one folder at a time');
    }
  });

  it('returns error when a file is dropped instead of a folder', () => {
    const fileEntry = createMockFileSystemFileEntry('file.txt', 'content');
    const event = {
      dataTransfer: {
        items: {
          0: { kind: 'file', webkitGetAsEntry: () => fileEntry },
          length: 1,
        },
      },
    } as unknown as DragEvent;
    const result = validateDirectoryDrop(event);

    expect(result.isValid).toBe(false);
    if (!result.isValid) {
      expect(result.error).toBe('Please drop a folder, not a file');
    }
  });

  it('returns valid with entry when folder is dropped', () => {
    const dirEntry = createMockFileSystemDirectoryEntry('folder', []);
    const event = {
      dataTransfer: {
        items: {
          0: { kind: 'file', webkitGetAsEntry: () => dirEntry },
          length: 1,
        },
      },
    } as unknown as DragEvent;
    const result = validateDirectoryDrop(event);

    expect(result.isValid).toBe(true);
    if (result.isValid) {
      expect(result.entry).toBe(dirEntry);
    }
  });
});

// ============================================================================
// VirtualFileSystem Tests
// ============================================================================

describe('createFileSystemFromHandle', () => {
  it('reads file content from root directory', async () => {
    const file = createMockFileHandle('test.txt', 'Hello World');
    const root = createMockDirectoryHandle('root', new Map([['test.txt', file]]));

    const vfs: VirtualFileSystem = createFileSystemFromHandle(root);
    const content = await vfs.readFile(['test.txt']);

    expect(content).toBe('Hello World');
  });

  it('reads file content from nested directory', async () => {
    const deepFile = createMockFileHandle('data.json', '{"key": "value"}');
    const subDir = createMockDirectoryHandle('session', new Map([['data.json', deepFile]]));
    const root = createMockDirectoryHandle('root', new Map([['session', subDir]]));

    const vfs: VirtualFileSystem = createFileSystemFromHandle(root);
    const content = await vfs.readFile(['session', 'data.json']);

    expect(content).toBe('{"key": "value"}');
  });

  it('returns null for missing file', async () => {
    const root = createMockDirectoryHandle('root', new Map());

    const vfs: VirtualFileSystem = createFileSystemFromHandle(root);
    const content = await vfs.readFile(['nonexistent.txt']);

    expect(content).toBeNull();
  });

  it('returns null when trying to read directory as file', async () => {
    const subDir = createMockDirectoryHandle('subdir', new Map());
    const root = createMockDirectoryHandle('root', new Map([['subdir', subDir]]));

    const vfs: VirtualFileSystem = createFileSystemFromHandle(root);
    const content = await vfs.readFile(['subdir']);

    expect(content).toBeNull();
  });

  it('returns null for empty path (root)', async () => {
    const root = createMockDirectoryHandle('root', new Map());

    const vfs: VirtualFileSystem = createFileSystemFromHandle(root);
    const content = await vfs.readFile([]);

    expect(content).toBeNull();
  });

  it('lists entries in root directory', async () => {
    const file = createMockFileHandle('file.txt', 'content');
    const subDir = createMockDirectoryHandle('subdir', new Map());
    const root = createMockDirectoryHandle(
      'root',
      new Map<string, FileSystemHandle>([
        ['file.txt', file],
        ['subdir', subDir],
      ])
    );

    const vfs: VirtualFileSystem = createFileSystemFromHandle(root);
    const entries = await vfs.listDirectory([]);

    expect(entries).toHaveLength(2);
    expect(entries).toContain('file.txt');
    expect(entries).toContain('subdir');
  });

  it('lists entries in nested directory', async () => {
    const deepFile = createMockFileHandle('deep.txt', 'content');
    const subDir = createMockDirectoryHandle('subdir', new Map([['deep.txt', deepFile]]));
    const root = createMockDirectoryHandle('root', new Map([['subdir', subDir]]));

    const vfs: VirtualFileSystem = createFileSystemFromHandle(root);
    const entries = await vfs.listDirectory(['subdir']);

    expect(entries).toHaveLength(1);
    expect(entries).toContain('deep.txt');
  });

  it('returns empty array for missing directory', async () => {
    const root = createMockDirectoryHandle('root', new Map());

    const vfs: VirtualFileSystem = createFileSystemFromHandle(root);
    const entries = await vfs.listDirectory(['nonexistent']);

    expect(entries).toHaveLength(0);
  });

  it('returns empty array when listing a file', async () => {
    const file = createMockFileHandle('file.txt', 'content');
    const root = createMockDirectoryHandle('root', new Map([['file.txt', file]]));

    const vfs: VirtualFileSystem = createFileSystemFromHandle(root);
    const entries = await vfs.listDirectory(['file.txt']);

    expect(entries).toHaveLength(0);
  });

  it('checks existence of file', async () => {
    const file = createMockFileHandle('test.txt', 'content');
    const root = createMockDirectoryHandle('root', new Map([['test.txt', file]]));

    const vfs: VirtualFileSystem = createFileSystemFromHandle(root);

    expect(await vfs.exists(['test.txt'])).toBe(true);
    expect(await vfs.exists(['nonexistent.txt'])).toBe(false);
  });

  it('checks existence of directory', async () => {
    const subDir = createMockDirectoryHandle('subdir', new Map());
    const root = createMockDirectoryHandle('root', new Map([['subdir', subDir]]));

    const vfs: VirtualFileSystem = createFileSystemFromHandle(root);

    expect(await vfs.exists(['subdir'])).toBe(true);
    expect(await vfs.exists(['nonexistent'])).toBe(false);
  });

  it('exists returns true for root path', async () => {
    const root = createMockDirectoryHandle('root', new Map());

    const vfs: VirtualFileSystem = createFileSystemFromHandle(root);

    expect(await vfs.exists([])).toBe(true);
  });
});

describe('createFileSystemFromDropped', () => {
  it('reads file content', async () => {
    const files = new Map([['test.txt', 'Hello World']]);

    const vfs: VirtualFileSystem = createFileSystemFromDropped(files);
    const content = await vfs.readFile(['test.txt']);

    expect(content).toBe('Hello World');
  });

  it('reads file content from nested path', async () => {
    const files = new Map([['session/project1/data.json', '{"key": "value"}']]);

    const vfs: VirtualFileSystem = createFileSystemFromDropped(files);
    const content = await vfs.readFile(['session', 'project1', 'data.json']);

    expect(content).toBe('{"key": "value"}');
  });

  it('returns null for missing file', async () => {
    const files = new Map<string, string>();

    const vfs: VirtualFileSystem = createFileSystemFromDropped(files);
    const content = await vfs.readFile(['nonexistent.txt']);

    expect(content).toBeNull();
  });

  it('returns null for empty path (root)', async () => {
    const files = new Map([['file.txt', 'content']]);

    const vfs: VirtualFileSystem = createFileSystemFromDropped(files);
    const content = await vfs.readFile([]);

    expect(content).toBeNull();
  });

  it('lists entries in root directory', async () => {
    const files = new Map([
      ['file1.txt', 'content1'],
      ['file2.txt', 'content2'],
      ['subdir/nested.txt', 'nested content'],
    ]);

    const vfs: VirtualFileSystem = createFileSystemFromDropped(files);
    const entries = await vfs.listDirectory([]);

    expect(entries).toHaveLength(3);
    expect(entries).toContain('file1.txt');
    expect(entries).toContain('file2.txt');
    expect(entries).toContain('subdir');
  });

  it('lists entries in nested directory', async () => {
    const files = new Map([
      ['subdir/file1.txt', 'content1'],
      ['subdir/file2.txt', 'content2'],
      ['subdir/deep/nested.txt', 'nested'],
    ]);

    const vfs: VirtualFileSystem = createFileSystemFromDropped(files);
    const entries = await vfs.listDirectory(['subdir']);

    expect(entries).toHaveLength(3);
    expect(entries).toContain('file1.txt');
    expect(entries).toContain('file2.txt');
    expect(entries).toContain('deep');
  });

  it('returns empty array for missing directory', async () => {
    const files = new Map([['file.txt', 'content']]);

    const vfs: VirtualFileSystem = createFileSystemFromDropped(files);
    const entries = await vfs.listDirectory(['nonexistent']);

    expect(entries).toHaveLength(0);
  });

  it('returns empty array for file path (not directory)', async () => {
    const files = new Map([['file.txt', 'content']]);

    const vfs: VirtualFileSystem = createFileSystemFromDropped(files);
    const entries = await vfs.listDirectory(['file.txt']);

    expect(entries).toHaveLength(0);
  });

  it('checks existence of file', async () => {
    const files = new Map([['test.txt', 'content']]);

    const vfs: VirtualFileSystem = createFileSystemFromDropped(files);

    expect(await vfs.exists(['test.txt'])).toBe(true);
    expect(await vfs.exists(['nonexistent.txt'])).toBe(false);
  });

  it('checks existence of directory', async () => {
    const files = new Map([['subdir/file.txt', 'content']]);

    const vfs: VirtualFileSystem = createFileSystemFromDropped(files);

    expect(await vfs.exists(['subdir'])).toBe(true);
    expect(await vfs.exists(['nonexistent'])).toBe(false);
  });

  it('exists returns true for root path', async () => {
    const files = new Map([['file.txt', 'content']]);

    const vfs: VirtualFileSystem = createFileSystemFromDropped(files);

    expect(await vfs.exists([])).toBe(true);
  });

  it('checks existence of deeply nested directory', async () => {
    const files = new Map([['level1/level2/level3/file.txt', 'content']]);

    const vfs: VirtualFileSystem = createFileSystemFromDropped(files);

    expect(await vfs.exists(['level1'])).toBe(true);
    expect(await vfs.exists(['level1', 'level2'])).toBe(true);
    expect(await vfs.exists(['level1', 'level2', 'level3'])).toBe(true);
    expect(await vfs.exists(['level1', 'level2', 'level3', 'file.txt'])).toBe(true);
  });
});

describe('VirtualFileSystem API consistency', () => {
  // Tests that verify both implementations behave the same way

  it('both implementations return null for missing files', async () => {
    const handleRoot = createMockDirectoryHandle('root', new Map());
    const handleVfs = createFileSystemFromHandle(handleRoot);

    const droppedVfs = createFileSystemFromDropped(new Map());

    expect(await handleVfs.readFile(['missing.txt'])).toBeNull();
    expect(await droppedVfs.readFile(['missing.txt'])).toBeNull();
  });

  it('both implementations return empty array for missing directories', async () => {
    const handleRoot = createMockDirectoryHandle('root', new Map());
    const handleVfs = createFileSystemFromHandle(handleRoot);

    const droppedVfs = createFileSystemFromDropped(new Map());

    expect(await handleVfs.listDirectory(['missing'])).toEqual([]);
    expect(await droppedVfs.listDirectory(['missing'])).toEqual([]);
  });

  it('both implementations return true for root existence', async () => {
    const handleRoot = createMockDirectoryHandle('root', new Map());
    const handleVfs = createFileSystemFromHandle(handleRoot);

    const droppedVfs = createFileSystemFromDropped(new Map());

    expect(await handleVfs.exists([])).toBe(true);
    expect(await droppedVfs.exists([])).toBe(true);
  });

  it('both implementations return empty array when listing a file path', async () => {
    // Handle-based
    const file = createMockFileHandle('test.txt', 'content');
    const handleRoot = createMockDirectoryHandle('root', new Map([['test.txt', file]]));
    const handleVfs = createFileSystemFromHandle(handleRoot);

    // Dropped-based
    const droppedVfs = createFileSystemFromDropped(new Map([['test.txt', 'content']]));

    expect(await handleVfs.listDirectory(['test.txt'])).toEqual([]);
    expect(await droppedVfs.listDirectory(['test.txt'])).toEqual([]);
  });
});

describe('createFileSystemFromDropped edge cases', () => {
  it('returns empty array when file path conflicts with directory lookup', async () => {
    // This tests the edge case where a path is both a file and could be treated as a directory
    // The implementation should treat it as a file (return empty for listDirectory)
    const files = new Map([
      ['a', 'file content'],
      ['a/b', 'nested content'], // This is technically inconsistent input
    ]);

    const vfs = createFileSystemFromDropped(files);

    // 'a' is a file, so listDirectory should return empty
    expect(await vfs.listDirectory(['a'])).toEqual([]);

    // But 'a' exists as a file
    expect(await vfs.exists(['a'])).toBe(true);
    expect(await vfs.readFile(['a'])).toBe('file content');
  });

  it('handles paths with special characters in segment names', async () => {
    const files = new Map([
      ['folder with spaces/file.txt', 'content1'],
      ['folder-with-dashes/file.txt', 'content2'],
      ['folder_with_underscores/file.txt', 'content3'],
    ]);

    const vfs = createFileSystemFromDropped(files);

    expect(await vfs.exists(['folder with spaces'])).toBe(true);
    expect(await vfs.readFile(['folder with spaces', 'file.txt'])).toBe('content1');
    expect(await vfs.listDirectory([])).toContain('folder with spaces');
  });

  it('handles empty files map correctly', async () => {
    const vfs = createFileSystemFromDropped(new Map());

    expect(await vfs.exists([])).toBe(true); // Root always exists
    expect(await vfs.listDirectory([])).toEqual([]);
    expect(await vfs.readFile(['anything'])).toBeNull();
  });

  it('does not confuse similar directory names', async () => {
    const files = new Map([
      ['abc/file.txt', 'content1'],
      ['ab/file.txt', 'content2'],
    ]);

    const vfs = createFileSystemFromDropped(files);

    // 'ab' should only list its own children, not 'abc' children
    const abEntries = await vfs.listDirectory(['ab']);
    expect(abEntries).toEqual(['file.txt']);
    expect(abEntries).not.toContain('c'); // Should not contain parts of 'abc'
  });
});
