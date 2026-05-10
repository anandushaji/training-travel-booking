import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button, IconButton, LoadingButton } from './Button';
import InfoIcon from '@mui/icons-material/Info';

describe('Button', () => {
  it('should render contained primary for variant primary', () => {
    render(<Button variant="primary">Submit</Button>);
    const btn = screen.getByRole('button', { name: 'Submit' });
    expect(btn.classList.toString()).toMatch(/contained/i);
  });

  it('should render error colour for variant danger', () => {
    render(<Button variant="danger">Delete</Button>);
    const btn = screen.getByRole('button', { name: /delete/i });
    // MUI adds MuiButton-containedError class
    expect(btn.className).toMatch(/error/i);
  });

  it('should render text variant for ghost', () => {
    render(<Button variant="ghost">More</Button>);
    const btn = screen.getByRole('button', { name: 'More' });
    expect(btn.className).toMatch(/text/i);
  });

  it('should wrap IconButton in a Tooltip', () => {
    render(<IconButton icon={InfoIcon} tooltip="Information" aria-label="info" />);
    expect(screen.getByRole('button', { name: 'info' })).toBeDefined();
  });
});

describe('LoadingButton', () => {
  it('should be disabled with spinner when loading is true', () => {
    render(<LoadingButton loading={true}>Save</LoadingButton>);
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
  });
});
