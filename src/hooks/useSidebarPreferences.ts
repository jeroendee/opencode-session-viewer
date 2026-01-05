import { useState, useCallback } from 'react'

export type GroupingMode = 'directory' | 'date'

export interface SidebarPreferences {
  width: number
  groupingMode: GroupingMode
}

const STORAGE_KEY = 'sidebar-preferences'
const DEFAULT_WIDTH = 288 // w-72 equivalent
const MIN_WIDTH = 200
const MAX_WIDTH = 500

function getStoredPreferences(): SidebarPreferences {
  if (typeof window === 'undefined') {
    return { width: DEFAULT_WIDTH, groupingMode: 'directory' }
  }
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      return {
        width: typeof parsed.width === 'number' 
          ? Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, parsed.width))
          : DEFAULT_WIDTH,
        groupingMode: parsed.groupingMode === 'date' ? 'date' : 'directory',
      }
    }
  } catch {
    // Invalid JSON, use defaults
  }
  
  return { width: DEFAULT_WIDTH, groupingMode: 'directory' }
}

function savePreferences(prefs: SidebarPreferences): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
}

export function useSidebarPreferences() {
  const [preferences, setPreferencesState] = useState<SidebarPreferences>(getStoredPreferences)

  const setWidth = useCallback((width: number) => {
    const clampedWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, width))
    setPreferencesState(prev => {
      const next = { ...prev, width: clampedWidth }
      savePreferences(next)
      return next
    })
  }, [])

  const setGroupingMode = useCallback((mode: GroupingMode) => {
    setPreferencesState(prev => {
      const next = { ...prev, groupingMode: mode }
      savePreferences(next)
      return next
    })
  }, [])

  return {
    width: preferences.width,
    groupingMode: preferences.groupingMode,
    setWidth,
    setGroupingMode,
    minWidth: MIN_WIDTH,
    maxWidth: MAX_WIDTH,
  }
}
