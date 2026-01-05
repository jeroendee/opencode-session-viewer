import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { highlightText, HighlightedText } from './highlightText';

describe('highlightText', () => {
  it('returns original text when query is empty', () => {
    const result = highlightText('Hello world', '');
    expect(result).toEqual(['Hello world']);
  });

  it('returns original text when query is whitespace only', () => {
    const result = highlightText('Hello world', '   ');
    expect(result).toEqual(['Hello world']);
  });

  it('highlights a single match', () => {
    const result = highlightText('Hello world', 'world');
    expect(result).toHaveLength(2);
    expect(result[0]).toBe('Hello ');
    // Second element should be a React element (mark)
    expect(typeof result[1]).toBe('object');
  });

  it('highlights multiple matches', () => {
    const result = highlightText('world hello world', 'world');
    expect(result).toHaveLength(3); // mark('world'), ' hello ', mark('world')
    // First and third elements should be mark elements
    expect(typeof result[0]).toBe('object');
    expect(result[1]).toBe(' hello ');
    expect(typeof result[2]).toBe('object');
  });

  it('is case-insensitive', () => {
    const result = highlightText('Hello HELLO hello', 'hello');
    expect(result).toHaveLength(5);
    // All three "hello" variants should be highlighted
    expect(typeof result[0]).toBe('object');
    expect(typeof result[2]).toBe('object');
    expect(typeof result[4]).toBe('object');
  });

  it('preserves original case in highlighted text', () => {
    render(<>{highlightText('Hello HELLO hello', 'hello')}</>);
    const marks = screen.getAllByRole('mark');
    expect(marks).toHaveLength(3);
    expect(marks[0].textContent).toBe('Hello');
    expect(marks[1].textContent).toBe('HELLO');
    expect(marks[2].textContent).toBe('hello');
  });

  it('handles match at the start', () => {
    const result = highlightText('Hello world', 'Hello');
    expect(result).toHaveLength(2);
    expect(typeof result[0]).toBe('object'); // mark
    expect(result[1]).toBe(' world');
  });

  it('handles match at the end', () => {
    const result = highlightText('Hello world', 'world');
    expect(result).toHaveLength(2);
    expect(result[0]).toBe('Hello ');
    expect(typeof result[1]).toBe('object'); // mark
  });

  it('handles entire text as match', () => {
    const result = highlightText('hello', 'hello');
    expect(result).toHaveLength(1);
    expect(typeof result[0]).toBe('object'); // mark
  });

  it('returns original text when no match', () => {
    const result = highlightText('Hello world', 'foo');
    expect(result).toEqual(['Hello world']);
  });

  it('uses non-overlapping matches (by design)', () => {
    // "aaaa" with query "aa" yields 2 matches, not 3
    // This is intentional: we find "aa" at index 0, then continue from index 2
    const result = highlightText('aaaa', 'aa');
    expect(result).toHaveLength(2); // mark('aa'), mark('aa')
    expect(typeof result[0]).toBe('object');
    expect(typeof result[1]).toBe('object');
  });

  it('handles empty text', () => {
    const result = highlightText('', 'test');
    expect(result).toEqual(['']);
  });
});

describe('HighlightedText', () => {
  it('renders text without highlights when query is empty', () => {
    render(<HighlightedText text="Hello world" query="" />);
    expect(screen.getByText('Hello world')).toBeInTheDocument();
    expect(screen.queryByRole('mark')).not.toBeInTheDocument();
  });

  it('renders highlighted matches', () => {
    render(<HighlightedText text="Hello world" query="world" />);
    expect(screen.getByRole('mark')).toHaveTextContent('world');
  });

  it('renders multiple highlighted matches', () => {
    render(<HighlightedText text="world hello world" query="world" />);
    const marks = screen.getAllByRole('mark');
    expect(marks).toHaveLength(2);
  });

  it('applies correct CSS classes to marks', () => {
    render(<HighlightedText text="Hello world" query="world" />);
    const mark = screen.getByRole('mark');
    expect(mark).toHaveClass('bg-yellow-200');
  });
});
