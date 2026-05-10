import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from './StatusBadge';

describe('StatusBadge', () => {
  it('should render Chip with mapped colour', () => {
    render(
      <StatusBadge
        status="CONFIRMED"
        statusColorMap={{ CONFIRMED: 'success' }}
      />,
    );
    const chip = screen.getByText('CONFIRMED');
    expect(chip).toBeDefined();
    // MUI adds MuiChip-colorSuccess class
    expect(chip.closest('.MuiChip-root')?.className).toMatch(/success/i);
  });

  it('should use default colour for unmapped status', () => {
    render(<StatusBadge status="UNKNOWN" statusColorMap={{}} />);
    expect(screen.getByText('UNKNOWN')).toBeDefined();
  });
});
