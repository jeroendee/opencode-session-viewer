import { useSessionStore } from '../store/sessionStore';
import { groupMessages } from '../utils/groupMessages';
import { MessageGroup } from './MessageGroup';

export function MessageList() {
  const { session } = useSessionStore();

  if (!session) {
    return null;
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
