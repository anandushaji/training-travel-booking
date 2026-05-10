import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Sidebar, NavItem } from './Sidebar';

const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/' },
  { label: 'Bookings', path: '/bookings' },
  { label: 'Search', path: '/search' },
];

describe('Sidebar', () => {
  it('should render a nav item for each navItems entry', () => {
    render(
      <MemoryRouter>
        <Sidebar open={true} onClose={vi.fn()} navItems={navItems} />
      </MemoryRouter>,
    );
    for (const item of navItems) {
      expect(screen.getByText(item.label)).toBeDefined();
    }
  });
});
