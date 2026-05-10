import React from 'react';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';

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
  const handleChange = (newValue: Dayjs | null) => {
    if (newValue === null || !newValue.isValid()) {
      onChange(null);
    } else {
      // Emit date-only ISO string (YYYY-MM-DD) — full datetimes cause 400s on
      // APIs that expect a plain date (e.g. flight search, Amadeus).
      onChange(newValue.format('YYYY-MM-DD'));
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
