import { useState, useCallback, useEffect } from 'react';
import { Search, ChevronRight, ChevronDown, FolderOpen } from 'lucide-react';
import { useSessionStore, type ProjectInfo, type SessionNode } from '../store/sessionStore';
import { LoadingSpinner } from './LoadingSpinner';

interface SessionBrowserProps {
  sidebarOpen: boolean;
  onCloseSidebar?: () => void;
}

/**
 * Counts total sessions in a project (including nested children).
 */
function countSessions(nodes: SessionNode[]): number {
  let count = 0;
  for (const node of nodes) {
    count += 1;
    count += countSessions(node.children);
  }
  return count;
}

/**
 * Extracts project name from path (last segment).
 */
function getProjectName(path: string): string {
  const segments = path.split('/').filter(Boolean);
  return segments[segments.length - 1] || path;
}

/**
 * Renders a single session item with proper indentation.
 */
function SessionItem({
  node,
  depth,
  selectedSessionId,
  onSelect,
}: {
  node: SessionNode;
  depth: number;
  selectedSessionId: string | null;
  onSelect: (sessionId: string) => void;
}) {
  const isSelected = selectedSessionId === node.session.id;
  const paddingLeft = 12 + depth * 16;

  return (
    <>
      <button
        onClick={() => onSelect(node.session.id)}
        aria-current={isSelected ? 'true' : undefined}
        className={`
          w-full text-left py-1.5 px-2 text-sm rounded-md transition-colors
          ${isSelected
            ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200'
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}
        `}
        style={{ paddingLeft: `${paddingLeft}px` }}
        title={node.session.title}
      >
        <span className="block truncate">{node.session.title || 'Untitled Session'}</span>
      </button>
      {node.children.map((child) => (
        <SessionItem
          key={child.session.id}
          node={child}
          depth={depth + 1}
          selectedSessionId={selectedSessionId}
          onSelect={onSelect}
        />
      ))}
    </>
  );
}

/**
 * Renders a collapsible project group with its sessions.
 */
function ProjectGroup({
  project,
  isExpanded,
  onToggle,
  selectedSessionId,
  onSelectSession,
}: {
  project: ProjectInfo;
  isExpanded: boolean;
  onToggle: () => void;
  selectedSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
}) {
  const sessionCount = countSessions(project.sessions);
  const projectName = getProjectName(project.path);

  return (
    <div className="mb-1">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 py-1.5 px-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
        aria-expanded={isExpanded}
        aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${projectName}`}
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-500 flex-shrink-0" />
        )}
        <FolderOpen className="w-4 h-4 text-gray-500 flex-shrink-0" />
        <span className="flex-1 truncate text-left">{projectName}</span>
        <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-600 px-1.5 py-0.5 rounded-full tabular-nums">
          {sessionCount}
        </span>
      </button>
      {isExpanded && project.sessions.length > 0 && (
        <div className="mt-1">
          {project.sessions.map((node) => (
            <SessionItem
              key={node.session.id}
              node={node}
              depth={1}
              selectedSessionId={selectedSessionId}
              onSelect={onSelectSession}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * SessionBrowser - Left sidebar for browsing sessions organized by project.
 * 
 * Features:
 * - Search bar (placeholder for Phase 4)
 * - Collapsible project groups
 * - Session count badges
 * - Change folder button
 */
export function SessionBrowser({ sidebarOpen, onCloseSidebar }: SessionBrowserProps) {
  const { projects, selectedSessionId, selectSession, clearFolder, isLoadingFolder } = useSessionStore();
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(() => {
    // Start with all projects expanded
    return new Set(projects.map((p) => p.id));
  });

  // Sync expandedProjects when projects list changes (e.g., after loading folder)
  // - New projects are expanded by default
  // - Existing projects keep their expanded/collapsed state
  // - Removed projects are cleaned up from the set
  useEffect(() => {
    setExpandedProjects((prev) => {
      const currentProjectIds = new Set(projects.map((p) => p.id));
      const next = new Set<string>();

      for (const id of currentProjectIds) {
        if (prev.has(id)) {
          // Existing project that was expanded - keep it expanded
          next.add(id);
        } else if (prev.size === 0 || !Array.from(prev).some((prevId) => currentProjectIds.has(prevId))) {
          // Initial load or complete project list change - expand all
          next.add(id);
        } else {
          // New project added alongside existing projects - expand by default
          next.add(id);
        }
      }

      return next;
    });
  }, [projects]);

  const handleToggleProject = useCallback((projectId: string) => {
    setExpandedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  }, []);

  const handleSelectSession = useCallback(
    (sessionId: string) => {
      selectSession(sessionId);
      // Close sidebar on mobile after selection
      onCloseSidebar?.();
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

      {/* Project list */}
      <div className="flex-1 overflow-y-auto p-4">
        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
          Projects
        </h3>
        {isLoadingFolder ? (
          <div className="flex flex-col items-center justify-center py-8">
            <LoadingSpinner label="Loading sessions..." />
          </div>
        ) : projects.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No projects loaded</p>
        ) : (
          <div className="space-y-1">
            {projects.map((project) => (
              <ProjectGroup
                key={project.id}
                project={project}
                isExpanded={expandedProjects.has(project.id)}
                onToggle={() => handleToggleProject(project.id)}
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
