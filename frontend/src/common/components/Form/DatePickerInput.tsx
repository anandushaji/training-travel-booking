import React from 'react';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import type { Dayjs } from 'dayjs';

export interface DatePickerInputProps {
  name: string;
  label: string;
  value?: string | null;
  onChange: (isoString: string | null) => void;
  minDate?: string;
  maxDate?: string;
  error?: string | undefined;
  disabled?: boolean;
}

export function DatePickerInput({
  name,
  label,
  value,
  onChange,
  minDate,
  maxDate,
  error,
  disabled,
}: DatePickerInputProps): React.ReactElement {
  // Lazy-import dayjs to avoid pulling it in if not used
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const dayjs = require('dayjs') as (v?: unknown) => Dayjs;

  const handleChange = (newValue: Dayjs | null) => {
    if (newValue === null || !newValue.isValid()) {
      onChange(null);
    } else {
      onChange(newValue.toISOString());
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <DatePicker
        label={label}
        value={value ? dayjs(value) : null}
        onChange={handleChange}
        {...(minDate ? { minDate: dayjs(minDate) } : {})}
        {...(maxDate ? { maxDate: dayjs(maxDate) } : {})}
        {...(disabled !== undefined ? { disabled } : {})}
        slotProps={{
          textField: {
            name,
            size: 'small',
            fullWidth: true,
            error: !!error,
            ...(error !== undefined ? { helperText: error } : {}),
          },
        }}
      />
    </LocalizationProvider>
  );
}
