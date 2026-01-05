// Session Info
export interface SessionInfo {
  id: string;
  version: string;
  projectID: string;
  directory: string;
  title: string;
  parentID?: string;
  share?: { url: string };
  time: {
    created: number;
    updated: number;
    compacting?: number;
    archived?: number;
  };
  summary?: {
    additions: number;
    deletions: number;
    files: number;
    diffs?: string[];
  };
}

// Message types
export type MessageRole = 'user' | 'assistant';

export interface UserMessageInfo {
  id: string;
  sessionID: string;
  role: 'user';
  time: { created: number };
  summary?: { title: string; diffs: string[] };
  agent: string;
  model: { providerID: string; modelID: string };
  system?: string;
  tools?: Record<string, boolean>;
}

export interface AssistantMessageInfo {
  id: string;
  sessionID: string;
  role: 'assistant';
  parentID: string;
  time: { created: number; completed?: number };
  modelID: string;
  providerID: string;
  agent: string;
  mode: string;
  path: { cwd: string; root: string };
  cost: number;
  tokens: {
    input: number;
    output: number;
    reasoning: number;
    cache: { read: number; write: number };
  };
  finish?: string;
  error?: MessageError;
}

export type MessageInfo = UserMessageInfo | AssistantMessageInfo;

// Error types
export type MessageError =
  | { name: 'ProviderAuthError'; data: { providerID: string; message: string } }
  | { name: 'APIError'; data: { message: string; statusCode?: number; isRetryable: boolean } }
  | { name: 'MessageAbortedError'; data: { message: string } }
  | { name: 'MessageOutputLengthError'; data: Record<string, never> }
  | { name: 'UnknownError'; data: { message: string } };

// Part types
export interface BasePart {
  id: string;
  sessionID: string;
  messageID: string;
}

export interface TextPart extends BasePart {
  type: 'text';
  text: string;
  synthetic?: boolean;
  ignored?: boolean;
  time?: { start: number; end?: number };
  metadata?: unknown;
}

export interface ReasoningPart extends BasePart {
  type: 'reasoning';
  text: string;
  time?: { start: number; end?: number };
  metadata?: unknown;
}

export interface ToolPartPending {
  status: 'pending';
  input: unknown;
  raw: string;
}

export interface ToolPartRunning {
  status: 'running';
  input: unknown;
  title?: string;
  metadata?: unknown;
  time: { start: number };
}

export interface ToolPartCompleted {
  status: 'completed';
  input: unknown;
  output: string;
  title: string;
  metadata?: unknown;
  time: { start: number; end: number; compacted?: number };
  attachments?: FilePart[];
}

export interface ToolPartError {
  status: 'error';
  input: unknown;
  error: string;
  metadata?: unknown;
  time: { start: number; end: number };
}

export type ToolState = ToolPartPending | ToolPartRunning | ToolPartCompleted | ToolPartError;

export interface ToolPart extends BasePart {
  type: 'tool';
  callID: string;
  tool: string;
  state: ToolState;
}

export interface FilePart extends BasePart {
  type: 'file';
  mime: string;
  filename?: string;
  url: string;
  source?: { type: 'file'; path: string } | { type: 'symbol'; name: string };
}

export interface StepStartPart extends BasePart {
  type: 'step-start';
  snapshot?: string;
}

export interface StepFinishPart extends BasePart {
  type: 'step-finish';
  reason: string;
  snapshot?: string;
  cost: number;
  tokens: {
    input: number;
    output: number;
    reasoning: number;
    cache: { read: number; write: number };
  };
}

export interface CompactionPart extends BasePart {
  type: 'compaction';
  auto: boolean;
}

export interface SnapshotPart extends BasePart {
  type: 'snapshot';
  snapshot: string;
}

export interface PatchPart extends BasePart {
  type: 'patch';
  hash: string;
  files: string[];
}

export interface AgentPart extends BasePart {
  type: 'agent';
  name: string;
  source?: unknown;
}

export interface RetryPart extends BasePart {
  type: 'retry';
  attempt: number;
  error: MessageError;
  time: { created: number };
}

export interface SubtaskPart extends BasePart {
  type: 'subtask';
  prompt: string;
  description: string;
  agent: string;
  command?: string;
}

export type Part =
  | TextPart
  | ReasoningPart
  | ToolPart
  | FilePart
  | StepStartPart
  | StepFinishPart
  | CompactionPart
  | SnapshotPart
  | PatchPart
  | AgentPart
  | RetryPart
  | SubtaskPart;

// Message with parts
export interface Message {
  info: MessageInfo;
  parts: Part[];
}

export interface UserMessage {
  info: UserMessageInfo;
  parts: Part[];
}

export interface AssistantMessage {
  info: AssistantMessageInfo;
  parts: Part[];
}

// Full session
export interface Session {
  info: SessionInfo;
  messages: Message[];
}

// Type guards
export function isUserMessage(message: Message): message is UserMessage {
  return message.info.role === 'user';
}

export function isAssistantMessage(message: Message): message is AssistantMessage {
  return message.info.role === 'assistant';
}

export function isTextPart(part: Part): part is TextPart {
  return part.type === 'text';
}

export function isReasoningPart(part: Part): part is ReasoningPart {
  return part.type === 'reasoning';
}

export function isToolPart(part: Part): part is ToolPart {
  return part.type === 'tool';
}

export function isFilePart(part: Part): part is FilePart {
  return part.type === 'file';
}

export function isStepStartPart(part: Part): part is StepStartPart {
  return part.type === 'step-start';
}

export function isStepFinishPart(part: Part): part is StepFinishPart {
  return part.type === 'step-finish';
}

export function isToolCompleted(state: ToolState): state is ToolPartCompleted {
  return state.status === 'completed';
}

export function isToolError(state: ToolState): state is ToolPartError {
  return state.status === 'error';
}

export function isSubtaskPart(part: Part): part is SubtaskPart {
  return part.type === 'subtask';
}
