import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { FolderDropZone } from './FolderDropZone';

describe('FolderDropZone', () => {
  it('renders default content', () => {
    render(<FolderDropZone onFolderDropped={vi.fn()} />);

    expect(screen.getByText('Drag and drop a folder')).toBeInTheDocument();
    expect(
      screen.getByText('Drop your OpenCode storage folder here to browse sessions')
    ).toBeInTheDocument();
  });

  it('renders custom children when provided', () => {
    render(
      <FolderDropZone onFolderDropped={vi.fn()}>
        <div>Custom content</div>
      </FolderDropZone>
    );

    expect(screen.getByText('Custom content')).toBeInTheDocument();
    expect(screen.queryByText('Drag and drop a folder')).not.toBeInTheDocument();
  });

  it('shows loading state when isLoading is true', () => {
    render(<FolderDropZone onFolderDropped={vi.fn()} isLoading={true} />);

    expect(screen.getByText('Reading folder contents...')).toBeInTheDocument();
  });

  it('shows drag over state on drag enter', () => {
    render(<FolderDropZone onFolderDropped={vi.fn()} />);

    const dropZone = screen.getByTestId('folder-drop-zone');

    fireEvent.dragEnter(dropZone);

    expect(screen.getByText('Drop folder here')).toBeInTheDocument();
  });

  it('shows error when file is dropped instead of folder', async () => {
    const onError = vi.fn();
    render(<FolderDropZone onFolderDropped={vi.fn()} onError={onError} />);

    const dropZone = screen.getByTestId('folder-drop-zone');

    // Create a mock file entry (not a directory)
    const mockFileEntry = {
      isFile: true,
      isDirectory: false,
      name: 'file.txt',
    };

    const mockDataTransfer = {
      items: {
        0: {
          kind: 'file',
          webkitGetAsEntry: () => mockFileEntry,
        },
        length: 1,
      },
    };

    fireEvent.drop(dropZone, { dataTransfer: mockDataTransfer });

    // Should show error message
    expect(await screen.findByText('Please drop a folder, not a file')).toBeInTheDocument();
    expect(onError).toHaveBeenCalledWith('Please drop a folder, not a file');
  });

  it('shows error when nothing is dropped', async () => {
    const onError = vi.fn();
    render(<FolderDropZone onFolderDropped={vi.fn()} onError={onError} />);

    const dropZone = screen.getByTestId('folder-drop-zone');

    const mockDataTransfer = {
      items: {
        length: 0,
      },
    };

    fireEvent.drop(dropZone, { dataTransfer: mockDataTransfer });

    expect(await screen.findByText('No items were dropped')).toBeInTheDocument();
    expect(onError).toHaveBeenCalledWith('No items were dropped');
  });

  it('clears error on new drag enter', async () => {
    const onError = vi.fn();
    render(<FolderDropZone onFolderDropped={vi.fn()} onError={onError} />);

    const dropZone = screen.getByTestId('folder-drop-zone');

    // First, create an error state
    const mockDataTransfer = {
      items: {
        length: 0,
      },
    };
    fireEvent.drop(dropZone, { dataTransfer: mockDataTransfer });

    // Should have error
    expect(await screen.findByText('No items were dropped')).toBeInTheDocument();

    // Now drag enter should clear the error
    fireEvent.dragEnter(dropZone);

    expect(screen.queryByText('No items were dropped')).not.toBeInTheDocument();
    expect(screen.getByText('Drop folder here')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(
      <FolderDropZone onFolderDropped={vi.fn()} className="custom-class" />
    );

    const dropZone = screen.getByTestId('folder-drop-zone');
    expect(dropZone).toHaveClass('custom-class');
  });
});
