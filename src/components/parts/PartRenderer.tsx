import type { Part } from '../../types/session';
import { isTextPart, isToolPart, isReasoningPart, isFilePart, isSubtaskPart } from '../../types/session';
import { TextPart } from './TextPart';
import { ToolPart } from './ToolPart';
import { ReasoningPart } from './ReasoningPart';
import { FilePart } from './FilePart';
import { SubtaskPart } from './SubtaskPart';

interface PartRendererProps {
  part: Part;
}

/**
 * Renders a message part based on its type.
 * Dispatches to specialized part components for each type.
 */
export function PartRenderer({ part }: PartRendererProps) {
  if (isTextPart(part)) {
    return <TextPart part={part} />;
  }

  if (isToolPart(part)) {
    return <ToolPart part={part} />;
  }

  if (isReasoningPart(part)) {
    return <ReasoningPart part={part} />;
  }

  if (isFilePart(part)) {
    return <FilePart part={part} />;
  }

  if (isSubtaskPart(part)) {
    return <SubtaskPart part={part} />;
  }

  // Skip step-start, step-finish, and other meta parts in display
  if (part.type === 'step-start' || part.type === 'step-finish' || part.type === 'snapshot') {
    return null;
  }

  // Generic fallback for other part types
  return (
    <div className="text-xs text-gray-400 dark:text-gray-500">
      [{part.type}]
    </div>
  );
}
