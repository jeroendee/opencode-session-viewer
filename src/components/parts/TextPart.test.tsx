import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TextPart } from './TextPart';
import { SearchProvider } from '../../contexts/SearchContext';
import type { TextPart as TextPartType } from '../../types/session';

function createTextPart(text: string): TextPartType {
  return {
    id: 'part-1',
    sessionID: 'session-1',
    messageID: 'message-1',
    type: 'text',
    text,
  };
}

describe('TextPart search highlighting', () => {
  it('highlights search term in regular text', () => {
    const part = createTextPart('Hello world, this is a test');
    render(
      <SearchProvider searchQuery="test">
        <TextPart part={part} />
      </SearchProvider>
    );
    
    const marks = screen.queryAllByRole('mark');
    expect(marks.length).toBeGreaterThan(0);
    expect(marks[0].textContent).toBe('test');
  });

  it('does not highlight inside inline code', () => {
    const part = createTextPart('Here is some `test code` inline');
    render(
      <SearchProvider searchQuery="test">
        <TextPart part={part} />
      </SearchProvider>
    );
    
    // Find the inline code element
    const code = screen.getByText(/test code/);
    // The mark should NOT be inside the code element
    const marksInsideCode = code.querySelectorAll('mark');
    expect(marksInsideCode.length).toBe(0);
  });

  it('does not highlight inside code blocks', () => {
    const part = createTextPart('Some text\n\n```javascript\nconst test = "hello";\n```\n\nMore text');
    render(
      <SearchProvider searchQuery="test">
        <TextPart part={part} />
      </SearchProvider>
    );
    
    // Code blocks use SyntaxHighlighter which doesn't use our text renderer
    // The "test" in code should not have a mark
    const codeBlock = document.querySelector('pre');
    if (codeBlock) {
      const marksInCode = codeBlock.querySelectorAll('mark');
      expect(marksInCode.length).toBe(0);
    }
  });

  it('highlights in text outside code', () => {
    const part = createTextPart('test before `code` and test after');
    render(
      <SearchProvider searchQuery="test">
        <TextPart part={part} />
      </SearchProvider>
    );
    
    const marks = screen.getAllByRole('mark');
    expect(marks.length).toBe(2); // "test" before and after code
  });
});
