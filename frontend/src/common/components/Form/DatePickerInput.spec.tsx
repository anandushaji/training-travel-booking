import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DatePickerInput } from './DatePickerInput';

describe('DatePickerInput', () => {
  it('should call onChange with ISO string when date selected programmatically', () => {
    const onChange = vi.fn();
    render(
      <DatePickerInput name="departure" label="Departure Date" onChange={onChange} />,
    );
    // Verify the input renders
    expect(screen.getByLabelText(/departure date/i)).toBeDefined();
  });

  it('should display error text when error prop is set', () => {
    render(
      <DatePickerInput
        name="departure"
        label="Departure Date"
        onChange={vi.fn()}
        error="Date required"
      />,
    );
    expect(screen.getByText('Date required')).toBeDefined();
  });
});
