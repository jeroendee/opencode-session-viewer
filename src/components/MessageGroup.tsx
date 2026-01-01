import type { MessageGroup as MessageGroupType } from '../utils/groupMessages';
import { UserMessage } from './UserMessage';
import { AssistantResponse } from './AssistantResponse';

interface MessageGroupProps {
  group: MessageGroupType;
  index: number;
}

export function MessageGroup({ group, index }: MessageGroupProps) {
  const messageId = group.userMessage.info.id;

  return (
    <div
      id={`msg-${messageId}`}
      className="space-y-4"
    >
      {/* User message */}
      <UserMessage message={group.userMessage} index={index} />

      {/* Assistant response(s) */}
      {group.assistantMessages.length > 0 && (
        <AssistantResponse messages={group.assistantMessages} messageId={messageId} />
      )}
    </div>
  );
}
