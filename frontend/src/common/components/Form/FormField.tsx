import React from 'react';
import {
  FormControl,
  FormLabel,
  FormHelperText,
} from '@mui/material';

export interface FormFieldProps {
  label: string;
  required?: boolean | undefined;
  error?: string | undefined;
  helperText?: string | undefined;
  children: React.ReactNode;
}

export function FormField({
  label,
  required,
  error,
  helperText,
  children,
}: FormFieldProps): React.ReactElement {
  return (
    <FormControl fullWidth error={!!error} sx={{ mb: 2 }}>
      <FormLabel required={!!required} sx={{ mb: 0.5, fontWeight: 500 }}>
        {label}
      </FormLabel>
      {children}
      {error && <FormHelperText error>{error}</FormHelperText>}
      {!error && helperText && <FormHelperText>{helperText}</FormHelperText>}
    </FormControl>
  );
}
