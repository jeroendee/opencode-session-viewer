import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LoadingSpinner } from './LoadingSpinner';

describe('LoadingSpinner', () => {
  it('renders with default props', () => {
    render(<LoadingSpinner />);

    const spinner = screen.getByRole('status');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveAttribute('aria-label', 'Loading');
  });

  it('renders with custom label', () => {
    render(<LoadingSpinner label="Loading sessions..." />);

    expect(screen.getByText('Loading sessions...')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Loading sessions...');
  });

  it('renders the Loader2 icon', () => {
    const { container } = render(<LoadingSpinner />);

    // The SVG should have the animate-spin class
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass('animate-spin');
  });

  it('applies custom size to the icon', () => {
    const { container } = render(<LoadingSpinner size={48} />);

    const svg = container.querySelector('svg');
    expect(svg).toHaveStyle({ width: '48px', height: '48px' });
  });

  it('renders in vertical layout by default', () => {
    render(<LoadingSpinner label="Loading" />);

    const spinner = screen.getByRole('status');
    expect(spinner).toHaveClass('flex-col');
  });

  it('renders in horizontal layout when specified', () => {
    render(<LoadingSpinner label="Loading" layout="horizontal" />);

    const spinner = screen.getByRole('status');
    expect(spinner).toHaveClass('flex-row');
  });

  it('applies custom className', () => {
    render(<LoadingSpinner className="custom-class" />);

    const spinner = screen.getByRole('status');
    expect(spinner).toHaveClass('custom-class');
  });

  it('does not render label text when no label provided', () => {
    render(<LoadingSpinner />);

    // Should only have the SVG, no text
    const container = screen.getByRole('status');
    expect(container.querySelector('span')).not.toBeInTheDocument();
  });
});
