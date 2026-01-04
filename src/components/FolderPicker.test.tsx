import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { FolderPicker } from './FolderPicker';
import * as fileSystem from '../lib/fileSystem';
import * as sessionLoader from '../lib/sessionLoader';
import { useSessionStore } from '../store/sessionStore';

// Mock the file system module
vi.mock('../lib/fileSystem', async () => {
  const actual = await vi.importActual<typeof fileSystem>('../lib/fileSystem');
  return {
    ...actual,
    isFileSystemAccessSupported: vi.fn(),
    openDirectoryPicker: vi.fn(),
    createFileSystemFromHandle: vi.fn(),
    createFileSystemFromDropped: vi.fn(),
  };
});

// Mock the session loader
vi.mock('../lib/sessionLoader', () => ({
  loadAllSessions: vi.fn(),
}));

describe('FolderPicker', () => {
  const mockSetFileSystem = vi.fn();
  const mockSetProjects = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset the store before each test
    useSessionStore.setState({
      fileSystem: null,
      projects: [],
      sessionTree: [],
      allSessions: {},
    });

    // Spy on store methods
    const originalState = useSessionStore.getState();
    useSessionStore.setState({
      ...originalState,
      setFileSystem: mockSetFileSystem,
      setProjects: mockSetProjects,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders title and instructions', () => {
    vi.mocked(fileSystem.isFileSystemAccessSupported).mockReturnValue(false);

    render(<FolderPicker />);

    expect(screen.getByText('Open Sessions Folder')).toBeInTheDocument();
    expect(
      screen.getByText('Browse your OpenCode sessions by opening your storage folder:')
    ).toBeInTheDocument();
    expect(screen.getByText('~/.local/share/opencode/storage/')).toBeInTheDocument();
  });

  it('shows Browse Folder button when File System Access API is supported', () => {
    vi.mocked(fileSystem.isFileSystemAccessSupported).mockReturnValue(true);

    render(<FolderPicker />);

    expect(screen.getByRole('button', { name: 'Browse Folder' })).toBeInTheDocument();
  });

  it('hides Browse Folder button when File System Access API is not supported', () => {
    vi.mocked(fileSystem.isFileSystemAccessSupported).mockReturnValue(false);

    render(<FolderPicker />);

    expect(screen.queryByRole('button', { name: 'Browse Folder' })).not.toBeInTheDocument();
  });

  it('shows drop zone content', () => {
    vi.mocked(fileSystem.isFileSystemAccessSupported).mockReturnValue(false);

    render(<FolderPicker />);

    expect(screen.getByText('Drop folder here')).toBeInTheDocument();
  });

  it('shows browser compatibility note', () => {
    vi.mocked(fileSystem.isFileSystemAccessSupported).mockReturnValue(false);

    render(<FolderPicker />);

    expect(screen.getByText('Works in Chrome, Edge, Firefox, Safari')).toBeInTheDocument();
  });

  it('calls openDirectoryPicker when Browse Folder button is clicked', async () => {
    vi.mocked(fileSystem.isFileSystemAccessSupported).mockReturnValue(true);

    const mockHandle = {} as FileSystemDirectoryHandle;
    vi.mocked(fileSystem.openDirectoryPicker).mockResolvedValue(mockHandle);

    const mockFs = {
      readFile: vi.fn(),
      listDirectory: vi.fn(),
      exists: vi.fn(),
    };
    vi.mocked(fileSystem.createFileSystemFromHandle).mockReturnValue(mockFs);
    vi.mocked(sessionLoader.loadAllSessions).mockResolvedValue({
      projects: [{ id: 'proj1', path: '/path', sessions: [] }],
      sessions: {},
      errorCount: 0,
    });

    render(<FolderPicker />);

    const browseButton = screen.getByRole('button', { name: 'Browse Folder' });
    fireEvent.click(browseButton);

    await waitFor(() => {
      expect(fileSystem.openDirectoryPicker).toHaveBeenCalled();
    });
  });

  it('shows loading state while loading sessions', async () => {
    vi.mocked(fileSystem.isFileSystemAccessSupported).mockReturnValue(true);

    const mockHandle = {} as FileSystemDirectoryHandle;
    vi.mocked(fileSystem.openDirectoryPicker).mockResolvedValue(mockHandle);

    const mockFs = {
      readFile: vi.fn(),
      listDirectory: vi.fn(),
      exists: vi.fn(),
    };
    vi.mocked(fileSystem.createFileSystemFromHandle).mockReturnValue(mockFs);

    // Create a promise that we can control
    let resolveLoadSessions: (value: sessionLoader.LoadSessionsResult) => void;
    const loadSessionsPromise = new Promise<sessionLoader.LoadSessionsResult>((resolve) => {
      resolveLoadSessions = resolve;
    });
    vi.mocked(sessionLoader.loadAllSessions).mockReturnValue(loadSessionsPromise);

    render(<FolderPicker />);

    const browseButton = screen.getByRole('button', { name: 'Browse Folder' });
    fireEvent.click(browseButton);

    // Wait for loading state to appear
    await waitFor(() => {
      expect(screen.getByText('Loading sessions...')).toBeInTheDocument();
    });

    // Resolve the loading
    resolveLoadSessions!({
      projects: [{ id: 'proj1', path: '/path', sessions: [] }],
      sessions: {},
      errorCount: 0,
    });

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading sessions...')).not.toBeInTheDocument();
    });
  });

  it('shows error when no sessions are found', async () => {
    vi.mocked(fileSystem.isFileSystemAccessSupported).mockReturnValue(true);

    const mockHandle = {} as FileSystemDirectoryHandle;
    vi.mocked(fileSystem.openDirectoryPicker).mockResolvedValue(mockHandle);

    const mockFs = {
      readFile: vi.fn(),
      listDirectory: vi.fn(),
      exists: vi.fn(),
    };
    vi.mocked(fileSystem.createFileSystemFromHandle).mockReturnValue(mockFs);
    vi.mocked(sessionLoader.loadAllSessions).mockResolvedValue({
      projects: [],
      sessions: {},
      errorCount: 0,
    });

    render(<FolderPicker />);

    const browseButton = screen.getByRole('button', { name: 'Browse Folder' });
    fireEvent.click(browseButton);

    await waitFor(() => {
      expect(
        screen.getByText(/No sessions found/i)
      ).toBeInTheDocument();
    });
  });

  it('calls setFileSystem and setProjects on successful load', async () => {
    vi.mocked(fileSystem.isFileSystemAccessSupported).mockReturnValue(true);

    const mockHandle = {} as FileSystemDirectoryHandle;
    vi.mocked(fileSystem.openDirectoryPicker).mockResolvedValue(mockHandle);

    const mockFs = {
      readFile: vi.fn(),
      listDirectory: vi.fn(),
      exists: vi.fn(),
    };
    vi.mocked(fileSystem.createFileSystemFromHandle).mockReturnValue(mockFs);

    const mockProjects = [{ id: 'proj1', path: '/path', sessions: [] }];
    vi.mocked(sessionLoader.loadAllSessions).mockResolvedValue({
      projects: mockProjects,
      sessions: {},
      errorCount: 0,
    });

    render(<FolderPicker />);

    const browseButton = screen.getByRole('button', { name: 'Browse Folder' });
    fireEvent.click(browseButton);

    await waitFor(() => {
      expect(mockSetFileSystem).toHaveBeenCalledWith(mockFs);
      expect(mockSetProjects).toHaveBeenCalledWith(mockProjects);
    });
  });

  it('shows error when openDirectoryPicker fails', async () => {
    vi.mocked(fileSystem.isFileSystemAccessSupported).mockReturnValue(true);
    vi.mocked(fileSystem.openDirectoryPicker).mockRejectedValue(
      new fileSystem.FileSystemError('Access denied', 'NOT_FOUND')
    );

    render(<FolderPicker />);

    const browseButton = screen.getByRole('button', { name: 'Browse Folder' });
    fireEvent.click(browseButton);

    await waitFor(() => {
      expect(screen.getByText('Access denied')).toBeInTheDocument();
    });
  });

  it('does not show error when user cancels directory picker', async () => {
    vi.mocked(fileSystem.isFileSystemAccessSupported).mockReturnValue(true);
    vi.mocked(fileSystem.openDirectoryPicker).mockRejectedValue(
      new fileSystem.FileSystemError('User cancelled', 'PERMISSION_DENIED')
    );

    render(<FolderPicker />);

    const browseButton = screen.getByRole('button', { name: 'Browse Folder' });
    fireEvent.click(browseButton);

    // Wait a bit to ensure the error handling completes
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Should not show the error message (user cancellation is not an error)
    expect(screen.queryByText('User cancelled')).not.toBeInTheDocument();
  });

  it('handles folder drop correctly', async () => {
    vi.mocked(fileSystem.isFileSystemAccessSupported).mockReturnValue(false);

    const mockFs = {
      readFile: vi.fn(),
      listDirectory: vi.fn(),
      exists: vi.fn(),
    };
    vi.mocked(fileSystem.createFileSystemFromDropped).mockReturnValue(mockFs);

    const mockProjects = [{ id: 'proj1', path: '/path', sessions: [] }];
    vi.mocked(sessionLoader.loadAllSessions).mockResolvedValue({
      projects: mockProjects,
      sessions: {},
      errorCount: 0,
    });

    render(<FolderPicker />);

    // Find the drop zone
    const dropZone = screen.getByText('Drop folder here').closest('div')!.parentElement!;

    // Create a mock directory entry
    const mockDirEntry = {
      isFile: false,
      isDirectory: true,
      name: 'storage',
      createReader: () => ({
        readEntries: (callback: (entries: FileSystemEntry[]) => void) => callback([]),
      }),
    };

    const mockDataTransfer = {
      items: {
        0: {
          kind: 'file',
          webkitGetAsEntry: () => mockDirEntry,
        },
        length: 1,
      },
    };

    fireEvent.drop(dropZone, { dataTransfer: mockDataTransfer });

    await waitFor(() => {
      expect(fileSystem.createFileSystemFromDropped).toHaveBeenCalled();
      expect(mockSetFileSystem).toHaveBeenCalledWith(mockFs);
      expect(mockSetProjects).toHaveBeenCalledWith(mockProjects);
    });
  });

  it('shows error from loadAllSessions failure', async () => {
    vi.mocked(fileSystem.isFileSystemAccessSupported).mockReturnValue(true);

    const mockHandle = {} as FileSystemDirectoryHandle;
    vi.mocked(fileSystem.openDirectoryPicker).mockResolvedValue(mockHandle);

    const mockFs = {
      readFile: vi.fn(),
      listDirectory: vi.fn(),
      exists: vi.fn(),
    };
    vi.mocked(fileSystem.createFileSystemFromHandle).mockReturnValue(mockFs);
    vi.mocked(sessionLoader.loadAllSessions).mockRejectedValue(
      new Error('Failed to read directory')
    );

    render(<FolderPicker />);

    const browseButton = screen.getByRole('button', { name: 'Browse Folder' });
    fireEvent.click(browseButton);

    await waitFor(() => {
      expect(screen.getByText('Failed to read directory')).toBeInTheDocument();
    });
  });
});
