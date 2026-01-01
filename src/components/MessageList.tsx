import { useSessionStore } from '../store/sessionStore';
import { groupMessages, getGroupSummary, getAssistantStats } from '../utils/groupMessages';

export function MessageList() {
  const { session } = useSessionStore();

  if (!session) {
    return null;
  }

  const groups = groupMessages(session.messages);

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {groups.map((group, index) => {
          const stats = getAssistantStats(group.assistantMessages);
          
          return (
            <div
              key={group.userMessage.info.id}
              id={`msg-${group.userMessage.info.id}`}
              className="space-y-4"
            >
              {/* User message */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase">
                    User
                  </span>
                  <span className="text-xs text-gray-400">
                    #{index + 1}
                  </span>
                </div>
                <div className="text-gray-800 dark:text-gray-200">
                  {getGroupSummary(group)}
                </div>
              </div>

              {/* Assistant response placeholder */}
              {group.assistantMessages.length > 0 && (
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-medium text-green-600 dark:text-green-400 uppercase">
                      Assistant
                    </span>
                    <span className="text-xs text-gray-400">
                      {stats.stepCount} steps, {stats.toolCount} tools
                      {stats.hasReasoning && ', has thinking'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                    Message rendering will be implemented in Phase 4
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
