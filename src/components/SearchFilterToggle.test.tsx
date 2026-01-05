import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SearchFilterToggle } from './SearchFilterToggle';

describe('SearchFilterToggle', () => {
  it('renders all and user buttons', () => {
    render(<SearchFilterToggle value="all" onChange={() => {}} />);
    
    expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'User only' })).toBeInTheDocument();
  });

  it('has accessible group labelling', () => {
    render(<SearchFilterToggle value="all" onChange={() => {}} />);
    
    const group = screen.getByRole('group');
    expect(group).toHaveAccessibleName('Search in:');
  });

  it('shows "all" as selected when value is "all"', () => {
    render(<SearchFilterToggle value="all" onChange={() => {}} />);
    
    const allButton = screen.getByRole('button', { name: 'All' });
    const userButton = screen.getByRole('button', { name: 'User only' });
    
    expect(allButton).toHaveAttribute('aria-pressed', 'true');
    expect(userButton).toHaveAttribute('aria-pressed', 'false');
  });

  it('shows "user" as selected when value is "user"', () => {
    render(<SearchFilterToggle value="user" onChange={() => {}} />);
    
    const allButton = screen.getByRole('button', { name: 'All' });
    const userButton = screen.getByRole('button', { name: 'User only' });
    
    expect(allButton).toHaveAttribute('aria-pressed', 'false');
    expect(userButton).toHaveAttribute('aria-pressed', 'true');
  });

  it('calls onChange with "all" when All button is clicked', () => {
    const onChange = vi.fn();
    render(<SearchFilterToggle value="user" onChange={onChange} />);
    
    fireEvent.click(screen.getByRole('button', { name: 'All' }));
    
    expect(onChange).toHaveBeenCalledWith('all');
  });

  it('calls onChange with "user" when User only button is clicked', () => {
    const onChange = vi.fn();
    render(<SearchFilterToggle value="all" onChange={onChange} />);
    
    fireEvent.click(screen.getByRole('button', { name: 'User only' }));
    
    expect(onChange).toHaveBeenCalledWith('user');
  });
});
