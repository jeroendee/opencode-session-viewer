import type { MessageGroup } from './groupMessages';
import type { TaskToolPart } from '../types/session';
import { isSubtaskPart, isTaskToolPart } from '../types/session';

/**
 * Lightweight representation of a task for sidebar display.
 */
export interface TaskInfo {
  /** Part ID for navigation/scrolling */
  id: string;
  /** Agent type (e.g., 'explore', 'code-reviewer', 'general') */
  agentType: string;
  /** Parent message ID */
  messageId: string;
}

/**
 * Extracts the agent type from a task ToolPart's input.
 * All ToolState variants have input, so we can always try to extract it.
 * Returns 'task' if the agent type cannot be determined.
 */
function getAgentTypeFromTaskToolPart(part: TaskToolPart): string {
  const input = part.state.input;
  
  if (typeof input !== 'object' || input === null) {
    return 'task';
  }
  
  const obj = input as Record<string, unknown>;
  const agentType = obj.subagent_type;
  
  return typeof agentType === 'string' ? agentType : 'task';
}

/**
 * Extracts all tasks from a MessageGroup's assistant messages.
 * Tasks include both SubtaskPart (type: 'subtask') and ToolPart (where tool='task').
 * 
 * @param group - The MessageGroup to extract tasks from
 * @returns Array of TaskInfo objects suitable for sidebar display
 */
export function extractTasks(group: MessageGroup): TaskInfo[] {
  const tasks: TaskInfo[] = [];
  
  for (const assistantMessage of group.assistantMessages) {
    const messageId = assistantMessage.info.id;
    
    for (const part of assistantMessage.parts) {
      if (isSubtaskPart(part)) {
        tasks.push({
          id: part.id,
          agentType: part.agent,
          messageId,
        });
      } else if (isTaskToolPart(part)) {
        tasks.push({
          id: part.id,
          agentType: getAgentTypeFromTaskToolPart(part),
          messageId,
        });
      }
    }
  }
  
  return tasks;
}
