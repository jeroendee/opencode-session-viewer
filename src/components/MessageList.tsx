import { useSessionStore } from '../store/sessionStore';
import { groupMessages } from '../utils/groupMessages';
import { MessageGroup } from './MessageGroup';

export function MessageList() {
  const { session } = useSessionStore();

  if (!session) {
    return null;
  }

  // Empty state when session has no messages
  if (session.messages.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-4xl mx-auto">
          <div
            role="status"
            className="flex flex-col items-center justify-center py-16 text-center"
          >
            <h3 className="text-lg font-medium text-zinc-800 dark:text-zinc-200 mb-2">
              This session has no displayable messages
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md">
              The conversation content could not be loaded. This may be an older session format
              or the messages were not recorded.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const groups = groupMessages(session.messages);

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {groups.map((group, index) => (
          <MessageGroup
            key={group.userMessage.info.id}
            group={group}
            index={index}
          />
        ))}
      </div>
    </div>
  );
}
