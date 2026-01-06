import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSidebarPreferences } from './useSidebarPreferences';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('useSidebarPreferences', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it('returns default values when no preferences are stored', () => {
    const { result } = renderHook(() => useSidebarPreferences());

    expect(result.current.width).toBe(288);
    expect(result.current.groupingMode).toBe('directory');
    expect(result.current.selectedDirectory).toBe(null);
    expect(result.current.minWidth).toBe(200);
    expect(result.current.maxWidth).toBe(500);
  });

  it('loads stored preferences from localStorage', () => {
    localStorageMock.setItem('sidebar-preferences', JSON.stringify({
      width: 350,
      groupingMode: 'date',
    }));

    const { result } = renderHook(() => useSidebarPreferences());

    expect(result.current.width).toBe(350);
    expect(result.current.groupingMode).toBe('date');
  });

  it('clamps width to min/max bounds when loading from localStorage', () => {
    localStorageMock.setItem('sidebar-preferences', JSON.stringify({
      width: 100, // Below min
      groupingMode: 'directory',
    }));

    const { result } = renderHook(() => useSidebarPreferences());

    expect(result.current.width).toBe(200); // Clamped to min
  });

  it('clamps width above max to max', () => {
    localStorageMock.setItem('sidebar-preferences', JSON.stringify({
      width: 1000, // Above max
      groupingMode: 'directory',
    }));

    const { result } = renderHook(() => useSidebarPreferences());

    expect(result.current.width).toBe(500); // Clamped to max
  });

  it('uses defaults for invalid JSON in localStorage', () => {
    localStorageMock.setItem('sidebar-preferences', 'not valid json');

    const { result } = renderHook(() => useSidebarPreferences());

    expect(result.current.width).toBe(288);
    expect(result.current.groupingMode).toBe('directory');
  });

  it('setWidth updates width and saves to localStorage', () => {
    const { result } = renderHook(() => useSidebarPreferences());

    act(() => {
      result.current.setWidth(400);
    });

    expect(result.current.width).toBe(400);
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'sidebar-preferences',
      expect.stringContaining('"width":400')
    );
  });

  it('setWidth clamps value to bounds', () => {
    const { result } = renderHook(() => useSidebarPreferences());

    act(() => {
      result.current.setWidth(50); // Below min
    });

    expect(result.current.width).toBe(200);

    act(() => {
      result.current.setWidth(1000); // Above max
    });

    expect(result.current.width).toBe(500);
  });

  it('setGroupingMode updates mode and saves to localStorage', () => {
    const { result } = renderHook(() => useSidebarPreferences());

    act(() => {
      result.current.setGroupingMode('date');
    });

    expect(result.current.groupingMode).toBe('date');
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'sidebar-preferences',
      expect.stringContaining('"groupingMode":"date"')
    );
  });

  it('preserves other preferences when updating one', () => {
    const { result } = renderHook(() => useSidebarPreferences());

    act(() => {
      result.current.setWidth(350);
    });

    act(() => {
      result.current.setGroupingMode('date');
    });

    // Width should still be 350
    expect(result.current.width).toBe(350);
    expect(result.current.groupingMode).toBe('date');
  });

  it('defaults invalid groupingMode to directory', () => {
    localStorageMock.setItem('sidebar-preferences', JSON.stringify({
      width: 300,
      groupingMode: 'invalid',
    }));

    const { result } = renderHook(() => useSidebarPreferences());

    expect(result.current.groupingMode).toBe('directory');
  });

  describe('selectedDirectory', () => {
    it('returns null when no selectedDirectory is stored', () => {
      const { result } = renderHook(() => useSidebarPreferences());

      expect(result.current.selectedDirectory).toBe(null);
    });

    it('loads stored selectedDirectory from localStorage', () => {
      localStorageMock.setItem('sidebar-preferences', JSON.stringify({
        width: 288,
        groupingMode: 'directory',
        selectedDirectory: '/Users/test/projects/myapp',
      }));

      const { result } = renderHook(() => useSidebarPreferences());

      expect(result.current.selectedDirectory).toBe('/Users/test/projects/myapp');
    });

    it('setSelectedDirectory updates value and saves to localStorage', () => {
      const { result } = renderHook(() => useSidebarPreferences());

      act(() => {
        result.current.setSelectedDirectory('/Users/test/projects/newdir');
      });

      expect(result.current.selectedDirectory).toBe('/Users/test/projects/newdir');
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'sidebar-preferences',
        expect.stringContaining('"/Users/test/projects/newdir"')
      );
    });

    it('setSelectedDirectory can set to null', () => {
      localStorageMock.setItem('sidebar-preferences', JSON.stringify({
        width: 288,
        groupingMode: 'directory',
        selectedDirectory: '/Users/test/projects/myapp',
      }));

      const { result } = renderHook(() => useSidebarPreferences());

      expect(result.current.selectedDirectory).toBe('/Users/test/projects/myapp');

      act(() => {
        result.current.setSelectedDirectory(null);
      });

      expect(result.current.selectedDirectory).toBe(null);
    });

    it('preserves other preferences when updating selectedDirectory', () => {
      const { result } = renderHook(() => useSidebarPreferences());

      act(() => {
        result.current.setWidth(350);
      });

      act(() => {
        result.current.setGroupingMode('date');
      });

      act(() => {
        result.current.setSelectedDirectory('/Users/test/mydir');
      });

      expect(result.current.width).toBe(350);
      expect(result.current.groupingMode).toBe('date');
      expect(result.current.selectedDirectory).toBe('/Users/test/mydir');
    });

    it('defaults non-string selectedDirectory to null', () => {
      localStorageMock.setItem('sidebar-preferences', JSON.stringify({
        width: 300,
        groupingMode: 'directory',
        selectedDirectory: 123, // Invalid type
      }));

      const { result } = renderHook(() => useSidebarPreferences());

      expect(result.current.selectedDirectory).toBe(null);
    });
  });
});
