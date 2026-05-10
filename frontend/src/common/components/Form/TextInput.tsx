import React from 'react';
import { TextField, TextFieldProps } from '@mui/material';

export interface TextInputProps extends Omit<TextFieldProps, 'variant' | 'ref'> {
  name: string;
}

/**
 * Thin MUI TextField wrapper.
 *
 * Uses React.forwardRef so that refs (e.g. from react-hook-form's register())
 * are forwarded to the native <input> element via TextField's `inputRef` prop.
 * Without this, RHF's ref is silently dropped and it cannot read the DOM value.
 */
export const TextInput = React.forwardRef<HTMLInputElement, TextInputProps>(
  function TextInput({ name, ...rest }, ref) {
    return (
      <TextField
        name={name}
        variant="outlined"
        size="small"
        fullWidth
        inputRef={ref}
        {...rest}
      />
    );
  },
);
