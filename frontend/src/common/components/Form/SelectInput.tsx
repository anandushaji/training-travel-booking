import React from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  SelectProps,
} from '@mui/material';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectInputProps extends Omit<SelectProps, 'label' | 'error'> {
  name: string;
  label: string;
  options: SelectOption[];
  error?: string | undefined;
}

export function SelectInput({
  name,
  label,
  options,
  error,
  ...rest
}: SelectInputProps): React.ReactElement {
  const labelId = `${name}-label`;
  return (
    <FormControl fullWidth size="small" error={!!error}>
      <InputLabel id={labelId}>{label}</InputLabel>
      <Select labelId={labelId} name={name} label={label} {...rest}>
        {options.map((opt) => (
          <MenuItem key={opt.value} value={opt.value}>
            {opt.label}
          </MenuItem>
        ))}
      </Select>
      {error && <FormHelperText>{error}</FormHelperText>}
    </FormControl>
  );
}
