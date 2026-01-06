import type { MessageGroup } from './groupMessages';
import type { TaskToolPart, ToolPart } from '../types/session';
import { isSubtaskPart, isTaskToolPart, isToolPart } from '../types/session';

/**
 * Sidebar item types for distinguishing between tasks and skills.
 */
export type SidebarItemType = 'task' | 'subtask' | 'skill';

/**
 * Lightweight representation of a sidebar item (task or skill) for display.
 */
export interface SidebarItem {
  /** Part ID for navigation/scrolling */
  id: string;
  /** Display label (agent type for tasks, skill name for skills) */
  label: string;
  /** Parent message ID */
  messageId: string;
  /** Type of sidebar item */
  itemType: SidebarItemType;
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
 * Checks if a ToolPart is a skill tool.
 */
function isSkillToolPart(part: ToolPart): boolean {
  return part.tool === 'skill';
}

/**
 * Extracts the skill name from a skill ToolPart's input.
 * Returns 'skill' if the name cannot be determined.
 */
function getSkillNameFromToolPart(part: ToolPart): string {
  const input = part.state.input;
  
  if (typeof input !== 'object' || input === null) {
    return 'skill';
  }
  
  const obj = input as Record<string, unknown>;
  const name = obj.name;
  
  return typeof name === 'string' ? name : 'skill';
}

/**
 * Extracts all sidebar items (tasks and skills) from a MessageGroup's assistant messages.
 * Items are returned in document order.
 * 
 * @param group - The MessageGroup to extract items from
 * @returns Array of SidebarItem objects suitable for sidebar display
 */
export function extractSidebarItems(group: MessageGroup): SidebarItem[] {
  const items: SidebarItem[] = [];
  
  for (const assistantMessage of group.assistantMessages) {
    const messageId = assistantMessage.info.id;
    
    for (const part of assistantMessage.parts) {
      if (isSubtaskPart(part)) {
        items.push({
          id: part.id,
          label: part.agent,
          messageId,
          itemType: 'subtask',
        });
      } else if (isTaskToolPart(part)) {
        items.push({
          id: part.id,
          label: getAgentTypeFromTaskToolPart(part),
          messageId,
          itemType: 'task',
        });
      } else if (isToolPart(part) && isSkillToolPart(part)) {
        items.push({
          id: part.id,
          label: getSkillNameFromToolPart(part),
          messageId,
          itemType: 'skill',
        });
      }
    }
  }
  
  return items;
}
