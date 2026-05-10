import React from 'react';
import { CircularProgress, Box, CircularProgressProps } from '@mui/material';

export interface SpinnerProps {
  size?: number;
  color?: CircularProgressProps['color'];
}

export function Spinner({ size = 40, color = 'primary' }: SpinnerProps): React.ReactElement {
  return (
    <Box display="flex" justifyContent="center" alignItems="center" p={2}>
      <CircularProgress size={size} color={color} />
    </Box>
  );
}
