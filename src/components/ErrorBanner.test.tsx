import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ErrorBanner } from './ErrorBanner';

describe('ErrorBanner', () => {
  it('renders error message', () => {
    render(<ErrorBanner message="Something went wrong" />);

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('has alert role for accessibility', () => {
    render(<ErrorBanner message="Error" />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('renders suggestion when provided', () => {
    render(
      <ErrorBanner
        message="Error"
        suggestion="Try refreshing the page"
      />
    );

    expect(screen.getByText('Try refreshing the page')).toBeInTheDocument();
  });

  it('does not render suggestion when not provided', () => {
    render(<ErrorBanner message="Error" />);

    // Only the error message should be present, no suggestion text
    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.queryByText(/try|click|select|use|make sure/i)).not.toBeInTheDocument();
  });

  it('renders retry button when canRetry is true and onRetry is provided', () => {
    const onRetry = vi.fn();
    render(
      <ErrorBanner
        message="Error"
        canRetry={true}
        onRetry={onRetry}
      />
    );

    const retryButton = screen.getByRole('button', { name: /retry/i });
    expect(retryButton).toBeInTheDocument();
  });

  it('does not render retry button when canRetry is false', () => {
    const onRetry = vi.fn();
    render(
      <ErrorBanner
        message="Error"
        canRetry={false}
        onRetry={onRetry}
      />
    );

    expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
  });

  it('does not render retry button when onRetry is not provided', () => {
    render(
      <ErrorBanner
        message="Error"
        canRetry={true}
      />
    );

    expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
  });

  it('calls onRetry when retry button is clicked', () => {
    const onRetry = vi.fn();
    render(
      <ErrorBanner
        message="Error"
        canRetry={true}
        onRetry={onRetry}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /retry/i }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders dismiss button by default when onDismiss is provided', () => {
    const onDismiss = vi.fn();
    render(
      <ErrorBanner
        message="Error"
        onDismiss={onDismiss}
      />
    );

    const dismissButton = screen.getByRole('button', { name: /dismiss/i });
    expect(dismissButton).toBeInTheDocument();
  });

  it('does not render dismiss button when canDismiss is false', () => {
    const onDismiss = vi.fn();
    render(
      <ErrorBanner
        message="Error"
        canDismiss={false}
        onDismiss={onDismiss}
      />
    );

    expect(screen.queryByRole('button', { name: /dismiss/i })).not.toBeInTheDocument();
  });

  it('does not render dismiss button when onDismiss is not provided', () => {
    render(
      <ErrorBanner
        message="Error"
        canDismiss={true}
      />
    );

    expect(screen.queryByRole('button', { name: /dismiss/i })).not.toBeInTheDocument();
  });

  it('calls onDismiss when dismiss button is clicked', () => {
    const onDismiss = vi.fn();
    render(
      <ErrorBanner
        message="Error"
        onDismiss={onDismiss}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }));

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('renders with custom testId', () => {
    render(
      <ErrorBanner
        message="Error"
        testId="custom-error"
      />
    );

    expect(screen.getByTestId('custom-error')).toBeInTheDocument();
  });

  it('renders both retry and dismiss buttons when both are enabled', () => {
    const onRetry = vi.fn();
    const onDismiss = vi.fn();

    render(
      <ErrorBanner
        message="Error"
        canRetry={true}
        onRetry={onRetry}
        canDismiss={true}
        onDismiss={onDismiss}
      />
    );

    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /dismiss/i })).toBeInTheDocument();
  });

  it('renders with message and suggestion', () => {
    render(
      <ErrorBanner
        message="Permission denied"
        suggestion="Click retry to grant access"
        canRetry={true}
        onRetry={() => {}}
      />
    );

    expect(screen.getByText('Permission denied')).toBeInTheDocument();
    expect(screen.getByText('Click retry to grant access')).toBeInTheDocument();
  });
});
