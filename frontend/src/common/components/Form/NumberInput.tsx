import React from 'react';
import { TextInput, TextInputProps } from './TextInput';

export interface NumberInputProps extends Omit<TextInputProps, 'type'> {
  min?: number;
  max?: number;
  step?: number;
}

export function NumberInput({ min, max, step, ...rest }: NumberInputProps): React.ReactElement {
  return (
    <TextInput
      {...rest}
      type="number"
      inputProps={{
        inputMode: 'numeric',
        pattern: '[0-9]*',
        min,
        max,
        step,
        ...rest.inputProps,
      }}
    />
  );
}
