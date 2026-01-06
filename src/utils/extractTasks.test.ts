import { describe, it, expect } from 'vitest';
import { extractTasks, TaskInfo } from './extractTasks';
import { isTaskToolPart } from '../types/session';
import type { MessageGroup } from './groupMessages';
import type { AssistantMessage, SubtaskPart, ToolPart, Part } from '../types/session';

// Helper to create a minimal assistant message with custom parts
function createAssistantMessage(id: string, parts: Part[]): AssistantMessage {
  return {
    info: {
      id,
      sessionID: 'ses_test',
      role: 'assistant',
      parentID: 'msg_user',
      time: { created: Date.now() },
      modelID: 'test',
      providerID: 'test',
      agent: 'test',
      mode: 'test',
      path: { cwd: '/', root: '/' },
      cost: 0,
      tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
    },
    parts,
  };
}

// Helper to create a SubtaskPart
function createSubtaskPart(id: string, messageId: string, agent: string): SubtaskPart {
  return {
    id,
    sessionID: 'ses_test',
    messageID: messageId,
    type: 'subtask',
    prompt: 'Test prompt',
    description: 'Test description',
    agent,
  };
}

// Helper to create a task ToolPart (completed)
function createTaskToolPart(id: string, messageId: string, subagentType: string): ToolPart {
  return {
    id,
    sessionID: 'ses_test',
    messageID: messageId,
    type: 'tool',
    callID: `call_${id}`,
    tool: 'task',
    state: {
      status: 'completed',
      input: { subagent_type: subagentType, description: 'Test task' },
      output: 'Task completed',
      title: 'Task',
      time: { start: 1000, end: 2000 },
    },
  };
}

// Helper to create a non-task ToolPart
function createNonTaskToolPart(id: string, messageId: string, toolName: string): ToolPart {
  return {
    id,
    sessionID: 'ses_test',
    messageID: messageId,
    type: 'tool',
    callID: `call_${id}`,
    tool: toolName,
    state: {
      status: 'completed',
      input: { command: 'test' },
      output: 'Output',
      title: 'Title',
      time: { start: 1000, end: 2000 },
    },
  };
}

// Helper to create a MessageGroup with assistant messages
function createMessageGroup(assistantMessages: AssistantMessage[]): MessageGroup {
  return {
    userMessage: {
      info: {
        id: 'msg_user',
        sessionID: 'ses_test',
        role: 'user',
        time: { created: Date.now() },
        agent: 'test',
        model: { providerID: 'test', modelID: 'test' },
      },
      parts: [],
    },
    assistantMessages,
  };
}

describe('isTaskToolPart', () => {
  it('returns true for ToolPart with tool="task"', () => {
    const taskPart = createTaskToolPart('p1', 'msg_1', 'explore');
    expect(isTaskToolPart(taskPart)).toBe(true);
  });

  it('returns false for ToolPart with other tool names', () => {
    const bashPart = createNonTaskToolPart('p1', 'msg_1', 'bash');
    expect(isTaskToolPart(bashPart)).toBe(false);
  });

  it('returns false for non-ToolPart parts', () => {
    const subtaskPart = createSubtaskPart('p1', 'msg_1', 'explore');
    expect(isTaskToolPart(subtaskPart)).toBe(false);
  });
});

describe('extractTasks', () => {
  it('extracts SubtaskPart as tasks', () => {
    const subtask = createSubtaskPart('p1', 'msg_1', 'explore');
    const assistantMsg = createAssistantMessage('msg_1', [subtask]);
    const group = createMessageGroup([assistantMsg]);

    const tasks = extractTasks(group);

    expect(tasks).toHaveLength(1);
    expect(tasks[0]).toEqual<TaskInfo>({
      id: 'p1',
      agentType: 'explore',
      messageId: 'msg_1',
    });
  });

  it('extracts task ToolPart as tasks', () => {
    const taskTool = createTaskToolPart('p1', 'msg_1', 'code-reviewer');
    const assistantMsg = createAssistantMessage('msg_1', [taskTool]);
    const group = createMessageGroup([assistantMsg]);

    const tasks = extractTasks(group);

    expect(tasks).toHaveLength(1);
    expect(tasks[0]).toEqual<TaskInfo>({
      id: 'p1',
      agentType: 'code-reviewer',
      messageId: 'msg_1',
    });
  });

  it('ignores non-task ToolParts', () => {
    const bashTool = createNonTaskToolPart('p1', 'msg_1', 'bash');
    const readTool = createNonTaskToolPart('p2', 'msg_1', 'read');
    const assistantMsg = createAssistantMessage('msg_1', [bashTool, readTool]);
    const group = createMessageGroup([assistantMsg]);

    const tasks = extractTasks(group);

    expect(tasks).toHaveLength(0);
  });

  it('extracts both SubtaskPart and task ToolPart from the same message', () => {
    const subtask = createSubtaskPart('p1', 'msg_1', 'explore');
    const taskTool = createTaskToolPart('p2', 'msg_1', 'general');
    const assistantMsg = createAssistantMessage('msg_1', [subtask, taskTool]);
    const group = createMessageGroup([assistantMsg]);

    const tasks = extractTasks(group);

    expect(tasks).toHaveLength(2);
    expect(tasks[0].id).toBe('p1');
    expect(tasks[0].agentType).toBe('explore');
    expect(tasks[1].id).toBe('p2');
    expect(tasks[1].agentType).toBe('general');
  });

  it('extracts tasks from multiple assistant messages', () => {
    const subtask1 = createSubtaskPart('p1', 'msg_1', 'explore');
    const subtask2 = createSubtaskPart('p2', 'msg_2', 'code-reviewer');
    const assistantMsg1 = createAssistantMessage('msg_1', [subtask1]);
    const assistantMsg2 = createAssistantMessage('msg_2', [subtask2]);
    const group = createMessageGroup([assistantMsg1, assistantMsg2]);

    const tasks = extractTasks(group);

    expect(tasks).toHaveLength(2);
    expect(tasks[0].messageId).toBe('msg_1');
    expect(tasks[1].messageId).toBe('msg_2');
  });

  it('returns empty array when no tasks exist', () => {
    const textPart: Part = {
      id: 'p1',
      sessionID: 'ses_test',
      messageID: 'msg_1',
      type: 'text',
      text: 'Hello',
    };
    const assistantMsg = createAssistantMessage('msg_1', [textPart]);
    const group = createMessageGroup([assistantMsg]);

    const tasks = extractTasks(group);

    expect(tasks).toHaveLength(0);
  });

  it('returns empty array when no assistant messages exist', () => {
    const group = createMessageGroup([]);

    const tasks = extractTasks(group);

    expect(tasks).toHaveLength(0);
  });

  it('handles task ToolPart with pending status and empty input object', () => {
    const pendingTaskTool: ToolPart = {
      id: 'p1',
      sessionID: 'ses_test',
      messageID: 'msg_1',
      type: 'tool',
      callID: 'call_p1',
      tool: 'task',
      state: {
        status: 'pending',
        input: {},
        raw: '',
      },
    };
    const assistantMsg = createAssistantMessage('msg_1', [pendingTaskTool]);
    const group = createMessageGroup([assistantMsg]);

    const tasks = extractTasks(group);

    expect(tasks).toHaveLength(1);
    expect(tasks[0].agentType).toBe('task'); // Falls back to 'task' when subagent_type not in input
  });

  it('handles task ToolPart with pending status containing subagent_type', () => {
    const pendingTaskTool: ToolPart = {
      id: 'p1',
      sessionID: 'ses_test',
      messageID: 'msg_1',
      type: 'tool',
      callID: 'call_p1',
      tool: 'task',
      state: {
        status: 'pending',
        input: { subagent_type: 'explore', description: 'Pending task' },
        raw: '',
      },
    };
    const assistantMsg = createAssistantMessage('msg_1', [pendingTaskTool]);
    const group = createMessageGroup([assistantMsg]);

    const tasks = extractTasks(group);

    expect(tasks).toHaveLength(1);
    expect(tasks[0].agentType).toBe('explore');
  });

  it('handles task ToolPart with running status', () => {
    const runningTaskTool: ToolPart = {
      id: 'p1',
      sessionID: 'ses_test',
      messageID: 'msg_1',
      type: 'tool',
      callID: 'call_p1',
      tool: 'task',
      state: {
        status: 'running',
        input: { subagent_type: 'kotlin-pro', description: 'Running task' },
        time: { start: 1000 },
      },
    };
    const assistantMsg = createAssistantMessage('msg_1', [runningTaskTool]);
    const group = createMessageGroup([assistantMsg]);

    const tasks = extractTasks(group);

    expect(tasks).toHaveLength(1);
    expect(tasks[0].agentType).toBe('kotlin-pro');
  });

  it('handles task ToolPart with error status', () => {
    const errorTaskTool: ToolPart = {
      id: 'p1',
      sessionID: 'ses_test',
      messageID: 'msg_1',
      type: 'tool',
      callID: 'call_p1',
      tool: 'task',
      state: {
        status: 'error',
        input: { subagent_type: 'test-automator', description: 'Failed task' },
        error: 'Task failed',
        time: { start: 1000, end: 2000 },
      },
    };
    const assistantMsg = createAssistantMessage('msg_1', [errorTaskTool]);
    const group = createMessageGroup([assistantMsg]);

    const tasks = extractTasks(group);

    expect(tasks).toHaveLength(1);
    expect(tasks[0].agentType).toBe('test-automator');
  });

  it('handles task ToolPart with missing subagent_type in input', () => {
    const taskToolNoAgent: ToolPart = {
      id: 'p1',
      sessionID: 'ses_test',
      messageID: 'msg_1',
      type: 'tool',
      callID: 'call_p1',
      tool: 'task',
      state: {
        status: 'completed',
        input: { description: 'Task without agent type' },
        output: 'Done',
        title: 'Task',
        time: { start: 1000, end: 2000 },
      },
    };
    const assistantMsg = createAssistantMessage('msg_1', [taskToolNoAgent]);
    const group = createMessageGroup([assistantMsg]);

    const tasks = extractTasks(group);

    expect(tasks).toHaveLength(1);
    expect(tasks[0].agentType).toBe('task'); // Falls back to 'task'
  });

  it('uses assistant message ID for messageId, not part.messageID', () => {
    // Part has a different messageID than the owning assistant message
    // This tests that we use the robust source (assistantMessage.info.id)
    const subtaskWithMismatchedMessageId: SubtaskPart = {
      id: 'p1',
      sessionID: 'ses_test',
      messageID: 'some_other_msg', // Intentionally different
      type: 'subtask',
      prompt: 'Test prompt',
      description: 'Test description',
      agent: 'explore',
    };
    const assistantMsg = createAssistantMessage('msg_assistant', [subtaskWithMismatchedMessageId]);
    const group = createMessageGroup([assistantMsg]);

    const tasks = extractTasks(group);

    expect(tasks).toHaveLength(1);
    // Should use the assistant message ID, not the part's messageID
    expect(tasks[0].messageId).toBe('msg_assistant');
  });

  it('handles null input in task ToolPart gracefully', () => {
    const taskToolNullInput: ToolPart = {
      id: 'p1',
      sessionID: 'ses_test',
      messageID: 'msg_1',
      type: 'tool',
      callID: 'call_p1',
      tool: 'task',
      state: {
        status: 'completed',
        input: null,
        output: 'Done',
        title: 'Task',
        time: { start: 1000, end: 2000 },
      },
    };
    const assistantMsg = createAssistantMessage('msg_1', [taskToolNullInput]);
    const group = createMessageGroup([assistantMsg]);

    const tasks = extractTasks(group);

    expect(tasks).toHaveLength(1);
    expect(tasks[0].agentType).toBe('task'); // Falls back to 'task'
  });

  it('handles non-object input in task ToolPart gracefully', () => {
    const taskToolStringInput: ToolPart = {
      id: 'p1',
      sessionID: 'ses_test',
      messageID: 'msg_1',
      type: 'tool',
      callID: 'call_p1',
      tool: 'task',
      state: {
        status: 'completed',
        input: 'not an object',
        output: 'Done',
        title: 'Task',
        time: { start: 1000, end: 2000 },
      },
    };
    const assistantMsg = createAssistantMessage('msg_1', [taskToolStringInput]);
    const group = createMessageGroup([assistantMsg]);

    const tasks = extractTasks(group);

    expect(tasks).toHaveLength(1);
    expect(tasks[0].agentType).toBe('task'); // Falls back to 'task'
  });
});
