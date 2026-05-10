import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FormField } from './FormField';

describe('FormField', () => {
  it('should display error message when error prop is set', () => {
    render(
      <FormField label="Email" error="Invalid email format">
        <input />
      </FormField>,
    );
    expect(screen.getByText('Invalid email format')).toBeDefined();
  });

  it('should not display error text when no error', () => {
    render(
      <FormField label="Email">
        <input />
      </FormField>,
    );
    expect(screen.queryByText(/invalid/i)).toBeNull();
  });
});
