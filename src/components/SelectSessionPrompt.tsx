import { FileText } from 'lucide-react';
import { useSessionStore } from '../store/sessionStore';

/**
 * Displays a prompt when a folder is loaded but no session is selected.
 * Shows helpful information about the loaded projects and session count.
 */
export function SelectSessionPrompt() {
  const { projects } = useSessionStore();

  // Count total sessions across all projects
  const totalSessions = projects.reduce((acc, project) => {
    const countNodes = (nodes: typeof project.sessions): number =>
      nodes.reduce((sum, node) => sum + 1 + countNodes(node.children), 0);
    return acc + countNodes(project.sessions);
  }, 0);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
      <FileText className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-6" />
      
      <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
        Select a session to view
      </h2>
      
      <p className="text-gray-500 dark:text-gray-400 max-w-md mb-6">
        Choose a session from the sidebar to explore its messages and tool interactions.
      </p>

      <div className="flex items-center gap-6 text-sm text-gray-500 dark:text-gray-400">
        <div className="flex flex-col items-center">
          <span className="text-2xl font-bold text-gray-700 dark:text-gray-300">
            {projects.length}
          </span>
          <span>{projects.length === 1 ? 'Project' : 'Projects'}</span>
        </div>
        
        <div className="w-px h-10 bg-gray-200 dark:bg-gray-700" />
        
        <div className="flex flex-col items-center">
          <span className="text-2xl font-bold text-gray-700 dark:text-gray-300">
            {totalSessions}
          </span>
          <span>{totalSessions === 1 ? 'Session' : 'Sessions'}</span>
        </div>
      </div>
    </div>
  );
}
