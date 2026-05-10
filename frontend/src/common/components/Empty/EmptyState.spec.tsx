import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyState } from './EmptyState';
import InfoIcon from '@mui/icons-material/Info';

describe('EmptyState', () => {
  it('should render action node when provided', () => {
    render(
      <EmptyState
        title="Nothing here"
        action={<button>Add item</button>}
      />,
    );
    expect(screen.getByRole('button', { name: /add item/i })).toBeDefined();
  });

  it('should render title', () => {
    render(<EmptyState title="No results found" />);
    expect(screen.getByText('No results found')).toBeDefined();
  });
});
