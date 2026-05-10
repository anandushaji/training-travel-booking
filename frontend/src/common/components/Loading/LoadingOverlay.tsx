import React from 'react';
import { Box } from '@mui/material';
import { Spinner } from './Spinner';

export interface LoadingOverlayProps {
  loading: boolean;
  children: React.ReactNode;
}

export function LoadingOverlay({ loading, children }: LoadingOverlayProps): React.ReactElement {
  return (
    <Box position="relative">
      {children}
      {loading && (
        <Box
          position="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          display="flex"
          alignItems="center"
          justifyContent="center"
          sx={{ backgroundColor: 'rgba(255,255,255,0.7)', zIndex: 1 }}
          data-testid="loading-overlay"
        >
          <Spinner />
        </Box>
      )}
    </Box>
  );
}
