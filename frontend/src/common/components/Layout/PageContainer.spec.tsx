import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PageContainer } from './PageContainer';

describe('PageContainer', () => {
  it('should render title in h1', () => {
    render(<PageContainer title="My Page">content</PageContainer>);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('My Page');
  });

  it('should render action node when provided', () => {
    render(
      <PageContainer title="My Page" actions={<button>New</button>}>
        content
      </PageContainer>,
    );
    expect(screen.getByRole('button', { name: 'New' })).toBeDefined();
  });
});
