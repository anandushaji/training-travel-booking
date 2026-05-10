import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoadingOverlay } from './LoadingOverlay';

describe('LoadingOverlay', () => {
  it('should show overlay and spinner when loading', () => {
    render(<LoadingOverlay loading={true}><div>Content</div></LoadingOverlay>);
    expect(screen.getByTestId('loading-overlay')).toBeDefined();
    // children still in DOM
    expect(screen.getByText('Content')).toBeDefined();
  });

  it('should not show overlay when not loading', () => {
    render(<LoadingOverlay loading={false}><div>Content</div></LoadingOverlay>);
    expect(screen.queryByTestId('loading-overlay')).toBeNull();
  });
});
