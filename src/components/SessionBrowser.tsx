import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Search, ChevronRight, ChevronDown, FolderOpen, Calendar } from 'lucide-react';
import { useSessionStore, type DirectoryGroup, type YearGroup, type MonthGroup, type DayGroup } from '../store/sessionStore';
import { groupSessionsByDirectory, groupSessionsByDate } from '../lib/sessionLoader';
import { useSidebarPreferences, type GroupingMode } from '../hooks/useSidebarPreferences';
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
  depth = 1,
}: {
  session: SessionInfo;
  isSelected: boolean;
  onSelect: (sessionId: string) => void;
  depth?: number;
}) {
  const paddingLeft = 8 + depth * 16;
  
  return (
    <button
      onClick={() => onSelect(session.id)}
      aria-current={isSelected ? 'true' : undefined}
      className={`
        w-full text-left py-1.5 px-2 text-sm rounded-md transition-colors
        ${isSelected
          ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200'
          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}
      `}
      style={{ paddingLeft: `${paddingLeft}px` }}
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
 * Renders a collapsible day group with its sessions.
 */
function DayGroupComponent({
  group,
  isExpanded,
  onToggle,
  selectedSessionId,
  onSelectSession,
}: {
  group: DayGroup;
  isExpanded: boolean;
  onToggle: () => void;
  selectedSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
}) {
  return (
    <div className="ml-4">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 py-1 px-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
        aria-expanded={isExpanded}
      >
        {isExpanded ? (
          <ChevronDown className="w-3 h-3 text-gray-400 flex-shrink-0" />
        ) : (
          <ChevronRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
        )}
        <span className="flex-1 text-left">{group.label}</span>
        <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">
          {group.sessions.length}
        </span>
      </button>
      {isExpanded && (
        <div className="mt-1">
          {group.sessions.map((session) => (
            <SessionItem
              key={session.id}
              session={session}
              isSelected={selectedSessionId === session.id}
              onSelect={onSelectSession}
              depth={3}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Renders a collapsible month group with its days.
 */
function MonthGroupComponent({
  group,
  isExpanded,
  onToggle,
  expandedDays,
  onToggleDay,
  selectedSessionId,
  onSelectSession,
}: {
  group: MonthGroup;
  isExpanded: boolean;
  onToggle: () => void;
  expandedDays: Set<string>;
  onToggleDay: (key: string) => void;
  selectedSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
}) {
  const sessionCount = group.days.reduce((acc, day) => acc + day.sessions.length, 0);
  
  return (
    <div className="ml-2">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 py-1 px-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
        aria-expanded={isExpanded}
      >
        {isExpanded ? (
          <ChevronDown className="w-3 h-3 text-gray-500 flex-shrink-0" />
        ) : (
          <ChevronRight className="w-3 h-3 text-gray-500 flex-shrink-0" />
        )}
        <span className="flex-1 text-left font-medium">{group.label}</span>
        <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
          {sessionCount}
        </span>
      </button>
      {isExpanded && (
        <div className="mt-1">
          {group.days.map((day) => {
            const dayKey = `${group.month}-${day.day}`;
            return (
              <DayGroupComponent
                key={dayKey}
                group={day}
                isExpanded={expandedDays.has(dayKey)}
                onToggle={() => onToggleDay(dayKey)}
                selectedSessionId={selectedSessionId}
                onSelectSession={onSelectSession}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Renders a collapsible year group with its months.
 */
function YearGroupComponent({
  group,
  isExpanded,
  onToggle,
  expandedMonths,
  onToggleMonth,
  expandedDays,
  onToggleDay,
  selectedSessionId,
  onSelectSession,
}: {
  group: YearGroup;
  isExpanded: boolean;
  onToggle: () => void;
  expandedMonths: Set<string>;
  onToggleMonth: (key: string) => void;
  expandedDays: Set<string>;
  onToggleDay: (key: string) => void;
  selectedSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
}) {
  const sessionCount = group.months.reduce(
    (acc, month) => acc + month.days.reduce((dayAcc, day) => dayAcc + day.sessions.length, 0),
    0
  );

  return (
    <div className="mb-1">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 py-1.5 px-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
        aria-expanded={isExpanded}
        aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${group.label}`}
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-500 flex-shrink-0" />
        )}
        <Calendar className="w-4 h-4 text-gray-500 flex-shrink-0" />
        <span className="flex-1 text-left">{group.label}</span>
        <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-600 px-1.5 py-0.5 rounded-full tabular-nums">
          {sessionCount}
        </span>
      </button>
      {isExpanded && (
        <div className="mt-1">
          {group.months.map((month) => {
            const monthKey = `${group.year}-${month.month}`;
            return (
              <MonthGroupComponent
                key={monthKey}
                group={month}
                isExpanded={expandedMonths.has(monthKey)}
                onToggle={() => onToggleMonth(monthKey)}
                expandedDays={expandedDays}
                onToggleDay={onToggleDay}
                selectedSessionId={selectedSessionId}
                onSelectSession={onSelectSession}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Resize handle component for the sidebar.
 */
function ResizeHandle({
  onResize,
  onResizeEnd,
}: {
  onResize: (deltaX: number) => void;
  onResizeEnd: () => void;
}) {
  const isDragging = useRef(false);
  const startX = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    startX.current = e.clientX;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const deltaX = e.clientX - startX.current;
      startX.current = e.clientX;
      onResize(deltaX);
    };

    const handleMouseUp = () => {
      if (isDragging.current) {
        isDragging.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        onResizeEnd();
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [onResize, onResizeEnd]);

  return (
    <div
      onMouseDown={handleMouseDown}
      className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500 active:bg-blue-600 transition-colors z-10"
      title="Drag to resize"
    />
  );
}

/**
 * Grouping mode selector component.
 */
function GroupingModeSelector({
  mode,
  onChange,
}: {
  mode: GroupingMode;
  onChange: (mode: GroupingMode) => void;
}) {
  return (
    <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
      <button
        onClick={() => onChange('directory')}
        className={`flex-1 px-2 py-1 text-xs font-medium rounded transition-colors ${
          mode === 'directory'
            ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
        }`}
        aria-pressed={mode === 'directory'}
      >
        Directory
      </button>
      <button
        onClick={() => onChange('date')}
        className={`flex-1 px-2 py-1 text-xs font-medium rounded transition-colors ${
          mode === 'date'
            ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
        }`}
        aria-pressed={mode === 'date'}
      >
        Date
      </button>
    </div>
  );
}

/**
 * SessionBrowser - Left sidebar for browsing sessions organized by directory or date.
 * 
 * Features:
 * - Resizable width with drag handle
 * - Grouping mode selector (directory/date)
 * - Collapsible groups (directory or year->month->day tree)
 * - Sessions sorted by time (newest first)
 * - Session count badges
 * - Change folder button
 * - Preferences persisted to localStorage
 */
export function SessionBrowser({ sidebarOpen, onCloseSidebar }: SessionBrowserProps) {
  const { projects, selectedSessionId, selectSession, clearFolder, isLoadingFolder } = useSessionStore();
  const { width, groupingMode, setWidth, setGroupingMode, minWidth, maxWidth } = useSidebarPreferences();
  const [currentWidth, setCurrentWidth] = useState(width);
  
  // Group sessions by directory
  const directoryGroups = useMemo(() => {
    return groupSessionsByDirectory(projects);
  }, [projects]);

  // Group sessions by date (year->month->day)
  const dateGroups = useMemo(() => {
    return groupSessionsByDate(projects);
  }, [projects]);

  // Expanded state for directory groups
  const [expandedDirectories, setExpandedDirectories] = useState<Set<string>>(() => {
    return new Set(directoryGroups.map((g) => g.directory));
  });

  // Expanded state for date groups (years, months, days)
  const [expandedYears, setExpandedYears] = useState<Set<number>>(() => {
    // Expand the first (most recent) year by default
    return new Set(dateGroups.slice(0, 1).map((g) => g.year));
  });
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(() => {
    // Expand the first month of the first year by default
    if (dateGroups.length > 0 && dateGroups[0].months.length > 0) {
      return new Set([`${dateGroups[0].year}-${dateGroups[0].months[0].month}`]);
    }
    return new Set();
  });
  const [expandedDays, setExpandedDays] = useState<Set<string>>(() => {
    // Expand the first day by default
    if (dateGroups.length > 0 && dateGroups[0].months.length > 0 && dateGroups[0].months[0].days.length > 0) {
      const firstDay = dateGroups[0].months[0].days[0];
      return new Set([`${dateGroups[0].months[0].month}-${firstDay.day}`]);
    }
    return new Set();
  });

  // Sync expanded directories when groups change
  useEffect(() => {
    setExpandedDirectories((prev) => {
      const currentDirectories = new Set(directoryGroups.map((g) => g.directory));
      const next = new Set<string>();

      for (const dir of currentDirectories) {
        if (prev.has(dir)) {
          next.add(dir);
        } else if (prev.size === 0 || !Array.from(prev).some((prevDir) => currentDirectories.has(prevDir))) {
          next.add(dir);
        } else {
          next.add(dir);
        }
      }

      return next;
    });
  }, [directoryGroups]);

  // Sync expanded years when date groups change
  useEffect(() => {
    setExpandedYears((prev) => {
      if (prev.size === 0 && dateGroups.length > 0) {
        return new Set([dateGroups[0].year]);
      }
      return prev;
    });
  }, [dateGroups]);

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

  const handleToggleYear = useCallback((year: number) => {
    setExpandedYears((prev) => {
      const next = new Set(prev);
      if (next.has(year)) {
        next.delete(year);
      } else {
        next.add(year);
      }
      return next;
    });
  }, []);

  const handleToggleMonth = useCallback((key: string) => {
    setExpandedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const handleToggleDay = useCallback((key: string) => {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const handleSelectSession = useCallback(
    (sessionId: string) => {
      selectSession(sessionId);
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

  const handleResize = useCallback((deltaX: number) => {
    setCurrentWidth((prev) => Math.min(maxWidth, Math.max(minWidth, prev + deltaX)));
  }, [minWidth, maxWidth]);

  const handleResizeEnd = useCallback(() => {
    setWidth(currentWidth);
  }, [currentWidth, setWidth]);

  // Sync currentWidth with persisted width
  useEffect(() => {
    setCurrentWidth(width);
  }, [width]);

  return (
    <aside
      data-testid="session-browser"
      data-open={sidebarOpen}
      className={`
        fixed md:relative inset-y-0 left-0 z-30
        bg-white dark:bg-gray-800
        border-r border-gray-200 dark:border-gray-700
        transform transition-transform duration-200 ease-in-out
        flex flex-col h-full
        ${sidebarOpen
          ? 'translate-x-0'
          : '-translate-x-full md:translate-x-0 md:w-0 md:overflow-hidden md:border-r-0'}
      `}
      style={{ width: sidebarOpen ? `${currentWidth}px` : undefined }}
    >
      {/* Resize handle */}
      {sidebarOpen && (
        <ResizeHandle onResize={handleResize} onResizeEnd={handleResizeEnd} />
      )}

      {/* Search bar and grouping mode */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 space-y-3">
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
        <GroupingModeSelector mode={groupingMode} onChange={setGroupingMode} />
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto p-4">
        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
          {groupingMode === 'directory' ? 'Directories' : 'Timeline'}
        </h3>
        {isLoadingFolder ? (
          <div className="flex flex-col items-center justify-center py-8">
            <LoadingSpinner label="Loading sessions..." />
          </div>
        ) : groupingMode === 'directory' ? (
          directoryGroups.length === 0 ? (
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
          )
        ) : dateGroups.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No sessions loaded</p>
        ) : (
          <div className="space-y-1">
            {dateGroups.map((yearGroup) => (
              <YearGroupComponent
                key={yearGroup.year}
                group={yearGroup}
                isExpanded={expandedYears.has(yearGroup.year)}
                onToggle={() => handleToggleYear(yearGroup.year)}
                expandedMonths={expandedMonths}
                onToggleMonth={handleToggleMonth}
                expandedDays={expandedDays}
                onToggleDay={handleToggleDay}
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
