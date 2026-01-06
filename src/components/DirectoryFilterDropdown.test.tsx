import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DirectoryFilterDropdown, type DirectoryOption } from './DirectoryFilterDropdown';

describe('DirectoryFilterDropdown', () => {
  const mockDirectories: DirectoryOption[] = [
    { path: '/Users/test/projects/opencode', name: 'opencode', sessionCount: 5 },
    { path: '/Users/test/projects/other-project', name: 'other-project', sessionCount: 3 },
    { path: '/Users/test/projects/my-app', name: 'my-app', sessionCount: 2 },
  ];

  describe('rendering', () => {
    it('renders with "All directories" when nothing is selected', () => {
      render(
        <DirectoryFilterDropdown
          directories={mockDirectories}
          selected={null}
          onChange={vi.fn()}
        />
      );

      expect(screen.getByText('All directories')).toBeInTheDocument();
      expect(screen.getByText('10')).toBeInTheDocument(); // Total sessions
    });

    it('renders the selected directory name when a directory is selected', () => {
      render(
        <DirectoryFilterDropdown
          directories={mockDirectories}
          selected="/Users/test/projects/opencode"
          onChange={vi.fn()}
        />
      );

      expect(screen.getByText('opencode')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument(); // Session count for opencode
    });

    it('has accessible label', () => {
      render(
        <DirectoryFilterDropdown
          directories={mockDirectories}
          selected={null}
          onChange={vi.fn()}
        />
      );

      expect(screen.getByRole('button', { name: 'Filter by directory' })).toBeInTheDocument();
    });
  });

  describe('dropdown behavior', () => {
    it('opens dropdown when clicking the button', () => {
      render(
        <DirectoryFilterDropdown
          directories={mockDirectories}
          selected={null}
          onChange={vi.fn()}
        />
      );

      const button = screen.getByRole('button', { name: 'Filter by directory' });
      expect(button).toHaveAttribute('aria-expanded', 'false');

      fireEvent.click(button);

      expect(button).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    it('shows all directory options in the dropdown', () => {
      render(
        <DirectoryFilterDropdown
          directories={mockDirectories}
          selected={null}
          onChange={vi.fn()}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: 'Filter by directory' }));

      // All directories option
      expect(screen.getAllByText('All directories')).toHaveLength(2); // Button and dropdown
      
      // Individual directories
      expect(screen.getByRole('option', { name: /opencode/ })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /other-project/ })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /my-app/ })).toBeInTheDocument();
    });

    it('shows session counts for each directory', () => {
      render(
        <DirectoryFilterDropdown
          directories={mockDirectories}
          selected={null}
          onChange={vi.fn()}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: 'Filter by directory' }));

      // Check counts are displayed (button shows 10, dropdown also shows 10 for All)
      expect(screen.getAllByText('10')).toHaveLength(2);
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('closes dropdown when clicking outside', () => {
      render(
        <div>
          <DirectoryFilterDropdown
            directories={mockDirectories}
            selected={null}
            onChange={vi.fn()}
          />
          <div data-testid="outside">Outside</div>
        </div>
      );

      fireEvent.click(screen.getByRole('button', { name: 'Filter by directory' }));
      expect(screen.getByRole('listbox')).toBeInTheDocument();

      fireEvent.pointerDown(screen.getByTestId('outside'));
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('closes dropdown when pressing Escape', () => {
      render(
        <DirectoryFilterDropdown
          directories={mockDirectories}
          selected={null}
          onChange={vi.fn()}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: 'Filter by directory' }));
      expect(screen.getByRole('listbox')).toBeInTheDocument();

      fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Escape' });
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });

  describe('keyboard navigation', () => {
    it('navigates down with ArrowDown', () => {
      render(
        <DirectoryFilterDropdown
          directories={mockDirectories}
          selected={null}
          onChange={vi.fn()}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: 'Filter by directory' }));
      const options = screen.getAllByRole('option');
      
      // First option should have tabIndex 0 (focused)
      expect(options[0]).toHaveAttribute('tabIndex', '0');
      expect(options[1]).toHaveAttribute('tabIndex', '-1');

      // Navigate down
      fireEvent.keyDown(screen.getByRole('listbox'), { key: 'ArrowDown' });
      
      // Second option should now be focused
      expect(options[0]).toHaveAttribute('tabIndex', '-1');
      expect(options[1]).toHaveAttribute('tabIndex', '0');
    });

    it('navigates up with ArrowUp', () => {
      render(
        <DirectoryFilterDropdown
          directories={mockDirectories}
          selected={null}
          onChange={vi.fn()}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: 'Filter by directory' }));
      const options = screen.getAllByRole('option');
      
      // Navigate down first, then up
      fireEvent.keyDown(screen.getByRole('listbox'), { key: 'ArrowDown' });
      fireEvent.keyDown(screen.getByRole('listbox'), { key: 'ArrowUp' });
      
      // First option should be focused again
      expect(options[0]).toHaveAttribute('tabIndex', '0');
      expect(options[1]).toHaveAttribute('tabIndex', '-1');
    });

    it('navigates to end with End key', () => {
      render(
        <DirectoryFilterDropdown
          directories={mockDirectories}
          selected={null}
          onChange={vi.fn()}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: 'Filter by directory' }));
      const options = screen.getAllByRole('option');
      
      fireEvent.keyDown(screen.getByRole('listbox'), { key: 'End' });
      
      // Last option should be focused
      expect(options[options.length - 1]).toHaveAttribute('tabIndex', '0');
      expect(options[0]).toHaveAttribute('tabIndex', '-1');
    });

    it('navigates to start with Home key', () => {
      render(
        <DirectoryFilterDropdown
          directories={mockDirectories}
          selected={null}
          onChange={vi.fn()}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: 'Filter by directory' }));
      const options = screen.getAllByRole('option');
      
      // Navigate to end first
      fireEvent.keyDown(screen.getByRole('listbox'), { key: 'End' });
      // Then to start
      fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Home' });
      
      // First option should be focused
      expect(options[0]).toHaveAttribute('tabIndex', '0');
      expect(options[options.length - 1]).toHaveAttribute('tabIndex', '-1');
    });

    it('selects option with Enter key', () => {
      const onChange = vi.fn();
      render(
        <DirectoryFilterDropdown
          directories={mockDirectories}
          selected={null}
          onChange={onChange}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: 'Filter by directory' }));
      
      // Navigate to second option (first directory)
      fireEvent.keyDown(screen.getByRole('listbox'), { key: 'ArrowDown' });
      // Select with Enter
      fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Enter' });
      
      expect(onChange).toHaveBeenCalledWith('/Users/test/projects/opencode');
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('selects option with Space key', () => {
      const onChange = vi.fn();
      render(
        <DirectoryFilterDropdown
          directories={mockDirectories}
          selected={null}
          onChange={onChange}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: 'Filter by directory' }));
      
      // Navigate to second option (first directory)
      fireEvent.keyDown(screen.getByRole('listbox'), { key: 'ArrowDown' });
      // Select with Space
      fireEvent.keyDown(screen.getByRole('listbox'), { key: ' ' });
      
      expect(onChange).toHaveBeenCalledWith('/Users/test/projects/opencode');
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('wraps around when navigating past the end', () => {
      render(
        <DirectoryFilterDropdown
          directories={mockDirectories}
          selected={null}
          onChange={vi.fn()}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: 'Filter by directory' }));
      const options = screen.getAllByRole('option');
      
      // Navigate to end
      fireEvent.keyDown(screen.getByRole('listbox'), { key: 'End' });
      // Navigate one more down to wrap
      fireEvent.keyDown(screen.getByRole('listbox'), { key: 'ArrowDown' });
      
      // Should wrap to first option
      expect(options[0]).toHaveAttribute('tabIndex', '0');
    });

    it('uses roving tabindex pattern', () => {
      render(
        <DirectoryFilterDropdown
          directories={mockDirectories}
          selected={null}
          onChange={vi.fn()}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: 'Filter by directory' }));
      const options = screen.getAllByRole('option');
      
      // Only one option should have tabIndex 0 at a time
      const focusableOptions = options.filter(opt => opt.getAttribute('tabIndex') === '0');
      expect(focusableOptions).toHaveLength(1);
      
      // All others should have tabIndex -1
      const nonFocusableOptions = options.filter(opt => opt.getAttribute('tabIndex') === '-1');
      expect(nonFocusableOptions).toHaveLength(options.length - 1);
    });
  });

  describe('selection', () => {
    it('calls onChange with directory path when selecting a directory', () => {
      const onChange = vi.fn();
      render(
        <DirectoryFilterDropdown
          directories={mockDirectories}
          selected={null}
          onChange={onChange}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: 'Filter by directory' }));
      fireEvent.click(screen.getByRole('option', { name: /opencode/ }));

      expect(onChange).toHaveBeenCalledWith('/Users/test/projects/opencode');
    });

    it('calls onChange with null when selecting "All directories"', () => {
      const onChange = vi.fn();
      render(
        <DirectoryFilterDropdown
          directories={mockDirectories}
          selected="/Users/test/projects/opencode"
          onChange={onChange}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: 'Filter by directory' }));
      fireEvent.click(screen.getByRole('option', { name: /All directories/ }));

      expect(onChange).toHaveBeenCalledWith(null);
    });

    it('closes dropdown after selection', () => {
      render(
        <DirectoryFilterDropdown
          directories={mockDirectories}
          selected={null}
          onChange={vi.fn()}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: 'Filter by directory' }));
      fireEvent.click(screen.getByRole('option', { name: /opencode/ }));

      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('marks selected option with aria-selected', () => {
      render(
        <DirectoryFilterDropdown
          directories={mockDirectories}
          selected="/Users/test/projects/opencode"
          onChange={vi.fn()}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: 'Filter by directory' }));

      const opencodeOption = screen.getByRole('option', { name: /opencode/ });
      const otherOption = screen.getByRole('option', { name: /other-project/ });
      const allOption = screen.getByRole('option', { name: /All directories/ });

      expect(opencodeOption).toHaveAttribute('aria-selected', 'true');
      expect(otherOption).toHaveAttribute('aria-selected', 'false');
      expect(allOption).toHaveAttribute('aria-selected', 'false');
    });
  });

  describe('tooltips', () => {
    it('shows full path as tooltip on selected directory', () => {
      render(
        <DirectoryFilterDropdown
          directories={mockDirectories}
          selected="/Users/test/projects/opencode"
          onChange={vi.fn()}
        />
      );

      const displaySpan = screen.getByText('opencode');
      expect(displaySpan).toHaveAttribute('title', '/Users/test/projects/opencode');
    });

    it('shows "All directories" as tooltip when nothing is selected', () => {
      render(
        <DirectoryFilterDropdown
          directories={mockDirectories}
          selected={null}
          onChange={vi.fn()}
        />
      );

      const displaySpan = screen.getByText('All directories');
      expect(displaySpan).toHaveAttribute('title', 'All directories');
    });

    it('shows full path as tooltip on dropdown options', () => {
      render(
        <DirectoryFilterDropdown
          directories={mockDirectories}
          selected={null}
          onChange={vi.fn()}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: 'Filter by directory' }));

      const opencodeOption = screen.getByRole('option', { name: /opencode/ });
      expect(opencodeOption).toHaveAttribute('title', '/Users/test/projects/opencode');
    });
  });

  describe('empty state', () => {
    it('renders with empty directories list', () => {
      render(
        <DirectoryFilterDropdown
          directories={[]}
          selected={null}
          onChange={vi.fn()}
        />
      );

      expect(screen.getByText('All directories')).toBeInTheDocument();
      expect(screen.getByText('0')).toBeInTheDocument(); // Zero sessions
    });

    it('shows only "All directories" option when directory list is empty', () => {
      render(
        <DirectoryFilterDropdown
          directories={[]}
          selected={null}
          onChange={vi.fn()}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: 'Filter by directory' }));

      const options = screen.getAllByRole('option');
      expect(options).toHaveLength(1);
      expect(options[0]).toHaveTextContent('All directories');
    });
  });
});
