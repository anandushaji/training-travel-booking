import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SelectInput, SelectOption } from './SelectInput';

const options: SelectOption[] = [
  { value: 'a', label: 'Option A' },
  { value: 'b', label: 'Option B' },
];

describe('SelectInput', () => {
  it('should render one MenuItem per option', async () => {
    render(<SelectInput name="test" label="Choose" options={options} />);
    // Open the select
    await userEvent.click(screen.getByRole('combobox'));
    const items = screen.getAllByRole('option');
    expect(items).toHaveLength(options.length);
  });
});
