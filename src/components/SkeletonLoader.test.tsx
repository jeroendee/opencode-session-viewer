import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  SkeletonLine,
  SkeletonCircle,
  SkeletonRectangle,
  SkeletonMessageGroup,
  SkeletonContent,
} from './SkeletonLoader';

describe('SkeletonLine', () => {
  it('renders with pulse animation', () => {
    const { container } = render(<SkeletonLine />);

    const skeleton = container.firstChild as HTMLElement;
    expect(skeleton).toHaveClass('animate-pulse');
    expect(skeleton).toHaveClass('h-4');
    expect(skeleton).toHaveClass('rounded');
  });

  it('applies custom className', () => {
    const { container } = render(<SkeletonLine className="w-full" />);

    const skeleton = container.firstChild as HTMLElement;
    expect(skeleton).toHaveClass('w-full');
  });

  it('is hidden from screen readers', () => {
    const { container } = render(<SkeletonLine />);

    const skeleton = container.firstChild as HTMLElement;
    expect(skeleton).toHaveAttribute('aria-hidden', 'true');
    expect(skeleton).toHaveAttribute('role', 'presentation');
  });
});

describe('SkeletonCircle', () => {
  it('renders with pulse animation and rounded-full', () => {
    const { container } = render(<SkeletonCircle />);

    const skeleton = container.firstChild as HTMLElement;
    expect(skeleton).toHaveClass('animate-pulse');
    expect(skeleton).toHaveClass('rounded-full');
  });

  it('applies custom className for size', () => {
    const { container } = render(<SkeletonCircle className="w-8 h-8" />);

    const skeleton = container.firstChild as HTMLElement;
    expect(skeleton).toHaveClass('w-8');
    expect(skeleton).toHaveClass('h-8');
  });

  it('is hidden from screen readers', () => {
    const { container } = render(<SkeletonCircle />);

    const skeleton = container.firstChild as HTMLElement;
    expect(skeleton).toHaveAttribute('aria-hidden', 'true');
  });
});

describe('SkeletonRectangle', () => {
  it('renders with pulse animation', () => {
    const { container } = render(<SkeletonRectangle />);

    const skeleton = container.firstChild as HTMLElement;
    expect(skeleton).toHaveClass('animate-pulse');
    expect(skeleton).toHaveClass('rounded');
  });

  it('applies custom className', () => {
    const { container } = render(<SkeletonRectangle className="w-32 h-20" />);

    const skeleton = container.firstChild as HTMLElement;
    expect(skeleton).toHaveClass('w-32');
    expect(skeleton).toHaveClass('h-20');
  });

  it('is hidden from screen readers', () => {
    const { container } = render(<SkeletonRectangle />);

    const skeleton = container.firstChild as HTMLElement;
    expect(skeleton).toHaveAttribute('aria-hidden', 'true');
  });
});

describe('SkeletonMessageGroup', () => {
  it('renders skeleton for user message and response', () => {
    const { container } = render(<SkeletonMessageGroup />);

    // Should have multiple skeleton lines (animate-pulse elements)
    const pulsingElements = container.querySelectorAll('.animate-pulse');
    expect(pulsingElements.length).toBeGreaterThan(0);
  });

  it('is hidden from screen readers (purely decorative)', () => {
    const { container } = render(<SkeletonMessageGroup />);

    const skeleton = container.firstChild as HTMLElement;
    expect(skeleton).toHaveAttribute('aria-hidden', 'true');
  });

  it('renders circles for avatars', () => {
    const { container } = render(<SkeletonMessageGroup />);

    const circles = container.querySelectorAll('.rounded-full');
    expect(circles.length).toBe(2); // One for user, one for assistant
  });
});

describe('SkeletonContent', () => {
  it('renders multiple skeleton message groups', () => {
    const { container } = render(<SkeletonContent />);

    // Each SkeletonMessageGroup has aria-hidden="true" and uses space-y-4 class
    const messageGroups = container.querySelectorAll('[aria-hidden="true"].space-y-4');
    expect(messageGroups.length).toBe(3);
  });

  it('has proper layout classes', () => {
    const { container } = render(<SkeletonContent />);

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass('flex-1');
    expect(wrapper).toHaveClass('overflow-y-auto');
  });
});
