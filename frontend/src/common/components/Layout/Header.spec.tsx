import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Header } from './Header';

describe('Header', () => {
  it('should call onMenuToggle on click', () => {
    const onMenuToggle = vi.fn();
    render(<Header onMenuToggle={onMenuToggle} />);
    fireEvent.click(screen.getByRole('button', { name: /open menu/i }));
    expect(onMenuToggle).toHaveBeenCalledOnce();
  });
});
