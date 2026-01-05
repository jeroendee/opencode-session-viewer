import { useState, useCallback, useEffect, useMemo } from 'react';
import { Search, ChevronRight, ChevronDown, FolderOpen } from 'lucide-react';
import { useSessionStore, type DirectoryGroup } from '../store/sessionStore';
import { groupSessionsByDirectory } from '../lib/sessionLoader';
import { LoadingSpinner } from './LoadingSpinner';
import type { SessionInfo } from '../types/session';

interface SessionBrowserProps {
  sidebarOpen: boolean;
  onCloseSidebar?: () => void;
}

/**
 * Extracts directory name from path (last segment).
 */
function getDirectoryName(path: string): string {
  const segments = path.split('/').filter(Boolean);
  return segments[segments.length - 1] || path;
}

/**
 * Renders a single session item (flat, no nesting).
 */
function SessionItem({
  session,
  isSelected,
  onSelect,
}: {
  session: SessionInfo;
  isSelected: boolean;
  onSelect: (sessionId: string) => void;
}) {
  return (
    <button
      onClick={() => onSelect(session.id)}
      aria-current={isSelected ? 'true' : undefined}
      className={`
        w-full text-left py-1.5 px-2 pl-7 text-sm rounded-md transition-colors
        ${isSelected
          ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200'
          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}
      `}
      title={session.title}
    >
      <span className="block truncate">{session.title || 'Untitled Session'}</span>
    </button>
  );
}

/**
 * Renders a collapsible directory group with its sessions.
 */
function DirectoryGroupComponent({
  group,
  isExpanded,
  onToggle,
  selectedSessionId,
  onSelectSession,
}: {
  group: DirectoryGroup;
  isExpanded: boolean;
  onToggle: () => void;
  selectedSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
}) {
  const directoryName = getDirectoryName(group.directory);

  return (
    <div className="mb-1">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 py-1.5 px-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
        aria-expanded={isExpanded}
        aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${directoryName}`}
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-500 flex-shrink-0" />
        )}
        <FolderOpen className="w-4 h-4 text-gray-500 flex-shrink-0" />
        <span className="flex-1 truncate text-left" title={group.directory}>{directoryName}</span>
        <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-600 px-1.5 py-0.5 rounded-full tabular-nums">
          {group.sessions.length}
        </span>
      </button>
      {isExpanded && group.sessions.length > 0 && (
        <div className="mt-1">
          {group.sessions.map((session) => (
            <SessionItem
              key={session.id}
              session={session}
              isSelected={selectedSessionId === session.id}
              onSelect={onSelectSession}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * SessionBrowser - Left sidebar for browsing sessions organized by directory.
 * 
 * Features:
 * - Search bar (placeholder for Phase 4)
 * - Collapsible directory groups
 * - Sessions sorted by time (newest first)
 * - Session count badges
 * - Change folder button
 */
export function SessionBrowser({ sidebarOpen, onCloseSidebar }: SessionBrowserProps) {
  const { projects, selectedSessionId, selectSession, clearFolder, isLoadingFolder } = useSessionStore();
  
  // Group sessions by directory and sort by time
  const directoryGroups = useMemo(() => {
    return groupSessionsByDirectory(projects);
  }, [projects]);

  const [expandedDirectories, setExpandedDirectories] = useState<Set<string>>(() => {
    // Start with all directories expanded
    return new Set(directoryGroups.map((g) => g.directory));
  });

  // Sync expandedDirectories when directory groups change (e.g., after loading folder)
  // - New directories are expanded by default
  // - Existing directories keep their expanded/collapsed state
  // - Removed directories are cleaned up from the set
  useEffect(() => {
    setExpandedDirectories((prev) => {
      const currentDirectories = new Set(directoryGroups.map((g) => g.directory));
      const next = new Set<string>();

      for (const dir of currentDirectories) {
        if (prev.has(dir)) {
          // Existing directory that was expanded - keep it expanded
          next.add(dir);
        } else if (prev.size === 0 || !Array.from(prev).some((prevDir) => currentDirectories.has(prevDir))) {
          // Initial load or complete directory list change - expand all
          next.add(dir);
        } else {
          // New directory added alongside existing directories - expand by default
          next.add(dir);
        }
      }

      return next;
    });
  }, [directoryGroups]);

  const handleToggleDirectory = useCallback((directory: string) => {
    setExpandedDirectories((prev) => {
      const next = new Set(prev);
      if (next.has(directory)) {
        next.delete(directory);
      } else {
        next.add(directory);
      }
      return next;
    });
  }, []);

  const handleSelectSession = useCallback(
    (sessionId: string) => {
      selectSession(sessionId);
      // Close sidebar on mobile after selection (md breakpoint = 768px)
      const isMobile = window.matchMedia('(max-width: 767px)').matches;
      if (isMobile) {
        onCloseSidebar?.();
      }
    },
    [selectSession, onCloseSidebar]
  );

  const handleChangeFolder = useCallback(() => {
    clearFolder();
  }, [clearFolder]);

  return (
    <aside
      data-testid="session-browser"
      data-open={sidebarOpen}
      className={`
        fixed md:relative inset-y-0 left-0 z-30
        bg-white dark:bg-gray-800
        border-r border-gray-200 dark:border-gray-700
        transform transition-all duration-200 ease-in-out
        flex flex-col h-full
        ${sidebarOpen
          ? 'translate-x-0 w-72'
          : '-translate-x-full md:translate-x-0 md:w-0 md:overflow-hidden md:border-r-0'}
      `}
    >
      {/* Search bar (placeholder for Phase 4) */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search sessions..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 border border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-gray-800 rounded-lg outline-none transition-colors text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400"
            aria-label="Search sessions"
            disabled
          />
        </div>
      </div>

      {/* Directory list */}
      <div className="flex-1 overflow-y-auto p-4">
        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
          Directories
        </h3>
        {isLoadingFolder ? (
          <div className="flex flex-col items-center justify-center py-8">
            <LoadingSpinner label="Loading sessions..." />
          </div>
        ) : directoryGroups.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No sessions loaded</p>
        ) : (
          <div className="space-y-1">
            {directoryGroups.map((group) => (
              <DirectoryGroupComponent
                key={group.directory}
                group={group}
                isExpanded={expandedDirectories.has(group.directory)}
                onToggle={() => handleToggleDirectory(group.directory)}
                selectedSessionId={selectedSessionId}
                onSelectSession={handleSelectSession}
              />
            ))}
          </div>
        )}
      </div>

      {/* Change folder button */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={handleChangeFolder}
          className="w-full py-2 px-4 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
        >
          Change Folder
        </button>
      </div>
    </aside>
  );
}
